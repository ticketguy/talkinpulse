import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, PostType } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: { temperature: 0.85, maxOutputTokens: 700, responseMimeType: "application/json" },
});

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
}

async function fetchLiveCryptoTopics(): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const queries = [
      "crypto twitter trending narrative today",
      "DeFi Solana Ethereum controversy debate 2026",
      "NFT Web3 community discussion trending",
      "crypto airdrop governance vote controversy",
    ];
    const query = queries[Math.floor(Math.random() * queries.length)];
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 5, topic: "finance" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({ title: r.title, url: r.url, content: r.content?.slice(0, 300), score: r.score }));
  } catch (e) {
    console.error("Tavily error:", e);
    return [];
  }
}

export async function generatePost(): Promise<GeneratedPost | null> {
  const rand = Math.random();
  const type: PostType = rand < 0.40 ? "MARKET" : rand < 0.65 ? "TAKE" : rand < 0.85 ? "CONVERSATION" : "EVENT";

  const liveResults = await fetchLiveCryptoTopics();
  const hasLive = liveResults.length > 0;
  const source = hasLive ? liveResults[Math.floor(Math.random() * liveResults.length)] : null;

  const topicContext = source
    ? `Based on this real article:\nTitle: ${source.title}\nURL: ${source.url}\nContent: ${source.content}`
    : "Generate based on current crypto Twitter trends";

  const systemPrompts: Record<PostType, string> = {
    MARKET: `You are TalkinPulse's market engine for Crypto Twitter.
Generate a CT prediction market based ONLY on the provided real source. Respond ONLY with valid JSON:
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
Generate a CT take based ONLY on the provided real source. Respond ONLY with valid JSON:
{
  "title": "bold take headline max 80 chars directly about the real topic",
  "body": "2-3 sentences expanding the take in CT voice based on the real content",
  "category": one of ["Narrative","Meta","Founder","Alpha"],
  "hot": true or false,
  "originator": "X handle of who would likely post this take",
  "notableReplies": "2-3 CT responses separated by |"
}`,
    CONVERSATION: `You are TalkinPulse's conversation engine for Crypto Twitter.
Generate a CT debate prompt based ONLY on the provided real source. Respond ONLY with valid JSON:
{
  "title": "debate question based on the real topic max 90 chars",
  "body": "1-2 sentences of context from the real content",
  "category": one of ["Narrative","Meta","Founder","Collection","Alpha","Debate"],
  "hot": true or false,
  "originator": "X handle who likely started this debate",
  "notableReplies": "2-3 CT perspectives from different sides separated by |"
}`,
    EVENT: `You are TalkinPulse's event engine for Crypto Twitter.
Generate a CT event post based ONLY on the provided real source. Respond ONLY with valid JSON:
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
    const fullPrompt = `${systemPrompts[type]}\n\n${topicContext}`;
    const result = await geminiModel.generateContent(fullPrompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Enforce max 14 days
    const endsInDays = Math.min(parsed.endsInDays || 7, 14);
    const endsAt = type === "MARKET" ? new Date(Date.now() + endsInDays * 86400000) : undefined;

    return {
      type,
      title: parsed.title,
      body: parsed.body,
      signal: parsed.signal,
      category: parsed.category || "Meta",
      endsAt,
      hot: parsed.hot ?? false,
      originator: parsed.originator || undefined,
      notableReplies: parsed.notableReplies || undefined,
      sourceUrl: source?.url || undefined,
      yesCount: parsed.yesCount || 50,
      noCount: parsed.yesCount ? 100 - parsed.yesCount : 50,
    };
  } catch (e: any) {
    if (e?.status === 429) { console.log("Gemini rate limited"); return null; }
    console.error("Generation failed:", e);
    return null;
  }
}
