import { NextRequest, NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") === "week" ? "week" : "day";
  try {
    const data = await buildDigest(range);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
