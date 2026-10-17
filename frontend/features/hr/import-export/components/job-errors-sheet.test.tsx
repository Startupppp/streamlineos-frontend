import { render, screen } from "@testing-library/react";
import { importJob } from "./import-fixtures";
import { SERVER_ERROR_ROW_CAP } from "./import-result-summary";
import { JobErrorsSheet } from "./job-errors-sheet";

const mockDetail = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({
  useHrImportJob: () => mockDetail(),
  useRollbackImportJob: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const row = (n: number, error: string) => ({ id: `r${n}`, orgId: "org-1", jobId: "job-1", rowNumber: n, payload: {}, status: "error", error, createdRecordRef: null });
const rowsOf = (count: number) => Array.from({ length: count }, (_, index) => row(index + 1, `Reason ${index + 1}`));

function open(detail: unknown) {
  mockDetail.mockReturnValue({ data: detail, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  render(<JobErrorsSheet jobId="job-1" open onOpenChange={jest.fn()} />);
}

describe("JobErrorsSheet", () => {
  it("lists a row that failed at commit with its reason, though the job's validation summary never saw it", () => {
    open({ job: importJob({ totalRows: 2, validRows: 1, errorRows: 1, errors: null }), errorRows: [row(2, "No employee has the work email a@b.com.")] });

    expect(screen.getByText(/rows with errors \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("No employee has the work email a@b.com.")).toBeInTheDocument();
  });

  it("falls back to the validation summary when the job has no error rows to show", () => {
    open({ job: importJob({ status: "previewed", errorRows: 1, errors: [{ row: 4, field: "email", message: "Invalid email" }] }), errorRows: [] });

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("says how many more error rows there are than are shown", () => {
    open({ job: importJob({ status: "previewed", totalRows: 60, validRows: 0, errorRows: 60 }), errorRows: rowsOf(2) });

    expect(screen.getByText(/rows with errors \(showing 2 of 60\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/at most/)).not.toBeInTheDocument();
  });

  it("counts a committed job's list as every row not imported, with the failures split by where they happened", () => {
    // 30 rows: 12 written, 3 failed while being written, 15 never passed validation. `errorRows` on the job is only the 3.
    open({ job: importJob({ totalRows: 30, validRows: 12, errorRows: 3 }), errorRows: rowsOf(18) });

    expect(screen.getByText("Rows written")).toBeInTheDocument();
    expect(screen.getByText("Rows written").closest("div")?.nextElementSibling).toHaveTextContent("12");
    expect(screen.getByText("Rows not imported").closest("div")?.nextElementSibling).toHaveTextContent("18");
    expect(screen.getByText("3 failed while being written and 15 did not pass validation.")).toBeInTheDocument();
    expect(screen.getByText(/rows with errors \(18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/listed together, in no particular order/)).toBeInTheDocument();
    expect(screen.queryByText("Error rows")).not.toBeInTheDocument();
    expect(screen.queryByText("All rows processed without errors")).not.toBeInTheDocument();
  });

  it("does not say all rows processed without errors when the only failures were validation failures", () => {
    // Nothing failed while being written, so the job's own `errorRows` is 0 — but two rows never passed validation.
    open({ job: importJob({ totalRows: 10, validRows: 8, errorRows: 0 }), errorRows: [row(3, "Invalid email"), row(8, "Missing hire date")] });

    expect(screen.getByText(/rows with errors \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByText("2 did not pass validation.")).toBeInTheDocument();
    expect(screen.queryByText("All rows processed without errors")).not.toBeInTheDocument();
    expect(screen.queryByText(/listed together/)).not.toBeInTheDocument();
  });

  it("says the server sends at most 50 error rows when a committed job has more, and how many cannot be shown", () => {
    // 300 rows: 100 written, 10 failed while being written, 190 never passed validation, so 200 sit in error.
    open({ job: importJob({ totalRows: 300, validRows: 100, errorRows: 10 }), errorRows: rowsOf(SERVER_ERROR_ROW_CAP) });

    expect(screen.getByText(/rows with errors \(showing 50 of 200\)/i)).toBeInTheDocument();
    expect(screen.getByText(/The server sends at most 50 error rows, so the other 150 cannot be shown/)).toBeInTheDocument();
  });

  it("does not claim a cap when the 50 rows that arrived are all there are", () => {
    open({ job: importJob({ totalRows: 60, validRows: 10, errorRows: 50 }), errorRows: rowsOf(SERVER_ERROR_ROW_CAP) });

    expect(screen.getByText(/rows with errors \(50\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/at most/)).not.toBeInTheDocument();
  });

  it("keeps the validation wording for a job that has not been committed", () => {
    open({ job: importJob({ status: "previewed", totalRows: 5, validRows: 3, errorRows: 2, committedAt: null }), errorRows: rowsOf(2) });

    expect(screen.getByText("Valid rows")).toBeInTheDocument();
    expect(screen.getByText("Error rows")).toBeInTheDocument();
    expect(screen.getByText(/rows with errors \(2\)/i)).toBeInTheDocument();
    expect(screen.queryByText("Rows written")).not.toBeInTheDocument();
    expect(screen.queryByText(/failed while being written/)).not.toBeInTheDocument();
  });

  it("admits the server returned none of the rows it counts as not imported, instead of showing a number over nothing", () => {
    open({ job: importJob({ totalRows: 10, validRows: 6, errorRows: 1 }), errorRows: [] });

    expect(screen.getByText(/4 rows were not imported, but the server returned none of them/)).toBeInTheDocument();
    expect(screen.queryByText(/rows with errors/i)).not.toBeInTheDocument();
    expect(screen.queryByText("All rows processed without errors")).not.toBeInTheDocument();
  });

  it("says all rows were processed without errors when there are none", () => {
    open({ job: importJob({ errorRows: 0 }), errorRows: [] });

    expect(screen.getByText("All rows processed without errors")).toBeInTheDocument();
  });
});
