import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized — connect X to vote" }, { status: 401 });
  }

  try {
    const { postId, side } = await req.json();
    const userId = (session.user as any).id;

    if (!postId || !["yes", "no"].includes(side)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Upsert vote
    const existing = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      // Already voted same side — no-op
      if (existing.side === side) {
        return NextResponse.json({ message: "Already voted" });
      }
      // Changing vote
      await prisma.vote.update({ where: { id: existing.id }, data: { side } });
      await prisma.post.update({
        where: { id: postId },
        data: {
          yesCount: side === "yes" ? { increment: 1 } : { decrement: 1 },
          noCount: side === "no" ? { increment: 1 } : { decrement: 1 },
        },
      });
    } else {
      // New vote
      await prisma.vote.create({ data: { userId, postId, side } });
      await prisma.post.update({
        where: { id: postId },
        data: {
          yesCount: side === "yes" ? { increment: 1 } : undefined,
          noCount: side === "no" ? { increment: 1 } : undefined,
        },
      });
      // Rep bump for author
      if (post.authorId) {
        await prisma.user.update({
          where: { id: post.authorId },
          data: { repScore: { increment: 5 } },
        });
      }
    }

    const updated = await prisma.post.findUnique({ where: { id: postId } });
    return NextResponse.json({ yesCount: updated?.yesCount, noCount: updated?.noCount, side });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
