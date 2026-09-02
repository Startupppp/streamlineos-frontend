import { render, screen } from "@testing-library/react";

import { ListTruncationNotice } from "@/components/ui/list-truncation-notice";
import { LoadingState } from "@/components/shared/loading-state";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-client";
import { ApiContractError } from "@/lib/api-envelope";

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(),
}));

import { useOnlineStatus } from "@/hooks/common/use-online-status";

const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<
  typeof useOnlineStatus
>;

function retryPolicy(): (failureCount: number, error: unknown) => boolean {
  const retry = createAppQueryClient("test").getDefaultOptions().queries?.retry;
  if (typeof retry !== "function")
    throw new Error("the query client no longer installs a retry predicate");
  return retry;
}

describe("a read paused by the browser being offline", () => {
  it("announces loading while the connection is up", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    render(<LoadingState variant="list" rows={2} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAccessibleName("Loading...");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("says it is paused, not loading, once the browser goes offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<LoadingState variant="list" rows={2} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAccessibleName(/paused/i);
    expect(region).toHaveTextContent(/offline/i);
  });

  it("stops claiming to be busy while the query is paused", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<LoadingState variant="table" rows={1} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "false");
  });

  it("BITE PROOF — an online skeleton must not carry the offline copy", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    render(<LoadingState variant="table" rows={1} />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it("DataTableSkeleton announces loading while the connection is up", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    const { container } = render(<DataTableSkeleton rows={2} columns={3} />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("DataTableSkeleton says paused rather than spinning for ever when offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    const { container } = render(<DataTableSkeleton rows={2} columns={3} />);
    expect(screen.getByRole("status")).toHaveTextContent(/paused/i);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="false"]')).not.toBeNull();
  });

  it("BITE PROOF — an online DataTableSkeleton must not carry the offline copy", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    render(<DataTableSkeleton rows={1} columns={2} />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});

describe("a capped list says it is capped", () => {
  it("names the cap and how to reach the rest", () => {
    render(<ListTruncationNotice shown={50} hint="Search by name." />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Showing the first 50.");
    expect(notice).toHaveTextContent("Search by name.");
  });

  it("carries a default hint rather than leaving the reader stuck", () => {
    render(<ListTruncationNotice shown={20} />);
    expect(screen.getByRole("status")).toHaveTextContent(/keep typing/i);
  });
});

describe("retry policy", () => {
  it("does not retry a response that failed its contract", () => {
    const error = new ApiContractError("members", 200, [
      { path: "pagination.totalPages", message: "expected number, received undefined" },
    ]);
    expect(retryPolicy()(0, error)).toBe(false);
  });

  it("still retries a 500, which can genuinely succeed on a second attempt", () => {
    expect(retryPolicy()(0, new ApiError("boom", 500))).toBe(true);
  });

  it("still refuses a 403, which never becomes a 200", () => {
    expect(retryPolicy()(0, new ApiError("denied", 403))).toBe(false);
  });
});

describe("a route error that replaced the whole shell", () => {
  const failure = Object.assign(new Error("boom"), { digest: "d1" });

  function noop(): void {
    return;
  }

  it("renders the main landmark the shell would have supplied", () => {
    render(
      <RouteErrorBoundary error={failure} reset={noop} layout="fullscreen" title="Something went wrong" />,
    );
    expect(screen.getByRole("main")).toHaveAccessibleName("Something went wrong");
  });

  it("owns the only h1, because it is the page", () => {
    render(
      <RouteErrorBoundary error={failure} reset={noop} layout="fullscreen" title="Something went wrong" />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
  });

  it("BITE PROOF — the inline boundary sits inside the shell, so it claims neither", () => {
    render(<RouteErrorBoundary error={failure} reset={noop} title="Something went wrong" />);
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});

describe("the data table, which is the loading state for most list pages", () => {
  interface Row {
    id: string;
    name: string;
  }

  function renderTable(): void {
    render(
      <DataTable<Row>
        data={[]}
        columns={[{ key: "name", header: "Name", cell: (row) => row.name }]}
        getRowKey={(row) => row.id}
        isLoading
      />,
    );
  }

  it("announces loading while the connection is up", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderTable();
    expect(screen.getByRole("status")).toHaveTextContent(/loading results/i);
    expect(screen.getByRole("status").parentElement).toHaveAttribute("aria-busy", "true");
  });

  it("says it is paused, not loading, once the browser goes offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderTable();
    expect(screen.getByRole("status")).toHaveTextContent(/paused/i);
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it("stops claiming to be busy while the query is paused", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderTable();
    expect(screen.getByRole("status").parentElement).toHaveAttribute("aria-busy", "false");
  });

  it("BITE PROOF — an online table skeleton must not carry the offline copy", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderTable();
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });
});
