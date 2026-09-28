import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageDocumentToolbar } from "./page-document-toolbar";
import PageHistorySheet from "./page-history-sheet";
import PageTree from "./page-tree";
import type { KbPageDetail, KbPageTreeNode } from "@/hooks/api/kb/page-types";

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

const ROOT_NODE: KbPageTreeNode = {
  id: 42,
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
};

const CHILD_NODE: KbPageTreeNode = {
  ...ROOT_NODE,
  id: 108,
  parentPageId: 42,
  title: "Rollback steps",
  hasChildren: false,
};

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
  useUpdateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useKbPageTreeInfinite: () => treeLevel([ROOT_NODE]),
  useKbPageChildrenLevel: (_pageId: number, enabled: boolean) =>
    enabled
      ? treeLevel([CHILD_NODE])
      : { ...treeLevel([]), data: undefined },
  useKbPageVersionsInfinite: () => ({
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
          ],
          pagination: { limit: 50, nextCursor: null, hasMore: false },
        },
      ],
    },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  }),
  useKbPageVersionDetail: () => ({ data: undefined, isLoading: false }),
  useRestoreKbVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./kb-page-ai-actions", () => ({
  KbPageAiActions: () => <button type="button" aria-label="AI" />,
}));

jest.mock("./page-share-popover", () => ({
  __esModule: true,
  default: () => <button type="button" aria-label="Share page" />,
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
});

describe("project wiki page tree links stay inside the project", () => {
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

    await user.click(screen.getByRole("button", { name: "Add child page" }));

    const handlers = createPageMutate.mock.calls[0]?.[1] as {
      onSuccess: (created: { id: number }) => void;
    };
    handlers.onSuccess({ id: 501 });

    expect(routerPush).toHaveBeenCalledWith("/build/7/wiki/501");
  });

  it("routes a page created from the unscoped tree to the global knowledge base, so the project-scoped navigation above is the prop and not the default", async () => {
    const user = userEvent.setup();
    render(<PageTree />);

    await user.click(screen.getByRole("button", { name: "Add child page" }));

    const handlers = createPageMutate.mock.calls[0]?.[1] as {
      onSuccess: (created: { id: number }) => void;
    };
    handlers.onSuccess({ id: 501 });

    expect(routerPush).toHaveBeenCalledWith("/knowledge/wiki/doc/501");
  });
});
