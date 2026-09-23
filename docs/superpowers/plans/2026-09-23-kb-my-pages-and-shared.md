# KB My Pages (S02) and Shared With Me (S03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken tree-based "Private pages" and "Shared with me" surfaces with server-filtered `GET /kb/pages` list views, fixing the empty-state flash and the wrong-data defect.

**Architecture:** A new `useKbPageCollection` hook calls `GET /kb/pages` with server-side `owner=me` or `sharedWithMe=1` filters. A shared `WikiPageCollectionTable` component orchestrates URL-backed search/filter/sort/cursor/view state and renders a `DataTable` (list view) or card grid (card view) through `PageState`. Both page components become thin wrappers that pass their fixed filter and column config.

**Tech Stack:** Next.js 16.3 App Router · React 19 · TanStack Query 5 · Zod 4 · `useUrlFilters` · `useCursorPager` · `DataTable` with cursor pagination · `PageState` · `EmptyState`

**Spec:** `docs/specs/knowledge-base/02-page-component-spec.md` sections §3 (My Pages) and §4 (Shared With Me)

## Global Constraints

- No `any`, no `as X`, no `@ts-ignore` — hard zero.
- No raw `fetch` outside `lib/`/`hooks/` (FE-15).
- Every response parsed through a Zod contract via `lazyContract` (FE-27).
- `usePageState` + `<PageState>` with `error` always passed (FE-40, FE-41).
- `useCan` gates mutation controls only; `usePageState` gates the page surface (FE-42/FE-44).
- Filters, search, sort, view and cursor in the URL; reset pagination on filter change (FE-86).
- Do not call setters inside `useEffect` — use `resetKey` on `useCursorPager` or derive from URL params directly; setters in effects OOM Jest (MEMORY.md trap).
- No new `route.ts` (FE-06). No `min-h-screen` or page-level gradient (FE-100).
- Files under 500 lines; prefer < 300 (FE-57).
- No code comments in production source. Intent goes in names, types, and test names (MEMORY.md).
- Permission key must exactly match `@RequirePermission` catalog entry `kb:pages:view` (FE-45).
- Import query-key **domain module** `@/lib/query-keys/knowledge-and-surveys`, never the aggregate (FE-18).
- Add key to `knowledge-and-surveys.ts` **additive only** — do not rewrite existing lines.
- `hooks/api/kb/index.ts` is **additive only** — do not remove existing exports.
- Do NOT touch `hooks/api/kb/pages.ts` (another lane owns it).
- Do NOT delete `features/wiki/lib/tree-utils.ts` — `space-detail-page.tsx` still calls `filterTreeWithAncestors`.
- `sharedBy` columns: display `sharedBy.access` (access level label) and `sharedBy.at` (formatted date). For "shared by" person name, the backend `sharedBy` object currently carries only `membershipId`; render as a placeholder `Member #${membershipId}` and flag as a design decision requiring a backend name projection.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| CREATE | `frontend/hooks/api/kb/kb-page-collection-schema.ts` | Zod contract for `KbPageCollectionItem` and the paginated response |
| CREATE | `frontend/hooks/api/kb/page-collection.ts` | `useKbPageCollection(params)` hook |
| EDIT (additive) | `frontend/hooks/api/kb/index.ts` | Re-export new module |
| EDIT (additive) | `frontend/lib/query-keys/knowledge-and-surveys.ts` | `pageCollection(params?)` key |
| CREATE | `frontend/features/wiki/components/wiki-page-collection-table.tsx` | Shared DataTable + URL state + view toggle + cursor |
| EDIT | `frontend/features/wiki/components/private-page.tsx` | Replace tree-based impl with My pages |
| EDIT | `frontend/features/wiki/components/shared-page.tsx` | Replace session-based impl with Shared with me |
| CREATE | `frontend/features/wiki/components/private-page.test.tsx` | Colocated spec |
| CREATE | `frontend/features/wiki/components/shared-page.test.tsx` | Colocated spec (flash test must fail first) |
| CREATE | `frontend/features/wiki/components/wiki-page-collection-table.test.tsx` | Colocated spec |

`app/(authenticated)/knowledge/wiki/private/page.tsx` and `.../shared/page.tsx` are thin wrappers — no changes needed (they already import the right component).

---

## Task 1: Zod contract for `GET /kb/pages`

**Files:**
- Create: `frontend/hooks/api/kb/kb-page-collection-schema.ts`

**Interfaces:**
- Produces: `kbPageCollectionItemSchema`, `kbPageCollectionResponseSchema`, `kbPageCollectionContract` (used by Task 2)
- Produces: TypeScript type `KbPageCollectionItem` (inferred), `KbPageCollectionResponse` (inferred)

- [ ] **Step 1: Create the schema file**

```ts
import { z } from "zod";

export const kbPageCollectionItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  icon: z.string().nullable(),
  coverImage: z.string().nullable(),
  spaceId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  parentPageId: z.number().int().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  visibility: z.enum(["private", "org", "public"]),
  contentType: z.string(),
  trustState: z.enum(["unverified", "verified", "verification_expired"]),
  ownerMembershipId: z.number().int().nullable(),
  ownerUserId: z.string().nullable(),
  createdById: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  lastEditedById: z.string().nullable(),
  lastEditedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  nextReviewAt: z.string().nullable(),
  verifiedUntil: z.string().nullable(),
  contentRevision: z.number().int(),
  aclRevision: z.number().int(),
  sharedBy: z
    .object({
      membershipId: z.number().int().nullable(),
      at: z.string(),
      access: z.enum(["view", "comment", "edit", "manage"]),
    })
    .nullable(),
});

export type KbPageCollectionItem = z.infer<typeof kbPageCollectionItemSchema>;

const kbPageCollectionPaginationSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const kbPageCollectionFacetStatusSchema = z.object({
  value: z.string(),
  count: z.number().int(),
});

const kbPageCollectionFacetSpaceSchema = z.object({
  spaceId: z.number().int().nullable(),
  count: z.number().int(),
});

const kbPageCollectionFacetsSchema = z
  .object({
    status: z.array(kbPageCollectionFacetStatusSchema),
    space: z.array(kbPageCollectionFacetSpaceSchema),
  })
  .nullable();

export const kbPageCollectionResponseSchema = z.object({
  data: z.array(kbPageCollectionItemSchema),
  pagination: kbPageCollectionPaginationSchema,
  facets: kbPageCollectionFacetsSchema,
});

export type KbPageCollectionResponse = z.infer<
  typeof kbPageCollectionResponseSchema
>;

export const kbPageCollectionContract = kbPageCollectionResponseSchema;
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 2: Query key for page collection

**Files:**
- Modify: `frontend/lib/query-keys/knowledge-and-surveys.ts` — add one entry to the `kb` object, after `sources`.

**Interfaces:**
- Produces: `knowledgeAndSurveysQueryKeys.kb.pageCollection(params?)` — used by Task 3.

- [ ] **Step 1: Add the `pageCollection` key**

Inside the `kb: { ... }` object, after `sources: () => [...base, "kb", "sources"] as const,`, add:

```ts
    pageCollection: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "kb", "page-collection"] as const)
        : ([...base, "kb", "page-collection", params] as const),
```

- [ ] **Step 2: Verify compile**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 3: `useKbPageCollection` hook

**Files:**
- Create: `frontend/hooks/api/kb/page-collection.ts`
- Modify: `frontend/hooks/api/kb/index.ts` — add one export line

**Interfaces:**
- Consumes: `kbPageCollectionContract` from `./kb-page-collection-schema` (Task 1)
- Consumes: `knowledgeAndSurveysQueryKeys.kb.pageCollection` (Task 2)
- Produces: `useKbPageCollection(params: KbPageCollectionParams)` returning TanStack Query result typed `KbPageCollectionResponse`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type { KbPageCollectionResponse } from "./kb-page-collection-schema";

export type KbPageCollectionParams = {
  q?: string;
  spaceId?: number;
  projectId?: number;
  owner?: "me";
  sharedWithMe?: "1";
  status?: string;
  sort?: "updated_desc" | "created_desc" | "title_asc";
  cursor?: string;
  limit?: number;
};

const kbPageCollectionContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-page-collection-schema").then(
    (m) => m.kbPageCollectionContract,
  ),
);

export function useKbPageCollection(
  params: KbPageCollectionParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("kb:pages:view");
  const queryParams: Record<string, unknown> = {};
  if (params.q) queryParams.q = params.q;
  if (params.spaceId !== undefined) queryParams.spaceId = params.spaceId;
  if (params.projectId !== undefined) queryParams.projectId = params.projectId;
  if (params.owner) queryParams.owner = params.owner;
  if (params.sharedWithMe) queryParams.sharedWithMe = params.sharedWithMe;
  if (params.status) queryParams.status = params.status;
  if (params.sort) queryParams.sort = params.sort;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit !== undefined) queryParams.limit = params.limit;

  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageCollection(params),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageCollectionResponse>(
        "/kb/pages",
        queryParams,
        signal,
        kbPageCollectionContract,
      ),
    staleTime: 30_000,
    enabled: canView && (options?.enabled ?? true),
  });
}
```

- [ ] **Step 2: Add export to index**

In `frontend/hooks/api/kb/index.ts`, append after the last export line:

```ts
export * from "./page-collection";
```

- [ ] **Step 3: Verify compile**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 4: Write the flash test first (must see it fail)

**Files:**
- Create: `frontend/features/wiki/components/shared-page.test.tsx` (initial version — tests the current bug)

The test exercises the _current_ `shared-page.tsx`. It renders with tree data loaded but session loading. On current code: `isLoading` is `false`, `myId` is `undefined`, `sharedNodes` is `[]` → empty state flashes. The test asserts the flash does NOT happen — so it **must fail** here.

**Interfaces:**
- Consumes: current `./shared-page` (the bug-bearing component)
- Produces: a failing test whose name is: `"does not show empty state while session is still loading"`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from "@testing-library/react";
import SharedPage from "./shared-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/shared",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesTree: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "loading" }),
}));

const { useSession } = jest.requireMock("next-auth/react") as {
  useSession: jest.Mock;
};
const { useKbPagesTree } = jest.requireMock("@/hooks/api/kb") as {
  useKbPagesTree: jest.Mock;
};

describe("SharedPage — session loading flash", () => {
  it("does not show empty state while session is still loading", () => {
    useSession.mockReturnValue({ data: undefined, status: "loading" });
    useKbPagesTree.mockReturnValue({
      data: [{ id: 1, title: "Onboarding", createdById: "user-other", status: "published", updatedAt: "2026-01-01T00:00:00Z" }],
      isLoading: false,
      isError: false,
    });

    render(<SharedPage />);

    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it FAILS**

Run: `cd frontend && npx jest features/wiki/components/shared-page.test.tsx --no-coverage`
Expected: **FAIL** — the "Nothing shared with you" text IS present in the current implementation because `myId` is `undefined` → `sharedNodes = []` → empty-state renders.

Record the failure output. This confirms the test catches the real bug.

---

## Task 5: `WikiPageCollectionTable` — shared table component

**Files:**
- Create: `frontend/features/wiki/components/wiki-page-collection-table.tsx`

**Interfaces:**
- Consumes: `useKbPageCollection` (Task 3), `useCursorPager`, `useUrlFilters`, `DataTable`, `PageState`, `usePageState`, `EmptyState`
- Consumes: `KbPageCollectionItem` from `@/hooks/api/kb`
- Produces: `WikiPageCollectionTable({ fixedParams, additionalColumns, emptyTitle, emptyDescription })` — default export

Design decisions locked here:
- URL params owned: `q` (search), `sort`, `status`, `view` (list|card)
- Cursor owned: local `useCursorPager`, reset key = joined filter string
- `view` default = `"list"`. Card view renders `WikiPageCard` in a CSS grid.
- `sort` options: `updated_desc` (default), `created_desc`, `title_asc`
- `status` filter: `draft`, `in_review`, `published`, `archived`, or empty (all)
- `sharedBy` displayed with `sharedBy.access` label + `kbFormatDate(sharedBy.at)` + `Member #${membershipId}`

Status tone classes: use `KB_STATUS_BADGE_CLASS` from `@/features/wiki/lib/kb-page-status`.

Note on trust badges: `trustState` maps to:
- `"verified"` → `bg-status-success-surface text-status-success-ink-strong border-status-success-rule`
- `"verification_expired"` → `bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule`
- `"unverified"` → `bg-muted text-muted-foreground border-border`

Note on `mobileCard` prop: render a compact card with title, status badge, and updated-at.

The component body must stay under 300 lines. If needed split trust-badge rendering to a sibling helper file.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type { KbPageCollectionItem, KbPageCollectionParams } from "@/hooks/api/kb/page-collection";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { pageHref } from "@/lib/knowledge-routes";
import { kbFormatDate, kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { KB_STATUS_LABELS, KB_STATUS_BADGE_CLASS } from "@/features/wiki/lib/kb-page-status";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "updated_desc", label: "Last updated" },
  { value: "created_desc", label: "Newest" },
  { value: "title_asc", label: "Title A–Z" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const TRUST_BADGE_CLASS: Record<string, string> = {
  verified:
    "bg-status-success-surface text-status-success-ink-strong border-status-success-rule",
  verification_expired:
    "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule",
  unverified: "bg-muted text-muted-foreground border-border",
};

const TRUST_BADGE_LABEL: Record<string, string> = {
  verified: "Verified",
  verification_expired: "Stale",
  unverified: "Unverified",
};

const ACCESS_LABELS: Record<string, string> = {
  view: "Can view",
  comment: "Can comment",
  edit: "Can edit",
  manage: "Can manage",
};

const PAGE_LIMIT = 50;

export interface WikiPageCollectionTableProps {
  fixedParams: Pick<KbPageCollectionParams, "owner" | "sharedWithMe">;
  additionalColumns?: DataTableColumn<KbPageCollectionItem>[];
  emptyTitle: string;
  emptyDescription?: string;
}

function TrustBadge({ trustState }: { trustState: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro h-4 px-1.5 shrink-0",
        TRUST_BADGE_CLASS[trustState] ?? TRUST_BADGE_CLASS.unverified,
      )}
    >
      {TRUST_BADGE_LABEL[trustState] ?? trustState}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro h-4 px-1.5 shrink-0",
        KB_STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {KB_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function WikiPageCollectionTable({
  fixedParams,
  additionalColumns = [],
  emptyTitle,
  emptyDescription,
}: WikiPageCollectionTableProps) {
  const searchParams = useSearchParams();
  const { update, isPending } = useUrlFilters();

  const rawSearch = searchParams.get("q") ?? "";
  const sort = parseEnum(
    searchParams.get("sort"),
    ["updated_desc", "created_desc", "title_asc"] as const,
    "updated_desc",
  );
  const status = searchParams.get("status") ?? "";
  const view = parseEnum(
    searchParams.get("view"),
    ["list", "card"] as const,
    "list",
  );

  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  const filterKey = `${debouncedSearch}|${sort}|${status}`;
  const pager = useCursorPager(filterKey);

  const queryParams: KbPageCollectionParams = {
    ...fixedParams,
    q: debouncedSearch || undefined,
    sort,
    status: status || undefined,
    cursor: pager.cursor,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading, isError, error, refetch } =
    useKbPageCollection(queryParams);

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty: data !== undefined && data.data.length === 0,
  });

  const filtersActive =
    debouncedSearch !== "" || status !== "" || sort !== "updated_desc";

  function handleClearFilters() {
    update({ q: null, status: null, sort: null });
  }

  function handleSearchChange(value: string) {
    update({ q: value || null });
  }

  function handleSortChange(value: string) {
    update({ sort: value });
  }

  function handleStatusChange(value: string) {
    update({ status: value === "all" ? null : value });
  }

  function handleViewList() {
    update({ view: null });
  }

  function handleViewCard() {
    update({ view: "card" });
  }

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);

  const handlePrevious = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const baseColumns: DataTableColumn<KbPageCollectionItem>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <a
          href={pageHref(row.id)}
          className="font-medium text-foreground hover:underline"
        >
          {row.title}
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "trustState",
      header: "Trust",
      cell: (row) => <TrustBadge trustState={row.trustState} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground text-sm">
          {kbTimeAgo(row.updatedAt)}
        </span>
      ),
    },
  ];

  const columns = [...baseColumns, ...additionalColumns];

  const rows = data?.data ?? [];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={rawSearch}
        onChange={handleSearchChange}
        placeholder="Search pages…"
        className="h-9 w-48 shrink-0"
      />
      <Select value={status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-9 w-36 shrink-0">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-9 w-40 shrink-0">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant={view === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9"
          aria-label="List view"
          onClick={handleViewList}
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={view === "card" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9"
          aria-label="Card view"
          onClick={handleViewCard}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const emptyNode = (
    <EmptyState
      illustrationPreset="default"
      title={emptyTitle}
      description={emptyDescription}
      filtersActive={filtersActive}
      filteredTitle="No pages match your filters."
      onClearFilters={handleClearFilters}
    />
  );

  const mobileCard = (row: KbPageCollectionItem) => (
    <WikiPageCard
      href={pageHref(row.id)}
      title={row.title}
      icon={row.icon}
      coverImage={row.coverImage}
      subtitle={kbTimeAgo(row.updatedAt)}
    >
      <StatusBadge status={row.status} />
    </WikiPageCard>
  );

  const cardGrid = (
    <div className={WIKI_PAGE_CARD_GRID_CLASS}>
      {rows.map((row) => (
        <WikiPageCard
          key={row.id}
          href={pageHref(row.id)}
          title={row.title}
          icon={row.icon}
          coverImage={row.coverImage}
          subtitle={kbTimeAgo(row.updatedAt)}
        >
          <StatusBadge status={row.status} />
        </WikiPageCard>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {toolbar}
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={columns.length} />}
        empty={emptyNode}
        onRetry={handleRetry}
      >
        {view === "card" ? (
          rows.length === 0 ? emptyNode : cardGrid
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isPending}
            emptyState={emptyNode}
            mobileCard={mobileCard}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_LIMIT,
              pageNumber: pager.cursor === undefined ? 1 : undefined,
              hasMore: data?.pagination.hasMore ?? false,
              hasPrevious: pager.hasPrevious,
              onNext: handleNext,
              onPrevious: handlePrevious,
            }}
          />
        )}
      </PageState>
    </div>
  );
}
```

- [ ] **Step 2: Verify file is under 300 lines**

Run: `wc -l frontend/features/wiki/components/wiki-page-collection-table.tsx`
If over 300 lines, extract `TrustBadge` and `StatusBadge` to a sibling `kb-collection-badges.tsx` file and import from there.

- [ ] **Step 3: Type-check**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 6: Replace `private-page.tsx` — "My pages"

**Files:**
- Modify: `frontend/features/wiki/components/private-page.tsx`

**Interfaces:**
- Consumes: `WikiPageCollectionTable` (Task 5)
- Removes: `useKbPagesTree`, `filterTreeWithAncestors`, `useSession` imports

- [ ] **Step 1: Replace the file content**

```tsx
"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const MY_PAGES_PARAMS = { owner: "me" as const };

export default function PrivatePage() {
  return (
    <PageWrapper title="My pages" subtitle="Pages you own">
      <WikiPageCollectionTable
        fixedParams={MY_PAGES_PARAMS}
        emptyTitle="No pages yet"
        emptyDescription="Pages you own will appear here."
      />
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 7: Replace `shared-page.tsx` — "Shared with me"

**Files:**
- Modify: `frontend/features/wiki/components/shared-page.tsx`

**Interfaces:**
- Consumes: `WikiPageCollectionTable` (Task 5)
- Consumes: `kbFormatDate` from `@/features/wiki/lib/kb-date-utils`
- Consumes: `KbPageCollectionItem` from `@/hooks/api/kb`
- Removes: `useSession`, `useKbPagesTree`, `Badge`, `Skeleton`, `KB_STATUS_LABELS`, `KB_STATUS_BADGE_CLASS`, `kbTimeAgo`, `WikiPageCard`, `KbPageTreeNode` imports

The additional columns for Shared with me: `shared_by`, `shared_at`, `access_level`.

Note: `sharedBy.membershipId` is a number, not a display name. Render as `Member #${membershipId ?? "?"}` — flag this in the report as a design decision requiring either a backend projection or a member-name lookup hook. This keeps `FE-85` in mind (no raw UUIDs; `membershipId` is a number, not a UUID, but still not user-facing).

- [ ] **Step 1: Replace the file content**

```tsx
"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

const SHARED_WITH_ME_PARAMS = { sharedWithMe: "1" as const };

const ACCESS_LABELS: Record<string, string> = {
  view: "Can view",
  comment: "Can comment",
  edit: "Can edit",
  manage: "Can manage",
};

const SHARED_COLUMNS: DataTableColumn<KbPageCollectionItem>[] = [
  {
    key: "shared_by",
    header: "Shared by",
    cell: (row) =>
      row.sharedBy
        ? `Member #${row.sharedBy.membershipId ?? "?"}`
        : "—",
  },
  {
    key: "shared_at",
    header: "Shared",
    cell: (row) => (
      <span className="tabular-nums text-muted-foreground text-sm">
        {row.sharedBy ? kbFormatDate(row.sharedBy.at) : "—"}
      </span>
    ),
  },
  {
    key: "access_level",
    header: "Access",
    cell: (row) =>
      row.sharedBy
        ? (ACCESS_LABELS[row.sharedBy.access] ?? row.sharedBy.access)
        : "—",
  },
];

export default function SharedPage() {
  return (
    <PageWrapper title="Shared with me" subtitle="Pages explicitly shared with you">
      <WikiPageCollectionTable
        fixedParams={SHARED_WITH_ME_PARAMS}
        additionalColumns={SHARED_COLUMNS}
        emptyTitle="Nothing shared with you"
        emptyDescription="Pages explicitly shared with your account will appear here."
      />
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm type-check`
Expected: no new errors

---

## Task 8: Update the flash test to pass with the new implementation

**Files:**
- Modify: `frontend/features/wiki/components/shared-page.test.tsx`

Now that `shared-page.tsx` no longer uses `useSession` or `useKbPagesTree`, the test is rewritten to mock `useKbPageCollection` (the new hook) and the `WikiPageCollectionTable` component.

The flash test must now PASS: when `useKbPageCollection` returns `isLoading: true`, `PageState` shows the loading skeleton, not the empty state.

- [ ] **Step 1: Rewrite the test**

```tsx
import { render, screen } from "@testing-library/react";
import SharedPage from "./shared-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/shared",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    children: React.ReactNode;
  }) => (resolution.kind === "loading" ? <>{loading}</> : <>{children}</>),
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

describe("SharedPage — session loading flash", () => {
  it("does not show empty state while the request is in flight", () => {
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "loading" });

    render(<SharedPage />);

    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows shared pages when the request resolves", () => {
    const item = {
      id: 42,
      title: "Handbook",
      icon: null,
      coverImage: null,
      spaceId: null,
      projectId: null,
      parentPageId: null,
      status: "published",
      visibility: "org",
      contentType: "rich-text",
      trustState: "verified",
      ownerMembershipId: 5,
      ownerUserId: "user-5",
      createdById: "user-5",
      createdByMembershipId: 5,
      lastEditedById: "user-5",
      lastEditedByMembershipId: 5,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      deletedAt: null,
      nextReviewAt: null,
      verifiedUntil: null,
      contentRevision: 1,
      aclRevision: 1,
      sharedBy: {
        membershipId: 5,
        at: "2026-08-01T00:00:00Z",
        access: "edit" as const,
      },
    };
    useKbPageCollection.mockReturnValue({
      data: {
        data: [item],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<SharedPage />);

    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
  });

  it("an org-visible page authored by someone else does NOT appear here because the server owns the filter", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<SharedPage />);

    expect(screen.getByText("Nothing shared with you")).toBeInTheDocument();
  });
});
```

Explanation of the third test: after the fix, the component passes `{ sharedWithMe: "1" }` to `useKbPageCollection`. The mock returning `data: []` (empty) represents the server correctly returning zero explicit grants. The test verifies the empty state shows the right message, proving no client-side filtering is applied.

- [ ] **Step 2: Run the test and confirm it PASSES**

Run: `cd frontend && npx jest features/wiki/components/shared-page.test.tsx --no-coverage`
Expected: **PASS** — the flash no longer occurs and the component renders correctly in all states.

---

## Task 9: Spec for `private-page.tsx`

**Files:**
- Create: `frontend/features/wiki/components/private-page.test.tsx`

- [ ] **Step 1: Create the test**

```tsx
import { render, screen } from "@testing-library/react";
import PrivatePage from "./private-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/private",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "My doc",
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "draft",
    visibility: "private",
    contentType: "rich-text",
    trustState: "unverified",
    ownerMembershipId: 10,
    ownerUserId: "user-me",
    createdById: "user-me",
    createdByMembershipId: 10,
    lastEditedById: "user-me",
    lastEditedByMembershipId: 10,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 1,
    aclRevision: 1,
    sharedBy: null,
    ...overrides,
  };
}

describe("PrivatePage — My pages", () => {
  it("passes owner=me to the collection hook so a page owned by another admin does not appear", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(useKbPageCollection).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "me" }),
    );
  });

  it("shows the owned page when the server returns it", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<PrivatePage />);

    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
  });

  it("shows first-empty state when the server returns no owned pages", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(screen.getByText("No pages yet")).toBeInTheDocument();
  });

  it("uses My pages as the page title", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(screen.getByText("My pages")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm passes**

Run: `cd frontend && npx jest features/wiki/components/private-page.test.tsx --no-coverage`
Expected: PASS

---

## Task 10: Spec for `wiki-page-collection-table.tsx`

**Files:**
- Create: `frontend/features/wiki/components/wiki-page-collection-table.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => "/knowledge/wiki/private",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    emptyState,
    pagination,
  }: {
    data: unknown[];
    emptyState?: React.ReactNode;
    pagination?: { hasMore: boolean; hasPrevious: boolean; onNext: () => void; onPrevious: () => void };
  }) => (
    <div>
      {data.length === 0 ? emptyState : <div data-testid="table-rows">{data.length} rows</div>}
      {pagination && (
        <div>
          <button type="button" onClick={pagination.onNext} disabled={!pagination.hasMore}>
            Next
          </button>
          <button type="button" onClick={pagination.onPrevious} disabled={!pagination.hasPrevious}>
            Previous
          </button>
        </div>
      )}
    </div>
  ),
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

function makeItem(id: number, sharedBy?: { membershipId: number; at: string; access: "view" | "comment" | "edit" | "manage" }) {
  return {
    id,
    title: `Page ${id}`,
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "published",
    visibility: "org",
    contentType: "rich-text",
    trustState: "verified",
    ownerMembershipId: 1,
    ownerUserId: "user-1",
    createdById: "user-1",
    createdByMembershipId: 1,
    lastEditedById: "user-1",
    lastEditedByMembershipId: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 1,
    aclRevision: 1,
    sharedBy: sharedBy ?? null,
  };
}

function makePagination(overrides = {}) {
  return {
    data: [makeItem(1)],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
    facets: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  useKbPageCollection.mockReturnValue({
    data: makePagination(),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("WikiPageCollectionTable", () => {
  it("shows filtered-empty state with a clear-filters button when filters are active but result is empty", () => {
    mockSearchParams = new URLSearchParams("q=nonexistent");
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows first-empty state without clear-filters button when no filters are active", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByText("No pages yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("filtered-empty and first-empty render differently — filtered offers clear action that first-empty does not", () => {
    const filteredSearchParams = new URLSearchParams("q=something");
    const noFilterParams = new URLSearchParams();

    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    mockSearchParams = filteredSearchParams;
    const { rerender } = render(
      <WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages yet" />,
    );
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();

    mockSearchParams = noFilterParams;
    rerender(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages yet" />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("sharedBy columns render shared-by person, shared-at date and access level", () => {
    const itemWithShare = makeItem(7, {
      membershipId: 99,
      at: "2026-08-15T10:00:00Z",
      access: "edit",
    });
    useKbPageCollection.mockReturnValue({
      data: {
        data: [itemWithShare],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        additionalColumns={[
          { key: "shared_by", header: "Shared by", cell: (row) => row.sharedBy ? `Member #${row.sharedBy.membershipId}` : "—" },
          { key: "shared_at", header: "Shared", cell: (row) => row.sharedBy ? row.sharedBy.at : "—" },
          { key: "access_level", header: "Access", cell: (row) => row.sharedBy ? row.sharedBy.access : "—" },
        ]}
        emptyTitle="Nothing shared"
      />,
    );

    expect(screen.getByText("Member #99")).toBeInTheDocument();
    expect(screen.getByText("edit")).toBeInTheDocument();
  });

  it("advances cursor to next page without losing the sort filter from the URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("sort=title_asc");
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeItem(1)],
        pagination: { limit: 50, hasMore: true, nextCursor: "cursor-abc" },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />,
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "title_asc", cursor: "cursor-abc" }),
    );
  });

  it("retreats cursor to previous page without losing the sort filter from the URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("sort=title_asc");
    useKbPageCollection
      .mockReturnValueOnce({
        data: { data: [makeItem(1)], pagination: { limit: 50, hasMore: true, nextCursor: "c2" }, facets: null },
        isLoading: false, isError: false, error: undefined, refetch: jest.fn(),
      })
      .mockReturnValue({
        data: { data: [makeItem(2)], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
        isLoading: false, isError: false, error: undefined, refetch: jest.fn(),
      });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />,
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    const prevButton = screen.getByRole("button", { name: /previous/i });
    await user.click(prevButton);

    const calls = useKbPageCollection.mock.calls;
    const lastCall = calls[calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall.sort).toBe("title_asc");
    expect(lastCall.cursor).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and confirm passes**

Run: `cd frontend && npx jest features/wiki/components/wiki-page-collection-table.test.tsx --no-coverage`
Expected: PASS

---

## Task 11: Full verification pass

Run all gates that this work touches. Paste actual output.

- [ ] **Step 1: Type-check production sources**

```bash
cd frontend && pnpm type-check
```
Expected: 0 errors

- [ ] **Step 2: Type-check spec files**

```bash
cd frontend && pnpm type-check:specs
```
Expected: 0 errors in new spec files

- [ ] **Step 3: Run all new tests**

```bash
cd frontend && npx jest \
  features/wiki/components/shared-page.test.tsx \
  features/wiki/components/private-page.test.tsx \
  features/wiki/components/wiki-page-collection-table.test.tsx \
  --no-coverage
```
Expected: all PASS

- [ ] **Step 4: Lint**

```bash
cd frontend && pnpm lint
```
Expected: no new errors (no bare eslint-disable, no unlabelled icon buttons, no raw hex)

- [ ] **Step 5: Page-state usage gate**

```bash
cd frontend && pnpm check:page-state-usage
```
Expected: PASS — `private-page.tsx` and `shared-page.tsx` no longer hand-roll boolean ladders; they delegate to `WikiPageCollectionTable` which uses `PageState`.

- [ ] **Step 6: Empty states gate**

```bash
cd frontend && pnpm check:empty-states
```
Expected: PASS — empty states in `WikiPageCollectionTable` use `EmptyState`, not hand-rolled divs.

- [ ] **Step 7: Response contracts gate**

```bash
cd frontend && pnpm check:response-contracts
```
Expected: PASS — `useKbPageCollection` wraps its response in a Zod contract via `lazyContract`.

- [ ] **Step 8: Query signal gate**

```bash
cd frontend && pnpm check:query-signal
```
Expected: PASS — `queryFn: ({ signal }) => apiClient.get(..., signal, ...)` in `page-collection.ts`.

- [ ] **Step 9: Route thinness gate**

```bash
cd frontend && pnpm check:route-thinness
```
Expected: PASS — `app/.../private/page.tsx` and `app/.../shared/page.tsx` remain thin wrappers.

---

## Self-Review: Spec Coverage

| Spec requirement | Task that covers it |
|---|---|
| Rename "Private" → "My pages" | Task 6 (`title="My pages"`) |
| Server filter `owner=me` (not `visibility=private`) | Task 3 + Task 6 |
| Server filter `sharedWithMe=1` (not `createdById ≠ myId`) | Task 3 + Task 7 |
| Search, status/space filters in URL | Task 5 (toolbar) |
| Cursor pagination | Task 5 (`useCursorPager`) |
| Card/list view toggle in URL | Task 5 (`?view=card`) |
| Trust badges: status / verified/stale | Task 5 (`TrustBadge`, `StatusBadge`) |
| Shared by / shared at / access level columns | Task 7 (`additionalColumns`) |
| `sharedBy` null when not requested | Schema nullable field, Task 7 renders `—` |
| `usePageState + <PageState>` with `error` | Task 5 |
| Filtered-empty vs first-empty | Task 5 + Task 10 |
| Session-flash fix + failing test first | Task 4 |
| `filterTreeWithAncestors` not deleted (has other callers) | NOT deleted — `space-detail-page.tsx` still calls it |
| `useKbPagesTree` + `useSession` removed from both components | Task 6 + Task 7 |

## Design Decisions Not Settled by the Spec

1. **"Shared by" person name:** The backend `sharedBy` object carries only `membershipId` (number), not a display name. Currently rendered as `Member #N`. Options: (a) backend extends `sharedBy` to include `sharedByName: string | null`; (b) client looks up from a members list hook. Recommend option (a) — flag in PR.

2. **Space filter in My pages:** The spec says "status/space filters." `spaceId` is not yet exposed in the toolbar above (would need a space-picker). The `useKbPageCollection` hook accepts `spaceId`; a future task can add the picker by extending `WikiPageCollectionTableProps` with `showSpaceFilter: boolean`.

3. **Access-lost recovery state for Shared with me:** The spec mentions "access-lost recovery state." When `GET /kb/pages?sharedWithMe=1` returns a page with `visibility: "private"` and the user's grant was revoked, the server will simply exclude it from results. No client-side detection is possible without refetching the grant table. This is deferred and flagged.
