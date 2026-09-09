import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { InvReportPreview } from "@/hooks/api/inventory/report-builder";
import {
  CATALOG,
  SKU_COLUMN,
  preview,
} from "@/test-support/inventory-report-builder-fixtures";
import InventoryAiPage from "@/app/(authenticated)/inventory/ai/page";

/**
 * `inventory/ai/reports` — catalog, ask and export — had no frontend caller at
 * all. No hook, no page, no link. A complete natural-language report builder,
 * carefully defended, that nobody in the product could reach.
 *
 * Every test here drives it from the page, not from the component: the panel is
 * a tab on /inventory/ai, so a test that mounted `ReportBuilderPanel` directly
 * would keep passing on the day the tab is removed and the feature is
 * unreachable again — which is the exact failure being fixed.
 *
 * The rest of the file is about the four things the response says that a table
 * cannot. Each is a way for correct rows to tell a lie, and each was designed
 * into the contract on purpose.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/ai",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  }),
}));

const mockAskMutate = jest.fn();
const mockExportMutate = jest.fn();
let mockPreview: InvReportPreview | undefined;

jest.mock("@/hooks/api/inventory/report-builder", () => ({
  ...jest.requireActual("@/hooks/api/inventory/report-builder"),
  useInvReportCatalog: () => ({
    data: mockCatalog,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useInvReportAsk: () => ({
    data: mockPreview,
    error: null,
    isPending: false,
    mutate: mockAskMutate,
    reset: jest.fn(),
  }),
  useInvReportExport: () => ({
    error: null,
    isPending: false,
    mutate: mockExportMutate,
    reset: jest.fn(),
  }),
}));

const mockCatalog = CATALOG;

beforeEach(() => {
  mockAskMutate.mockClear();
  mockExportMutate.mockClear();
  mockPreview = undefined;
});

async function openReportBuilder(): Promise<void> {
  renderWithProviders(
    <TooltipProvider>
      <InventoryAiPage />
    </TooltipProvider>,
  );
  await userEvent.click(screen.getByRole("tab", { name: "Report builder" }));
}

describe("reaching it at all", () => {
  it("is a tab on the inventory AI page, and the tab renders the builder", async () => {
    await openReportBuilder();

    expect(
      screen.getByRole("textbox", { name: "Question to build a report from" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build report" })).toBeInTheDocument();
  });

  /**
   * The controller's own comment asks for this: the catalogue exists "so a
   * client can offer the six as buttons rather than making everybody guess what
   * the box understands".
   */
  it("offers all six reports as buttons", async () => {
    await openReportBuilder();

    for (const report of CATALOG.reports)
      expect(screen.getByRole("button", { name: report.label })).toBeInTheDocument();
  });

  /**
   * Picking one writes the question rather than sending it. Asking spends
   * credits, so the press that spends them stays the reader's.
   */
  it("fills the box from a catalogue button without spending a credit", async () => {
    await openReportBuilder();

    await userEvent.click(screen.getByRole("button", { name: "Reorder report" }));

    expect(screen.getByRole("textbox", { name: "Question to build a report from" })).toHaveValue(
      "SKUs at or below their reorder point.",
    );
    expect(mockAskMutate).not.toHaveBeenCalled();
  });

  it("sends the typed question when the reader asks for it", async () => {
    await openReportBuilder();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Question to build a report from" }),
      "what expires this month",
    );
    await userEvent.click(screen.getByRole("button", { name: "Build report" }));

    expect(mockAskMutate).toHaveBeenCalledWith({ question: "what expires this month" });
  });
});

describe("what the answer says beyond its rows", () => {
  /**
   * `plannedBy: "deterministic"` means the model did not answer and a keyword
   * fallback picked the report. Presenting that as the assistant's answer is the
   * exact dishonesty the backend went out of its way to avoid.
   */
  it("says out loud when the assistant did not choose the report", async () => {
    mockPreview = preview({ plannedBy: "deterministic" });
    await openReportBuilder();

    expect(screen.getByText("Keyword fallback")).toBeInTheDocument();
    expect(
      screen.getByText(/The assistant did not choose this report/),
    ).toBeInTheDocument();
  });

  it("does not claim a keyword fallback when the model did answer", async () => {
    mockPreview = preview({ plannedBy: "model" });
    await openReportBuilder();

    expect(screen.getByText("Chosen by the assistant")).toBeInTheDocument();
    expect(screen.queryByText(/The assistant did not choose this report/)).toBeNull();
  });

  /**
   * A filter removed because it named a warehouse outside the asker's scope
   * makes a narrowed result look like a complete one. The reason travels with
   * the field for exactly this reason, and both have to render.
   */
  it("names every filter the server removed, and why", async () => {
    mockPreview = preview({
      stripped: [
        {
          field: "warehouseId",
          reason:
            "The suggested warehouse is outside your access, so the report was run across the warehouses you are assigned to.",
        },
      ],
    });
    await openReportBuilder();

    expect(screen.getByText("A filter was removed")).toBeInTheDocument();
    expect(screen.getByText("warehouseId")).toBeInTheDocument();
    expect(
      screen.getByText(/outside your access, so the report was run across the warehouses/),
    ).toBeInTheDocument();
  });

  /** "25 rows" under a table showing 25 of 3,000 is a lie. */
  it("reports a truncated preview against the real total, not its own row count", async () => {
    mockPreview = preview({ rowCount: 25, total: 3000, truncated: true });
    await openReportBuilder();

    expect(screen.getByText("Showing 25 of 3000 rows")).toBeInTheDocument();
    expect(screen.queryByText("25 rows")).toBeNull();
  });

  /** A report that cannot count still says the preview is a sample. */
  it("says a capped preview is a sample when the report reports no total", async () => {
    mockPreview = preview({ rowCount: 25, total: null, truncated: true });
    await openReportBuilder();

    expect(
      screen.getByText("Showing the first 25 rows — the report has more"),
    ).toBeInTheDocument();
  });

  it("states a complete result plainly", async () => {
    mockPreview = preview({ rowCount: 1, total: 1, truncated: false });
    await openReportBuilder();

    expect(screen.getByText("1 row")).toBeInTheDocument();
  });
});

describe("the export control", () => {
  it("is absent when the asker does not hold the export key", async () => {
    mockPreview = preview({ canExport: false });
    await openReportBuilder();

    expect(screen.queryByRole("button", { name: /Export CSV/ })).toBeNull();
    expect(
      screen.getByText("Export needs a permission you do not hold"),
    ).toBeInTheDocument();
  });

  it("hands the spec back verbatim rather than re-deriving it", async () => {
    mockPreview = preview({ canExport: true });
    await openReportBuilder();

    await userEvent.click(screen.getByRole("button", { name: /Export CSV/ }));

    expect(mockExportMutate).toHaveBeenCalledWith({
      report: "expiry",
      filters: { withinDays: 30 },
    });
  });
});

describe("a report the asker may not read", () => {
  /**
   * `not_permitted` is a state, not an error and not an empty result. The model
   * chose a report whose own key the asker does not hold — valuation is the one
   * that makes it concrete — and an empty table here would read as "there is
   * nothing there", which is a different claim entirely.
   */
  it("names the permission the chosen report costs instead of showing an empty table", async () => {
    mockPreview = preview({
      status: "not_permitted",
      label: "Inventory valuation",
      spec: { report: "valuation", filters: {} },
      columns: [SKU_COLUMN],
      rows: [],
      rowCount: 0,
      total: null,
      truncated: false,
      requiredPermission: "inventory:valuation:read",
      canExport: false,
    });
    await openReportBuilder();

    expect(screen.getByText("Inventory valuation is not open to you")).toBeInTheDocument();
    expect(screen.getByText(/inventory:valuation:read/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Nothing matched")).toBeNull();
  });
});

describe("the rows themselves", () => {
  it("renders a bare calendar date as the day that was stored", async () => {
    mockPreview = preview({});
    await openReportBuilder();

    const table = screen.getByRole("table");
    expect(within(table).getByText("LOT-44")).toBeInTheDocument();
    // parseISO, not `new Date`: UTC midnight prints 30 September west of London.
    expect(within(table).getByText("1 Oct 2026")).toBeInTheDocument();
  });
});
