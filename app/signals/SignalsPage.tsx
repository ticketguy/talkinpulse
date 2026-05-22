"use client";
import { useState, useEffect } from "react";
import { Post } from "@/types";
import { useAppStore } from "@/store";
import { yesPercent, timeAgo, CATEGORY_COLORS } from "@/lib/utils";

export function SignalsPage() {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    surface: isDark ? "#141414" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    textSub: isDark ? "#aaa" : "#555",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    sectionLabel: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, fontWeight: 700, marginBottom: 12 },
  };

  useEffect(() => {
    fetch("/api/posts?filter=all")
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markets = posts.filter((p) => p.type === "MARKET").slice(0, 6);
  const hotPosts = posts.filter((p) => p.hot).slice(0, 4);

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 20, lineHeight: 1.7 }}>
        Crowd conviction distilled. Where consensus is forming, what narratives are moving, and what CT is actually saying.
      </p>

      {/* Narrative momentum */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...t.sectionLabel, color: t.muted }}>Narrative Momentum</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 80, borderRadius: 12, background: isDark ? "#141414" : "#f8f8f8", border: `1px solid ${t.border}` }} className="skeleton" />
              ))
            : markets.map((m, i) => {
                const yesPct = yesPercent(m.yesCount, m.noCount);
                const dir = yesPct > 60 ? "↑" : yesPct < 40 ? "↓" : "→";
                const col = yesPct > 60 ? (isDark ? "#34d399" : "#16a34a") : yesPct < 40 ? t.accent : "#f59e0b";
                return (
                  <div key={m.id} style={{
                    padding: "13px 15px", borderRadius: 12,
                    background: t.surface, border: `1px solid ${t.border}`,
                    animation: `fadeUp .3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: col }}>{dir}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                          {m.title.slice(0, 58)}{m.title.length > 58 ? "…" : ""}
                        </span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {yesPct}
                      </span>
                    </div>
                    <div style={{ height: 3, background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0", borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
                      <div style={{ height: "100%", width: `${yesPct}%`, background: `linear-gradient(90deg, ${col}80, ${col})`, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: t.muted }}>{m._count?.votes || 0} callers · ${m.volume} vol</span>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Hot takes */}
      <div>
        <div style={{ ...t.sectionLabel, color: t.muted }}>🔥 Hot Right Now</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading
            ? [1, 2, 3].map((i) => (
                <div key={i} style={{ height: 70, borderRadius: 12, background: isDark ? "#141414" : "#f8f8f8", border: `1px solid ${t.border}` }} className="skeleton" />
              ))
            : hotPosts.map((p, i) => (
                <div key={p.id} style={{
                  padding: "12px 15px", borderRadius: 12,
                  background: t.surface, border: `1px solid ${t.border}`,
                  animation: `fadeUp .3s ease ${i * 0.06}s both`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <span style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 20,
                        background: `${CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] || "#888"}14`,
                        color: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] || "#888",
                        fontWeight: 700, letterSpacing: 1, marginBottom: 6, display: "inline-block",
                      }}>{p.category}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: "5px 0 0", lineHeight: 1.5 }}>
                        {p.title.slice(0, 80)}{p.title.length > 80 ? "…" : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                      {timeAgo(p.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
