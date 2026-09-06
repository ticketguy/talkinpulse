import { NextRequest, NextResponse } from "next/server";
import { expireOpenMarkets } from "@/lib/resolveMarket";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (process.env.NODE_ENV === "production") {
    if (!expected || (authHeader !== `Bearer ${expected}` && querySecret !== expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await expireOpenMarkets();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Expire failed" }, { status: 500 });
  }
}
