# Lane 3 — Requests

## ORCHESTRATOR RULING on R-1 (2026-09-26): APPLIED, with a different prop name and placement

Applied as `search.inputRef`, not a top-level `searchInputRef`. A top-level prop would be meaningless
whenever `search` is absent; `BuildToolbarSearch` already groups every search concern, so the ref
belongs there beside `value`, `onValueChange`, `placeholder` and `label`.

- `frontend/features/build/shared/build-list-toolbar-layout.ts:16` — `inputRef?: RefObject<HTMLInputElement | null>`
  on `BuildToolbarSearch`. That type matches `useBuildListKeyboard`'s `searchInputRef` at
  `use-build-list-keyboard.ts:20` exactly, so it threads through with no cast.
- `frontend/features/build/shared/build-list-toolbar.tsx:105` — `ref={search.inputRef}` on `SearchInput`.
  No `forwardRef` was needed: `components/ui/search-input.tsx:26` already forwards to `HTMLInputElement`.
- `frontend/features/build/shared/build-list-toolbar.test.tsx` — two tests, paired so neither is
  vacuous: the ref resolves to the same node `getByLabelText` finds and focusing it takes focus, and
  the toolbar still renders with no ref supplied.
- `frontend/UI-KIT.md:17` — row extended per FE-62.

Verified: `npx jest features/build/shared/build-list-toolbar` → 2 suites, 24 tests, all pass.

**Call it as `search={{ value, onValueChange, placeholder, inputRef }}`** — not `searchInputRef={...}`.

---

## R-1: `BuildListToolbar` — expose `searchInputRef` prop

**File:** `frontend/features/build/shared/build-list-toolbar.tsx`
**Requestor:** Lane 3
**Reason:** `useBuildListKeyboard` accepts an optional `searchInputRef` to focus the search input when the user presses `/`. `BuildListToolbar` wraps the search input but does not forward a ref. All four pages that use `BuildListToolbar` (managed-products, goals, roadmap, feedbucket pages in managed-products territory) are blocked on the `/` shortcut until this ref is forwarded.

**Change:** Add `searchInputRef?: React.RefObject<HTMLInputElement | null>` to `BuildListToolbarProps` and pass it to `SearchInput`'s `ref` prop (or through a `forwardRef` on the search wrapper).

---

## R-2: `listManagedProductsQuerySchema` — add `ownerId` and `sort` fields — RESOLVED

**Status:** Implemented directly by Lane 3 this session (file is in Lane 3 territory).
- `backend/src/modules/build/managed-products/dto/managed-products.schemas.ts` — `ownerId: z.string().optional()` and `sort: z.enum(["name","updated","status"]).optional()` added, `.strict()` retained.
- `backend/src/modules/build/managed-products/managed-products.service.ts` — `ownerId` filter and `sort`-dependent `orderBy` + cursor strategy (keysetAfterValue for text sorts, keysetBeforeId for timestamp sorts).
- `frontend/hooks/api/build/managed-products.ts` — `ownerId` and `sort` added to `ListManagedProductsParams` and forwarded to the API call.
- `frontend/features/build/managed-products/managed-products-page.tsx` — `sort` filter chip and `ownerId` URL param wired via `useBuildListFilters`.
- Tests: 4 new backend service tests covering ownerId SQL condition and sort-dependent ORDER BY.

---

## R-3: `feedbucket_submissions` — add `duplicate` detection column (backend)

**File:** `backend/src/modules/feedbucket/` + a migration in range 1250–1254
**Requestor:** Lane 3
**Reason:** The spec (`10-project-feedbucket.md`) lists `duplicate` as a deep-linkable query parameter. The backend test (`feedbucket-list-filters.spec.ts:109-112`) explicitly records this as "unservable, strict schema rejects it — no duplicate column in feedbucket_submissions." Implementing `duplicate` filter requires a backend schema change (new column or computed predicate) and migration.

**Note:** This is a data-model decision (what makes a submission a duplicate?) that requires an explicit design decision before it can be implemented.
