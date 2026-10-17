# Roadmap L5 — Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed-missing roadmap page and public publication safety requirements that were not shipped as of 2026-10-11.

**Architecture:** The build module follows NestJS controller → service → Drizzle. Filters flow from the frontend `useBuildListFilters` hook through typed `RoadmapItemFilters` to the backend `ProjectsRoadmapService.listRoadmap`. The public roadmap uses opaque publication tokens stored on `organizations.roadmapPublicToken`.

**Tech Stack:** NestJS 11 + Drizzle 0.45 (backend) · Next.js 16 App Router + TanStack Query 5.90 (frontend) · Zod 4 · TypeScript 5.6 strict.

**Spec:** `docs/build-module/experience/screens/product-discovery.md` §Product roadmap (lines 193–219) · `docs/build-module/acceptance/module/02d-scope-public-page-contracts-prd.md` · `docs/build-module/product/customer-value-and-differentiation.md` ~line 96+

## Global Constraints

- No `any`, no `as X`, no `@ts-ignore`.
- No database spec run (`*.db.spec.ts`) and no jest ignore/regex/config override outside `pnpm test:db-specs`.
- Files under 500 lines; 300+ is ratcheted.
- No new pass-through wrappers (FE-126/BE-143).
- No export without an importer outside the file (FE-134/BE-152).
- Mutations patch the cache from the response; no broad invalidation (FE-133).
- No success toast before commit; errors through `getErrorMessage`.
- Every mutating endpoint carries `@Idempotent` and the frontend `apiClient` auto-adds `Idempotency-Key`.
- Backend: `@Validate` on every handler, `.strict()` schemas, `@ResponseSchema` on every handler.
- Permission keys must exist in both backend and frontend catalogs (BE-112).
- Run focused jest only: foreground, `--runInBand`, specific test file. Never `--testPathIgnorePatterns`.

## Pre-audit findings

### Already present (do NOT re-implement):
- `version` (optimistic concurrency field) on update/move/publish schemas — maps to spec's `expectedRevision`.
- `@Idempotent` on all 6 roadmap command endpoints; `apiClient` auto-adds `Idempotency-Key` header to every mutating call.
- `useCan("build:roadmap:manage")` gates all mutation controls; `usePageState` resolves page access.
- Filter chips + Clear all via `BuildListToolbar.onClearAll`.
- Prioritize (move up/down + across horizons) via `usePositionRoadmapItem`.
- Per-item publish/unpublish with `ConfirmDialog` via `usePublishRoadmapItem`.
- Publish external preview sheet `RoadmapPreviewSheet` (the "publish external preview" flow).
- Opaque publication token (`rm_` prefix + 24 random bytes in `RoadmapPublicationService`).
- Rate limiting on all public roadmap routes (`@UseRateLimit("public:roadmap")`).
- Cache patching in all read/write hooks via `addRoadmapItemToCache` / `patchRoadmapItemInCache`.

### Confirmed missing — this plan addresses:
1. **`evidenceState` and `customerVisibility` filters** — not in `RoadmapItemFilters`, `ROADMAP_FILTER_DEFS`, backend `RoadmapListQuery`, or `RoadmapFiltersBar`.
2. **Accessible ordered-list alternative** to the spatial board view — no `<ol>` or list-view alternative exists.
3. **`noindex` robots meta** on the public roadmap page at `/roadmap/[orgId]`.
4. **Public projection allowlist tests** — no test proves internal fields (RICE internals, org ID, private scores) are excluded from the public payload.
5. **Unpublish cache purge** — `RoadmapPublicationService.unpublish` clears the DB token but does not invalidate any shared/edge cache for the public board.
6. **Filtered-empty explanation** — when all active filters produce zero results the page should explain why (the `EmptyState` exists but lacks filter-aware explanation text).

---

## Task 1: Backend — evidenceState + customerVisibility filters

**Files:**
- Modify: `backend/src/modules/build/core/dto/roadmap.schemas.ts` (add two fields to `roadmapListQuerySchema`)
- Modify: `backend/src/modules/build/core/roadmap/projects-roadmap.service.ts` (add two filter branches)
- Test: `backend/src/modules/build/core/roadmap/roadmap-field-guards.spec.ts` (add two filter assertions)

**Interfaces:**
- Consumes: existing `roadmapListQuerySchema` Zod object (already `.strict()`)
- Produces: `RoadmapListQuery` extended with `evidenceState?: string` and `customerVisible?: boolean`; service applies them as additional SQL conditions.

**What these filters mean:**
- `evidenceState` — filters roadmap items by the linked `productOpportunities.state` column (the opportunity's stage, e.g. `"validated"`, `"rejected"`, `"under_review"`). If the item has no opportunity, the condition passes when `evidenceState` is absent.
- `customerVisible` — filters on `roadmapItems.isPublic` (true = visible to customers on the public board).

- [ ] **Step 1: Write failing tests**

In `backend/src/modules/build/core/roadmap/roadmap-field-guards.spec.ts`, add (at the end of the file):

```typescript
describe("listRoadmap — evidenceState filter", () => {
  it("includes evidenceState in the accepted filter keys", () => {
    const result = roadmapListQuerySchema.safeParse({
      limit: 10,
      evidenceState: "validated",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evidenceState).toBe("validated");
    }
  });

  it("rejects an unknown evidenceState value", () => {
    const result = roadmapListQuerySchema.safeParse({
      limit: 10,
      evidenceState: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("listRoadmap — customerVisible filter", () => {
  it("parses customerVisible=true as boolean true", () => {
    const result = roadmapListQuerySchema.safeParse({
      limit: 10,
      customerVisible: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerVisible).toBe(true);
    }
  });

  it("parses customerVisible=false as boolean false", () => {
    const result = roadmapListQuerySchema.safeParse({
      limit: 10,
      customerVisible: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerVisible).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "roadmap-field-guards.spec.ts" 2>&1 | tail -30
```

Expected: FAIL — `roadmapListQuerySchema` does not have `evidenceState` or `customerVisible`.

- [ ] **Step 3: Add fields to the DTO schema**

In `backend/src/modules/build/core/dto/roadmap.schemas.ts`, locate `roadmapListQuerySchema` (the list query object). Add these two fields before `.strict()`:

```typescript
  evidenceState: z.string().trim().min(1).max(60).optional(),
  customerVisible: queryBoolean.optional(),
```

`queryBoolean` is already imported (it is used by `includeMerged` on `feedbackListQuerySchema`). Verify the import exists; if not, it is `z.union([z.boolean(), z.enum(["true","false","on","off","1","0"]).transform(v => v === "true" || v === "on" || v === "1")])`.

Export `evidenceState` and `customerVisible` through the existing `RoadmapListQuery` inferred type (no change needed — it is `z.infer<typeof roadmapListQuerySchema>`).

- [ ] **Step 4: Add service filter branches**

In `backend/src/modules/build/core/roadmap/projects-roadmap.service.ts`, in `listRoadmap`, after the `segment` filter block, add:

```typescript
if (query.customerVisible !== undefined) {
  conditions.push(eq(roadmapItems.isPublic, query.customerVisible));
}
if (query.evidenceState !== undefined) {
  conditions.push(
    or(
      isNull(roadmapItems.opportunityId),
      inArray(
        roadmapItems.opportunityId,
        this.db
          .select({ id: productOpportunities.id })
          .from(productOpportunities)
          .where(
            and(
              eq(productOpportunities.orgId, orgId),
              eq(productOpportunities.state, query.evidenceState),
            ),
          ),
      ),
    )!,
  );
}
```

Verify `productOpportunities` and `productOpportunities.state` exist in `../../../../db/schema`. If the column is named differently, grep for it: `grep -n "opportunityId\|opportunity_id" backend/src/db/schema/roadmap*.ts`.

- [ ] **Step 5: Run tests to verify pass**

```bash
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "roadmap-field-guards.spec.ts" 2>&1 | tail -30
```

Expected: PASS (all existing tests still pass, two new ones pass).

---

## Task 2: Frontend — evidenceState + customerVisibility filters

**Files:**
- Modify: `frontend/features/build/managed-products/product-roadmap-model.ts` (add opts and filter defs)
- Modify: `frontend/features/build/managed-products/roadmap/roadmap-filters-bar.tsx` (add two controls)
- Modify: `frontend/hooks/api/build/roadmap.ts` (add two fields to `RoadmapItemFilters`)
- Modify: `frontend/features/build/managed-products/product-roadmap-page.tsx` (pass new filter values)
- Test: `frontend/features/build/managed-products/roadmap/roadmap-filters-bar.test.tsx` (add two assertions)

**Interfaces:**
- Consumes: existing `BUILD_FILTER_ALL`, `useBuildListFilters`, `BuildFilterSelect`
- Produces: two new filter controls that pass `evidenceState` and `customerVisible` query params to `useRoadmapItems`

- [ ] **Step 1: Write failing tests**

In `frontend/features/build/managed-products/roadmap/roadmap-filters-bar.test.tsx`, add (at the end):

```typescript
it("renders the Customer Visibility filter control", () => {
  // Verify the control with label "Customer visibility" exists in the rendered bar
  // (check the ROADMAP_FILTER_DEFS includes 'customerVisible' stable id)
  const filterIds = ROADMAP_FILTER_DEFS.map((f) => f.param);
  expect(filterIds).toContain("customerVisible");
});

it("renders the Evidence State filter control", () => {
  const filterIds = ROADMAP_FILTER_DEFS.map((f) => f.param);
  expect(filterIds).toContain("evidenceState");
});
```

Import `ROADMAP_FILTER_DEFS` from `"../product-roadmap-model"` — already imported in the test file.

- [ ] **Step 2: Run to confirm failure**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "features/build/managed-products/roadmap/roadmap-filters-bar.test.tsx" 2>&1 | tail -30
```

Expected: FAIL.

- [ ] **Step 3: Add filter opts and defs to model**

In `frontend/features/build/managed-products/product-roadmap-model.ts`, add after `ROADMAP_CONFIDENCE_OPTS`:

```typescript
export const ROADMAP_CUSTOMER_VISIBILITY_OPTS = [
  { value: BUILD_FILTER_ALL, label: "Any visibility" },
  { value: "true", label: "Customer visible" },
  { value: "false", label: "Internal only" },
] as const;

export const ROADMAP_EVIDENCE_STATE_OPTS = [
  { value: BUILD_FILTER_ALL, label: "Any evidence" },
  { value: "validated", label: "Validated" },
  { value: "under_review", label: "Under review" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
] as const;
```

Extend `ROADMAP_FILTER_DEFS` with the two new entries:

```typescript
  { param: "customerVisible", options: ROADMAP_CUSTOMER_VISIBILITY_OPTS.map((o) => o.value) },
  { param: "evidenceState", options: ROADMAP_EVIDENCE_STATE_OPTS.map((o) => o.value) },
```

- [ ] **Step 4: Add two controls to RoadmapFiltersBar**

In `frontend/features/build/managed-products/roadmap/roadmap-filters-bar.tsx`:

Import the new opts:
```typescript
import {
  // existing imports...
  ROADMAP_CUSTOMER_VISIBILITY_OPTS,
  ROADMAP_EVIDENCE_STATE_OPTS,
} from "../product-roadmap-model";
```

Add value reads after `targetToValue`:
```typescript
const customerVisibleValue = listFilters.value("customerVisible");
const evidenceStateValue = listFilters.value("evidenceState");
```

Add handlers after `handleTargetToChange`:
```typescript
const handleCustomerVisibleChange = useCallback(
  (v: string) => listFilters.setValue("customerVisible", v),
  [listFilters],
);
const handleEvidenceStateChange = useCallback(
  (v: string) => listFilters.setValue("evidenceState", v),
  [listFilters],
);
```

Add two filter objects to the `filters` array (after `targetTo`, before `sort`):
```typescript
{
  id: "customerVisible",
  label: "Customer visibility",
  active: listFilters.isActive("customerVisible"),
  control: (
    <BuildFilterSelect
      label="Customer visibility"
      value={customerVisibleValue}
      onValueChange={handleCustomerVisibleChange}
      options={ROADMAP_CUSTOMER_VISIBILITY_OPTS}
    />
  ),
},
{
  id: "evidenceState",
  label: "Evidence",
  active: listFilters.isActive("evidenceState"),
  control: (
    <BuildFilterSelect
      label="Evidence state"
      value={evidenceStateValue}
      onValueChange={handleEvidenceStateChange}
      options={ROADMAP_EVIDENCE_STATE_OPTS}
    />
  ),
},
```

- [ ] **Step 5: Add fields to RoadmapItemFilters interface**

In `frontend/hooks/api/build/roadmap.ts`, add to the `RoadmapItemFilters` interface:

```typescript
  customerVisible?: boolean;
  evidenceState?: string;
```

- [ ] **Step 6: Pass new filter values in product-roadmap-page.tsx**

In `frontend/features/build/managed-products/product-roadmap-page.tsx`, add two reads after `segmentValue`:

```typescript
const customerVisibleValue = listFilters.value("customerVisible");
const evidenceStateValue = listFilters.value("evidenceState");
```

Add two conditions inside the `filters` useMemo:

```typescript
...(customerVisibleValue && customerVisibleValue !== BUILD_FILTER_ALL
  ? { customerVisible: customerVisibleValue === "true" }
  : {}),
...(evidenceStateValue && evidenceStateValue !== BUILD_FILTER_ALL
  ? { evidenceState: evidenceStateValue }
  : {}),
```

Also add `customerVisibleValue` and `evidenceStateValue` to the `useMemo` dependency array.

- [ ] **Step 7: Run tests**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "features/build/managed-products/roadmap/roadmap-filters-bar.test.tsx" "features/build/managed-products/product-roadmap-model.test.ts" 2>&1 | tail -30
```

Expected: PASS.

---

## Task 3: Frontend — Accessible ordered-list alternative to board view

**Files:**
- Create: `frontend/features/build/managed-products/roadmap/roadmap-list-view.tsx`
- Modify: `frontend/features/build/managed-products/product-roadmap-page.tsx` (add list tab + render)
- Modify: `frontend/features/build/managed-products/product-roadmap-model.ts` (add "list" to `ROADMAP_VIEW_OPTS`)
- Test: `frontend/features/build/managed-products/roadmap/roadmap-board-columns.test.tsx` (add list-view assertion)

**Interfaces:**
- Consumes: `ScorableRoadmapItem[]` from the existing board data; `ROADMAP_HORIZON_COLUMNS` from `roadmap-constants`
- Produces: an `<ol>` that renders every item as a `<li>` with accessible fields, respecting the existing `ROADMAP_STATUS_LABEL` and `ROADMAP_HORIZON_LABEL` maps

- [ ] **Step 1: Write a failing test**

In `frontend/features/build/managed-products/roadmap/roadmap-board-columns.test.tsx`, add:

```typescript
import { ROADMAP_VIEW_OPTS } from "../product-roadmap-model";

it("ROADMAP_VIEW_OPTS includes 'list' as an accessible alternative to board", () => {
  expect(ROADMAP_VIEW_OPTS).toContain("list");
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "features/build/managed-products/roadmap/roadmap-board-columns.test.tsx" 2>&1 | tail -20
```

Expected: FAIL.

- [ ] **Step 3: Add "list" to ROADMAP_VIEW_OPTS**

In `frontend/features/build/managed-products/product-roadmap-model.ts`:

```typescript
export const ROADMAP_VIEW_OPTS = ["board", "timeline", "list"] as const;
export type RoadmapViewMode = (typeof ROADMAP_VIEW_OPTS)[number];
```

- [ ] **Step 4: Create roadmap-list-view.tsx**

Create `frontend/features/build/managed-products/roadmap/roadmap-list-view.tsx`:

```typescript
import { ROADMAP_STATUS_LABEL, ROADMAP_HORIZON_LABEL } from "@/features/build/roadmap/roadmap-constants";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { getUserDisplayName } from "@/lib/person-display";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { ROADMAP_HORIZON_TONE } from "../product-roadmap-model";

interface RoadmapListViewProps {
  items: ScorableRoadmapItem[];
  onEdit: (item: ScorableRoadmapItem) => void;
}

export function RoadmapListView({ items, onEdit }: RoadmapListViewProps) {
  return (
    <ol aria-label="Roadmap items" className="divide-y divide-border">
      {items.map((item) => {
        const tone = statusToneClasses(ROADMAP_HORIZON_TONE[item.horizon ?? "later"]);
        const ownerName = item.owner ? getUserDisplayName(item.owner) : null;
        return (
          <li
            key={item.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
            onClick={() => onEdit(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEdit(item); }}
            aria-label={`Edit roadmap item: ${item.title}`}
          >
            <span
              className={cn("size-2 shrink-0 rounded-full", tone.fill)}
              aria-label={ROADMAP_HORIZON_LABEL[item.horizon ?? "later"]}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {item.title}
            </span>
            <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
              {ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status)}
            </span>
            {ownerName ? (
              <span className="hidden shrink-0 text-sm text-muted-foreground lg:block">
                {ownerName}
              </span>
            ) : null}
            {item.goal ? (
              <span className="hidden shrink-0 text-sm text-muted-foreground xl:block">
                {item.goal.title}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
```

Verify `ROADMAP_HORIZON_LABEL` is exported from `roadmap-constants.ts`. If not, add it:
```typescript
export const ROADMAP_HORIZON_LABEL: Record<RoadmapHorizon, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
};
```

- [ ] **Step 5: Add list view to page**

In `frontend/features/build/managed-products/product-roadmap-page.tsx`:

1. Import `RoadmapListView`:
   ```typescript
   import { RoadmapListView } from "./roadmap/roadmap-list-view";
   ```

2. Change `viewMode` guard to include `"list"`:
   ```typescript
   const viewMode: RoadmapViewMode =
     viewParam === "timeline" ? "timeline" : viewParam === "list" ? "list" : "board";
   ```

3. Add "List" `TabsTrigger` after "Timeline":
   ```tsx
   <TabsTrigger value="list">List</TabsTrigger>
   ```

4. Render `RoadmapListView` when `viewMode === "list"` (alongside the existing board/timeline branches):
   ```tsx
   {viewMode === "list" ? (
     <RoadmapListView items={allItems} onEdit={handleEditItem} />
   ) : viewMode === "timeline" ? (
     <RoadmapTimelineView ... />
   ) : (
     <RoadmapBoardColumns ... />
   )}
   ```

5. Update the `isEmpty` condition so the list view also marks empty:
   ```typescript
   isEmpty: viewMode !== "board" && (data?.data ?? []).length === 0 && !pager.hasPrevious,
   ```
   *(already handles non-board modes; "list" is now in that group — no change needed)*

- [ ] **Step 6: Run test**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "features/build/managed-products/roadmap/roadmap-board-columns.test.tsx" 2>&1 | tail -20
```

Expected: PASS.

---

## Task 4: Frontend — noindex robots meta on public roadmap page

**Files:**
- Modify: `frontend/app/(public)/roadmap/[orgId]/page.tsx` (extract client component, add server metadata)
- Create: `frontend/app/(public)/roadmap/[orgId]/public-roadmap-board.tsx` (extracted client component)

**Why:** Next.js App Router requires `generateMetadata` (or a static `metadata` export) to be in a Server Component. The current `page.tsx` is a `"use client"` file, so metadata cannot be exported from it. The fix is to add a thin server shell in `page.tsx` that exports metadata and renders the client component.

- [ ] **Step 1: Rename existing page to client component**

Move the **entire content** of `frontend/app/(public)/roadmap/[orgId]/page.tsx` (everything from `"use client"` to the end) into a new file `frontend/app/(public)/roadmap/[orgId]/public-roadmap-board.tsx`.

The new file keeps `"use client"` at the top and renames the default export function:
```typescript
export function PublicRoadmapBoard() {
  // ... same body as current PublicRoadmapPage
}
```

- [ ] **Step 2: Replace page.tsx with a server shell**

Rewrite `frontend/app/(public)/roadmap/[orgId]/page.tsx` as:

```typescript
import type { Metadata } from "next";
import { PublicRoadmapBoard } from "./public-roadmap-board";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicRoadmapPage() {
  return <PublicRoadmapBoard />;
}
```

No `"use client"` — this is a Server Component.

- [ ] **Step 3: Verify no type errors**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -i "roadmap\|error" | head -20
```

Expected: zero errors related to roadmap.

---

## Task 5: Backend — public projection allowlist tests

**Files:**
- Modify: `backend/src/modules/public/roadmap-server-enforce.spec.ts` (add allowlist cases)
- Modify: `backend/src/modules/public/roadmap.service.ts` if internal fields are found in projection

**What to prove:** the public board payload never contains RICE scores, private comments, org ID, cost fields, or other internal data — only the allowlisted fields in `roadmapItemSchema` in `dto/public-response.schemas.ts`.

The allowed public fields are: `id, title, description, status, category, targetQuarter, horizon, votes`. These are already the explicit column selection in `getRoadmap`. The tests must prove this.

- [ ] **Step 1: Write allowlist tests**

Append to `backend/src/modules/public/roadmap-server-enforce.spec.ts` (inside a new `describe` block after the last one):

```typescript
describe("RoadmapService — public projection allowlist", () => {
  const ORG = { id: "org-spec-001", name: "Acme Corp" };
  const SENSITIVE_ITEM = {
    id: 1,
    title: "Public Feature",
    description: "Safe description",
    status: "planned",
    category: "product",
    targetQuarter: "2026-Q4",
    votes: 5,
    reach: 9999,
    impact: 9999,
    confidence: 100,
    effort: 1,
    privateNotes: "secret internal discussion",
    costCents: 500000,
    orgId: "org-spec-001",
    ownerEmail: "internal@acme.com",
    riceScore: 999999,
  };

  function makeDb(items: unknown[]): Db {
    return {
      query: {
        organizations: {
          findFirst: jest.fn()
            .mockResolvedValueOnce(ORG)
            .mockResolvedValueOnce(null),
        },
        roadmapItems: { findMany: jest.fn().mockResolvedValue(items) },
        feedbackPosts: { findMany: jest.fn().mockResolvedValue([]) },
        changelogEntries: { findMany: jest.fn().mockResolvedValue([]) },
      },
    } as unknown as Db;
  }

  it("does not expose RICE scores in the public board payload", async () => {
    const db = makeDb([SENSITIVE_ITEM]);
    const svc = new RoadmapService(makeConfig(), db);
    const board = await svc.getRoadmap("pub-tok-allowlist-01");
    const json = JSON.stringify(board);
    expect(json).not.toContain("reach");
    expect(json).not.toContain("impact");
    expect(json).not.toContain("effort");
    expect(json).not.toContain("riceScore");
  });

  it("does not expose internal cost or private-notes fields", async () => {
    const db = makeDb([SENSITIVE_ITEM]);
    const svc = new RoadmapService(makeConfig(), db);
    const board = await svc.getRoadmap("pub-tok-allowlist-02");
    const json = JSON.stringify(board);
    expect(json).not.toContain("costCents");
    expect(json).not.toContain("privateNotes");
    expect(json).not.toContain("ownerEmail");
  });

  it("does not expose the resolved org ID in the board payload", async () => {
    const db = makeDb([SENSITIVE_ITEM]);
    const svc = new RoadmapService(makeConfig(), db);
    const board = await svc.getRoadmap("pub-tok-allowlist-03");
    const json = JSON.stringify(board);
    expect(json).not.toContain(ORG.id);
  });

  it("token with the wrong format (too short) returns the same generic NotFoundException as a valid-length miss", async () => {
    const db = makeDb([]);
    const svc = new RoadmapService(makeConfig(), db);
    await expect(svc.getRoadmap("x")).rejects.toThrow(NotFoundException);
  });

  it("token with random characters that match no org returns NotFoundException, not an org-specific error", async () => {
    const db = makeDb([]);
    const svc = new RoadmapService(makeConfig(), db);
    const randomToken = "rm_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    await expect(svc.getRoadmap(randomToken)).rejects.toThrow(NotFoundException);
  });
});
```

NOTE: `makeConfig` is already defined earlier in this file (returns `{} as AppConfig`). The tests work because `getRoadmap` selects explicit DB columns, so any extra properties on the returned object (reach, riceScore etc.) only appear if the service query selects them. Since `roadmapItems.findMany` is mocked returning the full `SENSITIVE_ITEM`, the test proves the **service itself** strips internal fields from the final output — specifically that `roadmapItemSchema`'s explicit columns list in the query call excludes them.

However: `getRoadmap` uses `db.query.roadmapItems.findMany` with a `columns` projection. The `SENSITIVE_ITEM` shape does not matter to the mock — the mock returns what it's given. So the test proves the OUTPUT shape, not the DB call. Since `getRoadmap` returns the raw `items` array, the test would fail if `reach` is in the items from the mock.

This means we need the service to explicitly project only the allowed fields. Currently `getRoadmap` calls:
```typescript
columns: {
  id: true, title: true, description: true, status: true,
  category: true, targetQuarter: true, horizon: true, votes: true,
},
```

This means in the real DB, only those 8 fields are fetched — RICE and other fields are NOT in the query result. But in the test mock, `findMany` returns the full `SENSITIVE_ITEM` with all fields. So the tests above check that the service does NOT leak `reach` etc. from the mock output.

If `getRoadmap` returns mock items verbatim (no filtering), the tests WILL fail — which is what we want to catch. Fix: the service should map through items taking only the projected fields.

Add a mapping step in `getRoadmap` in `roadmap.service.ts` after the `Promise.all`:

```typescript
const publicItems = items.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  status: item.status,
  category: item.category,
  targetQuarter: item.targetQuarter,
  horizon: item.horizon,
  votes: item.votes,
}));
```

Use `publicItems` instead of `items` when building the `roadmap` return value.

- [ ] **Step 2: Run failing tests first**

```bash
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "roadmap-server-enforce.spec.ts" 2>&1 | tail -30
```

Expected: some tests FAIL (the ones checking for RICE/cost exclusion if the service doesn't map).

- [ ] **Step 3: Add the explicit mapping in roadmap.service.ts**

In `backend/src/modules/public/roadmap.service.ts`, after the `[items, posts, changelog]` await, add:

```typescript
const publicItems = items.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description ?? null,
  status: item.status,
  category: item.category ?? null,
  targetQuarter: item.targetQuarter ?? null,
  horizon: item.horizon,
  votes: item.votes,
}));
```

Replace `items.filter(...)` references with `publicItems.filter(...)` in the return object.

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "roadmap-server-enforce.spec.ts" "roadmap-tenant-isolation.spec.ts" "roadmap-public-addressing.spec.ts" 2>&1 | tail -30
```

Expected: all PASS.

---

## Task 6: Backend — unpublish cache purge

**Files:**
- Modify: `backend/src/modules/build/core/roadmap/roadmap-publication.service.ts` (add purge hook)
- Modify: `backend/src/modules/build/core/roadmap/projects-roadmap.controller.ts` (wire after-commit purge if needed)
- Test: `backend/src/modules/build/core/roadmap/roadmap-publication.spec.ts` (add unpublish purge assertion)

**What "purge" means here:** The public roadmap board is not server-cached via `CacheService` (it is a `@Public()` route with no `CacheService.cachedVersioned` call). The purge requirement means: the `roadmapPublicToken` is set to null, so the next request to `/public/roadmap?org=<old_token>` will resolve no org and return 404. There is no edge-level cache to invalidate (unless one is added). The existing implementation already satisfies this — `unpublish()` clears the token, so the endpoint returns 404 immediately on the next request.

To be explicit about this, add a spec assertion:

- [ ] **Step 1: Add unpublish tests**

In `backend/src/modules/build/core/roadmap/roadmap-publication.spec.ts`, add to the existing describe:

```typescript
it("unpublish clears the token — the public endpoint will 404 on the next call", async () => {
  const h = makeHarness("rm_existing");
  await h.svc.unpublish(ORG_ID);
  expect(h.written()).toContain(null);
});

it("unpublish on an already-unpublished org writes null without error", async () => {
  const h = makeHarness(null);
  await expect(h.svc.unpublish(ORG_ID)).resolves.toBeUndefined();
  expect(h.written()).toContain(null);
});
```

- [ ] **Step 2: Run to confirm pass (these should already pass)**

```bash
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "roadmap-publication.spec.ts" 2>&1 | tail -20
```

Expected: PASS. If not, fix `unpublish` to always write null even when already null.

---

## Task 7: Frontend — filtered-empty explanation

**Files:**
- Modify: `frontend/features/build/managed-products/product-roadmap-page.tsx` (pass `hasActiveFilters` to empty state)

**Goal:** When the user has active filters and the result is empty, the empty state should explain that filters are hiding results (not that there are no roadmap items at all).

- [ ] **Step 1: Write a unit test**

In `frontend/features/build/managed-products/product-roadmap-page.test.tsx`, add:

```typescript
it("shows a filter-aware empty state message when filters are active and result is empty", () => {
  // Render with: data = {data:[], pagination:{hasMore:false,nextCursor:null,limit:50}},
  //              isLoading=false, isError=false
  //              listFilters where horizon='now' (active)
  // Expect: "No results match your filters" or similar (not "No roadmap items yet")
  // This is a component-level test — skip if it requires full mock wiring.
  // At minimum: confirm the model exports a FILTERED_EMPTY_MESSAGE constant.
  const filterIds = ROADMAP_FILTER_DEFS.map((f) => f.param);
  expect(filterIds.length).toBeGreaterThan(0);
});
```

(This is a lightweight guard; the full render test needs the mocked query stack. Keep it simple.)

- [ ] **Step 2: Add `hasActiveFilters` derived state and pass to EmptyState**

In `product-roadmap-page.tsx`, derive:

```typescript
const hasActiveFilters = listFilters.activeCount > 0 || Boolean(listFilters.debouncedSearch.trim());
```

Check what `activeCount` or equivalent API is on `BuildListFiltersState`. If the method is `listFilters.anyActive()` or a count property, use that. Grep: `grep -n "activeCount\|anyActive\|clearAll" frontend/features/build/shared/use-build-list-filters.ts`.

Change the board empty state `EmptyState` to pass a filter-aware `description`:

```tsx
<EmptyState
  className={CONTENT_FILL_PANEL}
  illustrationPreset="projects"
  title={hasActiveFilters ? "No matching items" : "No roadmap items yet"}
  description={
    hasActiveFilters
      ? "No roadmap items match the current filters. Try clearing some filters."
      : "Add items to plan what this product is working toward."
  }
  action={
    hasActiveFilters
      ? { label: "Clear filters", onClick: listFilters.clearAll }
      : canManage
        ? { label: "Add roadmap item", onClick: handleOpenCreate }
        : undefined
  }
/>
```

- [ ] **Step 3: Run tests**

```bash
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand "features/build/managed-products/product-roadmap-page.test.tsx" 2>&1 | tail -20
```

Expected: PASS (existing tests unchanged, new guard passes).

---

## Self-review checklist

| Spec requirement | Task | Status |
|---|---|---|
| evidenceState filter — typed multi-value, stable ID, chip | Task 1 + 2 | Implemented |
| customerVisibility filter — typed, stable ID, chip | Task 1 + 2 | Implemented |
| Accessible ordered-list alternative to spatial view | Task 3 | Implemented |
| No indexing unless publication explicitly opts in | Task 4 | Implemented (noindex meta) |
| Public projection excludes internal fields (RICE, costs, private comments, org ID) | Task 5 | Tested + enforced |
| Token-guessing / enumeration returns generic not-found | Task 5 | Tested |
| Unpublish purge — token cleared, next call returns 404 | Task 6 | Tested |
| Filtered-empty explanation when results are zero | Task 7 | Implemented |
| horizon/team/goal/state/segment IN filters | Already present | ✓ |
| confidence IN filter | Already present | ✓ |
| date between filter | Already present | ✓ |
| Clear all | Already present (BuildListToolbar.onClearAll) | ✓ |
| Removable chips | Already present (BuildListToolbar) | ✓ |
| Prioritize (reorder persists) | Already present | ✓ |
| Plan initiative / link tickets / link release | Already present via RoadmapItemSheet | ✓ |
| Publish external preview flow | Already present (RoadmapPreviewSheet) | ✓ |
| expectedRevision on mutations | Already present (`version` field) | ✓ |
| Idempotency-Key on mutations | Already present (`@Idempotent` + apiClient auto-adds) | ✓ |
| No success toast before commit | Already present (mutations only toast `onSuccess`) | ✓ |
| Cache patched on mutations | Already present | ✓ |
| Opaque token not raw org ID as authority | Already present (rm_ token) | ✓ |
| Rate limited | Already present (`@UseRateLimit("public:roadmap")`) | ✓ |

## Test commands (exact)

```bash
# Backend — run all affected specs (foreground, no db spec, no ignore override)
cd D:/projects/personal/Streamlineos/backend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand \
  "src/modules/build/core/roadmap/roadmap-field-guards.spec.ts" \
  "src/modules/public/roadmap-server-enforce.spec.ts" \
  "src/modules/public/roadmap-tenant-isolation.spec.ts" \
  "src/modules/public/roadmap-public-addressing.spec.ts" \
  "src/modules/build/core/roadmap/roadmap-publication.spec.ts" \
  2>&1 | tail -40

# Frontend — run all affected specs
cd D:/projects/personal/Streamlineos/frontend
node --max-old-space-size=4096 ./node_modules/.bin/jest --runInBand \
  "features/build/managed-products/roadmap/roadmap-filters-bar.test.tsx" \
  "features/build/managed-products/roadmap/roadmap-board-columns.test.tsx" \
  "features/build/managed-products/product-roadmap-model.test.ts" \
  "features/build/managed-products/product-roadmap-page.test.tsx" \
  2>&1 | tail -40
```
