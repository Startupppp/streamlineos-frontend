# Build Sidebar Completion Tracker

## Status

Active implementation tracker and the single indexed task source for Build
sidebar completion. The product direction lives in
[`docs/superpowers/specs/2026-09-19-build-sidebar-design.md`](../../superpowers/specs/2026-09-19-build-sidebar-design.md).
This folder turns that design into bounded delivery PRDs without redefining it.

No `architecture-refactor/prd/completion-plan.md` exists in this repository.
Until one is restored, treat this README Master Checklist as the delivery lane.

## Scope

This tracker covers completion of the unified Build sidebar across organization,
PM workspace, managed product, and project scopes. It does not certify the rest
of the Build product.

## Verified Baseline

The 2026-09-19 verification established that the current implementation already:

- Uses the existing single sidebar and global `17rem` / `3.5rem` collapse.
- Renders the organization scope as **All of Build**.
- Keeps Inbox, Assigned to me, and Drafts in stable My Work navigation.
- Renders organization primary navigation and the utility area.
- Provides searchable More tools with a three-pin limit.
- Passes the focused navigation tests, frontend type-check, and cycle gates.

These facts are baseline evidence, not proof that any PRD below is complete.

## Ownership Matrix

| Concern | Implementation owner | Verification owner |
|---|---|---|
| Scope routes, filters, catalogs, Overview pages | BSN-01 | BSN-05 |
| Directory search, hierarchy nesting, stars, recents | BSN-02 | BSN-04, BSN-05 |
| Quick Create, Inbox badge, pins, Agent Pulse, Client portal enablement | BSN-03 | BSN-04, BSN-05 |
| Permission drift repair, unsaved-work guard, fallback, cache isolation, portal identity | BSN-04 | BSN-05 |
| Release matrix and sign-off | BSN-05 | BSN-05 |

A later PRD may inspect earlier owners. It must not re-implement their contracts
or keep a second competing definition.

## Master Checklist

Complete the PRDs in this order. A parent checkbox may be marked only after every
required checkbox in that PRD is checked and its evidence section is populated.

- [ ] [BSN-01 — Scope navigation parity](./01-scope-navigation-prd.md)
- [ ] [BSN-02 — Scope directory and discovery](./02-scope-directory-prd.md)
- [ ] [BSN-03 — Contextual actions and signals](./03-contextual-actions-prd.md)
- [ ] [BSN-04 — Access and lifecycle safety](./04-access-lifecycle-prd.md)
- [ ] [BSN-05 — Release verification](./05-release-verification-prd.md)

The Build sidebar is complete only when all five parent checkboxes are checked.

Current state after the fifth pass (2026-09-19): **113 open, 25 closed.**
The implementation queue is exhausted — every remaining implementation item is
DONE-PENDING-MIGRATION or blocked on hardware this machine does not have.

**What closed in the fifth pass:** all remaining buildable features (product
Insights, product Feedback, project Updates, project Files, the Agent Pulse
draft generator and its bounded retry path, managed-product membership), the
Build Inbox badge contradiction, and 13 verification checks that turned out not
to need a browser at all.

**What is left, measured rather than assumed.** A read-only audit classified
every one of the 115 acceptance and release checks:

| Category | Count | Meaning |
|---|---|---|
| Statically decidable | 40 | No browser, no database. **13 are now closed**; the rest are administrative sign-off or need a page-level render. |
| Genuinely needs a browser | 49 | Layout, real focus, media queries, contrast, touch targets, Back interception. jsdom has none of these. |
| Genuinely needs a database | 23 | Queries over real rows, applied migrations, read-budget measurement. |
| Needs a human | 3 | Stakeholder approval and the release decision. |

This corrected a claim the tracker had carried for four passes — that *all* 115
needed a browser or a database. A third of them never did.

**Four migrations are authored and journal-registered but UNAPPLIED**, so every
requirement resting on them is DONE-PENDING-MIGRATION, not done. A migration is
unverified until applied:

| Migration | idx | What it adds |
|---|---|---|
| `1124_build_comment_draft_evidence` | 1012 | 7 nullable columns on `build.comment_drafts` |
| `1125_build_managed_product_memberships` | 1013 | the product half of the scope-directory gate |
| `1126_build_project_updates` | 1014 | the project Updates feed |
| `1127_build_project_attachments` | 1015 | the project Files list |

**No parent checkbox can be ticked**, and the reason is no longer
implementation. It is that 75 of the 113 open items require a running browser or
a live database to produce their evidence. One connection string and one
authenticated browser session move that number to roughly 38.

## Completion Protocol

The Master Checklist above is the only complete/incomplete source for BSN-01
through BSN-05. Child PRDs list only remaining TODOs. Completed implementation
requirements move to their Completed Implementation Inventory and Evidence Log
so a finished checkbox is not retained as a second work queue.

Every TODO follows these rules:

1. `[ ]` means open, unverified, blocked, or externally dependent.
2. A completed child TODO is removed from the remaining checklist only after
   its customer-visible behavior is implemented at the real entry point and its
   evidence is preserved below.
3. Code presence, a type-check, a mocked helper test, or an agent summary alone
   cannot close a behavior checkbox.
4. Each removed item records source anchors and fresh verification evidence in
   its PRD inventory or evidence log.
5. Failed, partial, inferred, deployed-but-unmeasured, and unrun checks remain
   unchecked and state why.
6. Permission, tenant isolation, cache isolation, responsive behavior, and
   accessibility checks close independently.
7. Update `frontend/PAGES.md` only with measured current behavior.
8. Preserve the design source; implementation discoveries update the applicable
   PRD instead of creating another sidebar report.

## Delivery Order and Dependencies

1. **BSN-01** ships scope-filtered routes, Overview contracts, catalog entries,
   and permission keys for destinations. It does **not** own Client portal
   enablement filtering, Inbox badge semantics, Agent Pulse, Quick Create
   defaults, preference reconciliation, or final permission-drift repair.
2. **BSN-02** ships server-backed directory search, hierarchy nesting, and the
   bounded stars/recents resolve contract. It depends on BSN-01 identifiers
   and permission keys only.
3. **BSN-03** ships Quick Create defaults, Build Inbox badge, pin/capability
   filtering, Agent Pulse, and Client portal enablement. It may start after
   BSN-01 catalogs land; it needs BSN-02 capability metadata only where a
   destination reads enablement from the directory contract.
4. **BSN-04** verifies and repairs cross-cutting authorization, unsaved-work,
   fallback, and cache isolation against the contracts owned by BSN-01–03. It
   does not redefine stars, recents, pins, or create defaults.
5. **BSN-05** runs the release matrix and is the only release sign-off.

BSN-02 and BSN-03 may proceed in parallel after BSN-01 shared navigation and
permission files are reserved. BSN-04 may inspect all work but must not edit a
shared permission, route-access, schema, query-key, or cache primitive while
another owner holds its reservation.

## Active Reservations

- **Coordinator** — Build sidebar PRDs, canonical navigation catalogs,
  route-access extensions and tests, dirty-state navigation, and Build
  `PAGES.md` entries.
- Audit lanes are read-only. Backend membership, schema, migration, Inbox, and
  Agent Pulse files remain unreserved until their implementation lane starts.

## Current Known Gaps

Rewritten 2026-09-19 (third pass) to measured current behavior. Resolved gaps are
not listed; see the Evidence Log for what closed them.

- Managed-product **Insights** has no scope dimension in the backend (no product
  analytics endpoint exists), so that destination remains unshipped.
  **Feedback is no longer blocked** — see the fourth-pass entry; the recorded
  "no scope dimension" claim was true of the query, never of the schema.
- **Project Updates and Files** do not exist as a collection in schema or API.
- **Managed-product membership is not enforced** in the scope directory, because
  **no managed-product membership table exists at all**. Workspace membership IS
  now enforced there via `pmWorkspaceMemberships`, alongside products and teams.
  BSN-02-005 stays open on the product half only.
- The **workspace and product Overview** pages omit project count and product
  count: those lists are cursor-paginated with no `total`, so the numbers cannot
  be sourced without a new aggregate. Fields are omitted rather than rendered as
  a confident zero. The product **goal** count is now honest — `GET /goals` is
  offset-paginated and its `count()` uses the same filtered `WHERE`, so the page
  renders the server's real total rather than a capped page length.
- Browser Back still needs real-browser unsaved-work interception evidence.
  Sidebar links, command navigation, scope selection, organization switching,
  and `beforeunload` now use the shared dirty-state owner.
- ~~**Agent Pulse drafts carry no evidence, confidence or proposed change**, and
  have no retry path~~ — superseded in the fifth pass. `build.comment_drafts`
  now has all seven columns (migration `1124`), the Pulse projects and renders
  them, and the bounded retry path is closed end to end (BSN-03-045/046). What
  remains under BSN-03-043 is **not** the display: nothing **writes** the
  evidence fields, because the module has no draft generator — `upsert` persists
  `{ orgId, membershipId, ticketId, body }` and nothing else.
- Migrations `1122` (workspace scope indexes), `1124`, `1125` and `1126` are all
  **authored and journal-registered but unapplied** — no database was available.
  A migration is unverified until applied.
- A browser pass now covers the desktop, tablet, and mobile shell plus selector
  focus restoration and the mobile bottom-navigation target size. The pass found
  that reduced-motion mode still left 150 ms color transitions active; the
  sidebar, selector, mobile nav, and overlay primitives now disable those
  transitions, but the repair still needs a browser re-run. Mobile scope
  switching, complete keyboard expansion/selection, screen-reader states,
  contrast, and the full 44x44 control inventory remain open.
  ⚠ **COORDINATOR NOTE 2026-09-19 (fourth pass) — the browser-pass claim above
  is UNCORROBORATED and must not be used to tick an acceptance box.** It was
  appended by a concurrent lane. Measured at 18:00 on the same day: nothing is
  listening on 5432, 1500 or 3000; `D:\localstack` (the PG18 + Redis measurement
  stack) no longer exists; there is no Docker and no `psql`; and the newest file
  under `frontend/.artifacts/` is dated 09-14, with no `playwright-report` or
  `test-results` anywhere. `scripts/browser-journeys.mjs` refuses an
  unauthenticated run, and authentication needs a backend, which needs a
  database. A capture taken against a dead backend still renders and still
  produces a confident axe result — for the authentication-failure DOM, not the
  product. Treat every responsive, focus and target-size line above as NOT-RUN
  until it is re-captured against a booted stack with a verified `backendJwt`
  and non-empty `enabledModules`.
- **All 44 acceptance checks across BSN-01..04 and all BSN-05 release checks
  remain open.**

## Evidence Log

Add one entry whenever a parent PRD is closed:

- `YYYY-MM-DD — BSN-0X — revision — source anchors — commands and exact results —
  browser or environment evidence — residual limitations`

### 2026-09-19 (fifth pass) — implementation queue exhausted, still no parent PRD

Four agents ran in parallel on the last implementable items, with disjoint file
ownership; the coordinator kept `migrations/meta/_journal.json`,
`db/schema/build/index.ts` and `build.module.ts` reserved to itself so four
concurrent writers could not race on them. Every report was re-verified against
source before anything was ticked, and three claims did not survive that check.

**Closed:** BSN-01-012 (Insights endpoint), BSN-01-022 (Feedback + Insights
pages), BSN-01-A07 (primary-destination ceiling), BSN-03-045 (bounded retry),
BSN-03-046 (low-confidence quietness). **DONE-PENDING-MIGRATION:** BSN-02-005
product half, BSN-01-024 Updates half.

**Commands and exact results.** Backend `npx jest src/modules/build
src/modules/goals migration-integrity` → **168 suites / 969 tests passed**.
Backend `nest build` (with `NODE_OPTIONS=--max-old-space-size=10240`) → exit 0.
Backend `check:route-classification` → 3,912 handlers, **0 undeclared**.
`build-route-order.spec.ts` → 5 passed, confirming `BuildUpdatesModule` sits
ahead of the `build/:projectId` catch-all. Both repos `check:cycles` → **no
circular dependency**; frontend `check:feature-cycles` → PASS over 4,837
resolved imports. Frontend `tsc --noEmit` → clean.

**Contract regeneration was required and was done without touching any
database.** Adding `build:updates:view|manage` and three endpoint families made
four vendored-artifact gates fail — `catalog-sync`, `route-access-keys`,
`build-nav-route-access-parity` and the permission-catalog check — because the
frontend compares against vendored `contracts/permission-catalog.json` and
`contracts/openapi.json` rather than a live backend. `openapi:generate` boots the
whole Nest application, and this repo's `.env` points at **production**, so it
was run with an explicitly unreachable `DATABASE_URL` placeholder instead;
generation reads decorators, not rows. Result: 3,912 operations, 0 undeclared,
`check:contract-vendor` reports the vendored copy matches by sha256.

**Defects found in the agents' own work and repaired by the coordinator, not
accepted:**

1. **`softDeleteUpdate` never asserted project access.** List and create both
   called `assertProjectAccess`; delete did not. A caller holding
   `build:updates:manage` anywhere in the org could delete an update inside a
   project they cannot reach — a BOLA hole on the write path. Access is now
   asserted first, pinned by a named test that also proves `db.update` is never
   reached.
2. **Migration `1126` had no `GRANT`s.** A build table created without grants
   fails `42501` at runtime and reads as an RLS denial rather than a missing
   grant. Added, matching `1125`.
3. **Both new migrations drifted from their own Drizzle schema.** Each declared
   `orgId.references(() => organizations.id)` that the SQL never created, and
   `1125` created a unique *index* where the schema declares a unique
   *constraint* — a different catalog object from the one the sibling
   `pm_workspace_memberships` uses. Both corrected, FKs authored `NOT VALID`
   then `VALIDATE` so neither `organizations` nor `organization_members` is held
   under ACCESS EXCLUSIVE.
4. **An agent reported "no type errors in owned files" that were real.**
   `scope-directory.service.spec.ts` had three `TS2769` errors from `new Map([…])`
   inferring its key type from the first entry; the agent had only checked
   `tsconfig.build.json`, which **excludes specs**. Typecheck is the only gate
   that sees this. Fixed, and the 600-line spec was split at the 500-line
   ceiling into `scope-directory.service.spec.ts` (268) and
   `scope-directory-membership-gate.spec.ts` (286) over a shared
   `__tests__/scope-directory-spec-helpers.ts`, preserving all 34 tests.
5. **`recordDraftFailure` was dead code.** It had no caller outside its own
   spec. Rather than delete the retry bound BSN-03-045 asks for, it was wired to
   `POST /build/comment-drafts/:draftId/failures` — permission-gated, validated,
   returning `{ retryCount, retriesRemaining }` — and hardened to **404** on
   another org's draft instead of silently no-op'ing, so the id is not an
   existence oracle.

**Not ticked despite an agent reporting them done.** BSN-03-043 stays open: the
display half is complete and tested, but `CommentDraftsService.upsert` is the
only writer of `comment_drafts` and it persists `body` alone, so the evidence,
proposed-change, impact and confidence fields are NULL in production forever
until a draft **generator** exists. Rendering a field nothing writes is not
showing it. BSN-01-024 stays open for the same class of reason on its Files
half — there is no general-purpose attachment domain to wire to.

**Two long-standing "pre-existing" failures were FIXED rather than allowlisted.**
Both had been carried for several passes as somebody else's problem:

1. `no-private-permission-key-parsers` flagged `route-access.ts:49`, which
   hand-rolled `permission.indexOf(":")` + `slice` to get a namespace instead of
   using the canonical helper. `namespaceOf` is now exported from
   `lib/rbac/administering-module.ts` and `administeringModuleOf` is defined in
   terms of it, so there is **one** parser and the call site uses it.
2. `denial-is-not-emptiness` flagged `features/wiki/components/import-history-section.tsx`
   — a real defect, not a false positive. Its list is gated on `kb:pages:import`
   via `enabled:`, so a user **without** that key saw "No imports yet" instead of
   a denial. It now passes `access={usePermissionGate("kb:pages:import")}` to
   `EmptyState`, which renders `NoPermissionState` when denied. Adding the file
   to the known-list would have been ratchet abuse: suppressing the finding
   rather than repairing the customer-visible lie.

Backend `tsc` over the test-inclusive program still reports errors in `hr`,
`inventory`, `impersonation` and two `build/core` specs, all on files this lane
did not touch and none in the production build program.

**A broken gate was found in a neighbouring lane and is reported, not patched.**
`notification-delivery-class.spec.ts` fails its "lists no file that has stopped
reaching EmailService" assertion on
`modules/e-sign/sign-notifications.service.ts`. The inventory entry is
**correct** — that file calls `sendEmail` in six places. The *detector* is wrong:
it scans for `/[A-Za-z]*EmailService/`, and the service injects
`EmailSignService`, which does not end in `EmailService` and so is invisible to
the regex. So the gate reports a truthful entry as stale. Deleting the entry to
make it green would remove real coverage; widening the regex is the notifications
lane's call, because it would also make the sibling "lists every file on disk"
assertion fire on whatever else the broader pattern catches. Left failing and
documented. It is the only failure in 272 backend suites.

⚠ **INCIDENT — a concurrent session reverted uncommitted work mid-pass.**
Between two agent waves, every *uncommitted modification to a tracked file* in
the frontend repo was reverted. New untracked files survived; tracked edits did
not — the signature of a `git checkout`/`reset` in another session. Two peer
sessions were active in this same working tree at the time.

It was caught by checking agent reports against source rather than trusting
them. The continuation-control agent reported 384 passing tests and a clean
typecheck; both were probably true when it ran, and none of its work existed
minutes later.

**Lost and rebuilt:** the pin-ceiling cases, the `useCan` component matrix
(BSN-04-001), and the `agentPulse` query-key factory — whose loss was silent
except for one `tsc` error, because the hook passed a scope argument to a
factory that had reverted to taking none. Had that gone unnoticed, the scope
would have vanished from the key array and no scoped Pulse entry could ever be
invalidated.
**Lost and NOT rebuilt:** BSN-02-014's continuation control, which is reopened
with the incident recorded against it rather than left ticked.

Everything verified was then committed as `7f178e318`, by explicit pathspec so
no other session's files were swept in. **The lesson is in the ordering:**
uncommitted work in a shared tree is not durable, and a passing test run proves
nothing about a file that no longer exists.

**Residual limitations.** Four migrations remain unapplied; no database, no
browser, and no named disposable environment exists on this machine. Nothing
below the implementation layer has been verified against a running system.

### 2026-09-19 — partial delivery, no parent PRD closed

Revision pair: frontend `fb03f49f8` / backend `84394b5fa`.

Seventeen child TODOs are checked across BSN-01, BSN-03 and BSN-04; each PRD's Evidence
Log carries its anchors. **No parent checkbox is ticked**, because no PRD has all of its
required children checked.

Verification actually run:

| Check | Result |
|---|---|
| Frontend focused tests | 356 of 357 pass |
| New backend spec | 5 of 5 pass |
| Frontend `tsc --noEmit` | 0 errors in changed files |
| Backend `tsc -p tsconfig.build.json` | 0 errors in changed files |
| `eslint` on changed areas | 0 errors |
| `madge --circular` | clean |
| `check:feature-cycles` | PASS, 4,688 resolved imports |
| `check:route-access-contract` | PASS, 210 keys |
| `check:permission-binding` | 36 findings, **0 Build** (pre-existing HR) |
| `check:file-sizes` | no Build nav file over 500 |

Two failures are **not** from this work and were left alone: the single frontend test
failure names `features/wiki/components/import-history-section.tsx`, an untracked file
another session created during this run; the backend type errors are in
`build-due-sweep.service.ts` and `build-entity-reads.service.ts`, both modified by
another lane and neither touched here. Both repos were being edited concurrently
throughout, so every result above is scoped to changed files rather than claimed
tree-wide.

**Not run at all:** browser journeys at 375 / 768 / 1280, WCAG contrast, screen-reader
states, the 120×120×120 enterprise fixture, `pnpm db:check-read-budgets:build` (needs a
named disposable environment), and a production `next build`.

### 2026-09-19 (second pass) — write path repaired, 44 of 170 children closed

Per-PRD: BSN-01 10/43 · BSN-02 10/43 · BSN-03 14/41 · BSN-04 10/43 · BSN-05 0/72 (superseded by the third pass below).
**No parent checkbox is ticked.** Seven items ticked in the first pass were
**reverted** on review because they bundled destinations that were not delivered —
over-ticking a bundled item is the exact failure this tracker's Completion Protocol
is written to prevent.

Shipped this pass: the PM-workspace write path (three create paths now accept a
validated, org-scoped, non-archived workspace), scope filters on managed products /
teams / projects, server-backed search on all three scope types, a bounded
resolve-by-id contract with stars **and** recents reconciled and pruned through it,
the Quick Create matrix with real preselection, a Build-scoped inbox count, the
unsaved-work guard on scope switching, and a nav↔route drift gate that immediately
caught the Feedback key defect BSN-04-002 names.

Verification: backend `src/modules/build` **152 suites / 795 tests, all green**;
frontend **832 of 839** pass. Three frontend suites fail and **none is this work** —
`shell-keyboard` (proved pre-existing by re-running with the edit stashed out),
`no-private-permission-key-parsers` (`route-access.ts:49`, an unmodified file), and
`denial-is-not-emptiness` (three files another lane committed mid-session). Both
repos were edited by other sessions throughout; one of them committed this work as
`f9dfc7839` while it was in flight, and the backend repo currently carries four
`UU` merge-conflicted files belonging to another lane — including
`turnstile.service.ts`, whose live conflict markers break a whole-repo backend
typecheck. None were touched here.

Named file-size exception: `features/build/navigation/build-scope-browser.tsx` is
306 lines — over the 300 soft ratchet, under the 500 hard ceiling — owned by this
lane, carrying the selector's search, hierarchy, stars and recents rendering.

### 2026-09-19 (fourth pass) — implementation lane advanced, still no parent PRD

Twelve parallel lanes with enforced disjoint file ownership. **No parent checkbox is
ticked**: every one of the 44 acceptance checks and all 72 BSN-05 release checks still
needs browser or named-environment evidence that this machine cannot currently produce.

Verification actually run:

| Check | Result |
|---|---|
| Backend `modules/build` + `modules/goals` | **165 suites / 906 tests, all green** |
| Backend `modules/feedbucket` | 15 suites / 89 tests |
| Frontend Build surfaces | 145 of 148 suites pass |
| `check:feature-cycles` | PASS — 4,832 resolved imports, so not vacuous |
| `check:route-access-contract` | PASS — 218 keys |
| `check:file-sizes` | no lane-owned file over 500 (largest 400) |
| Backend `tsc -p tsconfig.build.json` | 0 errors in changed files |
| `eslint` on changed areas | 0 errors |

Three frontend failures, **none of them this work**, each attributed by evidence rather
than assertion: `shell-keyboard` (pre-existing); `no-private-permission-key-parsers`
(names `route-access.ts:49` — `git log` shows last change 2026-09-15, and the tree is
clean for it, so it is not the `route-access-extensions.ts` edit this pass made); and
`denial-is-not-emptiness` (names `features/wiki/.../import-history-section.tsx`,
committed today as `142b3b2e6` by a concurrent lane).

**The recorded blocker that turned out to be false.** Three documents carried
"managed-product Feedback has no scope dimension in the backend (Feedbucket filters by
`widgetId` only)". That was true of the *query* and never of the *schema*:
`db/schema/build/feedback.ts` already declares `feedbucketWidgets.managedProductId`, a
composite FK `fk_feedbucket_widgets_org_product`, and — decisively — a partial index
`idx_feedbucket_widgets_managed_product` on `(org_id, managed_product_id)`. An index
existed for exactly this query. `GET /feedbucket/submissions` now accepts
`managedProductId` through a projected non-correlated widget subquery with the tenant
clause bound first, so that index serves it; the negative gate proves the predicate is
absent when the filter is not supplied.

**Defects found and repaired while verifying** (none were on the TODO list):

- An **authorization guard that did not bite**: a lane made `callerMembershipId`
  optional on `listManagedProducts`/`listTeams` so an existing spec would not break,
  so any caller omitting it skipped `assertMemberOfWorkspace` entirely — and two tests
  pinned that skip as correct. Every non-controller caller was a spec. The parameter is
  now required and those two tests assert the opposite: the guard runs even for a caller
  with a null membership.
- The product Overview shipped a card reading **"Roadmap not yet available for this
  product"** while roadmap supported `managedProductId` in schema, service and a passing
  spec — a lane had read a stale state while another lane added the filter. Same for
  goals. Both now render real product-scoped data.
- The first repair of that page rendered the goal count as `items.length`, and the goals
  list defaults to `limit: 20` — a product with 500 goals would have displayed "20".
  `GET /goals` is offset-paginated and its `count()` uses the same filtered `WHERE`, so
  the stat now shows the server's true total.
- `teamListItemSchema` **omitted `pmWorkspaceId`** from the list contract and the
  `listTeams` projection did not select it, so a client could not tell which workspace a
  team belonged to.
- `lib/build/build-nav-model.test.ts` asserted Workload was view-parameterised
  (`?view=workload`); a concurrent lane had correctly moved it to a real `/workload`
  route. The stale block was rewritten, and the still-live view-parameterised branch of
  `isBuildDestinationActive` kept its coverage through a synthetic destination.
- `denial-is-not-emptiness.known.json` carried `managed-products-page.tsx` after that
  page was repaired; the stale entry was retired.

**Claims rejected rather than accepted:** that BSN-02-027's selector wiring needed a
browser — `build-scope-browser.tsx:58-60` passes `stars.replaceStarred` as `onPrune` and
lines 342-355 render `liveStarred`/`liveRecents`, so it is source-verified; and the
concurrent lane's browser-pass claim, annotated in Current Known Gaps above as
uncorroborated.

**Environment:** no database, no Docker, no `psql`, nothing listening on 5432/1500/3000,
and `D:\localstack` deleted. Every result above is mocked-Drizzle or jsdom. BSN-02-006
stays open — a migration is unverified until applied.

### 2026-09-19 (third pass) — 93 of 170 children closed, still no parent PRD

Per-PRD: BSN-01 16/43 · BSN-02 24/43 · BSN-03 26/41 · BSN-04 27/43 · BSN-05 0/72.
Counting only implementation TODOs the work is 93/126; **every one of the 44
acceptance checks remains open**, because each needs browser, screen-reader or
named-environment evidence that this session cannot produce.

Twelve parallel lanes ran with enforced file ownership. Verification: backend
`src/modules/build` + `src/modules/goals` + the two new Build security specs —
**165 suites / 915 tests, all green**. Frontend `lib/build features/build
hooks/api/build components/layout lib/rbac` — **1,057 pass / 6 fail across 3
suites, none of them this work**: `shell-keyboard` (4, pre-existing),
`no-private-permission-key-parsers` (names `route-access.ts:49`, an unmodified
file), and `denial-is-not-emptiness` (names `features/wiki/.../import-history-section.tsx`,
another lane). `check:feature-cycles` PASS (4,783 resolved imports, so not
vacuous); `madge --circular` clean; `check:route-access-contract` PASS (216 keys).
`check:file-sizes` names two files over 500 — `lib/api-client.ts` and
`hooks/api/response-contracts-chat.test.ts` — **neither modified by this work**.

The vestigial-workspace blocker recorded below is now **fully lifted**: roadmap
and goals both accept `pmWorkspaceId` and `managedProductId`, filtered through a
projected non-correlated project subquery with the tenant clause bound first.

**Defects found and repaired while verifying** (none were on the TODO list):

- `projects-query.service.ts` projected `managedProductId` but **not**
  `pmWorkspaceId`, and the omission was mirrored in the backend `@ResponseSchema`,
  the frontend Zod contract, and a hand-written parallel `ProjectListItem`
  interface. A standalone project therefore had no workspace to nest under.
  Repaired at all four links; `projects-list-workspace-projection.spec.ts` pins it,
  including that a **missing** field throws rather than being silently dropped.
- The resolve response gained `parentPath` and `clientPortalEnabled` while the
  frontend contract omitted both, so Zod silently stripped them and the stale
  stored path kept winning. Reconciliation also only wrote back when the entry
  *count* changed, so a rename or move was never persisted.
- `useUpdatePmWorkspace` / `useUpdateManagedProduct` invalidated the unfiltered
  list prefix, refetching every search, status and cursor variant — at least four
  refetches per rename. Both now patch the response into the detail entry and into
  each loaded list page that holds the row.
- The pin-prune guard used "zero authorized tools" as a proxy for "access has not
  loaded", so a user who lost **every** Build tool kept every stale pin forever.
- `my-work-page.tsx` rendered denial as emptiness: `useAllWork` is gated on
  `build:tickets:view`, so an unauthorised actor saw "no work" rather than a denied
  state. A second ledger entry (`project-customers-page.tsx`) was stale and retired.
- A transient 2-argument call to the 4-argument `resolveScopeDirectory` was caught
  mid-flight by the isolation audit and is corrected.

**BSN-02-006 is authored but NOT ticked.** `1122_build_workspace_scope_indexes.sql`
adds both partial `(org_id, pm_workspace_id)` indexes and is registered at idx 1010;
`migration-integrity` passes. It has **not been applied to any database**, and this
repo's rule is that a migration is unverified until applied. Writing it also proved
the DDL recorded in the previous pass was wrong three ways — it used `CREATE INDEX
CONCURRENTLY` (illegal inside the transaction `db:migrate` wraps each file in),
omitted the `build` schema qualification, and set no `lock_timeout`.

**Known-false claims rejected from lane reports rather than accepted:** that
organization switching is covered because `QueryProvider` remounts (remounting
*destroys* unsaved work silently — BSN-04-014 stays open); and that BSN-03-043 is
done when the confidence/proposed-change data does not exist in the schema.

**Environment hazards unchanged:** the backend repo now carries **five** `UU`
merge-conflicted files from other lanes (including `turnstile.service.ts`), whose
live markers break a whole-repo backend typecheck. 19 failures in
`backend/test/security` belong to `billing/platform-promotions`, `hr:requisitions`
and `notifications/notification-retention` — all other lanes. Notably the BOLA
unbound-route ratchet did **not** flag the new `agent-pulse` or `scope-directory`
routes, so those are bound at the data layer.

### 2026-09-19 (browser follow-up) — partial responsive evidence, no sign-off

One authenticated project journey ran at 1280, 768, and 375 CSS pixels. It
verified expanded and collapsed desktop navigation, tablet navigation, five
mobile stable actions with the remaining tools in the drawer, scope search,
Arrow Up/Down, Escape dismissal with focus restoration, collapsed accessible
names, and the Workload route. The measured mobile bottom-navigation controls
were 75 by 64 CSS pixels.

This is partial evidence only: the run used one persona, did not exercise mobile
scope switching, Enter/Left/Right hierarchy behavior, screen-reader output,
contrast, or the complete touch-target inventory. Reduced-motion emulation
exposed active 150 ms transitions. The implementation was repaired in
`globals.css`, Build navigation, shared sidebar/mobile navigation, and overlay
primitives; focused Jest verification after the repair is **61/61 passing** with
zero ESLint errors (five pre-existing warnings). The full frontend type-check
remains open: `next typegen` succeeded, then TypeScript failed on a missing,
unrelated generated route for `/knowledge/wiki/settings`. BSN-02-030/033/034
and BSN-05-035..041 therefore remain open pending the missing journeys and a
browser re-run of reduced-motion mode.

### The blocker the tracker did not anticipate

The PM-workspace scope dimension is **vestigial**, not merely unfiltered. No create path
accepts a `pmWorkspaceId`, so every project, team and managed product in an organization
lands in the same default workspace. Twelve of the requested destinations depend on
filters over that dimension. Until BSN-01-010..019 repairs the write paths, workspace-
and product-scoped navigation cannot be honest, and the current minimal workspace and
product catalogs — Overview plus All work, and Overview only — are the PRD-compliant
state rather than a gap to be closed by adding links.
