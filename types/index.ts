export type PostType = "MARKET" | "TAKE" | "CONVERSATION" | "EVENT";

export type Category =
  | "Narrative"
  | "Founder"
  | "Collection"
  | "Meta"
  | "Alpha"
  | "Event"
  | "Debate";

export interface User {
  id: string;
  xId: string;
  username: string;
  displayName: string;
  imageUrl?: string | null;
  bio?: string | null;
  repScore: number;
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
  volume: string;
  isAiGen: boolean;
  createdAt: string;
  author?: User | null;
  userVote?: "yes" | "no" | null;
  _count?: { comments: number; votes: number };
}

export interface Vote {
  id: string;
  side: "yes" | "no";
  userId: string;
  postId: string;
}

export interface Comment {
  id: string;
  body: string;
  userId: string;
  postId: string;
  createdAt: string;
  user: User;
}

export type FeedFilter = "all" | "hot" | "new" | "markets" | "takes" | "events" | "conversations";

export type Theme = "dark" | "light";
