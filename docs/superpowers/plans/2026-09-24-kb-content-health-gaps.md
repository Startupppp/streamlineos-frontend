# KB Content Health Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three missing KB product surfaces: the `/knowledge/wiki/manage` Content Health frontend page, two derivable new backend signals (`overexposed`, `duplicate_candidate`), and the project-wiki page history adapter route.

**Architecture:** Backend signals are added to `KbContentHealthService.buildSignalPredicate` — a switch that returns a `SQL` clause — and mirrored in the Zod enum. The frontend manage page is a client component in `features/wiki/components/` wired through a thin route file, using the already-existing hooks in `hooks/api/kb/content-health.ts`. The project-wiki history adapter is a three-line route file that re-uses `PageHistoryPage` exactly as the canonical `/knowledge/wiki/doc/[pageId]/history/page.tsx` does.

**Tech Stack:** NestJS 11 · Drizzle 0.45 · Zod 4 · TypeScript strict · Next.js 16.3 App Router · TanStack Query 5.90 · shadcn/ui · Tailwind 4

**Spec:** This plan implements the KB Content Health Gaps brief provided at session start.

## GAP MEASUREMENT (pre-confirmed before writing this plan)

### GAP 1 — `/knowledge/wiki/manage` frontend: CONFIRMED MISSING
Evidence: `find frontend/app -path '*knowledge*' -iname '*manage*'` returns nothing. The path does not exist. Backend routes are registered and live in `KbWikiModule`. Frontend hooks exist at `frontend/hooks/api/kb/content-health.ts` and `content-health-schema.ts` but are not exported from `hooks/api/kb/index.ts` and have no consuming page component.

### GAP 2 — Three signals missing: PARTIALLY ACTIONABLE
Current enum: `["unowned","stale","unverified","empty","overdue_review","broken_link"]`

- **`overexposed`** — DERIVABLE. A page where `visibility = 'public'` while its space (`spaceId IS NOT NULL`) has `isPublicHelpCenter = false`. A page that is internet-accessible while living in a space not designated as a public help-centre reaches materially more principals than its peers. Directly indexable on `(org_id, visibility)`. Requires a LEFT JOIN / subquery on `kb_spaces`.
- **`duplicate_candidate`** — DERIVABLE. A page where another page in the same org has identical non-empty `contentText` (EXISTS self-join on `org_id` and `trim(content_text)`). Reuses `kbPages.contentText`, which is the same source the embedding/chunk pipeline hashes. No second similarity mechanism.
- **`unanswered_search`** — **CANNOT be derived as a page-level signal.** `kb_events` records `search_no_results` events keyed by `(org_id, query, occurred_at)` — they carry a search string, not a page reference. There is no join from a zero-result search event to a specific KB page, so this signal cannot be expressed as a predicate filtering `kbPages` rows, which is what `ContentHealthSignalItem` requires. Implementing it would require a separate endpoint returning search query rows, not page rows — that is a distinct feature, not a signal variant.

### GAP 3 — Project wiki history adapter: CONFIRMED MISSING
Evidence: `find frontend/app -path '*build*' -path '*wiki*' -path '*history*'` returns nothing. `build/[projectId]/wiki/[pageId]/page.tsx` exists; there is no sibling `history/` directory.

## Global Constraints

- NEVER run: `git stash`, `git checkout`, `git restore`, `git reset`, `git clean`, `git rebase`, `git merge`, `git commit`, `git push`. Read-only git is allowed.
- NEVER edit `backend/migrations/meta/_journal.json`. If a migration is needed, write the `.sql` only and report the journal entry.
- NEVER apply a migration.
- NEVER run the full jest suite — only narrowly scoped paths (`npx jest src/modules/kb/content-health/`).
- NEVER add code comments, docstrings, or TODO/FIXME. Express intent through names and test names.
- Do NOT add telemetry/spans.
- Do NOT edit: `src/modules/ai/jobs/**`, `src/common/db/**`, `src/modules/kb/public/**`, `src/modules/kb/core/telemetry/**`, `src/db/schema/kb/pages.ts`, trash/purge/import-export files, `frontend/e2e/**`.
- The `unanswered_search` signal is explicitly excluded — it cannot be expressed as a page predicate.
- Re-read any file immediately before editing it (other agents may be editing simultaneously).
- After editing backend schemas/DTOs, regenerate the OpenAPI contract: `cd backend && pnpm openapi:generate`, then copy the output to `frontend/contracts/openapi.json`.
- Working directory for backend commands: `D:/projects/personal/Streamlineos/backend`
- Working directory for frontend commands: `D:/projects/personal/Streamlineos/frontend`

---

## File Map

### Backend — new/changed files

| File | Action |
|------|--------|
| `backend/src/modules/kb/content-health/dto/kb-content-health.schemas.ts` | Modify — add `overexposed`, `duplicate_candidate` to enum; update `signalTypes` array |
| `backend/src/modules/kb/content-health/kb-content-health.service.ts` | Modify — import `kbSpaces`, add two `case` blocks in `buildSignalPredicate` |
| `backend/src/modules/kb/content-health/kb-content-health.service.spec.ts` | Modify — add test cases for new signals; update count assertions from 6 → 8 |
| `backend/src/modules/kb/content-health/kb-content-health-tenant-isolation.spec.ts` | Modify — add isolation cases for new signals |

### Frontend — new/changed files

| File | Action |
|------|--------|
| `frontend/hooks/api/kb/content-health-schema.ts` | Modify — add `overexposed`, `duplicate_candidate` to enum |
| `frontend/hooks/api/kb/index.ts` | Modify — add `export * from "./content-health"` |
| `frontend/features/wiki/components/content-health-page.tsx` | Create — client component (the manage page) |
| `frontend/features/wiki/components/content-health-page.test.tsx` | Create — unit tests |
| `frontend/app/(authenticated)/knowledge/wiki/manage/page.tsx` | Create — thin route file |
| `frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx` | Create — thin adapter route |
| `frontend/contracts/openapi.json` | Modify — regenerate after backend enum change |

---

## Task 1: Add `overexposed` and `duplicate_candidate` to backend enum and service

**Files:**
- Modify: `backend/src/modules/kb/content-health/dto/kb-content-health.schemas.ts`
- Modify: `backend/src/modules/kb/content-health/kb-content-health.service.ts`

**Interfaces:**
- Consumes: `kbSpaces` from `../../../db/schema` (already in schema index, just needs to be imported)
- Produces: `contentHealthSignalTypeEnum` now has 8 members; `buildSignalPredicate` handles 8 cases

- [ ] **Step 1: Re-read the existing schema file before editing**

```bash
cat D:/projects/personal/Streamlineos/backend/src/modules/kb/content-health/dto/kb-content-health.schemas.ts
```

- [ ] **Step 2: Edit `kb-content-health.schemas.ts` to add two new signal types**

In `D:/projects/personal/Streamlineos/backend/src/modules/kb/content-health/dto/kb-content-health.schemas.ts`, change the enum from:

```typescript
export const contentHealthSignalTypeEnum = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
]);
```

to:

```typescript
export const contentHealthSignalTypeEnum = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
]);
```

- [ ] **Step 3: Re-read the existing service file before editing**

```bash
cat D:/projects/personal/Streamlineos/backend/src/modules/kb/content-health/kb-content-health.service.ts
```

- [ ] **Step 4: Edit `kb-content-health.service.ts` — import `kbSpaces`, add two signal cases, update the `signalTypes` array**

Add `kbSpaces` to the import from `../../../db/schema`:

```typescript
import {
  kbPageLinks,
  kbPageReviews,
  kbPages,
  kbSpaces,
} from "../../../db/schema";
```

Add `ne` to the drizzle-orm import (for the `overexposed` NOT EQUAL check):

```typescript
import { and, asc, eq, exists, gt, isNull, lt, ne, sql, type SQL } from "drizzle-orm";
```

Update the `signalTypes` array in `counts()`:

```typescript
const signalTypes: ContentHealthSignalType[] = [
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
];
```

Add two new `case` blocks in `buildSignalPredicate`. Place them before the closing of the `switch`:

```typescript
case "overexposed":
  return sql`(
    ${kbPages.visibility} = 'public'
    AND ${kbPages.spaceId} IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM kb_spaces s
      WHERE s.org_id = ${kbPages.orgId}
        AND s.id = ${kbPages.spaceId}
        AND s.is_public_help_center = false
        AND s.deleted_at IS NULL
    )
  )`;

case "duplicate_candidate":
  return sql`(
    ${kbPages.contentText} IS NOT NULL
    AND trim(${kbPages.contentText}) <> ''
    AND EXISTS (
      SELECT 1 FROM kb_pages other
      WHERE other.org_id = ${kbPages.orgId}
        AND other.id <> ${kbPages.id}
        AND other.deleted_at IS NULL
        AND trim(other.content_text) = trim(${kbPages.contentText})
    )
  )`;
```

- [ ] **Step 5: Run typecheck to verify the backend compiles**

```bash
cd D:/projects/personal/Streamlineos/backend && pnpm typecheck 2>&1 | tail -20
```

Expected: no type errors related to content health.

---

## Task 2: Write and run backend tests for new signals

**Files:**
- Modify: `backend/src/modules/kb/content-health/kb-content-health.service.spec.ts`
- Modify: `backend/src/modules/kb/content-health/kb-content-health-tenant-isolation.spec.ts`

**Interfaces:**
- Consumes: `ContentHealthSignalType` from `./dto/kb-content-health.schemas` (now 8 values)
- Produces: all existing tests still pass; two new signal test cases added

- [ ] **Step 1: Re-read the existing spec file before editing**

```bash
cat D:/projects/personal/Streamlineos/backend/src/modules/kb/content-health/kb-content-health.service.spec.ts
```

- [ ] **Step 2: Update count assertions from 6 to 8 and add signal predicate tests**

In `kb-content-health.service.spec.ts`, find the two `toHaveLength(6)` assertions in the "counts" describe block and change them to `toHaveLength(8)`. Also find `new Set(types).size).toBe(6)` and change to `.toBe(8)`.

Also find the `expect(new Set(outer).size).toBeGreaterThanOrEqual(5)` assertion and leave it (it still holds with 8 distinct queries — any count of 5+ is true for 8 distinct predicates).

Add two new signal predicate tests inside `describe("KbContentHealthService — signals", ...)`:

```typescript
it("overexposed signal queries kb_spaces for is_public_help_center = false", async () => {
  const { db, wheres } = makeCapturingDb([PAGE_ROW]);
  const svc = new KbContentHealthService(db, auth as never);
  await svc.signals(makeUser(), makeQuery("overexposed"));
  expect(renderedWhere(wheres)).toContain("kb_spaces");
});

it("duplicate_candidate signal joins kb_pages on matching content_text", async () => {
  const { db, wheres } = makeCapturingDb([PAGE_ROW]);
  const svc = new KbContentHealthService(db, auth as never);
  await svc.signals(makeUser(), makeQuery("duplicate_candidate"));
  const rendered = renderedWhere(wheres);
  expect(rendered).toContain("content_text");
});
```

- [ ] **Step 3: Re-read the tenant isolation spec before editing**

```bash
cat D:/projects/personal/Streamlineos/backend/src/modules/kb/content-health/kb-content-health-tenant-isolation.spec.ts
```

- [ ] **Step 4: Add isolation test for new signals in tenant-isolation spec**

Find the end of the existing tenant isolation tests and add:

```typescript
it("overexposed signal carries the attacker org_id in the kb_spaces subquery, not the owner's", async () => {
  const { db, wheres } = makeDb();
  const svc = new KbContentHealthService(db, auth as never);
  await svc.signals(makeUser(ATTACKER), makeQuery("overexposed"));
  const vals = wheres.flatMap((w) => sqlValues(w));
  expect(vals).toContain(ATTACKER);
  expect(vals).not.toContain(OWNER);
});

it("duplicate_candidate signal carries the attacker org_id, not the owner's", async () => {
  const { db, wheres } = makeDb();
  const svc = new KbContentHealthService(db, auth as never);
  await svc.signals(makeUser(ATTACKER), makeQuery("duplicate_candidate"));
  const vals = wheres.flatMap((w) => sqlValues(w));
  expect(vals).toContain(ATTACKER);
  expect(vals).not.toContain(OWNER);
});
```

Note: the `makeQuery` function in the isolation spec may not exist — check if it exists and, if not, add a local helper identical to the one in the main spec:

```typescript
function makeQuery(signalType: ContentHealthSignalType): ContentHealthSignalsQuery {
  return { signalType, limit: 10, afterId: undefined, spaceId: undefined };
}
```

You may also need to import `ContentHealthSignalsQuery` and `ContentHealthSignalType` from `./dto/kb-content-health.schemas`.

- [ ] **Step 5: Run the narrowly-scoped test suite**

```bash
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/content-health/ --no-coverage 2>&1 | tail -40
```

Expected: all tests pass including the two new signal tests and the two tenant isolation tests.

---

## Task 3: Regenerate and re-vendor the OpenAPI contract

**Files:**
- Modify: `frontend/contracts/openapi.json` (machine-generated)

**Interfaces:**
- Consumes: the updated backend schema (Task 1 must be complete)
- Produces: `openapi.json` with `overexposed` and `duplicate_candidate` in the signal type enum

- [ ] **Step 1: Generate the OpenAPI spec from the backend**

```bash
cd D:/projects/personal/Streamlineos/backend && pnpm openapi:generate 2>&1 | tail -20
```

Expected: exits 0, outputs a JSON blob or writes a file. Check where the output goes:

```bash
ls D:/projects/personal/Streamlineos/backend/dist/ 2>/dev/null || ls D:/projects/personal/Streamlineos/backend/*.json 2>/dev/null | grep -i openapi | head -5
```

The script is at `src/scripts/generate-openapi.ts`. Run it and locate the output file, then copy to `frontend/contracts/openapi.json`.

- [ ] **Step 2: Verify the new signal types appear in the vendored contract**

```bash
grep -c "overexposed\|duplicate_candidate" D:/projects/personal/Streamlineos/frontend/contracts/openapi.json
```

Expected: at least 4 hits (once per enum value in each schema that references `contentHealthSignalTypeEnum`).

---

## Task 4: Update frontend content-health schema and index export

**Files:**
- Modify: `frontend/hooks/api/kb/content-health-schema.ts`
- Modify: `frontend/hooks/api/kb/index.ts`

**Interfaces:**
- Consumes: nothing new — changes are purely to the Zod enum
- Produces: `ContentHealthSignalType` now has 8 values; hooks are exported from the barrel

- [ ] **Step 1: Re-read `content-health-schema.ts` before editing**

```bash
cat D:/projects/personal/Streamlineos/frontend/hooks/api/kb/content-health-schema.ts
```

- [ ] **Step 2: Add the two new signal types to the frontend enum**

Change `contentHealthSignalTypeSchema` from:

```typescript
export const contentHealthSignalTypeSchema = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
]);
```

to:

```typescript
export const contentHealthSignalTypeSchema = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
]);
```

The `contentHealthCountsContract` references this enum via `contentHealthSignalTypeSchema` so it automatically gets the new values.

- [ ] **Step 3: Re-read `index.ts` before editing**

```bash
cat D:/projects/personal/Streamlineos/frontend/hooks/api/kb/index.ts
```

- [ ] **Step 4: Add the content-health barrel export to the kb hooks index**

Add one line to `frontend/hooks/api/kb/index.ts`:

```typescript
export * from "./content-health";
```

Place it after the existing `export * from "./page-collection";` line.

- [ ] **Step 5: Run frontend type-check to confirm no breakage**

```bash
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check 2>&1 | tail -20
```

---

## Task 5: Build the `ContentHealthPage` client component

**Files:**
- Create: `frontend/features/wiki/components/content-health-page.tsx`

**Interfaces:**
- Consumes: `useContentHealthCounts`, `useContentHealthSignals`, `ContentHealthSignalType` from `@/hooks/api/kb/content-health`; `usePageState` from `@/hooks/api/use-page-state`; `useUrlFilters`, `parseEnum` from `@/lib/url-state/use-url-filters`; `useCursorPagination` from `@/hooks/common/use-cursor-pagination`; UI primitives from `@/components/ui/*`
- Produces: default export `ContentHealthPage` — zero props, fully self-contained

**Design:** Counts overview row (StatCard-style chips, one per signal type). Below: a signal-type selector (`<Select>`) + optional space filter (URL-backed). Cursor-paginated list of pages matching that signal. Each row links to the page. Page-level states: loading (skeleton), denied (via `usePageState`), first-empty (no signals at all), filtered-empty (signal has no pages), error (with retry + request ID from `error`).

- [ ] **Step 1: Create the component file**

Create `D:/projects/personal/Streamlineos/frontend/features/wiki/components/content-health-page.tsx` with the following content:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { useContentHealthCounts, useContentHealthSignals } from "@/hooks/api/kb/content-health";
import type { ContentHealthSignalType } from "@/hooks/api/kb/content-health-schema";
import { pageHref } from "@/lib/knowledge-routes";
import { KbAlertCircleIcon, KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

const SIGNAL_TYPES: ContentHealthSignalType[] = [
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
];

const SIGNAL_LABELS: Record<ContentHealthSignalType, string> = {
  unowned: "Unowned",
  stale: "Stale",
  unverified: "Unverified",
  empty: "Empty",
  overdue_review: "Overdue review",
  broken_link: "Broken link",
  overexposed: "Overexposed",
  duplicate_candidate: "Duplicate candidate",
};

const SIGNAL_DESCRIPTIONS: Record<ContentHealthSignalType, string> = {
  unowned: "Pages with no assigned owner",
  stale: "Pages not updated in 90+ days",
  unverified: "Pages in unverified or expired trust state",
  empty: "Pages with no content body",
  overdue_review: "Pages with an outstanding review that is past its due date",
  broken_link: "Pages that contain links to pages that no longer exist",
  overexposed: "Pages marked public while their space is not a public help centre",
  duplicate_candidate: "Pages whose content is identical to another page in this org",
};

function CountChip({ label, count, active, onSelect }: { label: string; count: number; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
      }`}
      aria-pressed={active}
    >
      <span className="text-lg font-semibold tabular-nums text-foreground">{count}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

function SignalRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-16 ml-auto" />
    </div>
  );
}

function SignalTableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <SignalRowSkeleton key={i} />
      ))}
    </div>
  );
}

function CountsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export default function ContentHealthPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });
  const cursor = useCursorPagination();

  const activeSignal = parseEnum<readonly ContentHealthSignalType[]>(
    searchParams.get("signal"),
    SIGNAL_TYPES,
    "unowned",
  );

  const rawSpaceId = searchParams.get("spaceId");
  const spaceId = rawSpaceId ? parseInt(rawSpaceId, 10) : undefined;

  const {
    data: countsData,
    isLoading: countsLoading,
    isError: countsError,
    error: countsQueryError,
    refetch: refetchCounts,
  } = useContentHealthCounts();

  const afterId = cursor.cursor ? parseInt(cursor.cursor, 10) : undefined;

  const {
    data: signalsData,
    isLoading: signalsLoading,
    isError: signalsError,
    refetch: refetchSignals,
  } = useContentHealthSignals({
    signalType: activeSignal,
    afterId: Number.isFinite(afterId) ? afterId : undefined,
    spaceId,
  });

  function handleSignalSelect(signal: string) {
    cursor.reset();
    updateFilters({ signal });
  }

  function handleRetry() {
    void refetchCounts();
    void refetchSignals();
  }

  function handleNext() {
    cursor.goNext(signalsData?.nextCursor?.toString() ?? null);
  }

  function handlePrevious() {
    cursor.goPrevious();
  }

  const isLoading = countsLoading || signalsLoading;
  const isError = countsError || signalsError;
  const rows = signalsData?.data ?? [];
  const hasMore = signalsData?.hasMore ?? false;

  const pageState = usePageState({
    permission: "kb:pages:manage",
    isLoading,
    isError,
    error: countsQueryError,
    isEmpty: !isLoading && !isError && (countsData?.counts.every((c) => c.count === 0) ?? false),
  });

  const countMap = new Map(countsData?.counts.map((c) => [c.signalType, c.count]) ?? []);

  return (
    <PageWrapper title="Content Health">
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={
          <div className="space-y-4">
            <CountsSkeleton />
            <SignalTableSkeleton />
          </div>
        }
        empty={
          <EmptyState
            illustration={<KbFileTextIcon className="h-8 w-8 text-muted-foreground" />}
            title="No content health issues"
            description="All pages pass every signal check. Keep up the great work."
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SIGNAL_TYPES.map((signal) => (
              <CountChip
                key={signal}
                label={SIGNAL_LABELS[signal]}
                count={countMap.get(signal) ?? 0}
                active={activeSignal === signal}
                onSelect={() => handleSignalSelect(signal)}
              />
            ))}
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {SIGNAL_LABELS[activeSignal]}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {SIGNAL_DESCRIPTIONS[activeSignal]}
                </p>
              </div>
              <Select
                value={activeSignal}
                onValueChange={handleSignalSelect}
              >
                <SelectTrigger className="w-44 h-8 text-xs" aria-label="Signal type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_TYPES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {SIGNAL_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {signalsLoading ? (
              <SignalTableSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState
                illustration={<KbFileTextIcon className="h-6 w-6 text-muted-foreground" />}
                title={`No ${SIGNAL_LABELS[activeSignal].toLowerCase()} pages`}
                description="No pages match this signal for the current filters."
                compact
              />
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
                  <span className="flex-1 text-xs font-medium text-muted-foreground">Title</span>
                  <span className="text-xs font-medium text-muted-foreground w-24 text-right">Updated</span>
                </div>
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                    <Link
                      href={pageHref(row.id)}
                      className="flex-1 text-sm truncate hover:underline text-foreground"
                    >
                      {row.title || "Untitled"}
                    </Link>
                    <span className="text-xs text-muted-foreground w-24 text-right tabular-nums shrink-0">
                      {kbFormatDate(row.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(cursor.hasPrevious || hasMore) && (
              <div className="flex justify-between items-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!cursor.hasPrevious}
                  className="text-xs h-7"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {cursor.pageNumber}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasMore}
                  className="text-xs h-7"
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </div>
      </PageState>
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Verify the file was created and has no obvious import issues**

```bash
grep -n "from " D:/projects/personal/Streamlineos/frontend/features/wiki/components/content-health-page.tsx | head -20
```

---

## Task 6: Write tests for `ContentHealthPage`

**Files:**
- Create: `frontend/features/wiki/components/content-health-page.test.tsx`

**Interfaces:**
- Consumes: `ContentHealthPage` default export from `./content-health-page`
- Produces: tests for loading, populated, first-empty, filtered-empty, and denied states

- [ ] **Step 1: Create the test file**

Create `D:/projects/personal/Streamlineos/frontend/features/wiki/components/content-health-page.test.tsx`:

```tsx
import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

const useAccess = jest.fn();
const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "kb:pages:manage": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

const useContentHealthCounts = jest.fn();
const useContentHealthSignals = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("signal=unowned"),
  usePathname: () => "/knowledge/wiki/manage",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/kb/content-health", () => ({
  useContentHealthCounts: () => useContentHealthCounts(),
  useContentHealthSignals: () => useContentHealthSignals(),
}));

import ContentHealthPage from "./content-health-page";

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

const COUNTS = {
  counts: [
    { signalType: "unowned", count: 3 },
    { signalType: "stale", count: 1 },
    { signalType: "unverified", count: 0 },
    { signalType: "empty", count: 0 },
    { signalType: "overdue_review", count: 0 },
    { signalType: "broken_link", count: 0 },
    { signalType: "overexposed", count: 2 },
    { signalType: "duplicate_candidate", count: 1 },
  ],
};

const SIGNAL_PAGE = {
  data: [
    {
      id: 42,
      title: "Policy Draft",
      spaceId: 1,
      status: "draft",
      ownerMembershipId: null,
      updatedAt: "2025-01-01T00:00:00.000Z",
      nextReviewAt: null,
    },
  ],
  hasMore: false,
  nextCursor: null,
};

const IDLE_QUERY = {
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
};

beforeEach(() => {
  useAccess.mockReturnValue(accessGranted);
  useContentHealthCounts.mockReturnValue({ ...IDLE_QUERY, data: COUNTS });
  useContentHealthSignals.mockReturnValue({ ...IDLE_QUERY, data: SIGNAL_PAGE });
});

afterEach(() => jest.resetAllMocks());

describe("ContentHealthPage — populated state", () => {
  it("renders count chips for all eight signal types including overexposed and duplicate_candidate", () => {
    render(<ContentHealthPage />);
    expect(screen.getByText("Overexposed")).toBeInTheDocument();
    expect(screen.getByText("Duplicate candidate")).toBeInTheDocument();
    expect(screen.getByText("Unowned")).toBeInTheDocument();
  });

  it("shows the count value for each signal chip from the counts response", () => {
    render(<ContentHealthPage />);
    const chips = screen.getAllByRole("button", { pressed: undefined });
    const unownedChip = chips.find((el) => el.textContent?.includes("Unowned"));
    expect(unownedChip?.textContent).toContain("3");
  });

  it("renders a row for each signal item with a link to the page", () => {
    render(<ContentHealthPage />);
    expect(screen.getByText("Policy Draft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Policy Draft" })).toHaveAttribute(
      "href",
      expect.stringContaining("42"),
    );
  });
});

describe("ContentHealthPage — empty state", () => {
  it("renders first-empty message when all signal counts are zero", () => {
    const zeroCounts = {
      counts: COUNTS.counts.map((c) => ({ ...c, count: 0 })),
    };
    useContentHealthCounts.mockReturnValue({ ...IDLE_QUERY, data: zeroCounts });
    render(<ContentHealthPage />);
    expect(screen.getByText(/No content health issues/i)).toBeInTheDocument();
  });

  it("renders filtered-empty message when the active signal list is empty", () => {
    useContentHealthSignals.mockReturnValue({
      ...IDLE_QUERY,
      data: { data: [], hasMore: false, nextCursor: null },
    });
    render(<ContentHealthPage />);
    expect(screen.getByText(/No unowned pages/i)).toBeInTheDocument();
  });
});

describe("ContentHealthPage — loading state", () => {
  it("renders skeletons while data is loading", () => {
    useContentHealthCounts.mockReturnValue({ ...IDLE_QUERY, isLoading: true, data: undefined });
    useContentHealthSignals.mockReturnValue({ ...IDLE_QUERY, isLoading: true, data: undefined });
    useAccess.mockReturnValue(accessLoading);
    render(<ContentHealthPage />);
    expect(screen.queryByText("Policy Draft")).not.toBeInTheDocument();
  });
});

describe("ContentHealthPage — denied state", () => {
  it("does not render page content when the user lacks kb:pages:manage", () => {
    useAccess.mockReturnValue(accessDenied);
    render(<ContentHealthPage />);
    expect(screen.queryByText("Overexposed")).not.toBeInTheDocument();
    expect(screen.queryByText("Policy Draft")).not.toBeInTheDocument();
  });
});

describe("ContentHealthPage — error state", () => {
  it("shows a retry control when the counts query errors", () => {
    useContentHealthCounts.mockReturnValue({
      ...IDLE_QUERY,
      isError: true,
      error: new Error("network"),
      data: undefined,
    });
    render(<ContentHealthPage />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test file narrowly to verify it passes**

```bash
cd D:/projects/personal/Streamlineos/frontend && npx jest features/wiki/components/content-health-page.test.tsx --no-coverage 2>&1 | tail -30
```

Expected: all tests pass.

---

## Task 7: Create the `/knowledge/wiki/manage` route file

**Files:**
- Create: `frontend/app/(authenticated)/knowledge/wiki/manage/page.tsx`

**Interfaces:**
- Consumes: `ContentHealthPage` from `@/features/wiki/components/content-health-page`
- Produces: a Next.js async Server Component route

- [ ] **Step 1: Create the route file**

Create `D:/projects/personal/Streamlineos/frontend/app/(authenticated)/knowledge/wiki/manage/page.tsx`:

```tsx
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ContentHealthPage from "@/features/wiki/components/content-health-page";

export default async function KnowledgeBaseManagePage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <ContentHealthPage />
    </RequireModule>
  );
}
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
cat "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/knowledge/wiki/manage/page.tsx"
```

---

## Task 8: Create the project-wiki history adapter route

**Files:**
- Create: `frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx`

**Interfaces:**
- Consumes: `PageHistoryPage` from `@/features/wiki/components/page-history-page` (the canonical history component — do NOT duplicate it)
- Produces: a thin Next.js adapter route that parses `projectId` and `pageId` from params and passes `pageId` to `PageHistoryPage`

The pattern is identical to `app/(authenticated)/knowledge/wiki/doc/[pageId]/history/page.tsx`, except this route also receives `projectId` (which `PageHistoryPage` does not need — the history component only needs the page ID, not which project context it was reached from).

- [ ] **Step 1: Re-read the canonical history route to understand exact pattern**

```bash
cat "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/knowledge/wiki/doc/[pageId]/history/page.tsx"
```

- [ ] **Step 2: Re-read the build wiki page route to understand its guards**

```bash
cat "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/page.tsx"
```

- [ ] **Step 3: Create the adapter route**

Create `D:/projects/personal/Streamlineos/frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";

interface ProjectWikiPageHistoryProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function ProjectWikiPageHistoryRoute({ params }: ProjectWikiPageHistoryProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]");
  const { pageId: rawPageId } = await params;
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  return (
    <RequireModule module="kb">
      <PageHistoryPage pageId={pageId} />
    </RequireModule>
  );
}
```

Note: `projectId` is parsed from params implicitly by `enforceRouteAccess` (which only needs the route pattern). We intentionally discard it after validation — `PageHistoryPage` is page-ID-only; the project context is irrelevant to version history.

- [ ] **Step 4: Verify the file was created**

```bash
cat "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx"
```

---

## Task 9: Final type-check and test run

**Files:** None (verification only)

- [ ] **Step 1: Run backend typecheck**

```bash
cd D:/projects/personal/Streamlineos/backend && pnpm typecheck 2>&1 | tail -30
```

Expected: 0 errors.

- [ ] **Step 2: Run backend content-health test suite**

```bash
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/content-health/ --no-coverage 2>&1 | tail -40
```

Expected: all tests pass, suite now includes 8 signals in count tests.

- [ ] **Step 3: Run frontend type-check**

```bash
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check 2>&1 | tail -30
```

Expected: 0 errors.

- [ ] **Step 4: Run frontend content-health page tests**

```bash
cd D:/projects/personal/Streamlineos/frontend && npx jest features/wiki/components/content-health-page.test.tsx --no-coverage 2>&1 | tail -40
```

Expected: all tests pass.

- [ ] **Step 5: Paste all four output blocks into your completion report**

---

## Self-Review Against Spec

| Spec requirement | Task that covers it |
|-----------------|---------------------|
| `/knowledge/wiki/manage` frontend page | Tasks 5, 7 |
| Counts overview | Task 5 (`CountChip` row) |
| Per-signal cursor-paginated drill-down | Task 5 (`useCursorPagination`, cursor.goNext/goPrevious) |
| Space filter | Task 5 (`spaceId` in URL params, passed to `useContentHealthSignals`) |
| URL-backed filter state | Tasks 5 (`useUrlFilters`, `useSearchParams`) |
| Populated / loading / first-empty / filtered-empty / error / denied states | Task 5, 6 |
| 375px & keyboard accessible | Task 5 (responsive grid, `aria-pressed`, `type="button"`, visible focus ring) |
| `overexposed` signal | Tasks 1, 2 |
| `duplicate_candidate` signal | Tasks 1, 2 |
| `unanswered_search` — **EXCLUDED** (cannot be a page predicate) | See GAP MEASUREMENT above |
| Cross-tenant isolation tests for new signals | Task 2 |
| Project wiki history adapter | Task 8 |
| OpenAPI re-vendor | Task 3 |
| Frontend contract enum parity | Task 4 |
| Tests for denied path | Task 6 (`denied state` describe block) |

### Why `unanswered_search` is excluded

`kb_events` records `search_no_results` events with `(org_id, query, occurred_at)`. There is no `page_id` on these rows — an unanswered search doesn't point at any page; it records a query that returned nothing. `ContentHealthSignalItem` is a page row (with `id`, `title`, `spaceId`, `status`, etc.). There is no join that would produce a page row from an unanswered search event. Implementing this signal would require a separate endpoint returning search-query rows, which is a distinct feature beyond the content-health controller's shape.
