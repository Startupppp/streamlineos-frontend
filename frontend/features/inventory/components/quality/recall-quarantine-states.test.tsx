import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { RecallDetailSheet } from "./recall-detail-sheet";
import type { Recall } from "@/hooks/api/inventory/quality";

/**
 * INV-33 — a recall that quarantined nothing must not read like one that worked.
 *
 * `inv_recall_events.status` is OPEN / IN_PROGRESS / CLOSED and says nothing
 * about stock. The create path commits the document whether or not a single
 * unit was held: a line naming a lot with nothing on hand raises no hold, and a
 * line naming only a serial never even flips a lot, so the goods stay pickable.
 * Both used to render as an OPEN recall with a list of lots and a green-enough
 * screen — which is how a failed recall ships.
 *
 * The fifth state matters as much as the failures: a recall raised before the
 * outcome was recorded reads `OPEN` on its lines, and that has to render as
 * PENDING. Defaulting an unknown outcome to "held" would be the same bug with
 * better manners.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/quality/recalls",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseRecall = jest.fn();
jest.mock("@/hooks/api/inventory/quality", () => ({
  useRecall: () => mockUseRecall() as unknown,
  useUpdateRecall: () => ({ mutate: jest.fn(), isPending: false }),
}));

function recallWith(lineStatuses: Array<string | null>): Recall {
  return {
    id: 1,
    orgId: "org",
    recallNumber: "RECALL-0001",
    title: "Contaminated batch",
    description: "Vendor notice",
    status: "OPEN",
    evidenceVersion: null,
    lines: lineStatuses.map((status, index) => ({
      id: index + 1,
      productVariantId: 10,
      lotId: status === "NOT_QUARANTINABLE" ? null : 100 + index,
      serialId: status === "NOT_QUARANTINABLE" ? 900 : null,
      status,
    })),
    affectedShipments: [],
    closedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function renderRecall(lineStatuses: Array<string | null>): void {
  mockUseRecall.mockReturnValue({
    data: recallWith(lineStatuses),
    isLoading: false,
    isError: false,
  });
  renderWithProviders(
    <RecallDetailSheet open onOpenChange={jest.fn()} recallId={1} />,
  );
}

describe("recall quarantine states", () => {
  afterEach(() => {
    mockUseRecall.mockReset();
  });

  it("says nothing extra when every line is held", () => {
    renderRecall(["QUARANTINED", "QUARANTINED"]);
    expect(screen.getAllByText("Held")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns in the loudest terms when the recall held nothing at all", () => {
    renderRecall(["NOT_QUARANTINABLE"]);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No stock is held by this recall");
    expect(screen.getByText("Not held")).toBeInTheDocument();
  });

  it("counts the unheld lines when only some of them failed", () => {
    renderRecall(["QUARANTINED", "NOT_QUARANTINABLE", "QUARANTINED"]);
    expect(screen.getByRole("alert")).toHaveTextContent("1 of 3 lines hold no stock");
  });

  it("keeps a blocked lot with nothing on the shelf apart from a line nothing blocked", () => {
    renderRecall(["NOTHING_TO_QUARANTINE", "NOT_QUARANTINABLE"]);
    expect(screen.getByText("Nothing on hand")).toBeInTheDocument();
    expect(screen.getByText("Not held")).toBeInTheDocument();
  });

  it("shows an unrecorded outcome as pending rather than as held", () => {
    renderRecall([null]);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Held")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an outcome this build has never heard of as pending, not as held", () => {
    renderRecall(["SOME_FUTURE_STATE"]);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Held")).not.toBeInTheDocument();
  });
});
