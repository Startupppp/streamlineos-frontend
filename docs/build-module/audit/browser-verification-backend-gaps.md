# Browser verification — backend gaps

Recorded from the Cursor IDE browser on the working tree, 2026-10-11. No cookies or tokens are included.

## Backend bugs

### BVG-OVW-001

- Screen URL: `http://localhost:1000/build/managed-products/39?segment=no-such-segment`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Overview aggregates match the selected segment
- Bad path: deep link a segment that is not one of the product's segments
- Method, path, status: `GET /build/managed-products/39/summary?period=all&segment=no-such-segment` — 200
- Expected: filtered-empty delivery counts (Now/Next/Later/Completed 0) and the unscoped roadmap preview hidden, or a validation status the page explains
- Actual on the local API: 200, and the page still showed Now 0, Next 1, Later 1, Completed 0 with the planned preview
- Actual on production (`https://api.streamlineos.in`), same URL, same product 39: 200, and Now, Next, Later, and Completed all read 0. The "testing planned" roadmap preview was absent. The unfiltered summary still showed Next 1 and Later 1 with that preview
- User impact: the production summary honors an unknown segment for roadmap horizons. The earlier local mismatch is not what production returned
- UI explains it: the Segment control shows `no-such-segment`. The zero counts match a filter that matches nothing

### BVG-FB-001

- Screen URL: `http://localhost:1000/build/managed-products/999999999/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback
- Bad path: deep link a numeric product id that does not exist
- Method, path, status: `GET /build/managed-products/999999999` — 404; `GET /feedbucket/submissions?managedProductId=999999999&page=1&limit=25` — 200
- Expected: the submissions list for a missing product is not a successful empty inbox
- Actual: the product request is 404 and the submissions request is 200 with an empty page
- User impact: a client that only reads the submissions list treats a missing product as a real empty inbox
- UI explains it: yes, after the page gate. The screen is Page Not Found and does not show "No feedback submissions"

### BVG-INS-001

- Screen URL: `http://localhost:1000/build/managed-products/39/insights?tab=discovery&oppState=declined`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Insights filters
- Bad path: choose the Declined state, which is one of the filter's own options
- Method, path, status: `GET /build/managed-products/39/opportunities?state=declined` — 400
- Expected: one selected state returns the matching opportunities, or an empty page
- Actual: 400, code `VALIDATION_FAILED`, details path `state`, message `Invalid input: expected array, received string`. The OpenAPI parameter is an array, and a single form value is `state=declined`. `state[]=declined` is refused as an unrecognized key
- User impact: Declined, and the same single-value array shape for theme, segment, owner, and confidence, cannot filter the opportunity list
- UI explains it: on production the Discovery list stays on Insights and says `state: Invalid input: expected array, received string`, with Try again. The product page is not replaced

## Backend requirements

None yet.

## Blocked (auth, missing disposable data, owned files, server down)

### BVG-BLOCK-001

- Screen: managed-product Overview, and the Denial checklist item
- Reason: this session has one signed-in actor who can view and edit Build QA Sandbox. A second user without managed-product permission, and a second tenant, are not available. Denial was not executed.
- Writes: create, archive, restore, publish, and edit-save were not run. The environment was not confirmed disposable. Edit-sheet checks stopped at client validation and Cancel/Escape.

### BVG-BLOCK-002

- Screen: `http://localhost:1000/build/managed-products/39/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback capture, classify, merge, opportunity link, Intake route, and a product-linked Feedbucket widget submission
- Reason: the environment was not confirmed disposable, so classify, duplicate merge, opportunity link, route to Intake, and a Feedbucket widget submission were not executed. Denial stays on BVG-BLOCK-001 (one signed-in actor).
- Accidental write already on the product: one `POST /feedbucket/submissions/capture` returned 201. The row is Type Idea, channel Manual, status Open, frequency 1, and the message is not meaningful customer text. It survived refresh. The row has no archive control on the list. It was left in place and reused only as the filter fixture.
- Cache checklist: not proven. The capture hook invalidates with `refetchType: "none"`, and the first client patch omitted `duplicateCount` (frequency rendered NaN until refresh). The patch now includes status, duplicate count, and created time, and that patch was not re-checked with another write.

### BVG-BLOCK-003

- Screen: Insights, and every later Build screen
- Reason: `127.0.0.1:1500` is still down. The local frontend now reads `https://api.streamlineos.in`, and browser checks continued against that API. This no longer blocks opening the screens. Writes stay blocked because the data is production.

### BVG-MEM-001

- Screen URL: `http://localhost:1000/build/managed-products/39/insights?tab=discovery`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Insights owner filter
- Bad path: open Discovery, which loads organization members for the owner list
- Method, path, status: `GET /organization/members?limit=100` — 200
- Expected: a JSON member list
- Actual: 200 with a body that is not JSON (`Expected ',' or '}' after property value in JSON` near position 335)
- User impact: the owner list cannot be built from this response. Discovery used to replace the whole product with the route error. The owner query now stays inline, and the page shows All owners
- UI explains it: the rest of Discovery stays on screen. The owner control does not say the member list failed to parse

## Assumptions you had to make from a sibling screen

- An unrecognized period is ignored the same way the overview period options already ignore values outside `30d`, `90d`, `365d`, and `all`.
- A non-positive team id is ignored the same way project overview already ignores a non-positive `teamId`.
- Ticket progress staying at 8/202 while a team filter zeros roadmap horizons was treated as product-wide ticket scope, because the screen contract names initiative status and team as filters and the horizon counts did change.

## Verification log

- Overview checklist, working tree, role not labeled in the header (actor can edit the product), 1280 then 768 and 375. Bad paths completed: illegal period, empty period, illegal initiative status, `teamId` of `abc`/`0`/`-1`, unknown team `999999`, whitespace segment, unicode segment, unknown segment, product ids `abc`/`0`/`999999999`, refresh and Back on the missing id, cancelled status filtered empty, empty and too-long and whitespace product name without a save, Escape focus return. Good path: `period=30d`, team `enginering` (`teamId=35`), and `initiativeStatus=planned` each reached the summary request with 200 and the controls matched after refresh; horizons went from Next 1 / Later 1 to 0 under that team. Preview "testing" opened `/build/goals/37` and survived refresh. Preview "testing planned" opened `/build/managed-products/39/roadmap?horizon=next` and survived refresh. Console: existing hydration warnings in `app-sidebar.tsx`, `dashboard-shell.tsx`, and `header-brand.tsx`; no new 5xx from these flows. Frontend files changed: `frontend/features/build/overview/use-managed-product-overview.ts`, `frontend/features/build/overview/managed-product-overview-page.tsx`, `frontend/features/build/overview/managed-product-overview-delivery-card.tsx`, `frontend/features/build/overview/managed-product-overview-page-params.test.tsx`, `frontend/hooks/api/build/managed-product-summary.ts`, `frontend/features/build/managed-products/managed-product-schema.ts`, `frontend/features/build/managed-products/managed-product-schema.test.ts`.
- Feedback checklist stays unchecked (BVG-FB-001, BVG-BLOCK-001, BVG-BLOCK-002). Working tree, role not labeled (actor can capture on Build QA Sandbox), 1280 then 768 and 375. Bad paths completed: illegal source, sentiment, consent, type, status, duplicate, linked, and opportunity values, illegal dates, non-positive customer id, whitespace theme, unknown assignee, unknown segment plus unicode search, whitespace search, reversed dates, missing submission `999999999`, product ids `abc`/`0`/`999999999`, empty and whitespace and too-long capture message, invalid email, Cancel was not needed after Escape discarded a dirty sheet and returned focus to Capture feedback. No capture POST on those validation paths. Good path partial: `type=bug` returned 200 and hid the Idea row; `type=idea` returned 200 and kept it; both held at 375 for the bug filter and the reversed-date copy. Filters that the client drops are not sent. Whitespace search stays in the box while the request omits `search`. Console: the same hydration warnings; no new 5xx from these flows. Frontend files changed: `frontend/features/build/managed-products/use-product-feedback-filters.ts`, `frontend/features/build/managed-products/product-feedback-page.tsx`, `frontend/features/build/managed-products/product-feedback-columns.tsx`, `frontend/features/build/managed-products/feedback/capture-submission-sheet.tsx`, `frontend/features/build/managed-products/product-feedback-page.test.tsx`, `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx`.
- Insights checklist stays unchecked (BVG-INS-001, BVG-BLOCK-001, BVG-BLOCK-002). Working tree, role not labeled, 1280 only. Bad paths completed before the API stopped: illegal range and tab ignored with a 200 and the all-time overview; illegal Discovery state, sort, confidence, evidence age, score, theme period, blank segment, and non-numeric owner omitted, and the unfiltered opportunities request returned 200. `range=30d` returned 200 and the control and sentence matched. `oppState=declined` returned 400 and, after the inline-error change, left Insights on screen with a validation message instead of replacing the product. Missing product, create-sheet validation, keyboard, and 768/375 were not reached. Frontend files changed: `frontend/features/build/managed-products/insights/use-opportunity-discovery-filters.ts`, `frontend/hooks/api/build/product-discovery.ts`, `frontend/lib/get-error-message.ts`, `frontend/lib/get-error-message.test.ts`.
- Production pass continued, product 39, no writes. Directory illegal owner, team, project, blank segment, and blank tag no longer replace the page: team, project, segment, and tag are omitted, `ownerId=not-a-user` returns 200 and shows the filtered empty state. `teamId=35` sent with status, lifecycle, and health returned 200 and hid both products; removing the team chip left `status=active&lifecycle=build&health=unknown`, returned 200, and showed Build QA Sandbox. Linked projects: impossible `pp_dateFrom=2026-13-40` is omitted; a real date is sent as an ISO datetime. `pp_contrib=low` returned 200 and showed StreamlineOS; `pp_contrib=high&pp_search=zzzz` returned 200 and showed no results. Roadmap `horizon=next&status=planned` returned 200 with Next 1 "testing"; illegal confidence was dropped. Preview opened "Public Roadmap Preview" with that one Next item. Settings Members `GET /build/managed-products/39/members` 200 showed "No members yet"; Releases `GET .../releases` 200 showed "No releases yet". Nothing was added. Goals `status=not_started` returned 200 and showed "testing"; illegal level was dropped. `status=completed` returned 200 and showed "No results match your filters." Frontend files changed: `frontend/features/build/managed-products/use-managed-products-page.ts`, `frontend/features/build/managed-products/managed-products-page.test.tsx`, `frontend/features/build/managed-products/projects/use-product-projects-page.ts`, `frontend/features/build/managed-products/product-roadmap-page.tsx`.
- Production pass continued, product 39, no writes. Linked projects: `pp_health=on_track` sent `health=on_track` and returned 200 with "No results match your filters"; `pp_health=off_track` sent `health=off_track`, returned 200, showed StreamlineOS Off track, and survived refresh. Illegal `pp_health`, `pp_team`, `pp_status`, and `pp_dateFrom` were omitted and the list request returned 200. Insights Discovery keyboard: ArrowRight moved focus across the tabs and Enter selected Overview, clearing `tab`; Escape closed the range menu and returned focus to Range. Discovery at 768 and 375 had no page scroll. Missing product `999999999` showed "Product not found" after a 404. Roadmap `view=timeline` showed the two "testing" items, survived refresh, and had no page scroll at 768 and 375; `view=nope` fell back to Board. Goals title link opened `/build/goals/37` (200); that goal has no parent and no outcome reviews, so those drill-down links are absent. Directory Clear all removed `status`, `lifecycle`, and `health` from the URL. Frontend files changed: `frontend/features/build/managed-products/projects/use-product-projects-page.ts`.
- Production pass, `https://api.streamlineos.in`, product 39 Build QA Sandbox, role not labeled, no writes. Feedback at 1280: `type=bug` 200 hid the Idea row; reversed dates omitted `from`/`to`, returned 200, and showed "End date is before the start date"; illegal theme, assignee, type, status, channel, and date were dropped while segment and unicode search were sent and returned 200; missing submission `999999999` showed "Submission not found"; missing product `999999999` showed Page Not Found after the product 404; whitespace capture showed "Message is required" with no POST; invalid email showed "Invalid email" and Escape restored focus to Capture feedback. Feedback layout had no page scroll at 768 and 375. Insights Discovery `oppState=declined` stayed on the page and said `state: Invalid input: expected array, received string` (BVG-INS-001). `GET /organization/members?limit=100` returned 200 with invalid JSON (BVG-MEM-001); the owner query no longer replaces the product. Roadmap board 200 showed Now 0, Next 1, Later 1; illegal horizon, status, team, and goal were omitted and the request returned 200. Enter on the overview preview "testing planned" opened `/build/managed-products/39/roadmap?horizon=next`, the item "testing" was visible, and refresh kept `horizon=next` with 200. A pointer click on that preview focused the link and did not navigate. Goals list 200 showed the goal "testing"; illegal level and status were dropped; `ownerId=not-a-user` was sent and returned 200 with the goal hidden. Linked projects 200 showed StreamlineOS, in progress, off track, release Q3.1, contribution 8/202; illegal status, health, and team were omitted. Settings General showed name "Build QA Sandbox", lifecycle Build, and the danger zone; nothing was saved. Directory illegal status and lifecycle were dropped; search `…` returned 200 and hid both products. Roadmap at 375 had Now, Next, and Later with no page-level horizontal scroll. Checkboxes stay unchecked: the full sentences include writes, denial, and cache. Frontend files changed on this pass: `frontend/lib/api-envelope.ts`, `frontend/lib/api-envelope.test.ts`, `frontend/features/build/managed-products/insights/use-opportunity-discovery-filters.ts`, `frontend/features/build/managed-products/product-roadmap-model.ts`, `frontend/features/build/managed-products/product-roadmap-page.tsx`, `frontend/features/build/managed-products/product-roadmap-model.test.ts`.

## Delivery checklist

- [x] BVG-OVW-001: on production, `GET /build/managed-products/39/summary?period=all&segment=no-such-segment` returned 200 and Now, Next, Later, and Completed read 0. The "testing planned" preview was hidden. The unfiltered summary still showed Next 1 and Later 1.
- [ ] BVG-BLOCK-001: run Denial with a user lacking managed-product permission and a user from another tenant, then run the create, archive, restore, publish, and edit-save writes against a confirmed disposable environment.
