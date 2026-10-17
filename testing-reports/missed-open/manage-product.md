# manage-product — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## MP-B-003 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-005 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-007 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/CLAUDE-FIX-BRIEF.md`:

## MP-B-007: Deep link ?opportunity=1 does not reopen the detail sheet on load
**Severity:** Low | **Groups:** stand-alone

**Where:** /build/managed-products/3/insights?view=discovery&opportunity=1. **Steps:** Open an opportunity, reload or open the URL directly. **Expected:** Sheet opens for that id. **Actual:** No sheet though URL keeps the param (sometimes appears after another in-app navigation). **Likely cause:** Sheet open state initialised from click only, or read before router/search params are ready and not re-synced. **Fix:** Derive open state from the search param (`useSearchParams`) and open once data is loaded; show not-found inside the sheet for unknown ids. **Acceptance criteria:** Reload and direct link open the sheet; closing removes the param; invalid id shows a friendly message.

## MP-B-009 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-011 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-012 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

## MP-B-012
- Title: Goals summary cards not refreshed after unlink (Total Goals stays 2 while list shows 1)
- Severity: Low
- Route: /build/managed-products/3/goals → Goal actions → Unlink from product
- Actor: owner
- Steps: With 2 linked goals, Goal actions → "Unlink from product" → confirm "Unlink".
- Expected: List and "Total Goals" stat both show 1.
- Actual: Toast "Goal unlinked from product"; list shows 1 card ("Showing 1–1 of 1") but the "Total Goals" tile still shows 2 until refresh/next action.
- Suggested fix: Invalidate the summary query together with the list on unlink/link.

## MP-B-013 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/CLAUDE-FIX-BRIEF.md`:

## MP-B-013: "New release" cannot be created: POST /releases returns 400 VALIDATION_FAILED when optional fields are blank; no message shown
**Severity:** Critical | **Groups:** G3 | **Policy:** P3

**Where:** /build/managed-products/3/releases → "New release" side-sheet → "Create release". Actor: owner.

**Steps:**
1. Open Releases (no releases). Click "New release".
2. Name "QA R1013 Alpha", Version "1013.0", leave other fields at defaults.
3. Click "Create release".

**Expected:** Release created and listed under active/upcoming releases; optional fields omitted.

**Actual:** Sheet stays open, no visible error, no row. `POST /build/managed-products/3/releases` → 400 `VALIDATION_FAILED` with details: `description`, `releaseDate`, `ownerUserId` "expected string, received null"; "QA state: None" sent as an invalid option (allowed: pending|in_review|approved|rejected); empty Deployment evidence URL rejected; even with every field filled, `projectReleaseId` "expected number, received null" when Canonical project release is blank. 5 attempts, nothing created.

**Likely cause:** Form serialises unset optional fields as `null`/`""` and "None" as a literal; the server zod/DTO schema marks them `optional()` but not `nullable()`.

**Fix:** Client: strip `null`/`""` optional keys before submit and map QA state "None" to omitted. Server: accept `null` for optional fields (`.nullish()`), treat empty URL as absent. Show validation errors inline via the G3 mapper. Search: "New release", "Create release", `projectReleaseId`, `deploymentEvidenceUrl`, `qaState`.

**Acceptance criteria:**
- Name + Version only → 201, sheet closes, release appears without reload.
- Each optional field (description, date, owner, QA state, URL, canonical project release) can be set or left blank independently.
- API test: POST with optional fields `null` and with them omitted both succeed; invalid URL returns 400 with field error shown inline.

## MP-B-014 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-015 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-016 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-019 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-020 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-021 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-022 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-023 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-024 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-025 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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

## MP-B-026 — still open

Latest status source: `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`

Write-up from `streamline-qa-reports/manage-product-2026-10-13/MP-BUGS.md`:

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
