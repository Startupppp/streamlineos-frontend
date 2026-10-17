# MP-BUGS.md

## MP-B-001
- Title: New product list does not refresh after successful create (empty state shown until full reload)
- Severity: Medium
- Route: /build/managed-products (create side-sheet "New Managed Product")
- Actor: owner (qaown1012b, QA Build Org 1012b)
- Steps: 1) Org has zero products (empty state "Start with a product"). 2) Click "New product". 3) Enter Name "QA MP 1013", Key "QAMP1013". 4) Click "Create Product".
- Expected: Side-sheet closes and new row "QA MP 1013" appears in the table immediately.
- Actual: Side-sheet closes, but main area still shows empty state "Start with a product / Create one to see delivery in one place" with no row. Row only appeared after a manual page reload (and then took several seconds to finish loading, showing "Loading results…" skeleton). No error toast observed.
- Impact: User may think creation failed and create duplicates.
- Suggested fix: Invalidate/refetch the managed-products query on create success, and show a success toast linking to the new product.


## MP-B-002
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

## MP-B-003
- Title: Opportunity create with non-numeric Baseline returns 500 "Something went wrong on our end" instead of field validation
- Severity: Medium
- Route: /build/managed-products/3/insights?view=discovery → "New opportunity" sheet → "Create opportunity"
- Actor: owner (qaown1012b)
- Steps: 1) Insights → Discovery → "New opportunity". 2) Title "QA MP 1013 onboarding friction". 3) Baseline "abc" (Target blank). 4) Click "Create opportunity".
- Expected: Inline validation on Baseline/Target ("Enter a number") before submit, or a 4xx with field message. No record created.
- Actual: Toast "Something went wrong on our end. Please try again shortly." Console: `POST https://api.streamlineos.in/build/managed-products/3/opportunities` → 500. Sheet stays open; no field-level error. Retrying with Baseline blank succeeded (so the 500 is caused by the non-numeric baseline value).
- Impact: Server error for user input error; retry may create duplicates if the user assumes failure is transient.
- Suggested fix: Use type=number/inputmode and client validation for Baseline/Target/Unit; server should validate numeric fields and return 400 with field errors.

## MP-B-004
- Title: Opportunity title has no visible length limit; very long title overflows the Opportunities table row (no truncation)
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery
- Actor: owner
- Steps: Create opportunity with a ~480-character title (`QA MP 1013 <b>onboarding</b> friction ` repeated 12x), Baseline/Target blank.
- Expected: A max length message (or at least server-side cap), and the title truncated with ellipsis in the table, with full text on hover/detail.
- Actual: Opportunity created with the full title. In the Opportunities table the title runs past the right edge of the row/card with no ellipsis, pushing content off-screen. Raw `<b>` markup is displayed as literal text (no HTML injection observed; good).
- Impact: Layout breaks at larger text; no guardrail on title length.
- Suggested fix: Cap title length (e.g., 160 chars) with counter and `truncate` styling in table cells.

## MP-B-005
- Title: Override RICE score accepts negative values at the UI; server rejects with 400 and the user sees no error
- Severity: Medium
- Route: /build/managed-products/3/insights?view=discovery&opportunity=1 → "Override score" sheet modal → "Save override"
- Actor: owner (qaown1012b)
- Steps: 1) Open opportunity (state Validating). 2) "Override score". 3) Override score = -5; Reason "QA negative edge <script>alert(2)</script> & test". 4) "Save override".
- Expected: Client-side validation ("Score must be 0 or greater") or a visible server error message; no network call for invalid input.
- Actual: No field error. Save shows spinner for several seconds, then the modal stays open with the value still -5 and no visible message. Console: `POST https://api.streamlineos.in/build/managed-products/3/opportunities/1/score-override` → 400. Score not changed (still 400.00 in table).
- Impact: Silent failure; user doesn't know why override didn't save.
- Suggested fix: Add min=0 validation in the form; surface server 400 message inline.

## MP-B-006
- Title: Opportunity "Override" / Score / Accept modals: spinner lasts several seconds and success state is not clear (Save override/Save score/Accept)
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery&opportunity=1
- Actor: owner
- Steps: Submit "Save score" (Reach 1000, Confidence 0.8, Effort 2) or "Save override" (250 + reason) or "Accept".
- Expected: Modal closes promptly on success with toast; button not stuck.
- Actual: Buttons show a spinner for >4 s (up to ~10 s) before the change is reflected. After "Accept" succeeded (table state changed to Accepted, sheet shows "Accepted"), the "Accept opportunity" form remained displayed with its Accept button enabled, not closed.
- Impact: Users may double-submit Accept; latency perceived as hang.
- Suggested fix: Close the form on success; investigate latency of score/override/accept endpoints.

## MP-B-007
- Title: Deep link ?opportunity=1 does not reopen the opportunity detail sheet on fresh load / reload
- Severity: Low
- Route: /build/managed-products/3/insights?view=discovery&opportunity=1
- Actor: owner
- Steps: Open an opportunity (URL gets &opportunity=1), refresh the page or open URL directly.
- Expected: Detail sheet reopens for the id in URL (URL sync is the stated expectation for detail routes).
- Actual: After reload/direct navigation, no sheet is shown (dialog count 0) although URL still carries opportunity=1. (Sometimes it appeared after a second in-app navigation.)
- Impact: Refresh loses context; shared links don't open the item.
- Suggested fix: Read the opportunity query param on mount and open the sheet.

## MP-B-008
- Title: Insights opportunity "State" multi-select filter does not apply (checkbox/option does not toggle), and one click crashed the whole Insights view into an error boundary
- Severity: High
- Route: /build/managed-products/3/insights?view=discovery → Opportunities → "State" filter
- Actor: owner (qaown1012b)
- Steps: 1) Opportunities has 2 rows (one Declined, one Accepted). 2) Click "State". 3) Click "Declined" option (mouse click on checkbox/label, also tried keyboard ArrowDown+Enter).
- Expected: "Declined" checked, the filter label shows "State (1)" or similar, list shows only the Declined opportunity, URL carries the filter.
- Actual: Option never shows as checked; list unchanged (both rows); URL does not gain a filter param. On one mouse click on the option (Computer click), the entire Insights page was replaced by the error boundary: "Something went wrong — An error occurred while loading this data. Please try again." with a "Try again" button; "Try again" did not recover; full page reload recovered. Not reproduced on the subsequent 3 attempts (no crash, but still no check state).
- Impact: Filter unusable; a click can blank the Insights page for the user until reload.
- Suggested fix: Make the multi-select item a proper checkbox with onSelect toggling state; wrap only the list (not the whole page) in the error boundary; add the filter to URL.

## MP-B-009
- Title: Double-click on "Create Item" (New Roadmap Item) creates duplicate roadmap items
- Severity: High
- Route: /build/managed-products/3/roadmap?view=timeline (or board) → "New Item" side-sheet → "Create Item"
- Actor: owner (qaown1012b)
- Steps: 1) Click "New Item". 2) Title `QA RM 1013 <script>alert(3)</script> dblclick test`, Outcome "Outcome QA 1013", Horizon Now, Status Planned. 3) Double-click "Create Item" once.
- Expected: Exactly one roadmap item is created; button disabled while saving (it shows "Saving…" but still accepts a second click).
- Actual: Two identical items were created. The Now column header count changed to "2" and both show title `QA RM 1013 <script>alert(3)</script> dblclick test`. The sheet spent several seconds on "Saving…" before closing.
- Impact: Duplicate roadmap work items; users must manually clean up.
- Suggested fix: Disable submit on first click (isSubmitting guard / useMutation pending state) and use an idempotency key on create.
- Also: The title <script> text is stored literally and rendered as text (no script execution observed).

## MP-B-010
- Title: Accepted opportunity's RICE values do not carry over correctly to the linked roadmap item (Impact and override mismatch)
- Severity: Medium
- Route: /build/managed-products/3/roadmap?view=timeline&item=1 vs /insights?view=discovery&opportunity=1
- Actor: owner
- Steps: 1) Opportunity #1 scored Reach 1000, Impact "Medium (1)", Confidence 0.8, Effort 2 => live score 400.00. 2) Overrode score to 250 with reason. 3) Started validating and accepted (Horizon Next). 4) Opened the linked roadmap item.
- Expected: Roadmap item reflects the accepted score (250 overridden, or at minimum the same Impact as the opportunity, Medium=1 → 400), or the item explicitly shows its source/which RICE is used.
- Actual: Roadmap item shows Reach 1000, Impact 3, Confidence 80%, Effort 2 → card "RICE 1200" (Impact 3 ≠ Medium(1)); opportunity shows RICE 250.00 (overridden). Values disagree with no explanation. (Opportunity Trace shows 250.00 override.)
- Impact: Prioritisation numbers differ across screens; decisions based on the wrong score.
- Suggested fix: Map Impact labels to numeric values consistently when creating the roadmap item; carry the override into the item or label the source.

## MP-B-011
- Title: "New Goal" (Goals tab) saves the goal but the sheet stays open with a raw JS error "e.items is not iterable", inviting re-submit → duplicate goals
- Severity: High
- Route: /build/managed-products/3/goals → "New Goal" side-sheet → "Create Goal"
- Actor: owner (qaown1012b)
- Steps: 1) Goals tab (no goals). 2) "New Goal" → Title "QA GOAL 1013 linked" (Level Company, Status Not Started). 3) Click "Create Goal". 4) Wait; sheet still open. 5) Click "Create Goal" again (the form still shows the same values).
- Expected: Sheet closes on success, goal appears once in the list with a success toast; no error.
- Actual: Goal "QA GOAL 1013 linked" appears in the list after the first click, but the sheet stays open and a red toast says "e.items is not iterable" (a raw client-side TypeError message). The second click created a second identical goal; list now shows "Company 2" with two "QA GOAL 1013 linked" cards.
- Impact: Duplicate org goals; raw internal error text shown to users.
- Suggested fix: Close sheet on success (and invalidate the list once); guard against undefined `items` in the post-create handler; disable submit while pending; never show raw error text.

## MP-B-012
- Title: Goals summary cards not refreshed after unlink (Total Goals stays 2 while list shows 1)
- Severity: Low
- Route: /build/managed-products/3/goals → Goal actions → Unlink from product
- Actor: owner
- Steps: With 2 linked goals, Goal actions → "Unlink from product" → confirm "Unlink".
- Expected: List and "Total Goals" stat both show 1.
- Actual: Toast "Goal unlinked from product"; list shows 1 card ("Showing 1–1 of 1") but the "Total Goals" tile still shows 2 until refresh/next action.
- Suggested fix: Invalidate the summary query together with the list on unlink/link.

## MP-B-013
- Title: "New release" cannot be created: POST /releases returns 400 VALIDATION_FAILED when optional fields are left blank (client sends null / empty values); no message shown to user
- Severity: Critical
- Route: /build/managed-products/3/releases → "New release" side-sheet → "Create release"
- Actor: owner (qaown1012b)
- Steps: 1) Releases tab (no releases). 2) "New release". 3) Name "QA R1013 Alpha", Version "1013.0" (other fields left at defaults). 4) "Create release".
- Expected: Release created and listed under Active releases; optional fields omitted or sent as empty/none.
- Actual: Sheet stays open, no visible error, no row. Network: `POST https://api.streamlineos.in/build/managed-products/3/releases` → 400 `{"code":"VALIDATION_FAILED","message":"Validation failed.","details":[{"path":"description","message":"Invalid input: expected string, received null"},{"path":"releaseDate",...received null},{"path":"ownerUserId",...received null}, ...]}`. Also "QA state: None" is sent as an invalid option (allowed: pending|in_review|approved|rejected), and an empty Deployment evidence URL is rejected. Even after filling description/URL/owner/QA state and picking a release date, the request still fails on `projectReleaseId` ("expected number, received null") because the optional Canonical project release is sent as null. Reload shows no release created (tested 5 attempts).
- Impact: Release management cannot be used at all unless every optional field is populated (and canonical project release is impossible to leave blank). Silent failure.
- Suggested fix: Drop null/empty optional keys before submit (or accept null in the API schema); map QA state "None" to omitted; show server validation message in the sheet; add client-side zod parity with the API schema.

## MP-B-014
- Title: Roadmap item with title >200 chars (auto-created on opportunity accept) cannot be edited or saved; raw validation text shown ("title: Too big: expected string to have <=200 characters")
- Severity: High
- Route: /build/managed-products/3/roadmap?view=board → pencil (Edit Roadmap Item) on "QA MP 1013 <b>onboarding</b> friction…" card → toggle Public (or any field) → "Save Changes"
- Actor: owner (qaown1012b)
- Steps: 1) Board → Next → edit pencil on the item auto-created from accepted Opportunity #1 (title is the ~480-char MP-B-004 title). 2) Scroll to the bottom, turn on "Public". 3) Click "Save Changes".
- Expected: Either the title is accepted, or the form blocks save with an inline message on Title ("Keep under 200 characters") before submit; the title field shows a counter. Any change (Public, Horizon, Status) saves.
- Actual: Save spins ("Saving…") then the sheet stays open with the Save button enabled and a red toast "title: Too big: expected string to have <=200 characters". Console shows 1 error. Nothing saved (Public stays off, card still "Private"). The title field has no length counter or inline error. The item cannot be published or edited at all until the title is shortened, and the Edit form does not let the user shorten it inline without losing other context.
- Impact: Roadmap item from an accepted opportunity is effectively locked for editing and for the public board; the server cap (200) is not enforced at opportunity create (MP-B-004 accepted the same title), so the two layers disagree.
- Suggested fix: Enforce the same 200-char cap on opportunity title at create (and on the auto-created roadmap title, truncating or flagging it); show an inline field error on Title with a counter; map zod errors to field labels instead of raw "title: Too big: expected string…".

## MP-B-015
- Title: Removing the last product Admin from Settings > Members closes the confirm with no message and no change; the row stays (silent no-op, or silent failure), with no last-manager explanation
- Severity: Medium
- Route: /build/managed-products/3/settings?tab=members → X on "qaadm1012d (Admin)" → "Remove"
- Actor: owner (qaown1012b). Product 3 members at start: qamem1012c (Member), qaadm1012d (Admin). No other product-level Admin; product Owner is unassigned (General → Owner "Select owner").
- Steps: 1) Members tab. 2) Click X on qaadm1012d. 3) Confirm dialog "Remove this member? qaadm1012d will lose access to this product." 4) Click "Remove". 5) Repeat once more (first attempt, then retry with toast capture). 6) Reload.
- Expected: Either removal succeeds and the list refreshes without the admin, or the product blocks removing the last manager with a visible message ("A product must keep at least one Admin/Owner") and the dialog stays with the error. Either way the user gets feedback.
- Actual: Dialog closes; no success or error toast; the list still shows qaadm1012d (Admin) after the dialog closes and after a full reload (server state unchanged). No role-change control exists in the row, so the last Admin cannot be demoted in the UI either. Members list also shows an empty body for ~6 s after reload before rows appear (loading state looks like an empty list).
- Impact: Users cannot tell whether removal worked; if the rule is intended it is undocumented in the UI; if not intended, removal is broken. Risk of believing the last admin was removed (or the reverse).
- Suggested fix: Show a specific error on the last-manager block ("Can't remove the last Admin. Add or promote another Admin first.") inline in the dialog; on success, invalidate the members query and remove the row optimistically; add a role selector (Admin/Member) to each row so demotion can be tested and blocked with the same message.
- Note: Also observed toast "Invitation accepted — <an invitee address> accepted their invitation and joined the organization." appearing while on this page (unrelated org notification, not created by this round).

## MP-B-016
- Title: Linked Projects list does not show a newly linked project after "Link project" success (stale until full reload); no primary-product control on the product Projects tab
- Severity: Low
- Route: /build/managed-products/3/projects → "Link existing project" → "QA Project Delta (QZG)" → "Link project"
- Actor: owner (qaown1012b)
- Steps: 1) Linked projects shows "QA Project Alpha" only. 2) Link existing project → select QA Project Delta. 3) Confirm sheet reads "Current product links: No product links yet. After linking: QA MP 1013 Renamed <i>x</i> will become the primary product for QA Project Delta." 4) Click "Link project".
- Expected: Toast "QA Project Delta linked…" and the table refreshes to show both projects, with the primary product indicated on the link (or a "Set primary" action per row when a project has several product links).
- Actual: Toast "QA Project Delta linked to QA MP 1013 Renamed <i>x</i>" appears, but the table still lists only QA Project Alpha for several seconds; the new row appears only after a reload. Unlink (confirm "Unlink") does refresh correctly. Relink after unlink shows the same stale behaviour. No "primary" label or "Set primary" control exists anywhere on this tab (searched rows and page text; only "Unlink" per row). The primary designation is only described in the confirm copy, so it cannot be verified or changed from this page.
- Impact: Users may re-link or create duplicates; the primary-product rule cannot be managed or seen from the product side.
- Suggested fix: Invalidate the product's linked-projects query on link success; show a Primary badge on each row and a "Set primary" action (only when more than one product link exists), with the confirm sheet listing current links.
- Test state: QA Project Delta currently LINKED to product 3 (after unlink/relink). QA Project Alpha linked (unchanged).

## MP-B-017
- Title: Roadmap items cannot be opened from the keyboard: List rows are focusable (focus ring shows) but Enter does nothing; Board and Timeline item cards are not reachable with Tab at all
- Severity: Medium (accessibility)
- Route: /build/managed-products/3/roadmap?view=list (and ?view=board, ?view=timeline)
- Actor: owner (qaown1012b)
- Steps: 1) Open List view. 2) Press Tab until a row "QA RM 1013 <script>alert(3)</script> dblclick test" is focused (focus-visible ring on the row). 3) Press Enter. 4) Repeat with Space. 5) On Board and Timeline, press Tab through the whole page (70 presses) from the toolbar.
- Expected: Enter/Space on a focused row opens the item detail sheet (URL gains &item=<id>), focus moves into the sheet; Board/Timeline cards are focusable buttons/links so keyboard users can open them.
- Actual: List: Enter and Space leave the URL unchanged (no item= param) and no sheet opens; focus stays on the row. Mouse click on the same row does open the sheet (?view=list&item=2). Board/Timeline: Tab order goes from toolbar (Horizon/Status/Goal/Filters) to the end of the page; no card receives focus. Positive: after Escape from a mouse-opened sheet, focus returns to the same row (trigger). 
- Impact: Keyboard-only and screen-reader users cannot open roadmap items except in List view via mouse; the row focus ring suggests an action that does nothing.
- Suggested fix: Add onKeyDown Enter/Space to clickable rows (or render the title as a button/link), make Board/Timeline cards focusable (role=button, tabIndex=0) with the same handler; keep Escape → focus return to trigger (currently working).

## MP-B-018
- Title: Product Goals summary shows "Total Goals 2" (and a goal count) to a Member while the goal list on the same page says "No goals yet" (count/list mismatch; restricted count exposed)
- Severity: Medium
- Route: /build/managed-products/3/goals
- Actor: qamem1012c (product Member; not an admin/owner)
- Steps: 1) Sign in as qamem1012c (Member of product 3). 2) Open /build/managed-products/3/goals. 3) Wait for the page to finish loading (reload once to confirm).
- Expected: Either the summary tiles and list both reflect the goals this actor may see, or both are hidden/zero. Restricted goal data (count, status, progress aggregates) should not be shown to a role that does not get the list.
- Actual: Header tiles show Total Goals 2, On Track 0, At Risk 0, Avg Progress 0%, Stale Check-ins 0, but the main area shows the empty state "No goals yet — Create a goal or link an existing org goal to this product." The owner's list for the same product shows 2 goals ("QA GOAL 1013 linked" x2, both Company level, owner qaown1012b). Same result after reload.
- Impact: Member sees a count of goals it cannot list (RBAC mismatch; leaks aggregate existence of restricted org goals); the empty state also tells the user to create a goal they cannot create (see MP-B-019).
- Suggested fix: Apply the same goal-read permission/filter to the summary aggregate query as to the list query (or return 0 and hide tiles when the actor lacks read); verify with a Member test in CI.

## MP-B-019
- Title: Member sees "New Goal" (and the empty-state "New Goal" CTA) but Create Goal fails with a raw "Missing permission: build:goals:manage" toast and the sheet stays open
- Severity: Low
- Route: /build/managed-products/3/goals → "New Goal" sheet → "Create Goal"
- Actor: qamem1012c (Member)
- Steps: 1) Open /goals as Member. 2) Click "New Goal" (header and empty-state button both visible). 3) Title "RBAC qamem 1013", Level Company, Status Not Started. 4) Click "Create Goal".
- Expected: The create action is either hidden for a Member (no New Goal button) or disabled with an explanation; if attempted, a clear message such as "You don't have permission to create goals on this product" appears inside the sheet, and no half-open form is left.
- Actual: "New Goal" button is shown; after Create the toast reads "Missing permission: build:goals:manage" (raw permission key), the sheet remains open with values still filled, and no goal is created (confirmed: list still empty, no record in product or org list).
- Impact: Affordance mismatch (UI promises an action the role cannot perform); raw internal permission key shown to end users; user may retry repeatedly.
- Suggested fix: Gate New Goal and empty-state CTA on build:goals:manage (the same check the server uses); if the action is still attempted, show a friendly inline message and close or lock the sheet.

## MP-B-020
- Title: Outsider (other tenant) gets a generic "Something went wrong" error boundary on /roadmap and /releases of product 3, while other product routes show "Not found" / "Product not found"
- Severity: Low
- Route: /build/managed-products/3/roadmap and /build/managed-products/3/releases
- Actor: qaout1012g (outsider, second tenant)
- Steps: 1) Sign in as qaout1012g. 2) Open /build/managed-products/3/roadmap. 3) Open /build/managed-products/3/releases. 4) Compare with /build/managed-products/3/feedback, /insights, /settings, /projects, /goals.
- Expected: Consistent not-found handling for a product that is not in the actor's org: "Product not found — This product may have been archived or deleted, or the link is incorrect." (the same as /feedback, /insights and /settings).
- Actual: /roadmap and /releases render the "Managed Product — Something went wrong — An error occurred while loading this data. Please try again. [Try again]" error boundary. Retrying does not change it. No product data is shown (no leak observed), but the failure mode differs from every other route (suggests an unhandled server error or a missing not-found branch).
- Impact: Outsider and support see an error for what is a normal access-denied case; error-tracking noise; inconsistent denial may hide authorization bugs.
- Suggested fix: Return the same 404/403 contract for these queries as the other product routes (or add the not-found branch to the roadmap and releases loaders) and render the standard not-found view.

## MP-B-021
- Title: Outsider sees product-scoped action buttons and summary tiles on product pages that return "Not found" (New Goal, Link existing goal, Link existing project, Create)
- Severity: Low
- Route: /build/managed-products/3/goals and /build/managed-products/3/projects (and the product shell on /build/managed-products/3)
- Actor: qaout1012g (outsider, second tenant)
- Steps: 1) Sign in as qaout1012g. 2) Open /build/managed-products/3/goals. 3) Observe header and tiles. 4) Open /projects. 5) Click "New Goal" → fill Title "RBAC qaout 1013" → "Create Goal".
- Expected: On a product the actor cannot access, the page shows only the not-found state with no write controls and no summary tiles (or tiles hidden).
- Actual: The shell renders "New Goal" and "Link existing goal" (goals) and "Link existing project" (projects), the Total Goals / On Track / At Risk / Avg Progress / Stale tiles (showing 0), and the sidebar product context "BD Product"; the main area below shows "Not found — This doesn't exist, or you don't have access to it." Submitting the goal returns a "Not found" toast and the sheet stays open. No QA product data was rendered.
- Impact: Write affordances on a product the outsider cannot reach; a rejected write still produced a server call against product 3 in another tenant. Possible confusion for users and an unnecessary cross-tenant probe.
- Suggested fix: Short-circuit the product shell: when the product lookup returns not-found, render only the not-found state (no action buttons, no tiles, no sheets). Also do not render the tenant's own product name in the switcher for an unknown product id.

## MP-B-022
- Title: After "Create Goal" succeeds for an Admin, the sheet closes but the goals list and "Total Goals" tile do not show the new goal until a full page reload
- Severity: Low
- Route: /build/managed-products/3/goals → "New Goal" → "Create Goal"
- Actor: qaadm1012d (product Admin)
- Steps: 1) Open /goals (Total Goals 2, list shows the 2 existing goals). 2) Click "New Goal". 3) Title "RBAC qaadm 1013", Level Company, Status Not Started. 4) Click "Create Goal". 5) Wait for the sheet to close. 6) Read the list and Total Goals. 7) Reload.
- Expected: The sheet closes, a success toast appears, and the list and "Total Goals" (now 3) update immediately, showing "RBAC qaadm 1013" once.
- Actual: Sheet closes; no success toast was captured in the check; list still shows 2 goals and Total Goals still 2. After a manual reload the goal is present and Total Goals = 3. The goal was created exactly once (no duplicate).
- Impact: Admin believes the create failed and may retry (duplicate risk, as seen in MP-B-011); same stale-query pattern as MP-B-001, MP-B-012 and MP-B-016.
- Suggested fix: Invalidate the goals list and summary queries (for this product) on create success and show a success toast with a link to the new goal.

## MP-B-023
- Title: Product Overview (/build/managed-products/3) crashes to "Something went wrong" after a release exists: /summary response fails client contract validation (previews.releases[0] fields missing)
- Severity: Critical
- Route: /build/managed-products/3 (Overview) and its summary query `/build/managed-products/3/summary`
- Actor: owner (qaown1012b)
- Steps: 1) Overview loads normally before any release exists (verified at start of round 4). 2) Releases → "New release" → all fields filled (Name "QA R1013 Full", Version 1013.1, Release date 20 Oct 2026, Owner qaadm1012d, QA state Approved, Deployment URL, Canonical project release "R11 release 1013", Description) → "Create release" (MP-B-013 workaround; saved). 3) Edit the release (Name "... EDIT", QA state In review) → "Release updated." toast. 4) Overview → "Post update" → toast "Product update posted." → the overview now shows the error boundary (also after a reload). 5) Reload /build/managed-products/3: still "Something went wrong — An error occurred while loading this data. Please try again. [Try again]". "Try again" does not recover.
- Expected: Overview renders with the release counted in "Next planned / Upcoming" and the Releases preview; summary payload matches the client schema.
- Actual: Console: `ApiContractError CODE CONTRACT_VIOLATION endpoint /build/managed-products/3/summary` (HTTP 200) with issues on `previews.releases.0`: recordRevision (expected number, got undefined), ownerUserId (expected string, got undefined), qaState ("Invalid option: expected one of pending|in_review|approved|rejected"), deploymentEvidenceUrl (undefined), projectReleaseId (undefined), projectRelease (undefined), allowedActions (undefined), linkedRoadmapItemCount (undefined). The "Something went wrong" toast also appeared right after posting the update. The Releases page itself still loads the release correctly (Upcoming: "QA R1013 Full EDIT", Approved/In review, owner set), so the list endpoint and the summary preview disagree on shape.
- Impact: Whole Overview of the product is unusable for any actor once one release exists (Critical for the product home page: Overview is the main entry point, and Post update / Mark reviewed / Edit product sit on it). Not limited to QA data: any release created through the (now working) form will trigger it.
- Suggested fix: Make the summary `previews.releases` shape match the list/detail release schema (or the client schema) and add a contract test that creates a release and loads summary; the ApiContractError boundary should degrade a single widget, not the whole page. Also reconcile qaState enum (summary rejects a value the release list accepts).
- Note: Isolated in round 4: with the release still in Upcoming the overview crashes on reload; after archiving that single release (Releases → Actions → Archive) the overview loads again and Post update / Mark reviewed / Edit product work. The release's own list and evidence views still load.

## MP-B-024
- Title: Product "Post update" shows success toast ("Product update posted.") but the update is not shown anywhere on the product Overview, before or after reload
- Severity: Medium
- Route: /build/managed-products/3 → "Post update" side-sheet → "Post update"
- Actor: owner (qaown1012b)
- Steps: 1) Overview (healthy, no release crash) → "Post update". 2) Empty Update → "Body is required" (validation OK). 3) Enter "QA R4 1013 status update plain text" → "Post update". 4) Read the Overview immediately, then reload.
- Expected: The update appears on the product overview (sheet copy: "It will appear on this product's overview."), e.g. as a latest-update card with author and time, and the header/"Days since product update" reflects it.
- Actual: Toast "Product update posted." and the sheet closes. The Overview text contains no trace of the update (searched the full overview text for the body text and the word "update"), immediately and after reload. The Insights "Days since product update" tile does show 0, so the write seems to be stored, but nothing on the Overview renders it. (Same result for an earlier post in this round, which was followed by the MP-B-023 crash.)
- Impact: The user cannot verify the update was posted and may post duplicates; the primary "status update" feature on the overview is invisible.
- Suggested fix: Render the latest product update(s) on the overview (or link to a feed) and invalidate the summary query on success; if the feed lives elsewhere, update the copy.

## MP-B-025
- Title: Removing a product member shows "Member removed." but the Members list keeps showing the removed person for several seconds (only refreshes later or on reload)
- Severity: Low
- Route: /build/managed-products/3/settings?tab=members → X on "qamem1012c (Member)" → "Remove"
- Actor: owner (qaown1012b), re-checked after the admin-session run
- Steps: 1) Members tab (qamem1012c, qaadm1012d, qaown1012b). 2) X on qamem1012c → dialog "Remove this member? qamem1012c will lose access to this product." → "Remove". 3) Read the list immediately, then after ~6 s without reload.
- Expected: Toast and the row disappears at once (the list is refreshed from the mutation).
- Actual: Toast "Member removed." appears; the row is still listed immediately and for at least ~6 s; it disappears on its own a little later (or after reload). The same lag was seen on "Add member" (the new row appeared only after a few seconds). Server state is correct (qamem1012c no longer a product member after reload).
- Impact: Users may click Remove again or think the removal failed; same stale-query family as MP-B-001, MP-B-016, MP-B-022.
- Suggested fix: Optimistically remove the row on success and invalidate the members query on both add and remove.

## MP-B-026
- Title: Release evidence sheet shows "Approval state: Not set" while the release's QA state is In review / Approved
- Severity: Low
- Route: /build/managed-products/3/releases → release row "Actions" → "View evidence"
- Actor: owner (qaown1012b); also seen as product Admin (qaadm1012d)
- Steps: 1) Create a release with QA state "Approved" (MP-B-013 workaround with all fields). 2) Edit it, QA state "In review". 3) Actions → View evidence.
- Expected: Approval state reflects the release QA state (or the sheet explains the difference between QA state and approval).
- Actual: Evidence shows Tickets (0), Test runs (0), Incidents (0) and "Approval state: Not set" for both the Approved and In-review release. The list row still shows the QA chip ("Approved" / "In review").
- Impact: Two different approval signals on one release; evidence sheet looks empty/unapproved when QA says approved. Evidence linking itself is not possible from this sheet (read-only, see COVERAGE round 4).
- Suggested fix: Show QA state in the evidence sheet's approval block, or add a link/explanation; if approval is a separate workflow, label the difference.

## MP-B-027
- Title: Feedback route (/build/managed-products/3/feedback) rendered the generic "Something went wrong / An unexpected error occurred" boundary at 300% browser zoom (not reproduced at 100%)
- Severity: Low (needs re-check)
- Route: /build/managed-products/3/feedback at 300% zoom (narrow ~427 CSS px)
- Actor: product page loaded in the admin session (qaadm1012d) at the time
- Steps: 1) Set Chrome zoom to 300% (Ctrl+= steps). 2) Navigate Overview → Feedback (or open the URL directly). 3) Wait.
- Expected: Feedback list / capture CTA or the Feedbucket gate (as at 100%).
- Actual: Boundary "Something went wrong — An unexpected error occurred. Please try again or contact support." with no visible retry at first. At 100% zoom the same URL loads the header and "Loading results…" without the boundary on the next visit (not reproduced). Possibly the same unhandled Feedbucket 402 path noted in MP-B-002.
- Impact: Narrow-viewport users see a generic failure on Feedback; cannot tell whether data is missing.
- Suggested fix: Re-test at 300% and 100% after MP-B-002 fix; show the Feedbucket gate instead of the generic boundary when the module is off.
