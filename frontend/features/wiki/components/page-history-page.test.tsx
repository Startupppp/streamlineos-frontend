import React from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
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
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    refresh: mockRouterRefresh,
  }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    backHref,
  }: {
    children: React.ReactNode;
    backHref?: string;
  }) => <div data-back-href={backHref}>{children}</div>,
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPage: jest.fn(),
}));

jest.mock("@/hooks/api/kb/page-versions", () => ({
  useKbPageVersionsInfinite: jest.fn(),
  useKbPageVersionDetail: jest.fn(),
  useRestoreKbVersion: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbArrowRightIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbClockIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbRotateCcwIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/lib/knowledge-routes", () => ({
  pageHref: (id: number) => `/wiki/pages/${id}`,
  projectPageHref: (projectId: number, pageId: number) =>
    `/build/${projectId}/wiki/${pageId}`,
  KNOWLEDGE_BASE: "/wiki",
}));

jest.mock("lucide-react", () => ({
  GitCompare: ({ className }: { className?: string }) => <span className={className} />,
  Loader2: ({ className }: { className?: string }) => <span className={className} />,
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
const { useCan: mockUseCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

function tipTapDoc(...paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

const CURRENT_PAGE_CONTENT = tipTapDoc("Kept paragraph", "Only in current");
const VERSION_ONE_CONTENT = tipTapDoc("Kept paragraph", "Only in version");

const mockVersion = {
  versionNumber: 1,
  title: "Test Page",
  content: VERSION_ONE_CONTENT,
  authorName: "Alice",
  changeSummary: null,
  createdAt: new Date().toISOString(),
};

const mockVersionTwo = {
  versionNumber: 2,
  title: "Test Page",
  content: CURRENT_PAGE_CONTENT,
  authorName: "Bob",
  changeSummary: null,
  createdAt: new Date().toISOString(),
};

function mockVersionList(
  data: (typeof mockVersion)[],
  extra: { hasNextPage?: boolean; fetchNextPage?: jest.Mock } = {},
) {
  useKbPageVersionsInfinite.mockReturnValue({
    data: { pages: [{ data }] },
    isLoading: false,
    hasNextPage: extra.hasNextPage ?? false,
    isFetchingNextPage: false,
    fetchNextPage: extra.fetchNextPage ?? jest.fn(),
  });
}

function mockBothVersions() {
  mockVersionList([mockVersionTwo, mockVersion]);
}

function mockDetailPerVersion() {
  useKbPageVersionDetail.mockImplementation((_pageId: number, versionNumber: number) => ({
    data: versionNumber === 2 ? mockVersionTwo : mockVersion,
    isLoading: false,
  }));
}

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
  mockSearchParamsGet.mockReturnValue(null);

  useKbPage.mockReturnValue({
    data: { id: 1, title: "Test Page", content: CURRENT_PAGE_CONTENT },
    isLoading: false,
    isError: false,
  });

  mockVersionList([mockVersion], { hasNextPage: true });

  useKbPageVersionDetail.mockReturnValue({ data: null, isLoading: false });

  useRestoreKbVersion.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCan.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("PageHistoryPage sentinel", () => {
  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
    const fetchNextPage = jest.fn();
    mockVersionList([mockVersion], { hasNextPage: true, fetchNextPage });

    render(<PageHistoryPage pageId={1} />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    intersect();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("returns to the knowledge document when no project scopes the history", () => {
    const { container } = render(<PageHistoryPage pageId={7} />);

    expect(
      container.querySelector("[data-back-href]")?.getAttribute("data-back-href"),
    ).toBe("/wiki/pages/7");
  });

  it("returns to the project wiki document so a project-scoped history keeps its project", () => {
    const { container } = render(<PageHistoryPage pageId={7} projectId={42} />);

    expect(
      container.querySelector("[data-back-href]")?.getAttribute("data-back-href"),
    ).toBe("/build/42/wiki/7");
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByRole("button", { name: "Load more versions" })).toBeInTheDocument();
  });
});

describe("PageHistoryPage — current version marker", () => {
  it("marks the highest versionNumber with a Current badge and aria-label", () => {
    mockBothVersions();

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
    mockBothVersions();
    mockDetailPerVersion();
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
    mockVersionList([]);

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
    mockBothVersions();
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

  it("disables restore when the viewer lacks kb:pages:update so the action fails closed before a server 403", () => {
    mockUseCan.mockReturnValue(false);
    useKbPageVersionDetail.mockReturnValue({ data: mockVersion, isLoading: false });

    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
  });
});

describe("PageHistoryPage — keyboard accessibility", () => {
  it("selects a version on Enter without requiring a pointer click", () => {
    mockBothVersions();
    useKbPageVersionDetail.mockReturnValue({ data: mockVersion, isLoading: false });

    render(<PageHistoryPage pageId={1} />);
    const versionButton = screen.getByRole("button", { name: "Select version 1" });
    fireEvent.keyDown(versionButton, { key: "Enter" });

    expect(screen.queryByText("Select a version to preview")).not.toBeInTheDocument();
  });

  it("gives every version button an accessible name instead of an icon-only control", () => {
    mockBothVersions();

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
  const HISTORY_PATH = "/knowledge/wiki/doc/1/history";

  function linkParams(params: { version?: string; compare?: string }) {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "version" ? (params.version ?? null) : key === "compare" ? (params.compare ?? null) : null,
    );
  }

  function expectUrlWritten(query: string) {
    expect(mockRouterReplace).toHaveBeenCalledWith(`${HISTORY_PATH}${query}`, {
      scroll: false,
    });
  }

  beforeEach(() => {
    window.history.replaceState({}, "", HISTORY_PATH);
    mockBothVersions();
    mockDetailPerVersion();
  });

  it("preselects the version named by the ?version= query param", () => {
    linkParams({ version: "2" });

    render(<PageHistoryPage pageId={1} />);

    expect(
      screen.getByRole("button", { name: "Select version 2 (current)" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Select version 1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("falls back to the server-rendered initialVersion when the client search params are empty", () => {
    render(<PageHistoryPage pageId={1} initialVersion={1} />);

    expect(screen.getByRole("button", { name: "Select version 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("writes the picked version back into the URL so the selection is shareable", () => {
    render(<PageHistoryPage pageId={1} />);

    expect(mockRouterReplace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expectUrlWritten("?version=1");
  });

  it("round trips: a ?version=2 link selects version 2, and picking version 1 rewrites the URL to ?version=1", () => {
    linkParams({ version: "2" });

    render(<PageHistoryPage pageId={1} />);

    expect(
      screen.getByRole("button", { name: "Select version 2 (current)" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expectUrlWritten("?version=1");
    expect(screen.getByRole("button", { name: "Select version 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Select version 2 (current)" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("opens compare mode from a ?version=1&compare=2 link with both sides selected", () => {
    linkParams({ version: "1", compare: "2" });

    render(<PageHistoryPage pageId={1} />);

    expect(screen.getByRole("button", { name: "Exit compare mode" })).toBeInTheDocument();
    expect(screen.getByText("Version 1 vs Version 2")).toBeInTheDocument();
  });

  it("writes both halves back as ?version=2&compare=1 when a compare version is picked", () => {
    linkParams({ version: "2" });

    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Enter compare mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));

    expectUrlWritten("?version=2&compare=1");
  });

  it("drops the compare half from the URL when compare mode is exited", () => {
    linkParams({ version: "1", compare: "2" });

    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Exit compare mode" }));

    expectUrlWritten("?version=1");
  });
});

describe("PageHistoryPage — restore preview", () => {
  beforeEach(() => {
    mockBothVersions();
    useKbPageVersionDetail.mockReturnValue({ data: mockVersion, isLoading: false });
  });

  function selectRestorableVersion() {
    render(<PageHistoryPage pageId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select version 1" }));
  }

  function openRestoreConfirmation() {
    selectRestorableVersion();
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    return screen.getByRole("alertdialog");
  }

  it("reaches an enabled restore control with no confirmation open yet", () => {
    selectRestorableVersion();

    expect(screen.getByRole("button", { name: /restore/i })).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Preview: how this page changes when version 1 is restored",
      ),
    ).not.toBeInTheDocument();
  });

  it("carries a diff preview inside the confirmation, not only an are-you-sure prompt", () => {
    const dialog = openRestoreConfirmation();

    expect(within(dialog).getByText("Restore version 1?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "The current content will be saved as a new version before restoring.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Preview: how this page changes when version 1 is restored",
      ),
    ).toBeInTheDocument();
  });

  it("previews in the restore direction, striking through the current page text that the restore replaces", () => {
    const dialog = openRestoreConfirmation();

    expect(within(dialog).getByText("Only in current")).toHaveClass("line-through");
    expect(within(dialog).getByText("Only in version")).toBeInTheDocument();
    expect(within(dialog).getByText("1 changed")).toBeInTheDocument();
  });

  it("previews a no-op restore as changing nothing rather than showing an empty panel", () => {
    useKbPageVersionDetail.mockReturnValue({
      data: { ...mockVersion, content: CURRENT_PAGE_CONTENT },
      isLoading: false,
    });

    const dialog = openRestoreConfirmation();

    expect(
      within(dialog).getByText(
        "Restoring changes nothing — this version matches the current page.",
      ),
    ).toBeInTheDocument();
  });

  it("still sends the previewed version number to the restore mutation when confirmed", () => {
    const mutate = jest.fn();
    useRestoreKbVersion.mockReturnValue({ mutate, isPending: false });

    const dialog = openRestoreConfirmation();
    fireEvent.click(within(dialog).getByRole("button", { name: "Restore" }));

    expect(mutate).toHaveBeenCalledWith(
      { pageId: 1, versionNumber: 1 },
      expect.anything(),
    );
  });
});
