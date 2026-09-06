import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSafe, requireUserId } from "@/lib/session";
import { FeedFilter } from "@/types";
import { isHttpUrl, isTweetStatusUrl } from "@/lib/x";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const session = await getSessionSafe();
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") || "all") as FeedFilter;
  const rank = searchParams.get("rank") || "24h";
  const cursor = searchParams.get("cursor");
  const since = searchParams.get("since");
  const take = 20;
  const now = new Date();
  const today = startOfToday();

  try {
    const freshness = {
      OR: [
        { createdAt: { gte: today } },
        { type: "MARKET" as const, resolvedAt: null, endsAt: { gt: now } },
      ],
    };

    const where: any = { AND: [freshness] };
    if (since) where.AND.push({ createdAt: { gt: new Date(since) } });
    if (filter === "news") where.AND.push({ type: { not: "MARKET" } });
    if (filter === "hot") where.AND.push({ OR: [{ hot: true }, { category: "Hot" }] });
    if (filter === "trending") where.AND.push({ category: "Trending" });
    if (filter === "opinion") where.AND.push({ category: "Opinion" });
    if (filter === "divide") where.AND.push({ category: "Divide" });
    if (filter === "cooker") where.AND.push({ category: "LittleCooker" });
    if (filter === "markets") where.AND.push({ type: "MARKET" });
    if (filter === "takes") where.AND.push({ type: "TAKE" });
    if (filter === "conversations") where.AND.push({ OR: [{ type: "CONVERSATION" }, { category: "Convo" }] });
    if (filter === "events") where.AND.push({ type: "EVENT" });
    if (filter === "new") where.AND.push({ createdAt: { gte: today } });

    if (filter === "takes" && rank) {
      const periodMap: Record<string, number> = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000,
      };
      where.AND.push({ createdAt: { gte: new Date(Date.now() - (periodMap[rank] || periodMap["24h"])) } });
    }

    const orderBy: any = filter === "takes"
      ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ hot: "desc" }, { createdAt: "desc" }];

    const userId = (session?.user as any)?.id;
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
        ...(userId ? { votes: { where: { userId }, select: { side: true } } } : {}),
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

    return NextResponse.json({
      posts: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      serverTime: now.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireUserId("Unauthorized");
  if (gate.error || !gate.userId) return gate.error!;

  try {
    const body = await req.json();
    const { type, title, body: postBody, category, endsAt, sourceUrl } = body;
    if (!type || !title) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    if (!isHttpUrl(sourceUrl)) return NextResponse.json({ error: "sourceUrl required" }, { status: 400 });
    if (/x\.com|twitter\.com/i.test(sourceUrl) && !isTweetStatusUrl(sourceUrl)) {
      return NextResponse.json({ error: "X source must be a tweet /status/ URL" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        type,
        title: title.slice(0, 280),
        body: postBody?.slice(0, 1000),
        category: category || "Meta",
        endsAt: type === "MARKET" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : endsAt ? new Date(endsAt) : null,
        sourceUrl,
        authorId: gate.userId,
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
