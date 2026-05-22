import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, POST_TYPE_ICONS, POST_TYPE_LABELS } from "@/lib/utils";
import { Category, PostType } from "@/types";

export function CategoryTag({ category }: { category: Category }) {
  const color = CATEGORY_COLORS[category] || "#888";
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: 1.5,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${color}14`,
        color,
        border: `1px solid ${color}30`,
        textTransform: "uppercase" as const,
        fontWeight: 700,
        flexShrink: 0,
        whiteSpace: "nowrap" as const,
      }}
    >
      {category}
    </span>
  );
}

export function PostTypeTag({ type }: { type: PostType }) {
  const colors: Record<PostType, string> = {
    MARKET: "#0ea5e9",
    TAKE: "#8b5cf6",
    CONVERSATION: "#f59e0b",
    EVENT: "#f97316",
  };
  const color = colors[type];
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: 1.2,
        padding: "3px 8px",
        borderRadius: 6,
        background: `${color}14`,
        color,
        border: `1px solid ${color}25`,
        fontWeight: 700,
        flexShrink: 0,
        whiteSpace: "nowrap" as const,
      }}
    >
      {POST_TYPE_ICONS[type]} {POST_TYPE_LABELS[type]}
    </span>
  );
}

export function AiBadge() {
  return (
    <span style={{
      fontSize: 8, letterSpacing: 1.5, padding: "2px 7px", borderRadius: 20,
      background: "rgba(16,185,129,0.1)", color: "#10b981",
      border: "1px solid rgba(16,185,129,0.2)", fontWeight: 700,
      textTransform: "uppercase" as const,
    }}>
      ✦ AI
    </span>
  );
}
