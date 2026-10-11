# Browser verification — backend gaps

Recorded from the Cursor IDE browser on the working tree, 2026-10-11. No cookies or tokens are included.

## Backend bugs

### BVG-FB-001

- Screen URL: `http://localhost:1000/build/managed-products/999999999/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback
- Bad path: deep link a numeric product id that does not exist
- Method, path, status: `GET /build/managed-products/999999999` — 404; `GET /feedbucket/submissions?managedProductId=999999999&page=1&limit=25` — 200
- Expected: the submissions list for a missing product is not a successful empty inbox
- Actual: the product request is 404 and the submissions request is 200 with an empty page
- User impact: a client that only reads the submissions list treats a missing product as a real empty inbox
- UI explains it: yes, after the page gate. The screen is Page Not Found and does not show "No feedback submissions"

### BVG-OWN-001

- Screen URL: `http://localhost:1000/build/managed-products/39`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Directory edit, Overview owner
- Bad path: set an owner on the product, then open its overview
- Method, path, status: `GET /build/managed-products/39` — 200, `owner` null while `ownerId` is set
- Expected: the overview names the same owner the directory shows
- Actual: create and update wrote `owner_id` only, while the detail, list, and summary reads resolve the owner from `owner_membership_id`. The directory showed the owner and the overview read Unassigned and listed "No product owner" under Needs attention
- User impact: every product whose owner was set through the API showed as unowned on its overview
- Fix: `backend/src/modules/build/managed-products/managed-products.service.ts` now resolves the membership through `BuildMembersService.assertBuildMember` on create and update, writes `ownerMembershipId` with `ownerId`, clears both together, and returns the resolved owner from create, update, archive, and restore. Migration `1981_managed_product_owner_membership_backfill` backfilled existing rows and was applied to production. The write-path change needs a backend deploy; until then a newly set owner reads Unassigned again
- UI explains it: after the backfill the product 39 overview header reads "Owner adityachalla01"

### BVG-CONFLICT-001

- Screen URL: `http://localhost:1000/build/managed-products/39/settings`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Directory version conflict
- Bad path: save the product settings from a second tab after the first tab saved
- Method, path, status: `PATCH /build/managed-products/39` — 409
- Expected: a product conflict code and message
- Actual: code `PROJECTS_TICKET_CONFLICT`, message "Ticket was modified by another request. Please refresh and try again.", `details.currentVersion` 8. `ManagedProductsService` throws the shared `TicketVersionConflictException`, which about 20 Build services reuse
- User impact: any client that shows the server message tells a product editor that a ticket changed
- UI explains it: yes. Settings shows its own copy, "This product was updated by someone else. Reload to see the latest version.", with Reload

### BVG-RM-001

- Screen URL: `http://localhost:1000/build/managed-products/39/roadmap`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Roadmap reorder
- Bad path: in a column whose items share a sort order (every item starts at 0), choose Move up on the second card
- Method, path, status: `PATCH /build/roadmap-items/40/position` with `beforeItemId` 39 — 200
- Expected: the card moves above its neighbour and stays there after a reload
- Actual: "move before" wrote `max(0, neighbour.sortOrder - 1)`, which is 0 again, and the list orders by sort order then id, so the card stayed second. "Move after" wrote `neighbour + 1`, which can jump past later cards
- User impact: Move up and Move down did nothing, or moved too far, on any board whose items were never repositioned
- Fix: `backend/src/modules/build/core/roadmap/roadmap-position-plan.ts` places the item between its new neighbours using the same order as the list, takes a gap when one exists, and renumbers that column in 1024 steps inside a transaction only when tied neighbours leave no room (`roadmap-move-publish.service.ts`, spec `roadmap-position-plan.spec.ts`). The client re-sorts the board from the response and marks it stale, so renumbered neighbours pick up their new versions. Needs a backend deploy
- UI explains it: no. The request succeeds and the card does not move

### BVG-FB-002

- Screen URL: `http://localhost:1000/build/managed-products/39/feedback?submission=95`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback classify, merge
- Bad path: open a submission in the side pane
- Method, path, status: `GET /feedbucket/submissions/95` — 200, `duplicateCount` returned as the string `"0"`
- Expected: an integer count
- Actual: the raw `COUNT(*)` subquery returns text, the detail contract rejected the response, and the pane read "Submission not found"
- User impact: no submission could be triaged from the product Feedback pane
- Fix: `feedbucket-submission-read.service.ts` casts both counts with `::int` and returns a number from `enrichDetail`. The client contract coerces numeric strings so the pane works before the deploy
- UI explains it: no. The pane claimed the submission did not exist

### BVG-FB-003

- Screen URL: `http://localhost:1000/build/managed-products/39/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback route to Intake
- Bad path: Route to Intake on a submission whose widget has no project
- Method, path, status: `POST /feedbucket/submissions/94/route-to-intake` with `{ "projectId": 6 }` — 404 "Widget has no project linked"
- Expected: the user picks a linked project and the submission lands in that project's Intake
- Actual: the endpoint was bodyless and only read the widget project, so every manually captured or product widget submission failed. The old client called it and showed nothing
- User impact: product feedback could never reach Intake
- Fix: the route accepts an optional `projectId` (`routeToIntakeSchema`), falls back to the widget project and then its default project, returns 400 "Choose a project to route this feedback to" when none apply, and still checks project access (spec `feedbucket-route-to-intake.spec.ts`). The client opens a project picker listing the product's linked projects. Needs a backend deploy
- UI explains it: the picker opens and lists BQS and STRE. The final request still returns the old 404 until the deploy

### BVG-INS-001

- Screen URL: `http://localhost:1000/build/managed-products/39/insights?view=discovery&opportunity=1`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback opportunity link, Insights
- Bad path: open Insights after linking a submission as evidence
- Method, path, status: `GET /build/managed-products/39/opportunities` — 200, `evidence.latestAt` returned as a Postgres text timestamp
- Expected: an ISO date time
- Actual: the raw `MAX(added_at)` aggregate is not mapped, the opportunity contract rejects it, and Insights shows "Something went wrong"
- User impact: every product with at least one evidence link loses its Insights page
- Fix: `opportunities.service.ts` maps the aggregate with `.mapWith(productOpportunityEvidence.addedAt)`. Needs a backend deploy. Product 39 Insights stays broken in production until then
- UI explains it: no. A generic error state

### BVG-FB-004

- Screen URL: `http://localhost:1000/build/managed-products/39/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedbucket widget submission with the Feedbucket badge
- Bad path: Collect via Feedbucket on a product with no linked widget
- Method, path, status: `POST /feedbucket/widgets` — the schema had no `managedProductId`, so no widget could be linked to a product
- Expected: a product widget whose submissions land on the product with the Feedbucket channel
- Actual: the dialog told the user to set a managed product on a widget, and no screen or endpoint could do that. The only product-linked widget is the internal inactive "Product capture" widget used by manual capture
- User impact: the Feedbucket channel badge was unreachable for every product
- Fix: widget create and update accept `managedProductId`, checked with `assertManagedProductInOrg` (spec `feedbucket-widgets.service.spec.ts`). The collect dialog ignores the internal capture widget, offers Activate for a paused product widget, and otherwise Create product widget, then shows the embed snippet. Needs a backend deploy
- UI explains it: before the fix, the dialog gave instructions that could not be followed

### BVG-FE-001

- Screen URL: `http://localhost:1000/build/managed-products/39/feedback?submission=95`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback classify, merge, opportunity link
- Bad path: classify, mark duplicate, unmark, link to opportunity
- Method, path, status: `PATCH .../classification`, `POST .../mark-duplicate`, `POST .../unmark-duplicate`, `POST /build/managed-products/39/opportunities/{id}/evidence` — all 200 or 201
- Expected: a success toast and the pane and list update
- Actual: the client contracts described the `{ success, data }` envelope although the API client unwraps it first, so every success surfaced as "The server sent data this screen does not understand", and the list kept stale theme, sentiment, and frequency
- Fix: client only. The contracts describe the unwrapped shapes, and each success patches the list rows, the detail, and the original's duplicate count from the response (`feedbucket-triage-cache.test.ts`, `use-submission-opportunities.ts`)
- UI explains it: now proven in the browser, see the Verification log

## Backend requirements

None yet.

## Blocked (auth, missing disposable data, owned files, server down)

### BVG-BLOCK-001

- Screen: managed-product Overview, and the Denial checklist item
- Reason: this session has one signed-in actor who can view and edit Build QA Sandbox. A second user without managed-product permission, and a second tenant, are not available. Denial was not executed.
- Writes still open: none for create. Product "QA BV product create" (QABVCR, id 40) was created from New product and is on the directory after reload. Denial is still open because this session has one signed-in actor.

### BVG-BLOCK-002

- Screen: `http://localhost:1000/build/managed-products/39/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback capture, classify, merge, opportunity link, Intake route, and a product-linked Feedbucket widget submission
- Reason: the environment was not confirmed disposable, so classify, duplicate merge, opportunity link, route to Intake, and a Feedbucket widget submission were not executed. Denial stays on BVG-BLOCK-001 (one signed-in actor).
- Accidental write already on the product: one `POST /feedbucket/submissions/capture` returned 201. The row is Type Idea, channel Manual, status Open, frequency 1, and the message is not meaningful customer text. It survived refresh. The row has no archive control on the list. It was left in place and reused only as the filter fixture.
- Cache checklist: proven. A capture updated the overview feedback count from 5 to 6 with no summary GET. See the Verification log.

### BVG-BLOCK-004

- Screen: `http://localhost:1000/build/managed-products/39/projects`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Linked Projects customer filter
- Reason: the organization has no CRM clients (`/crm/clients` shows "No clients yet"). New Client submits `POST /clients` with `{ "name": "QA BV Client" }` and returns 400 `VALIDATION_FAILED`: `fk_client_party_map_legacy` references a record that does not exist. Migration `1093_party_map_drop_legacy_fks` drops that constraint because the write path no longer inserts a legacy `clients` row. Production still enforces it, so the list stays empty and the customer filter cannot be set to a real client.
- Proven so far: the Customer list loads from `GET /clients/list` (200) and offers only "All customers"

### BVG-BLOCK-002 update

- Production writes were approved on product 39 and records created there, so classify, merge, unmark, and opportunity link were executed and are in the Verification log. Route to Intake and the Feedbucket badge now wait only on the deploys in BVG-FB-003 and BVG-FB-004.

### BVG-BLOCK-005

- Screen: `http://localhost:1000/build/managed-products/39` and every other product route
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — remaining browser verification
- Reason: an earlier pass lost the session and stopped. The later pass was signed in. Denial and the customer filter remain open for the reasons in BVG-BLOCK-001 and BVG-BLOCK-004.

## Assumptions

- Product 39 "Build QA Sandbox" and records created inside it are disposable test data. Every write in this log was made there.
- Linking a submission as evidence has no unlink control. The backend has a delete evidence route, but the submission detail does not return evidence ids, so evidence links 1 and 2 on submission 95 stay in place as fixtures.

## Command Center / reports / filters

Frontend-only findings from the 2026-10-11 Command Center, reports, and filters pass. None of these are backend defects. Evidence and the file list live in [command-center-reports-filters-verification.md](./command-center-reports-filters-verification.md).

- CCF-001: Overdue card now opens `/build/my-work?tab=overdue`.
- CCF-002: `/build/risks` "View all" was Access Denied (FE-55). Rows link to `/build/${projectId}/risks`.
- CCF-003: Blockers now matches My Work Blocked (`scope=mine&blockedOnly=true`) and links there.
- CCF-004 / CCF-005: All Work search no longer overlaps Filters at 1280; the mobile Team/Product trigger shows the applied value.
- CCF-006: Saved views now persist product, team, grouping, sort, and calendar/timeline.
- CCF-007 / CCF-008: Overview Open uses `healthBreakdown.openTickets`; Workload uses `EmptyState`.

Post-fix browser reload is blocked on a fresh sign-in.

## Verification log

- Feedback pane: a row click opens the side pane in place with `submission` in the URL, and "Open full details" opens the Feedbucket detail page.
- Classify: `PATCH /feedbucket/submissions/95/classification` — 200, sentiment neutral. The pane and the list row updated without a refetch.
- Merge: `POST /feedbucket/submissions/96/mark-duplicate` into 95 — 200, toast "Marked as duplicate". The pane read "Duplicate of #95" with Unmark, and the list frequency for 95 went from 1 to 2 with no GET.
- Unmark: 200, toast "Duplicate mark removed", frequency 2 to 1 with no GET. Re-marking returned it to 2.
- Opportunity link: `POST /build/managed-products/39/opportunities/1/evidence` and `/2/evidence` — 201, toast "Linked to opportunity". The pane lists "#1 #2". Each link opens Insights at `?view=discovery&opportunity=<id>`, which errors until BVG-INS-001 is deployed.
- Route to Intake: the project picker opens for submission 94, lists BQS and STRE, and keeps Route disabled until a project is chosen. The request returns the pre-deploy 404 (BVG-FB-003).
- 2026-10-11 evening, signed in again. Overview for product 39 shows owner adityachalla01, Build lifecycle, Record opportunity (sheet opens, Cancel does not create), Needs attention, and the signal-to-outcome track.
- Feedback inbox shows three rows with channel and status badges. Route to Intake lists Build QA Sandbox (BQS) and StreamlineOS (STRE); Route stays disabled until a project is chosen. After choosing BQS and clicking Route the dialog closed; a success toast was not still on screen, so the write is not counted as proven.
- Collect via Feedbucket offers Create product widget. The widget was not created.
- Linked Projects filters include Team, Owner, Customer, Contribution, and dates. Customer offers only All customers (BVG-BLOCK-004).
- Goals shows QA BV Goal and testing, both owned by adityachalla01, with pagination.
- 2026-10-11 after the backend deploy. Insights at `?view=discovery&opportunity=1` loads opportunities and opens QA BV Opportunity A with RICE 450.00 and the override reason.
- Owner: Edit product, choose Unassigned, save. Overview reads "Owner Unassigned" and "No product owner". Set the owner back to adityachalla01, save, reload. Overview reads "Owner adityachalla01".
- Roadmap: Move up on QA BV Roadmap item in Now. After reload it stays first and QA BV Opportunity A is second. Moved Opportunity A back up so the column is in its previous order.
- Route to Intake: `POST /feedbucket/submissions/94/route-to-intake` — 201, `intakeId` 10, `created` true. Build QA Sandbox Intake (`/build/6/intake`) lists that pending Feedbucket item. Submission 96 was already in Intake (`created` false, `intakeId` 9) and is listed there too.
- Missing product: `GET /build/managed-products/999999999` — 404 and `GET /feedbucket/submissions?managedProductId=999999999` — 404. The screen is Product not found. `GET /feedbucket/submissions/facets?managedProductId=999999999` still returns 200.
- Collect via Feedbucket: Create product widget succeeds and shows the embed snippet for "Build QA Sandbox feedback". Submitting through that snippet adds a row, "QA BV widget check: product widget submission", with the Feedbucket channel.
- Directory create: New product "QA BV product create", key QABVCR. `POST /build/managed-products` created id 40. After reload the directory lists it above Build QA Sandbox, owner Unassigned, 0 projects.
- Epic accept: roadmap item 41 "QA BV epic accept" is in Next with project 6 and epic 89. The Epic link target `/build/6/issues?ticket=89` opens "Build module end-to-end auditQA Epic —", status In Review.
- Epic picker: Edit "QA BV Roadmap item", choose delivery project Build QA Sandbox, then epic "Build module end-to-end auditQA Epic —", and save. Toast "Roadmap item updated". After reload the card keeps the Epic link, and `GET /build/roadmap?managedProductId=39` returns item 40 with `projectId` 6 and `epicTicketId` 89.
- Cache: overview showed New feedback 5 and Total feedback 5. Capture "QA BV cache count two: overview should follow this capture" returned `POST /feedbucket/submissions/capture` 201 and no summary GET. Opening Overview then showed New feedback 6, Total feedback 6, and 4 unthemed items, with no GET of the summary.
- Directory create, second product: New product "QA BV Outside Sandbox", key QBOS. Toast "Managed product created". After reload the directory still lists it.
- Missing-product facets: `GET /feedbucket/submissions/facets?managedProductId=999999999` still returns 200 on the deployed API. Local `FeedbucketFacetsService.facets` now rejects a missing product the same way the submissions list does. That change is not deployed, so the box stays with the submissions list only.

## Delivery checklist

- [x] BVG-OWN-001: deploy the backend owner write-path fix, then set and clear the owner on product 39 from Edit product and confirm the overview follows each change.
- [x] BVG-BLOCK-001 create: create a product on the directory and confirm it remains after reload.
- [ ] BVG-BLOCK-001: run Denial with a user lacking managed-product permission and a user from another tenant.
- [x] BVG-RM-001: deploy, then Move up a tied card on the product 39 roadmap and confirm it stays after reload.
- [x] BVG-FB-003: deploy, then route submission 94 to Build QA Sandbox and confirm it appears in that project's Intake.
- [x] BVG-INS-001: deploy, then open product 39 Insights and the `opportunity=1` deep link.
- [x] BVG-FB-004: deploy, then Create product widget from Collect via Feedbucket, submit through its snippet, and confirm the row shows the Feedbucket badge.
- [ ] BVG-BLOCK-004: win a CRM lead into a client, link it to a product project, and filter Linked Projects by that customer.
