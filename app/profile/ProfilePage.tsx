"use client";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { PostTypeTag, CategoryTag } from "@/components/ui/Tags";
import { timeAgo } from "@/lib/utils";

export function ProfilePage() {
  const { data: session, status } = useSession();
  const { theme, votes } = useAppStore();
  const isDark = theme === "dark";
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  const user = session?.user as any;
  const myVotes = Object.entries(votes);

  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => { setProfile(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading") return (
    <div style={{ textAlign: "center", padding: "48px 0", color: t.muted }}>Loading…</div>
  );

  if (!session) return (
    <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp .3s ease" }}>
      <div style={{ fontSize: 42, marginBottom: 16 }}>𝕏</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Connect your X account</h2>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 28, lineHeight: 1.65 }}>
        Sign in with X to track your calls, build your CT reputation, and get your TalkinPulse profile.
      </p>
      <button
        onClick={() => signIn("twitter")}
        style={{
          padding: "12px 28px", borderRadius: 10,
          background: t.accent, border: "none", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", boxShadow: "0 4px 16px rgba(224,28,28,0.35)",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Sign in with X
      </button>
    </div>
  );

  const repScore = profile?.repScore || user?.repScore || 120;
  const totalCalls = profile?.votes?.length || myVotes.length;
  const accuracy = profile?.accuracy || (totalCalls > 0 ? 65 : 0);
  const username = profile?.username || user?.username || user?.name || "user";
  const displayName = profile?.displayName || user?.name || username;
  const imageUrl = profile?.imageUrl || user?.image;

  const rank =
    repScore > 2000 ? "Signal Oracle" :
    repScore > 1000 ? "Signal Caller" :
    repScore > 500  ? "Active Caller" :
    repScore > 200  ? "Rising Caller" : "New Caller";

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      {/* Profile card */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "20px 18px", marginBottom: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -20, right: -20, width: 140, height: 140,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(224,28,28,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
          <Avatar username={username} imageUrl={imageUrl} size={50} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>{displayName}</div>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, marginTop: 1 }}>@{username}</div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{rank}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.accent, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {repScore.toLocaleString()}
            </div>
            <div style={{ fontSize: 9, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>REP</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "Calls", val: totalCalls, color: t.accent },
            { label: "Accuracy", val: totalCalls > 0 ? `${accuracy}%` : "—", color: t.yes },
            { label: "Posts", val: profile?.posts?.length || 0, color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "11px 10px", borderRadius: 10,
              background: t.surfaceHigh, border: `1px solid ${t.border}`, textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 9, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Call history */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: t.muted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
          Your Calls
        </div>
        {profile?.votes?.length > 0 ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            {profile.votes.slice(0, 10).map((v: any, i: number) => (
              <div key={v.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderBottom: i < Math.min(profile.votes.length, 10) - 1 ? `1px solid ${t.border}` : "none",
              }}>
                <span style={{ fontSize: 12, color: t.textSub, flex: 1, lineHeight: 1.4 }}>
                  {v.post?.title?.slice(0, 55)}{(v.post?.title?.length || 0) > 55 ? "…" : ""}
                </span>
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: 12, fontWeight: 700, flexShrink: 0,
                  background: v.side === "yes" ? `${t.yes}15` : "rgba(224,28,28,0.1)",
                  color: v.side === "yes" ? t.yes : t.no,
                }}>{v.side.toUpperCase()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "24px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: t.muted }}>No calls yet — head to the Feed and make your first call.</p>
          </div>
        )}
      </div>

      {/* My posts */}
      {profile?.posts?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
            Your Posts
          </div>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            {profile.posts.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id} style={{
                padding: "11px 14px",
                borderBottom: i < Math.min(profile.posts.length, 5) - 1 ? `1px solid ${t.border}` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <PostTypeTag type={p.type} />
                  <CategoryTag category={p.category} />
                  <span style={{ fontSize: 10, color: t.muted, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeAgo(p.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: t.text, lineHeight: 1.5, margin: 0 }}>
                  {p.title.slice(0, 70)}{p.title.length > 70 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
