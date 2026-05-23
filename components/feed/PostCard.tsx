"use client";
import { useState } from "react";
import { Post } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryTag, PostTypeTag, AiBadge } from "@/components/ui/Tags";
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
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [localYes, setLocalYes] = useState(post.yesCount);
  const [localNo, setLocalNo] = useState(post.noCount);

  const localVote = votes[post.id] || post.userVote;
  const yesPct = yesPercent(localYes, localNo);
  const noPct = 100 - yesPct;

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
    footerBg: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
    accent: "#e01c1c",
  };

  const handleVote = async (side: "yes" | "no") => {
    if (!session?.user || voting || localVote) return;
    setVoting(true);
    // Optimistic update
    if (side === "yes") setLocalYes((v) => v + 1);
    else setLocalNo((v) => v + 1);
    await onVote?.(post.id, side);
    setVoting(false);
  };

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color .2s, box-shadow .2s",
      }}
      className="post-card"
    >
      {/* ── Main content ── */}
      <div style={{ padding: "15px 16px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            {/* Tags */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <PostTypeTag type={post.type} />
              <CategoryTag category={post.category as any} />
              {post.isAiGen && <AiBadge />}
              {post.hot && <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>🔥</span>}
              {localVote && (
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: 1,
                  background: localVote === "yes" ? t.yesDim : t.noDim,
                  color: localVote === "yes" ? t.yes : t.no,
                  border: `1px solid ${localVote === "yes" ? t.yes : t.no}25`,
                }}>✓ {localVote.toUpperCase()}</span>
              )}
            </div>

            {/* Title */}
            <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55, color: t.text, margin: 0 }}>
              {post.title}
            </p>

            {/* Body */}
            {post.body && (
              <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, marginTop: 6, margin: "6px 0 0" }}>
                {post.body}
              </p>
            )}
          </div>

          {/* Author + time */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {post.author ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>
                  @{post.author.username}
                </span>
                <Avatar username={post.author.username} imageUrl={post.author.imageUrl} size={20} />
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "#10b981", marginBottom: 3 }}>✦ AI</div>
            )}
            <div style={{ fontSize: 10, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              {timeAgo(post.createdAt)}
            </div>
            {post.endsAt && (
              <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>
                ends {timeAgo(post.endsAt)}
              </div>
            )}
          </div>
        </div>

        {/* Market voting bar */}
        {post.type === "MARKET" && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.yes }}>YES {yesPct}%</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.no }}>NO {noPct}%</span>
            </div>
            <div style={{ height: 5, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${yesPct}%`, borderRadius: 3,
                background: `linear-gradient(90deg, ${t.yes}90, ${t.yes})`,
                transition: "width .8s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {post.type === "MARKET" && (
              <span style={{ fontSize: 11, color: t.muted }}>
                <span style={{ color: t.textSub, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  ${post.volume}
                </span>{" "}vol
              </span>
            )}
            {post.signal && (
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{ fontSize: 11, color: t.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}
              >
                {expanded ? "▲ signal" : "▼ signal"}
              </button>
            )}
          </div>

          {/* Vote buttons — markets only */}
          {post.type === "MARKET" && (
            !localVote ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleVote("yes")}
                  disabled={!session?.user || voting}
                  className="vote-btn"
                  style={{
                    padding: "5px 16px", borderRadius: 8,
                    border: `1.5px solid ${t.yes}35`,
                    background: t.yesDim, color: t.yes,
                    fontSize: 11, fontWeight: 700,
                    cursor: session?.user ? "pointer" : "not-allowed",
                    fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase",
                    opacity: session?.user ? 1 : 0.5,
                    transition: "filter .15s, transform .1s",
                  }}
                >Yes</button>
                <button
                  onClick={() => handleVote("no")}
                  disabled={!session?.user || voting}
                  className="vote-btn"
                  style={{
                    padding: "5px 16px", borderRadius: 8,
                    border: `1.5px solid ${t.no}35`,
                    background: t.noDim, color: t.no,
                    fontSize: 11, fontWeight: 700,
                    cursor: session?.user ? "pointer" : "not-allowed",
                    fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase",
                    opacity: session?.user ? 1 : 0.5,
                    transition: "filter .15s, transform .1s",
                  }}
                >No</button>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                call locked ✓
              </span>
            )
          )}

          {/* Reaction for takes/convos/events */}
          {post.type !== "MARKET" && session?.user && (
            <button style={{
              padding: "5px 14px", borderRadius: 8,
              border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e8e8"}`,
              background: "transparent", color: t.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              {post.type === "CONVERSATION" ? "Join" : post.type === "EVENT" ? "Attend" : "React"}
            </button>
          )}
        </div>
      </div>

      {/* ── Signal panel ── */}
      {expanded && post.signal && (
        <div style={{
          padding: "11px 16px",
          borderTop: `1px solid ${t.border}`,
          background: t.signalBg,
          animation: "fadeUp .2s ease",
        }}>
          <div style={{ fontSize: 10, color: t.accent, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
            🧠 CT Signal
          </div>
          <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.65, margin: 0 }}>{post.signal}</p>
        </div>
      )}

      {/* ── Footer: Share + Comments ── */}
      <div style={{
        padding: "10px 16px",
        borderTop: `1px solid ${t.border}`,
        background: t.footerBg,
      }}>
        {/* Share row */}
        <div style={{ marginBottom: 10 }}>
          <ShareButton post={post} />
        </div>

        {/* Comments */}
        <Comments
          postId={post.id}
          initialCount={post._count?.comments || 0}
        />
      </div>
    </div>
  );
}
