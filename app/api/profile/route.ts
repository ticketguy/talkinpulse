import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: { orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { comments: true, votes: true } } } },
        votes: { orderBy: { createdAt: "desc" }, take: 20, include: { post: { select: { id: true, title: true, type: true, category: true, yesCount: true, noCount: true, resolvedOutcome: true } } } },
        pointTxns: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { posts: true, votes: true, comments: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const wonVotes = user.votes.filter((v: any) => v.post.resolvedOutcome && v.side === v.post.resolvedOutcome.toLowerCase()).length;
    const resolvedVotes = user.votes.filter((v: any) => v.post.resolvedOutcome).length;

    return NextResponse.json({
      ...user,
      imageUrl: user.customImageUrl || user.imageUrl,
      accuracy: resolvedVotes > 0 ? Math.round((wonVotes / resolvedVotes) * 100) : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      posts: user.posts.map((p: any) => ({ ...p, endsAt: p.endsAt?.toISOString() || null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
      pointTxns: user.pointTxns.map((t: any) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  try {
    const { customBio, customImageUrl, displayName } = await req.json();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(customBio !== undefined && { customBio }),
        ...(customImageUrl !== undefined && { customImageUrl }),
        ...(displayName !== undefined && { displayName }),
      },
    });
    return NextResponse.json({ success: true, user: updated });
  } catch (e) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
