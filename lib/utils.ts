import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { Category, PostType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "MMM d, yyyy");
}

export function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function yesPercent(yes: number, no: number) {
  const total = yes + no;
  if (total === 0) return 50;
  return Math.round((yes / total) * 100);
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Narrative: "#e01c1c",
  Founder: "#8b5cf6",
  Collection: "#0ea5e9",
  Meta: "#f59e0b",
  Alpha: "#10b981",
  Event: "#f97316",
  Debate: "#ec4899",
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  MARKET: "Market",
  TAKE: "Take",
  CONVERSATION: "Convo",
  EVENT: "Event",
};

export const POST_TYPE_ICONS: Record<PostType, string> = {
  MARKET: "📊",
  TAKE: "💬",
  CONVERSATION: "🔥",
  EVENT: "⚡",
};

export function generateAvatarUrl(username: string) {
  // Deterministic color from username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const h2 = (h + 60) % 360;
  return { h, h2, initials: username.slice(0, 2).toUpperCase() };
}
