import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, PostType } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.9,
    maxOutputTokens: 600,
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
  originator?: string;       // CT handle who started the narrative
  notableReplies?: string;   // 2-3 notable CT perspectives on the topic
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
  "Why the loudest CT accounts are usually the most wrong",
  "The builder vs. poster divide is getting worse",
];

const EVENT_TOPICS = [
  "Major protocol upgrade going live this week",
  "New airdrop eligibility snapshot announced",
  "CT debate: should NFT royalties be on-chain enforced?",
  "Governance vote: community treasury allocation",
  "New L2 bridge launch — CT divided on security",
  "Whale wallet movement sparking speculation",
];

export async function generatePost(): Promise<GeneratedPost | null> {
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

  const systemPrompts: Record<PostType, string> = {
    MARKET: `You are TalkinPulse's market engine for Crypto Twitter.
Generate a sharp CT prediction market. Respond ONLY with valid JSON, no markdown:
{
  "title": "yes/no question max 90 chars, CT-native language",
  "signal": "1-2 sentence CT signal — what data and sentiment suggest",
  "category": one of ["Narrative","Founder","Collection","Meta","Alpha"],
  "yesCount": integer 20-80,
  "endsInDays": integer 2-14,
  "hot": true or false,
  "originator": "realistic CT handle (e.g. @cobie, @inversebrah, @0xfoobar) who would have started this topic — make it believable for the narrative",
  "notableReplies": "2-3 short CT-style perspectives on this topic separated by | — e.g. 'Bears pointing to declining TVL | Bulls citing whale accumulation | Most degens waiting for confirmation'"
}`,
    TAKE: `You are TalkinPulse's take engine for Crypto Twitter.
Generate a sharp CT take/opinion post. Respond ONLY with valid JSON, no markdown:
{
  "title": "bold punchy take headline max 80 chars",
  "body": "2-3 sentence expansion of the take, CT voice, direct",
  "category": one of ["Narrative","Meta","Founder","Alpha"],
  "hot": true or false,
  "originator": "realistic CT handle who would post this take",
  "notableReplies": "2-3 short CT-style responses separated by | — mix of agree/disagree/nuance"
}`,
    CONVERSATION: `You are TalkinPulse's conversation engine for Crypto Twitter.
Generate a CT debate/conversation prompt. Respond ONLY with valid JSON, no markdown:
{
  "title": "debate question or conversation starter max 90 chars",
  "body": "1-2 sentences of context or framing for the debate",
  "category": one of ["Narrative","Meta","Founder","Collection","Alpha","Debate"],
  "hot": true or false,
  "originator": "realistic CT handle who started this debate",
  "notableReplies": "2-3 short CT-style takes from different sides separated by |"
}`,
    EVENT: `You are TalkinPulse's event engine for Crypto Twitter.
Generate a CT event/activity post. Respond ONLY with valid JSON, no markdown:
{
  "title": "event title max 80 chars",
  "body": "1-2 sentence description of what's happening and why it matters to CT",
  "category": one of ["Narrative","Meta","Collection","Alpha","Event"],
  "hot": true or false,
  "originator": "realistic CT handle or project account associated with this event",
  "notableReplies": "2-3 short CT reactions to this event separated by |"
}`,
  };

  try {
    const fullPrompt = `${systemPrompts[type]}\n\nGenerate content about: "${topic}"`;
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
