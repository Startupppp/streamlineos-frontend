import { expect, test as base, type Page, type TestDetails } from "@playwright/test";
import { apiOracle, type ApiOracle } from "./fixtures/api-oracle";
import {
  claimedPutawayTask,
  type ClaimedPutawayTask,
} from "./fixtures/documents-operations";
import {
  postedReceipt,
  seedTarget,
  sentPurchaseOrder,
} from "./fixtures/documents-receiving";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

/**
 * INV-20 — the RF surface on the device it is actually used on.
 *
 * 375px is the ticket's subject, not a detail of it, so it is set explicitly
 * rather than inherited from whatever the runner defaults to.
 *
 * This deliberately does not repeat what `rf-surface.test.ts` and
 * `rf-surface-render.test.tsx` already assert in jsdom — that the RF screens
 * render no data table, that a task runner scans before it confirms, that
 * denied and offline are distinct answers. jsdom has no layout: it computes no
 * geometry, so it cannot see an element wider than the viewport, a tap target
 * too small for a thumb, or a floating panel landing on top of the task number.
 * Those are the failures that actually strand an operator holding a scanner,
 * and they are what this file measures.
 */

/** iPhone-class portrait width the ticket names. */
const RF_VIEWPORT = { width: 375, height: 812 };

/**
 * Every geometric assertion below is only meaningful if the RF surface is the
 * thing on screen. It is not enough that SOMETHING rendered.
 *
 * Two other pages answer on these routes and both carry an `h1` that fits
 * inside 375px: the module/permission wall ("You don't have access to this
 * screen") and the queue's own failure card ("Could not load your tasks",
 * rendered inside the RF shell, so even the status badge is present). An early
 * draft of this file passed its overflow, tap-target and overlap checks against
 * the access-denied page and reported RF as covered.
 *
 * So each state is named and failed on explicitly. A spec that cannot tell the
 * screen under test from an error card is not testing the screen.
 */
async function expectRfSurface(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await expect(
    page.getByText(/don't have access to this screen/i),
    "rendered the permission/module wall instead of the RF surface",
  ).toHaveCount(0);

  await expect(
    page.getByText(/Could not load your tasks/i),
    "the RF queue failed to load, so nothing below is measuring the RF surface",
  ).toHaveCount(0);
}

/**
 * The queue with its data in, not the skeleton that precedes it.
 *
 * `RfShell` is given a subtitle ONLY on the loaded branch — the loading, error
 * and denied branches all pass a bare title — so "N waiting" is proof the three
 * queries resolved and the list has rendered whatever it is going to render.
 *
 * This is not a nicety. Counting list items before that point returns 0 for a
 * queue that has work, and the count-then-branch below would then wait for an
 * empty state that is never coming; that is exactly how this file failed the
 * first time the tenant had tasks in it.
 */
async function expectRfQueueLoaded(page: Page): Promise<void> {
  await expectRfSurface(page);
  await expect(
    page.getByText(/^\d+ waiting$/),
    "the RF queue never left its loading state",
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * WCAG 2.5.5 asks for 44x44 CSS px. A control an operator misses while wearing
 * a glove costs a rescan, so this is a usability floor rather than a checkbox.
 */
const MIN_TAP_TARGET = 44;

const RF_ROUTES = ["/inventory/rf", "/inventory/rf/putaway", "/inventory/rf/pick"] as const;

/** Units on the seeded receipt. Small enough to fit any bin with headroom. */
const SEED_QTY = 4;

/**
 * The oracle, the seeded task and the session, as fixtures rather than as hooks.
 *
 * `api` is worker-scoped, so one authenticated API context is built per worker
 * and disposed when that worker ends. `task` carries its own budget: the seed is
 * a chain of backend commands, and this machine runs several backends against
 * one shared remote cache — a single list read here has been measured at ten
 * seconds, which is more than a test's default budget is sized for.
 *
 * `auto`, because the queue is measured with work in it: an empty queue
 * exercises one branch of one component, and the geometry that stranded an
 * operator is the geometry of a task ROW. Every test in this file therefore
 * waits for the task, not only the one that opens it. It is built through the
 * backend's own commands — purchase order, receipt, putaway, claim — so the row
 * on screen is a document the application produced rather than a fixture's idea
 * of one.
 */
const test = base.extend<{ signedIn: void }, { api: ApiOracle; task: ClaimedPutawayTask }>({
  api: [
    async ({}, use) => {
      const api = await apiOracle();
      await use(api);
      await api.dispose();
    },
    { scope: "worker" },
  ],
  task: [
    async ({ api }, use) => {
      const target = await seedTarget(api, SEED_QTY);
      const po = await sentPurchaseOrder(api, target, SEED_QTY, "INV-20 RF queue");
      const receipt = await postedReceipt(api, po, target, SEED_QTY);
      await use(await claimedPutawayTask(api, receipt.grnId));
    },
    { scope: "worker", auto: true, timeout: 300_000 },
  ],
  signedIn: [
    async ({ context, baseURL }, use) => {
      if (!baseURL)
        throw new Error(
          "No baseURL. The session cookie is scoped to its hostname, so it cannot be minted without one.",
        );
      await signIn(context, tenantEnv().user, baseURL);
      await use();
    },
    { auto: true },
  ],
});

/**
 * Runtime-selected, because whether this suite can run is a property of the
 * environment rather than of the code: with no seeded tenant there is nothing
 * for it to assert against. The reason rides along as an annotation so a skipped
 * run still says which variables are missing.
 */
const HAS_TENANT = hasTenantEnv();

const describeWithTenant: (title: string, details: TestDetails, callback: () => void) => void =
  HAS_TENANT ? test.describe : test.describe.skip;

const TENANT_DETAILS: TestDetails = HAS_TENANT
  ? {}
  : { annotation: { type: "skip", description: SKIP_REASON } };

test.use({ viewport: RF_VIEWPORT });

describeWithTenant("inventory · RF at 375", TENANT_DETAILS, () => {
  test("the viewport under test really is 375 wide", async ({ page }) => {
    // Anti-vacuity. Every geometric assertion below is only meaningful at this
    // width, and a `test.use` that silently stopped applying would turn the
    // whole file into a desktop suite that passes for the wrong reason.
    await page.goto("/inventory/rf");
    expect(page.viewportSize()?.width).toBe(375);
    expect(await page.evaluate(() => window.innerWidth)).toBe(375);
  });

  for (const route of RF_ROUTES) {
    test(`${route} fits the screen with nothing spilling sideways`, async ({ page }) => {
      await page.goto(route);
      await expectRfSurface(page);

      // A horizontal scrollbar on a scanner is not a cosmetic problem: the
      // operator holds the device one-handed and never finds the content that
      // went off the right edge.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${route} scrolls horizontally at 375px (${overflow.scrollWidth} > ${overflow.clientWidth})`,
      ).toBeLessThanOrEqual(overflow.clientWidth);

      // And no individual element wider than the viewport, which is the same
      // bug one level down: a page can avoid document overflow by clipping a
      // child that is still unreachable.
      const wide = await widestOffenders(page, overflow.clientWidth);
      expect(wide, `elements wider than the viewport on ${route}`).toEqual([]);
    });
  }

  test("the onboarding panel does not land on top of the task heading", async ({ page }) => {
    await page.goto("/inventory/rf");
    await expectRfSurface(page);

    const heading = page.getByRole("heading", { level: 1 });

    // The RF layout hides `#mobile-header-checklist-slot` because
    // `SuccessChecklist` portals into it and, measured at 375, the expanded
    // panel occupied y 52-272 while the task heading sat at y 68-88 — covering
    // the task number and the back control.
    //
    // `rf-chromeless.test.ts` already asserts the two files still agree on the
    // id, and says why: the workaround's failure mode is silence. What it
    // cannot check is whether the suppression WORKS — a rule that parses but
    // loses to a later selector, or a portal that starts rendering somewhere
    // else, leaves that test green and the operator's screen covered. This
    // measures the rendered result instead.
    const slot = page.locator("#mobile-header-checklist-slot");

    // Waiting for the portal's CONTENT, not for the slot, and that is the whole
    // difference between this assertion and a vacuous one. The slot is in the
    // header markup from the first paint; `SuccessChecklist` portals into it a
    // beat later. `not.toBeVisible()` is satisfied the instant it is called
    // against an empty slot, so an earlier draft of this test passed with the
    // suppression rule deleted and the trigger plainly on screen.
    //
    // Requiring the child to exist also catches the workaround's real failure
    // mode, which `rf-chromeless.test.ts` can only catch at the string level: a
    // rule targeting an id nothing renders any more hides nothing, in silence.
    await expect(
      slot.locator("> *").first(),
      "nothing ever portalled into the onboarding slot, so this assertion proves nothing — " +
        "either the checklist stopped rendering or it moved, and the RF layout's rule now hides nothing",
    ).toBeAttached({ timeout: 20_000 });

    // Measured with the rule removed: the collapsed trigger sits at x 295, y 12,
    // 32x32. It is small, and that is exactly why hiding it matters — tapping it
    // expands a panel over y 52-272, and the heading below sits at y 68.
    await expect(
      slot,
      "the onboarding portal is visible on the RF surface; tapping it expands a panel over the task heading",
    ).not.toBeVisible();

    // The heading is the thing being protected, so it is checked directly: on
    // screen, inside the viewport, and with nothing painted over its centre.
    const box = await heading.boundingBox();
    expect(box, "the RF heading has no layout box at all").toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(RF_VIEWPORT.width);

    const covered = await page.evaluate(
      ({ x, y }) => {
        const top = document.elementFromPoint(x, y);
        const h1 = document.querySelector("h1");
        return top && h1 ? !h1.contains(top) && top !== h1 : false;
      },
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
    );
    expect(covered, "something is painted over the centre of the RF heading").toBe(false);
  });

  test("every tap target on the queue is big enough for a thumb", async ({ page }) => {
    await page.goto("/inventory/rf");
    // Loaded, not merely rendered: skeletons have no controls, so measuring
    // them finds no offenders and reports a pass over an empty measurement.
    await expectRfQueueLoaded(page);

    const small = await page.evaluate((min) => {
      const offenders: string[] = [];
      const controls = document.querySelectorAll<HTMLElement>(
        "main a[href], main button, [data-slot='sheet-body'] a[href]",
      );
      for (const el of controls) {
        const rect = el.getBoundingClientRect();
        // Zero-sized elements are hidden, not small; measuring them would
        // report every collapsed menu as a usability defect.
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.height < min)
          offenders.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" h=${Math.round(rect.height)}`);
      }
      return offenders;
    }, MIN_TAP_TARGET);

    expect(small, `controls shorter than ${MIN_TAP_TARGET}px on the RF queue`).toEqual([]);
  });

  test("the queue answers with work or with an empty state, never a desktop table", async ({
    page,
  }) => {
    await page.goto("/inventory/rf");
    await expectRfQueueLoaded(page);

    // The desktop lists are a different audience's screen. This is the rendered
    // counterpart of the source-level rule in `rf-surface.test.ts`: a table
    // introduced by a shared component rather than by the RF source would pass
    // that one and fail here.
    await expect(page.getByRole("table")).toHaveCount(0);

    const tasks = page.getByRole("listitem");
    const emptyState = page.getByText(/Nothing assigned to you/i);

    // One or the other, and never neither — a queue that renders no rows AND no
    // empty state is a blank screen an operator cannot act on or report.
    //
    // The count is read only after the queue has said how many it has, so the
    // branch is decided on the rendered answer rather than on a race.
    const taskCount = await tasks.count();
    if (taskCount === 0) await expect(emptyState).toBeVisible();
    else await expect(tasks.first().getByRole("link")).toHaveAttribute("href", /\S/);
  });

  /**
   * The queue is a way IN to the work, not a list of it. This walks that step
   * and nothing else: the seeded task is found on the queue by its own task
   * number, tapped, and the runner it lands on is checked for being a runner.
   *
   * Addressed by task number rather than as "the first row", which is the
   * assertion that passes on somebody else's task. This tenant is shared, other
   * suites raise waves and putaways in it, and a spec that taps whatever is on
   * top proves only that SOME row navigates somewhere.
   *
   * The flows those runners drive — put away, pick — are walked to their ledger
   * consequences in `inventory-rf-walks.spec.ts`.
   */
  test("an assigned task opens its own single-column runner", async ({ page, task }) => {
    await page.goto("/inventory/rf");
    await expectRfQueueLoaded(page);

    const row = page.getByRole("listitem").filter({ hasText: task.taskNumber });
    await expect(
      row,
      `the seeded putaway task ${task.taskNumber} is not in this operator's RF queue`,
    ).toHaveCount(1);

    const link = row.getByRole("link");
    await expect(link).toHaveAttribute("href", `/inventory/rf/putaway/${task.taskId}`);
    await link.click();

    await expect(page).toHaveURL(new RegExp(`/inventory/rf/putaway/${task.taskId}$`));

    // The runner is one screen for one thumb: the task's own number as the
    // heading — not a generic "Put away", which is what the loading, denied and
    // error branches render, so this also proves the task itself loaded — a way
    // back, and no sideways scroll.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(task.taskNumber);
    await expect(page.getByLabel("Back to tasks")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});

/** Elements laid out wider than the viewport, named well enough to find. */
async function widestOffenders(page: Page, clientWidth: number): Promise<string[]> {
  return page.evaluate((limit) => {
    const offenders: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;

      // Only elements that START on screen. A drawer parked off-canvas at
      // translateX(-100%) is correctly positioned, not overflowing, and
      // counting it reports every closed mobile menu as a defect.
      if (rect.left < 0 || rect.left > limit) continue;

      if (rect.right > limit + 1) {
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string"
          ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")}`
          : "";
        offenders.push(`${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(rect.right)}`);
      }
    }
    // Deepest offender is usually the cause; its ancestors merely inherit it.
    return offenders.slice(-5);
  }, clientWidth);
}
