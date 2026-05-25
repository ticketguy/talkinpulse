import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    let settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: "singleton" } });
    }
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const adminUser = session?.user as any;
  if (!adminUser?.isAdmin && adminUser?.adminRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await req.json();
    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
