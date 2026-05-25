"use client";
import { useState } from "react";
import { Post } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryTag, PostTypeTag } from "@/components/ui/Tags";
import { yesPercent, timeAgo } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useSession } from "next-auth/react";
import { Comments } from "./Comments";
import { ShareButton } from "./ShareButton";

interface PostCardProps {
  post: Post;
  onVote?: (postId: string, side: "yes" | "no") => Promise<void>;
}

export function PostCard({ post, onVote }: PostCardProps) {
  const { data: session } = useSession();
  const { theme, votes } = useAppStore();
  const isDark = theme === "dark";
  const [sigOpen, setSigOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const [localYes, setLocalYes] = useState(post.yesCount);
  const [localNo, setLocalNo] = useState(post.noCount);

  const localVote = votes[post.id] || post.userVote;
  const yesPct = yesPercent(localYes, localNo);

  const t = {
    surface: isDark ? "#141414" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    textSub: isDark ? "#aaaaaa" : "#555555",
    muted: isDark ? "#555555" : "#999999",
    yes: isDark ? "#34d399" : "#16a34a",
    yesDim: isDark ? "rgba(52,211,153,0.1)" : "rgba(22,163,74,0.08)",
    no: "#e01c1c",
    noDim: "rgba(224,28,28,0.08)",
    signalBg: isDark ? "rgba(224,28,28,0.03)" : "#fff8f8",
    repliesBg: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
    footerBg: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
    accent: "#e01c1c",
  };

  const handleVote = async (side: "yes" | "no") => {
    if (!session?.user || voting || localVote) return;
    setVoting(true);
    if (side === "yes") setLocalYes((v) => v + 1);
    else setLocalNo((v) => v + 1);
    await onVote?.(post.id, side);
    setVoting(false);
  };

  // Parse notable replies
  const notableRepliesArray = post.notableReplies
    ? post.notableReplies.split("|").map((r) => r.trim()).filter(Boolean)
    : [];

  const displayAuthor = post.author?.username || post.originator?.replace("@", "");
  const displayHandle = post.originator || (post.author ? `@${post.author.username}` : null);

  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color .2s" }} className="post-card">

      {/* Main content */}
      <div style={{ padding: "14px 16px" }}>

        {/* Tags row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <PostTypeTag type={post.type} />
          <CategoryTag category={post.category as any} />
          {localVote && (
            <span style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: 1,
              background: localVote === "yes" ? t.yesDim : t.noDim,
              color: localVote === "yes" ? t.yes : t.no,
              border: `1px solid ${localVote === "yes" ? t.yes : t.no}25`,
            }}>✓ {localVote.toUpperCase()}</span>
          )}
        </div>

        {/* Title + meta */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: post.body ? 8 : 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55, color: t.text, margin: 0, flex: 1 }}>
            {post.title}
          </p>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {displayHandle && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>{displayHandle}</span>
                <Avatar username={displayAuthor || "ct"} imageUrl={post.author?.imageUrl} size={18} />
              </div>
            )}
            <div style={{ fontSize: 10, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(post.createdAt)}</div>
            {post.endsAt && <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>ends {timeAgo(post.endsAt)}</div>}
          </div>
        </div>

        {/* Body */}
        {post.body && (
          <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, margin: "0 0 10px" }}>{post.body}</p>
        )}

        {/* Market bar */}
        {post.type === "MARKET" && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.yes }}>YES {yesPct}%</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.no }}>NO {100 - yesPct}%</span>
            </div>
            <div style={{ height: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${yesPct}%`, borderRadius: 3, background: `linear-gradient(90deg,${t.yes}80,${t.yes})`, transition: "width .8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: t.muted }}>{post._count?.votes || 0} callers</span>
              {post.endsAt && <span style={{ fontSize: 10, color: t.muted }}>ends {timeAgo(post.endsAt)}</span>}
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {post.signal && (
              <button onClick={() => setSigOpen(v => !v)} style={{ fontSize: 11, color: t.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}>
                {sigOpen ? "▲" : "▼"} signal
              </button>
            )}
            {notableRepliesArray.length > 0 && (
              <button onClick={() => setRepliesOpen(v => !v)} style={{ fontSize: 11, color: t.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}>
                {repliesOpen ? "▲" : "▼"} CT takes
              </button>
            )}
          </div>

          {/* Vote buttons */}
          {post.type === "MARKET" && (
            !localVote ? (
              <div style={{ display: "flex", gap: 6 }}>
                {(["yes", "no"] as const).map(s => (
                  <button key={s} onClick={() => handleVote(s)} disabled={!session?.user || voting}
                    style={{
                      padding: "5px 18px", borderRadius: 8, fontWeight: 700, fontSize: 11,
                      fontFamily: "inherit", textTransform: "uppercase", letterSpacing: 1,
                      cursor: session?.user ? "pointer" : "not-allowed",
                      opacity: session?.user ? 1 : 0.45,
                      border: `1.5px solid ${s === "yes" ? t.yes : t.no}35`,
                      background: s === "yes" ? t.yesDim : t.noDim,
                      color: s === "yes" ? t.yes : t.no,
                      transition: "filter .15s, transform .1s",
                    }}>{s}</button>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>called {localVote} ✓</span>
            )
          )}

          {post.type !== "MARKET" && session?.user && (
            <button style={{ padding: "5px 14px", borderRadius: 8, border: `1.5px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {post.type === "CONVERSATION" ? "Join" : post.type === "EVENT" ? "Attend" : "React"}
            </button>
          )}
        </div>
      </div>

      {/* Signal panel */}
      {sigOpen && post.signal && (
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, background: t.signalBg, animation: "fadeUp .2s ease" }}>
          <div style={{ fontSize: 10, color: t.accent, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>🧠 CT Signal</div>
          <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.65, margin: 0 }}>{post.signal}</p>
        </div>
      )}

      {/* Notable CT takes panel */}
      {repliesOpen && notableRepliesArray.length > 0 && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}`, background: t.repliesBg, animation: "fadeUp .2s ease" }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>💬 Notable CT Takes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notableRepliesArray.map((reply, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6, margin: 0 }}>{reply}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer: share + comments */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, background: t.footerBg }}>
        <div style={{ marginBottom: 10 }}>
          <ShareButton post={post} />
        </div>
        <Comments postId={post.id} initialCount={post._count?.comments || 0} />
      </div>
    </div>
  );
}
