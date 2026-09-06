import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function getSessionSafe() {
  try {
    return await auth();
  } catch (e) {
    console.error("auth() failed", e);
    return null;
  }
}

export async function requireUserId(message = "Connect X to continue") {
  const session = await getSessionSafe();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!session?.user || !userId) {
    return {
      session: null,
      userId: null as string | null,
      error: NextResponse.json({ error: message }, { status: 401 }),
    };
  }
  return { session, userId, error: null as NextResponse | null };
}
