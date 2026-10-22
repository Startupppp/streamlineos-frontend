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


const RF_VIEWPORT = { width: 375, height: 812 };

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

async function expectRfQueueLoaded(page: Page): Promise<void> {
  await expectRfSurface(page);
  await expect(
    page.getByText(/^\d+ waiting$/),
    "the RF queue never left its loading state",
  ).toBeVisible({ timeout: 30_000 });
}

const MIN_TAP_TARGET = 44;

const RF_ROUTES = ["/inventory/rf", "/inventory/rf/putaway", "/inventory/rf/pick"] as const;

const SEED_QTY = 4;

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

const HAS_TENANT = hasTenantEnv();

const describeWithTenant: (title: string, details: TestDetails, callback: () => void) => void =
  HAS_TENANT ? test.describe : test.describe.skip;

const TENANT_DETAILS: TestDetails = HAS_TENANT
  ? {}
  : { annotation: { type: "skip", description: SKIP_REASON } };

test.use({ viewport: RF_VIEWPORT });

describeWithTenant("inventory · RF at 375", TENANT_DETAILS, () => {
  test("the viewport under test really is 375 wide", async ({ page }) => {
    await page.goto("/inventory/rf");
    expect(page.viewportSize()?.width).toBe(375);
    expect(await page.evaluate(() => window.innerWidth)).toBe(375);
  });

  for (const route of RF_ROUTES) {
    test(`${route} fits the screen with nothing spilling sideways`, async ({ page }) => {
      await page.goto(route);
      await expectRfSurface(page);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${route} scrolls horizontally at 375px (${overflow.scrollWidth} > ${overflow.clientWidth})`,
      ).toBeLessThanOrEqual(overflow.clientWidth);

      const wide = await widestOffenders(page, overflow.clientWidth);
      expect(wide, `elements wider than the viewport on ${route}`).toEqual([]);
    });
  }

  test("the task heading stays clear of floating chrome", async ({ page }) => {
    await page.goto("/inventory/rf");
    await expectRfSurface(page);

    const heading = page.getByRole("heading", { level: 1 });

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
    await expectRfQueueLoaded(page);

    const small = await page.evaluate((min) => {
      const offenders: string[] = [];
      const controls = document.querySelectorAll<HTMLElement>(
        "main a[href], main button, [data-slot='sheet-body'] a[href]",
      );
      for (const el of controls) {
        const rect = el.getBoundingClientRect();
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

    await expect(page.getByRole("table")).toHaveCount(0);

    const tasks = page.getByRole("listitem");
    const emptyState = page.getByText(/Nothing assigned to you/i);

    const taskCount = await tasks.count();
    if (taskCount === 0) await expect(emptyState).toBeVisible();
    else await expect(tasks.first().getByRole("link")).toHaveAttribute("href", /\S/);
  });

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

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(task.taskNumber);
    await expect(page.getByLabel("Back to tasks")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});

async function widestOffenders(page: Page, clientWidth: number): Promise<string[]> {
  return page.evaluate((limit) => {
    const offenders: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;

      if (rect.left < 0 || rect.left > limit) continue;

      if (rect.right > limit + 1) {
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string"
          ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")}`
          : "";
        offenders.push(`${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(rect.right)}`);
      }
    }
    return offenders.slice(-5);
  }, clientWidth);
}
