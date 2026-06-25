import { withAuth } from "@/lib/api/helpers";
import { exchangeGoogleCode, upsertCalendarConnection } from "@/lib/services/hr/calendar";
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
      await upsertCalendarConnection({
        userId: session.user.id,
        provider: "GOOGLE",
        tokens,
        email,
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
