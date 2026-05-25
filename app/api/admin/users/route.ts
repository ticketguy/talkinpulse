import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const adminUser = session?.user as any;
  if (!adminUser?.isAdmin && !adminUser?.adminRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, displayName: true, imageUrl: true,
        repScore: true, repLevel: true, talkinPoints: true,
        isAdmin: true, adminRole: true, createdAt: true,
        _count: { select: { votes: true, posts: true, comments: true } },
      },
    });
    return NextResponse.json(users.map((u: any) => ({ ...u, createdAt: u.createdAt.toISOString() })));
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const adminUser = session?.user as any;
  if (adminUser?.adminRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, adminRole, repLevel } = await req.json();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(adminRole !== undefined && { adminRole, isAdmin: !!adminRole }),
        ...(repLevel !== undefined && { repLevel }),
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
