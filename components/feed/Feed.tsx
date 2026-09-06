"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Post, FeedFilter } from "@/types";
import { PostCard } from "./PostCard";
import { NewsCarousel } from "./NewsCarousel";
import { useAppStore } from "@/store";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "hot", label: "Hot" },
  { id: "opinion", label: "Opinion" },
  { id: "conversations", label: "Convo" },
  { id: "divide", label: "The Divide" },
  { id: "cooker", label: "Little Cooker" },
  { id: "markets", label: "Markets" },
  { id: "takes", label: "Takes" },
  { id: "events", label: "Events" },
];

function mergeById(prev: Post[], incoming: Post[]) {
  const map = new Map(prev.map((p) => [p.id, p]));
  const fresh: Post[] = [];
  for (const p of incoming) {
    if (!map.has(p.id)) fresh.push(p);
    map.set(p.id, p);
  }
  const rest = prev.filter((p) => incoming.some((n) => n.id === p.id) || !incoming.length);
  return [...fresh, ...rest.filter((p) => !fresh.find((f) => f.id === p.id))].reduce<Post[]>((acc, p) => {
    if (!acc.find((x) => x.id === p.id)) acc.push(map.get(p.id)!);
    return acc;
  }, []);
}

export function Feed() {
  const { theme, feedFilter, setFeedFilter, setVote } = useAppStore();
  const isDark = theme === "dark";
  const [news, setNews] = useState<Post[]>([]);
  const [rising, setRising] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRef = useRef<string>(new Date().toISOString());

  const t = {
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
  };

  const active = FILTERS.some((f) => f.id === feedFilter) ? feedFilter : "markets";

  const loadInitial = useCallback(async () => {
    const [n, h, tr, op, f] = await Promise.all([
      fetch("/api/posts?filter=news").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch("/api/posts?filter=hot").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch("/api/posts?filter=trending").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch("/api/posts?filter=opinion").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch(`/api/posts?filter=${active}`).then((r) => r.json()).catch(() => ({ posts: [] })),
    ]);
    setNews(n.posts || []);
    const rise = [...(h.posts || []), ...(tr.posts || []), ...(op.posts || [])].filter(
      (p: Post, i: number, arr: Post[]) => arr.findIndex((x) => x.id === p.id) === i,
    );
    setRising(rise);
    setPosts(f.posts || []);
    latestRef.current = new Date().toISOString();
    setLoading(false);
  }, [active]);

  useEffect(() => {
    setLoading(true);
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const tick = async () => {
      const since = encodeURIComponent(latestRef.current);
      const [n, m] = await Promise.all([
        fetch(`/api/posts?filter=news&since=${since}`).then((r) => r.json()).catch(() => ({ posts: [] })),
        fetch(`/api/posts?filter=${active}&since=${since}`).then((r) => r.json()).catch(() => ({ posts: [] })),
      ]);
      if (n.posts?.length) setNews((prev) => mergeById(prev, n.posts));
      if (m.posts?.length) setPosts((prev) => mergeById(prev, m.posts));
      if (n.serverTime || m.serverTime) latestRef.current = n.serverTime || m.serverTime;
      else latestRef.current = new Date().toISOString();
    };
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, [active]);

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
        const patch = (list: Post[]) =>
          list.map((p) =>
            p.id === postId
              ? { ...p, yesCount: data.yesCount, noCount: data.noCount, userVote: { side, pointsWagered: data.pointsWagered || 0 } }
              : p
          );
        setRising(patch);
        setPosts(patch);
      }
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 16, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" } as any}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFeedFilter(f.id)} style={{
            padding: "5px 14px", borderRadius: 20, flexShrink: 0, fontFamily: "inherit",
            border: `1.5px solid ${active === f.id ? t.accent : t.border}`,
            background: active === f.id ? t.accentDim : "transparent",
            color: active === f.id ? t.accent : t.muted,
            fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ height: 130, borderRadius: 12, background: isDark ? "#141414" : "#f8f8f8", border: `1px solid ${t.border}` }} />
      ) : (
        <>
          <NewsCarousel news={news} rising={rising} />
          <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", margin: "4px 0 10px" }}>
            {FILTERS.find((f) => f.id === active)?.label || "Markets"}
          </h2>
          {posts.length === 0 ? (
            <p style={{ color: t.muted, fontSize: 14, textAlign: "center", padding: 32 }}>Nothing live in this lane today.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onVote={handleVote} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
