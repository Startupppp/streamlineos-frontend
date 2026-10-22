import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { renderWithProviders } from "@/test-utils";
import { atViewport } from "@/test-utils/viewport";



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



const useCan = jest.fn((_key: string) => true);
const useCanState = jest.fn((_key: string) => "granted");
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
  useCanState: (key: string) => useCanState(key),
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
  useCanState.mockReturnValue("granted");
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

let axeRunCount = 0;

async function expectAccessibleAtBothEnds(ui: ReactElement): Promise<void> {
  const desktop = renderWithProviders(ui);
  await expectNoAxeViolations(desktop.baseElement);
  axeRunCount++;
  desktop.unmount();

  const restore = atViewport("mobile");
  try {
    const mobile = renderWithProviders(ui);
    await expectNoAxeViolations(mobile.baseElement);
    axeRunCount++;
    mobile.unmount();
  } finally {
    restore();
  }
}

describe("T18 a11y — the inventory route surfaces", () => {
  it("covers enough surfaces that an empty run cannot pass as coverage", () => {
    expect(A11Y_COVERED_ROUTES.length).toBeGreaterThanOrEqual(6);
    expect(A11Y_COVERED_SHARED.length).toBeGreaterThanOrEqual(5);
  });

  it("inventory — the module landing page, loaded", async () => {
    await expectAccessibleAtBothEnds(<InventoryDashboardPage />);
  });

  it("inventory — the onboarding empty state", async () => {
    inventoryDashboard.mockReturnValue(EMPTY_DASHBOARD);
    await expectAccessibleAtBothEnds(<InventoryDashboardPage />);
  });

  it("inventory — the denied state, which is not the empty one", async () => {
    useCan.mockReturnValue(false);
    useCanState.mockReturnValue("denied");
    await expectAccessibleAtBothEnds(<InventoryDashboardPage />);
  });

  it("inventory/rf — the handheld task queue", async () => {
    await expectAccessibleAtBothEnds(<RfQueuePage />);
  });

  it("inventory/rf — the handheld queue, denied", async () => {
    rfQueue.mockReturnValue({ ...LOADED_QUEUE, isDenied: true, tasks: [] });
    await expectAccessibleAtBothEnds(<RfQueuePage />);
  });

  it("inventory/rf/pick — the picker's queue", async () => {
    await expectAccessibleAtBothEnds(<RfPickQueuePage />);
  });

  it("inventory/rf/pick — the picker's queue with nothing assigned", async () => {
    rfQueue.mockReturnValue({
      ...LOADED_QUEUE,
      tasks: MIXED_QUEUE.filter((task) => task.kind !== "PICK"),
    });
    await expectAccessibleAtBothEnds(<RfPickQueuePage />);
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
    await expectAccessibleAtBothEnds(<RfError {...boundaryProps} />);
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

describe("T18 success — a loaded inventory surface shows its data", () => {
  it("the landing page shows the totals rather than a skeleton", () => {
    renderWithProviders(<InventoryDashboardPage />);
    expect(screen.getByText("Total SKUs")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.queryByText(/set up your inventory/i)).not.toBeInTheDocument();
  });

  it("the handheld queue shows one tappable task per row", () => {
    renderWithProviders(<RfQueuePage />);
    const list = screen.getByRole("list");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(list).toBeInTheDocument();
    for (const reference of ["PICK-0001", "PUT-0002", "CNT-0003"])
      expect(screen.getByText(reference)).toBeInTheDocument();
  });

  it("the pick runner shows the line it wants picked", () => {
    renderWithProviders(<RfPickPage />);
    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("the putaway runner shows the location it wants the stock in", () => {
    renderWithProviders(<RfPutawayPage />);
    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("BITE PROOF — the success assertion sees an empty result as empty", () => {
    inventoryDashboard.mockReturnValue(EMPTY_DASHBOARD);
    renderWithProviders(<InventoryDashboardPage />);
    expect(screen.queryByText("Total SKUs")).not.toBeInTheDocument();
    expect(screen.getByText(/set up your inventory/i)).toBeInTheDocument();
  });
});

afterAll(() => {
  const promised = 2 * (A11Y_COVERED_ROUTES.length + A11Y_COVERED_SHARED.length);
  expect(axeRunCount).toBeGreaterThanOrEqual(promised);
});
