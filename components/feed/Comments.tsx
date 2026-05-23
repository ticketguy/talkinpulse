"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    imageUrl?: string | null;
    repScore: number;
  };
}

interface CommentsProps {
  postId: string;
  initialCount: number;
}

export function Comments({ postId, initialCount }: CommentsProps) {
  const { data: session } = useSession();
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = {
    surface: isDark ? "#141414" : "#ffffff",
    surfaceHigh: isDark ? "#1c1c1c" : "#f8f8f8",
    border: isDark ? "rgba(255,255,255,0.07)" : "#eeeeee",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    textSub: isDark ? "#aaaaaa" : "#555555",
    muted: isDark ? "#444444" : "#aaaaaa",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
    inputBg: isDark ? "#111111" : "#f8f8f8",
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
    setLoading(false);
  };

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      fetchComments();
    } else {
      setOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    if (!session?.user) { signIn("twitter"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, body }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCount((c) => c + 1);
        setBody("");
        textareaRef.current?.focus();
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  const user = session?.user as any;
  const remaining = 500 - body.length;

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={handleOpen}
        style={{
          fontSize: 11, color: open ? t.accent : t.muted,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", fontWeight: 600, padding: 0,
          transition: "color .15s",
        }}
      >
        {open ? "▲" : "▼"} {count} {count === 1 ? "reply" : "replies"}
      </button>

      {/* Comments panel */}
      {open && (
        <div style={{
          marginTop: 12,
          borderTop: `1px solid ${t.border}`,
          paddingTop: 14,
          animation: "fadeUp .2s ease",
        }}>
          {/* Comment list */}
          {loading ? (
            <div style={{ padding: "12px 0", color: t.muted, fontSize: 12 }}>
              Loading replies…
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: "8px 0 12px", color: t.muted, fontSize: 12 }}>
              No replies yet. Be first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Avatar username={c.user.username} imageUrl={c.user.imageUrl} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                        @{c.user.username}
                      </span>
                      <span style={{ fontSize: 10, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                        {timeAgo(c.createdAt)}
                      </span>
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 10,
                        background: t.accentDim, color: t.accent,
                        fontWeight: 700,
                      }}>
                        {c.user.repScore} REP
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13, color: t.text, lineHeight: 1.6,
                      margin: 0, wordBreak: "break-word",
                    }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          {session?.user ? (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar
                username={user?.username || user?.name || "you"}
                imageUrl={user?.image}
                size={28}
              />
              <div style={{ flex: 1 }}>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Drop your take… (⌘+Enter to post)"
                  rows={2}
                  style={{
                    width: "100%", padding: "9px 12px",
                    borderRadius: 10, resize: "none",
                    border: `1px solid ${body.length > 0 ? t.accent + "60" : t.border}`,
                    background: t.inputBg, color: t.text,
                    fontSize: 13, fontFamily: "inherit", lineHeight: 1.5,
                    outline: "none", transition: "border-color .15s",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{
                    fontSize: 10, color: remaining < 50 ? t.accent : t.muted,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {remaining}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!body.trim() || submitting}
                    style={{
                      padding: "5px 16px", borderRadius: 8,
                      background: body.trim() ? t.accent : "transparent",
                      border: `1.5px solid ${body.trim() ? t.accent : t.border}`,
                      color: body.trim() ? "#fff" : t.muted,
                      fontSize: 11, fontWeight: 700, cursor: body.trim() ? "pointer" : "not-allowed",
                      fontFamily: "inherit", transition: "all .15s",
                    }}
                  >
                    {submitting ? "Posting…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn("twitter")}
              style={{
                width: "100%", padding: "10px",
                borderRadius: 10, border: `1.5px dashed ${t.border}`,
                background: "transparent", color: t.muted,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Connect X to reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
