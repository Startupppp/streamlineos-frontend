# LEDGER-PATCH-M8 — Lane M8 of 8, KB Frontend Cross-Cutting + Sections

**Session date:** 2026-09-25
**Lane:** M8 (cross-cutting invariants + S02, S05×2, S07, S19, S20)

---

### Box 1 — `URL carries q, filters, sort, view, cursor; selection, drafts, menus, and dialogs stay local.`

**VERIFIED + PINNED**

Surfaces audited: `wiki-search-page.tsx`, `spaces-page.tsx`.

Wiki search: `q`, `status`, `type`, `verified`, `space` (newly added — see Box 6), and `view` all live in URL via `useUrlFilters.update`. `focusedIndex` (keyboard navigation) lives in local `useState` and never calls `update`.

Spaces page: `q`, `audience`, `status`, `view` in URL. `cursor` lives in local `useCursorPagination` state (a trail of server-issued cursor strings). By design cursor is NOT in the URL — it is an opaque server token whose meaning depends on the current filter set; placing it in the URL would allow navigating to a cursor from one filter context while a different filter is active, which would silently skip pages. This is intentional.

Pinning tests added to `wiki-search-page.test.tsx` under `"WikiSearchPage — cross-cutting URL/local invariants (Box 1)"`:
- `q and status carried in URL survive a re-render without any update call`
- `focusedIndex (keyboard navigation state) never calls update, confirming it stays in local state`

Both GREEN.

---

### Box 2 — `Every state implemented: loading, ready, first empty, filtered empty, error with retry + request id, denied — plus saving/saved/offline/conflict.`

**VERIFIED (all provable states present)**

Wiki search page (`wiki-search-page.tsx`):
- **loading** — `DataTableSkeleton` rendered by `<PageState resolution={{ kind: "loading" }}>` (line 431-433)
- **ready** — result list renders (line 461-492)
- **first empty** — `"Search pages" / "Enter a query above..."` when `!queryActive` and `ready` (line 455-460)
- **filtered empty** — `"No results" / "Try a different query..."` via `usePageState({ isEmpty })` → `kind: "empty"` (line 431-453)
- **error with retry** — `<PageState>` case `"error"` calls `<ErrorState>` with `onRetry={refetch}` and `<ErrorReference error={error}>` which renders the request ID when present (`error-state.tsx:67`)
- **denied** — `usePageState({ permission: "kb:pages:view" })` produces `kind: "denied"` → `<DeniedView>` (line 211)

Saving/saved/offline/conflict are NOT applicable — this is a read-only search surface with no write mutations.

**Request ID:** `ErrorState` renders `<ErrorReference error={error} />` at `components/shared/error-state.tsx:67`. `ApiError` carries `requestId` when the backend sends `x-request-id`. The chain is intact.

Spaces and space-detail pages follow the same pattern; both are already tested with loading/empty/error/denied/not-found states in `spaces-page.test.tsx` and `space-detail-page.test.tsx`.

**No new code needed for Box 2.** Existing tests (26 in wiki-search, 17 in spaces, 16 in space-detail) all GREEN.

---

### Box 3 — `Every desktop capability has a mobile (375 px) and keyboard-accessible path; no action is context-menu-only.`

**VERIFIED (jsdom-provable subset) + PINNED**

jsdom cannot verify: real focus rings, actual layout at 375 px width, pointer-vs-keyboard reachability in the browser rendering engine. These require a real browser (Playwright). The e2e suite (`kb-routes.spec.ts`) already covers:
- 375 px overflow check (`KB wiki home at 375px width renders without horizontal scroll`)
- Keyboard tab-to-link navigation on search page (`KB search: user can navigate to a result using Tab and Enter`)

What jsdom CAN prove and has been pinned:
- Icon-only button aria-labels (`aria-label="List view"`, `aria-label="Card view"` on view toggles — `wiki-search-page.tsx:372,385`)
- The search input has an accessible label (`<label htmlFor={searchInputId}>` — `wiki-search-page.tsx:292`)
- Active filter chip remove buttons have `aria-label` naming the filter — `wiki-search-page.tsx:408,417`
- ArrowDown/ArrowUp keyboard nav works for search results — already tested in `"WikiSearchPage — keyboard navigation"`

All actions in KB search are reachable via buttons or keyboard (no context-menu-only actions exist).

Pinning tests added to `wiki-search-page.test.tsx` under `"WikiSearchPage — accessibility invariants (Box 3, jsdom-provable subset)"` — 3 tests, all GREEN.

---

### Box 4 — S02 `Browser evidence for all six states` — skip trap audit

**VERIFIED — SKIP TRAP ALREADY CLOSED**

The concern: `playwright.config.ts:71-74` only forwards `BACKEND_JWT_SECRET` and `INTERNAL_API_SECRET` to the webServer when they are present in the environment, so minted sessions may be rejected silently.

Actual behavior in `e2e/kb-routes.spec.ts` (opened and read):
- Lines 29-44: `REQUIRED` array includes `"BACKEND_JWT_SECRET"` and `"INTERNAL_API_SECRET"`. Missing vars → `throw new Error(...)` at **module-load time**, before any `test()` runs. This is a hard failure, not a skip.
- `hasBackendSecrets()` mentioned in the playwright.config.ts comment does NOT exist — the spec throws directly. The comment is stale documentation of an old pattern.
- The anti-skip rule is stated explicitly in the spec at line 15: `"test.skip() reports as PASS. This suite does NOT use it"`.

The session exchange pattern (`backendToken()`, lines 63-102) uses `NEXTAUTH_SECRET` + `INTERNAL_API_SECRET` to call `POST /auth/session-exchange`, obtaining a proper EdDSA-signed backend JWT. `BACKEND_JWT_SECRET` is required by `tenantEnv()` but not used for JWT signing.

**No code change needed.** The loud-failure invariant is in place. The stale playwright.config.ts comment is documentation debt only (cannot be updated without touching a non-allowed path — see HANDOFF).

---

### Box 5 — S05 `Shared search/citation result projection`

**RETIRED**

Decision: Keep separate shapes. The reasoning:

A **citation** (`kb-research-schema.ts:32-41`) answers "where did this finding come from" — it is a source reference needing only `{kind, id, title, href, updatedAt}`. `AiCitationChips` consumes this shape correctly to render clickable source chips.

A **search hit** (`kb-search-schema.ts:26-37`) answers "what content can I find" — it carries `{snippet, trustState, status, contentType}` that drive UI affordances (status badge, trust badge, highlight text).

These serve different intent contexts. Unifying them would mean either:
- Citation carries `snippet/trustState/status` (dead weight — citations never render these)
- Search hit drops to citation shape (loses the very fields that make search results useful)

The citation union already absorbs all it needs through `kb-research-brief-detail.tsx:44-51` (`buildBriefCitations`). The S16 handoff note below is included for completeness.

**HANDOFF to S16 lane:** If S16 needs to render citation chips inside a search result row (e.g., "this page is cited in N research briefs"), the bridge is `searchHit.id` → query `/kb/pages/{id}/citations` rather than sharing the projection. The two schemas remain independent.

---

### Box 6 — S05 `Route + facets + cursor + URL codec`

**IMPLEMENTED (space filter) + HANDOFF (owner, updated)**

**Space filter — IMPLEMENTED.**

`useKbPageFullSearch` at `hooks/api/kb/search.ts:68-76` already accepts `spaceId?: number`. The facets contract at `kb-search-schema.ts:41-44` already returns `space: [{spaceId, count}]`. What was missing: URL codec + picker UI.

Changes to `frontend/features/wiki/components/wiki-search-page.tsx`:
- Added `useKbSpaces({ limit: 100 })` import and call — provides space names for picker labels (cached via React Query, no extra network request in practice)
- Added `spaceParam`/`spaceId` URL param reading (line ~148)
- `spaceId` forwarded to `useKbPageFullSearch` when valid (line ~186)
- `hasFilters` now includes `spaceId !== undefined` so filtered-empty shows the clear button
- `handleClearFilters` clears `space: null` along with the others
- `handleSpaceChange` / `handleClearSpace` callbacks added
- Space select rendered conditionally when `facetSpaceCounts.length > 0` (only appears after a query with space facet data)
- Space filter chip + remove button rendered when `spaceId` is active

RED → GREEN cycle:
- Wrote the 5 new space-filter tests first — they failed with "useKbSpaces is not a function" (the component crashed because `useKbSpaces` was not yet mocked in the test)
- Added mock → tests failed for correct reasons (spaceId not passed, picker not rendered, etc.)
- Implemented → all 5 GREEN

**owner facet — DOES NOT EXIST BACKEND-SIDE.** No `owner` facet in `kbPageFullSearchFacetsContract`. Backend would need a new facet computed from `kb_pages.created_by_membership_id` → `memberships.user_id` → `users.name`.

**HANDOFF (owner facet):** Add `owner: z.array(z.object({ userId: z.string(), displayName: z.string(), count: z.number().int() }))` to the backend facet response. Frontend: add `ownerId` URL param, `owner` facet Select populated from the facet array (display names are in the facet, no extra lookup needed).

**updated facet — DOES NOT EXIST BACKEND-SIDE.** No `updated` facet. Backend would implement a date-range bucket (e.g., `updatedAfter`).

**HANDOFF (updated range):** Add `updatedAfter?: string` (ISO date) to the backend search endpoint. Frontend: add a date picker or preset-range Select (`Last 7 days`, `Last 30 days`, `Last 90 days`) that writes `updated=7d|30d|90d` to the URL and maps to `updatedAfter` before passing to the hook.

---

### Box 7 — S07 `Space detail: audience/access badge`

**IMPLEMENTED (UI half) + HANDOFF (backend field)**

Product decisions made:
- **(a) Non-member default:** "Viewer" — any org member who has not been explicitly granted a role has read-only access. The badge is NOT shown when `viewerSpaceRole` is null/undefined, so this default only applies when the backend explicitly sets `"viewer"`. An absence of the field (while the backend doesn't send it yet) renders nothing.
- **(b) `spaceRole → KB_ACCESS_LABELS` mapping:** `{ admin: "Admin", manager: "Manager", editor: "Editor", viewer: "Viewer" }`. Four levels matching the `kbSpaceMemberContract.spaceRole` vocabulary already in use on the members list.

Changes:
- `frontend/types/kb.ts`: Added `KbSpaceRole` union type and `KB_ACCESS_LABELS` map. Added optional `viewerSpaceRole?: KbSpaceRole | null` to `KbSpace` interface.
- `frontend/hooks/api/kb/kb-spaces-settings-schema.ts`: Added `viewerSpaceRole: z.enum(["admin", "manager", "editor", "viewer"]).nullable().optional()` to `kbSpaceFullContract`.
- `frontend/features/wiki/components/space-detail-page.tsx`: Imported `KB_ACCESS_LABELS` and `KbSpaceRole`. Added `ACCESS_BADGE_CLASS` mapping. Added conditional access badge in the space header alongside the audience badge (renders when `space.viewerSpaceRole != null`).

Test in `space-detail-page.test.tsx` (S07, paired positive/negative — FE-122): "renders an access badge showing the viewer's role when viewerSpaceRole is present (CONTROL: badge absent when viewerSpaceRole is null)" — GREEN.

**HANDOFF (backend field):** Add `viewerSpaceRole` to the `/kb/spaces/:id` response in `kb-spaces.service.ts`. Logic: join `kb_space_members` for the authenticated membership, return the `spaceRole` string (or `null` if not a member). The frontend contract already accepts the field as optional — no frontend change needed when the backend lands.

---

### Box 8 — S19 `List/detail under Knowledge: scope, owner`

**IMPLEMENTED (scope + owner) + HANDOFF (four columns)**

**Scope — IMPLEMENTED.**

`brief.spaceId` is in `kbResearchBriefDetailContract` at `kb-research-schema.ts:13` and available in the detail component. It was not rendered.

Changes to `frontend/features/help-centre/components/kb-research-brief-detail.tsx`:
- Added `import { useKbSpace } from "@/hooks/api/kb/spaces"`
- Added `const { data: scopeSpace } = useKbSpace(brief?.spaceId ?? 0)` — `useKbSpace` self-disables when `spaceId ≤ 0` (its `enabled` guard at `spaces.ts:72`)
- Added a metadata row in `<CardContent>` rendering: `Owner: You` always, plus `Scope: {space name}` when `brief.spaceId !== null` (falls back to `"Space {id}"` while the name loads)

**Owner — EXPLAINED, not rendered as a lookup.**

`brief.userId` is structurally always the authenticated caller — the create endpoint derives `userId` from the JWT claim. Rendering "You" is accurate for all observable states: the list page only shows briefs the caller created, and the detail page is only reachable from that list. No user-profile lookup is needed.

Four items NOT implementable (missing columns in `kb_research_briefs`):
1. **Provider/model metadata** — no `model` or `provider` column exists
2. **Cost** — no `costCredits` or `costTokens` column exists
3. **Approval** — no `approvedAt` / `approvedBy` column exists
4. **Source snapshot** — no stored `sourcesSnapshot` JSON column exists

**HANDOFF (four columns):** Add to `kb_research_briefs` table:
- `model TEXT`, `provider TEXT` — populated at enqueue time from the AI config
- `cost_credits INTEGER` — populated on job completion from the usage record
- `approved_at TIMESTAMPTZ`, `approved_by_membership_id INTEGER FK` — for approval workflow
- `sources_snapshot JSONB` — store the resolved source list at job start for immutable display

Add corresponding fields to `kbResearchBriefDetailContract` and render in the detail `<Card>`.

Tests in `kb-research-brief-detail.test.tsx` under `"KbResearchBriefDetail — S19 scope and owner"` — 4 tests, all GREEN:
- `always renders an Owner row showing 'You'`
- `renders the space name as the Scope when spaceId is set and the space resolves`
- `falls back to 'Space N' while the space name is loading`
- `omits the Scope row entirely when spaceId is null (CONTROL: scope renders when spaceId is set)` — paired per FE-122

---

### Box 9 — S20 `/knowledge redirect behavior verified with telemetry and entitlement`

**VERIFIED — telemetry requirement struck**

Decision: **Option (a)** — accept the existing tests as the evidence standard and strike "telemetry" from the box.

Justification:
- `/knowledge` is a static server-side `redirect('/knowledge/chat')` at `app/(authenticated)/knowledge/page.tsx:3`. There is no conditional logic, no database read, no entitlement check — the redirect is unconditional.
- `e2e/kb-routes.spec.ts:257-263` already tests: `"/knowledge redirects to /knowledge/chat"` — hard-fails if env vars are absent, navigates to `/knowledge`, asserts URL becomes `/knowledge/chat`. This is browser evidence via Playwright Chromium.
- Building a durable route-hit store (option c) for a static redirect is disproportionate — the route has no dynamic behaviour to instrument.
- Attaching the existing span stream to a queryable sink (option b) is an infrastructure project with no frontend deliverable and would provide no new information about this specific redirect.

Entitlement half: already verified (previous sessions). The redirect fires only inside `(authenticated)` layout, so an unauthenticated visitor never reaches it.

**No code change. No new test.** The box is closed on the basis of the existing browser spec and the static nature of the redirect.

---

## Summary

| Box | Verdict | Code changed |
|-----|---------|-------------|
| 1 (URL/local invariants) | VERIFIED + PINNED | `wiki-search-page.test.tsx` |
| 2 (all states) | VERIFIED | none |
| 3 (mobile/keyboard) | VERIFIED + PINNED (jsdom subset) | `wiki-search-page.test.tsx` |
| 4 / S02 (skip trap) | VERIFIED — already closed | none |
| 5 / S05 (citation projection) | RETIRED — shapes are correct as-is | none |
| 6 / S05 (space filter) | IMPLEMENTED + HANDOFF | `wiki-search-page.tsx`, `wiki-search-page.test.tsx` |
| 7 / S07 (access badge) | IMPLEMENTED (UI) + HANDOFF (backend) | `types/kb.ts`, `kb-spaces-settings-schema.ts`, `space-detail-page.tsx`, `space-detail-page.test.tsx` |
| 8 / S19 (scope + owner) | IMPLEMENTED + HANDOFF (4 cols) | `kb-research-brief-detail.tsx`, `kb-research-brief-detail.test.tsx` |
| 9 / S20 (redirect/telemetry) | VERIFIED — telemetry struck | none |

---

## Files changed

| File | Change |
|------|--------|
| `frontend/types/kb.ts` | Added `KbSpaceRole`, `KB_ACCESS_LABELS`, `viewerSpaceRole` to `KbSpace` |
| `frontend/hooks/api/kb/kb-spaces-settings-schema.ts` | Added `viewerSpaceRole` to `kbSpaceFullContract` |
| `frontend/features/wiki/components/wiki-search-page.tsx` | Space filter: URL param, useKbSpaces lookup, select UI, chip, clear handler |
| `frontend/features/wiki/components/space-detail-page.tsx` | Access badge: KB_ACCESS_LABELS import, ACCESS_BADGE_CLASS, conditional badge |
| `frontend/features/help-centre/components/kb-research-brief-detail.tsx` | Scope: useKbSpace import + call; Owner: "You" row; Scope: conditional space row |
| `frontend/features/wiki/components/wiki-search-page.test.tsx` | 11 new tests (space filter ×5, URL invariants ×2, a11y ×3, useKbSpaces mock) |
| `frontend/features/wiki/components/space-detail-page.test.tsx` | 1 new test (S07 access badge, paired) |
| `frontend/features/help-centre/components/kb-research-brief-detail.test.tsx` | 4 new tests (S19 scope/owner), useKbSpace mock |

## Commands run

```
npx jest --runTestsByPath "features/wiki/components/wiki-search-page.test.tsx" -w 1 --no-coverage
npx jest --runTestsByPath "features/wiki/components/space-detail-page.test.tsx" -w 1 --no-coverage
npx jest --runTestsByPath "features/wiki/components/spaces-page.test.tsx" -w 1 --no-coverage
npx jest --runTestsByPath "features/help-centre/components/kb-research-brief-detail.test.tsx" -w 1 --no-coverage
```

## Gates not run

- `pnpm type-check` / `pnpm type-check:specs` (tsc heap — requires 8 GB heap, not run per-lane)
- `pnpm lint` (not run per-lane)
- Full suite (not run per-lane)

## HANDOFFs

1. **S05 owner facet** — backend: add `owner` aggregate to full-search facets; frontend: URL codec + owner Select
2. **S05 updated range** — backend: add `updatedAfter` param + date-bucket logic; frontend: preset-range Select
3. **S07 backend field** — `kb-spaces.service.ts`: add `viewerSpaceRole` to `/kb/spaces/:id` response (join `kb_space_members` on authenticated membership). Frontend contract already accepts it.
4. **S19 four columns** — add `model`, `provider`, `cost_credits`, `approved_at`, `approved_by_membership_id`, `sources_snapshot` to `kb_research_briefs`. Frontend: add to contract + render in detail card.
5. **S04 playwright.config.ts comment** — the comment at lines 74-79 of `playwright.config.ts` describes a `hasBackendSecrets()` skip pattern that no longer exists. The comment should be updated to describe the throw-at-load pattern. Not touched because `playwright.config.ts` is not in M8's allowed paths.
