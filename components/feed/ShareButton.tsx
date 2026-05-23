"use client";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useAppStore } from "@/store";
import { Post } from "@/types";

interface ShareButtonProps {
  post: Post;
}

export function ShareButton({ post }: ShareButtonProps) {
  const { data: session } = useSession();
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [status, setStatus] = useState<"idle" | "sharing" | "done" | "error">("idle");
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);

  const t = {
    muted: isDark ? "#555" : "#aaa",
    accent: "#e01c1c",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    surface: isDark ? "#1a1a1a" : "#f3f3f3",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
  };

  const handleShare = async () => {
    if (!session?.user) { signIn("twitter"); return; }
    if (status === "sharing" || status === "done") return;

    setStatus("sharing");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("done");
        setTweetUrl(data.tweetUrl);
        // Reset after 8s
        setTimeout(() => { setStatus("idle"); setTweetUrl(null); }, 8000);
      } else {
        console.error("Share failed:", data);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  // Native share fallback — just copies a formatted text + link
  const handleNativeShare = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://talkinpulse.vercel.app";
    const text = `${post.title}\n\n${appUrl}\n\n#TalkinPulse`;
    if (navigator.share) {
      navigator.share({ title: "TalkinPulse", text, url: appUrl });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Post to X (via API — user's timeline) */}
      <button
        onClick={handleShare}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 8,
          border: `1.5px solid ${
            status === "done" ? "rgba(16,185,129,0.4)" :
            status === "error" ? `${t.accent}40` :
            t.border
          }`,
          background: status === "done" ? "rgba(16,185,129,0.08)" : "transparent",
          color: status === "done" ? "#10b981" : status === "error" ? t.accent : t.muted,
          fontSize: 11, fontWeight: 600, cursor: status === "sharing" ? "wait" : "pointer",
          fontFamily: "inherit", transition: "all .15s",
        }}
        title="Post to your X timeline"
      >
        {status === "sharing" ? (
          <span style={{ display: "inline-block", width: 10, height: 10, border: `1.5px solid ${t.muted}4`, borderTopColor: t.muted, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        ) : status === "done" ? (
          "✓"
        ) : (
          // X logo
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        )}
        <span>
          {status === "sharing" ? "Posting…" :
           status === "done" ? "Posted!" :
           status === "error" ? "Failed" :
           "Post to X"}
        </span>
      </button>

      {/* View tweet link if posted */}
      {tweetUrl && (
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 10, color: "#10b981",
            textDecoration: "none", fontWeight: 600,
          }}
        >
          View tweet ↗
        </a>
      )}

      {/* Native share / copy fallback */}
      <button
        onClick={handleNativeShare}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "5px 10px", borderRadius: 8,
          border: `1.5px solid ${t.border}`,
          background: "transparent", color: t.muted,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all .15s",
        }}
        title="Copy link / native share"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Share
      </button>
    </div>
  );
}
