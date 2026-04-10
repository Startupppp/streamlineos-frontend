

import { type NextRequest, NextResponse } from "next/server";
import Ably from "ably";
import { withAuth, err } from "@/lib/api/helpers";

export async function GET(_req: NextRequest) {
  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Ably is not configured" },
      { status: 503 }
    );
  }

  const rest = new Ably.Rest(process.env.ABLY_API_KEY);

  return withAuth(async (session) => {
    try {
      const tokenRequest = await rest.auth.createTokenRequest({
        clientId: session.user.id,
        capability: {

          [`chat:${session.orgId}:*`]: ["subscribe", "history"],
        },
        ttl: 3_600 * 1_000,
      });
      return NextResponse.json(tokenRequest);
    } catch {
      return err("Failed to create Ably token", 500);
    }
  });
}
