/**
 * S02 — KB "My pages" surface — browser state evidence.
 *
 * REQUIREMENT-LEDGER.md line 504 (slice S02) requires browser evidence for six
 * states: loading, ready, first empty, filtered empty, error+retry+requestId,
 * denied.
 *
 * PRODUCTION ISOLATION
 * All six tests run against the real Next.js app but with every outbound network
 * request intercepted:
 *
 *   • page.route('http://localhost:1500/**') catches every browser-originated
 *     backend call and serves fixture JSON. The real backend at :1500 never
 *     receives a connection from the browser.
 *
 *   • page.route on the auth session endpoint catches the browser-initiated
 *     NextAuth session call and returns a synthetic session including a fake
 *     backendJwt. The Next.js server's /api/auth/session handler never runs for
 *     these requests.
 *
 *   • The playwright-intercepted.config.ts sets API_INTERNAL_URL=http://localhost:9999
 *     so every server-side Next.js → backend call (fetchSessionData,
 *     exchangeSessionForBackendJwt) fails with ECONNREFUSED and the auth
 *     callbacks fall back to JWT token claims. Zero server-side production reads.
 *
 * This suite intentionally lives in e2e-intercepted/ and is run with
 * playwright-intercepted.config.ts, NOT playwright.config.ts.  The two configs
 * share no testDir, no port, and no dist directory, so the production-hitting
 * e2e suite cannot accidentally pick up these specs or vice-versa.
 *
 * SCREENSHOTS
 * Each state is captured at desktop (1280×800) and mobile (375×812) under
 * e2e-intercepted/screenshots/.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { encode } from "@auth/core/jwt";

const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

async function shot(page: Page, name: string) {
  ensureScreenshotDir();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: false,
  });
}

const SESSION_COOKIE = "authjs.session-token";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const FAKE_USER_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_ORG_ID = "00000000-0000-0000-0000-000000000002";

async function mintAndInstallSession(context: BrowserContext, baseURL: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be set by playwright-intercepted.config.ts");

  const now = Math.floor(Date.now() / 1000);
  const token = {
    id: FAKE_USER_ID,
    email: "intercepted-test@example.invalid",
    name: "Intercepted Test User",
    orgId: FAKE_ORG_ID,
    isOrgOwner: true,
    isActive: true,
    organizationAccess: "active",
    orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
    userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
    suspendedOrganizationName: null,
    authProvider: "credentials",
    sessionId: "~intercepted-session",
    sub: FAKE_USER_ID,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
    jti: crypto.randomUUID(),
  };

  const value = await encode({
    token,
    secret,
    salt: SESSION_COOKIE,
    maxAge: MAX_AGE_SECONDS,
  });

  const { hostname } = new URL(baseURL);
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + MAX_AGE_SECONDS,
    },
  ]);
}

const FAKE_SESSION_RESPONSE = {
  user: {
    id: FAKE_USER_ID,
    email: "intercepted-test@example.invalid",
    name: "Intercepted Test User",
    image: null,
    isOrgOwner: true,
    isActive: true,
    role: "owner",
  },
  orgId: FAKE_ORG_ID,
  sessionId: "~intercepted-session",
  backendJwt: "fake.eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJmYWtlIn0.fakesig",
  orgOnboardingCompletedAt: new Date().toISOString(),
  userOnboardingCompletedAt: new Date().toISOString(),
  organizationAccess: "active",
  authProvider: "credentials",
  expires: new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString(),
};

const FULL_PERMISSIONS_ACCESS = {
  membershipId: 1,
  scopes: {
    "kb:pages:view": "all",
    "kb:pages:create": "all",
    "kb:pages:update": "all",
    "kb:pages:delete": "all",
    "kb:pages:manage": "all",
    "kb:pages:export": "all",
    "kb:templates:manage": "all",
    "kb:spaces:view": "all",
    "kb:spaces:manage": "all",
  },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { kb: true },
};

const DENIED_ACCESS = {
  membershipId: 1,
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { kb: true },
};

const EMPTY_ENTITLEMENTS = {
  tier: "FREE",
  plan: "FREE",
  seatLimit: null,
  lockedModules: [],
  features: {
    chatGroupHuddles: false,
    chatVoiceVideo: false,
    kbPublicSharing: false,
    hrFull: false,
  },
  limits: {
    members: { limit: null, used: 0 },
    projects: { limit: null, used: 0 },
    kbPages: { limit: null, used: 0 },
    chatChannels: { limit: null, used: 0 },
    crmLeads: { limit: null, used: 0 },
    crmContacts: { limit: null, used: 0 },
    crmDeals: { limit: null, used: 0 },
    supportTickets: { limit: null, used: 0 },
    automations: { limit: null, used: 0 },
    signEnvelopes: { limit: null, used: 0 },
    surveys: { limit: null, used: 0 },
    acctInvoices: { limit: null, used: 0 },
    hrCandidates: { limit: null, used: 0 },
    hrJobPostings: { limit: null, used: 0 },
  },
};

const EMPTY_KB_PAGES = {
  data: [],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
  facets: null,
};

const EMPTY_KB_SPACES = {
  data: [],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
  facets: null,
};

const EMPTY_KB_PAGE_TREE = {
  data: [],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
};

const EMPTY_KB_FAVORITES: unknown[] = [];

const HR_LINK_CONFIG_OFF = { link: false, search: false, ai: false };

const EMPTY_INBOX_COUNT = {
  notification: 0,
  mail: 0,
  approval: 0,
  total: 0,
  mailExact: true,
};

const POPULATED_KB_PAGES = {
  data: [
    {
      id: 1001,
      title: "Test Page One",
      icon: null,
      coverImage: null,
      spaceId: null,
      projectId: null,
      parentPageId: null,
      status: "published",
      visibility: "private",
      contentType: "document",
      trustState: "verified",
      ownerMembershipId: 1,
      ownerUserId: FAKE_USER_ID,
      createdById: FAKE_USER_ID,
      createdByMembershipId: 1,
      lastEditedById: FAKE_USER_ID,
      lastEditedByMembershipId: 1,
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-06-01T14:30:00.000Z",
      deletedAt: null,
      nextReviewAt: null,
      verifiedUntil: null,
      contentRevision: 3,
      aclRevision: 1,
      sharedBy: null,
    },
    {
      id: 1002,
      title: "Test Page Two",
      icon: null,
      coverImage: null,
      spaceId: null,
      projectId: null,
      parentPageId: null,
      status: "draft",
      visibility: "private",
      contentType: "document",
      trustState: "unverified",
      ownerMembershipId: 1,
      ownerUserId: FAKE_USER_ID,
      createdById: FAKE_USER_ID,
      createdByMembershipId: 1,
      lastEditedById: FAKE_USER_ID,
      lastEditedByMembershipId: 1,
      createdAt: "2025-02-20T09:00:00.000Z",
      updatedAt: "2025-05-10T11:00:00.000Z",
      deletedAt: null,
      nextReviewAt: null,
      verifiedUntil: null,
      contentRevision: 1,
      aclRevision: 1,
      sharedBy: null,
    },
  ],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
  facets: null,
};

const CORRELATION_ID = "TEST-CORR-20260925-001";

function json(body: unknown) {
  return JSON.stringify(body);
}

type PagesRouteMode =
  | { kind: "hold" }
  | { kind: "ok"; body: unknown }
  | { kind: "error"; status: number; message: string; correlationId?: string };

async function setupInterceptors(
  page: Page,
  opts: {
    access?: unknown;
    pagesMode: PagesRouteMode;
  },
) {
  const access = opts.access ?? FULL_PERMISSIONS_ACCESS;

  await page.route("**/api/auth/**", (route) => {
    if (route.request().url().includes("/api/auth/session")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: json(FAKE_SESSION_RESPONSE),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: json({ csrfToken: "fake-csrf-token" }),
      });
    }
  });

  await page.route("http://localhost:1500/**", (route) => {
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: json({ message: "Unhandled intercepted route", statusCode: 404 }),
    });
  });

  await page.route("http://localhost:1500/organization*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json([
        {
          id: FAKE_ORG_ID,
          name: "Intercepted Test Org",
          slug: "intercepted-test-org",
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route("http://localhost:1500/me/access**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(access),
    });
  });

  await page.route("http://localhost:1500/me/inbox/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(EMPTY_INBOX_COUNT),
    });
  });

  await page.route("http://localhost:1500/billing/entitlements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(EMPTY_ENTITLEMENTS),
    });
  });

  await page.route("http://localhost:1500/kb/spaces**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(EMPTY_KB_SPACES),
    });
  });

  const pagesMode = opts.pagesMode;
  if (pagesMode.kind === "hold") {
    await page.route("http://localhost:1500/kb/pages**", async (_route) => {
      await new Promise<never>(() => {});
    });
  } else if (pagesMode.kind === "ok") {
    await page.route("http://localhost:1500/kb/pages**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: json(pagesMode.body),
      });
    });
  } else {
    await page.route("http://localhost:1500/kb/pages**", (route) => {
      route.fulfill({
        status: pagesMode.status,
        contentType: "application/json",
        body: json({
          message: pagesMode.message,
          statusCode: pagesMode.status,
          ...(pagesMode.correlationId
            ? { details: { correlationId: pagesMode.correlationId } }
            : {}),
        }),
      });
    });
  }

  await page.route("http://localhost:1500/kb/pages/tree**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(EMPTY_KB_PAGE_TREE),
    });
  });

  await page.route("http://localhost:1500/kb/pages/favorites**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(EMPTY_KB_FAVORITES),
    });
  });

  await page.route("http://localhost:1500/kb/hr-link/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: json(HR_LINK_CONFIG_OFF),
    });
  });
}

const MY_PAGES_PATH = "/knowledge/wiki/private";
const HEADING_TIMEOUT = 20_000;
const STATE_TIMEOUT = 25_000;

test.describe("S02 – KB My pages — six browser states", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error("playwright-intercepted.config.ts must set baseURL");
    await mintAndInstallSession(context, baseURL);
  });

  test("state: loading — DataTableSkeleton renders while /kb/pages is in-flight", async ({
    page,
  }) => {
    await setupInterceptors(page, { pagesMode: { kind: "hold" } });

    await page.goto(MY_PAGES_PATH);

    await expect(page.getByRole("heading", { name: "My pages" }), "page heading must appear").toBeVisible({
      timeout: HEADING_TIMEOUT,
    });

    const skeleton = page.locator('[aria-busy="true"]').first();
    await expect(skeleton, "aria-busy skeleton must be visible while data loads").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const statusText = page.getByRole("status").filter({ hasText: /loading results/i }).first();
    await expect(statusText, "sr-only status text must be in the DOM").toBeAttached({
      timeout: STATE_TIMEOUT,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-loading-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-loading-mobile.png");
  });

  test("state: ready — populated table rows render when /kb/pages returns data", async ({
    page,
  }) => {
    await setupInterceptors(page, {
      pagesMode: { kind: "ok", body: POPULATED_KB_PAGES },
    });

    await page.goto(MY_PAGES_PATH);

    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible({ timeout: HEADING_TIMEOUT });

    const firstRow = page.getByRole("link", { name: /Test Page One/i });
    await expect(firstRow, "first page row must be visible").toBeVisible({ timeout: STATE_TIMEOUT });

    const secondDataRow = page.locator("table tbody tr").nth(1);
    await expect(secondDataRow, "second page row must be visible").toBeVisible({ timeout: STATE_TIMEOUT });
    await expect(secondDataRow, "second page row must show expected title").toContainText("Test Page Two");

    const skeleton = page.locator('[aria-busy="true"]');
    await expect(skeleton, "no aria-busy skeleton in ready state").toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-ready-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-ready-mobile.png");
  });

  test("state: first empty — no-data message renders with no filters applied", async ({
    page,
  }) => {
    await setupInterceptors(page, {
      pagesMode: { kind: "ok", body: EMPTY_KB_PAGES },
    });

    await page.goto(MY_PAGES_PATH);

    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible({ timeout: HEADING_TIMEOUT });

    const emptyTitle = page.getByRole("heading", { name: "No pages yet" });
    await expect(emptyTitle, "first-empty title must be visible").toBeVisible({ timeout: STATE_TIMEOUT });

    const description = page.getByText("Pages you own will appear here.");
    await expect(description, "first-empty description must be visible").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const clearFilters = page.getByRole("button", { name: "Clear filters" });
    await expect(clearFilters, "no Clear filters button in first empty state").toHaveCount(0);

    const filteredMsg = page.getByRole("heading", { name: /No results match your filters/i });
    await expect(filteredMsg, "no filtered-empty heading in first empty state").toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-first-empty-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-first-empty-mobile.png");
  });

  test("state: filtered empty — different message + Clear filters button when filters are active", async ({
    page,
  }) => {
    await setupInterceptors(page, {
      pagesMode: { kind: "ok", body: EMPTY_KB_PAGES },
    });

    await page.goto(`${MY_PAGES_PATH}?q=nothingmatchesthisquery`);

    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible({ timeout: HEADING_TIMEOUT });

    const clearFilters = page.getByRole("button", { name: "Clear filters" });
    await expect(clearFilters, "Clear filters button must be visible").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const filteredTitle = page.getByRole("heading", { name: /No results match your filters/i });
    await expect(filteredTitle, "filtered-empty heading must be visible").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const firstEmptyTitle = page.getByRole("heading", { name: "No pages yet" });
    await expect(firstEmptyTitle, "first-empty title must NOT appear in filtered-empty state").toHaveCount(
      0,
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-filtered-empty-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-filtered-empty-mobile.png");
  });

  test("state: error — retry button and correlation ID are both visible", async ({
    page,
  }) => {
    await setupInterceptors(page, {
      pagesMode: {
        kind: "error",
        status: 402,
        message: "Internal server error",
        correlationId: CORRELATION_ID,
      },
    });

    await page.goto(MY_PAGES_PATH);

    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible({ timeout: HEADING_TIMEOUT });

    const retryButton = page.getByRole("button", { name: /Try again/i });
    await expect(retryButton, "retry button must be visible in error state").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const correlationIdText = page.getByText(CORRELATION_ID);
    await expect(correlationIdText, "correlation ID must be visible to user").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const errorAlert = page.getByRole("alert");
    await expect(errorAlert, "error alert region must be present").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-error-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-error-mobile.png");
  });

  test("state: denied — NoPermissionState renders when kb:pages:view is not granted", async ({
    page,
  }) => {
    await setupInterceptors(page, {
      access: DENIED_ACCESS,
      pagesMode: { kind: "ok", body: EMPTY_KB_PAGES },
    });

    await page.goto(MY_PAGES_PATH);

    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible({ timeout: HEADING_TIMEOUT });

    const deniedHeading = page.getByRole("heading", { name: /Access Restricted/i });
    await expect(deniedHeading, "denied heading must be visible").toBeVisible({
      timeout: STATE_TIMEOUT,
    });

    const errorHeading = page.getByRole("heading", { name: /Something went wrong/i });
    await expect(errorHeading, "must NOT show generic error — denied is its own distinct state").toHaveCount(0);

    const retryButton = page.getByRole("button", { name: /Try again/i });
    await expect(retryButton, "no retry button in denied state").toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await shot(page, "state-denied-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await shot(page, "state-denied-mobile.png");
  });
});
