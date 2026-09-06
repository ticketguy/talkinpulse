import { Category, PostType } from "@/types";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

export interface GeneratedPost {
  type: PostType;
  title: string;
  body?: string;
  signal?: string;
  category: Category;
  endsAt?: Date;
  hot: boolean;
  originator?: string;
  sourceUrl?: string;
  yesCount?: number;
  noCount?: number;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  lane: "news-hot" | "news-quiet" | "ct-hot" | "ct-quiet";
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
  if (!url || !isXUrl(url)) return undefined;
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    const skip = new Set(["i", "intent", "share", "search", "hashtag", "home"]);
    if (path[0] && !skip.has(path[0].toLowerCase())) return `@${path[0]}`;
  } catch {
    /* ignore */
  }
  return undefined;
}

async function tavilySearch(key: string, query: string, includeDomains?: string[]): Promise<any[]> {
  const body: Record<string, unknown> = {
    api_key: key,
    query,
    search_depth: "basic",
    max_results: 5,
    days: 1,
  };
  if (includeDomains?.length) body.include_domains = includeDomains;
  else body.topic = "finance";
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function fetchLiveCryptoTopics(): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const xDomains = ["x.com", "twitter.com"];
    const [newsHot, newsQuiet, ctHot, ctQuiet] = await Promise.all([
      tavilySearch(key, "crypto blockchain web3 news today"),
      tavilySearch(key, "underreported crypto blockchain protocol today"),
      tavilySearch(key, "crypto twitter trending argument take debate launch today", xDomains),
      tavilySearch(key, "crypto twitter opinion governance event today", xDomains),
    ]);
    const seen = new Set<string>();
    const out: TavilyResult[] = [];
    const push = (r: any, lane: TavilyResult["lane"]) => {
      if (!r?.url || seen.has(r.url)) return;
      seen.add(r.url);
      out.push({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 400),
        score: r.score,
        lane,
      });
    };
    newsHot.forEach((r) => push(r, "news-hot"));
    newsQuiet.forEach((r) => push(r, "news-quiet"));
    ctHot.forEach((r) => push(r, "ct-hot"));
    ctQuiet.forEach((r) => push(r, "ct-quiet"));
    return out;
  } catch (e) {
    console.error("Tavily error:", e);
    return [];
  }
}

function extractContent(payload: any): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractContent(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
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

async function callChat(
  label: string,
  base: string,
  key: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  const started = Date.now();
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  const text = await res.text();
  console.log(`${label} latency ${Date.now() - started}ms status=${res.status} model=${model} bytes=${text.length}`);
  if (!res.ok) {
    console.error(`${label} error body`, text.slice(0, 300));
    return null;
  }
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* raw */
  }
  return extractContent(parsed);
}

export async function callLLM(messages: { role: string; content: string }[]): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const out = await callChat("Groq", GROQ_BASE, groqKey, GROQ_MODEL, messages);
    if (out) return out;
    console.log("Groq failed, trying OpenAI backup");
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return callChat("OpenAI", OPENAI_BASE, openaiKey, OPENAI_MODEL, messages);
  return null;
}

export async function interpretSource(input: {
  title: string;
  body?: string | null;
  sourceUrl?: string | null;
  signal?: string | null;
}): Promise<string | null> {
  const raw = await callLLM([
    {
      role: "system",
      content:
        'Summarize and interpret this crypto news or discussion for Crypto Twitter. Respond ONLY JSON: {"summary":"3-5 sentences what happened","read":"2 sentences what it means for CT / markets"}',
    },
    {
      role: "user",
      content: `Title: ${input.title}\nURL: ${input.sourceUrl || "none"}\nBody: ${input.body || ""}\nSignal: ${input.signal || ""}`,
    },
  ]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const parts = [parsed.summary, parsed.read].filter(Boolean);
    return parts.join("\n\n") || null;
  } catch {
    return raw;
  }
}

function classFromLane(lane?: string, type?: PostType): Category {
  if (type === "CONVERSATION") return "Convo";
  if (lane === "ct-hot" || lane === "news-hot") return "Trending";
  if (lane === "ct-quiet") return "LittleCooker";
  if (lane === "news-quiet") return "Opinion";
  return "Meta";
}

export async function generatePost(): Promise<GeneratedPost | null> {
  const rand = Math.random();
  const type: PostType = rand < 0.35 ? "EVENT" : rand < 0.55 ? "TAKE" : rand < 0.75 ? "CONVERSATION" : "MARKET";

  const liveResults = await fetchLiveCryptoTopics();
  const ct = liveResults.filter((r) => r.lane.startsWith("ct"));
  const news = liveResults.filter((r) => r.lane.startsWith("news"));
  const wantCt = Math.random() < 0.55;
  const pool = wantCt ? (ct.length ? ct : news) : (news.length ? news : ct);
  const source = pool[Math.floor(Math.random() * pool.length)] || liveResults[0] || null;
  const fromX = isXUrl(source?.url);
  const xHandle = handleFromXUrl(source?.url);

  const topicContext = source
    ? `Source kind: ${fromX ? "Crypto Twitter" : "off-X news"}. Today only.\nLane: ${source.lane}.\nTitle: ${source.title}\nURL: ${source.url}\nContent: ${source.content}\n${fromX ? `Handle from URL: ${xHandle || "none"}` : "originator must be empty"}`
    : "Generate from today's crypto discussion. No invented handles.";

  const system = `You write TalkinPulse cards for TODAY only. No fake user takes. No invented X handles.
Respond ONLY JSON:
{
  "title": "max 90 chars",
  "body": "1-3 sentences",
  "signal": "optional 1-2 sentences",
  "category": one of ["Trending","Hot","Opinion","Convo","Divide","LittleCooker","Meta","Alpha"],
  "yesCount": integer 20-80,
  "endsInDays": integer 1-14,
  "hot": true or false
}`;

  try {
    const raw = await callLLM([
      { role: "system", content: system },
      { role: "user", content: `${topicContext}\nCard type: ${type}` },
    ]);
    if (!raw) return null;
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!parsed.title) return null;
    const endsInDays = Math.min(parsed.endsInDays || 3, 14);
    return {
      type,
      title: parsed.title,
      body: parsed.body,
      signal: parsed.signal,
      category: parsed.category || classFromLane(source?.lane, type),
      endsAt: type === "MARKET" ? new Date(Date.now() + endsInDays * 86400000) : undefined,
      hot: source?.lane.includes("hot") ? parsed.hot ?? true : parsed.hot ?? false,
      originator: fromX ? xHandle : undefined,
      sourceUrl: source?.url,
      yesCount: parsed.yesCount || 50,
      noCount: parsed.yesCount ? 100 - parsed.yesCount : 50,
    };
  } catch (e) {
    console.error("Generation failed:", e);
    return null;
  }
}

export async function generateBatch(): Promise<GeneratedPost[]> {
  const main = await generatePost();
  if (!main) return [];
  const out: GeneratedPost[] = [main];
  if (main.type !== "MARKET") {
    const q = main.title.includes("?") ? main.title : `Does this play out: ${main.title.slice(0, 70)}?`;
    out.push({
      type: "MARKET",
      title: q.slice(0, 90),
      body: main.body,
      signal: main.signal || main.body,
      category: main.category,
      endsAt: new Date(Date.now() + 3 * 86400000),
      hot: main.hot,
      originator: main.originator,
      sourceUrl: main.sourceUrl,
      yesCount: 50,
      noCount: 50,
    });
  }
  return out;
}
