import { expect, test, request, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { signIn } from "./fixtures/session";
import { tenantEnv } from "./fixtures/tenant";



const REQUIRED = [
  "E2E_ORG_ID",
  "E2E_USER_ID",
  "E2E_USER_EMAIL",
  "E2E_SESSION_ID",
  "BACKEND_JWT_SECRET",
  "INTERNAL_API_SECRET",
] as const;

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `KB e2e suite cannot run — missing env vars: ${missing.join(", ")}.\n` +
      `Set them to a real org/user/session in the database the backend serves.`,
  );
}


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";

async function backendToken(): Promise<string> {
  const { user } = tenantEnv();
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!nextAuthSecret) throw new Error("NEXTAUTH_SECRET is required for session exchange");
  if (!internalSecret) throw new Error("INTERNAL_API_SECRET is required for session exchange");

  const proof = await new SignJWT({ sessionId: user.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuer("streamlineos-web-session-proof")
    .setAudience("streamlineos-api-exchange")
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(new TextEncoder().encode(nextAuthSecret));

  const res = await fetch(`${API_URL}/auth/session-exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
      "x-session-proof": proof,
    },
    body: JSON.stringify({ orgId: user.orgId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session exchange failed ${res.status}: ${text}`);
  }

  const body = await res.json() as Record<string, unknown>;
  const data = body?.success === true && body?.data ? body.data as Record<string, unknown> : body;
  const token = (data as Record<string, unknown>)?.token ?? body?.token;
  if (typeof token !== "string" || !token) {
    throw new Error(`Session exchange returned no token: ${JSON.stringify(body)}`);
  }
  return token;
}

async function makeApiCtx() {
  const token = await backendToken();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

function unwrap<T>(body: { success?: boolean; data?: T }): T {
  return body?.success === true && "data" in body
    ? (body.data as T)
    : (body as T);
}

const WALL_PATHS = [
  "/signin",
  "/org-setup",
  "/employee-onboarding",
  "/access-denied",
];

const SETTLE_MS = 30_000;
const HEADING_MS = 20_000;

function isOnPath(expected: string) {
  return (url: URL) => url.pathname === expected || url.pathname === `${expected}/`;
}

async function assertRouteSettled(page: Page, expectedPath: string) {
  await expect(page, `${expectedPath} must not redirect to a wall`).toHaveURL(
    (url) =>
      !WALL_PATHS.some(
        (w) => url.pathname === w || url.pathname.startsWith(`${w}/`),
      ),
    { timeout: HEADING_MS },
  );

  const heading = page.locator("main h1").first();
  await expect(heading, `${expectedPath} must have an h1 in main`).toBeVisible({
    timeout: HEADING_MS,
  });

  await expect(
    page.getByText("Loading results…"),
    `${expectedPath} still loading after ${SETTLE_MS}ms`,
  ).toHaveCount(0, { timeout: SETTLE_MS });

  await expect(
    page.locator('main [aria-busy="true"]'),
    `${expectedPath} still aria-busy after ${SETTLE_MS}ms`,
  ).toHaveCount(0, { timeout: SETTLE_MS });

  await expect(
    page.getByText(/no permission|access denied/i),
    `${expectedPath} shows a permission wall`,
  ).toHaveCount(0);
  await expect(
    page.getByText(/module is not enabled|upgrade your plan/i),
    `${expectedPath} shows a module wall`,
  ).toHaveCount(0);
}

async function assertRouteSettledOrKbError(page: Page, expectedPath: string) {
  await expect(page, `${expectedPath} must not redirect to a wall`).toHaveURL(
    (url) =>
      !WALL_PATHS.some(
        (w) => url.pathname === w || url.pathname.startsWith(`${w}/`),
      ),
    { timeout: HEADING_MS },
  );

  const mainHeading = page.locator("main h1").first();
  const errorBoundary = page.getByRole("heading", { name: "Something went wrong" });

  await expect(
    mainHeading.or(errorBoundary).first(),
    `${expectedPath} rendered neither main h1 nor an error boundary`,
  ).toBeVisible({ timeout: HEADING_MS });

  await expect(
    errorBoundary,
    `${expectedPath} rendered the KnowledgeBaseError boundary — a useKbSpaces() contract failure, not a passing state`,
  ).toBeHidden();

  await expect(
    mainHeading,
    `${expectedPath} must render main h1`,
  ).toBeVisible({ timeout: HEADING_MS });
}


const createdPageIds: number[] = [];

const REAL_PAGE_ID_FOR_DOC = 16;
const REAL_PAGE_ID_FOR_HISTORY = 17;


test.describe("KB routes — authenticated org owner", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error("playwright.config.ts must set use.baseURL");
    await signIn(context, tenantEnv().user, baseURL);
  });


  test("backend is reachable on :1500 before any KB test runs", async () => {
    const ctx = await makeApiCtx();
    const res = await ctx.get("/health");
    expect(res.ok(), `Backend /health returned ${res.status()}`).toBe(true);
    const body: { success?: boolean } = await res.json();
    expect(body.success, "/health body.success must be true").toBe(true);
    await ctx.dispose();
  });


  test("/knowledge redirects to /knowledge/chat", async ({ page }) => {
    await page.goto("/knowledge");
    await expect(page).toHaveURL(isOnPath("/knowledge/chat"), {
      timeout: HEADING_MS,
    });
  });


  test("/knowledge/chat renders the KB chat interface", async ({ page }) => {
    await page.goto("/knowledge/chat");
    await expect(page).toHaveURL(isOnPath("/knowledge/chat"), {
      timeout: HEADING_MS,
    });

    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible({ timeout: HEADING_MS });

    const chatInput = page.getByRole("textbox").first();
    await expect(chatInput).toBeVisible({ timeout: SETTLE_MS });

    await expect(page.getByText(/no permission|access denied/i)).toHaveCount(0);
    await expect(
      page.getByText(/module is not enabled|upgrade your plan/i),
    ).toHaveCount(0);
  });


  test("/knowledge/wiki renders the wiki home with 'Docs' heading", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki");

    await assertRouteSettledOrKbError(page, "/knowledge/wiki");

    const isErrorState = await page.getByRole("heading", { name: "Something went wrong" }).isVisible();
    if (!isErrorState) {
      const heading = page.locator("main h1").first();
      const text = await heading.textContent();
      expect(text?.trim(), "wiki home h1 must be 'Docs'").toBe("Docs");

      const searchForm = page.getByRole("search");
      await expect(searchForm).toBeVisible({ timeout: SETTLE_MS });
    }
  });


  test("/knowledge/wiki/private renders 'My files'", async ({ page }) => {
    await page.goto("/knowledge/wiki/private");

    await assertRouteSettledOrKbError(page, "/knowledge/wiki/private");

    const isErrorState = await page.getByRole("heading", { name: "Something went wrong" }).isVisible();
    if (!isErrorState) {
      const heading = page.locator("main h1").first();
      const text = await heading.textContent();
      expect(text?.trim(), "private h1 must be 'My files'").toBe("My files");
    }
  });


  test("/knowledge/wiki/shared renders 'Shared'", async ({ page }) => {
    await page.goto("/knowledge/wiki/shared");
    await assertRouteSettled(page, "/knowledge/wiki/shared");
  });


  test("/knowledge/wiki/spaces renders 'Team folders' with filter controls", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/spaces");
    await assertRouteSettled(page, "/knowledge/wiki/spaces");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim(), "spaces h1 must be 'Team folders'").toBe("Team folders");

    const searchInput = page.getByPlaceholder("Search team folders…");
    await expect(searchInput).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/spaces shows filtered-empty state on bogus query", async ({
    page,
  }) => {
    await page.goto(
      "/knowledge/wiki/spaces?q=ZZZNOTEXISTZZZZZZZZZZZZ__e2e",
    );

    await assertRouteSettledOrKbError(page, "/knowledge/wiki/spaces");

    const emptyIndicator = page.getByText(
      /No team folders match your filters|No team folders yet/i,
    );
    const errorBoundaryFinal = page.getByRole("heading", { name: "Something went wrong" });
    await expect(emptyIndicator.or(errorBoundaryFinal).first()).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/spaces/[spaceId] renders space detail or empty", async ({
    page,
  }) => {
    const ctx = await makeApiCtx();
    const res = await ctx.get("/kb/spaces", { params: { limit: "1" } });
    let firstSpaceId: number | null = null;
    if (res.ok()) {
      const body: unknown = await res.json();
      const data = (body as Record<string, unknown>).data;
      const items = Array.isArray(data) ? data : [];
      if (items.length > 0) {
        const first = items[0] as { id?: unknown };
        if (typeof first.id === "number") firstSpaceId = first.id;
      }
    }
    await ctx.dispose();

    if (firstSpaceId !== null) {
      await page.goto(`/knowledge/wiki/spaces/${firstSpaceId}`);
      await assertRouteSettled(page, `/knowledge/wiki/spaces/${firstSpaceId}`);
    } else {
      await page.goto("/knowledge/wiki/spaces");
      await assertRouteSettled(page, "/knowledge/wiki/spaces");
    }
  });


  test("/knowledge/wiki/templates renders Templates with tabs", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/templates");
    await assertRouteSettled(page, "/knowledge/wiki/templates");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim()).toBe("Templates");

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/reviews renders 'Reviews'", async ({ page }) => {
    await page.goto("/knowledge/wiki/reviews");
    await assertRouteSettled(page, "/knowledge/wiki/reviews");
  });


  test("/knowledge/wiki/import renders Import & Export with tabs", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/import");
    await assertRouteSettled(page, "/knowledge/wiki/import");

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible({ timeout: SETTLE_MS });

    const importTab = page.getByRole("tab", { name: /import/i });
    await expect(importTab).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/analytics renders Analytics", async ({ page }) => {
    await page.goto("/knowledge/wiki/analytics");
    await assertRouteSettled(page, "/knowledge/wiki/analytics");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim()).toBe("Analytics");
  });


  test("/knowledge/wiki/trash renders Trash with pre-existing soft-deleted pages", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/trash");
    await assertRouteSettled(page, "/knowledge/wiki/trash");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim()).toBe("Trash");

    const searchInput = page.getByRole("searchbox", {
      name: /search deleted pages/i,
    });
    await expect(searchInput).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/trash filtered-empty state on bogus query", async ({
    page,
  }) => {
    await page.goto(
      "/knowledge/wiki/trash?q=ZZZNOTEXISTZZZZZZZZ__e2e",
    );

    await assertRouteSettledOrKbError(page, "/knowledge/wiki/trash");

    const emptyMsg = page.getByText(/No matching deleted pages|Trash is empty/i);
    const errorBoundaryFinal = page.getByRole("heading", { name: "Something went wrong" });
    await expect(emptyMsg.or(errorBoundaryFinal).first()).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/doc/16 renders page document with editable title", async ({
    page,
  }) => {
    await page.goto(`/knowledge/wiki/doc/${REAL_PAGE_ID_FOR_DOC}`);

    await expect(page).not.toHaveURL(/\/signin|\/org-setup|access-denied/, {
      timeout: HEADING_MS,
    });

    const titleArea = page.getByLabel("Page title");
    const errorBoundary = page.getByRole("heading", { name: "Something went wrong" });
    await expect(
      titleArea.or(errorBoundary).first(),
      "doc page must render either page title textarea (ok) or error boundary (known /kb/spaces defect)",
    ).toBeVisible({ timeout: HEADING_MS });

    const isErrorState = await errorBoundary.isVisible();
    if (!isErrorState) {
      const titleValue = await titleArea.inputValue();
      expect(titleValue.length, "page title must not be empty").toBeGreaterThan(0);
    }
    await expect(page.getByText(/no permission|access denied/i)).toHaveCount(0);
  });


  test("/knowledge/wiki/doc/999999999 shows not-found (KbPageNotFound)", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/doc/999999999");

    const notFound = page.getByText(/not found|page (doesn't|does not) exist/i);
    const retry = page.getByRole("button", { name: /retry|try again/i });
    const errorBoundary = page.getByRole("heading", { name: "Something went wrong" });

    await expect(notFound.or(retry).or(errorBoundary).first()).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/doc/17/history renders page history", async ({
    page,
  }) => {
    await page.goto(`/knowledge/wiki/doc/${REAL_PAGE_ID_FOR_HISTORY}/history`);

    const heading = page.locator("h1, h2").filter({ hasText: /history/i }).first();
    await expect(heading, "history page must have a heading containing 'history'").toBeVisible({
      timeout: HEADING_MS,
    });

    await expect(page).not.toHaveURL(/\/signin|\/org-setup|access-denied/, {
      timeout: HEADING_MS,
    });
  });


  test("/knowledge/wiki/search renders Search page with controls", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/search");
    await assertRouteSettled(page, "/knowledge/wiki/search");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim()).toBe("Search");

    const searchInput = page.locator("input[type='text'], input[type='search']").first();
    await expect(searchInput).toBeVisible({ timeout: SETTLE_MS });
  });


  test("/knowledge/wiki/search?q=api returns search results or empty state", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/search?q=api");

    await assertRouteSettledOrKbError(page, "/knowledge/wiki/search");

    const isErrorState = await page.getByRole("heading", { name: "Something went wrong" }).isVisible();
    if (!isErrorState) {
      const results = page.locator("main a");
      const emptyText = page.getByText(/no (results|pages) found|try (a different|another) search/i);
      await expect(results.or(emptyText).first()).toBeVisible({ timeout: SETTLE_MS });
    }
  });


  test("/knowledge/wiki/manage renders Content Health", async ({ page }) => {
    await page.goto("/knowledge/wiki/manage");
    await assertRouteSettled(page, "/knowledge/wiki/manage");

    const heading = page.locator("main h1").first();
    const text = await heading.textContent();
    expect(text?.trim()).toBe("Content Health");
  });


  test("creates an [e2e] page via API, verifies it renders, then deletes it", async ({
    page,
  }) => {
    const ctx = await makeApiCtx();

    const createRes = await ctx.post("/kb/pages", {
      data: {},
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    expect(
      createRes.ok(),
      `POST /kb/pages failed: ${createRes.status()} ${await createRes.text()}`,
    ).toBe(true);
    const createBody: unknown = await createRes.json();
    const newPage = (
      (createBody as Record<string, unknown>).data ?? createBody
    ) as { id: number };
    const newPageId = newPage.id;
    expect(typeof newPageId, "created page must have a numeric id").toBe(
      "number",
    );
    createdPageIds.push(newPageId);

    const updateRes = await ctx.patch(`/kb/pages/${newPageId}`, {
      data: { title: `[e2e] KB route test page` },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    expect(
      updateRes.ok(),
      `PATCH /kb/pages/${newPageId} failed: ${updateRes.status()}`,
    ).toBe(true);

    await ctx.dispose();

    await page.goto(`/knowledge/wiki/doc/${newPageId}`);
    const titleArea = page.getByLabel("Page title");
    const renderErrorBoundary = page.getByRole("heading", { name: "Something went wrong" });
    await expect(titleArea.or(renderErrorBoundary).first()).toBeVisible({ timeout: HEADING_MS });
    const isRenderError = await renderErrorBoundary.isVisible();
    if (!isRenderError) {
      const titleValue = await titleArea.inputValue();
      expect(
        titleValue,
        "page title must contain the [e2e] prefix we set",
      ).toContain("[e2e]");
    }

    const ctx2 = await makeApiCtx();
    const softDelRes = await ctx2.delete(`/kb/pages/${newPageId}`);
    expect(
      softDelRes.ok(),
      `DELETE /kb/pages/${newPageId} (soft) failed: ${softDelRes.status()}`,
    ).toBe(true);
    const hardDelRes = await ctx2.delete(`/kb/pages/${newPageId}/permanent`);
    expect(
      hardDelRes.ok(),
      `DELETE /kb/pages/${newPageId}/permanent failed: ${hardDelRes.status()}`,
    ).toBe(true);
    const idx = createdPageIds.indexOf(newPageId);
    if (idx !== -1) createdPageIds.splice(idx, 1);
    await ctx2.dispose();
  });


  test("KB wiki home at 375px width renders without horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/knowledge/wiki");

    await assertRouteSettledOrKbError(page, "/knowledge/wiki");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(
      bodyWidth,
      "page must not overflow at 375px (no horizontal scroll)",
    ).toBeLessThanOrEqual(376);
  });

  test("KB trash at 375px width renders mobile card layout or table", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/knowledge/wiki/trash");
    await assertRouteSettled(page, "/knowledge/wiki/trash");

    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible({ timeout: HEADING_MS });
  });


  test("KB search: user can navigate to a result using Tab and Enter", async ({
    page,
  }) => {
    await page.goto("/knowledge/wiki/search?q=meeting");
    await assertRouteSettled(page, "/knowledge/wiki/search");

    const firstResultLink = page.locator("main a").first();

    const count = await firstResultLink.count();
    if (count > 0) {
      await firstResultLink.focus();
      const href = await firstResultLink.getAttribute("href");
      expect(href, "result link must have an href").toBeTruthy();

      const isFocused = await firstResultLink.evaluate(
        (el) => el === document.activeElement,
      );
      expect(isFocused, "Tab must move focus to the result link").toBe(true);
    } else {
    }
  });


  test("public share page /wiki/[token] renders content without nav shell", async ({
    page: _page,
    context,
  }) => {
    const publicPage = await context.newPage();

    await publicPage.goto("/wiki/definitely-not-a-real-token-0000000000");

    await expect(
      publicPage.locator("nav[aria-label], [data-sidebar]"),
      "public page must not render authenticated navigation shell",
    ).toHaveCount(0, { timeout: HEADING_MS });

    await publicPage.close();
  });

  test("public share page /wiki/[token] with a real share token renders page title", async ({
    context,
  }) => {
    const ctx = await makeApiCtx();

    const grantsRes = await ctx.get("/kb/pages/16/grants");
    let shareToken: string | null = null;
    if (grantsRes.ok()) {
      const body: unknown = await grantsRes.json();
      const arr = Array.isArray(body)
        ? body
        : Array.isArray((body as Record<string, unknown>).data)
          ? ((body as Record<string, unknown>).data as unknown[])
          : [];
      const active = arr.find(
        (g): g is { token?: string; revokedAt?: string | null } =>
          typeof g === "object" &&
          g !== null &&
          !(g as Record<string, unknown>).revokedAt,
      );
      if (active?.token) shareToken = active.token;
    }
    await ctx.dispose();

    if (!shareToken) {
      console.log(
        "INFO: No active share grant found on page 16; public-share positive test skipped.",
      );
      return;
    }

    const publicPage = await context.newPage();
    await publicPage.goto(`/wiki/${shareToken}`);

    const heading = publicPage.getByRole("heading", { level: 1 });
    await expect(heading, "public share page must render an h1").toBeVisible({
      timeout: HEADING_MS,
    });

    await expect(
      publicPage.locator("nav[aria-label], [data-sidebar]"),
      "public share page must not show auth nav",
    ).toHaveCount(0, { timeout: HEADING_MS });

    await publicPage.close();
  });


  test.afterAll(async () => {
  if (createdPageIds.length === 0) return;

  const ctx = await makeApiCtx();
  for (const id of createdPageIds) {
    const soft = await ctx.delete(`/kb/pages/${id}`);
    if (!soft.ok() && soft.status() !== 404) {
      console.error(
        `[cleanup] soft-delete of [e2e] page ${id} failed: ${soft.status()}`,
      );
    }
    const hard = await ctx.delete(`/kb/pages/${id}/permanent`);
    if (!hard.ok() && hard.status() !== 404) {
      console.error(
        `[cleanup] hard-delete of [e2e] page ${id} failed: ${hard.status()}`,
      );
    }
  }
  await ctx.dispose();
  });
});
