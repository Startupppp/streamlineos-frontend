import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (session: Session) => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler(session as Session);
}
