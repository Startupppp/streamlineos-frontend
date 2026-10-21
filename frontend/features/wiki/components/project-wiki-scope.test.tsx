import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageDocumentToolbar } from "./page-document-toolbar";
import PageHistorySheet from "./page-history-sheet";
import PageTree from "./page-tree";
import type { KbPageDetail, KbPageTreeNode } from "@/hooks/api/kb/page-types";
import { ApiError } from "@/lib/api-envelope";

const routerPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  usePathname: () => "/build/7/wiki/42",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const duplicateMutate = jest.fn();
const createPageMutate = jest.fn();
const updatePageMutate = jest.fn();

const ROOT_NODE: KbPageTreeNode = {
  id: 42,
  contentRevision: 3,
  parentPageId: null,
  spaceId: null,
  projectId: 7,
  title: "Deployment runbook",
  icon: null,
  sortOrder: 1,
  hasChildren: true,
  visibility: "org",
  createdById: null,
  status: "published",
  kind: "document",
};

const CHILD_NODE: KbPageTreeNode = {
  ...ROOT_NODE,
  id: 108,
  parentPageId: 42,
  title: "Rollback steps",
  hasChildren: false,
};

let rootNode = ROOT_NODE;
let rootLevelOverride: Record<string, unknown> | null = null;
let childLevelOverride: Record<string, unknown> | null = null;
let historyListOverride: Record<string, unknown> | null = null;
let historyDetailOverride: Record<string, unknown> | null = null;
const mockChildLevelRequest = jest.fn();

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty, error }: { isLoading: boolean; isError: boolean; isEmpty?: boolean; error?: unknown }) =>
    isLoading ? { kind: "loading" } : isError ? { kind: "error", error } : isEmpty ? { kind: "empty" } : { kind: "ready" },
}));

function treeLevel(nodes: KbPageTreeNode[]) {
  return {
    data: {
      pages: [
        { data: nodes, pagination: { limit: 50, nextCursor: null, hasMore: false } },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  };
}

jest.mock("@/hooks/api/kb", () => ({
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn() }),
  useDuplicateKbPage: () => ({ mutate: duplicateMutate }),
  useLockKbPage: () => ({ mutate: jest.fn() }),
  useKbPageBacklinks: () => ({ data: [] }),
  useCreateKbPage: () => ({ mutate: createPageMutate, isPending: false }),
  useDeleteKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateKbPage: () => ({ mutate: updatePageMutate, isPending: false }),
  useKbPageTreeInfinite: () => rootLevelOverride ?? treeLevel([rootNode]),
  useKbPageChildrenLevel: (pageId: number, enabled: boolean, spaceId?: number, projectId?: number) => {
    mockChildLevelRequest(pageId, enabled, spaceId, projectId);
    return enabled
      ? childLevelOverride ?? treeLevel([CHILD_NODE])
      : { ...treeLevel([]), data: undefined };
  },
  useKbPageVersionsInfinite: () => historyListOverride ?? ({
    data: {
      pages: [
        {
          data: [
            {
              id: 1,
              versionNumber: 3,
              title: "Runbook",
              authorName: "Alice",
              changeSummary: null,
              createdAt: "2026-09-01T10:00:00.000Z",
            },
            {
              id: 2,
              versionNumber: 2,
              title: "Earlier runbook",
              authorName: "Bob",
              changeSummary: null,
              createdAt: "2026-08-01T10:00:00.000Z",
            },
          ],
          pagination: { limit: 50, nextCursor: null, hasMore: false },
        },
      ],
    },
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  }),
  useKbPageVersionDetail: () => historyDetailOverride ?? ({
    data: {
      title: "Earlier runbook",
      content: { type: "doc", content: [] },
      authorName: "Bob",
      createdAt: "2026-08-01T10:00:00.000Z",
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useRestoreKbVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./kb-page-ai-actions", () => ({
  KbPageAiActions: () => <button type="button" aria-label="AI" />,
}));

jest.mock("./page-share-popover", () => ({
  __esModule: true,
  default: () => <button type="button" aria-label="Share file" />,
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: () => ({ mutate: jest.fn() }),
}));

const page = {
  id: 5,
  title: "Runbook",
  isFavorite: false,
  isLocked: false,
  coverImage: null,
} as KbPageDetail;

function noop() {}

function renderToolbar(onNavigate: (pageId: number) => void) {
  return render(
    <PageDocumentToolbar
      page={page}
      pageId={5}
      isEditable
      onOpenMetaSheet={noop}
      onOpenComments={noop}
      onOpenHistory={noop}
      onOpenMove={noop}
      onOpenSaveAsTemplate={noop}
      onOpenCover={noop}
      onOpenLinkedRecords={noop}
      onDelete={noop}
      onNavigate={onNavigate}
    />,
  );
}

async function openDuplicateItem() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More options" }));
  await user.click(screen.getByRole("menuitem", { name: /duplicate/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  rootNode = ROOT_NODE;
  rootLevelOverride = null;
  childLevelOverride = null;
  historyListOverride = null;
  historyDetailOverride = null;
});

describe("project wiki read path stays inside the project", () => {
  it("routes a duplicated page through the caller's navigator instead of the global knowledge URL", async () => {
    const onNavigate = jest.fn();
    renderToolbar(onNavigate);

    await openDuplicateItem();

    expect(duplicateMutate).toHaveBeenCalledTimes(1);
    const handlers = duplicateMutate.mock.calls[0]?.[1] as {
      onSuccess: (dup: { id: number }) => void;
    };
    handlers.onSuccess({ id: 99 });

    expect(onNavigate).toHaveBeenCalledWith(99);
    expect(routerPush).not.toHaveBeenCalled();
  });
});

describe("project wiki history path stays inside the project", () => {
  it("shows a first-read versions failure with retry instead of a false empty state", async () => {
    const refetch = jest.fn();
    historyListOverride = { data: undefined, isLoading: false, isError: true, isFetchNextPageError: false, error: new Error("offline"), refetch, hasNextPage: false, fetchNextPage: jest.fn(), isFetchingNextPage: false };
    const user = userEvent.setup();
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    expect(screen.queryByText("No versions yet")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded versions and pauses automatic paging after a later-page failure", async () => {
    const fetchNextPage = jest.fn();
    historyListOverride = {
      data: { pages: [{ data: [{ id: 1, versionNumber: 3, title: "Runbook", authorName: "Alice", changeSummary: null, createdAt: "2026-09-01T10:00:00.000Z" }], pagination: { limit: 50, nextCursor: "later", hasMore: true } }] },
      isLoading: false, isError: true, isFetchNextPageError: true, error: new Error("offline"), refetch: jest.fn(), hasNextPage: true, fetchNextPage, isFetchingNextPage: false,
    };
    const user = userEvent.setup();
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: /Version 3/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more versions" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry loading versions" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("hides cached versions when access is revoked during a refresh", () => {
    historyListOverride = {
      data: { pages: [{ data: [{ id: 1, versionNumber: 3, title: "Runbook", authorName: "Alice", changeSummary: null, createdAt: "2026-09-01T10:00:00.000Z" }], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
      isLoading: false, isError: true, isFetchNextPageError: false, error: new ApiError("Access denied", 403), refetch: jest.fn(), hasNextPage: false, fetchNextPage: jest.fn(), isFetchingNextPage: false,
    };
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    expect(screen.queryByRole("button", { name: /Version 3/ })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows a selected-version read failure with retry instead of Empty version", async () => {
    const refetch = jest.fn();
    historyDetailOverride = { data: undefined, isLoading: false, isError: true, error: new Error("offline"), refetch };
    const user = userEvent.setup();
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /Version 2/ }));

    expect(screen.queryByText("Empty version")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No content to restore" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("hides cached selected-version metadata after access is revoked", async () => {
    historyDetailOverride = {
      data: { title: "Private version", content: { type: "doc", content: [] }, authorName: "Secret author", changeSummary: "Sensitive restoration summary", createdAt: "2026-08-01T10:00:00.000Z" },
      isLoading: false,
      isError: true,
      error: new ApiError("Access denied", 403),
      refetch: jest.fn(),
    };
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Version 2/ }));

    expect(screen.queryByText("Secret author")).not.toBeInTheDocument();
    expect(screen.queryByText("Sensitive restoration summary")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("hides a selected cached version when the versions list loses access", async () => {
    historyListOverride = {
      data: { pages: [{ data: [{ id: 2, versionNumber: 2, title: "Earlier runbook", authorName: "Bob", changeSummary: null, createdAt: "2026-08-01T10:00:00.000Z" }], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    };
    const view = render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Version 2/ }));
    historyListOverride = { ...historyListOverride, isError: true, error: new ApiError("Access denied", 403) };
    view.rerender(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    expect(screen.queryByText("Earlier runbook")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /version 2/i })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("offers no link to the global knowledge history when the page is opened inside a project", () => {
    render(
      <PageHistorySheet pageId={5} open onOpenChange={jest.fn()} projectId={7} />,
    );

    expect(screen.queryByRole("link", { name: /full history/i })).toBeNull();
  });

  it("still offers the full history link outside a project, so the absence above is a scoping decision and not a missing element", () => {
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    expect(
      screen.getByRole("link", { name: /full history/i }),
    ).toHaveAttribute("href", "/knowledge/wiki/doc/5/history");
  });

  it("takes a selected project version to its project-scoped preview before restore", async () => {
    const user = userEvent.setup();
    render(
      <PageHistorySheet pageId={5} open onOpenChange={jest.fn()} projectId={7} />,
    );

    await user.click(screen.getByRole("button", { name: /Version 2/ }));

    expect(
      screen.getByRole("link", { name: "Preview and restore version 2" }),
    ).toHaveAttribute("href", "/build/7/wiki/5/history?version=2");
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("takes a selected global version to its global preview before restore", async () => {
    const user = userEvent.setup();
    render(<PageHistorySheet pageId={5} open onOpenChange={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /Version 2/ }));

    expect(
      screen.getByRole("link", { name: "Preview and restore version 2" }),
    ).toHaveAttribute("href", "/knowledge/wiki/doc/5/history?version=2");
  });
});

describe("project wiki page tree links stay inside the project", () => {
  it("shows the root tree request reference and retries a failed first read", async () => {
    const refetch = jest.fn();
    rootLevelOverride = {
      ...treeLevel([]),
      data: undefined,
      isError: true,
      error: new ApiError("Read failed", 500, "INTERNAL", { correlationId: "root-tree-first" }, "/kb/pages/tree"),
      refetch,
    };
    const user = userEvent.setup();

    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    expect(screen.getByText("Couldn't load files")).toBeInTheDocument();
    expect(screen.getByText("root-tree-first")).toBeInTheDocument();
    expect(screen.queryByText("No files yet")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded root pages and retries only a failed later tree page", async () => {
    const refetch = jest.fn();
    const fetchNextPage = jest.fn();
    rootLevelOverride = {
      ...treeLevel([rootNode]),
      isError: true,
      isFetchNextPageError: true,
      error: new ApiError("Read failed", 500, "INTERNAL", { correlationId: "root-tree-later" }, "/kb/pages/tree"),
      refetch,
      hasNextPage: true,
      fetchNextPage,
    };
    const user = userEvent.setup();

    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    expect(screen.getByRole("link", { name: /deployment runbook/i })).toBeInTheDocument();
    expect(screen.getByText("Couldn't load more files")).toBeInTheDocument();
    expect(screen.getByText("root-tree-later")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more files" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("hides cached root pages after the tree read reports lost access", () => {
    rootLevelOverride = {
      ...treeLevel([rootNode]),
      isError: true,
      error: new ApiError("Access revoked", 403, "FORBIDDEN", { correlationId: "root-tree-denied" }, "/kb/pages/tree"),
    };

    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    expect(screen.queryByRole("link", { name: /deployment runbook/i })).not.toBeInTheDocument();
    expect(screen.getByText("root-tree-denied")).toBeInTheDocument();
  });

  it("loads space children only after expansion and keeps the space scope", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    expect(mockChildLevelRequest).toHaveBeenCalledWith(42, false, 5, undefined);
    expect(screen.queryByRole("link", { name: "Rollback steps" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(mockChildLevelRequest).toHaveBeenCalledWith(42, true, 5, undefined);
    expect(screen.getByRole("link", { name: "Rollback steps" })).toBeInTheDocument();
  });

  it("shows a loading state while an expanded child level is pending", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    childLevelOverride = { ...treeLevel([]), data: undefined, isLoading: true };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByRole("status")).toHaveTextContent("Loading child files");
  });

  it("keeps a failed child level visible with its reference and retry", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    const refetch = jest.fn();
    childLevelOverride = {
      ...treeLevel([]),
      data: undefined,
      isError: true,
      error: new ApiError("Read failed", 500, "INTERNAL", { correlationId: "tree-request-1" }, "/kb/pages/tree"),
      refetch,
    };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Read failed");
    expect(screen.getByText("tree-request-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry child files" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded children and retries only a failed later child page", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    const refetch = jest.fn();
    const fetchNextPage = jest.fn();
    childLevelOverride = {
      ...treeLevel([CHILD_NODE]),
      isError: true,
      isFetchNextPageError: true,
      error: new ApiError("Read failed", 500, "INTERNAL", { correlationId: "child-tree-later" }, "/kb/pages/tree"),
      refetch,
      hasNextPage: true,
      fetchNextPage,
    };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByRole("link", { name: "Rollback steps" })).toBeInTheDocument();
    expect(screen.getByText("child-tree-later")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more child files" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry child files" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])("hides cached children after a %i child-level read", async (status) => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    childLevelOverride = {
      ...treeLevel([CHILD_NODE]),
      isError: true,
      error: new ApiError("Access lost", status, "ACCESS_LOST", { correlationId: `child-tree-${status}` }, "/kb/pages/tree"),
      hasNextPage: true,
    };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.queryByRole("link", { name: "Rollback steps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more child files" })).not.toBeInTheDocument();
    expect(screen.getByText(`child-tree-${status}`)).toBeInTheDocument();
  });

  it("keeps page actions discoverable at touch widths and reachable by keyboard on desktop", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    const addChild = screen.getByRole("button", { name: "Add child file" });
    const pageOptions = screen.getByRole("button", { name: "File options" });
    expect(addChild).toHaveClass("h-8", "w-8");
    expect(pageOptions).toHaveClass("h-8", "w-8");
    expect(pageOptions.parentElement).toHaveClass("flex", "lg:hidden", "lg:group-focus-within:flex");
    expect(pageOptions.parentElement).not.toHaveClass("hidden");

    screen.getByRole("link", { name: "Deployment runbook" }).focus();
    await user.tab();
    expect(addChild).toHaveFocus();
    await user.tab();
    expect(pageOptions).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
  });

  it("creates a child with the parent page's project scope", async () => {
    const user = userEvent.setup();
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    await user.click(screen.getByRole("button", { name: "Add child file" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    expect(createPageMutate).toHaveBeenCalledWith(
      { parentPageId: 42, projectId: 7, kind: "document" },
      expect.any(Object),
    );
  });

  it("creates a nested child with its parent page's project scope", async () => {
    const user = userEvent.setup();
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    await user.click(screen.getByRole("button", { name: "Expand" }));
    await user.click(screen.getAllByRole("button", { name: "Add child file" })[1]);
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    expect(createPageMutate).toHaveBeenCalledWith(
      { parentPageId: 108, projectId: 7, kind: "document" },
      expect.any(Object),
    );
  });

  it("creates a child with the parent page's space scope", async () => {
    rootNode = { ...ROOT_NODE, spaceId: 5, projectId: null };
    const user = userEvent.setup();
    render(<PageTree spaceId={5} />);

    await user.click(screen.getByRole("button", { name: "Add child file" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    expect(createPageMutate).toHaveBeenCalledWith(
      { parentPageId: 42, spaceId: 5, kind: "document" },
      expect.any(Object),
    );
  });

  it("omits container scope when the parent page has none", async () => {
    rootNode = { ...ROOT_NODE, projectId: null };
    const user = userEvent.setup();
    render(<PageTree />);

    await user.click(screen.getByRole("button", { name: "Add child file" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    expect(createPageMutate).toHaveBeenCalledWith(
      { parentPageId: 42, kind: "document" },
      expect.any(Object),
    );
  });

  it("sends the tree node revision when renaming a page", async () => {
    const user = userEvent.setup();
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    await user.click(screen.getByRole("button", { name: "File options" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Updated runbook{Enter}");

    expect(updatePageMutate).toHaveBeenCalledWith(
      { pageId: 42, title: "Updated runbook", expectedContentRevision: 3 },
      expect.any(Object),
    );
  });

  it("renders a root page link under the project wiki base href rather than the global knowledge base when baseHref is supplied", () => {
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    expect(
      screen.getByRole("link", { name: /deployment runbook/i }),
    ).toHaveAttribute("href", "/build/7/wiki/42");
  });

  it("renders the same root page link under the global knowledge base when no baseHref is supplied, so the project-scoped assertion above proves the prop is honoured and not that the default changed", () => {
    render(<PageTree />);

    expect(
      screen.getByRole("link", { name: /deployment runbook/i }),
    ).toHaveAttribute("href", "/knowledge/wiki/doc/42");
  });

  it("renders an expanded child page link under the project wiki base href, so the scope survives recursion into descendants", async () => {
    const user = userEvent.setup();
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(
      screen.getByRole("link", { name: /rollback steps/i }),
    ).toHaveAttribute("href", "/build/7/wiki/108");
  });

  it("renders the expanded child page link under the global knowledge base when no baseHref is supplied, pairing the recursive project-scope assertion with its control", async () => {
    const user = userEvent.setup();
    render(<PageTree />);

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(
      screen.getByRole("link", { name: /rollback steps/i }),
    ).toHaveAttribute("href", "/knowledge/wiki/doc/108");
  });

  it("routes a page created from the project-scoped tree to the project wiki instead of the global knowledge base", async () => {
    const user = userEvent.setup();
    render(<PageTree projectId={7} baseHref="/build/7/wiki" />);

    await user.click(screen.getByRole("button", { name: "Add child file" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    const handlers = createPageMutate.mock.calls[0]?.[1] as {
      onSuccess: (created: { id: number }) => void;
    };
    act(() => handlers.onSuccess({ id: 501 }));

    expect(routerPush).toHaveBeenCalledWith("/build/7/wiki/501");
  });

  it("routes a page created from the unscoped tree to the global knowledge base, so the project-scoped navigation above is the prop and not the default", async () => {
    const user = userEvent.setup();
    render(<PageTree />);

    await user.click(screen.getByRole("button", { name: "Add child file" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));

    const handlers = createPageMutate.mock.calls[0]?.[1] as {
      onSuccess: (created: { id: number }) => void;
    };
    act(() => handlers.onSuccess({ id: 501 }));

    expect(routerPush).toHaveBeenCalledWith("/knowledge/wiki/doc/501");
  });
});
