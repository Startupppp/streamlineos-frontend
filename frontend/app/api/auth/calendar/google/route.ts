import { withAuth, err } from "@/lib/api/helpers";
import { buildGoogleAuthUrl } from "@/lib/api/calendar-oauth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID) {
      return err("Google Calendar integration is not configured", 503);
    }
    const state = Buffer.from(JSON.stringify({ userId: session.user.id, provider: "GOOGLE" })).toString("base64url");
    return NextResponse.redirect(buildGoogleAuthUrl(state));
  });
}
