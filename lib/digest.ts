import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/generate";

export async function buildDigest(range: "day" | "week") {
  const start = new Date();
  if (range === "week") start.setDate(start.getDate() - 7);
  else start.setHours(0, 0, 0, 0);

  const posts = await prisma.post.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
    take: range === "week" ? 80 : 40,
    select: { type: true, title: true, body: true, category: true, signal: true },
  });

  if (!posts.length) {
    return {
      range,
      date: start.toISOString().slice(0, 10),
      headline: range === "week" ? "Quiet week" : "Quiet day",
      brief: "No cards in this window.",
      watch: "",
      count: 0,
    };
  }

  const blob = posts
    .map((p) => `[${p.type}/${p.category}] ${p.title}${p.body ? " — " + p.body : ""}`)
    .join("\n");

  const raw = await callLLM([
    {
      role: "system",
      content:
        range === "week"
          ? 'TalkinPulse weekly CT brief. JSON only: {"headline":"max 80","brief":"6-10 sentences covering the week","watch":"2 sentences next week"}'
          : 'TalkinPulse end-of-day CT brief. JSON only: {"headline":"max 80","brief":"4-7 sentences","watch":"2 sentences tomorrow"}',
    },
    { role: "user", content: blob.slice(0, 8000) },
  ]);

  let parsed: any = {};
  try {
    parsed = raw ? JSON.parse(raw.replace(/```json|```/g, "").trim()) : {};
  } catch {
    parsed = { brief: raw };
  }

  return {
    range,
    date: start.toISOString().slice(0, 10),
    headline: parsed.headline || (range === "week" ? "This week on Pulse" : "Today on Pulse"),
    brief: parsed.brief || "Could not summarize.",
    watch: parsed.watch || "",
    count: posts.length,
  };
}
