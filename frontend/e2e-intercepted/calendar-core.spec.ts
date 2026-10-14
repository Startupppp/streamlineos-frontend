import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { encode } from "@auth/core/jwt";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;

const ORGANIZATIONS = [
  { id: "calendar-org-a", userId: "calendar-user-a", email: "owner-a@example.test" },
  { id: "calendar-org-b", userId: "calendar-user-b", email: "owner-b@example.test" },
] as const;

type CalendarScenario = {
  accessState: "allowed" | "denied" | "disabled";
  eventState: "normal" | "loading" | "empty" | "partial" | "failed";
  connectionsFailed?: boolean;
  pendingRoutes?: Route[];
};

function backendJwt(orgId: string, userId: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ orgId, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

function projection(orgId: string) {
  return {
    id: `event-${orgId}`,
    title: `Planning review ${orgId}`,
    start: "2026-10-15T09:00:00.000Z",
    end: "2026-10-15T10:00:00.000Z",
    allDay: false,
    color: "blue",
    category: "meeting",
    source: "event",
    timezone: "Asia/Kolkata",
    location: null,
    description: null,
    creatorName: null,
    entityId: null,
    entityType: null,
    myRsvpStatus: "accepted",
    projectId: null,
    sourceKey: "calendar-events",
    sourceRecordId: orgId,
    occurrenceId: `event-${orgId}`,
    status: "confirmed",
    timeKind: "timed",
    time: {
      kind: "timed",
      start: "2026-10-15T09:00:00.000Z",
      end: "2026-10-15T10:00:00.000Z",
      timezone: "Asia/Kolkata",
    },
    availability: "busy",
    sourceVersion: "1",
    actions: { view: true, edit: true, delete: true, rsvp: true, complete: false },
    freshness: { state: "fresh", asOf: "2026-10-15T08:59:00.000Z" },
  };
}

function externalEvent(connectionId: number, toolkit: "googlecalendar" | "outlook") {
  return {
    id: `ext-${connectionId}-provider-${connectionId}`,
    connectionId,
    toolkit,
    accountEmail: toolkit === "googlecalendar" ? "google@example.test" : "outlook@example.test",
    providerEventId: `provider-${connectionId}`,
    title: toolkit === "googlecalendar" ? "Google customer call" : "Outlook delivery review",
    start: "2026-10-15T11:00:00.000Z",
    end: "2026-10-15T12:00:00.000Z",
    allDay: false,
    timezone: "UTC",
    location: null,
    meetingUrl: null,
    webLink: null,
    sourceKey: `external:${toolkit}:${connectionId}`,
    sourceRecordId: `${connectionId}:provider-${connectionId}`,
    occurrenceId: `ext-${connectionId}-provider-${connectionId}`,
    status: "confirmed",
    timeKind: "timed",
    availability: "busy",
    sourceVersion: null,
    actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
    freshness: { state: "fresh", asOf: "2026-10-15T08:59:00.000Z" },
  };
}

async function installRoutes(
  page: Page,
  org: typeof ORGANIZATIONS[number],
  scenario?: CalendarScenario,
) {
  const token = backendJwt(org.id, org.userId);
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: org.userId, email: org.email, name: org.email },
      orgId: org.id,
      isOrgOwner: false,
      backendJwt: token,
      expires: "2026-11-15T00:00:00.000Z",
    }),
  }));
  await page.route("http://localhost:1500/**", (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/me/access") {
      const scopes: Record<string, string> = {
        "calendar:read": "all",
        "calendar:events:create": "all",
        "calendar:events:export": "all",
        "integrations:connections:view": "all",
        "integrations:connections:manage": "all",
        "hr:helpdesk:view": "all",
        "self:attendance": "own",
        "build:tickets:create": "all",
      };
      if (scenario?.accessState === "denied") delete scopes["calendar:read"];
      body = {
        membershipId: 1,
        scopes,
        isOrgOwner: false,
        canManageOrganizationMembership: true,
        modules: { calendar: scenario?.accessState !== "disabled", hr: true, build: true, tasks: true, integrations: true },
      };
    } else if (url.pathname === "/billing/entitlements") {
      const unlimited = { limit: null, used: 0 };
      body = {
        tier: "ENTERPRISE",
        plan: "ENTERPRISE",
        seatLimit: null,
        lockedModules: [],
        features: { chatGroupHuddles: true, chatVoiceVideo: true, kbPublicSharing: true, hrFull: true },
        limits: {
          members: unlimited,
          projects: unlimited,
          kbPages: unlimited,
          chatChannels: unlimited,
          crmLeads: unlimited,
          crmContacts: unlimited,
          crmDeals: unlimited,
          supportTickets: unlimited,
          automations: unlimited,
          signEnvelopes: unlimited,
          surveys: unlimited,
          acctInvoices: unlimited,
          hrCandidates: unlimited,
          hrJobPostings: unlimited,
        },
      };
    } else if (url.pathname === "/me/preferences") {
      body = { language: "en" };
    } else if (url.pathname === "/me/inbox/unified/count") {
      body = { notification: 0, mail: 0, approval: 0, total: 0, mailExact: true, approvalExact: true };
    } else if (url.pathname === "/companion/preferences") {
      const prompts = { meeting: false, clockIn: false, break: false, friendly: false };
      body = {
        preferences: {
          visible: false,
          name: null,
          preset: "default",
          tone: "neutral",
          animation: "off",
          anchor: "bottom-right",
          prompts,
          activityConsent: false,
          pausedUntil: null,
          version: 1,
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
        locks: {},
        policy: { petEnabled: false, allowedPresets: ["default"], prompts, version: 1 },
      };
    } else if (url.pathname === "/integrations/connections") {
      if (scenario?.connectionsFailed)
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Fixture account failure" }) });
      body = [
        { id: 11, toolkit: "googlecalendar", accountEmail: "google@example.test", accountLabel: null, status: "active", isPrimary: true, createdAt: "2026-10-01T00:00:00.000Z" },
        { id: 12, toolkit: "outlook", accountEmail: "outlook@example.test", accountLabel: null, status: "active", isPrimary: false, createdAt: "2026-10-01T00:00:00.000Z" },
      ];
    } else if (url.pathname === "/calendar/sources") {
      body = [
        { key: "calendar-events", label: "Calendar events", module: "calendar", enabled: true },
        { key: "build", label: "Build", module: "build", enabled: true },
        { key: "tasks", label: "Tasks", module: "tasks", enabled: true },
      ];
    } else if (url.pathname === "/calendar/saved-views") {
      body = { items: [], nextCursor: null, actorMembershipId: 1 };
    } else if (url.pathname === "/calendar/offline-policy") {
      body = { enabled: false, maxAgeDays: 1, version: 0 };
    } else if (url.pathname === "/calendar/events") {
      if (scenario?.eventState === "loading") {
        scenario.pendingRoutes?.push(route);
        return;
      }
      if (scenario?.eventState === "failed")
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Fixture failure" }) });
      const partial = scenario?.eventState === "partial";
      body = {
        events: scenario?.eventState === "empty" ? [] : [projection(org.id)],
        failures: [],
        truncated: partial,
        coverageState: partial ? "partial" : "complete",
        coverage: [{ sourceKey: "calendar-events", state: partial ? "partial" : "complete", nextCursor: null }],
      };
    } else if (url.pathname === "/calendar/external-events") {
      body = {
        events: scenario?.eventState === "empty" || scenario?.eventState === "loading"
          ? []
          : [externalEvent(11, "googlecalendar"), externalEvent(12, "outlook")],
        errors: [],
        complete: true,
        accounts: [
          { connectionId: 11, accountEmail: "google@example.test", toolkit: "googlecalendar", state: "complete", hasMore: false },
          { connectionId: 12, accountEmail: "outlook@example.test", toolkit: "outlook", state: "complete", hasMore: false },
        ],
      };
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function signInCalendarSession(
  context: BrowserContext,
  org: typeof ORGANIZATIONS[number],
  baseURL: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const name = "authjs.session-token";
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required");
  const value = await encode({
    token: {
      sub: org.userId,
      email: org.email,
      name: org.email,
      orgId: org.id,
      isOrgOwner: false,
      isActive: true,
      organizationAccess: "active",
      orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      authProvider: "credentials",
      sessionId: `~calendar-${org.userId}`,
      iat: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
    },
    secret,
    salt: name,
    maxAge: 3600,
  });
  await context.addCookies([{
    name,
    value,
    domain: new URL(baseURL).hostname,
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    expires: now + 3600,
  }]);
}

for (const org of ORGANIZATIONS) {
  for (const viewport of VIEWPORTS) {
    test(`${org.id} renders the authorized projection and accounts at ${viewport.width}px`, async ({ context, page, baseURL }) => {
      await signInCalendarSession(context, org, baseURL as string);
      await context.addCookies([{
        name: `org-setup-done--${org.id}`,
        value: "1",
        domain: new URL(baseURL as string).hostname,
        path: "/",
        sameSite: "Lax",
        secure: false,
      }]);
      const serverSessionResponse = await context.request.get(`${baseURL}/api/auth/session`);
      expect(await serverSessionResponse.json()).toMatchObject({
        orgId: org.id,
        orgOnboardingCompletedAt: expect.any(String),
        user: { isOrgOwner: false },
      });
      await installRoutes(page, org);
      await page.setViewportSize(viewport);
      await page.goto("/calendar?date=2026-10-15&view=day&mode=list");
      await expect(page).toHaveURL(/\/calendar/);
      await expect(page.getByText(`Planning review ${org.id}`)).toBeVisible();
      await page.getByRole("button", { name: "Calendar accounts" }).click();
      await expect(page.getByText("google@example.test")).toBeVisible();
      await expect(page.getByText("outlook@example.test")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}

for (const viewport of VIEWPORTS) {
  test(`Calendar states remain distinct at ${viewport.width}px`, async ({ context, page, baseURL }) => {
    const org = ORGANIZATIONS[0];
    const scenario: CalendarScenario = { accessState: "allowed", eventState: "loading", pendingRoutes: [] };
    await signInCalendarSession(context, org, baseURL as string);
    await context.addCookies([{
      name: `org-setup-done--${org.id}`,
      value: "1",
      domain: new URL(baseURL as string).hostname,
      path: "/",
      sameSite: "Lax",
      secure: false,
    }]);
    await installRoutes(page, org, scenario);
    await page.setViewportSize(viewport);
    await page.goto("/calendar?date=2026-10-15&view=day&mode=list");
    await expect(page.getByText("Loading events")).toBeVisible();

    if (!scenario.pendingRoutes?.length) throw new Error("Expected a pending Calendar events request");
    const pendingRoutes = scenario.pendingRoutes.splice(0);
    scenario.eventState = "empty";
    for (const route of pendingRoutes)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [],
          failures: [],
          truncated: false,
          coverageState: "complete",
          coverage: [{ sourceKey: "calendar-events", state: "complete", nextCursor: null }],
        }),
      });
    await expect(page.getByText("No events in this period")).toBeVisible();

    scenario.eventState = "partial";
    await page.reload();
    await expect(page.getByText(/Some events are missing because this period reached/)).toBeVisible();

    scenario.eventState = "failed";
    await page.reload();
    await expect(page.getByText("Couldn't load calendar events")).toBeVisible();
    await expect(page.getByText("No events in this period")).toHaveCount(0);

    scenario.eventState = "empty";
    scenario.accessState = "denied";
    await page.reload();
    await expect(page.getByText("Calendar access denied")).toBeVisible();

    scenario.accessState = "disabled";
    await page.reload();
    await expect(page.getByRole("status", { name: "Module not enabled: Calendar" })).toBeVisible();

    scenario.accessState = "allowed";
    scenario.eventState = "normal";
    scenario.connectionsFailed = true;
    await page.reload();
    await expect(page.getByText(`Planning review ${org.id}`)).toBeVisible();
    await expect(page.getByText("Couldn't load calendar accounts")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
