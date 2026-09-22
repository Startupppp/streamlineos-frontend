import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { ChannelSnapshotDiffsPanel } from "./channel-snapshot-diffs-panel";
import type { Channel, ChannelSnapshotDiff } from "@/hooks/api/inventory/channels";

/**
 * The nightly sweep writes these rows and nothing read them, so an oversold
 * listing produced a difference that sat unseen.
 *
 * Two gates have to hold on the screen, because both are real on the server and
 * a button that 409s is worse than no button: accepting posts a stock movement
 * and needs `inventory:stock:adjust`, and the channel's own snapshot policy can
 * forbid accepting at all.
 */

const mockUseCan = jest.fn(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
  useCanState: (key: string) =>
    key === "inventory:stock:adjust" && !mockUseCan() ? "denied" : "granted",
}));

const mockUseDiffs = jest.fn();
jest.mock("@/hooks/api/inventory/channels", () => ({
  ...jest.requireActual("@/hooks/api/inventory/channels"),
  useChannelSnapshotDiffs: () => mockUseDiffs() as unknown,
  useAcceptSnapshotDiff: () => ({ mutate: jest.fn(), isPending: false }),
  useDismissSnapshotDiff: () => ({ mutate: jest.fn(), isPending: false }),
}));

const CHANNEL = { id: 3, name: "Blinkit Hyderabad" } as Channel;

function diff(overrides: Partial<ChannelSnapshotDiff> = {}): ChannelSnapshotDiff {
  return {
    id: 77,
    externalSku: "BLK-CEM-50",
    productVariantId: 12,
    channelQty: "40.0000",
    internalQty: "12.0000",
    difference: "28.0000",
    status: "OPEN",
    snapshotAt: "2026-09-08T02:00:00.000Z",
    resolvedAt: null,
    resolutionNote: null,
    stockTransactionId: null,
    ...overrides,
  };
}

function renderWith(
  query: Record<string, unknown>,
  { canAdjust = true, policy = "ALLOW_ADJUSTMENT" } = {},
) {
  mockUseCan.mockReturnValue(canAdjust);
  mockUseDiffs.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...query,
  });
  if (query.data !== undefined && query.data !== null)
    (query.data as { snapshotPolicy: string }).snapshotPolicy = policy;
  return renderWithProviders(
    <TooltipProvider>
      <ChannelSnapshotDiffsPanel open onOpenChange={jest.fn()} channel={CHANNEL} />
    </TooltipProvider>,
  );
}

function result(items: ChannelSnapshotDiff[], policy = "ALLOW_ADJUSTMENT") {
  return { items, total: items.length, page: 1, totalPages: 1, snapshotPolicy: policy };
}

afterEach(() => jest.clearAllMocks());

describe("channel snapshot differences", () => {
  it("says the read failed rather than that nothing needs deciding", () => {
    renderWith({ isError: true, error: new Error("504 Gateway Timeout") });

    expect(screen.getByText(/Couldn't load the differences/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing to decide/i)).not.toBeInTheDocument();
  });

  it("says nothing needs deciding when the sweep found no difference", () => {
    renderWith({ data: result([]) });

    expect(screen.getByText(/Nothing to decide/i)).toBeInTheDocument();
  });

  it("shows both figures and the gap, by listing name rather than by id", () => {
    renderWith({ data: result([diff()]) });

    expect(screen.getByText("BLK-CEM-50")).toBeInTheDocument();
    expect(screen.getByText("40.0000")).toBeInTheDocument();
    expect(screen.getByText("12.0000")).toBeInTheDocument();
    expect(screen.getByText("28.0000")).toBeInTheDocument();
  });

  it("offers no accept to a reader who may not adjust stock", () => {
    renderWith({ data: result([diff()]) }, { canAdjust: false });

    expect(screen.queryByRole("button", { name: /^Accept$/i })).not.toBeInTheDocument();
    // Dismissing touches nothing, so it stays available.
    expect(screen.getByRole("button", { name: /^Dismiss$/i })).toBeInTheDocument();
  });

  it("says the channel's policy forbids accepting rather than offering a button that 409s", () => {
    renderWith({ data: result([diff()], "REPORT_ONLY") }, { policy: "REPORT_ONLY" });

    expect(screen.getByText(/cannot be accepted into the ledger/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Accept$/i })).not.toBeInTheDocument();
  });
});
