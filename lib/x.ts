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
