# STREAMLINEOS PER-PAGE AUDIT FRAMEWORK

> Claude Code: Execute ALL phases below, in order, for EVERY page.
> Do not skip a phase. Do not mark a page complete until Phase 6 passes.
> Severity levels (P0–P3) are defined in DESIGN_SYSTEM.md §7.

---

## PHASE 0 — PAGE INVENTORY (once per module, before any page)

1. List every route in the module by scanning the Next.js App Router folder
   (`page.tsx` files, including dynamic routes like `[id]`, and modal/intercepted routes).
2. For each route, note: URL path, page file path, main components used, and the
   backend endpoints it calls (search for the TanStack Query hooks / API client calls).
3. Write this inventory into `PAGES.md` (see MASTER_PROMPT for format).
4. Do NOT start Phase 1 until the inventory is complete and shown to the user.

---

## PHASE 1 — VISUAL AUDIT (Tester + Designer lens)

Open the page in the browser (logged in with a role that has full access to the module).

1. **Screenshot** the default state at 1440px width. Save/reference it in the report.
2. **Colors:** Every color on the page must map to a token in DESIGN_SYSTEM.md §1.
   Check the component source for hardcoded hex/rgb/arbitrary Tailwind values.
3. **Readability:** Can every piece of text on every card be read easily?
   Flag any place where the background color dominates the content or borders
   are invisible against the background (known StreamlineOS problem — check every card).
4. **Spacing:** Verify paddings/margins sit on the 8px grid (§2). Compare sibling
   cards, sibling buttons, sibling form fields — inconsistency between siblings is P2.
5. **Page shell:** Header, title position, content width, page padding identical to
   the previously audited pages? Any drift is P2.
6. **Typography:** One H1, correct heading hierarchy, sizes from the scale (§3).
7. **Buttons:** Correct variant usage (one primary per section, danger for destructive),
   uniform height in toolbars, all six states present (§4).
8. **Tables/cards/lists:** Match the app-wide standard (§4).
9. **Status colors:** Same status = same color as every other page already audited.
10. **The five mandatory states (§5):** Throttle the network / use invalid data to
    force each state. Screenshot each. Missing state = P1.
11. **Light/Dark/multi-theme conformance (added 2026-07-14):** audit the page in BOTH
    light and dark mode, and spot-check at least one non-default accent theme
    (theme system: `frontend/themes.css`, 18 accent palettes; mode/accent switch in
    the shell settings). Defects: any colored light-tint chip/banner missing its
    `dark:` variants (`bg-X-50 text-X-700 border-X-200` must carry
    `dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`) = P1 in dark mode;
    hardcoded `bg-white`/`slate-*`/hex neutrals instead of semantic tokens = P2;
    interactive accent surfaces using literal `blue-*` instead of theme tokens
    (`bg-primary` tints, `--ring`) = P2; unreadable text in dark mode = P1.
12. **Computed-style consistency (browser DevTools, added 2026-07-14):** using
    `getComputedStyle` in the live browser, extract padding, margin, height, width,
    font-size, font-weight, and border-color for the page's repeated primitives —
    page header/title, filter-bar controls, toolbar buttons, cards, table header +
    rows, badges — and compare against the SAME primitives on sibling pages.
    Any sibling mismatch (different toolbar control heights, different card padding,
    different title weight, different filter-bar spacing) is a P2 defect; record the
    measured values as evidence, not adjectives.

Record every finding: `[P#] [Visual] description — file:line — expected vs actual`.

---

## PHASE 2 — INTERACTION AUDIT (QA Tester lens)

Interact with EVERYTHING on the page. For each interactive element:

1. **Every button:** Click it. Does it do what its label says? Does it show a loading
   state while pending? Does it double-fire if clicked twice quickly? (Rapid
   double-click on submit must NOT create two records — P0 if it does.)
2. **Forms:**
   - Submit empty → every required field shows a specific inline error (not a generic
     toast, not silence).
   - Enter invalid data (bad email, negative number, 500-char name) → proper
     validation messages.
   - Submit valid data → success toast, list/detail updates WITHOUT manual refresh,
     form resets or closes as appropriate.
3. **Delete flow (MANDATORY end-to-end test):**
   a. Click Delete on a real (test) record.
   b. Confirmation modal MUST open (no modal = P0). Verify copy names the item.
   c. Click Cancel → modal closes, nothing deleted.
   d. Click Delete again → Confirm → success toast → item disappears from the list
      immediately → refresh page → item still gone.
   e. Check the network tab: correct endpoint, correct status code.
4. **Edit flow:** Open edit, verify form is PRE-FILLED with current values (empty
   edit forms are a common defect — P1), change one field, save, verify persistence
   after refresh.
5. **Filters & search:** Apply each filter individually → results actually change and
   are correct. Combine filters → correct AND behavior. Clear filters → full list
   returns. Search with a term that exists, a term that doesn't (empty state must
   show), and special characters (no crash). Verify pagination + filter interaction:
   go to page 2, apply filter — does it reset to page 1 correctly?
6. **Pagination/sorting:** Change page, change page size, sort each sortable column
   both directions.
7. **Navigation & dead links (hardened 2026-07-14):** Every link/row-click goes to the
   right place; browser Back returns with state intact (or at least without a crash).
   Crawl EVERY navigation target on the page (hrefs, router.push calls, quick-nav
   buttons, breadcrumbs, empty-state CTAs): a target that lands on a 404/not-found
   page is P0 — fix the link or build/redirect the missing route. A button that does
   NOTHING when clicked (no handler, no navigation, no dialog, no toast) is P1 —
   dead buttons are defects, wire them or remove them.
8. **Error handling:** With DevTools, block/fail the main API call → page must show
   the error state with Retry, not a blank screen or infinite spinner.
9. **Console:** Zero errors and zero React warnings during all of the above. Any
   console error is at least P2; hydration errors are P1.
10. **Permissions:** If feasible, repeat key actions with a low-permission role —
    actions the role lacks must be hidden/disabled, and the API must also reject
    them (UI-only hiding is a defect; backend must enforce via AccessService).

Record: `[P#] [Interaction] steps to reproduce — expected vs actual — endpoint involved`.

---

## PHASE 3 — BACKEND AUDIT (Developer lens)

For every endpoint this page calls (from the Phase 0 inventory + network tab):

1. **Trace the full path** in the NestJS codebase: controller → service → repository/ORM.
   Business logic must live in NestJS, not in the Next.js frontend (architecture rule).
2. **Performance:**
   - Measure response time in the network tab under realistic data. > 2s = P1, > 5s = P0.
   - Look for N+1 queries: loops that call the DB, missing eager-loads/joins,
     per-row queries in a map. Enable ORM query logging if needed and count queries
     for one list request — a list page should be O(1–3) queries, not O(n).
   - Check pagination is done in the DATABASE (LIMIT/OFFSET or cursor), not by
     fetching all rows and slicing in JS (P0 for large tables).
   - Check missing indexes on columns used in WHERE / ORDER BY / foreign keys of
     this endpoint's queries. Propose the exact index.
3. **Payload:**
   - Response must contain only fields the page uses (plus ids). Flag overfetching
     (entire relations serialized, password hashes, internal fields) — P1/P0 for
     sensitive fields.
   - List endpoints must support/enforce pagination limits (no unbounded findAll).
4. **Schema complexity:** If the query is expensive because the schema forces 5-way
   joins for a simple list, document it and propose a concrete simplification
   (denormalized column, computed field, junction cleanup) with a reversible
   migration plan. Do NOT silently change schemas — see gate rules in MASTER_PROMPT.
5. **Correctness & safety:**
   - DTO validation (class-validator) on every input; no `any` bodies.
   - AccessService / RBAC guard on every mutating endpoint AND tenant scoping on
     every query (multi-tenant platform: a query without a tenant filter is P0).
   - Delete endpoints: confirm soft-delete vs hard-delete matches product intent;
     verify cascades don't destroy unrelated data.
   - Race conditions on create/update (unique constraints vs check-then-insert).
   - Proper HTTP codes and consistent error response shape.
6. **Caching:** For hot, read-heavy endpoints, note whether caching exists/is needed
   and whether invalidation happens on mutation.

Record: `[P#] [Backend] endpoint — issue — evidence (query count, ms, payload size) — proposed fix`.

---

## PHASE 4 — PRODUCT MANAGER REVIEW

Step back and judge the page as a PM who cares about the end user:

1. Does the page's layout match its job? Is the most important info/action prominent?
2. Are filters the RIGHT filters for this data (not just the easy ones)? Are any
   critical filters missing (e.g., date range on a transactions list)?
3. Is anything missing that users obviously need: bulk actions, export, column
   visibility, status visibility, breadcrumbs, a create button on an empty list?
4. Is the copy human? Error messages must say what happened and what to do.
   Button labels must be verbs. No developer jargon shown to users.
5. Is this page consistent with its siblings? Would a user moving from the CRM list
   to the HRMS list feel like it's the same product?
6. **Redesign decision:** classify the page as
   - `FIX` — issues are local; patch them, or
   - `REDESIGN` — layout/IA is fundamentally wrong; write a short redesign spec
     (what changes, why, sketch of the new structure) and get user approval before
     implementing (gate rule in MASTER_PROMPT).
7. List improvements as P3 suggestions unless they block the user's task (then P1).

---

## PHASE 5 — FIX IMPLEMENTATION (Developer lens)

1. Fix in priority order: P0 → P1 → P2 → P3 (P3 only with user approval).
2. **Scope discipline:** minimal, targeted edits. Do not refactor unrelated code,
   do not change conditions/colors/behavior that weren't flagged, respect the
   500-line file cap (target ≤300) — if a fix pushes a file over, extract components.
3. Frontend fixes: replace hardcoded values with tokens, add missing states,
   fix spacing to the grid, add confirmation modals, wire proper error handling
   through the shared TanStack Query patterns.
4. Backend fixes: rewrite queries (joins/eager-loading), add DB-level pagination,
   add indexes via migration files, trim DTOs, add validation and guards.
5. Shared-component rule: if the same defect exists on many pages (e.g., the Card
   or Table component), fix the SHARED component once, then verify affected pages
   rather than patching each page.
6. After each fix: run `build` and `lint` for the touched app(s). Both must pass.

---

## PHASE 6 — VERIFICATION (Tester lens, again)

1. Reload the page in the browser. Re-run every failed check from Phases 1–3.
2. Re-run the delete flow, the form submit flow, and the filter flow end-to-end
   in the browser — actually click them, don't assume.
3. Take an "after" screenshot at 1440px; compare with the "before" screenshot.
4. Confirm zero console errors, build passing, lint passing.
5. Only when every P0/P1/P2 finding is verified fixed (or explicitly deferred by
   the user), mark the page ✅ in PAGES.md with a one-line summary of what changed.
6. Then, and only then, move to the next page.

---

## REPORT FORMAT (per page, produced at end of Phase 4, updated after Phase 6)

```
### PAGE: /hrms/employees  (apps/web/src/app/hrms/employees/page.tsx)
Endpoints: GET /hrms/employees, DELETE /hrms/employees/:id
Decision: FIX | REDESIGN

FINDINGS
[P0][Interaction] Delete removes record with no confirmation modal — page.tsx:142
[P1][Visual] Card text unreadable, bg-slate-200 dominates; border invisible — EmployeeCard.tsx:18
[P1][Backend] GET /hrms/employees runs 1+N queries (one per employee for department) — employees.service.ts:44 — 87 queries for 86 rows, 3.4s
[P2][Visual] p-5 on filter card vs p-6 on sibling cards — off system
[P3][PM] Add department filter; users can currently only search by name

FIXES APPLIED
- Added ConfirmDialog to delete flow (frontend) + verified in browser
- EmployeeCard: bg → surface token, border → border token, contrast now AA
- employees.service.ts: leftJoinAndSelect on department, added index migration on employees.department_id — 3 queries, 240ms
- Filter card padding normalized to p-6

VERIFICATION
- Delete flow: modal opens → cancel works → confirm deletes → survives refresh ✅
- Build ✅ Lint ✅ Console clean ✅  Before/after screenshots attached
```
