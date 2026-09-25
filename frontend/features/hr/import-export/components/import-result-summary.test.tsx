import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { importJob } from "./import-fixtures";
import { ImportResultSummary } from "./import-result-summary";

const mockDetail = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({ useHrImportJob: (jobId: string | null) => mockDetail(jobId) }));

const failedRow = (n: number, error: string) => ({ id: `r${n}`, jobId: "job-1", rowNumber: n, payload: {}, status: "error", error, createdRecordRef: null });

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

  it("says only the first ten failed rows are shown, and how many there are", () => {
    const many = Array.from({ length: 15 }, (_, index) => failedRow(index + 1, `Reason ${index + 1}`));
    mockDetail.mockReturnValue({ data: { job: importJob(), errorRows: many }, isLoading: false, isError: false, error: null });

    render(<ImportResultSummary job={importJob({ totalRows: 20, validRows: 5, createdRows: 5, errorRows: 15 })} entityLabel="Documents" />);

    expect(screen.getByText("Failed rows (first 10 of 15)")).toBeInTheDocument();
    expect(screen.getAllByText(/^Row \d+$/)).toHaveLength(10);
  });

  it("says why the failed rows could not be loaded and points to the history", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new ApiError("Server error", 500, "INTERNAL", {}, "/hr/import/jobs/job-1") });

    render(<ImportResultSummary job={importJob({ validRows: 1, createdRows: 1, errorRows: 2, totalRows: 3 })} entityLabel="Documents" />);

    expect(screen.getByText(/also listed in the import history/i)).toBeInTheDocument();
  });
});
