# L54 Review Fixes Report

## Finding 1 — reports-hub-client.tsx description conditional
DONE. Made `description` conditional on `search`: passes `undefined` when search is active (line 179).
File: `frontend/features/accounting/reports/reports-hub-client.tsx`

## Finding 2 — my-tickets-page.tsx description conditional
DONE. Made `description` `undefined` when `hasActiveFilters && myTickets.length > 0`, preserving the three-state distinction (no tickets / filters hiding tickets / results). Line 229.
File: `frontend/features/build/my-tickets/my-tickets-page.tsx`

## Finding 3 — ticket-detail-right-panel.tsx CSS width transition
DONE. Removed `AnimatePresence`/`motion.aside`/`pmSnappy` entirely. Replaced with always-mounted `<aside>` using `transition-[width] duration-300 ease-in-out overflow-hidden`. Closed: `w-0 min-w-0`; open: `asideClassName`. Reduced motion: `duration-0`. Unused imports removed.
File: `frontend/features/build/ticket-details/ticket-detail-right-panel.tsx`

## Finding 4 — leads-funnel-view.tsx scaleX bar animation
DONE. Added `useReducedMotion`. Wrapped the gradient bar div in `motion.div` with `initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}`, `originX: 0`, `delay: idx * 0.08 + 0.1`. Reduced motion: `duration: 0`. Row stagger was already present via the outer `motion.div`.
File: `frontend/features/crm/leads/leads-funnel-view.tsx`

## Finding 5 — workload collapse CSS grid-rows
DONE (both files). Removed `AnimatePresence`/`motion.div` opacity-only collapses. Replaced with always-mounted CSS grid-rows containers using `grid-rows-[0fr]/[1fr] transition-[grid-template-rows] duration-200`. Content wrapped in `overflow-hidden` inner div. Reduced motion: `duration-0`.
Files: `frontend/features/build/views/workload-member-row.tsx`, `frontend/features/build/views/workload-view.tsx`

## Finding 6 — invoice-detail-panels.tsx credit notes pagination
OUT-OF-OWNERSHIP. `useCreditNotes` has no `invoiceId` filter parameter; `ListCreditNotesParams` in `frontend/hooks/api/accounting/ar.ts` only supports `status`, `clientId`, `page`, `pageSize`. The backend route `GET /accounting/credit-notes` (`backend/src/modules/accounting/ar/credit-notes/credit-notes.controller.ts`) needs an `invoiceId` query param and corresponding filter in the service.

## Finding 7 — reconciliation-match-panel.tsx NaN confidence
DONE. Guarded `parseFloat(s.confidence)` with `Number.isFinite`. When not finite, `confidencePct = null` → renders "—" instead of a bar. 3 tests added and passing.
File: `frontend/features/accounting/banking/components/reconciliation-match-panel.tsx`
Test: `frontend/features/accounting/banking/components/reconciliation-match-panel.test.tsx`

## Tests added
3 new tests in reconciliation-match-panel.test.tsx: NaN → no bar + "—"; valid 85 → scaleX(0.85) + "85%"; 0 → scaleX(0).

## Build/validation
- `pnpm type-check`: clean (no errors)
- `pnpm check:empty-states`, `pnpm check:icon-labels`, `pnpm check:formatters`: all pass
- jest: 158 suites / 1407 tests — all pass

## NEW FINDINGS
None.
