import { expect, test } from "@playwright/test";

/**
 * The harness's own proof, and deliberately the unauthenticated part of it.
 *
 * Nothing here needs a session, a seeded database or a running backend, which
 * is what makes it a smoke suite: it fails when the app does not boot, when
 * hydration breaks, or when the route guard stops guarding — and for no other
 * reason. If this is red, every richer spec below it is reporting on a broken
 * server rather than on the feature it names.
 */
test.describe("smoke", () => {
  test("serves the sign-in page with a form that actually rendered", async ({
    page,
  }) => {
    const response = await page.goto("/signin");

    expect(response?.status()).toBe(200);

    // The heading and the control, not just a 200. A route that renders an
    // empty shell — a failed client chunk, a crashed provider — still answers
    // 200, and a title-only assertion calls that a pass.
    await expect(
      page.getByRole("heading", { name: "Sign in or create an account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("runs its client-side validation, which proves React hydrated", async ({
    page,
  }) => {
    await page.goto("/signin");

    // This is the assertion that separates "the server sent HTML" from "the app
    // is running". The message comes from a Zod resolver inside react-hook-form:
    // it exists nowhere in the server-rendered markup and can only appear if the
    // bundle loaded, hydrated and handled a real submit. A page that failed to
    // hydrate passes every static check above this one and fails here.
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Continue" }).click();

    // Addressed by id, not by `getByRole("alert")`. Next mounts a permanent
    // `#__next-route-announcer__` with `role="alert"` on every page, so the bare
    // role matches two elements and fails strict mode — which reads as "the
    // error never rendered" when in fact it rendered beside the announcer.
    const fieldError = page.locator("#email-error");
    await expect(fieldError).toHaveText("Please enter a valid email");

    // Still asserted, because a validation message the screen reader never
    // announces is only half-built.
    await expect(fieldError).toHaveRole("alert");
  });

  test("sends an unauthenticated visitor from an inventory route to sign-in, keeping the destination", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    await expect(page).toHaveURL(/\/signin\?/);

    // `callbackUrl` is the half worth asserting. A redirect that drops it still
    // lands the user on a sign-in page and then strands them on the dashboard
    // instead of the page they asked for — which reads to an operator as a
    // broken link rather than as a bug in the guard.
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(
      "/inventory/stock",
    );
  });

  test("does not leak an inventory page's content while redirecting", async ({
    page,
  }) => {
    // A client-side-only guard renders the page first and redirects after, so
    // the tenant's stock is briefly on screen and fully present in the HTML.
    // This asserts the guard sits upstream of the render.
    const response = await page.goto("/inventory/rf");

    expect(response?.url()).toContain("/signin");
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
