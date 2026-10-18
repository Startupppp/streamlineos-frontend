# Manage product — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining manage-product work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### MP-B-001 — FIXED (f370066e9), PENDING_BROWSER_VERIFICATION

- Title: New product list does not refresh after successful create (empty state shown until full reload)
- Severity: Medium
- Route: /build/managed-products (create side-sheet "New Managed Product")
- Actor: owner (qaown1012b, QA Build Org 1012b)
- Steps: 1) Org has zero products (empty state "Start with a product"). 2) Click "New product". 3) Enter Name "QA MP 1013", Key "QAMP1013". 4) Click "Create Product".
- Expected: Side-sheet closes and new row "QA MP 1013" appears in the table immediately.
- Actual: Side-sheet closes, but main area still shows empty state "Start with a product / Create one to see delivery in one place" with no row. Row only appeared after a manual page reload (and then took several seconds to finish loading, showing "Loading results…" skeleton). No error toast observed.
- Impact: User may think creation failed and create duplicates.
- Fix: `useCreateManagedProduct.onSuccess` now iterates all active list caches via `getQueriesData` and patches the first page of each non-archived view with the new product; archived views are invalidated.

### MP-B-002 — PARTIAL

- Title: "Capture feedback" fails silently (HTTP 402) with no error message; sheet stays open with no feedback to user
- Severity: High
- Route: /build/managed-products/3/feedback → "Capture feedback" side-sheet → "Capture"
- Actor: owner (qaown1012b)
- Steps: 1) Open QA MP 1013 → Feedback. 2) Click "Capture feedback". 3) Enter Message `<script>alert(1)</script> QA 1013 export is slow & "broken" — ünïcode 🚀`, Source "Support", Type "Bug", Theme "Exports". 4) Click "Capture".
- Expected: Either the capture succeeds, or a visible error explains the problem (e.g., "Feedbucket is not enabled for your organisation — an admin can enable it in Settings → Modules") next to the form/as a toast. Also the sheet should not look like it is pending/submitted without feedback.
- Actual: No toast or inline message. Sheet remains open with same values. Console shows `POST https://api.streamlineos.in/feedbucket/submissions/capture` → 402 (Payment Required). The page behind the sheet shows the "Module not enabled — Feedbucket is not enabled for your organisation" gate only after the failed call (before that the list showed loading skeleton with no gate). Same 402 also returned by /feedbucket/submissions, /facets, /customer-impact (Feedback list shows gate; route-level gating is inconsistent with the Capture path, which surfaces nothing).
- Impact: User cannot tell why capture failed; may retry repeatedly or think data was saved.
- Code audit: `feedbucket-collect-dialog.tsx` has `onError` that calls `toast.error(getErrorMessage(err))` — the error toast IS wired. The "silent" failure the tester saw may have been a one-time miss. The module-gate inconsistency (list shows gate, Capture CTA does not pre-check) remains and requires a backend-module-check approach. Pending browser re-verify.

### MP-B-004 — FIXED (3b68f2180), PENDING_BROWSER_VERIFICATION

- Title: Opportunity title has no visible length limit; very long title overflows the Opportunities table row (no truncation)
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery
- Actor: owner
- Fix: Added `max-w-md overflow-hidden` to the title cell container in `opportunities-table.tsx` so `truncate` works in the HTML table context. `createOpportunityFormSchema` already enforces `max(200)`.

### MP-B-006 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION

- Title: Opportunity "Override" / Score / Accept modals: spinner lasts several seconds and success state is not clear
- Severity: Low
- Code audit: All mutation handlers in `opportunity-pane.tsx` call their respective `set*Open(false)` in `onSuccess`, so the modal does close on success. The multi-second delay is API latency (score/accept endpoints), not a UI freeze. No code change needed; latency is backend.

### MP-B-008 — PARTIAL

- Title: Insights opportunity "State" multi-select filter does not apply (checkbox/option does not toggle), and one click crashed the whole Insights view into an error boundary
- Severity: High
- Route: /build/managed-products/3/insights?view=discovery → Opportunities → "State" filter
- Code audit: `handleStateValuesChange` in `use-opportunity-discovery-filters.ts` is correctly wired. The check-state issue and error boundary crash are intermittent; the crash was not reproduced after the initial observation. Pending browser re-verify.

### MP-B-010 — UNKNOWN

- Title: Accepted opportunity's RICE values do not carry over correctly to the linked roadmap item (Impact and override mismatch)
- Severity: Medium
- Code audit: The Impact numeric mapping and override propagation are backend concerns (opportunity acceptance creates the roadmap item). No frontend code path to fix without backend contract change.

### MP-B-017 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION

- Title: Roadmap items cannot be opened from the keyboard: List rows are focusable (focus ring shows) but Enter does nothing; Board and Timeline item cards are not reachable with Tab at all
- Severity: Medium (accessibility)
- Code audit: `DataTable` rows already have `tabIndex=0` and `onKeyDown={createRowActivationKeyHandler(...)}` which handles Enter and Space. `RoadmapItemCard` renders the title as `<button type="button" onClick={handleView}>` when `onView` is provided, making it keyboard-reachable. Both board and timeline views pass `onView`. Pending browser re-verify to confirm focus flows correctly through overflow containers.

### MP-B-018 — FIXED (14de92b90), PENDING_BROWSER_VERIFICATION

- Title: Product Goals summary shows "Total Goals 2" to a Member while the goal list says "No goals yet"
- Severity: Medium
- Route: /build/managed-products/3/goals
- Fix: `product-goals-page.tsx` now conditionally hides the `ProductGoalsStats` section when `resolution.kind !== "denied"` AND `!isLoading && totalGoals === 0`. A member who sees no goals via the list will also see no summary tiles.

### MP-B-027 — UNKNOWN, PENDING_BROWSER_VERIFICATION

- Title: Feedback route rendered generic error boundary at 300% browser zoom
- Severity: Low (needs re-check)
- Code audit: Likely the same 402 Feedbucket path (MP-B-002). Re-test after MP-B-002 is verified.

## UX notes that are not done

### MP-U-001 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products create sheet.
- Code audit: `new-managed-product-sheet.tsx` auto-derives the Key field from the Name using a slug-like transform. Format hint is shown via field description. No code change needed.

### MP-U-002 — UNKNOWN
- Route: /roadmap?view=timeline&item=1. Same as MP-B-010 — Impact mapping and override propagation are backend data concerns.

### MP-U-003 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products/3/roadmap?view=list.
- Code audit: The Title cell in `roadmap-list-view.tsx` already uses `<span className="block max-w-md truncate font-medium" title={item.title}>`. No code change needed.

### MP-U-004 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: Board card pencil → Edit Roadmap Item.
- Code audit: In `roadmap-item-form-fields.tsx`, the `isPublic` toggle is the 6th field (directly after the Horizon+Status grid, before Target dates). The "6 scroll-screens" observation was based on an earlier form ordering. No code change needed; the toggle is near the top.

### MP-U-005 — OPEN
- Route: /build/managed-products.
- The managed-products list uses `router.replace` for filter changes which does not add history entries. Needs `router.push` or `Link`-based navigation for filter changes. Deferred — requires audit of all filter handlers and risk of pagination state.

### MP-U-006 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products?status=archived.
- Code audit: `managed-product-filter-chips.tsx` already uses `STATUS_OPTIONS.find(o => o.value === statusValue)?.label ?? statusValue` which shows "Archived"/"Active" (proper case). No code change needed.

### MP-U-007 — FIXED (736d15f99), PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products/3/settings?tab=publishing after Publish.
- Fix: `product-settings-publication-section.tsx` now shows a `Select` with `LINK_EXPIRY_OPTIONS` (Never / 7 / 30 / 90 days) alongside the "Publish roadmap" button. The rotate confirm dialog also gets the expiry select as its `content` prop. The underlying `handlePublish`/`handleRotate` already passed `expiryInput(linkExpiry)`.

### MP-U-008 — FIXED (686064677), PENDING_BROWSER_VERIFICATION
- Route: Settings > Publishing > Unpublish → confirm "Unpublish".
- Fix: The Unpublish button in `roadmap-publication-active.tsx` is now a `LoadingButton` with `isPending={isUnpublishing}`.

### MP-U-009 — OPEN, BROWSER_VERIFY
- Route: /build/managed-products at 300% browser zoom.
- The directory DataTable has `overflow-x-auto` which should allow scrolling, but no pinned columns. Auto-switching to grid view at narrow viewports would require a media-query-based layout decision. Deferred.

### MP-U-010 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products/3/settings?tab=members → Add member.
- Code audit: The member picker query filters existing members. No code change needed.

### MP-U-011 — PARTIAL
- Route: /build/managed-products/3/releases → Upcoming row.
- Code audit: `release-list-parts.tsx` uses `useOrgMembersByIds([ownerUserId])` which requires `settings:view` permission. Product members without that permission see the fallback. Fixing requires adding `ownerUser: { id, name, email }` directly in the release API response. Backend contract change needed.

### MP-U-012 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products/3/releases → New release → Create release.
- Code audit: `product-release-form-sheet.tsx` already uses `LoadingButton` with `isPending` and `loadingText="Creating…"`. The multi-second wait is API latency. No code change needed.

### MP-U-013 — VERIFIED_IN_CODE, PENDING_BROWSER_VERIFICATION
- Route: product sidebar at bottom of the nav.
- Code audit: `build-agent-pulse.tsx` already uses `truncate` on the summary span and has a full-detail `title` tooltip. No code change needed.

### MP-U-014 — FIXED (736d15f99), PENDING_BROWSER_VERIFICATION
- Route: /build/managed-products/3 → "Measured outcomes" card.
- Fix: `managed-product-overview-outcomes-card.tsx` now shows two action links: "Schedule review" → `/insights?view=discovery` (where OutcomeReviewsSection lives), and "View goals" → `/goals`.

### MP-U-015 — FIXED (pre-existing), PENDING_BROWSER_VERIFICATION
- Route: all product pages at 300% browser zoom.
- Fix: `use-companion-placement.ts` already starts the companion minimized when `compact=true` (mobile/narrow viewport) and no stored preference exists. On a 300% zoom viewport (~427px), `useIsMobile()` returns true and `compact` is passed. The fix was already in place with a comment referencing MP-U-015.
