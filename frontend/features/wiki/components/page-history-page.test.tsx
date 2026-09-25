import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

const mockSearchParamsGet = jest.fn((_key: string) => null as string | null);

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: mockSearchParamsGet })),
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

const mockVersionTwo = {
  versionNumber: 2,
  title: "Test Page",
  content: {},
  authorName: "Bob",
  changeSummary: "Second edit",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
  mockSearchParamsGet.mockReturnValue(null);

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

describe("PageHistoryPage — current version marker", () => {
  it("marks the highest versionNumber with a Current badge and aria-label", () => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageHistoryPage pageId={1} />);

    expect(
      screen.getByRole("button", { name: "Select version 2 (current)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select version 1 (current)" }),
    ).not.toBeInTheDocument();
  });
});

describe("PageHistoryPage — two-version compare", () => {
  beforeEach(() => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });
    useKbPageVersionDetail.mockImplementation((_pageId: number, versionNumber: number) => ({
      data: versionNumber === 2 ? mockVersionTwo : mockVersion,
      isLoading: false,
    }));
  });

  it("entering compare mode shows the compare UI hint", () => {
    render(<PageHistoryPage pageId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Enter compare mode" }));

    expect(screen.getByRole("button", { name: "Exit compare mode" })).toBeInTheDocument();
    expect(screen.getByText("Select base version")).toBeInTheDocument();
  });

  it("selecting two versions in compare mode renders the two-version diff header", () => {
    render(<PageHistoryPage pageId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Select version 2 (current)" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter compare mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expect(screen.getByText("Version 2 → Version 1")).toBeInTheDocument();
  });
});

describe("PageHistoryPage — page states", () => {
  it("shows skeletons while the page is loading", () => {
    useKbPage.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    const { container } = render(<PageHistoryPage pageId={1} />);

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Select a version to preview")).not.toBeInTheDocument();
  });

  it("shows a retry control when the page fails to load", () => {
    useKbPage.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByText("Failed to load page.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows an empty state when the page has no versions", () => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByText("No versions yet")).toBeInTheDocument();
  });

  it("prompts for a selection before any version is picked", () => {
    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByText("Select a version to preview")).toBeInTheDocument();
  });
});

describe("PageHistoryPage — restore gate", () => {
  beforeEach(() => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });
  });

  it("disables restore for the current version even once its detail has loaded", () => {
    useKbPageVersionDetail.mockReturnValue({ data: mockVersionTwo, isLoading: false });

    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select version 2 (current)" }));

    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
  });

  it("enables restore once a non-current version's detail has loaded", () => {
    useKbPageVersionDetail.mockReturnValue({ data: mockVersion, isLoading: false });

    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expect(screen.getByRole("button", { name: /restore/i })).toBeEnabled();
  });
});

describe("PageHistoryPage — keyboard accessibility", () => {
  it("selects a version on Enter without requiring a pointer click", () => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });
    useKbPageVersionDetail.mockReturnValue({ data: mockVersion, isLoading: false });

    render(<PageHistoryPage pageId={1} />);
    const versionButton = screen.getByRole("button", { name: "Select version 1" });
    fireEvent.keyDown(versionButton, { key: "Enter" });

    expect(screen.queryByText("Select a version to preview")).not.toBeInTheDocument();
  });

  it("gives every version button an accessible name instead of an icon-only control", () => {
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByRole("button", { name: "Select version 2 (current)" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("button", { name: "Select version 1" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});

describe("PageHistoryPage — deep link", () => {
  it("preselects the version named by the ?version= query param", () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === "version" ? "2" : null));
    useKbPageVersionsInfinite.mockReturnValue({
      data: { pages: [{ data: [mockVersionTwo, mockVersion] }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });
    useKbPageVersionDetail.mockReturnValue({ data: mockVersionTwo, isLoading: false });

    render(<PageHistoryPage pageId={1} />);

    expect(
      screen.getByRole("button", { name: "Select version 2 (current)" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
