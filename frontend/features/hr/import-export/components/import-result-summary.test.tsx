import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { importJob } from "./import-fixtures";
import { ImportResultSummary, SERVER_ERROR_ROW_CAP, tallyImportRows } from "./import-result-summary";

const mockDetail = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({ useHrImportJob: (jobId: string | null) => mockDetail(jobId) }));

const failedRow = (n: number, error: string) => ({ id: `r${n}`, orgId: "org-1", jobId: "job-1", rowNumber: n, payload: {}, status: "error", error, createdRecordRef: null });

/** What `GET /hr/import/jobs/:id` sends: every error row, validation and commit failures alike, unlabelled. */
const errorRowsOf = (count: number) => Array.from({ length: count }, (_, index) => failedRow(index + 1, `Reason ${index + 1}`));
const detailWith = (rows: ReturnType<typeof errorRowsOf>) => mockDetail.mockReturnValue({ data: { job: importJob(), errorRows: rows }, isLoading: false, isError: false, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  mockDetail.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
});

describe("ImportResultSummary", () => {
  it("says what a clean commit did, split into new, changed and already there, and asks for no failed rows", () => {
    render(<ImportResultSummary job={importJob({ validRows: 6, createdRows: 2, updatedRows: 1, unchangedRows: 3 })} entityLabel="Documents" />);

    expect(screen.getByText("Imported")).toBeInTheDocument();
    expect(screen.getByText(/6 rows were written, 3 of them already there and unchanged/)).toBeInTheDocument();
    expect(screen.getByText("New").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Changed").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Already there").nextSibling).toHaveTextContent("3");
    expect(mockDetail).toHaveBeenCalledWith(null);
  });

  it("does not call a commit that wrote nothing a success", () => {
    mockDetail.mockReturnValue({ data: { job: importJob(), errorRows: [failedRow(1, "No employee has the work email x@y.com.")] }, isLoading: false, isError: false, error: null });

    render(<ImportResultSummary job={importJob({ status: "failed", totalRows: 1, validRows: 0, errorRows: 1 })} entityLabel="Documents" />);

    expect(screen.getByText("Nothing was imported")).toBeInTheDocument();
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
    expect(screen.getByText(/No employee has the work email x@y\.com\./)).toBeInTheDocument();
  });

  it("lists each failed row with its reason when some rows were written and some failed", () => {
    mockDetail.mockReturnValue({
      data: { job: importJob(), errorRows: [failedRow(2, "No employee has the work email a@b.com."), failedRow(5, "b@c.com is an employee with no user account yet.")] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<ImportResultSummary job={importJob({ totalRows: 6, validRows: 4, createdRows: 4, errorRows: 2 })} entityLabel="Documents" />);

    expect(screen.getByText("Imported with problems")).toBeInTheDocument();
    expect(screen.getByText(/4 rows were written and 2 failed/)).toBeInTheDocument();
    expect(screen.getByText("Row 2")).toBeInTheDocument();
    expect(screen.getByText(/No employee has the work email a@b\.com\./)).toBeInTheDocument();
    expect(screen.getByText("Row 5")).toBeInTheDocument();
    expect(mockDetail).toHaveBeenCalledWith("job-1");
  });

  it("counts the rows that never passed validation, so the numbers add up to the file", () => {
    render(<ImportResultSummary job={importJob({ totalRows: 10, validRows: 6, createdRows: 6, errorRows: 1 })} entityLabel="Documents" />);

    expect(screen.getByText(/3 rows were not imported because they did not pass validation/)).toBeInTheDocument();
  });

  it("says only ten of the rows not imported are shown, and how many there are", () => {
    detailWith(errorRowsOf(15));

    render(<ImportResultSummary job={importJob({ totalRows: 20, validRows: 5, createdRows: 5, errorRows: 15 })} entityLabel="Documents" />);

    expect(screen.getByText("Rows not imported (showing 10 of 15)")).toBeInTheDocument();
    expect(screen.getAllByText(/^Row \d+$/)).toHaveLength(10);
  });

  it("counts the list as every row not imported, not as the commit failures, when validation and commit failures are both in it", () => {
    // 30 rows: 12 written, 3 failed while being written, 15 never passed validation. The server lists all 18 error rows
    // together; the old heading put the "3" over ten rows that were probably validation failures.
    detailWith(errorRowsOf(18));

    render(<ImportResultSummary job={importJob({ totalRows: 30, validRows: 12, createdRows: 12, errorRows: 3 })} entityLabel="Documents" />);

    expect(screen.getByText("Failed to write").nextSibling).toHaveTextContent("3");
    expect(screen.getByText(/15 rows were not imported because they did not pass validation/)).toBeInTheDocument();
    expect(screen.getByText("Rows not imported (showing 10 of 18)")).toBeInTheDocument();
    expect(screen.getByText(/listed together, in no particular order/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Row \d+$/)).toHaveLength(10);
    expect(screen.queryByText(/Failed rows/)).not.toBeInTheDocument();
    expect(screen.queryByText(/of 3\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at most/)).not.toBeInTheDocument();
  });

  it("says the server sends at most 50 error rows when there are more, and how many cannot be shown", () => {
    // 200 rows: 20 written, 5 failed while being written, 175 never passed validation, so 180 sit in error on the server.
    detailWith(errorRowsOf(SERVER_ERROR_ROW_CAP));

    render(<ImportResultSummary job={importJob({ totalRows: 200, validRows: 20, createdRows: 20, errorRows: 5 })} entityLabel="Documents" />);

    expect(screen.getByText("Rows not imported (showing 10 of 180)")).toBeInTheDocument();
    expect(screen.getByText(/The server sends at most 50 of these rows, so the other 130 cannot be shown/)).toBeInTheDocument();
  });

  it("does not claim a cap when exactly 50 rows were not imported and all 50 arrived", () => {
    detailWith(errorRowsOf(SERVER_ERROR_ROW_CAP));

    render(<ImportResultSummary job={importJob({ totalRows: 60, validRows: 10, createdRows: 10, errorRows: 50 })} entityLabel="Documents" />);

    expect(screen.getByText("Rows not imported (showing 10 of 50)")).toBeInTheDocument();
    expect(screen.queryByText(/at most/)).not.toBeInTheDocument();
  });

  it("lists rows that only failed validation, which the Failed card does not count", () => {
    detailWith([failedRow(3, "Invalid email"), failedRow(8, "Missing hire date")]);

    render(<ImportResultSummary job={importJob({ totalRows: 10, validRows: 8, createdRows: 8, errorRows: 0 })} entityLabel="Documents" />);

    expect(mockDetail).toHaveBeenCalledWith("job-1");
    expect(screen.getByText("Imported")).toBeInTheDocument();
    expect(screen.getByText("Failed to write").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Rows not imported (2)")).toBeInTheDocument();
    expect(screen.getByText(/Invalid email/)).toBeInTheDocument();
    expect(screen.queryByText(/listed together/)).not.toBeInTheDocument();
  });

  it("lists why nothing was imported when every row failed validation and none was tried", () => {
    detailWith([failedRow(1, "Invalid email"), failedRow(2, "Invalid email"), failedRow(3, "Missing hire date")]);

    render(<ImportResultSummary job={importJob({ totalRows: 3, validRows: 0, errorRows: 0 })} entityLabel="Documents" />);

    expect(screen.getByText("Nothing was imported")).toBeInTheDocument();
    expect(mockDetail).toHaveBeenCalledWith("job-1");
    expect(screen.getByText("Rows not imported (3)")).toBeInTheDocument();
    expect(screen.getByText(/Missing hire date/)).toBeInTheDocument();
  });

  it("says why the failed rows could not be loaded and points to the history", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new ApiError("Server error", 500, "INTERNAL", {}, "/hr/import/jobs/job-1") });

    render(<ImportResultSummary job={importJob({ validRows: 1, createdRows: 1, errorRows: 2, totalRows: 3 })} entityLabel="Documents" />);

    expect(screen.getByText(/also listed in the import history/i)).toBeInTheDocument();
  });
});

describe("tallyImportRows", () => {
  it("reads the counters as validation results before a commit", () => {
    const tally = tallyImportRows(importJob({ status: "previewed", totalRows: 5, validRows: 3, errorRows: 2 }));

    expect(tally).toEqual({ committed: false, written: 0, failedWhileWriting: 0, failedValidation: 2, notImported: 2 });
  });

  it("splits a committed job into written, failed while being written and failed validation, which add up to the file", () => {
    const tally = tallyImportRows(importJob({ status: "committed", totalRows: 30, validRows: 12, errorRows: 3 }));

    expect(tally).toEqual({ committed: true, written: 12, failedWhileWriting: 3, failedValidation: 15, notImported: 18 });
    expect(tally.written + tally.notImported).toBe(30);
  });

  it("treats a failed and a rolled back job as committed too, and never reports a negative validation count", () => {
    expect(tallyImportRows(importJob({ status: "failed", totalRows: 4, validRows: 0, errorRows: 4 })).committed).toBe(true);
    expect(tallyImportRows(importJob({ status: "rolled_back", totalRows: 4, validRows: 4, errorRows: 0 })).committed).toBe(true);
    expect(tallyImportRows(importJob({ status: "committed", totalRows: 6, validRows: 6, errorRows: 60 }))).toMatchObject({ failedValidation: 0, notImported: 60 });
  });
});
