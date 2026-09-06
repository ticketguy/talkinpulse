import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/generate";

export async function GET() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const posts = await prisma.post.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { type: true, title: true, body: true, category: true, signal: true },
  });

  if (!posts.length) {
    return NextResponse.json({
      date: start.toISOString().slice(0, 10),
      summary: "No cards today yet. Come back after the feed has moved.",
      count: 0,
    });
  }

  const blob = posts
    .map((p) => `[${p.type}/${p.category}] ${p.title}${p.body ? " — " + p.body : ""}`)
    .join("\n");

  const raw = await callLLM([
    {
      role: "system",
      content:
        'You write TalkinPulse end-of-day CT brief. JSON only: {"headline":"max 80 chars","brief":"4-7 sentences of what happened today","watch":"2 sentences what to watch tomorrow"}',
    },
    { role: "user", content: blob.slice(0, 6000) },
  ]);

  let parsed: any = {};
  try {
    parsed = raw ? JSON.parse(raw.replace(/```json|```/g, "").trim()) : {};
  } catch {
    parsed = { brief: raw };
  }

  return NextResponse.json({
    date: start.toISOString().slice(0, 10),
    headline: parsed.headline || "Today on Pulse",
    brief: parsed.brief || "Could not summarize.",
    watch: parsed.watch || "",
    count: posts.length,
  });
}
