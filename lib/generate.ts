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
  notableReplies?: string;
  sourceUrl?: string;
  yesCount?: number;
  noCount?: number;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  lane: "hot" | "quiet";
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
      topic: "finance",
      days: 7,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function fetchLiveCryptoTopics(): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const [hotRaw, quietRaw] = await Promise.all([
      tavilySearch(key, "trending crypto blockchain web3 news discussion today"),
      tavilySearch(key, "underreported crypto blockchain protocol community not bitcoin ethereum"),
    ]);
    const seen = new Set<string>();
    const out: TavilyResult[] = [];
    const push = (r: any, lane: "hot" | "quiet") => {
      if (!r?.url || seen.has(r.url)) return;
      seen.add(r.url);
      out.push({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 300),
        score: r.score,
        lane,
      });
    };
    hotRaw.forEach((r) => push(r, "hot"));
    quietRaw.forEach((r) => push(r, "quiet"));
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
  console.error("LLM unexpected payload", typeof payload);
  return null;
}

async function callChat(
  label: string,
  base: string,
  key: string,
  model: string,
  messages: { role: string; content: string }[],
  extra: Record<string, unknown> = {}
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
      ...extra,
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

async function callLLM(messages: { role: string; content: string }[]): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const out = await callChat("Groq", GROQ_BASE, groqKey, GROQ_MODEL, messages);
    if (out) return out;
    console.log("Groq failed, trying OpenAI backup");
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return callChat("OpenAI", OPENAI_BASE, openaiKey, OPENAI_MODEL, messages);
  }

  console.error("No GROQ_API_KEY or OPENAI_API_KEY");
  return null;
}

export async function generatePost(): Promise<GeneratedPost | null> {
  const rand = Math.random();
  const type: PostType = rand < 0.40 ? "MARKET" : rand < 0.65 ? "TAKE" : rand < 0.85 ? "CONVERSATION" : "EVENT";

  const liveResults = await fetchLiveCryptoTopics();
  const preferQuiet = Math.random() < 0.45;
  const pool = preferQuiet
    ? liveResults.filter((r) => r.lane === "quiet").concat(liveResults)
    : liveResults.filter((r) => r.lane === "hot").concat(liveResults);
  const source = pool.length > 0 ? pool[0] : liveResults[0] || null;

  const topicContext = source
    ? `Lane: ${source.lane === "hot" ? "hot / trending" : "undercovered / not dominating the timeline"}.\nBased on this real article:\nTitle: ${source.title}\nURL: ${source.url}\nContent: ${source.content}`
    : "Generate based on current crypto and blockchain discussion. Mix well-known and undercovered topics.";

  const systemPrompts: Record<PostType, string> = {
    MARKET: `You are TalkinPulse's market engine for Crypto Twitter.
Generate a CT prediction market based ONLY on the provided real source. Cover crypto, blockchain, web3 broadly. Respond ONLY with valid JSON:
{
  "title": "sharp yes/no question max 90 chars based on the real topic",
  "signal": "1-2 sentences of what the source suggests about sentiment/outcome",
  "category": one of ["Narrative","Founder","Collection","Meta","Alpha"],
  "yesCount": integer 20-80,
  "endsInDays": integer between 1 and 14,
  "hot": true or false,
  "originator": "X handle of who likely started this discussion e.g. @cobie",
  "notableReplies": "2-3 CT perspectives separated by |"
}`,
    TAKE: `You are TalkinPulse's take engine for Crypto Twitter.
Generate a CT take based ONLY on the provided real source. Cover crypto, blockchain, web3 broadly. Respond ONLY with valid JSON:
{
  "title": "bold take headline max 80 chars directly about the real topic",
  "body": "2-3 sentences expanding the take in CT voice based on the real content",
  "category": one of ["Narrative","Meta","Founder","Alpha"],
  "hot": true or false,
  "originator": "X handle of who would likely post this take",
  "notableReplies": "2-3 CT responses separated by |"
}`,
    CONVERSATION: `You are TalkinPulse's conversation engine for Crypto Twitter.
Generate a CT debate prompt based ONLY on the provided real source. Cover crypto, blockchain, web3 broadly. Respond ONLY with valid JSON:
{
  "title": "debate question based on the real topic max 90 chars",
  "body": "1-2 sentences of context from the real content",
  "category": one of ["Narrative","Meta","Founder","Collection","Alpha","Debate"],
  "hot": true or false,
  "originator": "X handle who likely started this debate",
  "notableReplies": "2-3 CT perspectives from different sides separated by |"
}`,
    EVENT: `You are TalkinPulse's event engine for Crypto Twitter.
Generate a CT event post based ONLY on the provided real source. Cover crypto, blockchain, web3 broadly. Respond ONLY with valid JSON:
{
  "title": "specific event title max 80 chars based on the real news",
  "body": "1-2 sentences about what's actually happening",
  "category": one of ["Narrative","Meta","Collection","Alpha","Event"],
  "hot": true or false,
  "originator": "X handle or project account tied to this event",
  "notableReplies": "2-3 CT reactions separated by |"
}`,
  };

  try {
    const raw = await callLLM([
      { role: "system", content: systemPrompts[type] },
      { role: "user", content: topicContext },
    ]);
    if (!raw) return null;
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!parsed.title) return null;

    const endsInDays = Math.min(parsed.endsInDays || 7, 14);
    const endsAt = type === "MARKET" ? new Date(Date.now() + endsInDays * 86400000) : undefined;

    return {
      type,
      title: parsed.title,
      body: parsed.body,
      signal: parsed.signal,
      category: parsed.category || "Meta",
      endsAt,
      hot: source?.lane === "hot" ? parsed.hot ?? true : parsed.hot ?? false,
      originator: parsed.originator || undefined,
      notableReplies: parsed.notableReplies || undefined,
      sourceUrl: source?.url || undefined,
      yesCount: parsed.yesCount || 50,
      noCount: parsed.yesCount ? 100 - parsed.yesCount : 50,
    };
  } catch (e) {
    console.error("Generation failed:", e);
    return null;
  }
}
