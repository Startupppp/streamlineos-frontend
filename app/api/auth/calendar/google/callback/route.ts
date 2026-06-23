import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { userCalendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { exchangeGoogleCode } from "@/lib/services/hr/calendar";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/calendar?error=access_denied`
      );
    }

    try {
      const { tokens, email } = await exchangeGoogleCode(code);
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined;

      await db
        .insert(userCalendarConnections)
        .values({
          userId: session.user.id,
          provider: "GOOGLE",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          providerEmail: email,
        })
        .onConflictDoUpdate({
          target: [userCalendarConnections.userId, userCalendarConnections.provider],
          set: {
            accessToken: tokens.access_token,
            ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
            ...(expiresAt ? { expiresAt } : {}),
            providerEmail: email,
          },
        });

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/calendar?success=google`
      );
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/calendar?error=exchange_failed`
      );
    }
  });
}
