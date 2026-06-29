import { withAuth, err } from "@/lib/api/helpers";
import { buildMicrosoftAuthUrl } from "@/lib/api/calendar-oauth";
import { NextResponse } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    if (!process.env.MICROSOFT_CALENDAR_CLIENT_ID) {
      return err("Microsoft Calendar integration is not configured", 503);
    }
    const state = Buffer.from(JSON.stringify({ userId: session.user.id, provider: "MICROSOFT" })).toString("base64url");
    return NextResponse.redirect(buildMicrosoftAuthUrl(state));
  });
}
