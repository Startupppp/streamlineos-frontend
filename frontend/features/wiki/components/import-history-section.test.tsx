import { render, screen, cleanup } from "@testing-library/react";
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

jest.mock("@/hooks/api/kb", () => ({
  useKbImportJobs: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: jest.fn(() => ({ allowed: true, state: "granted" })),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbFileTextIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/lib/knowledge-routes", () => ({
  KNOWLEDGE_BASE: "/wiki",
}));

const { useKbImportJobs } = jest.requireMock("@/hooks/api/kb") as {
  useKbImportJobs: jest.Mock;
};

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
  errorReport: null,
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

describe("ImportHistorySection sentinel", () => {
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
