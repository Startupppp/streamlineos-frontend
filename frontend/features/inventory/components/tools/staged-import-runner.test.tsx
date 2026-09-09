import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { StagedImportRunner } from "./staged-import-runner";
import type { StagedImportProgress } from "@/hooks/api/inventory/staged-import";

/**
 * The defect this replaces: the import screen sent `preview.sample` to the
 * single-shot job endpoint, and the backend defines that sample as
 * `rows.slice(0, 20)`. A person importing five thousand products got twenty,
 * under a job that reported COMPLETED.
 *
 * So the load-bearing assertion is a count: every data row in the file is
 * staged, not a sample of them. The rest is the honest-states rule — a rejected
 * row is shown with the line number a person sees in their spreadsheet, and a
 * failure says the job is resumable rather than pretending it finished.
 */

const stage = jest.fn();
const open = jest.fn();
const process = jest.fn();

jest.mock("@/hooks/api/inventory/staged-import", () => ({
  ...jest.requireActual("@/hooks/api/inventory/staged-import"),
  useOpenStagedImport: () => ({ mutateAsync: open, isPending: false }),
  useStageImportRows: () => ({ mutateAsync: stage, isPending: false }),
  useProcessImportChunk: () => ({ mutateAsync: process, isPending: false }),
  useCancelStagedImport: () => ({ mutate: jest.fn(), isPending: false }),
  useStagedImportErrors: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  checksumOf: async () => "deadbeefdeadbeef",
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function progress(overrides: Partial<StagedImportProgress> = {}): StagedImportProgress {
  return {
    jobId: 9,
    status: "PROCESSING",
    importType: "products",
    totalRows: 0,
    stagedRows: 0,
    appliedRows: 0,
    failedRows: 0,
    nextRow: 1,
    cancelled: false,
    finished: false,
    chunk: null,
    ...overrides,
  };
}

/** A CSV with `rows` data lines, well past the 20 the old path would have sent. */
function csvOf(rows: number): File {
  const body = Array.from({ length: rows }, (_, index) => `SKU-${index + 1},Widget ${index + 1}`);
  return new File([`sku,name\n${body.join("\n")}`], "products.csv", { type: "text/csv" });
}

afterEach(() => jest.clearAllMocks());

describe("staged import", () => {
  it("stages every data row in the file, not a sample of them", async () => {
    const user = userEvent.setup();
    open.mockResolvedValue(progress({ totalRows: 120 }));
    stage.mockResolvedValue(progress({ totalRows: 120, stagedRows: 120 }));
    process.mockResolvedValue(
      progress({ totalRows: 120, stagedRows: 120, appliedRows: 120, finished: true }),
    );

    renderWithProviders(
      <TooltipProvider>
        <StagedImportRunner file={csvOf(120)} importType="products" onDone={jest.fn()} />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Import all rows/i }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0]?.[0]).toMatchObject({ importType: "products", totalRows: 120 });

    const staged = stage.mock.calls.flatMap(
      (call: [{ rows: Array<{ rowNumber: number }> }]) => call[0].rows,
    );
    expect(staged).toHaveLength(120);
    // 1-based and counting the header, so a rejection cites the line the person
    // sees in their spreadsheet.
    expect(staged[0]?.rowNumber).toBe(2);
    expect(staged[119]?.rowNumber).toBe(121);
  });

  it("keeps calling process until the server says it is finished", async () => {
    const user = userEvent.setup();
    open.mockResolvedValue(progress({ totalRows: 3 }));
    stage.mockResolvedValue(progress({ totalRows: 3, stagedRows: 3 }));
    process
      .mockResolvedValueOnce(progress({ totalRows: 3, appliedRows: 1 }))
      .mockResolvedValueOnce(progress({ totalRows: 3, appliedRows: 2 }))
      .mockResolvedValueOnce(progress({ totalRows: 3, appliedRows: 3, finished: true }));

    renderWithProviders(
      <TooltipProvider>
        <StagedImportRunner file={csvOf(3)} importType="products" onDone={jest.fn()} />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Import all rows/i }));

    // Three turns of the loop, ending only because the server said `finished`.
    // A loop that stopped after the first call would leave the job half applied
    // and the screen would still say it was done.
    await waitFor(() => expect(process).toHaveBeenCalledTimes(3));
    expect(await screen.findByRole("button", { name: /Import another file/i })).toBeInTheDocument();
  });

  it("says the import stopped and can be resumed rather than that it finished", async () => {
    const user = userEvent.setup();
    open.mockResolvedValue(progress({ totalRows: 2 }));
    stage.mockRejectedValue(new Error("Network request failed"));

    renderWithProviders(
      <TooltipProvider>
        <StagedImportRunner file={csvOf(2)} importType="products" onDone={jest.fn()} />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Import all rows/i }));

    expect(await screen.findByText(/The import stopped/i)).toBeInTheDocument();
    expect(screen.getByText(/Rows already applied stay applied/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Resume$/i })).toBeInTheDocument();
  });

  it("refuses a file that cannot be parsed rather than importing it approximately", async () => {
    const user = userEvent.setup();
    const malformed = new File(['sku,name\nSKU-1,"unclosed'], "products.csv", {
      type: "text/csv",
    });

    renderWithProviders(
      <TooltipProvider>
        <StagedImportRunner file={malformed} importType="products" onDone={jest.fn()} />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Import all rows/i }));

    expect(await screen.findByText(/ends inside a quoted field/i)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });
});
