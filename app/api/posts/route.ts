import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FeedFilter } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") || "all") as FeedFilter;
  const rank = searchParams.get("rank") || "24h";
  const cursor = searchParams.get("cursor");
  const take = 20;

  try {
    const where: any = {};

    if (filter === "hot") where.OR = [{ hot: true }, { category: "Hot" }];
    if (filter === "trending") where.category = "Trending";
    if (filter === "opinion") where.category = "Opinion";
    if (filter === "divide") where.category = "Divide";
    if (filter === "cooker") where.category = "LittleCooker";
    if (filter === "markets") where.type = "MARKET";
    if (filter === "takes") where.type = "TAKE";
    if (filter === "conversations") where.OR = [{ type: "CONVERSATION" }, { category: "Convo" }];
    if (filter === "events") where.type = "EVENT";
    if (filter === "new") {
      where.createdAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    if (filter === "takes" && rank) {
      const periodMap: Record<string, number> = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000,
      };
      const ms = periodMap[rank] || periodMap["24h"];
      where.createdAt = { gte: new Date(Date.now() - ms) };
    }

    const orderBy: any = filter === "takes"
      ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ hot: "desc" }, { createdAt: "desc" }];

    const posts = await prisma.post.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, imageUrl: true, repScore: true, xId: true },
        },
        _count: { select: { comments: true, votes: true } },
        ...(session?.user
          ? { votes: { where: { userId: (session.user as any).id }, select: { side: true } } }
          : {}),
      },
    });

    const hasMore = posts.length > take;
    const items = posts.slice(0, take).map((p: any) => ({
      ...p,
      userVote: p.votes?.[0]?.side || null,
      votes: undefined,
      endsAt: p.endsAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ posts: items, nextCursor: hasMore ? items[items.length - 1].id : null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, title, body: postBody, category, endsAt } = body;
    if (!type || !title) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

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
        author: { select: { id: true, username: true, displayName: true, imageUrl: true, repScore: true, xId: true } },
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
