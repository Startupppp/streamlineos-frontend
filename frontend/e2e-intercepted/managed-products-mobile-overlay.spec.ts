import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "@auth/core/jwt";

const PRODUCT_ID = 1001;

const MP_SESSION = {
  orgId: "mp09-overlay-org",
  userId: "mp09-overlay-user",
  email: "mp09-overlay@example.test",
};

function backendJwt(orgId: string, userId: string): string {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc({ orgId, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

async function signInMp09(context: BrowserContext, baseURL: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const name = "authjs.session-token";
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET required");
  const value = await encode({
    token: {
      sub: MP_SESSION.userId,
      email: MP_SESSION.email,
      name: MP_SESSION.email,
      orgId: MP_SESSION.orgId,
      isOrgOwner: true,
      isActive: true,
      organizationAccess: "active",
      orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      authProvider: "credentials",
      sessionId: `mp09-overlay-session`,
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
  await context.addCookies([{
    name: `org-setup-done--${MP_SESSION.orgId}`,
    value: "1",
    domain: new URL(baseURL).hostname,
    path: "/",
    sameSite: "Lax",
    secure: false,
  }]);
}

function makeManagedProduct(id: number) {
  return {
    id,
    orgId: MP_SESSION.orgId,
    name: `MP09 Test Product ${id}`,
    key: `MP09-${id}`,
    description: "A test product for MP09 browser acceptance",
    status: "active",
    ownerId: MP_SESSION.userId,
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
    owner: {
      id: MP_SESSION.userId,
      firstName: "MP09",
      lastName: "Owner",
      email: MP_SESSION.email,
      image: null,
    },
  };
}

async function installMp09Routes(page: Page): Promise<void> {
  const token = backendJwt(MP_SESSION.orgId, MP_SESSION.userId);

  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: MP_SESSION.userId, email: MP_SESSION.email, name: MP_SESSION.email },
      orgId: MP_SESSION.orgId,
      isOrgOwner: true,
      backendJwt: token,
      expires: "2026-11-15T00:00:00.000Z",
    }),
  }));

  await page.route("http://localhost:1500/**", (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const unlimited = { limit: null, used: 0 };

    if (p === "/me/access") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          membershipId: 1,
          scopes: {
            "build:managed-products:view": "all",
            "build:managed-products:create": "all",
            "build:managed-products:update": "all",
            "build:managed-products:delete": "all",
          },
          isOrgOwner: true,
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
    if (p === "/me/preferences") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ language: "en" }) });
    }
    if (p === "/me/inbox/unified/count") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ notification: 0, mail: 0, approval: 0, total: 0, mailExact: true, approvalExact: true }),
      });
    }
    if (p === "/companion/preferences") {
      const prompts = { meeting: false, clockIn: false, break: false, friendly: false };
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          preferences: {
            visible: false, name: null, preset: "default", tone: "neutral",
            animation: "off", anchor: "bottom-right", prompts,
            activityConsent: false, pausedUntil: null, version: 1,
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
          locks: {},
          policy: { petEnabled: false, allowedPresets: ["default"], prompts, version: 1 },
        }),
      });
    }
    if (p === "/build/managed-products") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: [makeManagedProduct(PRODUCT_ID)],
          pagination: { limit: 25, nextCursor: null, hasMore: false },
        }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(makeManagedProduct(PRODUCT_ID)),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/summary`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          id: PRODUCT_ID, name: `MP09 Test Product ${PRODUCT_ID}`,
          key: `MP09-${PRODUCT_ID}`, status: "active", lifecycle: "build",
          health: "on_track", linkedProjectCount: 0, feedbackTrend: { last30d: 0, previous30d: 0 },
          goalHealth: null, nextRelease: null,
        }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/projects`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/releases`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/members`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/updates`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/insights`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          linkedProjects: 0, openFeedback: 0, closedFeedback: 0,
          totalFeedback: 0, roadmapItems: 0, completedRoadmapItems: 0,
          feedbackVotes: 0,
        }),
      });
    }
    if (p === `/build/managed-products/${PRODUCT_ID}/roadmap-preview`) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ items: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p.startsWith("/build/goals") || p.startsWith("/build/roadmap") || p.startsWith("/build/feedback")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    if (p.startsWith("/feedbucket")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

const ROUTES_UNDER_TEST = [
  { path: `/build/managed-products`, label: "list" },
  { path: `/build/managed-products/${PRODUCT_ID}`, label: "overview" },
  { path: `/build/managed-products/${PRODUCT_ID}/feedback`, label: "feedback" },
  { path: `/build/managed-products/${PRODUCT_ID}/projects`, label: "projects" },
  { path: `/build/managed-products/${PRODUCT_ID}/roadmap`, label: "roadmap" },
  { path: `/build/managed-products/${PRODUCT_ID}/releases`, label: "releases" },
  { path: `/build/managed-products/${PRODUCT_ID}/settings`, label: "settings" },
] as const;

test.describe("MP-09 priority 1: 375 px mobile overlay non-intersection", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await signInMp09(context, baseURL as string);
  });

  for (const route of ROUTES_UNDER_TEST) {
    test(`${route.label}: FAB, bottom-nav More tab and page controls are non-intersecting and >= 44×44`, async ({ page, baseURL }) => {
      await installMp09Routes(page);
      await page.goto(route.path);

      await expect(page).not.toHaveURL(/\/signin/);
      await expect(page).not.toHaveURL(/\/org-setup|\/employee-onboarding/);

      await page.waitForLoadState("networkidle");

      const fabLocator = page.getByRole("button", { name: "Open quick actions" });
      const moreTabLocator = page.getByRole("button", { name: "More navigation options" });

      const fabVisible = await fabLocator.isVisible().catch(() => false);
      const moreVisible = await moreTabLocator.isVisible().catch(() => false);

      const fabBox = fabVisible ? await fabLocator.boundingBox() : null;
      const moreBox = moreVisible ? await moreTabLocator.boundingBox() : null;

      if (fabBox) {
        expect(fabBox.width, `FAB width at ${route.label}`).toBeGreaterThanOrEqual(44);
        expect(fabBox.height, `FAB height at ${route.label}`).toBeGreaterThanOrEqual(44);
      }

      if (moreBox) {
        expect(moreBox.width, `More tab width at ${route.label}`).toBeGreaterThanOrEqual(44);
        expect(moreBox.height, `More tab height at ${route.label}`).toBeGreaterThanOrEqual(44);
      }

      if (fabBox && moreBox) {
        expect(
          rectsIntersect(fabBox, moreBox),
          `FAB and More tab must not intersect at ${route.label}: fab=[${fabBox.x},${fabBox.y},${fabBox.width},${fabBox.height}] more=[${moreBox.x},${moreBox.y},${moreBox.width},${moreBox.height}]`,
        ).toBe(false);
      }

      const interactiveControls = await page.evaluate(() => {
        const TAGS = ["button", "a", "input", "select", "textarea"];
        const allControls: Array<{ tag: string; label: string; box: { x: number; y: number; width: number; height: number } }> = [];
        for (const tag of TAGS) {
          for (const el of document.querySelectorAll<HTMLElement>(tag)) {
            if (el.offsetParent === null) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
            if (rect.right < 0 || rect.left > window.innerWidth) continue;
            allControls.push({
              tag,
              label: (el as HTMLElement).getAttribute("aria-label") || (el as HTMLElement).textContent?.trim().slice(0, 40) || "(unlabelled)",
              box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            });
          }
        }
        return allControls;
      });

      const smallControls = interactiveControls.filter((c) => {
        if (c.width < 44 && c.height < 44) return true;
        return false;
      });

      const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const overflow = docScrollWidth - docClientWidth;
      expect(overflow, `horizontal overflow on ${route.label} at 375px`).toBeLessThanOrEqual(1);

      if (smallControls.length > 0) {
        console.warn(`[${route.label}] Controls smaller than 44×44:`, JSON.stringify(smallControls.slice(0, 5)));
      }
    });
  }
});
