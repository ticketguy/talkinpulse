import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const gate = await requireUserId("Unauthorized");
  if (gate.error) return gate.error;
  const adminUser = gate.session?.user as any;
  if (!adminUser?.isAdmin && !["SUPER_ADMIN", "POINTS_MANAGER"].includes(adminUser?.adminRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, userIds, amount, description } = await req.json();

    if (type === "weekly_reward") {
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.$transaction([
        ...users.map((u: any) => prisma.user.update({ where: { id: u.id }, data: { talkinPoints: { increment: amount } } })),
        ...users.map((u: any) => prisma.pointTransaction.create({ data: { userId: u.id, amount, type: "weekly_reward", description: description || `Weekly reward — ${amount} Talkin Points` } })),
      ]);
      return NextResponse.json({ success: true, affected: users.length });
    }

    if (type === "manual" && userIds?.length) {
      await prisma.$transaction([
        ...userIds.map((id: string) => prisma.user.update({ where: { id }, data: { talkinPoints: { increment: amount } } })),
        ...userIds.map((id: string) => prisma.pointTransaction.create({ data: { userId: id, amount, type: "manual", description: description || `Manual points adjustment` } })),
      ]);
      return NextResponse.json({ success: true, affected: userIds.length });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
