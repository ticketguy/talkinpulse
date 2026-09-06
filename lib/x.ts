export async function postToX(accessToken: string, text: string, inReplyToId?: string) {
  const body: Record<string, unknown> = { text: text.slice(0, 270) };
  if (inReplyToId) body.reply = { in_reply_to_tweet_id: inReplyToId };
  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("X post failed", res.status, data);
    return null;
  }
  return data?.data?.id as string | undefined;
}

export function isTweetStatusUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "x.com" && host !== "twitter.com") return false;
    return /\/status\/\d+/.test(u.pathname);
  } catch {
    return false;
  }
}

export function isHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function tweetIdFromUrl(url: string): string | undefined {
  const m = url.match(/status\/(\d+)/);
  return m?.[1];
}

/** App-only recent search. Requires a paid X API tier + TWITTER_BEARER_TOKEN. */
export async function searchRecentTweets(query: string, maxResults = 10) {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  if (!bearer) {
    console.warn("TWITTER_BEARER_TOKEN missing — skipping X recent search (paid API)");
    return [] as XSearchHit[];
  }
  const params = new URLSearchParams({
    query: `${query} -is:retweet -is:reply lang:en`,
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "username,name,profile_image_url",
  });
  const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("X recent search failed", res.status, data);
    return [] as XSearchHit[];
  }
  const users = new Map<string, any>((data.includes?.users || []).map((u: any) => [u.id, u]));
  return (data.data || []).map((t: any) => {
    const author = users.get(t.author_id);
    const metrics = t.public_metrics || {};
    const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0) + (metrics.quote_count || 0);
    return {
      id: t.id as string,
      text: t.text as string,
      createdAt: t.created_at as string,
      engagement,
      username: author?.username as string | undefined,
      url: author?.username ? `https://x.com/${author.username}/status/${t.id}` : `https://x.com/i/web/status/${t.id}`,
    } as XSearchHit;
  });
}

export interface XSearchHit {
  id: string;
  text: string;
  createdAt: string;
  engagement: number;
  username?: string;
  url: string;
}
