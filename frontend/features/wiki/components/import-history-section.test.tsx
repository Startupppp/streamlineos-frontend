import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiContractError, ApiError } from "@/lib/api-envelope";
import { ImportHistorySection } from "./import-history-section";

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers: {
  callback: IntersectionCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
}[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    this.entry = { callback, options, observed: [], disconnected: false };
    observers.push(this.entry);
  }
  private entry: (typeof observers)[number];
  observe(element: Element) {
    this.entry.observed.push(element);
  }
  disconnect() {
    this.entry.disconnected = true;
  }
  unobserve() {}
}

function intersect(index = 0) {
  const observer = observers[index];
  if (!observer) throw new Error("no observer was created");
  observer.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
}

jest.mock("@/hooks/api/kb/import-export", () => ({
  useKbImportJobs: jest.fn(),
  useRetryImportJob: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: jest.fn(() => ({ permission: "kb:pages:import", allowed: true, denied: false, pending: false, unavailable: false })),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbFileTextIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/lib/knowledge-routes", () => ({
  KNOWLEDGE_BASE: "/wiki",
}));

const { useKbImportJobs, useRetryImportJob } = jest.requireMock("@/hooks/api/kb/import-export") as {
  useKbImportJobs: jest.Mock;
  useRetryImportJob: jest.Mock;
};
const { usePermissionGate } = jest.requireMock("@/hooks/api/access") as { usePermissionGate: jest.Mock };
const mockRetryMutate = jest.fn();

const mockJob = {
  id: 1,
  orgId: "org-1",
  sourceType: "markdown",
  fileKey: null,
  status: "completed" as const,
  totalItems: 3,
  processedItems: 3,
  succeededItems: 3,
  failedItems: 0,
  duplicateItems: 0,
  canRetry: false,
  errorReport: null,
  createdById: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
  useRetryImportJob.mockReturnValue({ mutate: mockRetryMutate, isPending: false, variables: undefined });
  usePermissionGate.mockReturnValue({ permission: "kb:pages:import", allowed: true, denied: false, pending: false, unavailable: false });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("ImportHistorySection sentinel", () => {
  it("hides cached jobs and Retry when import permission is denied before the jobs query fails", () => {
    usePermissionGate.mockReturnValue({ permission: "kb:pages:import", allowed: false, denied: true, pending: false, unavailable: false });
    useKbImportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "failed", canRetry: true }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("3/3 pages")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry failed pages" })).not.toBeInTheDocument();
  });

  it("keeps cached Retry hidden while import permission is unresolved", () => {
    usePermissionGate.mockReturnValue({ permission: "kb:pages:import", allowed: false, denied: false, pending: true, unavailable: false });
    useKbImportJobs.mockReturnValue({ data: [{ ...mockJob, status: "failed", canRetry: true }], isLoading: false, isError: false, error: null, refetch: jest.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn() });

    render(<ImportHistorySection />);

    expect(screen.queryByText("3/3 pages")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry failed pages" })).not.toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows an access-read error instead of cached Retry when permission lookup fails", () => {
    usePermissionGate.mockReturnValue({ permission: "kb:pages:import", allowed: false, denied: false, pending: false, unavailable: true });
    useKbImportJobs.mockReturnValue({ data: [{ ...mockJob, status: "failed", canRetry: true }], isLoading: false, isError: false, error: null, refetch: jest.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn() });

    render(<ImportHistorySection />);

    expect(screen.getByText("Couldn't check import access")).toBeInTheDocument();
    expect(screen.queryByText("3/3 pages")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry failed pages" })).not.toBeInTheDocument();
  });

  it.each([401, 403, 404])("hides cached import jobs and retry actions after a %i access failure", (status) => {
    useKbImportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "failed", canRetry: true }],
      isLoading: false,
      isError: true,
      isFetchNextPageError: true,
      error: new ApiError("Access lost", status),
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("3/3 pages")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry failed pages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more import jobs" })).not.toBeInTheDocument();
  });

  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
    const fetchNextPage = jest.fn();
    useKbImportJobs.mockReturnValue({
      data: [mockJob],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<ImportHistorySection />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    intersect();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    const fetchNextPage = jest.fn();
    useKbImportJobs.mockReturnValue({
      data: [mockJob],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<ImportHistorySection />);

    expect(screen.getByRole("button", { name: "Load more import jobs" })).toBeInTheDocument();
  });
});

describe("ImportHistorySection read error", () => {
  it("shows the request reference and retries inside the history section", async () => {
    const refetch = jest.fn();
    useKbImportJobs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new ApiContractError("GET /kb/import-jobs", 200, [], "import-request-123"),
      refetch,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load import history");
    expect(screen.getByText("import-request-123")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded imports and retries only the failed later cursor page", async () => {
    const refetch = jest.fn();
    const fetchNextPage = jest.fn();
    useKbImportJobs.mockReturnValue({
      data: [mockJob],
      isLoading: false,
      isError: true,
      isFetchNextPageError: true,
      error: new ApiContractError("GET /kb/import-jobs", 200, [], "import-page-2"),
      refetch,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<ImportHistorySection />);

    expect(screen.getByText("3/3 pages")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load more import jobs")).toBeInTheDocument();
    expect(screen.getByText("import-page-2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more import jobs" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe("ImportHistorySection failed items", () => {
  it("shows failed page titles from a completed partial import", async () => {
    useKbImportJobs.mockReturnValue({
      data: [{
        ...mockJob,
        succeededItems: 1,
        failedItems: 2,
        errorReport: { failedTitles: ["Policy A", "Policy B"] },
      }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    await userEvent.click(screen.getByText("2 failed pages"));
    expect(screen.getByText("Policy A")).toBeInTheDocument();
    expect(screen.getByText("Policy B")).toBeInTheDocument();
  });

  it("keeps repeated failed titles distinct by original item index and shows safe reasons", async () => {
    useKbImportJobs.mockReturnValue({
      data: [{
        ...mockJob,
        succeededItems: 1,
        failedItems: 2,
        errorReport: {
          failedTitles: ["Policy", "Policy"],
          itemErrors: [
            { index: 0, title: "Policy", code: "INVALID_PARENT", reason: "Choose an existing parent and import again." },
            { index: 2, title: "Policy", code: "WRITE_FAILED", reason: "The page could not be saved." },
          ],
        },
      }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);
    await userEvent.click(screen.getByText("2 failed pages"));

    expect(screen.getAllByText("Policy")).toHaveLength(2);
    expect(screen.getByText("Item 1:")).toBeInTheDocument();
    expect(screen.getByText("Item 3:")).toBeInTheDocument();
    expect(screen.getByText("Choose an existing parent and import again.")).toBeInTheDocument();
    expect(screen.getByText("The page could not be saved.")).toBeInTheDocument();
  });

  it("offers Retry only when the server marks the failed job eligible", async () => {
    useKbImportJobs.mockReturnValue({
      data: [
        { ...mockJob, id: 1, canRetry: true, failedItems: 1, errorReport: { failedTitles: ["Policy A"] } },
        { ...mockJob, id: 2, canRetry: false, failedItems: 1, errorReport: { failedTitles: ["Policy B"] } },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    const retryButtons = screen.getAllByRole("button", { name: "Retry failed pages" });
    expect(retryButtons).toHaveLength(1);
    await userEvent.click(retryButtons[0]!);
    expect(mockRetryMutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it("shows manual reconciliation guidance without a retry control", () => {
    useKbImportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "failed", canRetry: false, errorReport: {
        code: "PROGRESS_RECONCILIATION_REQUIRED",
        reason: "Saved import progress cannot be mapped to individual pages. Contact support before retrying the remaining items.",
      } }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ImportHistorySection />);

    expect(screen.getByRole("alert")).toHaveTextContent("Contact support before retrying the remaining items.");
    expect(screen.queryByRole("button", { name: "Retry failed pages" })).not.toBeInTheDocument();
  });
});
