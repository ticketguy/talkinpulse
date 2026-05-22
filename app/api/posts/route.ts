import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FeedFilter } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") || "all") as FeedFilter;
  const cursor = searchParams.get("cursor");
  const take = 20;

  try {
    const where: any = {};

    if (filter === "hot") where.hot = true;
    if (filter === "markets") where.type = "MARKET";
    if (filter === "takes") where.type = "TAKE";
    if (filter === "conversations") where.type = "CONVERSATION";
    if (filter === "events") where.type = "EVENT";
    if (filter === "new") {
      where.createdAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    const posts = await prisma.post.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ hot: "desc" }, { createdAt: "desc" }],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            imageUrl: true,
            repScore: true,
            xId: true,
          },
        },
        _count: { select: { comments: true, votes: true } },
        ...(session?.user
          ? {
              votes: {
                where: { userId: (session.user as any).id },
                select: { side: true },
              },
            }
          : {}),
      },
    });

    const hasMore = posts.length > take;
    const items = posts.slice(0, take).map((p: any) => ({
      ...p,
      userVote: (p as any).votes?.[0]?.side || null,
      votes: undefined,
      endsAt: p.endsAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      posts: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, title, body: postBody, category, endsAt } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        type,
        title: title.slice(0, 280),
        body: postBody?.slice(0, 1000),
        category: category || "Meta",
        endsAt: endsAt ? new Date(endsAt) : null,
        authorId: (session.user as any).id,
        isAiGen: false,
        yesCount: type === "MARKET" ? 50 : 0,
        noCount: type === "MARKET" ? 50 : 0,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, imageUrl: true, repScore: true, xId: true },
        },
        _count: { select: { comments: true, votes: true } },
      },
    });

    return NextResponse.json({
      ...post,
      endsAt: post.endsAt?.toISOString() || null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      userVote: null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
