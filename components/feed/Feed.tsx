"use client";
import { useState, useEffect, useCallback } from "react";
import { Post, FeedFilter } from "@/types";
import { PostCard } from "./PostCard";
import { useAppStore } from "@/store";

type TakesRank = "24h" | "7d" | "30d" | "1y";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "hot", label: "Hot" },
  { id: "opinion", label: "Opinion" },
  { id: "conversations", label: "Convo" },
  { id: "divide", label: "The Divide" },
  { id: "cooker", label: "Little Cooker" },
  { id: "new", label: "New" },
  { id: "markets", label: "Markets" },
  { id: "takes", label: "Takes" },
  { id: "events", label: "Events" },
];

const TAKES_RANKS: { id: TakesRank; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "1y", label: "1 year" },
];

export function Feed() {
  const { theme, feedFilter, setFeedFilter, setVote } = useAppStore();
  const isDark = theme === "dark";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [takesRank, setTakesRank] = useState<TakesRank>("24h");

  const t = {
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    surfaceHigh: isDark ? "#1a1a1a" : "#f3f3f3",
  };

  const fetchPosts = useCallback(async (filter: FeedFilter, cursor?: string, rankPeriod?: TakesRank) => {
    try {
      const params = new URLSearchParams({ filter });
      if (cursor) params.set("cursor", cursor);
      if (filter === "takes" && rankPeriod) params.set("rank", rankPeriod);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      return data;
    } catch {
      return { posts: [], nextCursor: null };
    }
  }, []);

  const loadFeed = useCallback(async (filter: FeedFilter, rankPeriod?: TakesRank) => {
    setLoading(true);
    const data = await fetchPosts(filter, undefined, rankPeriod);
    setPosts(data.posts || []);
    setNextCursor(data.nextCursor);
    setLoading(false);
  }, [fetchPosts]);

  useEffect(() => {
    loadFeed(feedFilter, takesRank);
  }, [feedFilter, takesRank, loadFeed]);

  useEffect(() => {
    const interval = setInterval(() => loadFeed(feedFilter, takesRank), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [feedFilter, takesRank, loadFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPosts(feedFilter, nextCursor, takesRank);
    setPosts(prev => [...prev, ...(data.posts || [])]);
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
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, yesCount: data.yesCount, noCount: data.noCount, userVote: { side, pointsWagered: data.pointsWagered || 0 } }
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
      <div style={{ display: "flex", gap: 5, marginBottom: feedFilter === "takes" ? 10 : 16, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" } as any}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFeedFilter(f.id)} style={{
            padding: "5px 14px", borderRadius: 20, flexShrink: 0, fontFamily: "inherit",
            border: `1.5px solid ${feedFilter === f.id ? t.accent : t.border}`,
            background: feedFilter === f.id ? t.accentDim : "transparent",
            color: feedFilter === f.id ? t.accent : t.muted,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {feedFilter === "takes" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
          padding: "10px 14px", borderRadius: 10,
          background: t.surfaceHigh, border: `1px solid ${t.border}`,
        }}>
          <span style={{ fontSize: 11, color: t.muted, fontWeight: 600, marginRight: 4 }}>Ranked by:</span>
          {TAKES_RANKS.map(r => (
            <button key={r.id} onClick={() => setTakesRank(r.id)} style={{
              padding: "4px 12px", borderRadius: 16, fontFamily: "inherit",
              border: `1px solid ${takesRank === r.id ? t.accent : t.border}`,
              background: takesRank === r.id ? t.accentDim : "transparent",
              color: takesRank === r.id ? t.accent : t.muted,
              fontSize: 11, fontWeight: takesRank === r.id ? 700 : 400,
              cursor: "pointer",
            }}>{r.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 140, borderRadius: 12, background: isDark ? "#141414" : "#f8f8f8", border: `1px solid ${t.border}` }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: t.muted }}>
          <p style={{ fontSize: 14 }}>Nothing in this lane yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onVote={handleVote} />
          ))}
          {nextCursor && (
            <button onClick={loadMore} disabled={loadingMore} style={{
              width: "100%", padding: "12px", borderRadius: 10,
              border: `1px solid ${t.border}`, background: "transparent",
              color: t.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
