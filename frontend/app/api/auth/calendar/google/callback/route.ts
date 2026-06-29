import { withAuth } from "@/lib/api/helpers";
import { exchangeCalendarOAuthCode } from "@/lib/api/calendar-oauth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/calendar?error=access_denied`
      );
    }

    try {
      await exchangeCalendarOAuthCode({
        provider: "GOOGLE",
        code,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/google/callback`,
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
