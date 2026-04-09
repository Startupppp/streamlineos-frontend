import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Loading skeleton screenshot suite.
 *
 * For every authenticated route in the dashboard, this test:
 *   1. Throttles network responses for data calls (RSC, /api, tRPC) by ~3s,
 *      so that the route's `loading.tsx` skeleton is rendered long enough
 *      to be visible.
 *   2. Navigates to the route, waits only for the document `commit` event
 *      (so the navigation is past the request stage but the data hasn't
 *      arrived yet).
 *   3. Captures a full-page screenshot to `tests/e2e/loading-screenshots/`.
 *
 * Run after starting the dev server in another terminal:
 *   pnpm test:loading
 *
 * The setup project (auth.setup.ts) must run first to produce
 * fixtures/.auth/user.json. Playwright handles this via the `dependencies`
 * field in playwright.config.ts.
 */

const SCREENSHOT_DIR = path.join(__dirname, "loading-screenshots");

const STORAGE_STATE = path.join(__dirname, "fixtures", ".auth", "user.json");

// Some routes require dynamic IDs. We pick a placeholder; if the slug doesn't
// resolve to a real entity the page may render an empty / 404 state, but the
// loading.tsx will still be rendered first.
const SAMPLE_PROJECT_ID = process.env.E2E_PROJECT_ID ?? "1";
const SAMPLE_LEAD_ID = process.env.E2E_LEAD_ID ?? "1";
const SAMPLE_DEAL_ID = process.env.E2E_DEAL_ID ?? "1";
const SAMPLE_CLIENT_ID = process.env.E2E_CLIENT_ID ?? "1";
const SAMPLE_INVOICE_ID = process.env.E2E_INVOICE_ID ?? "1";
const SAMPLE_EMPLOYEE_ID = process.env.E2E_EMPLOYEE_ID ?? "1";
const SAMPLE_CANDIDATE_ID = process.env.E2E_CANDIDATE_ID ?? "1";
const SAMPLE_DOC_ID = process.env.E2E_DOC_ID ?? "1";
const SAMPLE_SLUG = process.env.E2E_SLUG ?? "1";

const ROUTES: string[] = [
  // Core
  "/dashboard",
  "/calendar",
  "/chat",
  "/ceo/qr-code",
  "/notifications",
  "/onboarding",

  // HR
  "/hr",
  "/hr/alumni",
  "/hr/analytics",
  "/hr/assessments",
  "/hr/asset-returns",
  "/hr/assets",
  "/hr/attendance",
  "/hr/background-verification",
  "/hr/bonuses",
  "/hr/career-ladders",
  "/hr/certifications",
  "/hr/compliance",
  "/hr/devices",
  "/hr/documents",
  `/hr/documents/editor/${SAMPLE_DOC_ID}`,
  "/hr/documents/editor/new",
  "/hr/email-templates",
  "/hr/employees",
  `/hr/employees/${SAMPLE_EMPLOYEE_ID}`,
  "/hr/employees/new",
  "/hr/enps",
  "/hr/exit",
  "/hr/expenses",
  "/hr/fnf",
  "/hr/handbook",
  "/hr/helpdesk",
  "/hr/incentives",
  "/hr/learning-paths",
  "/hr/leaves",
  "/hr/loans",
  "/hr/my-payslips",
  "/hr/onboarding",
  "/hr/org-chart",
  "/hr/payroll",
  "/hr/performance",
  "/hr/recognition",
  "/hr/recruitment",
  "/hr/recruitment/candidates",
  `/hr/recruitment/candidates/${SAMPLE_CANDIDATE_ID}`,
  "/hr/recruitment/interviews",
  "/hr/recruitment/jobs",
  "/hr/recruitment/pipeline",
  "/hr/reimbursements",
  "/hr/skills",
  "/hr/surveys",
  "/hr/team-events",
  "/hr/training",
  "/hr/work-logs",

  // CRM
  "/crm",
  "/crm/analytics",
  "/crm/clients",
  `/crm/clients/${SAMPLE_CLIENT_ID}`,
  "/crm/contacts",
  "/crm/deals",
  `/crm/deals/${SAMPLE_DEAL_ID}`,
  "/crm/deals/approvals",
  "/crm/leads",
  `/crm/leads/${SAMPLE_LEAD_ID}`,
  "/crm/leads/distribute",
  "/crm/organizations",
  "/crm/reports",
  "/crm/settings/assignment-rules",
  "/crm/settings/email-templates",
  "/crm/settings/scoring-rules",
  "/crm/settings/sla",
  "/crm/targets",

  // Sales / Customer
  "/sales",
  "/sales/commissions",
  "/sales/quotas",
  `/sales/person/${SAMPLE_SLUG}`,
  "/customer-executive",

  // Marketing
  "/marketing",
  "/marketing/campaigns",
  "/marketing/email-campaigns",
  "/digital-marketing",
  "/digital-marketing/campaigns",
  "/digital-marketing/leads",
  "/digital-marketing/social",

  // Projects
  "/projects",
  `/projects/${SAMPLE_PROJECT_ID}`,
  `/projects/${SAMPLE_PROJECT_ID}/analytics`,
  `/projects/${SAMPLE_PROJECT_ID}/backlog`,
  `/projects/${SAMPLE_PROJECT_ID}/cycles`,
  `/projects/${SAMPLE_PROJECT_ID}/epics`,
  `/projects/${SAMPLE_PROJECT_ID}/intake`,
  `/projects/${SAMPLE_PROJECT_ID}/modules`,
  `/projects/${SAMPLE_PROJECT_ID}/my-tickets`,
  `/projects/${SAMPLE_PROJECT_ID}/pages`,
  `/projects/${SAMPLE_PROJECT_ID}/settings`,
  `/projects/${SAMPLE_PROJECT_ID}/sprints`,
  `/projects/${SAMPLE_PROJECT_ID}/timeline`,
  `/projects/${SAMPLE_PROJECT_ID}/views`,

  // Billing / Timesheets / Reports
  "/billing",
  "/billing/invoices",
  `/billing/invoices/${SAMPLE_INVOICE_ID}`,
  "/billing/invoices/new",
  "/timesheets",
  "/timesheets/team",
  "/reports",

  // Settings / Support
  "/settings",
  "/settings/audit-log",
  "/settings/branches",
  "/settings/members",
  "/settings/organization",
  "/settings/roles",
  "/support",
  "/support/inbox",
];

test.use({ storageState: STORAGE_STATE });

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

/**
 * Slow down all data-fetching responses so the loading.tsx skeleton has
 * time to render and be captured.
 */
async function slowDataFetches(page: import("@playwright/test").Page) {
  await page.route(
    (url) => {
      const u = url.toString();
      // Slow down RSC payloads, API routes, and tRPC calls.
      // Leave JS / CSS / fonts / images alone so the page itself loads fast.
      return (
        u.includes("/api/") ||
        u.includes("/trpc/") ||
        u.includes("?_rsc=") ||
        u.includes("&_rsc=")
      );
    },
    async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    },
  );
}

function safeName(route: string): string {
  return (
    route
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .replace(/\//g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "-") || "root"
  );
}

for (const route of ROUTES) {
  test(`loading skeleton — ${route}`, async ({ page }) => {
    await slowDataFetches(page);

    const filename = `${safeName(route)}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    // `commit` waits only until the navigation is committed, before the
    // server has streamed the full RSC payload — perfect for capturing
    // the loading.tsx fallback.
    await page.goto(route, { waitUntil: "commit", timeout: 15_000 }).catch(() => {
      // Some routes redirect (e.g. permission gates) — don't fail the suite,
      // just take whatever's on screen.
    });

    // Give React a beat to render the loading.tsx fallback.
    await page.waitForTimeout(400);

    await page.screenshot({ path: filepath, fullPage: true });

    // Soft assertion: file exists and is non-trivial in size.
    const stat = fs.statSync(filepath);
    expect(stat.size).toBeGreaterThan(1024);
  });
}
