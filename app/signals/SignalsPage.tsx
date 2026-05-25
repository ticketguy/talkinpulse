"use client";
import { useState, useEffect } from "react";
import { Post } from "@/types";
import { useAppStore } from "@/store";
import { yesPercent, timeAgo, CATEGORY_COLORS } from "@/lib/utils";
import Link from "next/link";

export function SignalsPage() {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [posts, setPosts] = useState<Post[]>([]);
  const [resolved, setResolved] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    surface: isDark ? "#141414" : "#ffffff",
    surfaceHigh: isDark ? "#1a1a1a" : "#f3f3f3",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    textSub: isDark ? "#aaa" : "#555",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    yes: isDark ? "#34d399" : "#16a34a",
    no: "#e01c1c",
  };

  const sl = { fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, fontWeight: 700, color: t.muted, marginBottom: 12 };

  useEffect(() => {
    Promise.all([
      fetch("/api/posts?filter=markets").then(r => r.json()),
      fetch("/api/posts?filter=all").then(r => r.json()),
    ]).then(([markets, all]) => {
      const open = (markets.posts || []).filter((p: Post) => !p.resolvedAt);
      const done = (all.posts || []).filter((p: Post) => p.resolvedAt);
      setPosts(open);
      setResolved(done.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const allPosts = posts.slice(0, 6);

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 24, lineHeight: 1.7 }}>
        Where CT conviction is forming. Active markets, resolved outcomes, and who's driving the narratives.
      </p>

      {/* Active narrative momentum */}
      <div style={{ marginBottom: 28 }}>
        <div style={sl}>Active Narrative Momentum</div>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: isDark ? "#141414" : "#f3f3f3", border: `1px solid ${t.border}`, marginBottom: 8 }} />)
        ) : allPosts.length === 0 ? (
          <div style={{ color: t.muted, fontSize: 13 }}>No active markets yet.</div>
        ) : allPosts.map((m, i) => {
          const pct = yesPercent(m.yesCount, m.noCount);
          const dir = pct > 60 ? "↑" : pct < 40 ? "↓" : "→";
          const col = pct > 60 ? t.yes : pct < 40 ? t.no : "#f59e0b";
          const catCol = CATEGORY_COLORS[m.category as keyof typeof CATEGORY_COLORS] || "#888";

          return (
            <div key={m.id} style={{ padding: "14px 16px", borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 8, animation: `fadeUp .3s ease ${i*0.05}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: `${catCol}12`, color: catCol, fontWeight: 700, letterSpacing: 1 }}>{m.category}</span>
                    {m.originator && <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>{m.originator}</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: 0, lineHeight: 1.5 }}>{m.title.slice(0,72)}{m.title.length>72?"…":""}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: col, fontFamily: "monospace" }}>{pct}</span>
                  <div style={{ fontSize: 10, color: col }}>{dir} YES</div>
                </div>
              </div>
              <div style={{ height: 3, background: t.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${col}70,${col})`, borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: t.muted }}>{m._count?.votes || 0} callers · {m.pointsPool} pts pool</span>
                {m.endsAt && <span style={{ fontSize: 11, color: t.muted }}>ends {timeAgo(m.endsAt)}</span>}
              </div>
              {m.signal && <p style={{ fontSize: 12, color: t.textSub, marginTop: 8, lineHeight: 1.6, padding: "8px 10px", borderRadius: 8, background: isDark ? "rgba(224,28,28,0.04)" : "#fff8f8", borderLeft: `2px solid ${t.accent}` }}>{m.signal}</p>}
            </div>
          );
        })}
      </div>

      {/* Resolved markets */}
      {resolved.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={sl}>Recently Resolved</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resolved.map((m, i) => {
              const outcome = m.resolvedOutcome;
              const outcomeColor = outcome === "YES" ? t.yes : outcome === "NO" ? t.no : "#f59e0b";

              return (
                <div key={m.id} style={{ padding: "14px 16px", borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, animation: `fadeUp .3s ease ${i*0.05}s both` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: 0, flex: 1, lineHeight: 1.5 }}>{m.title}</p>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: `${outcomeColor}15`, color: outcomeColor, border: `1px solid ${outcomeColor}30`, flexShrink: 0 }}>
                      {outcome === "NEUTRAL" ? "NEUTRAL" : `${outcome} WON`}
                    </span>
                  </div>

                  {/* Plain english resolution */}
                  {m.resolutionNote && (
                    <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.65, margin: "0 0 8px", padding: "8px 10px", borderRadius: 8, background: isDark ? `${outcomeColor}08` : `${outcomeColor}06`, borderLeft: `2px solid ${outcomeColor}` }}>
                      🏁 {m.resolutionNote}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 11, color: t.muted }}>YES {m.yesCount} · NO {m.noCount}</span>
                    <span style={{ fontSize: 11, color: t.muted }}>{m.pointsPool} pts distributed</span>
                    {m.resolvedAt && <span style={{ fontSize: 11, color: t.muted }}>resolved {timeAgo(m.resolvedAt)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard teaser */}
      <div style={{ padding: "16px", borderRadius: 12, background: t.surfaceHigh, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>CT Leaderboard</div>
          <div style={{ fontSize: 12, color: t.muted }}>Top callers ranked by REP score and accuracy</div>
        </div>
        <Link href="/leaderboard" style={{ padding: "7px 16px", borderRadius: 8, background: t.accent, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>View →</Link>
      </div>
    </div>
  );
}
