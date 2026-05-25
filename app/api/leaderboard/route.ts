import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ repScore: "desc" }],
      take: 50,
      select: {
        id: true, username: true, displayName: true,
        imageUrl: true, customImageUrl: true,
        repScore: true, repLevel: true, talkinPoints: true,
        createdAt: true,
        _count: { select: { votes: true, posts: true, comments: true } },
      },
    });

    return NextResponse.json(users.map((u: any) => ({
      ...u,
      imageUrl: u.customImageUrl || u.imageUrl,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (e) {
    return NextResponse.json([], { status: 500 });
  }
}
