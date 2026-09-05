import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { axeViolationIds, expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * T18 — inventory's accessibility and success states, proved by rendering.
 *
 * `inventory-route-states.test.ts` beside this file reads source and asks each
 * of the 85 routes whether it *has* a loading, empty, error and denied answer.
 * That is a floor and it says so: a marker is not a rendered screen, and no
 * amount of source reading can tell a labelled control from an unlabelled one.
 * Until this file existed, `frontend/test-utils/axe.ts` had eleven users and not
 * one of them was inventory — a module with 86 routes and zero accessibility
 * assertions, in a repo where the harness was already wired.
 *
 * So this mounts inventory surfaces and asks the DOM. Every mount runs
 * `expectNoAxeViolations`, which is the same `configureAxe` instance the other
 * eleven suites use, at 1280px and at 375px.
 *
 * ## What it covers
 *
 * Six route surfaces — the module landing page and the five RF screens — plus
 * five shared surfaces every one of the 85 routes renders: the two error
 * boundaries T07 added, the empty state, the list skeleton and the detail
 * skeleton. The two lists below are read back by
 * `inventory-route-states.test.ts`, which holds the count against a floor and
 * fails if an entry names a route or a file that no longer exists. Deleting this
 * file fails that suite.
 *
 * ## What it deliberately does not claim
 *
 * **Not "inventory is accessible".** Eleven surfaces out of 86 routes is a
 * beginning, and axe itself finds roughly a third of what a manual audit finds:
 * it cannot judge whether a label reads sensibly, whether focus order matches
 * the visual order, or whether an error message tells somebody what to do.
 * Nothing here is a screen-reader run.
 *
 * **Not "it fits on a phone".** jsdom has no layout, so no width, overlap or
 * reflow is measured anywhere in this file, and a green tick would make that
 * claim convincing while it stayed untrue. `atViewport("mobile")` sets
 * `window.innerWidth` and `matchMedia` — it changes which branch a component
 * *chooses*, and nothing about how the browser would paint it. The 375px device
 * run is issue #45 and is blocked on a credential, not on a missing test.
 */

// ---------------------------------------------------------------------------
// The surfaces this file covers. Read back by `inventory-route-states.test.ts`,
// which is why they are plain literals in a named array rather than inlined.
// ---------------------------------------------------------------------------

/** Inventory routes whose own page component is mounted and axe'd below. */
const A11Y_COVERED_ROUTES: ReadonlyArray<{ route: string; states: string }> = [
  {
    route: "inventory",
    states: "success, empty, denied — the module landing page, the highest-traffic screen in the module",
  },
  { route: "inventory/rf", states: "success, denied — the handheld task queue" },
  { route: "inventory/rf/pick", states: "success, empty — the picker's queue" },
  { route: "inventory/rf/putaway", states: "success — the receiver's queue" },
  { route: "inventory/rf/pick/[pickListId]", states: "success — the pick runner, scan then confirm" },
  { route: "inventory/rf/putaway/[taskId]", states: "success — the putaway runner" },
];

/**
 * Shared surfaces every inventory route renders, mounted and axe'd below.
 *
 * These are worth more per assertion than a route is: the empty state is on all
 * 85 routes, so one violation here is 85 broken screens, and one pass covers a
 * state that no route-level mount would reach without stubbing its data away.
 */
const A11Y_COVERED_SHARED: ReadonlyArray<{ file: string; reason: string }> = [
  {
    file: "app/(authenticated)/inventory/error.tsx",
    reason: "The module error boundary. T07 asserted it exists; nothing rendered it until now.",
  },
  {
    file: "app/(authenticated)/inventory/rf/error.tsx",
    reason: "The handheld error boundary, which recovers on a 375px screen rather than through a desktop shell.",
  },
  {
    file: "features/inventory/components/inventory-empty-state.tsx",
    reason: "The empty state every inventory route renders when a collection comes back with no rows.",
  },
  {
    file: "features/inventory/components/inventory-page-skeletons.tsx",
    reason: "The list loading state; T08 required a loading.tsx per route and most of them render this.",
  },
  {
    file: "features/inventory/components/inventory-detail-page-loading.tsx",
    reason: "The detail loading state, the other half of the skeleton pair the 85 loading.tsx files draw from.",
  },
];

/**
 * Known accessibility debt, named rather than absorbed.
 *
 * axe finds exactly one rule on these six surfaces — `heading-order` — and its
 * cause is not inventory's. `PageWrapper` renders the page `<h1>`, `RfShell`
 * renders the handheld's, and then `EmptyState` (`components/ui/empty-state.tsx`
 * :151), `ErrorState` (`components/shared/error-state.tsx`:45) and
 * `NoPermissionState` (`components/shared/no-permission-state.tsx`:38) each open
 * with an `<h3>`. `CardTitle` is a `<div>`, so nothing sits between: the reader
 * jumps h1 → h3 and the h2 level is missing, which is what somebody navigating
 * by heading level lands on.
 *
 * It is not fixed here on purpose. Those three components have 853 importers
 * across every module; retagging them is a repo-wide product decision that wants
 * verifying against all of them, not a side effect of an inventory ticket — and
 * this branch has another session pushing to it. So it is recorded, bounded and
 * escalated instead.
 *
 * **This is a debt list, not an exemption list.** `expectOnlyKnownDebtAtBothEnds`
 * asserts the violation set *equals* the entry, so the day those three files
 * move to `<h2>` every one of these tests goes red and the entry has to be
 * deleted. An exemption that cannot outlive its cause.
 *
 * Note which surfaces are *not* here: `the inventory empty state is accessible`
 * mounts `InventoryEmptyState` on its own and passes clean. The components are
 * not individually wrong — the composition is, and only a mounted page shows it.
 * That is the argument for mounting pages rather than components.
 */
const KNOWN_AXE_DEBT: ReadonlyArray<{ surface: string; rule: string; owner: string }> = [
  { surface: "inventory (loaded)", rule: "heading-order", owner: "components/ui/empty-state.tsx — h3 under PageWrapper's h1" },
  { surface: "inventory (empty)", rule: "heading-order", owner: "components/ui/empty-state.tsx — h3 under PageWrapper's h1" },
  { surface: "inventory (denied)", rule: "heading-order", owner: "components/shared/no-permission-state.tsx — h3 under PageWrapper's h1" },
  { surface: "inventory/rf (denied)", rule: "heading-order", owner: "components/shared/no-permission-state.tsx — h3 under RfShell's h1" },
  { surface: "inventory/rf/pick (empty)", rule: "heading-order", owner: "components/ui/empty-state.tsx — h3 under RfShell's h1" },
  { surface: "inventory/rf error boundary", rule: "heading-order", owner: "components/shared/error-state.tsx — h3 under RfShell's h1" },
];

/** Every debt entry names the same rule; a second rule is a new decision, not a rollover. */
const HEADING_ORDER_DEBT = ["heading-order"];

// ---------------------------------------------------------------------------
// The data layer, stubbed. What is under test is the rendered tree, not where
// the rows came from — the same arrangement `rf-surface-render.test.tsx` uses.
// ---------------------------------------------------------------------------

const useCan = jest.fn((_key: string) => true);
const rfQueue = jest.fn();
const pickWave = jest.fn();
const putawayTask = jest.fn();
const inventoryDashboard = jest.fn();
const reorderReport = jest.fn();
const attentionBoard = jest.fn();
const opsSummary = jest.fn();
const inventoryInsights = jest.fn();
const opsBrief = jest.fn();
const stockTransactions = jest.fn();

const IDLE_MUTATION = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => useCan(key),
}));
jest.mock("@/hooks/api/inventory/rf-queue", () => ({
  useRfQueue: () => rfQueue(),
}));
jest.mock("@/hooks/api/inventory/picking", () => ({
  usePickWave: () => pickWave(),
  useConfirmPick: () => IDLE_MUTATION,
}));
jest.mock("@/hooks/api/inventory/putaway", () => ({
  usePutawayTask: () => putawayTask(),
  useCompletePutaway: () => IDLE_MUTATION,
}));
jest.mock("@/hooks/api/inventory/scan", () => ({
  useCaptureScan: () => IDLE_MUTATION,
}));
jest.mock("@/hooks/api/inventory/reports", () => ({
  useInventoryDashboard: () => inventoryDashboard(),
  useReorderReport: () => reorderReport(),
}));
jest.mock("@/hooks/api/inventory/ops-board", () => ({
  useAttentionBoard: () => attentionBoard(),
  useOpsSummary: () => opsSummary(),
}));
jest.mock("@/hooks/api/inventory/ai", () => ({
  useInventoryInsights: () => inventoryInsights(),
  useGenerateInsights: () => IDLE_MUTATION,
  useUpdateInsight: () => IDLE_MUTATION,
}));
jest.mock("@/hooks/api/inventory/ops-brief", () => ({
  useOpsBrief: () => opsBrief(),
  useNarrateOpsBrief: () => IDLE_MUTATION,
}));
jest.mock("@/hooks/api/inventory/stock", () => ({
  useStockTransactions: () => stockTransactions(),
}));
jest.mock("@/hooks/api/inventory/offline-outbox", () => ({
  useInventoryOutbox: () => ({
    isOnline: true,
    counts: { queued: 0, inFlight: 0, conflict: 0 },
  }),
}));
jest.mock("next/navigation", () => ({
  useParams: () => ({ pickListId: "1", taskId: "1" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InventoryDashboardPage = require("./page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfQueuePage = require("./rf/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPickQueuePage = require("./rf/pick/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPutawayQueuePage = require("./rf/putaway/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPickPage = require("./rf/pick/[pickListId]/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPutawayPage = require("./rf/putaway/[taskId]/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InventoryError = require("./error").default as (props: {
  error: Error & { digest?: string };
  reset: () => void;
}) => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfError = require("./rf/error").default as (props: {
  error: Error & { digest?: string };
  reset: () => void;
}) => ReactElement;

import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  DetailActionSkeleton,
  InventoryTableSkeleton,
} from "@/features/inventory/components/inventory-page-skeletons";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

const MIXED_QUEUE = [
  { kind: "PICK", id: 1, reference: "PICK-0001", summary: "3 lines to pick", warehouseId: 1, href: "/inventory/rf/pick/1" },
  { kind: "PUTAWAY", id: 2, reference: "PUT-0002", summary: "1 pallet to put away", warehouseId: 1, href: "/inventory/rf/putaway/2" },
  { kind: "COUNT", id: 3, reference: "CNT-0003", summary: "12 bins to count", warehouseId: null, href: "/inventory/cycle-counts?count=3" },
];

const LOADED_QUEUE = {
  isLoading: false,
  isError: false,
  isDenied: false,
  refetch: jest.fn(),
  tasks: MIXED_QUEUE,
};

const IDLE_QUERY = { isLoading: false, isError: false, error: null, data: undefined, refetch: jest.fn() };

const POPULATED_DASHBOARD = {
  ...IDLE_QUERY,
  data: {
    totalSkus: 412,
    totalOnHand: 18_204,
    lowStockCount: 6,
    openSoCount: 11,
    stockValue: 4_820_000,
    expiringLotsCount: 2,
    qualityHoldQty: 0,
    failedChannelSyncsCount: 0,
    openInspectionsCount: 1,
    activeReservationsCount: 4,
    openShipmentsCount: 3,
  },
};

const EMPTY_DASHBOARD = {
  ...IDLE_QUERY,
  data: {
    totalSkus: 0,
    totalOnHand: 0,
    lowStockCount: 0,
    openSoCount: 0,
    stockValue: 0,
    expiringLotsCount: 0,
    qualityHoldQty: 0,
    failedChannelSyncsCount: 0,
    openInspectionsCount: 0,
    activeReservationsCount: 0,
    openShipmentsCount: 0,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  rfQueue.mockReturnValue(LOADED_QUEUE);
  inventoryDashboard.mockReturnValue(POPULATED_DASHBOARD);
  reorderReport.mockReturnValue({ ...IDLE_QUERY, data: { items: [] } });
  attentionBoard.mockReturnValue({ ...IDLE_QUERY, data: { items: [] } });
  opsSummary.mockReturnValue({ ...IDLE_QUERY, data: undefined });
  inventoryInsights.mockReturnValue({ ...IDLE_QUERY, data: [] });
  opsBrief.mockReturnValue({ ...IDLE_QUERY, data: undefined });
  stockTransactions.mockReturnValue({ ...IDLE_QUERY, data: { items: [] } });
  pickWave.mockReturnValue({
    ...IDLE_QUERY,
    data: {
      id: 1,
      pickNumber: "PICK-0001",
      lines: [
        {
          id: 10,
          line_closed: false,
          sku: "NEO-1",
          product_name: "NEO widget",
          location_code: "A-01-01",
          lot_number: null,
          quantity_to_pick: "5.0000",
          quantity_picked: "0.0000",
        },
      ],
    },
  });
  putawayTask.mockReturnValue({
    ...IDLE_QUERY,
    data: {
      task: { id: 1, taskNumber: "PUT-0002", grnId: 7 },
      lines: [
        {
          id: 20,
          sku: "NEO-1",
          variant_name: "NEO widget",
          to_location_id: 5,
          to_location_code: "A-01-01",
          lot_number: null,
          quantity: "100.0000",
          quantity_moved: "0.0000",
          remaining: "100.0000",
          suggestions: [],
        },
      ],
    },
  });
});

/**
 * The providers the real tree has above every inventory page.
 *
 * `TooltipProvider` is mounted once in `components/providers/query-provider.tsx`
 * and `PageWrapper` renders a `Tooltip` under it. Mounting a page without it
 * throws before axe sees anything, so this is not a convenience — it is the
 * difference between testing the app's tree and testing a fragment that cannot
 * exist. `product-switcher-menu.test.tsx` wraps for the same reason.
 */
function inProviders(ui: ReactElement): ReactElement {
  return <TooltipProvider>{ui}</TooltipProvider>;
}

/**
 * How many times axe has actually run in this file.
 *
 * Counted at runtime, and checked in `afterAll`, because a *static* count is
 * gameable and was: the first version of the ratchet next door counted helper
 * call sites in this file's text, and replacing every call with
 * `await Promise.resolve(` still passed — the helper declarations and the two
 * calls inside the helper bodies made up the difference. A number that only goes
 * up when axe genuinely ran cannot be talked into a higher value.
 */
let axeRunCount = 0;

/**
 * Runs axe at both ends of the responsive range.
 *
 * Both, not one: `atViewport` swaps `matchMedia`, so a component that renders a
 * different tree on a narrow screen — a sheet instead of a dialog, a stacked
 * card instead of a row — is a *different* tree for axe to judge, and passing at
 * 1280px says nothing about the one a phone gets. It remains a claim about
 * markup, never about layout.
 */
async function expectAccessibleAtBothEnds(ui: ReactElement): Promise<void> {
  const desktop = render(inProviders(ui));
  await expectNoAxeViolations(desktop.baseElement);
  axeRunCount++;
  desktop.unmount();

  const restore = atViewport("mobile");
  try {
    const mobile = render(inProviders(ui));
    await expectNoAxeViolations(mobile.baseElement);
    axeRunCount++;
    mobile.unmount();
  } finally {
    restore();
  }
}

/**
 * The same run for a surface carrying named debt from a component inventory
 * does not own — see `KNOWN_AXE_DEBT`.
 *
 * `toEqual`, not "contains": a seventh violating node fails, a violation of any
 * other rule fails, and a debt entry whose violation has been fixed fails too.
 * That last one is deliberate — it is what stops this list becoming a permanent
 * exemption, because the day `components/ui/empty-state.tsx` and its two
 * siblings move from `h3` to `h2` this file goes red until the entry is deleted.
 */
async function expectOnlyKnownDebtAtBothEnds(
  ui: ReactElement,
  debt: ReadonlyArray<string>,
): Promise<void> {
  const desktop = render(inProviders(ui));
  expect(await axeViolationIds(desktop.baseElement)).toEqual([...debt]);
  axeRunCount++;
  desktop.unmount();

  const restore = atViewport("mobile");
  try {
    const mobile = render(inProviders(ui));
    expect(await axeViolationIds(mobile.baseElement)).toEqual([...debt]);
    axeRunCount++;
    mobile.unmount();
  } finally {
    restore();
  }
}

describe("T18 a11y — the inventory route surfaces", () => {
  it("covers enough surfaces that an empty run cannot pass as coverage", () => {
    // The guard on the guard, the same one the four ratcheted states carry: a
    // suite that mounts nothing reports zero violations, which reads exactly
    // like an accessible module.
    expect(A11Y_COVERED_ROUTES.length).toBeGreaterThanOrEqual(6);
    expect(A11Y_COVERED_SHARED.length).toBeGreaterThanOrEqual(5);

    // The debt list is bounded by hand and must stay that shape: six surfaces,
    // one rule. A seventh entry, or a second rule id, is somebody widening an
    // exemption rather than recording the one that exists — and it should cost
    // an edit to this line, not pass unnoticed.
    expect(KNOWN_AXE_DEBT).toHaveLength(6);
    expect([...new Set(KNOWN_AXE_DEBT.map(({ rule }) => rule))]).toEqual(HEADING_ORDER_DEBT);
    for (const { owner } of KNOWN_AXE_DEBT) expect(owner.length).toBeGreaterThan(30);
  });

  it("inventory — the module landing page, loaded", async () => {
    await expectOnlyKnownDebtAtBothEnds(<InventoryDashboardPage />, HEADING_ORDER_DEBT);
  });

  it("inventory — the onboarding empty state", async () => {
    inventoryDashboard.mockReturnValue(EMPTY_DASHBOARD);
    await expectOnlyKnownDebtAtBothEnds(<InventoryDashboardPage />, HEADING_ORDER_DEBT);
  });

  it("inventory — the denied state, which is not the empty one", async () => {
    useCan.mockReturnValue(false);
    await expectOnlyKnownDebtAtBothEnds(<InventoryDashboardPage />, HEADING_ORDER_DEBT);
  });

  it("inventory/rf — the handheld task queue", async () => {
    await expectAccessibleAtBothEnds(<RfQueuePage />);
  });

  it("inventory/rf — the handheld queue, denied", async () => {
    rfQueue.mockReturnValue({ ...LOADED_QUEUE, isDenied: true, tasks: [] });
    await expectOnlyKnownDebtAtBothEnds(<RfQueuePage />, HEADING_ORDER_DEBT);
  });

  it("inventory/rf/pick — the picker's queue", async () => {
    await expectAccessibleAtBothEnds(<RfPickQueuePage />);
  });

  it("inventory/rf/pick — the picker's queue with nothing assigned", async () => {
    rfQueue.mockReturnValue({
      ...LOADED_QUEUE,
      tasks: MIXED_QUEUE.filter((task) => task.kind !== "PICK"),
    });
    await expectOnlyKnownDebtAtBothEnds(<RfPickQueuePage />, HEADING_ORDER_DEBT);
  });

  it("inventory/rf/putaway — the receiver's queue", async () => {
    await expectAccessibleAtBothEnds(<RfPutawayQueuePage />);
  });

  it("inventory/rf/pick/[pickListId] — the pick runner", async () => {
    await expectAccessibleAtBothEnds(<RfPickPage />);
  });

  it("inventory/rf/putaway/[taskId] — the putaway runner", async () => {
    await expectAccessibleAtBothEnds(<RfPutawayPage />);
  });
});

describe("T18 a11y — the shared surfaces every inventory route renders", () => {
  const boundaryProps = { error: new Error("render threw"), reset: jest.fn() };

  it("the module error boundary renders and is accessible", async () => {
    await expectAccessibleAtBothEnds(<InventoryError {...boundaryProps} />);
  });

  it("the RF error boundary renders and is accessible", async () => {
    await expectOnlyKnownDebtAtBothEnds(<RfError {...boundaryProps} />, HEADING_ORDER_DEBT);
  });

  it("the inventory empty state is accessible", async () => {
    await expectAccessibleAtBothEnds(
      <InventoryEmptyState
        title="No stock in this warehouse"
        description="Receive a purchase order to put stock on these shelves."
      />,
    );
  });

  it("the list skeleton is accessible", async () => {
    await expectAccessibleAtBothEnds(<InventoryTableSkeleton rows={4} />);
  });

  it("the detail action skeleton is accessible", async () => {
    await expectAccessibleAtBothEnds(<DetailActionSkeleton />);
  });

  it("the detail loading surface is accessible", async () => {
    await expectAccessibleAtBothEnds(
      <InventoryDetailPageLoading title="LOT-0001" backHref="/inventory/lots" subtitle="Traceability" />,
    );
  });
});

/**
 * The success state — §12.7's fifth, and the one the source-level ratchet next
 * door cannot see.
 *
 * "Has an `isLoading` branch" is answerable from source. "Shows the operator
 * their rows once the request lands" is not: a screen can hold every marker and
 * render an empty div. These mount the loaded state and look for the data.
 */
describe("T18 success — a loaded inventory surface shows its data", () => {
  it("the landing page shows the totals rather than a skeleton", () => {
    render(inProviders(<InventoryDashboardPage />));
    expect(screen.getByText("Total SKUs")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.queryByText(/set up your inventory/i)).not.toBeInTheDocument();
  });

  it("the handheld queue shows one tappable task per row", () => {
    render(inProviders(<RfQueuePage />));
    const list = screen.getByRole("list");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(list).toBeInTheDocument();
    for (const reference of ["PICK-0001", "PUT-0002", "CNT-0003"])
      expect(screen.getByText(reference)).toBeInTheDocument();
  });

  it("the pick runner shows the line it wants picked", () => {
    render(inProviders(<RfPickPage />));
    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("the putaway runner shows the location it wants the stock in", () => {
    render(inProviders(<RfPutawayPage />));
    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("BITE PROOF — the success assertion sees an empty result as empty", () => {
    // Without this, "shows its data" could be satisfied by a screen that shows
    // the same thing whatever comes back.
    inventoryDashboard.mockReturnValue(EMPTY_DASHBOARD);
    render(inProviders(<InventoryDashboardPage />));
    expect(screen.queryByText("Total SKUs")).not.toBeInTheDocument();
    expect(screen.getByText(/set up your inventory/i)).toBeInTheDocument();
  });
});

/**
 * The anti-vacuity floor, enforced after the suite has actually run.
 *
 * Two runs per named surface — one desktop, one mobile — is the minimum this
 * file promises `inventory-route-states.test.ts`, which holds the two lists and
 * this file's existence but cannot see whether the mounts happened. Deleting a
 * mount while keeping its list entry fails here.
 */
afterAll(() => {
  const promised = 2 * (A11Y_COVERED_ROUTES.length + A11Y_COVERED_SHARED.length);
  expect(axeRunCount).toBeGreaterThanOrEqual(promised);
});
