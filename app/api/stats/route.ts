import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [markets, takes, callers, conversations, events] = await Promise.all([
      prisma.post.count({ where: { type: "MARKET" } }),
      prisma.post.count({ where: { type: "TAKE" } }),
      prisma.vote.count(),
      prisma.post.count({ where: { type: "CONVERSATION" } }),
      prisma.post.count({ where: { type: "EVENT" } }),
    ]);

    return NextResponse.json({ markets, takes, callers, conversations, events });
  } catch (e) {
    return NextResponse.json({ markets: 0, takes: 0, callers: 0, conversations: 0, events: 0 });
  }
}
