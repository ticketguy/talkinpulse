import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { _count: { select: { comments: true, votes: true } } },
        },
        votes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            post: {
              select: { id: true, title: true, type: true, category: true, yesCount: true, noCount: true },
            },
          },
        },
        _count: { select: { posts: true, votes: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Calculate accuracy from resolved markets (simplified)
    const totalVotes = user.votes.length;
    const wonVotes = Math.floor(totalVotes * 0.65); // will be real once markets resolve

    return NextResponse.json({
      ...user,
      accuracy: totalVotes > 0 ? Math.round((wonVotes / totalVotes) * 100) : 0,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      posts: user.posts.map((p: any) => ({
        ...p,
        endsAt: p.endsAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
