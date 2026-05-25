import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePost } from "@/lib/generate";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const generated = await generatePost();
    if (!generated) {
      return NextResponse.json({ error: "Generation returned null" }, { status: 500 });
    }

    const post = await prisma.post.create({
      data: {
        type: generated.type,
        title: generated.title,
        body: generated.body || null,
        signal: generated.signal || null,
        category: generated.category,
        endsAt: generated.endsAt || null,
        hot: generated.hot,
        originator: generated.originator || null,
        notableReplies: generated.notableReplies || null,
        yesCount: generated.yesCount || 50,
        noCount: generated.noCount || 50,
        isAiGen: true,
        authorId: null,
      },
    });

    return NextResponse.json({ success: true, post: { id: post.id, type: post.type, title: post.title } });
  } catch (e) {
    console.error("Generation error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
