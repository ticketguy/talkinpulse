export type PostType = "MARKET" | "TAKE" | "CONVERSATION" | "EVENT";
export type Category =
  | "Narrative"
  | "Founder"
  | "Collection"
  | "Meta"
  | "Alpha"
  | "Event"
  | "Debate"
  | "Trending"
  | "Hot"
  | "Opinion"
  | "Convo"
  | "Divide"
  | "LittleCooker";
export type RepLevel = "NEW_WEB3" | "WEB3_ASSOCIATE" | "CALLER" | "SIGNAL_CALLER" | "VERIFIED_VOICE" | "CT_ORACLE";
export type AdminRole = "SUPER_ADMIN" | "MODERATOR" | "POINTS_MANAGER" | "READ_ONLY";

export const REP_LEVEL_LABELS: Record<RepLevel, string> = {
  NEW_WEB3: "New to Web3",
  WEB3_ASSOCIATE: "Web3 Associate",
  CALLER: "Caller",
  SIGNAL_CALLER: "Signal Caller",
  VERIFIED_VOICE: "Verified Voice",
  CT_ORACLE: "CT Oracle",
};

export const REP_LEVEL_THRESHOLDS: Record<RepLevel, number> = {
  NEW_WEB3: 0,
  WEB3_ASSOCIATE: 100,
  CALLER: 300,
  SIGNAL_CALLER: 700,
  VERIFIED_VOICE: 1500,
  CT_ORACLE: 3000,
};

export interface User {
  id: string;
  xId: string;
  username: string;
  displayName: string;
  imageUrl?: string | null;
  customBio?: string | null;
  customImageUrl?: string | null;
  bio?: string | null;
  repScore: number;
  repLevel: RepLevel;
  talkinPoints: number;
  isAdmin: boolean;
  adminRole?: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body?: string | null;
  signal?: string | null;
  category: Category;
  endsAt?: string | null;
  yesCount: number;
  noCount: number;
  hot: boolean;
  originator?: string | null;
  notableReplies?: string | null;
  sourceUrl?: string | null;
  xPostId?: string | null;
  isAiGen: boolean;
  resolvedAt?: string | null;
  resolvedOutcome?: string | null;
  resolutionNote?: string | null;
  pointsPool: number;
  createdAt: string;
  author?: User | null;
  userVote?: UserVote | null;
  _count?: { comments: number; votes: number };
}

export interface UserVote {
  side: "yes" | "no";
  pointsWagered: number;
}

export interface Vote {
  id: string;
  side: "yes" | "no";
  pointsWagered: number;
  pointsWon: number;
  userId: string;
  postId: string;
}

export interface Comment {
  id: string;
  body: string;
  userId: string;
  postId: string;
  xReplyId?: string | null;
  createdAt: string;
  user: User;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description?: string | null;
  postId?: string | null;
  createdAt: string;
}

export type FeedFilter =
  | "all"
  | "hot"
  | "new"
  | "news"
  | "markets"
  | "takes"
  | "events"
  | "conversations"
  | "trending"
  | "opinion"
  | "divide"
  | "cooker";
export type Theme = "dark" | "light";
