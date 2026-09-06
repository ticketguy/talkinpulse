import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBatch } from "@/lib/generate";
import { isHttpUrl, isTweetStatusUrl } from "@/lib/x";

function okSource(url?: string | null, type?: string) {
  if (!url) return false;
  if (type === "MARKET" || type === "TAKE" || type === "CONVERSATION") {
    return isTweetStatusUrl(url) || isHttpUrl(url);
  }
  return isHttpUrl(url);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const expected =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!expected) {
      return NextResponse.json({ error: "Set CRON_SECRET or AUTH_SECRET on Vercel" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${expected}` && querySecret !== expected) {
      return NextResponse.json({ error: "Pass ?secret=YOUR_CRON_SECRET_OR_AUTH_SECRET" }, { status: 401 });
    }
  }

  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Set GROQ_API_KEY or OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const generated = await generateBatch();
    const created = [];
    for (const item of generated) {
      if (!okSource(item.sourceUrl, item.type)) continue;
      const post = await prisma.post.create({
        data: {
          type: item.type,
          title: item.title,
          body: item.body || null,
          signal: item.signal || null,
          category: item.category,
          endsAt: item.type === "MARKET" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : item.endsAt || null,
          hot: item.hot,
          originator: item.originator || null,
          notableReplies: null,
          sourceUrl: item.sourceUrl,
          xPostId: item.xPostId || null,
          yesCount: item.yesCount || (item.type === "MARKET" ? 50 : 0),
          noCount: item.noCount || (item.type === "MARKET" ? 50 : 0),
          isAiGen: true,
          authorId: null,
        },
      });
      created.push({ id: post.id, type: post.type, title: post.title });
    }
    if (!created.length) {
      return NextResponse.json({ success: true, posts: [], note: "No fresh sourced candidates" });
    }
    return NextResponse.json({ success: true, posts: created });
  } catch (e) {
    console.error("Generation error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
