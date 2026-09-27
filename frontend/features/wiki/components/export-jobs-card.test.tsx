import { render, screen, cleanup } from "@testing-library/react";
import { ExportJobsCard } from "./export-jobs-card";

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

jest.mock("@/hooks/api/kb", () => ({
  useKbExportJobs: jest.fn(),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbDownloadIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbFileTextIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

const { useKbExportJobs } = jest.requireMock("@/hooks/api/kb") as {
  useKbExportJobs: jest.Mock;
};

const mockJob = {
  id: 1,
  orgId: "org-1",
  scopeType: "all",
  scopeId: null,
  format: "markdown" as const,
  status: "completed" as const,
  fileKey: null,
  expiresAt: null,
  createdById: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("ExportJobsCard — expiring download indicator", () => {
  const futureIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const pastIso = new Date(Date.now() - 60 * 1000).toISOString();

  it("completed job with future expiresAt shows how long until the file disappears so users know they can still download", () => {
    useKbExportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "completed", expiresAt: futureIso }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ExportJobsCard />);

    expect(screen.getByTestId("export-expiry")).toBeInTheDocument();
    expect(screen.getByTestId("export-expiry").textContent).not.toBe("Expired");
  });

  it("completed job with past expiresAt shows Expired so users know the download window has closed", () => {
    useKbExportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "completed", expiresAt: pastIso }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ExportJobsCard />);

    expect(screen.getByTestId("export-expiry")).toBeInTheDocument();
    expect(screen.getByTestId("export-expiry").textContent).toBe("Expired");
  });

  it("completed job with no expiresAt shows no expiry indicator since the file is kept indefinitely", () => {
    useKbExportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "completed", expiresAt: null }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ExportJobsCard />);

    expect(screen.queryByTestId("export-expiry")).not.toBeInTheDocument();
  });

  it("pending job with a set expiresAt shows no expiry indicator because the export is not ready", () => {
    useKbExportJobs.mockReturnValue({
      data: [{ ...mockJob, status: "pending", expiresAt: futureIso }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ExportJobsCard />);

    expect(screen.queryByTestId("export-expiry")).not.toBeInTheDocument();
  });
});

describe("ExportJobsCard sentinel", () => {
  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
    const fetchNextPage = jest.fn();
    useKbExportJobs.mockReturnValue({
      data: [mockJob],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<ExportJobsCard />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    intersect();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    const fetchNextPage = jest.fn();
    useKbExportJobs.mockReturnValue({
      data: [mockJob],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<ExportJobsCard />);

    expect(screen.getByRole("button", { name: "Load more export jobs" })).toBeInTheDocument();
  });
});
