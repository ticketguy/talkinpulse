import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/comments?postId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            imageUrl: true,
            repScore: true,
          },
        },
      },
    });

    return NextResponse.json(
      comments.map((c: any) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/comments
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connect X to comment" }, { status: 401 });
  }

  try {
    const { postId, body } = await req.json();
    const userId = (session.user as any).id;

    if (!postId || !body?.trim()) {
      return NextResponse.json({ error: "postId and body required" }, { status: 400 });
    }

    if (body.trim().length > 500) {
      return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        body: body.trim(),
        userId,
        postId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            imageUrl: true,
            repScore: true,
          },
        },
      },
    });

    // Bump comment count on post + rep for author
    await prisma.post.update({
      where: { id: postId },
      data: { updatedAt: new Date() },
    });

    // Small rep bump for engaging
    await prisma.user.update({
      where: { id: userId },
      data: { repScore: { increment: 2 } },
    });

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
