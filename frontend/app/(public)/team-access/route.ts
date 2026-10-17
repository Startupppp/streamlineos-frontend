import { NextRequest, NextResponse } from "next/server";
import {
  STAFF_ENTRY_COOKIE,
  STAFF_ENTRY_MAX_AGE_SECONDS,
  staffEntryCookieValue,
  staffKeyMatches,
} from "@/lib/waitlist-staff";

export function HEAD() {
  return new NextResponse(null, { headers: { "X-Robots-Tag": "noindex" } });
}

export async function GET(req: NextRequest) {
  const provided = req.nextUrl.searchParams.get("key") ?? "";
  const expected = process.env.WAITLIST_STAFF_KEY ?? "";
  const allowed = await staffKeyMatches(provided, expected);
  const destination = new URL(allowed ? "/signin" : "/waitlist", req.url);
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("X-Robots-Tag", "noindex");
  if (allowed) {
    response.cookies.set(STAFF_ENTRY_COOKIE, await staffEntryCookieValue(expected), {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: STAFF_ENTRY_MAX_AGE_SECONDS,
    });
  }
  return response;
}
