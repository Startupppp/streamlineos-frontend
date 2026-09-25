import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import PageHistoryPage from "./page-history-page";

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

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: () => null })),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPage: jest.fn(),
}));

jest.mock("@/hooks/api/kb/page-versions", () => ({
  useKbPageVersionsInfinite: jest.fn(),
  useKbPageVersionDetail: jest.fn(),
  useRestoreKbVersion: jest.fn(),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbArrowRightIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbClockIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbRotateCcwIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/features/wiki/lib/version-diff", () => ({
  computeVersionDiff: jest.fn(() => ({
    titleChanged: false,
    addedCount: 0,
    removedCount: 0,
    changedCount: 0,
    oldTitle: "",
    newTitle: "",
    blocks: [],
  })),
}));

jest.mock("@/lib/knowledge-routes", () => ({
  pageHref: (id: number) => `/wiki/pages/${id}`,
  KNOWLEDGE_BASE: "/wiki",
}));

jest.mock("lucide-react", () => ({
  GitCompare: ({ className }: { className?: string }) => <span className={className} />,
}));

const { useKbPage } = jest.requireMock("@/hooks/api/kb/pages") as { useKbPage: jest.Mock };
const {
  useKbPageVersionsInfinite,
  useKbPageVersionDetail,
  useRestoreKbVersion,
} = jest.requireMock("@/hooks/api/kb/page-versions") as {
  useKbPageVersionsInfinite: jest.Mock;
  useKbPageVersionDetail: jest.Mock;
  useRestoreKbVersion: jest.Mock;
};

const mockVersion = {
  versionNumber: 1,
  title: "Test Page",
  content: {},
  authorName: "Alice",
  changeSummary: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();

  useKbPage.mockReturnValue({
    data: { id: 1, title: "Test Page", content: {} },
    isLoading: false,
    isError: false,
  });

  useKbPageVersionsInfinite.mockReturnValue({
    data: { pages: [{ data: [mockVersion] }] },
    isLoading: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });

  useKbPageVersionDetail.mockReturnValue({ data: null, isLoading: false });

  useRestoreKbVersion.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("PageHistoryPage sentinel", () => {
  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
    const fetchNextPage = jest.fn();
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersion] }] },
      isLoading: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<PageHistoryPage pageId={1} />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    intersect();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByRole("button", { name: "Load more versions" })).toBeInTheDocument();
  });
});
