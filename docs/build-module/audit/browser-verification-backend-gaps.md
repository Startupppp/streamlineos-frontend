# Browser verification — backend gaps

Recorded from the Cursor IDE browser on the working tree, 2026-10-11. No cookies or tokens are included.

## Backend bugs

### BVG-OVW-001

- Screen URL: `http://localhost:1000/build/managed-products/39?segment=no-such-segment`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Overview aggregates match the selected segment
- Bad path: deep link a segment that is not one of the product's segments
- Method, path, status: `GET /build/managed-products/39/summary?period=all&segment=no-such-segment` — 200
- Expected: filtered-empty delivery counts (Now/Next/Later/Completed 0) and the unscoped "testing" roadmap preview hidden, or a validation status the page explains
- Actual: 200, and the page still shows Now 0, Next 1, Later 1, Completed 0 with the "testing" planned preview
- User impact: a shared segment link looks applied and still shows every initiative
- UI explains it: the Segment control shows `no-such-segment`, which matches the URL. The numbers do not say the filter was ignored

### BVG-FB-001

- Screen URL: `http://localhost:1000/build/managed-products/999999999/feedback`
- Checklist source: `docs/build-module/audit/managed-product-pending-work.md` — Feedback
- Bad path: deep link a numeric product id that does not exist
- Method, path, status: `GET /build/managed-products/999999999` — 404; `GET /feedbucket/submissions?managedProductId=999999999&page=1&limit=25` — 200
- Expected: the submissions list for a missing product is not a successful empty inbox
- Actual: the product request is 404 and the submissions request is 200 with an empty page
- User impact: a client that only reads the submissions list treats a missing product as a real empty inbox
- UI explains it: yes, after the page gate. The screen is Page Not Found and does not show "No feedback submissions"

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

## Assumptions you had to make from a sibling screen

- An unrecognized period is ignored the same way the overview period options already ignore values outside `30d`, `90d`, `365d`, and `all`.
- A non-positive team id is ignored the same way project overview already ignores a non-positive `teamId`.
- Ticket progress staying at 8/202 while a team filter zeros roadmap horizons was treated as product-wide ticket scope, because the screen contract names initiative status and team as filters and the horizon counts did change.

## Verification log

- Overview checklist, working tree, role not labeled in the header (actor can edit the product), 1280 then 768 and 375. Bad paths completed: illegal period, empty period, illegal initiative status, `teamId` of `abc`/`0`/`-1`, unknown team `999999`, whitespace segment, unicode segment, unknown segment, product ids `abc`/`0`/`999999999`, refresh and Back on the missing id, cancelled status filtered empty, empty and too-long and whitespace product name without a save, Escape focus return. Good path: `period=30d`, team `enginering` (`teamId=35`), and `initiativeStatus=planned` each reached the summary request with 200 and the controls matched after refresh; horizons went from Next 1 / Later 1 to 0 under that team. Preview "testing" opened `/build/goals/37` and survived refresh. Preview "testing planned" opened `/build/managed-products/39/roadmap?horizon=next` and survived refresh. Console: existing hydration warnings in `app-sidebar.tsx`, `dashboard-shell.tsx`, and `header-brand.tsx`; no new 5xx from these flows. Frontend files changed: `frontend/features/build/overview/use-managed-product-overview.ts`, `frontend/features/build/overview/managed-product-overview-page.tsx`, `frontend/features/build/overview/managed-product-overview-delivery-card.tsx`, `frontend/features/build/overview/managed-product-overview-page-params.test.tsx`, `frontend/hooks/api/build/managed-product-summary.ts`, `frontend/features/build/managed-products/managed-product-schema.ts`, `frontend/features/build/managed-products/managed-product-schema.test.ts`.
- Feedback checklist stays unchecked (BVG-FB-001, BVG-BLOCK-001, BVG-BLOCK-002). Working tree, role not labeled (actor can capture on Build QA Sandbox), 1280 then 768 and 375. Bad paths completed: illegal source, sentiment, consent, type, status, duplicate, linked, and opportunity values, illegal dates, non-positive customer id, whitespace theme, unknown assignee, unknown segment plus unicode search, whitespace search, reversed dates, missing submission `999999999`, product ids `abc`/`0`/`999999999`, empty and whitespace and too-long capture message, invalid email, Cancel was not needed after Escape discarded a dirty sheet and returned focus to Capture feedback. No capture POST on those validation paths. Good path partial: `type=bug` returned 200 and hid the Idea row; `type=idea` returned 200 and kept it; both held at 375 for the bug filter and the reversed-date copy. Filters that the client drops are not sent. Whitespace search stays in the box while the request omits `search`. Console: the same hydration warnings; no new 5xx from these flows. Frontend files changed: `frontend/features/build/managed-products/use-product-feedback-filters.ts`, `frontend/features/build/managed-products/product-feedback-page.tsx`, `frontend/features/build/managed-products/product-feedback-columns.tsx`, `frontend/features/build/managed-products/feedback/capture-submission-sheet.tsx`, `frontend/features/build/managed-products/product-feedback-page.test.tsx`, `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx`.

## Delivery checklist

- [ ] BVG-OVW-001: `managed-product-summary.service.ts` now scopes roadmap counts to the segment through the source opportunities. Re-run the unknown-segment deep link in the browser and confirm Now/Next/Later/Completed read 0 and the preview is hidden.
- [ ] BVG-BLOCK-001: run Denial with a user lacking managed-product permission and a user from another tenant, then run the create, archive, restore, publish, and edit-save writes against a confirmed disposable environment.
