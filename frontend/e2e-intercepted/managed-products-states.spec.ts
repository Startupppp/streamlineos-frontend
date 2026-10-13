import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "@auth/core/jwt";

const PRODUCT_ID = 1002;

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
] as const;

const SESSION = {
  orgId: "mp09-states-org",
  userId: "mp09-states-user",
  email: "mp09-states@example.test",
};

function backendJwt(orgId: string, userId: string): string {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc({ orgId, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

async function signIn(context: BrowserContext, baseURL: string, opts: { isOwner?: boolean } = {}): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const name = "authjs.session-token";
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET required");
  const value = await encode({
    token: {
      sub: SESSION.userId,
      email: SESSION.email,
      name: SESSION.email,
      orgId: SESSION.orgId,
      isOrgOwner: opts.isOwner ?? true,
      isActive: true,
      organizationAccess: "active",
      orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      authProvider: "credentials",
      sessionId: `mp09-states-session`,
      iat: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
    },
    secret,
    salt: name,
    maxAge: 3600,
  });
  await context.addCookies([
    {
      name,
      value,
      domain: new URL(baseURL).hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + 3600,
    },
    {
      name: `org-setup-done--${SESSION.orgId}`,
      value: "1",
      domain: new URL(baseURL).hostname,
      path: "/",
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

function makeProduct(id: number = PRODUCT_ID) {
  return {
    id,
    orgId: SESSION.orgId,
    name: `MP09 States Product ${id}`,
    key: `ST-${id}`,
    description: "States matrix test product",
    status: "active",
    ownerId: SESSION.userId,
    lifecycle: "build",
    health: "on_track",
    teamId: null,
    segments: [],
    tags: [],
    northStarMetric: null,
    roadmapDefaultHorizon: null,
    lastReviewedAt: null,
    targetLaunchDate: null,
    successMetrics: null,
    vision: null,
    missionStatement: null,
    targetCustomer: null,
    differentiators: null,
    ownerMembershipId: 1,
    currentPhase: null,
    version: 1,
    deletedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    allowedActions: ["view", "update", "delete", "archive"],
    linkedProjectCount: 0,
    nextRelease: null,
    feedbackTrend: { last30d: 0, previous30d: 0 },
    goalHealth: null,
    owner: { id: SESSION.userId, firstName: "MP09", lastName: "States", email: SESSION.email, image: null },
  };
}

type ApiRouteState = "populated" | "empty" | "error" | "denied" | "not-found";

async function installRoutes(page: Page, state: ApiRouteState): Promise<void> {
  const token = backendJwt(SESSION.orgId, SESSION.userId);

  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: SESSION.userId, email: SESSION.email, name: SESSION.email },
      orgId: SESSION.orgId,
      isOrgOwner: state !== "denied",
      backendJwt: token,
      expires: "2026-11-15T00:00:00.000Z",
    }),
  }));

  await page.route("http://localhost:1500/**", (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const unlimited = { limit: null, used: 0 };

    if (p === "/me/access") {
      const scopes = state === "denied"
        ? {}
        : {
            "build:managed-products:view": "all",
            "build:managed-products:create": "all",
            "build:managed-products:update": "all",
            "build:managed-products:delete": "all",
          };
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          membershipId: 1,
          scopes,
          isOrgOwner: state !== "denied",
          canManageOrganizationMembership: true,
          modules: { build: true, hr: false, tasks: true, calendar: false, integrations: false },
        }),
      });
    }
    if (p === "/billing/entitlements") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          tier: "ENTERPRISE", plan: "ENTERPRISE", seatLimit: null, lockedModules: [],
          features: { chatGroupHuddles: false, chatVoiceVideo: false, kbPublicSharing: false, hrFull: false },
          limits: {
            members: unlimited, projects: unlimited, kbPages: unlimited,
            chatChannels: unlimited, crmLeads: unlimited, crmContacts: unlimited,
            crmDeals: unlimited, supportTickets: unlimited, automations: unlimited,
            signEnvelopes: unlimited, surveys: unlimited, acctInvoices: unlimited,
            hrCandidates: unlimited, hrJobPostings: unlimited,
          },
        }),
      });
    }
    if (p === "/me/preferences") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ language: "en" }) });
    if (p === "/me/inbox/unified/count") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notification: 0, mail: 0, approval: 0, total: 0, mailExact: true, approvalExact: true }) });
    }
    if (p === "/companion/preferences") {
      const prompts = { meeting: false, clockIn: false, break: false, friendly: false };
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          preferences: { visible: false, name: null, preset: "default", tone: "neutral", animation: "off", anchor: "bottom-right", prompts, activityConsent: false, pausedUntil: null, version: 1, updatedAt: "2026-10-01T00:00:00.000Z" },
          locks: {},
          policy: { petEnabled: false, allowedPresets: ["default"], prompts, version: 1 },
        }),
      });
    }

    if (p === "/build/managed-products") {
      if (state === "error") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Internal server error" }) });
      if (state === "denied") return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) });
      if (state === "empty") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [makeProduct()], pagination: { limit: 25, nextCursor: null, hasMore: false } }) });
    }

    if (p === `/build/managed-products/${PRODUCT_ID}`) {
      if (state === "error") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Internal server error" }) });
      if (state === "denied") return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) });
      if (state === "not-found") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Not found" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(makeProduct()) });
    }

    if (p === `/build/managed-products/${PRODUCT_ID}/summary`) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: PRODUCT_ID, name: `MP09 States Product ${PRODUCT_ID}`, key: `ST-${PRODUCT_ID}`, status: "active", lifecycle: "build", health: "on_track", linkedProjectCount: 0, feedbackTrend: { last30d: 0, previous30d: 0 }, goalHealth: null, nextRelease: null }) });
    }

    const emptyPage = { data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } };

    if (p === `/build/managed-products/${PRODUCT_ID}/projects`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    if (p === `/build/managed-products/${PRODUCT_ID}/releases`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    if (p === `/build/managed-products/${PRODUCT_ID}/members`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    if (p === `/build/managed-products/${PRODUCT_ID}/updates`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    if (p === `/build/managed-products/${PRODUCT_ID}/roadmap-preview`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }) });
    if (p === `/build/managed-products/${PRODUCT_ID}/insights`) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ linkedProjects: 0, openFeedback: 0, closedFeedback: 0, totalFeedback: 0, roadmapItems: 0, completedRoadmapItems: 0, feedbackVotes: 0 }) });
    }

    if (p.startsWith("/build/goals") || p.startsWith("/build/roadmap") || p.startsWith("/build/feedback")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    }
    if (p.startsWith("/feedbucket")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
}

test.describe("MP-09 list page states × viewports", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name}px`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ context, baseURL }) => {
        await signIn(context, baseURL as string);
      });

      test("populated: renders product name and no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto("/build/managed-products");
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(`MP09 States Product ${PRODUCT_ID}`)).toBeVisible({ timeout: 20_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `horizontal overflow at ${vp.name}px populated`).toBeLessThanOrEqual(1);
      });

      test("empty: renders empty state, not error state", async ({ page }) => {
        await installRoutes(page, "empty");
        await page.goto("/build/managed-products");
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("status")).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/no managed products yet/i)).toBeVisible();
        await expect(page.getByText(/could not load/i)).not.toBeVisible();
      });

      test("error: renders error state with retry, not empty state", async ({ page }) => {
        await installRoutes(page, "error");
        await page.goto("/build/managed-products");
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(/could not load/i)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/no managed products yet/i)).not.toBeVisible();
      });

      test("no horizontal overflow in any state", async ({ page }) => {
        for (const state of ["populated", "empty", "error"] as const) {
          await installRoutes(page, state);
          await page.goto("/build/managed-products");
          await page.waitForLoadState("networkidle");
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `horizontal overflow in ${state} state at ${vp.name}px`).toBeLessThanOrEqual(1);
        }
      });
    });
  }
});

test.describe("MP-09 product detail states × viewports", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name}px`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ context, baseURL }) => {
        await signIn(context, baseURL as string);
      });

      test("overview: populated - product name is visible", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(`MP09 States Product ${PRODUCT_ID}`)).toBeVisible({ timeout: 20_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `overview horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("insights: no horizontal overflow at all viewports", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/insights`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `insights horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("feedback: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/feedback`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `feedback horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("goals: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/goals`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `goals horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("projects: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/projects`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `projects horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("roadmap: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/roadmap`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `roadmap horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("releases: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/releases`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `releases horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });

      test("settings: no horizontal overflow", async ({ page }) => {
        await installRoutes(page, "populated");
        await page.goto(`/build/managed-products/${PRODUCT_ID}/settings`);
        await expect(page).not.toHaveURL(/\/signin/);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `settings horizontal overflow at ${vp.name}px`).toBeLessThanOrEqual(1);
      });
    });
  }
});

test.describe("MP-09 denied state: list page shows access restricted, not empty", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL as string, { isOwner: false });
  });

  test("access-denied route returns a denied state, not an empty state", async ({ page }) => {
    await installRoutes(page, "denied");
    await page.goto("/build/managed-products");
    await expect(page).not.toHaveURL(/\/signin/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no managed products yet/i)).not.toBeVisible({ timeout: 20_000 });
  });
});

test.describe("MP-09 not-found: 404 product shows not-found, not loading", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL as string);
  });

  test("integer product id that the backend 404s renders not-found UI", async ({ page }) => {
    await installRoutes(page, "not-found");
    await page.goto(`/build/managed-products/${PRODUCT_ID}`);
    await expect(page).not.toHaveURL(/\/signin/);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "not-found page horizontal overflow").toBeLessThanOrEqual(1);
  });

  test("non-integer product id renders not-found immediately (route guard)", async ({ page }) => {
    await installRoutes(page, "not-found");
    await page.goto("/build/managed-products/not-a-number");
    await expect(page).not.toHaveURL(/\/signin/);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "non-integer id horizontal overflow").toBeLessThanOrEqual(1);
  });
});

test.describe("MP-09 deep-link and refresh", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL as string);
  });

  test("deep-linking directly to the overview route lands on the right page", async ({ page }) => {
    await installRoutes(page, "populated");
    await page.goto(`/build/managed-products/${PRODUCT_ID}`);
    await expect(page).not.toHaveURL(/\/signin/);
    await expect(page).toHaveURL(new RegExp(`/build/managed-products/${PRODUCT_ID}`));
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(`MP09 States Product ${PRODUCT_ID}`)).toBeVisible({ timeout: 20_000 });
  });

  test("browser refresh on the overview route stays on the route", async ({ page }) => {
    await installRoutes(page, "populated");
    await page.goto(`/build/managed-products/${PRODUCT_ID}`);
    await expect(page).not.toHaveURL(/\/signin/);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/build/managed-products/${PRODUCT_ID}`));
    await expect(page).not.toHaveURL(/\/signin/);
  });
});
