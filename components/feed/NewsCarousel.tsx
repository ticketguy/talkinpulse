"use client";
import { Post } from "@/types";
import { timeAgo } from "@/lib/utils";
import { useAppStore } from "@/store";

export function NewsCarousel({ posts }: { posts: Post[] }) {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const t = {
    surface: isDark ? "#141414" : "#fff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#888" : "#666",
    accent: "#e01c1c",
  };

  if (!posts.length) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>Today’s news</h2>
        <span style={{ fontSize: 11, color: t.muted }}>swipe</span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 8,
        }}
      >
        {posts.map((p) => (
          <article
            key={p.id}
            style={{
              minWidth: "min(86vw, 320px)",
              maxWidth: 320,
              scrollSnapAlign: "start",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: 16,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              {p.type} · {p.category}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px", color: t.text }}>{p.title}</p>
            {p.body && <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.55, margin: "0 0 10px" }}>{p.body}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: t.muted }}>{timeAgo(p.createdAt)}</span>
              {p.sourceUrl && (
                <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: t.accent, fontWeight: 700, textDecoration: "none" }}>
                  Open
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
