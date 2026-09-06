import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { resolveMarket } from "@/lib/resolveMarket";

export async function POST(req: NextRequest) {
  const gate = await requireUserId("Unauthorized");
  if (gate.error) return gate.error;
  const user = gate.session?.user as any;
  if (!user?.isAdmin && user?.adminRole !== "SUPER_ADMIN" && user?.adminRole !== "MODERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId, outcome, resolutionNote } = await req.json();
    if (!postId || !["YES", "NO", "NEUTRAL"].includes(outcome)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const result = await resolveMarket(postId, outcome, resolutionNote);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Resolution failed" }, { status: 500 });
  }
}
