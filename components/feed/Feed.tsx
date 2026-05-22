"use client";
import { useState, useEffect, useCallback } from "react";
import { Post, FeedFilter } from "@/types";
import { PostCard } from "./PostCard";
import { useAppStore } from "@/store";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hot", label: "🔥 Hot" },
  { id: "new", label: "New" },
  { id: "markets", label: "📊 Markets" },
  { id: "takes", label: "💬 Takes" },
  { id: "conversations", label: "🗣 Convos" },
  { id: "events", label: "⚡ Events" },
];

export function Feed() {
  const { theme, feedFilter, setFeedFilter, setVote } = useAppStore();
  const isDark = theme === "dark";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const t = {
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    surface: isDark ? "#141414" : "#ffffff",
  };

  const fetchPosts = useCallback(async (filter: FeedFilter, cursor?: string) => {
    try {
      const params = new URLSearchParams({ filter });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      return data;
    } catch {
      return { posts: [], nextCursor: null };
    }
  }, []);

  const loadFeed = useCallback(async (filter: FeedFilter) => {
    setLoading(true);
    const data = await fetchPosts(filter);
    setPosts(data.posts || []);
    setNextCursor(data.nextCursor);
    setLoading(false);
  }, [fetchPosts]);

  useEffect(() => {
    loadFeed(feedFilter);
  }, [feedFilter, loadFeed]);

  // Poll for new posts every 30s
  useEffect(() => {
    const interval = setInterval(() => loadFeed(feedFilter), 30000);
    return () => clearInterval(interval);
  }, [feedFilter, loadFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPosts(feedFilter, nextCursor);
    setPosts((prev) => [...prev, ...(data.posts || [])]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const handleVote = async (postId: string, side: "yes" | "no") => {
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, side }),
      });
      if (res.ok) {
        const data = await res.json();
        setVote(postId, side);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, yesCount: data.yesCount, noCount: data.noCount, userVote: side }
              : p
          )
        );
      }
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  return (
    <div>
      {/* Filter tabs — horizontal scroll on mobile */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 16,
        overflowX: "auto", paddingBottom: 4,
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as any}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFeedFilter(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, flexShrink: 0,
              border: `1.5px solid ${feedFilter === f.id ? t.accent : t.border}`,
              background: feedFilter === f.id ? t.accentDim : "transparent",
              color: feedFilter === f.id ? t.accent : t.muted,
              fontSize: 11, letterSpacing: 1, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all .15s", whiteSpace: "nowrap",
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              height: 140, borderRadius: 14, background: isDark ? "#141414" : "#f8f8f8",
              border: `1px solid ${t.border}`,
              backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: t.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <p style={{ fontSize: 14 }}>No posts yet. AI is scanning CT…</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((post, i) => (
            <div key={post.id} style={{ animation: `fadeUp .3s ease ${Math.min(i, 8) * 0.04}s both` }}>
              <PostCard post={post} onVote={handleVote} />
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: `1px solid ${t.border}`, background: "transparent",
                color: t.muted, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", marginTop: 4,
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
