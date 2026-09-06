import { Category, PostType } from "@/types";
import { prisma } from "@/lib/prisma";
import { isTweetStatusUrl, isHttpUrl, searchRecentTweets, tweetIdFromUrl } from "@/lib/x";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const DAY_MS = 24 * 60 * 60 * 1000;

// Sept 2026 mcap names, stables excluded. Argument terms ride on each group.
const TOP_COINS = [
  "BTC", "ETH", "BNB", "XRP", "SOL", "TRX", "HYPE", "ZEC", "DOGE", "XMR",
  "LINK", "ADA", "XLM", "BCH", "AVAX", "TON", "SUI", "UNI", "NEAR", "DOT",
];
const ARG_TERMS = "debate OR vs OR beef OR criticizes OR responds";
const VERTICAL_QUERIES = [
  "(TAO OR FET OR RENDER OR \"AI agent\" OR \"onchain AI\") (crypto OR token)",
  "(tokenized OR RWA OR xStocks OR Ondo OR Backed) (stock OR equity OR onchain)",
  "(NFT OR allowlist OR \"floor price\") (mint OR drama OR community)",
  "(airdrop OR sybil OR \"token distribution\" OR \"airdrop farming\" OR eligibility)",
];

export interface GeneratedPost {
  type: PostType;
  title: string;
  body?: string;
  signal?: string;
  category: Category;
  endsAt?: Date;
  hot: boolean;
  originator?: string;
  sourceUrl: string;
  xPostId?: string;
  yesCount?: number;
  noCount?: number;
}

interface Candidate {
  title: string;
  url: string;
  content: string;
  publishedAt?: Date;
  engagement: number;
  lane: string;
  kind: "news" | "ct";
  handle?: string;
  score: number;
}

export function isXUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "x.com" || host === "twitter.com";
  } catch {
    return false;
  }
}

export function handleFromXUrl(url?: string | null): string | undefined {
  if (!url || !isTweetStatusUrl(url)) return undefined;
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    if (path[0] && path[0] !== "i") return `@${path[0]}`;
  } catch {
    /* ignore */
  }
  return undefined;
}

function isFresh(date?: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= DAY_MS;
}

function validSource(c: Candidate): boolean {
  if (!c.url) return false;
  if (c.kind === "ct") return isTweetStatusUrl(c.url);
  if (isXUrl(c.url)) return isTweetStatusUrl(c.url);
  return isHttpUrl(c.url);
}

async function tavilySearch(key: string, query: string): Promise<any[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: 5,
      days: 1,
      topic: "finance",
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function fetchNewsLane(): Promise<Candidate[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const queries = [
    "crypto blockchain web3 news today",
    "tokenized equities RWA onchain stock xStocks Ondo Backed today",
    "NFT mint floor price allowlist drama today",
    "crypto airdrop eligibility farming token distribution sybil today",
    "AI agent token TAO FET RENDER onchain AI crypto today",
  ];
  const rows = await Promise.all(queries.map((q) => tavilySearch(key, q)));
  const out: Candidate[] = [];
  const seen = new Set<string>();
  rows.flat().forEach((r: any) => {
    if (!r?.url || seen.has(r.url)) return;
    if (isXUrl(r.url) && !isTweetStatusUrl(r.url)) return;
    seen.add(r.url);
    const publishedAt = r.published_date ? new Date(r.published_date) : undefined;
    if (!isFresh(publishedAt || null)) return;
    const recency = publishedAt ? Math.max(0, 24 - (Date.now() - publishedAt.getTime()) / 36e5) : 8;
    out.push({
      title: r.title,
      url: r.url,
      content: (r.content || "").slice(0, 400),
      publishedAt,
      engagement: 0,
      lane: "news",
      kind: "news",
      score: recency + (r.score || 0) * 10,
    });
  });
  return out;
}

async function fetchCtLane(): Promise<Candidate[]> {
  // Paid X recent search (TWITTER_BEARER_TOKEN). Batch coins so one hourly
  // run covers the full book without 20 separate calls.
  const groups: string[][] = [];
  for (let i = 0; i < TOP_COINS.length; i += 5) groups.push(TOP_COINS.slice(i, i + 5));
  const queries = [
    ...groups.map((g) => `(${g.map((c) => `$${c}`).join(" OR ")}) (${ARG_TERMS})`),
    ...VERTICAL_QUERIES,
  ];
  const hits = await Promise.all(queries.map((q) => searchRecentTweets(q, 10)));
  const out: Candidate[] = [];
  const seen = new Set<string>();
  hits.flat().forEach((t) => {
    if (!isTweetStatusUrl(t.url) || seen.has(t.url)) return;
    const publishedAt = t.createdAt ? new Date(t.createdAt) : undefined;
    if (!isFresh(publishedAt || null)) return;
    seen.add(t.url);
    const recency = publishedAt ? Math.max(0, 24 - (Date.now() - publishedAt.getTime()) / 36e5) : 0;
    out.push({
      title: t.text.slice(0, 120),
      url: t.url,
      content: t.text.slice(0, 400),
      publishedAt,
      engagement: t.engagement,
      lane: "ct",
      kind: "ct",
      handle: t.username ? `@${t.username}` : handleFromXUrl(t.url),
      score: recency * 2 + Math.log10((t.engagement || 0) + 1) * 8,
    });
  });
  return out;
}

function extractContent(payload: any): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try { return extractContent(JSON.parse(trimmed)); } catch { return trimmed; }
    }
    return trimmed || null;
  }
  const fromChoices = payload?.choices?.[0]?.message?.content;
  if (typeof fromChoices === "string" && fromChoices.trim()) return fromChoices;
  if (Array.isArray(fromChoices)) {
    const text = fromChoices.map((p: any) => p?.text || p?.content || "").join("").trim();
    if (text) return text;
  }
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  if (typeof payload?.content === "string" && payload.content.trim()) return payload.content;
  return null;
}

async function callChat(label: string, base: string, key: string, model: string, messages: { role: string; content: string }[]) {
  const started = Date.now();
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.7, max_tokens: 800, response_format: { type: "json_object" }, messages }),
  });
  const text = await res.text();
  console.log(`${label} latency ${Date.now() - started}ms status=${res.status} model=${model} bytes=${text.length}`);
  if (!res.ok) {
    console.error(`${label} error body`, text.slice(0, 300));
    return null;
  }
  try { return extractContent(JSON.parse(text)); } catch { return extractContent(text); }
}

export async function callLLM(messages: { role: string; content: string }[]): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const out = await callChat("Groq", GROQ_BASE, groqKey, GROQ_MODEL, messages);
    if (out) return out;
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return callChat("OpenAI", OPENAI_BASE, openaiKey, OPENAI_MODEL, messages);
  return null;
}

export async function interpretSource(input: { title: string; body?: string | null; sourceUrl?: string | null; signal?: string | null }) {
  const raw = await callLLM([
    { role: "system", content: 'JSON only: {"summary":"3-5 sentences","read":"2 sentences for CT"}' },
    { role: "user", content: `Title: ${input.title}\nURL: ${input.sourceUrl || "none"}\nBody: ${input.body || ""}` },
  ]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return [parsed.summary, parsed.read].filter(Boolean).join("\n\n") || null;
  } catch {
    return raw;
  }
}

async function cardFromCandidate(source: Candidate, type: PostType): Promise<GeneratedPost | null> {
  if (!validSource(source)) return null;
  const raw = await callLLM([
    {
      role: "system",
      content: `TalkinPulse card for TODAY. No fake takes. JSON only:
{"title":"max 90","body":"1-3 sentences","signal":"optional","category":"Trending|Hot|Opinion|Convo|Divide|LittleCooker|Meta|Alpha","hot":true}
Card type: ${type}`,
    },
    { role: "user", content: `Lane ${source.lane} ${source.kind}\n${source.title}\n${source.url}\n${source.content}` },
  ]);
  if (!raw) return null;
  let parsed: any;
  try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
  if (!parsed.title) return null;
  return {
    type,
    title: parsed.title,
    body: parsed.body,
    signal: parsed.signal,
    category: parsed.category || (source.kind === "ct" ? "Trending" : "Opinion"),
    endsAt: type === "MARKET" ? new Date(Date.now() + DAY_MS) : undefined,
    hot: parsed.hot ?? source.engagement > 20,
    originator: source.kind === "ct" ? source.handle : undefined,
    sourceUrl: source.url,
    xPostId: source.kind === "ct" ? tweetIdFromUrl(source.url) : undefined,
    yesCount: 50,
    noCount: 50,
  };
}

export async function generateBatch(): Promise<GeneratedPost[]> {
  const [news, ct] = await Promise.all([fetchNewsLane(), fetchCtLane()]);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.post.findMany({
    where: { createdAt: { gte: start } },
    select: { sourceUrl: true },
  });
  const used = new Set(existing.map((p) => p.sourceUrl));

  const ranked = [...ct, ...news]
    .filter((c) => validSource(c) && !used.has(c.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const ctTypes: PostType[] = ["TAKE", "CONVERSATION", "MARKET"];
  const out: GeneratedPost[] = [];
  let ctIdx = 0;
  for (const source of ranked) {
    const type: PostType = source.kind === "news" ? "EVENT" : ctTypes[ctIdx++ % ctTypes.length];
    const card = await cardFromCandidate(source, type);
    if (!card?.sourceUrl) continue;
    if (source.kind === "ct" && !isTweetStatusUrl(card.sourceUrl)) continue;
    used.add(card.sourceUrl);
    out.push(card);
    // Market twins only from tweet-sourced CT so non-news cards never inherit a profile/article URL.
    if (card.type !== "MARKET" && source.kind === "ct") {
      const q = card.title.includes("?") ? card.title : `Does this play out: ${card.title.slice(0, 70)}?`;
      out.push({
        ...card,
        type: "MARKET",
        title: q.slice(0, 90),
        endsAt: new Date(Date.now() + DAY_MS),
        yesCount: 50,
        noCount: 50,
      });
    }
  }
  return out;
}
