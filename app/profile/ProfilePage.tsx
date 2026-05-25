"use client";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { PostTypeTag, CategoryTag } from "@/components/ui/Tags";
import { timeAgo } from "@/lib/utils";
import { REP_LEVEL_LABELS, RepLevel } from "@/types";
import Link from "next/link";

const LEVEL_COLORS: Record<string, string> = {
  NEW_WEB3: "#666", WEB3_ASSOCIATE: "#0ea5e9", CALLER: "#8b5cf6",
  SIGNAL_CALLER: "#f59e0b", VERIFIED_VOICE: "#34d399", CT_ORACLE: "#e01c1c",
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"calls" | "posts" | "points">("calls");

  const t = {
    surface: isDark ? "#141414" : "#ffffff",
    surfaceHigh: isDark ? "#1a1a1a" : "#f3f3f3",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    sub: isDark ? "#aaa" : "#555",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    yes: isDark ? "#34d399" : "#16a34a",
    no: "#e01c1c",
    inputBg: isDark ? "#111" : "#f8f8f8",
  };

  const user = session?.user as any;

  useEffect(() => {
    if (session?.user) {
      fetch("/api/profile").then(r => r.json()).then(d => { setProfile(d); setEditBio(d.customBio || d.bio || ""); });
    }
  }, [session]);

  const saveProfile = async () => {
    setSaving(true);
    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customBio: editBio }) });
    const updated = await fetch("/api/profile").then(r => r.json());
    setProfile(updated);
    setEditing(false);
    setSaving(false);
  };

  if (status === "loading") return <div style={{ textAlign: "center", padding: "48px 0", color: t.muted }}>Loading…</div>;

  if (!session) return (
    <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp .3s ease" }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>𝕏</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Connect your X account</h2>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 24, lineHeight: 1.65 }}>Sign in to track your calls, earn Talkin Points, and build your CT reputation.</p>
      <button onClick={() => signIn("twitter")} style={{ padding: "10px 24px", borderRadius: 9, background: t.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign in with X</button>
    </div>
  );

  const repLevel = profile?.repLevel || user?.repLevel || "NEW_WEB3";
  const levelColor = LEVEL_COLORS[repLevel] || "#666";
  const username = profile?.username || user?.username || user?.name || "user";
  const displayName = profile?.displayName || user?.name || username;
  const imageUrl = profile?.imageUrl || user?.image;
  const bio = profile?.customBio || profile?.bio || "";
  const repScore = profile?.repScore ?? user?.repScore ?? 0;
  const talkinPoints = profile?.talkinPoints ?? user?.talkinPoints ?? 100;

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      {/* Profile card */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "20px 18px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle,${levelColor}15 0%,transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 14 }}>
          <Avatar username={username} imageUrl={imageUrl} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{displayName}</div>
              <span style={{ fontSize: 9, padding: "2px 9px", borderRadius: 20, background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}25`, fontWeight: 700, letterSpacing: 1 }}>
                {REP_LEVEL_LABELS[repLevel as RepLevel]}
              </span>
            </div>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, marginTop: 2 }}>@{username}</div>
            {bio && !editing && <p style={{ fontSize: 12, color: t.sub, marginTop: 6, lineHeight: 1.6 }}>{bio}</p>}
            {editing && (
              <div style={{ marginTop: 8 }}>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 160))} rows={2} placeholder="Your bio…" style={{ width: "100%", padding: "8px 11px", borderRadius: 9, resize: "none", border: `1px solid ${t.accent}55`, background: t.inputBg, color: t.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={saveProfile} disabled={saving} style={{ padding: "5px 14px", borderRadius: 7, background: t.accent, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Saving…" : "Save"}</button>
                  <button onClick={() => setEditing(false)} style={{ padding: "5px 14px", borderRadius: 7, background: "transparent", border: `1px solid ${t.border}`, color: t.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            )}
            {!editing && <button onClick={() => setEditing(true)} style={{ marginTop: 6, fontSize: 11, color: t.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Edit profile</button>}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[
            { label: "REP", val: repScore, color: t.accent },
            { label: "Talkin Points", val: talkinPoints, color: levelColor },
            { label: "Calls", val: profile?._count?.votes || 0, color: "#8b5cf6" },
            { label: "Accuracy", val: profile?.accuracy !== null && profile?.accuracy !== undefined ? `${profile.accuracy}%` : "—", color: t.yes },
          ].map(s => (
            <div key={s.label} style={{ padding: "10px 8px", borderRadius: 10, background: t.surfaceHigh, border: `1px solid ${t.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
              <div style={{ fontSize: 9, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <Link href="/leaderboard" style={{ display: "inline-block", marginTop: 12, fontSize: 11, color: t.accent, textDecoration: "none", fontWeight: 600 }}>View Leaderboard →</Link>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {(["calls", "posts", "points"] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${activeSection === s ? t.accent : t.border}`, background: activeSection === s ? "rgba(224,28,28,0.08)" : "transparent", color: activeSection === s ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>{s}</button>
        ))}
      </div>

      {/* Calls */}
      {activeSection === "calls" && (
        profile?.votes?.length === 0 || !profile?.votes ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: t.muted }}>No calls yet — go make some on the Feed.</p>
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            {profile?.votes?.map((v: any, i: number) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < profile.votes.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <span style={{ fontSize: 12, flex: 1, color: t.sub }}>{v.post?.title?.slice(0, 55)}…</span>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 12, fontWeight: 700, background: v.side === "yes" ? `${t.yes}15` : "rgba(224,28,28,0.1)", color: v.side === "yes" ? t.yes : t.no }}>{v.side.toUpperCase()}</span>
                {v.pointsWagered > 0 && <span style={{ fontSize: 10, color: t.muted, fontFamily: "monospace" }}>{v.pointsWagered} TP</span>}
                {v.post?.resolvedOutcome && (
                  <span style={{ fontSize: 9, color: v.side === v.post.resolvedOutcome.toLowerCase() ? t.yes : t.muted }}>{v.side === v.post.resolvedOutcome.toLowerCase() ? `+${v.pointsWon} TP` : "lost"}</span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Posts */}
      {activeSection === "posts" && (
        !profile?.posts?.length ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: t.muted }}>No posts yet.</p>
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            {profile.posts.map((p: any, i: number) => (
              <div key={p.id} style={{ padding: "11px 14px", borderBottom: i < profile.posts.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <PostTypeTag type={p.type} />
                  <CategoryTag category={p.category} />
                  <span style={{ fontSize: 10, color: t.muted, marginLeft: "auto", fontFamily: "monospace" }}>{timeAgo(p.createdAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: t.text, lineHeight: 1.5, margin: 0 }}>{p.title.slice(0, 70)}{p.title.length > 70 ? "…" : ""}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Points history */}
      {activeSection === "points" && (
        !profile?.pointTxns?.length ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: t.muted }}>No point transactions yet.</p>
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            {profile.pointTxns.map((tx: any, i: number) => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < profile.pointTxns.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <span style={{ fontSize: 12, flex: 1, color: t.sub }}>{tx.description || tx.type}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: tx.amount >= 0 ? t.yes : t.no }}>{tx.amount >= 0 ? "+" : ""}{tx.amount} TP</span>
                <span style={{ fontSize: 10, color: t.muted, fontFamily: "monospace" }}>{timeAgo(tx.createdAt)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
