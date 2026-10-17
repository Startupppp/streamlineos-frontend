import { render, screen } from "@testing-library/react";
import { importJob } from "./import-fixtures";
import { JobHistoryTable } from "./job-history-table";

const mockJobs = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({
  useHrImportJobs: () => mockJobs(),
  useHrImportJob: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useRollbackImportJob: () => ({ mutate: jest.fn(), isPending: false }),
}));
const mockAccess = jest.fn(() => "granted");
jest.mock("@/hooks/api/access", () => ({
  useCanState: () => mockAccess(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function history(rows: ReturnType<typeof importJob>[]) {
  mockJobs.mockReturnValue({ data: { data: rows, total: rows.length, pagination: { limit: 20, nextCursor: null, hasMore: false } }, isLoading: false, isFetching: false, isError: false, error: null, refetch: jest.fn() });
}

describe("JobHistoryTable", () => {
  it("shows what a committed job did as new · changed · already there", () => {
    history([importJob({ createdRows: 2, updatedRows: 1, unchangedRows: 3 })]);

    render(<JobHistoryTable />);

    expect(screen.getByText("New · changed · same")).toBeInTheDocument();
    expect(screen.getByText("2 · 1 · 3")).toBeInTheDocument();
  });

  it("shows nothing for a job that has not been committed, where the counts would only be zeros", () => {
    history([importJob({ status: "previewed", createdRows: 0, updatedRows: 0, unchangedRows: 0 })]);

    render(<JobHistoryTable />);

    expect(screen.queryByText("0 · 0 · 0")).not.toBeInTheDocument();
  });

  it("offers the failed rows of a committed job whose only failures were validation failures, which the commit does not count in errorRows", () => {
    history([importJob({ status: "committed", totalRows: 10, validRows: 7, errorRows: 0 })]);

    render(<JobHistoryTable />);

    expect(screen.getByText("Not imported")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View errors" })).toBeInTheDocument();
  });

  it("offers no error view for a job that imported every row", () => {
    history([importJob({ status: "committed", totalRows: 10, validRows: 10, errorRows: 0 })]);

    render(<JobHistoryTable />);

    expect(screen.queryByRole("button", { name: "View errors" })).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("says access is restricted, not that there is no history, when the caller cannot import (FE-47)", () => {
    history([]);
    mockAccess.mockReturnValueOnce("denied");

    render(<JobHistoryTable />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No import history yet")).not.toBeInTheDocument();
  });
});
