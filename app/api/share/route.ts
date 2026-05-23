import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// We need to store the user's X access token to post on their behalf.
// NextAuth stores it in the JWT — we surface it here.
// Requires tweet.write scope added to Twitter OAuth app.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connect X to share" }, { status: 401 });
  }

  try {
    const { postId } = await req.json();
    const userId = (session.user as any).id;
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No X access token. Re-connect your X account." },
        { status: 401 }
      );
    }

    // Fetch the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { username: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Format tweet text
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://talkinpulse.vercel.app";
    const typeEmoji: Record<string, string> = {
      MARKET: "📊",
      TAKE: "💬",
      CONVERSATION: "🔥",
      EVENT: "⚡",
    };

    const emoji = typeEmoji[post.type] || "📡";
    const truncatedTitle =
      post.title.length > 200 ? post.title.slice(0, 197) + "…" : post.title;

    const tweetText = post.type === "MARKET"
      ? `${emoji} ${truncatedTitle}\n\nYES ${post.yesCount}% vs NO ${post.noCount}%\n\nMake your call 👇\n${appUrl}\n\n#TalkinPulse #CT`
      : `${emoji} ${truncatedTitle}\n\nJoin the conversation 👇\n${appUrl}\n\n#TalkinPulse #CT`;

    // Post to X via API v2
    const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    });

    if (!tweetRes.ok) {
      const err = await tweetRes.json();
      console.error("Twitter post failed:", err);
      return NextResponse.json(
        { error: "Failed to post to X", detail: err },
        { status: 502 }
      );
    }

    const tweet = await tweetRes.json();

    // Rep bump for sharing
    await prisma.user.update({
      where: { id: userId },
      data: { repScore: { increment: 10 } },
    });

    return NextResponse.json({
      success: true,
      tweetId: tweet.data?.id,
      tweetUrl: `https://x.com/i/web/status/${tweet.data?.id}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Share failed" }, { status: 500 });
  }
}
