import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, PostType } from "@/types";

// Primary: Gemini Flash (free tier ~1500 req/day, no CC required)
// To revert to Claude: set USE_CLAUDE=true in env and add ANTHROPIC_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.9,
    maxOutputTokens: 500,
    responseMimeType: "application/json", // forces clean JSON — no markdown fences needed
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
  volume: string;
  yesCount?: number;
  noCount?: number;
}

const CT_TOPICS = [
  "Solana meme season — final leg or already over?",
  "Is restaking the most overhyped narrative of 2026?",
  "Will BTC dominance stay above 55% through Q3 2026?",
  "NFT royalties — will any major marketplace restore them this year?",
  "Is Base winning the L2 wars or still too early to call?",
  "Will the next big CT influencer NFT drop rug within 60 days?",
  "Is the RWA narrative finally finding real product-market fit?",
  "Will Ethereum ETF inflows outpace Bitcoin ETF inflows this quarter?",
  "Are CT debates about AI replacing devs actually changing hiring?",
  "Is the memecoin supercycle thesis dead or just resting?",
  "Will any new L1 seriously challenge Solana this cycle?",
  "Are governance tokens actually worthless in 2026?",
];

const TAKE_TOPICS = [
  "Why most CT alpha is just recycled narratives from 2021",
  "The real reason communities die after mint",
  "Why builders who post threads ship less",
  "The difference between CT signal and CT noise",
  "Why NFT utility failed and what actually works",
  "How VCs are quietly reshaping CT culture",
];

const EVENT_TOPICS = [
  "Major protocol upgrade going live this week",
  "New airdrop eligibility snapshot announced",
  "CT debate: should NFT royalties be on-chain enforced?",
  "Governance vote: community treasury allocation",
];

export async function generatePost(): Promise<GeneratedPost | null> {
  // Weighted distribution: 45% markets, 25% takes, 18% convos, 12% events
  const rand = Math.random();
  const type: PostType =
    rand < 0.45 ? "MARKET" :
    rand < 0.70 ? "TAKE" :
    rand < 0.88 ? "CONVERSATION" : "EVENT";

  const topics =
    type === "MARKET" ? CT_TOPICS :
    type === "TAKE" ? TAKE_TOPICS :
    EVENT_TOPICS;

  const topic = topics[Math.floor(Math.random() * topics.length)];

  // Prompts unchanged — same structure as Claude version
  const systemPrompts: Record<PostType, string> = {
    MARKET: `You are TalkinPulse's market engine for Crypto Twitter.
Generate a sharp CT prediction market. Respond ONLY with valid JSON, no markdown:
{
  "title": "yes/no question max 90 chars, CT-native language",
  "signal": "1-2 sentence CT signal — what data and sentiment suggest",
  "category": one of ["Narrative","Founder","Collection","Meta","Alpha"],
  "yesCount": integer 20-80,
  "endsInDays": integer 2-14,
  "volume": "XX.XK",
  "hot": true or false
}`,
    TAKE: `You are TalkinPulse's take engine for Crypto Twitter.
Generate a sharp CT take/opinion post. Respond ONLY with valid JSON, no markdown:
{
  "title": "bold punchy take headline max 80 chars",
  "body": "2-3 sentence expansion of the take, CT voice, direct",
  "category": one of ["Narrative","Meta","Founder","Alpha"],
  "hot": true or false
}`,
    CONVERSATION: `You are TalkinPulse's conversation engine for Crypto Twitter.
Generate a CT debate/conversation prompt. Respond ONLY with valid JSON, no markdown:
{
  "title": "debate question or conversation starter max 90 chars",
  "body": "1-2 sentences of context or framing for the debate",
  "category": one of ["Narrative","Meta","Founder","Collection","Alpha","Debate"],
  "hot": true or false
}`,
    EVENT: `You are TalkinPulse's event engine for Crypto Twitter.
Generate a CT event/activity post. Respond ONLY with valid JSON, no markdown:
{
  "title": "event title max 80 chars",
  "body": "1-2 sentence description of what's happening and why it matters",
  "category": one of ["Narrative","Meta","Collection","Alpha","Event"],
  "hot": true or false
}`,
  };

  try {
    // Gemini call — combine system + user prompt (Gemini doesn't have separate system role)
    const fullPrompt = `${systemPrompts[type]}\n\nGenerate content about: "${topic}"`;
    const result = await geminiModel.generateContent(fullPrompt);
    const raw = result.response.text();

    // responseMimeType: "application/json" means raw is already clean JSON
    // but strip fences defensively just in case
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
      volume: parsed.volume || "0K",
      yesCount: parsed.yesCount,
      noCount: parsed.yesCount ? 100 - parsed.yesCount : undefined,
    };
  } catch (e) {
    console.error("Gemini generation failed:", e);
    return null;
  }
}
