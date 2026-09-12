import { fireEvent, render, screen } from "@testing-library/react";
import { permissionGate } from "@/lib/rbac/permission-gate";
import type { ReportingCompiledColumn, ReportingRunResult } from "@/types/crm/reporting";
import { ReportResultsPanel } from "./report-results-panel";
import type { ReportFieldOption } from "./report-source-fields";

const RUN_KEY = "crm:reporting:run";
const ALLOWED = permissionGate(RUN_KEY, true, true);
const DENIED = permissionGate(RUN_KEY, false, true);

const OPTIONS: readonly ReportFieldOption[] = [
  { name: "name", label: "Deal name", type: "text", group: "Deals" },
  { name: "amount", label: "Amount", type: "number", group: "Deals" },
  { name: "closedAt", label: "Closed on", type: "date", group: "Deals" },
  { name: "isWon", label: "Won", type: "boolean", group: "Deals" },
];

const NAME_COLUMN: ReportingCompiledColumn = {
  alias: "c0",
  projection: { kind: "field", field: "name" },
  type: "text",
};

function result(over: Partial<ReportingRunResult> = {}): ReportingRunResult {
  return {
    columns: [NAME_COLUMN],
    rows: [{ c0: "Acme renewal" }],
    rowCount: 1,
    truncated: false,
    ...over,
  };
}

/** `n` rows of the one text column, so a page can be made full at any limit. */
function rows(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, index) => ({ c0: `Deal ${index + 1}` }));
}

type PanelProps = React.ComponentProps<typeof ReportResultsPanel>;

const onOffsetChange = jest.fn();
const onRetry = jest.fn();

function renderPanel(over: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    access: ALLOWED,
    result: result(),
    options: OPTIONS,
    hasRun: true,
    isLoading: false,
    isError: false,
    error: null,
    limit: 50,
    offset: 0,
    onOffsetChange,
    onRetry,
    ...over,
  };
  return render(<ReportResultsPanel {...props} />);
}

describe("ReportResultsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("before anything has been asked", () => {
    it("invites a question rather than showing an empty table", () => {
      renderPanel({ hasRun: false, result: undefined });

      expect(screen.getByText("Nothing has been asked yet")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByText("No rows matched")).not.toBeInTheDocument();
    });

    /** Inviting a run somebody cannot make sends them at a 403. */
    it("names the missing permission instead, when the run key is refused", () => {
      renderPanel({ hasRun: false, result: undefined, access: DENIED });

      expect(screen.getByText(RUN_KEY)).toBeInTheDocument();
      expect(screen.queryByText("Nothing has been asked yet")).not.toBeInTheDocument();
    });
  });

  it("says a run failed, and offers the run again — never a blank result area", () => {
    renderPanel({
      result: undefined,
      isError: true,
      error: new Error("Query exceeded the statement timeout"),
    });

    expect(screen.getByText("That report did not run")).toBeInTheDocument();
    expect(screen.getByText("Query exceeded the statement timeout")).toBeInTheDocument();
    expect(screen.queryByText("No rows matched")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows the table's own shape while the run is in flight, and counts nothing yet", () => {
    renderPanel({ result: undefined, isLoading: true });

    expect(screen.queryByText(/^\d+ rows?$/)).not.toBeInTheDocument();
    expect(screen.queryByText("No rows matched")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing on this page")).not.toBeInTheDocument();
  });

  it("distinguishes a report that matched nothing from one that ran badly", () => {
    renderPanel({ result: result({ rows: [], rowCount: 0 }) });

    expect(screen.getByText("No rows matched")).toBeInTheDocument();
    expect(screen.getByText(/Loosen a filter/)).toBeInTheDocument();
    expect(screen.queryByText("Nothing on this page")).not.toBeInTheDocument();
  });

  /**
   * The run response carries `rowCount` and `truncated` and never a total —
   * counting the rows behind the page would be a second scan of the same table.
   * So every number on screen is "at least this many", and nothing here may
   * present one as measured.
   */
  describe("the page count is a floor, not a fact", () => {
    it("counts the rows in hand and claims no total behind them", () => {
      renderPanel({
        result: result({ rows: rows(3), rowCount: 999, truncated: false }),
        limit: 50,
      });

      expect(screen.getByText("3 rows")).toBeInTheDocument();
      expect(screen.queryByText(/999/)).not.toBeInTheDocument();
      expect(screen.queryByText("More rows behind this page")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
    });

    it("says the singular when exactly one row came back", () => {
      renderPanel({ result: result({ rows: rows(1), rowCount: 1 }) });
      expect(screen.getByText("1 row")).toBeInTheDocument();
    });

    it("offers a next page only because the page came back full", () => {
      renderPanel({ result: result({ rows: rows(2), rowCount: 2, truncated: true }), limit: 2 });

      expect(screen.getByText("More rows behind this page")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /next page/i }));
      expect(onOffsetChange).toHaveBeenCalledWith(2);
    });

    it("offers no next page when the server did not say the page was full", () => {
      renderPanel({ result: result({ rows: rows(2), rowCount: 2, truncated: false }), limit: 2 });

      expect(screen.queryByText("More rows behind this page")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
    });

    /** The floor rises as pages are read; it never jumps to a number nobody counted. */
    it("counts only as far as the pages already read", () => {
      renderPanel({
        result: result({ rows: rows(2), rowCount: 2, truncated: true }),
        limit: 2,
        offset: 2,
      });

      expect(screen.getByText("Showing 3-4 of 5")).toBeInTheDocument();
    });

    /**
     * `maxOffset` is the server's own bound; paging past it would be a 400 the
     * reader did nothing to earn.
     */
    it("will not page past the offset the server accepts", () => {
      renderPanel({
        result: result({ rows: rows(100), rowCount: 100, truncated: true }),
        limit: 100,
        offset: 100_000,
      });

      fireEvent.click(screen.getByRole("button", { name: /next page/i }));
      expect(onOffsetChange).not.toHaveBeenCalled();
    });
  });

  /**
   * A page beyond the last row is not the same answer as "this report matched
   * nothing", and rendering an empty table would say the second.
   */
  describe("a page past the end of the report", () => {
    const pastTheEnd: Partial<PanelProps> = {
      result: result({ rows: [], rowCount: 0, truncated: false }),
      limit: 50,
      offset: 100,
    };

    it("says the report ended before here", () => {
      renderPanel(pastTheEnd);

      expect(screen.getByText("Nothing on this page")).toBeInTheDocument();
      expect(screen.getByText(/This report ended before here/)).toBeInTheDocument();
      expect(screen.queryByText("No rows matched")).not.toBeInTheDocument();
    });

    it("leaves a way back to the rows that do exist", () => {
      renderPanel(pastTheEnd);

      const previous = screen.getByRole("button", { name: /previous page/i });
      expect(previous).toBeEnabled();

      fireEvent.click(previous);
      expect(onOffsetChange).toHaveBeenCalledWith(50);
    });
  });

  describe("the returned columns", () => {
    it("labels each one from the source's fields, joined by alias", () => {
      renderPanel({
        result: result({
          columns: [
            NAME_COLUMN,
            { alias: "c1", projection: { kind: "field", field: "amount" }, type: "number" },
            {
              alias: "c2",
              projection: { kind: "aggregate", aggregate: "sum", field: "amount" },
              type: "number",
            },
            { alias: "c3", projection: { kind: "aggregate", aggregate: "count" }, type: "number" },
          ],
          rows: [{ c0: "Acme renewal", c1: 1, c2: 2, c3: 3 }],
        }),
      });

      expect(screen.getByRole("columnheader", { name: "Deal name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Sum of Amount" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Count of rows" })).toBeInTheDocument();
    });

    it("falls back to the raw field name when the source does not describe it", () => {
      renderPanel({
        result: result({
          columns: [{ alias: "c0", projection: { kind: "field", field: "party.gstin" }, type: "text" }],
          rows: [{ c0: "27AAACS1234A1Z5" }],
        }),
        options: [],
      });

      expect(screen.getByRole("columnheader", { name: "party.gstin" })).toBeInTheDocument();
    });

    it("renders each cell by the column's declared type, not the value's", () => {
      renderPanel({
        result: result({
          columns: [
            { alias: "c0", projection: { kind: "field", field: "amount" }, type: "number" },
            { alias: "c1", projection: { kind: "field", field: "closedAt" }, type: "date" },
            { alias: "c2", projection: { kind: "field", field: "isWon" }, type: "boolean" },
            { alias: "c3", projection: { kind: "field", field: "name" }, type: "text" },
          ],
          rows: [
            { c0: "1234", c1: "2026-03-14T00:00:00.000Z", c2: false, c3: null },
          ],
        }),
      });

      expect(screen.getByText("1,234")).toBeInTheDocument();
      expect(screen.getByText(/14\s+\w+\s+2026/)).toBeInTheDocument();
      expect(screen.queryByText("2026-03-14T00:00:00.000Z")).not.toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    /** Zero and false are answers; an empty cell would read as "not measured". */
    it("does not mistake a zero for a missing value", () => {
      renderPanel({
        result: result({
          columns: [
            { alias: "c0", projection: { kind: "aggregate", aggregate: "sum", field: "amount" }, type: "number" },
          ],
          rows: [{ c0: 0 }],
        }),
      });

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });
  });
});
