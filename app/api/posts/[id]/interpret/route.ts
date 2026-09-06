import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interpretSource } from "@/lib/generate";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = await interpretSource({
    title: post.title,
    body: post.body,
    sourceUrl: post.sourceUrl,
    signal: post.signal,
  });
  if (!text) return NextResponse.json({ error: "Interpret failed" }, { status: 500 });
  return NextResponse.json({ text });
}
