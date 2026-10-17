# Manage Product offering and tester guide

Status: repository implementation complete; deployment and external acceptance
items are listed under **Open evidence**. This guide is the starting point for a
new tester. Inventory and other StreamlineOS modules are outside its scope.

## What the product offers

Manage Product gives a product team one connected workspace for:

- a searchable, filterable product directory with create, edit, archive,
  restore and restricted membership;
- an overview of evidence, delivery and outcome signals;
- customer feedback capture, classification, duplicate handling, intake
  routing and opportunity linking;
- discovery opportunities with evidence, explainable scoring, human overrides,
  comparison, acceptance, decline and a trace of the decision;
- goals linked to the product;
- linked projects, a primary project and contribution or health views;
- roadmap board, list and timeline views with initiative details;
- audience-safe public roadmap publication with hashed, expiring, rotatable and
  revocable share tokens;
- product releases with owner, QA, deployment, project release and authorized
  evidence links;
- settings for details, members, linked projects, feedback channels and
  publication;
- outcome reviews that connect shipped work to measured results.

The six product value themes are feedback traceability, customer-impact views,
explainable scoring, durable opportunity records, audience-safe roadmaps and
outcome follow-up. The workflows exist. Competitive superiority, customer
preference and willingness to pay remain hypotheses until the customer study is
completed.

## Routes to test

Start at `/build/managed-products`, open a product, and test these product routes:

1. `/build/managed-products/:productId`
2. `/feedback`
3. `/insights`
4. `/goals`
5. `/projects`
6. `/roadmap`
7. `/releases`
8. `/settings`

Append each suffix to the product route. Test at 375 × 812, 768 × 1024 and
1280 × 800.

## Required fixtures

Use disposable non-production data when a test mutates or revokes records.

- an owner or product administrator;
- a restricted product member;
- a user without the relevant product, roadmap or feedback permission;
- a user in a second tenant;
- at least three pages of products, members, projects and feedback channels;
- feedback that can be classified, merged, routed and linked;
- an opportunity with evidence and score inputs;
- a goal, two projects, a roadmap item and a release with evidence;
- a disposable public roadmap publication that may be rotated, expired and
  revoked;
- an endpoint that can receive page alerts and one that can receive notify
  alerts.

Record the actor, tenant, fixture, action, URL, visible result, relevant network
result, console result, refresh result and screenshot for every acceptance cell.

## Browser workflow

### Directory and navigation

1. Confirm search, filters, status, segment, tag, owner, health, lifecycle,
   table/grid switch and pagination update the URL and results.
2. Change a filter on page three and confirm paging resets without duplicate or
   missing rows.
3. Walk pages 1 → 2 → 3 → 2 → 1 and repeat after refresh.
4. Open a product with mouse, keyboard and modifier-click. Confirm Back,
   Forward, deep-link refresh and `?ret=` focus/scroll restoration.
5. Verify populated, empty, filtered-empty, loading, retryable error, denied,
   not-found and offline/recovered states.

### Feedback and discovery

1. Capture feedback and confirm its product, source and consent state.
2. Classify it, mark a duplicate, route it to Intake and link it to an
   opportunity. Refresh after each saved mutation.
3. Create an opportunity, attach evidence, calculate a score, override the
   score with a reason and test a stale revision conflict.
4. Accept or decline an opportunity and verify its trace still explains the
   evidence and decision.
5. Confirm restricted and cross-tenant users cannot read selectors, records or
   mutation results they do not own.

### Goals, projects and roadmap

1. Link and unlink a goal.
2. Link two projects, set the primary project and validate project health and
   contribution filters.
3. Create or link a roadmap item and verify board, list and timeline views.
4. Open and close detail panes using only the keyboard; Escape must return
   focus to the trigger.
5. Force secondary-read failures and confirm Retry keeps typed search and
   current selections.

### Releases and outcomes

1. Create a product release and link its canonical project release.
2. Set owner, QA state and deployment URL. Trigger a stale revision and confirm
   the user's edits remain available.
3. Open authorized ticket, test, incident and approval evidence. Inaccessible
   evidence must be withheld without reporting a false zero.
4. Follow an evidence link and return to the same product release context.
5. Schedule and complete an outcome review; confirm the measured result remains
   after refresh.

### Settings and public roadmap

1. Edit product details and confirm the value after refresh.
2. Add and remove a restricted member while preserving the last-manager rule.
3. Walk three pages forward and backward in Members, Projects and Feedback
   Channels.
4. Publish a disposable roadmap, open its public link, rotate it and prove the
   old token fails. Test an expired token, then revoke and prove the current
   token fails.
5. Confirm a viewer may read publication metadata but cannot see publish,
   rotate or unpublish controls.
6. Use keyboard-only navigation through dialogs, sheets, menus and comboboxes;
   verify focus trap, Escape/Cancel focus return and mobile full-screen behavior.

## Automated checks

Run package-scoped commands from the repository root. The pnpm wrapper may
report `unable to open database file` on this machine; the direct Node commands
below avoid that local wrapper failure.

```powershell
cd frontend
node ./node_modules/@playwright/test/cli.js test --config=playwright-intercepted.config.ts e2e-intercepted/managed-products-states.spec.ts
node ./node_modules/jest/bin/jest.js --runInBand features/build/overview/managed-product-overview-page-params.test.tsx

cd ../backend
node ./node_modules/jest/bin/jest.js --runInBand src/common/slo/slo-managed-product.spec.ts
```

The intercepted browser suite proves presentation and responsive state handling.
Its `/me/access` response is mocked, so it is not authorization proof. Use the
seeded HTTP authorization suite and real restricted/cross-tenant browser actors
for authorization acceptance. Database lifecycle suites require the documented
scratch database and destructive-test opt-in; never point them at production.

## Current verified baseline

- Product directory and all eight product routes rendered in the authenticated
  production browser at 375, 768 and 1280 px without settled horizontal
  overflow.
- The intercepted populated, empty, error, denied, not-found, deep-link,
  refresh and responsive state suite passed all 38 unique checks across bounded
  runs. It proves presentation only because access is mocked.
- Product Settings description persistence, Publishing deep-link refresh and
  Rotate dialog focus return were verified against product 1.
- Database lifecycle and publication tests passed 26 of 26.
- Seeded HTTP authorization passed 118 of 118.
- The Manage Product SLO suite passed 29 of 29, including delivery to a real
  local HTTP receiver.
- Product source items MP-01 through MP-08, MP-10 and MP-11 are complete.
- MP-12 repository alert delivery is complete.
- MP-13 workflow implementation and official Productboard/Canny documentation
  comparison are complete.

## Open evidence

These items need accounts, fixtures, deployment configuration or real people;
they are not remaining repository implementation:

1. Complete the real browser role and tenant matrix with restricted, denied and
   second-tenant users.
2. Complete three-page browser paging, offline/recovery, dirty-form failure,
   keyboard traversal and disposable expired/rotated/revoked-token cases.
3. Deploy the current frontend mobile-width fix and backend alert delivery
   revision, then repeat the affected production checks.
4. Configure real `MP_ALERT_PAGE_URL` and `MP_ALERT_NOTIFY_URL`, deliberately
   trigger the deployed alert, receive it, acknowledge it and record recovery.
5. Run the defined study with real Productboard/Canny users and record task
   completion, time, errors, preference and qualitative notes. Do not convert
   competitor documentation into customer-validation evidence.

Operational thresholds, runbook anchors and alert payload checks remain in
[`managed-product-operational-readiness-2026-10-12.md`](../audit/managed-product-operational-readiness-2026-10-12.md).
The live external checklist remains in
[`managed-product-pending-work.md`](../audit/managed-product-pending-work.md).

## Delivery checklist

- [x] Product-owned repository implementation and focused automated checks.
- [x] Authenticated populated-route production pass at 375, 768 and 1280 px.
- [ ] Complete the real role, tenant, state, paging, offline and disposable-token browser matrix.
- [ ] Configure and prove deployed paging, acknowledgement and recovery.
- [ ] Complete the real-customer Productboard/Canny usability study.

