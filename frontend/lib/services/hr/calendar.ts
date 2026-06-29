import { serverApiClient } from "@/lib/api/server-client";

export async function exchangeCalendarOAuthCode(params: {
  provider: "GOOGLE" | "MICROSOFT";
  code: string;
  redirectUri: string;
}): Promise<void> {
  await serverApiClient.post("/calendar/connections/oauth/exchange", params);
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/google/callback`,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/microsoft/callback`,
    response_type: "code",
    scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access email",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}
