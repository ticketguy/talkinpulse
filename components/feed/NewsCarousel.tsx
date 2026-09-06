"use client";
import { useState } from "react";
import { Post } from "@/types";
import { timeAgo, yesPercent } from "@/lib/utils";
import { useAppStore } from "@/store";

export function NewsCarousel({
  news,
  rising,
}: {
  news: Post[];
  rising: Post[];
}) {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [nIdx, setNIdx] = useState(0);
  const [rIdx, setRIdx] = useState(0);
  const [open, setOpen] = useState<"news" | "rise" | null>(null);

  const t = {
    surface: isDark ? "#141414" : "#fff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#888" : "#666",
    accent: "#e01c1c",
  };

  const rise = rising[rIdx];
  const item = news[nIdx];
  if (!rise && !item) return null;

  const step = (side: "rise" | "news", dir: number) => {
    if (side === "rise" && rising.length) setRIdx((i) => (i + dir + rising.length) % rising.length);
    if (side === "news" && news.length) setNIdx((i) => (i + dir + news.length) % news.length);
  };

  const card = (
    side: "rise" | "news",
    post: Post | undefined,
    label: string,
    count: number,
    idx: number,
  ) => {
    if (!post) {
      return (
        <div style={{
          flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: 14, minHeight: 118,
        }}>
          <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
          <p style={{ fontSize: 13, color: t.muted, margin: "10px 0 0" }}>Nothing today.</p>
        </div>
      );
    }
    const expanded = open === side;
    const yp = yesPercent(post.yesCount, post.noCount);
    return (
      <article style={{
        flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 12, padding: 14, minHeight: 118, display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
          {count > 1 && (
            <span style={{ display: "flex", gap: 4 }}>
              <button type="button" onClick={() => step(side, -1)} style={navBtn(t)} aria-label="prev">‹</button>
              <span style={{ fontSize: 10, color: t.muted, alignSelf: "center" }}>{idx + 1}/{count}</span>
              <button type="button" onClick={() => step(side, 1)} style={navBtn(t)} aria-label="next">›</button>
            </span>
          )}
        </div>
        <p style={{
          fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: 0, color: t.text,
          display: "-webkit-box", WebkitLineClamp: expanded ? 8 : 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        } as any}>{post.title}</p>
        {expanded && post.body && (
          <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, margin: "8px 0 0" }}>{post.body}</p>
        )}
        {side === "rise" && post.type === "MARKET" && (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 8 }}>YES {yp}% · NO {100 - yp}%</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 10 }}>
          <span style={{ fontSize: 10, color: t.muted }}>{timeAgo(post.createdAt)}</span>
          <button
            type="button"
            onClick={() => setOpen(expanded ? null : side)}
            style={{ background: "none", border: "none", color: t.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {expanded ? "Close" : "View full"}
          </button>
        </div>
        {expanded && post.sourceUrl && (
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: t.accent, fontWeight: 700, marginTop: 6, textDecoration: "none" }}>
            Source ↗
          </a>
        )}
      </article>
    );
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }} className="spotlight-row">
        {card("rise", rise, rise?.category || "On the rise", rising.length, rIdx)}
        {card("news", item, "News", news.length, nIdx)}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .spotlight-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

function navBtn(t: { border: string; muted: string; surface: string }) {
  return {
    width: 22, height: 22, borderRadius: 6, border: `1px solid ${t.border}`,
    background: t.surface, color: t.muted, cursor: "pointer", lineHeight: "18px",
  } as const;
}
