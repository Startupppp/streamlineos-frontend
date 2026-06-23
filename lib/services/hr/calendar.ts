import { db } from "@/lib/db";
import { userCalendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

interface FreeBusyResult {
  userId: string;
  busy: BusySlot[];
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

async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google token");
  return res.json() as Promise<TokenResponse>;
}

async function refreshMicrosoftToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Microsoft token");
  return res.json() as Promise<TokenResponse>;
}

async function getValidAccessToken(userId: string, provider: CalendarProvider): Promise<string | null> {
  const conn = await db.query.userCalendarConnections.findFirst({
    where: and(
      eq(userCalendarConnections.userId, userId),
      eq(userCalendarConnections.provider, provider)
    ),
  });
  if (!conn) return null;

  const isExpired = conn.expiresAt && conn.expiresAt < new Date();
  if (!isExpired) return conn.accessToken;

  if (!conn.refreshToken) return null;

  try {
    const tokens =
      provider === "GOOGLE"
        ? await refreshGoogleToken(conn.refreshToken)
        : await refreshMicrosoftToken(conn.refreshToken);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    await db
      .update(userCalendarConnections)
      .set({
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      })
      .where(eq(userCalendarConnections.id, conn.id));

    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function getFreeBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  for (const provider of ["GOOGLE", "MICROSOFT"] as CalendarProvider[]) {
    const token = await getValidAccessToken(userId, provider);
    if (!token) continue;

    try {
      if (provider === "GOOGLE") {
        const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            items: [{ id: "primary" }],
          }),
        });
        if (!res.ok) continue;
        const data = await res.json() as { calendars: Record<string, { busy: BusySlot[] }> };
        return data.calendars?.primary?.busy ?? [];
      }

      if (provider === "MICROSOFT") {
        const res = await fetch("https://graph.microsoft.com/v1.0/me/calendarView/delta", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: `outlook.timezone="UTC"`,
          },
        });
        if (!res.ok) continue;
        const data = await res.json() as { value: { start: { dateTime: string }; end: { dateTime: string } }[] };
        return (data.value ?? []).map((e) => ({ start: e.start.dateTime, end: e.end.dateTime }));
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function createCalendarEvent(
  organizerId: string,
  payload: CalendarEventPayload
): Promise<void> {
  for (const provider of ["GOOGLE", "MICROSOFT"] as CalendarProvider[]) {
    const token = await getValidAccessToken(organizerId, provider);
    if (!token) continue;

    try {
      if (provider === "GOOGLE") {
        await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: payload.summary,
            description: [payload.description, payload.conferenceLink].filter(Boolean).join("\n\n"),
            location: payload.location,
            start: { dateTime: payload.startDateTime, timeZone: "UTC" },
            end: { dateTime: payload.endDateTime, timeZone: "UTC" },
            attendees: payload.attendeeEmails.map((email) => ({ email })),
            sendNotifications: true,
          }),
        });
        return;
      }

      if (provider === "MICROSOFT") {
        await fetch("https://graph.microsoft.com/v1.0/me/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: payload.summary,
            body: { contentType: "text", content: [payload.description, payload.conferenceLink].filter(Boolean).join("\n\n") },
            location: { displayName: payload.location ?? "" },
            start: { dateTime: payload.startDateTime, timeZone: "UTC" },
            end: { dateTime: payload.endDateTime, timeZone: "UTC" },
            attendees: payload.attendeeEmails.map((email) => ({
              emailAddress: { address: email },
              type: "required",
            })),
            isOnlineMeeting: Boolean(payload.conferenceLink),
          }),
        });
        return;
      }
    } catch {
      continue;
    }
  }
}

export async function getConnectedCalendars(userId: string) {
  return db
    .select({
      id: userCalendarConnections.id,
      provider: userCalendarConnections.provider,
      providerEmail: userCalendarConnections.providerEmail,
      expiresAt: userCalendarConnections.expiresAt,
      updatedAt: userCalendarConnections.updatedAt,
    })
    .from(userCalendarConnections)
    .where(eq(userCalendarConnections.userId, userId));
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/calendar/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
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

export async function exchangeGoogleCode(code: string): Promise<{ tokens: TokenResponse; email: string }> {
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
  const tokens = await res.json() as TokenResponse;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json() as { email: string };
  return { tokens, email: userInfo.email };
}

export async function exchangeMicrosoftCode(code: string): Promise<{ tokens: TokenResponse; email: string }> {
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
  const tokens = await res.json() as TokenResponse;

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meRes.json() as { mail: string; userPrincipalName: string };
  return { tokens, email: me.mail ?? me.userPrincipalName };
}
