import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { backendPath } from "@/test-utils/backend-repo";
import { KB_ASK_STATUS_SCOPES } from "@/hooks/api/kb/ask";
import { KB_PAGE_STATUSES } from "@/hooks/api/kb/kb-analytics-schema";
import { KbSourcesSheet } from "./kb-sources-sheet";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";

const BACKEND_ASK_SCHEMA = backendPath(
  "src/modules/kb/retrieval/dto/kb-ai.schemas.ts",
);

function backendAskStatusScopes(): string[] {
  const source = readFileSync(BACKEND_ASK_SCHEMA, "utf8");
  const declaration = /export const KB_ASK_STATUS_SCOPES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  if (declaration === null)
    throw new Error(`KB_ASK_STATUS_SCOPES not found in ${BACKEND_ASK_SCHEMA}`);
  return [...declaration[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe("KB ask status vocabulary — one catalogue, not two hand-written lists", () => {
  it("matches the backend's KB_ASK_STATUS_SCOPES exactly, so a status added or removed there fails here instead of 400ing at runtime against a .strict() schema", () => {
    expect([...KB_ASK_STATUS_SCOPES]).toEqual(backendAskStatusScopes());
  });

  it("is derived from the shared page-status catalogue rather than retyped, so a new page status flows through instead of being silently unofferable", () => {
    expect([...KB_ASK_STATUS_SCOPES]).toEqual(
      KB_PAGE_STATUSES.filter((status) => status !== "archived"),
    );
  });

  it("excludes archived, because every Ask candidate query filters ne(status, 'archived') unconditionally so the option could only ever return nothing", () => {
    expect(KB_ASK_STATUS_SCOPES).not.toContain("archived");
  });
});

const SCOPE_PROPS = {
  mode: "scope" as const,
  open: true,
  onOpenChange: jest.fn(),
  sources: [],
  isLoading: false,
  sourceError: null,
  sourceHasMore: false,
  sourceIsFetchingMore: false,
  onSourceLoadMore: jest.fn(),
  onSourceRetry: jest.fn(),
  selectedIds: [],
  onSelectionChange: jest.fn(),
  verifiedOnly: false,
  onVerifiedOnlyChange: jest.fn(),
  currentUserId: "user-1",
  ownerFilter: "all" as const,
  onOwnerFilterChange: jest.fn(),
  spaceIdFilter: null,
  onSpaceIdFilterChange: jest.fn(),
  spaces: [{ id: 10, name: "Engineering" }],
  ownerMembershipId: null,
  onOwnerMembershipIdChange: jest.fn(),
  owners: [
    { membershipId: 77, name: "Ada Lovelace" },
  ],
  selectedOwner: null,
  onOwnerSearchChange: jest.fn(),
  ownersAreLoading: false,
  ownersHasMore: false,
  ownersAreFetchingMore: false,
  onOwnersLoadMore: jest.fn(),
  ownersError: null,
  onOwnersRetry: jest.fn(),
  statusScope: null,
  onStatusScopeChange: jest.fn(),
  onConfirm: jest.fn(),
  pageSearchQuery: "",
  onPageSearchQueryChange: jest.fn(),
  pageSearchResults: [],
  pageSearchIsLoading: false,
  selectedPageIds: [],
  onPageSelectionChange: jest.fn(),
};

const SOURCE: KbPageCollectionItem = {
  id: 1,
  kind: "file",
  title: "Release notes",
  icon: null,
  coverImage: null,
  spaceId: null,
  projectId: null,
  parentPageId: null,
  status: "published",
  visibility: "org",
  contentType: "file",
  trustState: "unverified",
  ownerMembershipId: null,
  ownerUserId: null,
  createdById: null,
  createdByMembershipId: null,
  lastEditedById: null,
  lastEditedByMembershipId: null,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
  deletedAt: null,
  nextReviewAt: null,
  verifiedUntil: null,
  contentRevision: 0,
  aclRevision: 0,
  isLocked: false,
  can: { edit: true, manage: true },
  sharedBy: null,
};

describe("KbSourcesSheet source pagination and read recovery", () => {
  it("loads later source pages from the scope sheet", async () => {
    const loadMore = jest.fn();
    render(<KbSourcesSheet {...SCOPE_PROPS} sources={[SOURCE]} sourceHasMore onSourceLoadMore={loadMore} />);

    await userEvent.click(screen.getByRole("button", { name: "Load more sources" }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded sources and offers retry after a later page fails", async () => {
    const loadMore = jest.fn();
    render(<KbSourcesSheet {...SCOPE_PROPS} sources={[SOURCE]} sourceError={new Error("offline")} sourceHasMore onSourceLoadMore={loadMore} />);

    expect(screen.getByText("Release notes")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the full source list.");
    await userEvent.click(screen.getByRole("button", { name: "Retry loading sources" }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("shows a first-read error and retry instead of a false empty state", async () => {
    const retry = jest.fn();
    render(<KbSourcesSheet {...SCOPE_PROPS} sourceError={new Error("offline")} onSourceRetry={retry} />);

    expect(screen.queryByText("No sources yet")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load sources.");
    await userEvent.click(screen.getByRole("button", { name: "Retry sources" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("KbSourcesSheet scope mode — owner filter active with no matching files shows filter-empty state (FE-183)", () => {
  it("shows 'No results match your filters.' instead of 'No sources yet' when the Mine filter is active and the list is empty, because 'No sources yet' falsely implies the workspace has no files when other people's files are simply hidden by the filter", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} ownerFilter="mine" sources={[]} />);

    expect(screen.queryByText("No sources yet")).not.toBeInTheDocument();
    expect(
      screen.getByText(/no results match your filters/i),
    ).toBeInTheDocument();
  });

  it("shows a 'Clear filters' button so the user can reset the owner filter without closing and reopening the scope sheet when filtering by Mine produces an empty list", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} ownerFilter="mine" sources={[]} />);

    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("positive control: still shows 'No sources yet' when the owner filter is 'all' and the list is empty, confirming the genuine-empty state is not replaced when no filter is active", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} ownerFilter="all" sources={[]} />);

    expect(screen.getByText("No sources yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });
});

describe("KbSourcesSheet scope mode — all six scope dimensions are present and editable before send", () => {
  it("renders one status button per backend-accepted status scope and no more", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} />);

    for (const label of ["Draft", "In review", "Published"])
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Archived" })).not.toBeInTheDocument();
  });

  it("renders an owner combobox, the dimension that produces ownerMembershipId", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} />);

    expect(
      screen.getByRole("combobox", { name: /restrict answer to files owned by a member/i }),
    ).toBeInTheDocument();
  });

  it("retains a selected owner's label when that owner is outside the current search page", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} ownerMembershipId={88} selectedOwner={{ membershipId: 88, name: "Grace Hopper" }} owners={[]} />);

    expect(screen.getByRole("combobox", { name: /restrict answer to files owned by a member/i })).toHaveTextContent("Grace Hopper");
  });

  it("loads another owner page from the keyboard accessible picker action", async () => {
    const loadMore = jest.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<KbSourcesSheet {...SCOPE_PROPS} ownersHasMore onOwnersLoadMore={loadMore} />);

    await user.click(screen.getByRole("combobox", { name: /restrict answer to files owned by a member/i }));
    await user.click(screen.getByRole("button", { name: "Load more members" }));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("shows an owner read failure and retry inside the scope sheet", async () => {
    const retry = jest.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<KbSourcesSheet {...SCOPE_PROPS} owners={[]} ownersError={new Error("read failed")} onOwnersRetry={retry} />);

    await user.click(screen.getByRole("combobox", { name: /restrict answer to files owned by a member/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load members.");
    await user.click(screen.getByRole("button", { name: "Retry members" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders the space and verified-only controls and no file/note kind toggle, since notes are documents chosen through the page picker", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} spaceIdFilter={10} />);

    expect(screen.getByRole("combobox", { name: "Space" })).toHaveTextContent("Engineering");
    expect(screen.getByRole("switch", { name: /verified pages and articles only/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notes" })).not.toBeInTheDocument();
  });
});
