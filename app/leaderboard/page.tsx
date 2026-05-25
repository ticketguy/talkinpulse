"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { REP_LEVEL_LABELS, RepLevel } from "@/types";
import Link from "next/link";

const LEVEL_COLORS: Record<string, string> = {
  NEW_WEB3: "#666", WEB3_ASSOCIATE: "#0ea5e9", CALLER: "#8b5cf6",
  SIGNAL_CALLER: "#f59e0b", VERIFIED_VOICE: "#34d399", CT_ORACLE: "#e01c1c",
};

export default function LeaderboardPage() {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RepLevel | "all">("all");

  const t = {
    bg: isDark ? "#0a0a0a" : "#f8f8f8",
    surface: isDark ? "#141414" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    sub: isDark ? "#888" : "#666",
  };

  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.json()).then(d => { setUsers(d); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? users : users.filter(u => u.repLevel === filter);

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Syne',sans-serif" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: isDark ? "#0d0d0d" : "#fff", borderBottom: `1px solid ${t.border}`, padding: "0 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", height: 54, gap: 12 }}>
          <Link href="/" style={{ fontSize: 14, color: t.muted, textDecoration: "none" }}>← Back</Link>
          <div style={{ fontSize: 16, fontWeight: 800 }}>CT <span style={{ color: t.accent }}>Leaderboard</span></div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        {/* Level filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${filter === "all" ? t.accent : t.border}`, background: filter === "all" ? "rgba(224,28,28,0.08)" : "transparent", color: filter === "all" ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>All</button>
          {Object.entries(REP_LEVEL_LABELS).map(([level, label]) => (
            <button key={level} onClick={() => setFilter(level as RepLevel)} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${filter === level ? LEVEL_COLORS[level] : t.border}`, background: filter === level ? `${LEVEL_COLORS[level]}15` : "transparent", color: filter === level ? LEVEL_COLORS[level] : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: t.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((u, i) => {
              const levelColor = LEVEL_COLORS[u.repLevel] || "#666";
              return (
                <div key={u.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, animation: `fadeUp .3s ease ${i * 0.03}s both` }}>
                  {/* Rank */}
                  <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                    {i === 0 ? <span style={{ fontSize: 18 }}>🥇</span>
                     : i === 1 ? <span style={{ fontSize: 18 }}>🥈</span>
                     : i === 2 ? <span style={{ fontSize: 18 }}>🥉</span>
                     : <span style={{ fontSize: 13, color: t.muted, fontWeight: 700 }}>#{i + 1}</span>}
                  </div>

                  {/* Avatar */}
                  <Avatar username={u.username} imageUrl={u.imageUrl} size={40} />

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>@{u.username}</span>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}25`, fontWeight: 700, letterSpacing: 1 }}>
                        {REP_LEVEL_LABELS[u.repLevel as RepLevel]}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: t.muted }}>
                      {u._count.votes} calls · {u._count.posts} posts · {u._count.comments} replies
                    </div>
                  </div>

                  {/* Scores */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: t.accent, fontFamily: "monospace" }}>{u.repScore}</div>
                    <div style={{ fontSize: 9, color: t.muted, textTransform: "uppercase", letterSpacing: 1 }}>REP</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: levelColor, marginTop: 2, fontFamily: "monospace" }}>{u.talkinPoints}</div>
                    <div style={{ fontSize: 9, color: t.muted, textTransform: "uppercase", letterSpacing: 1 }}>TP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
