import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, PostType } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.9,
    maxOutputTokens: 700,
    responseMimeType: "application/json",
  },
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
  yesCount?: number;
  noCount?: number;
}

// Fetch real trending crypto topics via Tavily
async function fetchLiveCryptoTopics(): Promise<string[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return [];

  try {
    const queries = [
      "crypto twitter trending today",
      "DeFi NFT narrative crypto CT 2026",
      "Solana Ethereum Bitcoin latest news today",
    ];

    const query = queries[Math.floor(Math.random() * queries.length)];

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
        topic: "finance",
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();

    // Extract titles and snippets from results
    const topics: string[] = [];
    if (data.answer) topics.push(data.answer.slice(0, 200));
    if (data.results) {
      data.results.forEach((r: any) => {
        if (r.title) topics.push(r.title);
        if (r.content) topics.push(r.content.slice(0, 150));
      });
    }
    return topics.slice(0, 5);
  } catch (e) {
    console.error("Tavily fetch failed:", e);
    return [];
  }
}

// Fallback static topics
const FALLBACK_TOPICS: Record<PostType, string[]> = {
  MARKET: [
    "Will Solana maintain dominance over other L1s this quarter?",
    "Is the memecoin supercycle thesis dead or just resting?",
    "Will BTC dominance stay above 55% through Q3 2026?",
    "Are governance tokens actually worthless in 2026?",
    "Will any new L1 seriously challenge Solana this cycle?",
    "Is Base winning the L2 wars or still too early to call?",
  ],
  TAKE: [
    "Why most CT alpha is just recycled narratives from 2021",
    "The real reason NFT communities die after mint",
    "Why builders who post threads ship less",
    "The difference between CT signal and CT noise",
    "Why the loudest CT accounts are usually the most wrong",
    "VCs are quietly reshaping CT culture and nobody is talking about it",
  ],
  CONVERSATION: [
    "Should NFT royalties be enforced at protocol level or left to marketplaces?",
    "Is the airdrop farming meta killing genuine crypto adoption?",
    "Are CT debates about AI replacing devs actually changing hiring?",
    "Is DeFi summer coming back or is institutional money changing everything?",
  ],
  EVENT: [
    "Major protocol upgrade going live this week",
    "New airdrop eligibility snapshot announced",
    "Governance vote live: community treasury allocation",
    "Whale wallet movement sparking speculation on CT",
  ],
};

export async function generatePost(): Promise<GeneratedPost | null> {
  const rand = Math.random();
  const type: PostType =
    rand < 0.40 ? "MARKET" :
    rand < 0.65 ? "TAKE" :
    rand < 0.85 ? "CONVERSATION" : "EVENT";

  // Try to get live topics from Tavily, fall back to static
  const liveTopics = await fetchLiveCryptoTopics();
  const fallbackTopics = FALLBACK_TOPICS[type];

  // Mix live and fallback — prefer live if available
  const allTopics = liveTopics.length > 0
    ? [...liveTopics, ...fallbackTopics]
    : fallbackTopics;

  const topic = allTopics[Math.floor(Math.random() * Math.min(allTopics.length, 6))];

  const systemPrompts: Record<PostType, string> = {
    MARKET: `You are TalkinPulse's market engine for Crypto Twitter.
Based on the provided topic or news, generate a sharp CT prediction market.
Respond ONLY with valid JSON, no markdown:
{
  "title": "sharp yes/no question max 90 chars, CT-native language, based on the topic",
  "signal": "1-2 sentence CT signal — what the sentiment and data suggest right now",
  "category": one of ["Narrative","Founder","Collection","Meta","Alpha"],
  "yesCount": integer 20-80,
  "endsInDays": integer 2-14,
  "hot": true or false,
  "originator": "realistic CT handle (e.g. @cobie, @inversebrah, @0xfoobar, @sassal0x) who would have started this topic",
  "notableReplies": "2-3 short CT-style perspectives separated by | — e.g. 'Bears pointing to declining TVL | Bulls citing whale accumulation | Degens waiting for confirmation'"
}`,
    TAKE: `You are TalkinPulse's take engine for Crypto Twitter.
Based on the provided topic or news, generate a sharp CT take.
Respond ONLY with valid JSON, no markdown:
{
  "title": "bold punchy take headline max 80 chars, based on real CT sentiment around the topic",
  "body": "2-3 sentences expanding the take in CT voice — direct, confident, no fluff",
  "category": one of ["Narrative","Meta","Founder","Alpha"],
  "hot": true or false,
  "originator": "realistic CT handle who would post this take",
  "notableReplies": "2-3 short CT responses separated by | — mix of agree/disagree/nuance"
}`,
    CONVERSATION: `You are TalkinPulse's conversation engine for Crypto Twitter.
Based on the provided topic or news, generate a CT debate prompt.
Respond ONLY with valid JSON, no markdown:
{
  "title": "debate question or conversation starter max 90 chars",
  "body": "1-2 sentences of context framing the debate based on what's actually happening",
  "category": one of ["Narrative","Meta","Founder","Collection","Alpha","Debate"],
  "hot": true or false,
  "originator": "realistic CT handle who started this debate",
  "notableReplies": "2-3 short CT-style takes from different sides separated by |"
}`,
    EVENT: `You are TalkinPulse's event engine for Crypto Twitter.
Based on the provided topic or news, generate a CT event post.
Respond ONLY with valid JSON, no markdown:
{
  "title": "event title max 80 chars — specific, not generic",
  "body": "1-2 sentences — what's happening and why CT is talking about it",
  "category": one of ["Narrative","Meta","Collection","Alpha","Event"],
  "hot": true or false,
  "originator": "realistic CT handle or project account associated with this",
  "notableReplies": "2-3 short CT reactions separated by |"
}`,
  };

  try {
    const fullPrompt = `${systemPrompts[type]}\n\nTopic/news to base this on: "${topic}"`;
    const result = await geminiModel.generateContent(fullPrompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const endsAt = parsed.endsInDays
      ? new Date(Date.now() + parsed.endsInDays * 86400000)
      : undefined;

    return {
      type,
      title: parsed.title,
      body: parsed.body,
      signal: parsed.signal,
      category: parsed.category || "Meta",
      endsAt,
      hot: parsed.hot ?? false,
      originator: parsed.originator || null,
      notableReplies: parsed.notableReplies || null,
      yesCount: parsed.yesCount,
      noCount: parsed.yesCount ? 100 - parsed.yesCount : undefined,
    };
  } catch (e: any) {
    if (e?.status === 429) { console.log("Gemini rate limited — retrying next cycle"); return null; }
    console.error("Gemini generation failed:", e);
    return null;
  }
}
