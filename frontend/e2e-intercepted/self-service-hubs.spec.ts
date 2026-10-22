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

for (const viewport of VIEWPORTS) {
  test(`merged self-service navigation fits ${viewport.width}px`, async ({ context, page, baseURL }, testInfo) => {
    test.setTimeout(600_000);
    await signIn(context, baseURL as string);
    const serverSession = await context.request.get(`${baseURL}/api/auth/session`);
    expect(await serverSession.json()).toMatchObject({
      orgId: "self-service-org",
      user: { id: "self-service-user" },
    });
    await installBrowserFixtures(page);
    await page.setViewportSize(viewport);

    for (const [path, heading, section] of [
      ["/me/workday", "Attendance & Time Off", "Time off"],
      ["/me/records", "Documents & Onboarding", "Onboarding"],
      ["/me/money", "Expenses & Pay", "Pay"],
      ["/me/career", "Hiring & Referrals", "Job openings"],
    ] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 60_000 });
      const tabs = page.getByRole("navigation", { name: `${heading} sections` });
      await expect(tabs).toBeVisible();
      if (path === "/me/workday") {
        await expect(tabs.getByRole("link", { name: "Today" })).toBeVisible();
        await expect(tabs.getByRole("link", { name: "History" })).toBeVisible();
      }
      const sectionLink = tabs.getByRole("link", { name: section });
      await expect(sectionLink).toBeVisible();
      await sectionLink.click();
      await expect(page).toHaveURL(/section=/, { timeout: 60_000 });
      await expect(page.getByRole("navigation", { name: `${heading} sections` }).getByRole("link", { name: section })).toHaveAttribute("aria-current", "page");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`${path.slice(4)}-${viewport.width}.png`) });
    }
  });
}
