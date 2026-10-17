# Manage product — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining manage-product work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### MP-B-001 — PARTIAL

- Title: New product list does not refresh after successful create (empty state shown until full reload)
- Severity: Medium
- Route: /build/managed-products (create side-sheet "New Managed Product")
- Actor: owner (qaown1012b, QA Build Org 1012b)
- Steps: 1) Org has zero products (empty state "Start with a product"). 2) Click "New product". 3) Enter Name "QA MP 1013", Key "QAMP1013". 4) Click "Create Product".
- Expected: Side-sheet closes and new row "QA MP 1013" appears in the table immediately.
- Actual: Side-sheet closes, but main area still shows empty state "Start with a product / Create one to see delivery in one place" with no row. Row only appeared after a manual page reload (and then took several seconds to finish loading, showing "Loading results…" skeleton). No error toast observed.
- Impact: User may think creation failed and create duplicates.
- Suggested fix: Invalidate/refetch the managed-products query on create success, and show a success toast linking to the new product.

### MP-B-002 — PARTIAL

- Title: "Capture feedback" fails silently (HTTP 402) with no error message; sheet stays open with no feedback to user
- Severity: High
- Route: /build/managed-products/3/feedback → "Capture feedback" side-sheet → "Capture"
- Actor: owner (qaown1012b)
- Steps: 1) Open QA MP 1013 → Feedback. 2) Click "Capture feedback". 3) Enter Message `<script>alert(1)</script> QA 1013 export is slow & "broken" — ünïcode 🚀`, Source "Support", Type "Bug", Theme "Exports". 4) Click "Capture".
- Expected: Either the capture succeeds, or a visible error explains the problem (e.g., "Feedbucket is not enabled for your organisation — an admin can enable it in Settings → Modules") next to the form/as a toast. Also the sheet should not look like it is pending/submitted without feedback.
- Actual: No toast or inline message. Sheet remains open with same values. Console shows `POST https://api.streamlineos.in/feedbucket/submissions/capture` → 402 (Payment Required). The page behind the sheet shows the "Module not enabled — Feedbucket is not enabled for your organisation" gate only after the failed call (before that the list showed loading skeleton with no gate). Same 402 also returned by /feedbucket/submissions, /facets, /customer-impact (Feedback list shows gate; route-level gating is inconsistent with the Capture path, which surfaces nothing).
- Impact: User cannot tell why capture failed; may retry repeatedly or think data was saved.
- Suggested fix: On non-2xx from capture, show the server's message in the sheet (inline + toast). Hide/disable "Capture feedback"/"Collect via Feedbucket" CTAs when the module is not enabled, instead of letting them fail.
- Note: Did NOT enable Feedbucket (module toggle is an org-level/billing-adjacent change outside Manage Product scope).

### MP-B-004 — PARTIAL

- Title: Opportunity title has no visible length limit; very long title overflows the Opportunities table row (no truncation)
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery
- Actor: owner
- Steps: Create opportunity with a ~480-character title (`QA MP 1013 <b>onboarding</b> friction ` repeated 12x), Baseline/Target blank.
- Expected: A max length message (or at least server-side cap), and the title truncated with ellipsis in the table, with full text on hover/detail.
- Actual: Opportunity created with the full title. In the Opportunities table the title runs past the right edge of the row/card with no ellipsis, pushing content off-screen. Raw `<b>` markup is displayed as literal text (no HTML injection observed; good).
- Impact: Layout breaks at larger text; no guardrail on title length.
- Suggested fix: Cap title length (e.g., 160 chars) with counter and `truncate` styling in table cells.

### MP-B-006 — UNKNOWN

- Title: Opportunity "Override" / Score / Accept modals: spinner lasts several seconds and success state is not clear (Save override/Save score/Accept)
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery&opportunity=1
- Actor: owner
- Steps: Submit "Save score" (Reach 1000, Confidence 0.8, Effort 2) or "Save override" (250 + reason) or "Accept".
- Expected: Modal closes promptly on success with toast; button not stuck.
- Actual: Buttons show a spinner for >4 s (up to ~10 s) before the change is reflected. After "Accept" succeeded (table state changed to Accepted, sheet shows "Accepted"), the "Accept opportunity" form remained displayed with its Accept button enabled, not closed.
- Impact: Users may double-submit Accept; latency perceived as hang.
- Suggested fix: Close the form on success; investigate latency of score/override/accept endpoints.

### MP-B-008 — PARTIAL

- Title: Insights opportunity "State" multi-select filter does not apply (checkbox/option does not toggle), and one click crashed the whole Insights view into an error boundary
- Severity: High
- Route: /build/managed-products/3/insights?view=discovery → Opportunities → "State" filter
- Actor: owner (qaown1012b)
- Steps: 1) Opportunities has 2 rows (one Declined, one Accepted). 2) Click "State". 3) Click "Declined" option (mouse click on checkbox/label, also tried keyboard ArrowDown+Enter).
- Expected: "Declined" checked, the filter label shows "State (1)" or similar, list shows only the Declined opportunity, URL carries the filter.
- Actual: Option never shows as checked; list unchanged (both rows); URL does not gain a filter param. On one mouse click on the option (Computer click), the entire Insights page was replaced by the error boundary: "Something went wrong — An error occurred while loading this data. Please try again." with a "Try again" button; "Try again" did not recover; full page reload recovered. Not reproduced on the subsequent 3 attempts (no crash, but still no check state).
- Impact: Filter unusable; a click can blank the Insights page for the user until reload.
- Suggested fix: Make the multi-select item a proper checkbox with onSelect toggling state; wrap only the list (not the whole page) in the error boundary; add the filter to URL.

### MP-B-010 — UNKNOWN

- Title: Accepted opportunity's RICE values do not carry over correctly to the linked roadmap item (Impact and override mismatch)
- Severity: Medium
- Route: /build/managed-products/3/roadmap?view=timeline&item=1 vs /insights?view=discovery&opportunity=1
- Actor: owner
- Steps: 1) Opportunity #1 scored Reach 1000, Impact "Medium (1)", Confidence 0.8, Effort 2 => live score 400.00. 2) Overrode score to 250 with reason. 3) Started validating and accepted (Horizon Next). 4) Opened the linked roadmap item.
- Expected: Roadmap item reflects the accepted score (250 overridden, or at minimum the same Impact as the opportunity, Medium=1 → 400), or the item explicitly shows its source/which RICE is used.
- Actual: Roadmap item shows Reach 1000, Impact 3, Confidence 80%, Effort 2 → card "RICE 1200" (Impact 3 ≠ Medium(1)); opportunity shows RICE 250.00 (overridden). Values disagree with no explanation. (Opportunity Trace shows 250.00 override.)
- Impact: Prioritisation numbers differ across screens; decisions based on the wrong score.
- Suggested fix: Map Impact labels to numeric values consistently when creating the roadmap item; carry the override into the item or label the source.

### MP-B-017 — OPEN

- Title: Roadmap items cannot be opened from the keyboard: List rows are focusable (focus ring shows) but Enter does nothing; Board and Timeline item cards are not reachable with Tab at all
- Severity: Medium (accessibility)
- Route: /build/managed-products/3/roadmap?view=list (and ?view=board, ?view=timeline)
- Actor: owner (qaown1012b)
- Steps: 1) Open List view. 2) Press Tab until a row "QA RM 1013 <script>alert(3)</script> dblclick test" is focused (focus-visible ring on the row). 3) Press Enter. 4) Repeat with Space. 5) On Board and Timeline, press Tab through the whole page (70 presses) from the toolbar.
- Expected: Enter/Space on a focused row opens the item detail sheet (URL gains &item=<id>), focus moves into the sheet; Board/Timeline cards are focusable buttons/links so keyboard users can open them.
- Actual: List: Enter and Space leave the URL unchanged (no item= param) and no sheet opens; focus stays on the row. Mouse click on the same row does open the sheet (?view=list&item=2). Board/Timeline: Tab order goes from toolbar (Horizon/Status/Goal/Filters) to the end of the page; no card receives focus. Positive: after Escape from a mouse-opened sheet, focus returns to the same row (trigger). 
- Impact: Keyboard-only and screen-reader users cannot open roadmap items except in List view via mouse; the row focus ring suggests an action that does nothing.
- Suggested fix: Add onKeyDown Enter/Space to clickable rows (or render the title as a button/link), make Board/Timeline cards focusable (role=button, tabIndex=0) with the same handler; keep Escape → focus return to trigger (currently working).

### MP-B-018 — OPEN

- Title: Product Goals summary shows "Total Goals 2" (and a goal count) to a Member while the goal list on the same page says "No goals yet" (count/list mismatch; restricted count exposed)
- Severity: Medium
- Route: /build/managed-products/3/goals
- Actor: qamem1012c (product Member; not an admin/owner)
- Steps: 1) Sign in as qamem1012c (Member of product 3). 2) Open /build/managed-products/3/goals. 3) Wait for the page to finish loading (reload once to confirm).
- Expected: Either the summary tiles and list both reflect the goals this actor may see, or both are hidden/zero. Restricted goal data (count, status, progress aggregates) should not be shown to a role that does not get the list.
- Actual: Header tiles show Total Goals 2, On Track 0, At Risk 0, Avg Progress 0%, Stale Check-ins 0, but the main area shows the empty state "No goals yet — Create a goal or link an existing org goal to this product." The owner's list for the same product shows 2 goals ("QA GOAL 1013 linked" x2, both Company level, owner qaown1012b). Same result after reload.
- Impact: Member sees a count of goals it cannot list (RBAC mismatch; leaks aggregate existence of restricted org goals); the empty state also tells the user to create a goal they cannot create (see MP-B-019).
- Suggested fix: Apply the same goal-read permission/filter to the summary aggregate query as to the list query (or return 0 and hide tiles when the actor lacks read); verify with a Member test in CI.

### MP-B-027 — UNKNOWN

- Title: Feedback route (/build/managed-products/3/feedback) rendered the generic "Something went wrong / An unexpected error occurred" boundary at 300% browser zoom (not reproduced at 100%)
- Severity: Low (needs re-check)
- Route: /build/managed-products/3/feedback at 300% zoom (narrow ~427 CSS px)
- Actor: product page loaded in the admin session (qaadm1012d) at the time
- Steps: 1) Set Chrome zoom to 300% (Ctrl+= steps). 2) Navigate Overview → Feedback (or open the URL directly). 3) Wait.
- Expected: Feedback list / capture CTA or the Feedbucket gate (as at 100%).
- Actual: Boundary "Something went wrong — An unexpected error occurred. Please try again or contact support." with no visible retry at first. At 100% zoom the same URL loads the header and "Loading results…" without the boundary on the next visit (not reproduced). Possibly the same unhandled Feedbucket 402 path noted in MP-B-002.
- Impact: Narrow-viewport users see a generic failure on Feedback; cannot tell whether data is missing.
- Suggested fix: Re-test at 300% and 100% after MP-B-002 fix; show the Feedbucket gate instead of the generic boundary when the module is off.

## UX notes that are not done

### MP-U-001 Key not auto-derived from Name
- Route: /build/managed-products create sheet. Key is required (inline "Required" only after submit), placeholder "PROD" gives no format rule.
- Suggestion: auto-suggest Key from Name (editable), show format hint (length/charset) before submit.

### MP-U-002 Roadmap item RICE vs opportunity RICE
- Route: /roadmap?view=timeline&item=1. Opportunity was overridden to 250 and accepted, but roadmap item shows RICE 1200 (Reach 1000, Impact 3, Confidence 80%, Effort 2) while original score had Impact Medium(1) => 400. Suggest: show "source: opportunity (overridden 250)" or sync override into roadmap item; clarify which RICE is authoritative. (Possible data mismatch — see MP-B-010.)

### MP-U-003 Roadmap List view: Title column does not truncate; table scrolls horizontally
- Route: /build/managed-products/3/roadmap?view=list. The long auto-created title (MP-B-004 text) pushes the Horizon/Status/Owner/Target/Confidence columns off-screen at 1280px; a horizontal scrollbar appears under the table.

### MP-U-004 Edit Roadmap Item: Public toggle is at the bottom of a long sheet
- Route: Board card pencil → Edit Roadmap Item. "Public / Show this item on the public board" is below Decision snapshot, after ~6 scroll-screens. Users publishing a roadmap likely miss it.
- Suggestion: place visibility near the top (next to Status) or show a per-card "Public" toggle on the board card.

### MP-U-005 Directory: Back/Forward skip filter changes; "Clear filters" and status changes are not separate history steps
- Route: /build/managed-products. Sequence tested: search q=qamp → status=archived → Clear filters → grid (?view=grid) → Back. Back returned to ?status=active&q=QAMP1013 (a state from before the Archived step), skipping the Archived and cleared states. Users expecting Back to undo the last filter/view change will land elsewhere.
- Suggestion: push a history entry per committed filter/view change (or at least on status/view), so Back restores the previous filter set, and keep the URL as the single source of truth.

### MP-U-006 Filter chips show raw enum values
- Route: /build/managed-products?status=archived. Chip reads "Status archived" (lowercase raw value) while the select reads "Archived"; same with "Status active".
- Suggestion: use the same label as the select ("Status: Archived").

### MP-U-007 Publishing panel: "Expires — No expiry" with no way to set an expiry
- Route: /build/managed-products/3/settings?tab=publishing after Publish. Shows "Expires No expiry" and only Rotate/Unpublish. No expiry option, so expired-token behaviour cannot be exercised or configured from the UI.
- Suggestion: offer an expiry choice (e.g., 7/30/90 days / never) at publish and on rotate, or hide the Expires row if not supported.

### MP-U-008 Publish panel after Unpublish confirm
- Route: Settings > Publishing > Unpublish → confirm "Unpublish". After confirming, the panel still showed "Published" with the link for at least ~4 s; the state changed only after a later click and reload. Show a pending state and update the panel when the request completes.

### MP-U-009 Narrow (~300% zoom, ~427px) directory: table clipped inside card; Actions column unreachable without scroll
- Route: /build/managed-products at 300% browser zoom. Header shows "Name Lifecycle Health Goals Owner Projects N…" cut at card edge; Next release/Feedback/Updated/Actions need horizontal scroll inside the card with no visible scroll affordance.
- Suggestion: switch to the card/grid layout automatically under ~600px, or pin Name + Actions and show a horizontal-scroll hint.

### MP-U-010 Add product member: dropdown lists existing members
- Route: /build/managed-products/3/settings?tab=members → Add member → "Select a member".
- Observed: the list includes people who are already product members (qamem1012c, qaadm1012d); choosing one with a role returns "This person is already a member of this product."
- Suggestion: hide existing members from the picker, or show "Already a member" as a disabled option.

### MP-U-011 Release row shows "Owner" label, not the owner name
- Route: /build/managed-products/3/releases → Upcoming row.
- Observed: the row shows an owner icon with the text "Owner" and "just now" (updated time) next to it, so the owner name is not visible in the list. The owner picker shows only initials ("Q") and names.
- Suggestion: show the owner name (or initials + name) in the row.

### MP-U-012 Release create sheet stays on "Creating…" for several seconds
- Route: /build/managed-products/3/releases → New release → Create release.
- Observed: button label "Creating…" for ~6–10 s before the sheet closes; no progress feedback.
- Suggestion: disable and show a spinner on submit; close on success with an immediate list update.

### MP-U-013 Sidebar draft pill shows a long run of "N" characters
- Route: product sidebar at bottom of the nav ("Draft awaiting review: NNNNNNNNNN…") on every product page.
- Suggestion: show a readable label (e.g. the draft title) and truncate with a tooltip; check the placeholder value.

### MP-U-014 Overview "Measured outcomes" has no action to schedule or complete a review
- Route: /build/managed-products/3 → "Measured outcomes" card (Reviews scheduled 0, Completed 0, Latest review "Not measured yet").
- Suggestion: add "Schedule review" and "Mark complete" actions here, or link to where outcome reviews are managed.

### MP-U-015 Floating companion covers content at 300% zoom
- Route: all product pages at 300% browser zoom.
- Observed: the companion bubble and pet cover the top-right header actions and part of the stats row on Releases; makes narrow-viewport checks hard to read.
- Suggestion: allow the companion to collapse by default on narrow viewports and keep header actions above it.
