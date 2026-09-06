import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePost } from "@/lib/generate";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const expected =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!expected) {
      return NextResponse.json(
        { error: "Set CRON_SECRET or AUTH_SECRET on Vercel" },
        { status: 500 }
      );
    }
    const bearerOk = authHeader === `Bearer ${expected}`;
    const queryOk = querySecret === expected;
    if (!bearerOk && !queryOk) {
      return NextResponse.json(
        { error: "Pass ?secret=YOUR_CRON_SECRET_OR_AUTH_SECRET" },
        { status: 401 }
      );
    }
  }

  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Set GROQ_API_KEY or OPENAI_API_KEY" }, { status: 500 });
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
        sourceUrl: generated.sourceUrl || null,
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
