import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageDocumentToolbar } from "./page-document-toolbar";
import PageHistorySheet from "./page-history-sheet";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

const routerPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const duplicateMutate = jest.fn();

jest.mock("@/hooks/api/kb", () => ({
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn() }),
  useDuplicateKbPage: () => ({ mutate: duplicateMutate }),
  useLockKbPage: () => ({ mutate: jest.fn() }),
  useKbPageBacklinks: () => ({ data: [] }),
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

jest.mock("@/features/wiki/lib/export-page", () => ({
  exportKbPage: jest.fn(() => Promise.resolve()),
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
