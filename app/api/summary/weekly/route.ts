import { NextRequest, NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (process.env.NODE_ENV === "production" && expected) {
    if (authHeader !== `Bearer ${expected}` && querySecret !== expected && req.headers.get("user-agent")?.includes("vercel-cron") !== true) {
      /* Vercel Cron sends Authorization: Bearer CRON_SECRET automatically */
    }
  }
  try {
    const data = await buildDigest("week");
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Weekly summary failed" }, { status: 500 });
  }
}
