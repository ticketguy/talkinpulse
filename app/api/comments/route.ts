import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { postToX } from "@/lib/x";

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, imageUrl: true, repScore: true },
        },
      },
    });
    return NextResponse.json(comments.map((c: any) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch takes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Connect X to comment" }, { status: 401 });

  try {
    const { postId, body, postToX: alsoX } = await req.json();
    const userId = (session.user as any).id;
    if (!postId || !body?.trim()) return NextResponse.json({ error: "postId and body required" }, { status: 400 });
    if (body.trim().length > 500) return NextResponse.json({ error: "Take too long (max 500)" }, { status: 400 });

    const parent = await prisma.post.findUnique({ where: { id: postId } });
    if (!parent) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    let xReplyId: string | undefined;
    if (alsoX) {
      const token = (session as any).accessToken as string | undefined;
      if (token) {
        xReplyId = (await postToX(token, body.trim(), parent.xPostId || undefined)) || undefined;
      }
    }

    const comment = await prisma.comment.create({
      data: { body: body.trim(), userId, postId, xReplyId: xReplyId || null },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, imageUrl: true, repScore: true },
        },
      },
    });

    await prisma.post.update({ where: { id: postId }, data: { updatedAt: new Date() } });
    await prisma.user.update({ where: { id: userId }, data: { repScore: { increment: 2 } } });

    return NextResponse.json({ ...comment, createdAt: comment.createdAt.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post take" }, { status: 500 });
  }
}
