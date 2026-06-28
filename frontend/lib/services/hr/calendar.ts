import { serverApiClient } from "@/lib/api/server-client";
import type { CalendarProvider } from "@/lib/db/schema";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

interface BusySlot {
  start: string;
  end: string;
}

interface CalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails: string[];
  conferenceLink?: string;
}

export async function upsertCalendarConnection(params: {
  userId: string;
  provider: CalendarProvider;
  tokens: TokenResponse;
  email: string;
}): Promise<void> {
  await serverApiClient.post("/calendar/connections", {
    provider: params.provider,
    accessToken: params.tokens.access_token,
    refreshToken: params.tokens.refresh_token,
    expiresIn: params.tokens.expires_in,
    providerEmail: params.email,
  });
}

export async function getFreeBusy(
  _userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<BusySlot[]> {
  return serverApiClient.get<BusySlot[]>("/calendar/connections/free-busy", {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  });
}

export async function createCalendarEvent(
  _organizerId: string,
  payload: CalendarEventPayload,
): Promise<void> {
  await serverApiClient.post("/calendar/connections/events", {
    summary: payload.summary,
    startDateTime: payload.startDateTime,
    endDateTime: payload.endDateTime,
    description: payload.description,
    attendeeEmails: payload.attendeeEmails,
    location: payload.location,
    conferenceLink: payload.conferenceLink,
  });
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

export async function exchangeGoogleCode(
  code: string,
): Promise<{ tokens: TokenResponse; email: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/google/callback`,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange Google code");
  const tokens = (await res.json()) as TokenResponse;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = (await userRes.json()) as { email: string };
  return { tokens, email: userInfo.email };
}

export async function exchangeMicrosoftCode(
  code: string,
): Promise<{ tokens: TokenResponse; email: string }> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET ?? "",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/microsoft/callback`,
      code,
      grant_type: "authorization_code",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access email",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange Microsoft code");
  const tokens = (await res.json()) as TokenResponse;

  const meRes = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const me = (await meRes.json()) as { mail: string; userPrincipalName: string };
  return { tokens, email: me.mail ?? me.userPrincipalName };
}
