import { render, screen } from "@testing-library/react";
import { importJob } from "./import-fixtures";
import { JobHistoryTable } from "./job-history-table";

const mockJobs = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({
  useHrImportJobs: () => mockJobs(),
  useHrImportJob: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useRollbackImportJob: () => ({ mutate: jest.fn(), isPending: false }),
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
});
