import { render, screen } from "@testing-library/react";
import { importJob } from "./import-fixtures";
import { JobErrorsSheet } from "./job-errors-sheet";

const mockDetail = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({
  useHrImportJob: () => mockDetail(),
  useRollbackImportJob: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const row = (n: number, error: string) => ({ id: `r${n}`, jobId: "job-1", rowNumber: n, payload: {}, status: "error", error, createdRecordRef: null });

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
    const shown = Array.from({ length: 2 }, (_, index) => row(index + 1, `Reason ${index + 1}`));
    open({ job: importJob({ errorRows: 60 }), errorRows: shown });

    expect(screen.getByText(/rows with errors \(2 of 60\)/i)).toBeInTheDocument();
  });

  it("says all rows were processed without errors when there are none", () => {
    open({ job: importJob({ errorRows: 0 }), errorRows: [] });

    expect(screen.getByText("All rows processed without errors")).toBeInTheDocument();
  });
});
