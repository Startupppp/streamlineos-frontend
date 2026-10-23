import { encode } from "@auth/core/jwt";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;

async function signIn(context: BrowserContext, baseURL: string) {
  const now = Math.floor(Date.now() / 1000);
  const name = "authjs.session-token";
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for the intercepted browser fixture");
  const value = await encode({
    token: {
      sub: "self-service-user",
      id: "self-service-user",
      email: "employee@example.test",
      name: "Employee",
      orgId: "self-service-org",
      isOrgOwner: false,
      isActive: true,
      organizationAccess: "active",
      orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
      authProvider: "credentials",
      sessionId: "~self-service-user",
      iat: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
    },
    secret,
    salt: name,
    maxAge: 3600,
  });
  const domain = new URL(baseURL).hostname;
  await context.addCookies([
    { name, value, domain, path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: now + 3600 },
    { name: "org-setup-done--self-service-org", value: "1", domain, path: "/", secure: false, sameSite: "Lax" },
  ]);
}

async function installBrowserFixtures(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "self-service-user", email: "employee@example.test", name: "Employee" },
      orgId: "self-service-org",
      isOrgOwner: false,
      backendJwt: "fixture.jwt.token",
      expires: "2026-11-15T00:00:00.000Z",
    }),
  }));
  await page.route("http://localhost:1500/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown;
    if (path === "/me/access") {
      body = {
        membershipId: 1,
        scopes: {
          "self:attendance": "own",
          "self:leaves": "own",
          "self:expenses": "own",
          "self:payslips": "own",
          "self:onboarding-docs": "own",
          "self:onboarding-tasks": "own",
          "self:recruitment": "own",
          "self:job-openings": "own",
          "self:referrals": "own",
          "calendar:read": "own",
          "calendar:admin:manage": "all",
        },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        modules: { hr: true, payroll: true },
      };
    } else if (path === "/billing/entitlements") {
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
    } else if (path === "/me/preferences") {
      body = { language: "en" };
    } else if (path === "/organization") {
      body = [{ id: "self-service-org", name: "Example Organization", slug: "example", role: "MEMBER", joinedAt: null }];
    } else if (path === "/onboarding/me") {
      body = [];
    } else if (path === "/me/time-off") {
      body = {
        balances: [], types: [], joiningDate: null, approvers: [], noPolicyConfigured: true,
        approvalRoute: {
          kind: "leave", subjectUserId: "self-service-user", permission: "hr:leaves:approve",
          resolvedAt: "2026-10-22T00:00:00.000Z", rung: null, assignedTo: null,
          approver: null, delegation: null, queue: null, skipped: [], slaHours: 24,
          dueAt: "2026-10-23T00:00:00.000Z", escalation: null,
          ownerSelfApproval: false, explanation: "No approver configured",
        },
      };
    } else if (path === "/me/time-off/requests") {
      body = { data: [], pageInfo: { limit: 25, hasMore: false, nextCursor: null } };
    } else if (path === "/me/expenses") {
      body = {
        expenses: [], pendingExpenses: [], stats: null, categories: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 }, isAdmin: false,
      };
    } else if (path === "/calendar/resources/pending-allocation-pages") {
      body = { items: [], nextCursor: null };
    } else if (path === "/hr/recruitment/me/job-openings") {
      body = [];
    } else if (path === "/me/recruitment") {
      body = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    } else if (path === "/me/inbox/unified/count") {
      body = { notification: 0, mail: 0, approval: 0, task: 0, total: 0, mailExact: true, approvalExact: true };
    } else if (path === "/me/org-display") {
      body = { currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata" };
    } else if (path === "/companion/preferences") {
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
    }
    if (body === undefined)
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, code: "UNAVAILABLE", message: "Fixture endpoint unavailable" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

const HUBS = [
  { path: "/me/workday", heading: "Attendance & Time Off", section: "My leaves", query: "section=time-off" },
  { path: "/me/records", heading: "Documents & Onboarding", section: "Onboarding", query: "section=onboarding" },
  { path: "/me/money", heading: "Expenses & Pay", section: "Payslips", query: "section=pay&tab=payslips" },
  { path: "/me/career", heading: "Hiring & Referrals", section: "Job openings", query: "section=openings" },
] as const;

for (const viewport of VIEWPORTS) {
  for (const { path, heading, section, query } of HUBS) {
    test(`${heading} navigation fits ${viewport.width}px`, async ({ context, page, baseURL }, testInfo) => {
      test.setTimeout(240_000);
      await signIn(context, baseURL as string);
      const serverSession = await context.request.get(`${baseURL}/api/auth/session`);
      expect(await serverSession.json()).toMatchObject({
        orgId: "self-service-org",
        user: { id: "self-service-user" },
      });
      await installBrowserFixtures(page);
      await page.setViewportSize(viewport);

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 60_000 });
      const tabs = page.getByRole("navigation", { name: path === "/me/money" ? "Expenses and pay sections" : `${heading} sections` });
      await expect(tabs).toBeVisible();
      if (path === "/me/workday") {
        await expect(tabs.getByRole("link", { name: "Today" })).toBeVisible();
        await expect(tabs.getByRole("link", { name: "History" })).toBeVisible();
        await expect(tabs.getByRole("link", { name: "WFH" })).toBeVisible();
      }
      const sectionLink = tabs.getByRole("link", { name: section });
      await expect(sectionLink).toBeVisible();
      if (path === "/me/money") {
        await page.evaluate(() => { document.documentElement.dataset.moneyHubMarker = "mounted"; });
        await expect(page.getByText("No expenses found")).toBeVisible();
        await page.getByRole("button", { name: "Submit New Claim" }).click();
        await expect(page.getByRole("dialog", { name: "New Expense Claim" })).toBeVisible();
        await page.getByRole("dialog", { name: "New Expense Claim" }).press("Escape");
      }
      await sectionLink.click();
      await expect(page).toHaveURL(new RegExp(query), { timeout: 60_000 });
      await expect(tabs.getByRole("link", { name: section })).toHaveAttribute("aria-current", "page");
      if (path === "/me/money") {
        expect(await page.evaluate(() => document.documentElement.dataset.moneyHubMarker)).toBe("mounted");
        await expect(tabs.getByRole("link", { name: "Claims" })).toBeVisible();
        await expect(tabs.getByRole("tablist")).toHaveCount(0);
        await tabs.getByRole("link", { name: "Form 16" }).click();
        await expect(page).toHaveURL(/section=pay&tab=form16/);
        await expect(tabs.getByRole("link", { name: "Form 16" })).toHaveAttribute("aria-current", "page");
      }
      if (path === "/me/workday") {
        await expect(page.getByRole("button", { name: "Request leave" })).toBeVisible();
        await tabs.getByRole("link", { name: "WFH" }).click();
        await expect(page).toHaveURL(/section=time-off&tab=wfh/);
        await expect(tabs.getByRole("link", { name: "WFH" })).toHaveAttribute("aria-current", "page");
        await expect(page.getByRole("button", { name: "Request WFH" })).toBeVisible();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`${path.slice(4)}-${viewport.width}.png`) });
    });
  }
}

for (const viewport of VIEWPORTS) {
  test(`Calendar approvals use the existing modes at ${viewport.width}px`, async ({ context, page, baseURL }) => {
    test.setTimeout(240_000);
    await signIn(context, baseURL as string);
    await installBrowserFixtures(page);
    await page.setViewportSize(viewport);
    await page.goto("/calendar?section=approvals", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Resource approvals/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tablist", { name: "Calendar modes" }).getByRole("tab", { name: "Resource approvals" })).toHaveAttribute("data-state", "active");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
