import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Connect X to vote" }, { status: 401 });

  try {
    const { postId, side, pointsWagered = 10 } = await req.json();
    const userId = (session.user as any).id;

    if (!postId || !["yes", "no"].includes(side)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const [post, user] = await Promise.all([
      prisma.post.findUnique({ where: { id: postId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.resolvedAt) return NextResponse.json({ error: "Market already resolved" }, { status: 400 });
    if (post.endsAt && new Date() > post.endsAt) return NextResponse.json({ error: "Market closed" }, { status: 400 });

    const wager = Math.max(1, Math.min(pointsWagered, user?.talkinPoints || 0));
    const existing = await prisma.vote.findUnique({ where: { userId_postId: { userId, postId } } });
    if (existing) return NextResponse.json({ error: "Already voted" }, { status: 400 });

    // Deduct points and create vote
    await prisma.$transaction([
      prisma.vote.create({ data: { userId, postId, side, pointsWagered: wager } }),
      prisma.post.update({
        where: { id: postId },
        data: {
          yesCount: side === "yes" ? { increment: 1 } : undefined,
          noCount: side === "no" ? { increment: 1 } : undefined,
          pointsPool: { increment: wager },
        },
      }),
      prisma.user.update({ where: { id: userId }, data: { talkinPoints: { decrement: wager }, repScore: { increment: 3 } } }),
      prisma.pointTransaction.create({
        data: { userId, amount: -wager, type: "vote_wagered", description: `Wagered on ${side.toUpperCase()} — "${post.title.slice(0, 50)}"`, postId },
      }),
    ]);

    const updated = await prisma.post.findUnique({ where: { id: postId } });
    return NextResponse.json({ yesCount: updated?.yesCount, noCount: updated?.noCount, side, pointsWagered: wager });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
