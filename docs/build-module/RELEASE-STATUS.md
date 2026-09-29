# Build Module Release Status

**Updated:** 2026-09-27 (architecture audit; older execution evidence retains its original date)
**Authority:** This is the single release-status document for the Build module. Product contracts remain in the numbered specifications; future competitive work remains in `06-prioritized-backlog.md`.

**2026-09-27 architecture-audit qualification:** The phase table and test/migration results below
are historical release observations, not a current all-requirements completion verdict. The two
2026-09-26 architecture reviews produced the remediation backlog in `tickets/`; see
`tickets/ARCHITECTURE-VERIFICATION-2026-09-27.md` for current code/test evidence and reopened
criteria. In particular, parent-route smoke checks do not close concurrency, authorization,
schema-replay, full workflow or scale requirements. Do not report any phase as 100% from this table.

This document tracks the current production-release checklist, not total Build
product completion. The full normative PRD remains open: the current source
tree contains 39 checked and 619 unchecked acceptance boxes across the Build
module and sidebar PRDs (658 total, counted directly from the current PRD tree). Do not report this release checklist as full PRD
completion; use `docs/specs/build/module/README.md` and its child PRDs for the
complete product definition of done.

## Two findings from 2026-09-29 that no lane in this checkout can close — READ THESE FIRST

Both were found by reading code, both are release-relevant, and neither can be settled from this
machine. They are recorded here rather than inside a checkbox because a reader who only skims the
box list would not see them.

### FINDING 1 — `deleteProject` appears unable to succeed for any project that holds a ticket

This is not "may be unable". It is a static chain with no branch that avoids it, and it means
project restore is reachable only for empty projects. **It still needs a DB-enabled lane to confirm
the constraint is live on a real database**, which is the one step this checkout may not take.

| Link | Evidence |
|---|---|
| The FK has no `ON DELETE` | `backend/migrations/0146_status_model_single_table.sql:41-47` — `ALTER TABLE tickets ADD CONSTRAINT fk_tickets_status FOREIGN KEY (org_id, project_id, status) REFERENCES project_statuses (org_id, project_id, name) ON UPDATE CASCADE NOT VALID;` then `VALIDATE CONSTRAINT` at `:47`. No `ON DELETE` clause, so Postgres defaults to `NO ACTION`; no `DEFERRABLE`, so it is checked at statement end, not at commit. |
| Independently confirmed, not inferred | `backend/migrations/meta/0464_snapshot.json` records `{"name": "fk_tickets_status", …, "onDelete": "no action", "onUpdate": "cascade"}`. |
| Still live at HEAD | `backend/src/db/schema/build/ticket-core.ts:100-104` declares the same `foreignKey({name: "fk_tickets_status", …}).onUpdate("cascade")` with no `.onDelete(...)`. No migration ever drops it — `grep -rln fk_tickets_status migrations/` returns only 0146. |
| The delete soft-deletes the children then hard-deletes the parent | `backend/src/modules/build/core/project-crud/projects-write.service.ts:271-334`, one transaction: `:310-313` `update(tickets).set({deletedAt: now})` — rows and their `status` values stay — then `:322-329` `tx.delete(projectStatuses)`, the FK parent. |
| Every surviving ticket still points at a parent | `ticket-core.ts:37` is `status: text("status").notNull().default("TODO")`. **NOT NULL**, and the constraint was VALIDATEd, so every live-or-soft-deleted ticket row has a `project_statuses` parent, and `:322-329` deletes exactly those parents while the children are present. |
| Nothing prevents it | No ticket hard-delete on this path (the only `tickets` write is the soft update). No `status` nulling — impossible, the column is NOT NULL. No deferred constraint. No `ON DELETE SET NULL` or `CASCADE` anywhere on this constraint. |
| How it would surface | `backend/src/common/http/all-exceptions.filter.ts:124-128` maps `23503` to `400` / `VALIDATION_FAILED` / `"Validation failed."`. So `DELETE /build/:projectId` (`projects-by-id.controller.ts:72`) would return **400 "Validation failed."** for any non-empty project — not a 500, and never a success. |
| Why no test catches it | `projects-write-tenant-isolation.spec.ts:27-38` is the only delete happy path and its `tx` is a hand-rolled jest mock (`:29-34`, `delete: jest.fn().mockReturnValue({where: jest.fn().mockResolvedValue([])})`). No FK enforcement, so `:37 resolves.not.toThrow()` passes vacuously. This is the "specs that agree with the bug" shape. |

**Consequence for restore.** `restoreProject` requires `project.deletedAt` to be non-null
(`projects-restore.service.ts:47`), and `deleteProject` is the only writer of that column on this
path. So **`POST /build/:projectId/restore` is reachable only for projects that had zero tickets.**

**A SECOND, SEPARATE DEFECT FOUND IN THE SAME READ: even for an empty project, restore is lossy.**
`deleteProject` hard-deletes `projectMembers` (`:314-321`), `projectStatuses` (`:322-329`),
`ticketAssignees`, `ticketAttachments`, `ticketLabelMappings` and `timesheets` (`:298-309`).
`restoreProject` (`projects-restore.service.ts:69-121`) restores only `projects`, `tickets` and
`ticketComments`. A restored project comes back with no statuses and no members. That is the other
side of the same design problem and it does not need a database to see.

**WHAT A DB-ENABLED LANE MUST DO:** on a non-production database, confirm `fk_tickets_status` exists
with `confdeltype = 'a'` (NO ACTION) and `convalidated = true`, then attempt
`DELETE /build/:projectId` against a project holding one ticket, in a rolled-back transaction as the
application role. If it raises 23503, the fix is a decision about the delete's order of operations,
not a schema patch.

### FINDING 2 — thirteen routes that landed today are absent from the vendored contract, so the frontend cannot call any of them

`openapi:generate` was banned in every lane today, and the vendored contract was last regenerated
**2026-09-28 18:57:55** (`frontend/contracts/openapi.json`, commit `cf34aace0`, `chore(api): vendor
the republished contract`; byte-identical to `streamlineos-backend/openapi.json` at `da5eacbe9c`,
sha256 `89ef110d…`). The file records no generation timestamp of its own — its `info.version` is the
static string `"1.0"`. **Every route below landed 2026-09-29, after that vendoring.**

Absent from `frontend/contracts/openapi.json`, confirmed by grepping each literal path and
cross-checked by a JSON pass over all 3,075 paths (the only `restore` paths present belong to
inventory, kb, organizations and users; the only `retention` paths are the settings pair plus
fourteen unrelated `/cron/*-retention-*` sweeps):

- H1's four restore routes — `POST /build/{projectId}/restore`, `POST /build/templates/{templateId}/restore`, `POST /build/{projectId}/tickets/{ticketId}/restore`, `POST /build/{projectId}/tickets/{ticketId}/comments/{commentId}/restore`.
- H2's eight restore routes, for `roadmap_items`, `feedback_posts`, `project_releases`, `test_suites`, `test_cases`, `test_runs`, `project_milestones` and `project_whiteboards`.
- J's retention purge route, `GET` **and** `POST /cron/build-project-retention-purge` (`cron-build-project-retention.controller.ts:31`, `:41`).

**THE FRONTEND CANNOT CALL ANY OF THEM UNTIL THE CONTRACT IS REGENERATED.** The permission keys are
in place on both sides — `build:restore` and `build:tickets:restore` (frontend `64378742c`) and
H2's five (frontend `879ead178`), each in the `PermissionKey` union, the runtime catalog and
`frontend/contracts/permission-catalog.json` — so `useCan` answers them and the role editor can
grant them. What is missing is the operation, not the permission.

**AND THE TWO CHEAP GATES ARE STRUCTURALLY BLIND TO THIS, which is why nothing went red.**

- `frontend/scripts/check-contract-vendor.mjs` — **green, and run this lane.** It compares SHA-256 of the vendored copy against the backend artifact. Both are equally stale, so it cannot see the gap by construction.
- `backend/src/scripts/check-api-contract-registry.mjs` — fail-closed "every operation must be classified", but it enumerates operations *from* `openapi.json`. An operation missing from the document is invisible to it: vacuously green.
- `backend/src/scripts/check-openapi-fresh.ts` (`pnpm openapi:check`) — **this is the gate that bites, and it is red.** `diffArtifacts()` (`:28-42`) indexes `METHOD path` from the committed document against a freshly generated one; the routes above would come back as `added` and it would fail. It was **not run**, because its line 4 imports `generateOpenApiJson` — it *is* `openapi:generate`, and it boots Nest. So this is a static verdict on the gate, not an execution of it.

**WHAT CLOSES IT:** one `pnpm openapi:generate` in the backend, a copy into
`frontend/contracts/openapi.json`, and `pnpm check:contract-vendor` green afterwards. Until then
`check:contract-vendor` will keep reporting success over a contract that is a day behind the routes.

### A third thing, smaller but operationally urgent

**J's retention purge is armed to destroy automatically on the next backend deploy, and its indexes
are not applied.** `src/modules/cron/cron-retention-scheduler.service.ts:104` registers
`["build-project-retention-purge", () => buildProjectRetention.sweep({ confirm: true })]` — the
scheduler is the one caller that passes `confirm: true`; the HTTP route stays a dry run without
`?confirm=destroy`. It arms in `onModuleInit` (`:115-127`) and is on unless `NODE_ENV === "test"` or
`RETENTION_SCHEDULER_ENABLED === "false"` (`:144-145`). So "never executed" is true of every
database today and stops being true one day after the next deploy, while migration `1540` — the two
partial indexes its selection depends on — is apply-pending. Whoever deploys next should decide
`RETENTION_SCHEDULER_ENABLED` before the deploy, not after. The full clause-by-clause verification
of the purge is in [`99-kill-list.md`](./99-kill-list.md) under the product-copy box.

## Checkout reconciliation

The top-level frontend repository and nested backend repository are both on `main`
and pushed to their configured remotes. The current Build fixes are frontend
`1cd642429` and backend `5f6c91db8`. The backend working tree still contains
unrelated uncommitted changes in `migrations/meta/_journal.json` and
`test/helpers/e2e-app.ts`; they were preserved and are not part of the Build fix.
Treat a commit as deployed only after the deployment identity is read from the
running service. Older commit hashes elsewhere in this document are retained as
historical evidence for the release they describe and do not prove that the current
checkout is deployed.

## Current verified delta

### 2026-09-28 six-lane remediation pass

Measured on the merge pushed to both `origin/main` (frontend `70ec2ec8f` onward, backend `3fc00e56e` onward).

- Page-specification implementation boxes earned this pass: `10-managed-products-product`, `10-managed-products-product-goals`, `10-roadmap`, `10-project-milestones`, `10-project-releases`, `10-project-cycles`, `10-project-tickets-issue`, `10-project-epics`, `10-project-workload`, `10-project-settings-integrations-webhooks`. Still open: `10-command-center` on the `view` parameter and `10-project-issues` on writing a board cursor to the URL, both with dated adjudications naming the missing subject; `10-project-wiki` and `10-project-wiki-page` remain peer-owned.
- Architecture tickets closed: 14 (the BE-81 union, mutation-checked), 25 (deep `core/tickets/` reaches 13 to 0 via the `core/lib/` move), 50's file-size criterion. Ticket 44 box 1 and ticket 54's criterion are adjudicated unearnable as written, with reasons in their tickets.
- Whole-repository typechecks: frontend `pnpm type-check` exits 0, backend `pnpm typecheck` exits 0. `pnpm type-check:specs` improves from 85 errors to 58 with no file newly broken; the residue is out-of-lane.
- Test matrices: frontend 388 suites / 4,129 tests pass across `features/build`, `hooks/api/build`, `lib/query-keys` and `components/ui/data-table`; backend 276 suites / 2,624 tests pass across `src/modules/build`.
- Static gates green: `check:route-access-contract`, `check:feature-cycles`, `check:pm-workspace-removal`, `check:build-list-surface`, `check:permission-catalog`, `check:retired-vocabulary`, `check:contract-vendor`. `check:file-sizes` remains red repo-wide and improves from 56 over-500 files to 49; no Build list-surface batch path remains on it.
- The contract was republished and vendored: 3,075 paths before and after, so no route was added or retired. `check:contract-drift` and `check:contract-parity` report identical findings before and after the vendoring.
- No migration was authored this pass, so the journal is unchanged at 1,025 entries with no duplicate `idx` and no journalled tag lacking a file.
- Defects fixed that no acceptance box asked for: a soft-deleted project's live tickets still sent due-soon and overdue notifications; `isProjectMember` authorised creating a ticket inside a soft-deleted project; a pending approval on a deleted project was still decidable; the releases page bulk strip published several releases per click with no confirmation; the issues row menu hard-deleted a ticket with its comments, attachments, assignees, worklogs and relations; `queryKeys.projects.clientPortal.visibility` padded with `null`, so no uncursored invalidation matched a cursored key; `capability-decision-regression.spec.ts` had been throwing `ENOENT` over twelve production files and asserting nothing; the FE-127 aggregate-import gate walked only `features/build`, hiding 47 violations elsewhere.

- The production migration source-hash audit reports `pendingCount=0`, `watermarkAhead=false`, and no duplicate ledger rows. Twenty-one historical ledger rows have hashes not represented by the current migration journal; they remain an open ledger-reconciliation item and were not deleted.
- Local browser verification on `http://localhost:1000/build/command-center` confirmed the Command Center remains usable when the projects request fails and auxiliary risks/releases requests return validation errors; those panels show local error states instead of replacing the whole route.
- The live backend still returned the pre-fix `projectId=NaN` response during this browser pass, so the backend route fix is pushed but deployment identity and rollout completion remain unverified.

### 2026-09-29 documentation reconciliation pass

Documentation only — no production code was changed in this repository by this pass. Scope: the
checkbox state of every file under `docs/build-module/`.

- **Boxes ticked this pass: 0.** Every open box was read against its evidence and none was earnable
  from this checkout. The boxes that are close each name an instrument this machine cannot supply: a
  browser session, a non-production authenticated tenant, a non-production database, or a Redis that
  is not the production Upstash instance in `backend/.env`. Inventing a tick for any of them would
  have been a fabrication, so none was added.
- **Boxes waived out of scope: 166.** Tarun waived browser verification for this pass, so these are marked **OUT OF SCOPE — browser verification** and are not release blockers. They run across the 83 page specifications and `LANE-5-STATUS.md`
  — 80 production-browser-evidence boxes, 72 keyboard/screen-reader/reduced-motion/375 px/high-density
  boxes, and 14 of the same plus secret-redaction.
  157 of the 166 sit where every non-browser criterion on the page is ticked; the other 9 say instead
  that a non-browser box above them is still open.
- **Boxes left open: 40**, each now carrying one dated 2026-09-29 statement of why and what would
  earn it, above the measured evidence, which was kept. They split:
  - **(a) browser- or measurement-pending — 12.** The five browser ones are covered by the same waiver as the 166 above, leaving **7 that need an instrument no waiver can supply**. Needs a browser: `01-ia-navigation.md` nav
    equivalence, `04-shared-components.md` focus/responsive, `tickets/55` gallery reachability,
    `tickets/ARCHITECTURE-VERIFICATION-2026-09-27.md` release proof, and this file's desktop/mobile
    matrix. Needs a non-production database: `02-schemas.md` composite indexes,
    `05-performance-caching.md` skeleton budgets, `performance-followup/cache-policy.md` stale-data
    bound, `tickets/REVIEW-POINT-COVERAGE.md` approvals index, and the `P1: scalable reads`
    measured-plans qualifier. Needs a non-production Redis: `cache-policy.md` server invalidation.
    Needs a deployed-commit probe: this file's deployment-status box.
  - **(b) blocked on Tarun's decision — 5.** The `99-open-questions.md` process gate (PR-template
    checkbox versus reviewer awareness); the `10-command-center.md` `view` parameter (does the command
    center get a second layout at all); the two `99-kill-list.md` copy findings (wire
    `ClientVisibilityPage` into a route, or withdraw the retention copy that promises a deletion
    nothing performs); making the concurrency token required on the rank route
    (`tickets/REVIEW-POINT-COVERAGE.md` stage two); and the signed-URL TTL choice in
    `05-performance-caching.md`, which depends on open question 10. Neither side of any of the five
    was implemented. One further *item* — writing a board `cursor` into the URL on
    `10-project-issues.md`, which changes that board's paging model — is also Tarun's, but it sits
    inside a box counted under (c).
  - **(c) genuinely unfinished product work — 23.** Three Build reads classified `ACTIONABLE` plus one
    bare `.limit(100)` array on `GET /build/:projectId/automations` — `03-api-contracts.md` owns those
    figures and `05-performance-caching.md` points at it, 2 boxes. Seven `Sheet` escalations with no
    FE-110 clause (`04-shared-components.md`). A missing soft-delete filter in `listRelations`
    (`02-schemas.md`). Thirty live Build compatibility redirects, and two parallel survivals
    (`99-kill-list.md`, 2 boxes). Named per-item remainders on `10-project-wiki`,
    `10-project-wiki-page`, `10-project-issues` and `LANE-5-STATUS` SPEC 1 (4 boxes). Five rollup
    boxes in `tickets/ARCHITECTURE-VERIFICATION-2026-09-27.md` — `P0` on bulk's missing two effect
    families, `P1: repair` and `P2` on unre-measured qualifiers, `P1: honest gates` on the census
    baseline still scoped by count rather than identity, and the all-68 box. Bulk's 2-effect gap in
    `tickets/REVIEW-POINT-COVERAGE.md`. Plus seven ticket boxes that are permanent N/A or
    deliberately-false by design (11, 16, 38, 44, 50, 51, 54) and cannot tick without reverting the
    fix that made them false.
- **Total across the pack: 1,078 earned of 1,284 boxes** (206 open), counted over every `- [ ]` and
  `- [x]` under `docs/build-module/**`. With browser verification waived, the in-scope remainder is
  **40 open boxes, of which 5 are Tarun decisions and 23 are unfinished product work** — the other 166
  are out of scope, not outstanding.

Counts elsewhere that this pass falsifies:

- **The 68-ticket rollup was stale.** `tickets/ARCHITECTURE-VERIFICATION-2026-09-27.md` recorded "11
  tickets hold 16 unchecked boxes between them" on 2026-09-28. Re-counted today: **60 of 68 tickets
  are at zero open boxes and 8 hold exactly one each** (11, 16, 38, 44, 50, 51, 54, 55). The
  `P1: scalable reads` and `P2: controlled reuse/restructure` boxes each named a ticket-count blocker
  that has since closed — ticket 14, and tickets 25 and 27 — so both now stay open on their own
  qualifiers rather than on a count. Corrected in place in that file.
- **The rank effect gap closed after the six-lane pass was written.** Backend `460706ebd` (today) gave
  `RankTicketEffectDeps` an `activity` and a `dispatch` member, so a drag to Done does write an
  activity row and does notify. `BulkTicketEffectDeps` still declares only `webhooksDispatch` and
  `automationRunner`. The `P0` box and ticket 44 said this of both routes; both are corrected.
- **The journal figure above and the § Production migrations figure disagree, and both were right when
  written.** `backend/migrations/meta/_journal.json` holds **1,025 entries** today, with 0 duplicate
  `idx` and 0 journalled tags lacking a file (re-counted today, file read only, no database). §
  Production migrations records a production ledger reading of 1,019 journal entries at watermark
  `1803093634725`; the journal's max `when` is now `1803093640725`, so **six entries post-date that
  reading**. `pendingCount=0` was true of that reading and is not re-verifiable from here.


## Scope

- The authenticated route manifest contains 75 canonical Build pages, all marked `KEEP`.
- The complete Build route census contains 84 routes: 75 authenticated pages and nine portal/public collaboration routes.
- The normative route-count prose is reconciled to that generated census; the older 93/84 figures were stale authored counts, not additional live pages.
- PM Workspace is retired from the UI, API, contracts, permissions, routes, source tree, and production database. Organization is the tenancy boundary; products and projects are the working scopes.
- `/build/[projectId]/intake`, `/forms`, and `/triage` remain separate canonical jobs.

## Seven-phase position

| Phase | Current state | Evidence |
|---|---|---|
| 0. Baseline and control | Needs reconciliation | 2026-09-27 census check fails with 139 stale anchors; historical manifests/status evidence must be reconciled to the current checkout. |
| 1. Data and security foundation | Partially verified | The current production migration source-hash audit has zero pending journal rows, but 21 historical unknown ledger rows remain and the architecture tickets 29/30/36/62-66 remain open or partial. |
| 2. Core daily workflow | Partially verified | Implementations exist, but filtered-count refresh, assignee pagination, required concurrency tokens and invalid-cursor handling remain incomplete in architecture tickets 05/09/11-13/67. |
| 3. Planning and product management | Partially verified | Earlier parent-route smoke evidence remains historical. Roadmap timestamp cursors, report invalidation and velocity infinite-query typing/pagination remain open in tickets 04/19/33. |
| 4. Collaboration and external workflows | Partially verified | Earlier route smoke checks do not close the missing approval picker types or portal parent-visibility checks in tickets 06/35. Browser workflow re-verification remains required after fixes. |
| 5. Execution and governance | Partially verified | Shared writer/version/effect invariants, status-group contracts and database constraints remain open in tickets 36-45/62-66; one focused cycle lifecycle test fails. |
| 6. Performance and UX hardening | Partially verified | Fresh build `egn5C-y4teNVJ5D_PFOui` measured all 13 declared route bundles with zero pending measurements and confirmed seven first-load JS breaches, including `/build/inbox` at 610,731 bytes and `/build/my-work` at 645,663 bytes against the 524,288-byte ceiling. Chromium responsive UI coverage passed 31/31 gallery checks at 375px, 768px, and 1280px; the latest rerun is hydration-clean after the SearchInput boundary fix. |
| 7. Release verification | Partially verified | Authenticated production smoke passed for the ticket-detail route observed in this audit. The current source-hash audit has zero pending rows but still has 21 historical unknown ledger rows; current deployment identity and the full browser matrix remain open. |

The previously completed phase labels were reopened using the 2026-09-27 architecture evidence.
Neither that review nor the historical smoke checks certify full phase completion. Future P1/P2
product investments remain listed in `06-prioritized-backlog.md` in addition to the corrective work.

## Backend and authorization

- Backend release commit `b5a2553c1` is contained in backend `origin/main`; the health endpoint responds 200 at `https://api.streamlineos.in/health`. The latest analytics, project-bound workflow-read, bounded ticket-detail relation, checklist-item read, malformed ticket-filter, bounded-search validation, filtered column-count, portfolio-search, malformed collection-cursor, tenant-scoped goal-owner projection, and authorization-evidence refresh fixes are pushed and await the normal deployment rollout.
- The current authorization census covers 49 controllers and 325 handlers:
  - `VULNERABLE=0`
  - `NEEDS-REVIEW=0`
  - `CLOSED=42`
  - `VERIFIED=283`
- The generated Markdown and JSON census artifacts in the backend `docs/build-module/` match the current local backend Build source; remote deployment parity remains open.
- The Build backend matrix passed 231 suites and 2,301 tests after refreshing authorization evidence and cursor-pagination expectations. Backend typecheck, build, permission-key validation, route-budget self-test, feature-cycle scan, and migration-discipline checks remain separately tracked.
- Fresh P1-4 handoff verification passed 4 focused suites and 48 tests across quote lifecycle, quote tenant isolation, signed-envelope completion, and deal-linked project provisioning. The authenticated browser handoff remains open because this environment has no configured E2E tenant/session fixture.

## Production migrations

- The production ledger was queried through the backend IAM-aware migration client on 2026-09-25.
- Migration `1197_build_cycle_permissions.sql` is applied on production RDS; its journal hash is present exactly once. The live ledger check on 2026-09-25 reported 967 applied rows against 967 journal entries and zero pending migrations, but failed the integrity gate on five unrelated orphaned HR rows (`1187`–`1191`) below the watermark.
- Build migration `1204_build_feedback_account_snapshots.sql` is applied to production RDS; `build.feedback_posts.account_tier_snapshot`, its tenant-scoped partial index, and the exact journal hash were read back after commit.
- Production-shaped Build read-cost verification is now IAM-aware and green on 2026-09-26: `db:check-read-budgets:build` measured all 6 declared Build budgets with 100% non-empty coverage and 0 failures; `db:check-build-reads` also passed, with high-selectivity sequential scans reported as warnings rather than index defects.
- Build deal-to-project provisioning now returns the existing organization-scoped project for a CRM deal on retry; backend commit `ad0044c83` and its focused tenant-isolation suite prevent duplicate project creation. Quote detail now exposes project and invoice destinations, and project-scoped My Time now filters entries and defaults the log-time sheet from `?projectId=`. Authenticated browser evidence for the quote actions and the full quote-to-sign-to-time-to-invoice-to-payment handoff remains open under P1-4.
- Production contains canonical `build:cycles:view` and `build:cycles:manage` permissions, and the legacy sprint permission rows are absent.
- The general migration runner reports a large mixed-module backlog because production is not at the current repository journal state. It was not replayed; unrelated HR, CRM, billing, and platform migrations were deliberately left untouched.
- Canonical Build search migrations are:
  - `1185_roadmap_search_id_probe`
  - `1186_project_programs_list_indexes`
- Production originally recorded the same migration bytes under historical names `1177` and `1178`; their hashes match the canonical files.
- Snapshot `streamlineos-pre-build-1177-1178-20260924-1` was available before application.
- All 11 expected indexes and both search functions exist. Both functions are `SECURITY DEFINER`, executable by `streamline_app`, and tenant-scoped through `app.current_org_id()`.
- The production cross-tenant probe returned zero rows.

## Frontend verification

### Local browser verification, 2026-09-27

The authenticated frontend was exercised on local port `1000` with isolated browser tabs across all 68 canonical `/build*` routes in the generated Build route snapshot, including project, organization, settings, product, portfolio, team, and dynamic detail routes. The sweep rendered each route shell and captured zero browser error logs after fixing the optional activity fallback, legacy array responses for members, saved views, milestones, and releases, managed-product not-found normalization, and project-member page consumers. Dynamic records without fixtures rendered their recoverable shells without data mutation. This is route-shell smoke evidence only; it does not close the full 83-route portal/public matrix, state-matrix, mobile, production-deployment, or migration gates below.

Current release-candidate checks:

- `pnpm type-check`: pass.
- `pnpm type-check:specs`: pass.
- `pnpm build`: pass; all 482 application routes completed production compilation and page generation.
- The canonical Windows `pnpm build` invocation now uses Node's cross-platform memory flag in frontend commit `c2ae44ac4`; it completed successfully with all 482 generated pages after the script fix.
- Focused affected-surface matrix: 15 suites, 192 tests passed.
- Build-only Jest matrix: 188 suites and 1,424 tests pass after aligning the portfolio detail assertion with the shared cursor paginator.
- Workflow assertion-cleanup matrix: nine suites, 94 tests passed.
- `check:pm-workspace-removal`: pass across source and built chunks.
- `check:gate-wiring`: pass; the PM Workspace-removal gate is now invoked by the frontend CI gates job.
- `check:route-access-contract`: pass.
- Build import/export command hooks are classified with their declared permissions; focused import/export suites pass 22/22 and `pnpm type-check:specs` passes after correcting the public Form, Intake, Roadmap, Updates, and Whiteboard test contracts. The remaining 23 `check:command-catalog` findings are outside Build.
- `check-build-execution-plan.mjs` and `frontend pnpm run check:prd-traceability` pass; the restored control plan is present and 103 owned acceptance checkboxes map to 10 criterion sections. These structural checks do not close the remaining product acceptance criteria.
- `check:feature-cycles`: pass across 46 features and 5,700 resolved imports.
- Focused ESLint: zero errors.
- A fresh frontend `pnpm run type-check` rerun on 2026-09-25 is currently red on concurrent Knowledge Base work, not Build code: `features/wiki/components/knowledge-analytics-page.tsx` has four `InfiniteData` narrowing errors plus two implicit-any errors, and `hooks/api/kb/analytics.ts` has a missing `KbGapRelatedPageRow` export and missing `queryKeys.gapRelatedPages`. Preserve those unrelated edits for their owning session; this is not current Build evidence.
- Fresh static gate rerun passed: route-access contract (215 permission keys), feature-cycle scan (46 features / 3,883 files), PM Workspace removal (1,989 source files / 3,641 chunks), route thinness (595 authenticated modules, zero in-scope thick), and permission binding (2,620 Build-relevant bindings with no Build-owned mismatch).
- Fresh production build `egn5C-y4teNVJ5D_PFOui` completed successfully with 483 generated pages and a green frontend typecheck. Its route-bundle measurement covered 13 routes with zero pending measurements and still reports seven first-load JS budget breaches; the gate fails with the breaches visible rather than treating them as inconclusive. Current Build values are `/build/inbox` 610,731 bytes and `/build/my-work` 645,663 bytes against the 524,288-byte default ceiling.
- Playwright `e2e/build-list-responsive.spec.ts`: 31/31 Chromium checks passed at 375px, 768px, and 1280px, covering overflow, focus return, filter drawers, pagination reachability, responsive cards/tables, loading, and empty states. The latest rerun is hydration-clean.
- `git diff --check`: pass.
- Latest frontend Build navigation, filtered board-count, malformed-filter normalization, portfolio-search, Command Center title consistency, retry-refresh, stale-detail recovery, expected missing-record telemetry, invalid project-id rejection, dirty-navigation protection, scope-switch stale-data fixes, project-scoped ticket-detail cache identity, cross-tab access/entitlement freshness hardening, and the All Work navigation typecheck fix are on `origin/main` at the current release commit:
  backlog, My Work, draft, and keyboard shortcut navigation now use the shared
  dirty-state guard; focused regressions pass.
- The Build view switcher now routes Calendar to the unified `/calendar` surface
  with `source=build` and `projectId`, and the local Build calendar renderer was
  removed. Direct `/build/:projectId/issues?view=calendar` links are normalized
  to the same canonical route; focused URL-state and view-render tests pass.
- The `/sprints` consolidation was completed without losing planning capability:
  canonical `/build/:projectId/cycles` now owns backlog-to-cycle planning,
  unfinished-ticket handling during completion, and the velocity panel. The
  removed sprint route remains absent; the restored cycle workflow passed 12
  cycles-page tests and local browser verification.
- Build programmatic navigation now passes through the dirty-state leave guard
  for user-triggered redirects across cycle detail, project lists, triage,
  feedback submissions, Gantt, and the restored board navigation paths. The
  focused guard matrix passes 47 tests.
- Build-owned browser test fixtures were split out of the scope-directory and
  scope-browser suites; both remain below the 500-line review gate. The current
  frontend release commits are `daa52469a`, `b6e5753e4`, and `8c4b7ed8a` on
  `origin/main`.
- Build-owned unsafe assertion findings: zero. The assertion gate still reports unrelated pre-existing Inventory, HR, Wiki, editor, and infrastructure debt.
- The Build status-contrast sweep is pushed in frontend commit `e9ee068e6`; the follow-up Kanban WIP badge coverage fix is pushed in `ca1d40463`. The current Build-owned token audit has 164 strong text-token usages and 46 remaining intentional icon-only/non-text usages. The focused accessibility matrix passes 9/9 tests, the Kanban and saved-view matrix passes 10/10 tests, and the full frontend type-check remains green.
- The project Saved Views settings page now uses the existing views API and mutation hooks with loading, empty, error, permission, create, rename, pin, delete, and navigation handling. Its focused page and saved-view suites pass 6/6 tests; local browser verification of `/build/6/settings/views` rendered the page and opened the Create View dialog with no console errors.
- Project layout regression coverage now verifies missing projects become the not-found boundary, forbidden projects become the access-denied boundary, and backend-unreachable responses become the recoverable unavailable state; the focused suite passes 5/5 tests.
- Two nested Build surfaces that could previously fall through to empty-looking content now resolve access explicitly before rendering: affected tickets on change requests and roadmap delivery progress. The denial audit reports no newly added Build-owned findings; focused change-request and roadmap state suites pass 17/17 tests.
- Project Workflow now resolves through the shared `PageState` boundary with an explicit `build:workflow:view` permission, preserving loading, empty, error, and ready states. Its focused state suite passes 3/3 tests, and local browser verification of `/build/6/settings/workflow` rendered statuses, WIP controls, and transitions with no console errors. URL-backed workflow filters and keyboard navigation remain open because this page is configuration, not a filterable work list.
- Workflow transitions and the organization-level All Work saved-view menu now independently refuse to render while their `build:workflow:view` or `build:view` access state is denied/loading; the focused Workflow and All Work suites pass 7/7, and both stale Build entries were removed from the denial exception ledger.
- Ticket detail checklists, relations, and watchers now resolve `build:tickets:view` explicitly before rendering loading, error, or empty content, so a denied ticket cannot appear empty; the focused ticket-detail suites pass 11/11 and the local browser verification of `/build/6/tickets/BQS-2` rendered all three surfaces without a visible runtime error.
- Project Automations now resolves `build:view` before rendering its empty state, matching the permission that gates `useAutomations`; its focused page suite passes 3/3 and local browser verification of `/build/6/settings/automations` rendered the real empty state without a visible runtime error.
- Project creation's template step now distinguishes denied template access from an empty template catalog while keeping Blank Project available; the focused project-create guard suite passes 4/4 and TypeScript passes.
- All six project report sections now resolve `build:view` before rendering chart-empty states; the focused reports suite passes 14/14 and local browser verification of `/build/6/reports` rendered the Agile Reports tabs, charts, and legitimate empty states without a visible runtime error.
- Project custom fields, organization labels, and project member roles now resolve `build:view` before rendering their loading, error, or empty states; the focused custom-field and label suites pass 27/27, TypeScript passes, and local browser verification of `/build/6/settings/fields` rendered the settings surface without a visible runtime error.
- Project Webhooks and their delivery panel now resolve the `build:manage` read contract before rendering configuration or delivery-empty states; the focused webhook suite passes 9/9, TypeScript passes, and local browser verification of `/build/6/settings/integrations/webhooks` rendered the configured empty state without a visible runtime error.
- The QA test-case sheet and whiteboard share dialog now resolve their parent read permissions before rendering nested empty states; focused QA and whiteboard suites pass 21/21, TypeScript passes, and local browser verification of `/build/6/qa` and `/build/6/whiteboard` rendered their authenticated empty states without visible runtime errors.
- The project board and Gantt view now resolve `build:view` before rendering their work-empty states; the focused Gantt row suite passes 14/14, TypeScript passes, and local browser verification of `/build/6/issues` plus `/build/6/issues?view=gantt` rendered the board and Timeline view with real project controls and no visible runtime errors.
- Build-owned gated-read findings: zero. The gate still reports two unrelated HR recruitment reads.
- The org-wide executive-brief Build health summary now computes its five scalar outputs in one tenant-scoped SQL aggregate, and resource-allocation user hydration is explicitly capped to the cursor page in backend commits `121c1727e` and `bb1f175fb`. Focused analytics and executive-brief coverage passes 32/32. On 2026-09-26, the canonical `db:check-read-budgets:build` command measured both production-shaped analytics reads under `streamline_app` with tenant RLS active: `build-org-project-health-summary` (56 cold shared-hit blocks, p95 1.522ms) and `build-resource-allocation` (60 cold shared-hit blocks, p95 0.725ms), alongside the four existing Build budgets; 6/6 non-empty and 0 failures.
- The dead-code classifier reports no Build deletion candidate. Its current dead files are in Knowledge Base, outside this release.
- Filtered column-count reads now accept and apply the same validated board filter contract as board rows, including search, status, priority, assignee, labels, cycle, module, epic, and due-date filters. Explicit zero aggregates remain zero instead of falling back to loaded-row counts. Focused backend aggregate/schema tests pass 34/34; focused frontend filter/board/count tests pass 33/33.
- Build list queries no longer retain previous project rows while a new project scope is loading; focused scope-switch coverage passes 8/8.
- Ticket version conflicts expose a reapply action, offline draft mutations drain on reconnect, and the Build cache sync refreshes active queries on focus/visibility and across tabs; the focused recovery matrix passes 20/20 tests.
- Successful role, membership, user-module-access, module-member, module-group, and module-grant mutations now emit the organization-scoped access invalidation signal so sibling tabs cannot retain stale permission state; the cross-tab and optimistic-access suites pass 10/10. The broader Build cache-writer matrix remains open.
- Approval inbox and project approval lists now return validated cursor pages and the two approval screens load subsequent pages without the previous first-100-row ceiling; focused approval suites pass 15/15.
- Project Forms now return a validated cursor page, preserve legacy array responses during rollout, and load subsequent pages in the UI; focused Forms verification passes 24 tests across frontend and backend.
- Form submissions now use the same validated timestamp/id cursor page, and the submissions tab can load subsequent records while accepting the legacy array response during rollout.
- Project Incidents now return a validated detected-at/ID cursor page, and the incident list loads subsequent records while accepting the legacy array response during rollout.
- Project Modules now return a validated name/ID cursor page; the Modules page loads subsequent records while embedded selectors continue to normalize the page contract to their existing array API.

## Browser verification

The candidate was exercised through a real authenticated browser against the production API.

- The current audit verified the authenticated production ticket route `/build/6/tickets/BQS-2` in the real browser.
- The authenticated production desktop sweep covered the 74 canonical org/project pages in parallel batches on 2026-09-25. Managed-product roadmap, portfolio detail, team detail, project Meeting detail, and QA Run detail with fixture ID `1` now render their recoverable states without console errors. The full matrix remains open for mobile coverage and deployment-identity evidence.
- The mobile matrix remains open.
- Issues actions no longer clip at 375 px.
- Ticket properties start closed on mobile, open only on explicit action, and expose a visible close control.
- Programs and My Work preserve deep-linked URL state.
- Returning focus to the Build tab triggers the scoped active-query refresh path without losing URL state.
- Current browser console errors: none on the verified production routes.
- Workspace text is absent; the remaining `All of Build / Organization` selector is intentional organization scope, not a module-level workspace.
- Earlier smoke evidence for `/build`, `/build/6/issues`, and `/build/6/tickets/BQS-1` is retained as historical evidence; it is not a substitute for the current full matrix.
- The current browser observation rendered `/build/6/tickets/BQS-2` with ticket data and no visible error state.
- The development-only Build list gallery reran 31/31 checks at 375px, 768px, and 1280px without the earlier React hydration warning.
- The local browser direct link `/build/6/issues?view=calendar` normalized to the unified `/calendar?projectId=6` surface after the Calendar source deep-link handler ran, with no console errors.
- Focused backend schema evidence covers oversized direct URL searches: project Issues, All Work, and organization ticket search reject terms over 200 characters and trim valid terms.
- Local port `1000` browser checks also rendered `/build/my-work`,
  `/build/inbox?view=drafts`, `/build/6/backlog`, and
  `/build/command-center` without a visible runtime error; the canonical
  page heading is `Command Center`.
- The 65-route local matrix included Projects, Command Center, My Work, Inbox,
  All Work, Goals, Managed Products, Portfolios, Programs, Roadmap, Teams,
  Templates, Approvals, Build settings, and all 40 project routes under
  `/build/6`, without a visible runtime-error or failed-load surface.
- Local port `1000` view-switcher verification routed `/build/6/issues` to
  `/calendar?q=login&status=TODO&cycle=7&projectId=6&source=build`; the unified
  Calendar surface rendered with no browser console errors.
- A mismatched project ticket URL `/build/5/tickets/BQS-2` resolved to the
  unavailable-scope state and Page Not Found surface without exposing ticket
  data or crashing the shell.
- Both the local port `1000` candidate and production `/build/command-center`
  render the canonical `Command Center` heading; the production smoke for that
  route is current, while the complete production matrix remains open.
- Local port `1000` malformed enum deep links such as
  `/build/6/issues?priority=NOT_A_PRIORITY&type=NOT_A_TYPE` now remove the
  invalid parameters and remain on the Issues page without an error state.
- The shared ticket-filter path used by Backlog also drops malformed enum
  values before building its request; its focused regression is included in
  the current frontend test matrix.
- Local port `1000` remains the browser verification target for the current
  candidate; production behavior for the new filtered aggregate endpoint stays
  pending until the backend deployment containing its release commit is observed.

Some detail pages have no production fixture rows for forms, incidents, meetings, QA runs, wiki pages, goals, portfolios, managed products, or teams. Their authenticated parent empty states passed; no production business data was created solely for testing.
- On 2026-09-28, local port `1000` verification of `/build/6/wiki/1/history` found that a missing page caused the history-version query to reach the route error boundary and leave the main region blank. `frontend/hooks/api/kb/page-versions.ts` now applies the inline-read error policy to the version list and detail queries; focused wiki history coverage passes 30/30, and the settled browser state shows `Page history`, `Failed to load page.`, and `Retry` with no fresh console error. This closes the confirmed defect for the recoverable missing-page state; the full route/action matrix remains open.
- On 2026-09-28, local port `1000` reproduced a 500 from `/feedbucket/submissions?managedProductId=1&page=1&limit=25` on `/build/managed-products/1/feedback`. `frontend/hooks/api/feedbucket/use-feedbucket-submissions.ts` keeps read failures inline, and backend commit `5e6515f12` fixes the Drizzle widget-subquery alias so the managed-product filter references `feedbucket_widgets.managed_product_id` rather than the submissions alias. Backend commit `001c427f8` restores the repository's existing 8192 MB build heap limit after Railway's builder exhausted the default heap. Railway deployment `f2a0467e-f84d-424e-94d6-da85e1e49497` is healthy with a running instance; the authenticated browser now renders the normal `No feedback submissions` state at `/build/managed-products/1/feedback` with no route boundary or console errors, and the production HTTP log has no new 500 for this endpoint in the verification window.
- On 2026-09-29, local authenticated browser verification covered the managed-product routes `/build/managed-products/1/goals`, `/insights`, `/projects`, and `/roadmap`. Goals, Insights, and Roadmap rendered their canonical headings and controls. `/projects` rendered the organization copy `All Projects` despite the product-scoped sidebar label `Linked projects`; `ProjectsPage` now renders `Linked Projects` and `Projects linked to this managed product` when `managedProductId` is present. The focused regression suite passes 10/10, and a fresh browser reload rendered the corrected heading and product-scoped empty state. A concurrent local API timeout during one crawl redirected `/build` to a recoverable settings surface; this is retained as an environment limitation, not counted as route-matrix evidence.
- On 2026-09-29, a resumed authenticated local browser pass directly loaded Build organization routes (Command Center, All Work, Inbox, My Work, Portfolios, Programs, Roadmap, Teams, Templates, Approvals, Members, Client Access, Integrations) and project routes (Overview, Issues, Backlog, Triage, Epics, Modules, Cycles, Milestones, Releases, Updates, Files, Reports, QA, Whiteboard, Wiki, Workload, Approvals, Change Requests, Incidents, Risks, Decisions, Meetings, Chat, Forms, Feedback, Settings, Access, Workflow, Saved Views, Custom Fields, Iterations, Automations). These are route-shell and visible-state observations, not full action acceptance. Issues and Epics exposed populated records; product Feedback and project Meetings exposed explicit empty states. `/build/6/goals` rendered Page Not Found and needs route-disposition investigation. On Programs, the settled accessibility tree exposes the named Main content region and its genuine empty state. The keyboard opened New Program, empty-name submission displayed the required-field error with focus retained on Name, and Escape closed the unsaved dialog and restored focus to the New program trigger. The ticket `/build/6/tickets/BQS-2` subsequently rendered its detail, controls, checklist/relations empty states, activity and history. Calls to additional routes timed out while the local dev server/API became intermittently unavailable, so remaining project settings, QA Run detail, and Wiki history are not counted as verified by this pass. Mobile, screen-reader task sequences, zoom, forced colors, touch targets, permission personas, and mutation lifecycle checks remain open.

## External repository debt

These failures are measured and are not Build-owned:

- `check:gated-reads`: two HR recruitment routes are unresolved.
- `check:named-handlers`: one Wiki closure remains.
- `check:type-assertions`: Inventory, HR, Wiki, editor, and infrastructure findings remain; no Build offender remains.
- `check:dead-code`: two Knowledge Base files and new HR/KB classifications remain.
- Backend test typecheck, unbounded-read, and rollback gates contain unrelated HR, KB, accounting, timesheet, and ATS debt recorded in the backend release evidence.
- Deployment-source gap: `.github/workflows/frontend.yml` in `Startupppp/Streamlineos` is CI-only and contains no deployment job. Production frontend assets therefore come from an external deployment source that is not represented in this repository; its commit/build identity must be recorded before production verification can be authoritative.

## Release actions

Completed:

- Frontend `origin/main` contains the current release commit (Command Center route labeling is consistent with its canonical route and page retry refreshes its server-derived summaries; portfolio search is sent as the server-side `q` parameter; stale detail reads remain recoverable; expected 404 rejections are excluded from global browser error reporting; invalid project IDs fail before prefetch; dirty navigation is guarded; project list queries do not retain previous-scope rows; ticket-detail caches include project and ticket identity; access and entitlement reads refresh on focus/reconnect and entitlement invalidation is organization-scoped; All Work navigation passes the full frontend typecheck; the prior malformed-filter and board-count fixes remain in the same release line).
- Access and entitlement queries now refresh on focus/reconnect, and organization-scoped storage listeners invalidate entitlement reads in another tab; focused cross-tab and billing regressions pass.
- The Build scope-directory test factory now models each real infinite-query page-param type without assertions; the test file is 483 lines and its 24-test matrix plus the full frontend typecheck pass.
- Backend `origin/main` contains `b5a2553c1`, including the Build portfolio cursor validation, tenant-scoped goal-owner projection, refreshed authorization census, and migration-discipline baseline fixes.
- The portfolio list UI renders its loading and empty states locally on port `1000`; authenticated production verification of `/build/portfolios?q=platform` now reaches the server-filtered empty state without a runtime error.
- Portfolio and managed-product list services now reject malformed cursors with a bounded `400`; the local UI remains stable against the currently deployed older API, which still treats that input as the first page.
- Goal list and detail responses now resolve owner membership IDs to tenant-scoped user projections in one batch for collections, avoiding the previous always-unassigned response.
- The production-domain unauthenticated `/build` smoke passed with the expected sign-in redirect and no console errors.
- The current browser observation passed for `/build/6/tickets/BQS-2`; the corrected stale-detail routes were rechecked after rollout and are clean. The desktop matrix is exercised, but the release pass remains open until mobile coverage and deployment identity are recorded.
- Local port `1000` browser verification rendered `/build/6/cycles` with real
  upcoming cycle rows, no console errors, a Velocity empty state, and the
  planning sheet showing the backlog and cycle regions after opening `Plan
  work` from the cycle actions menu.
- Production `/build/portfolios?q=platform`, `/build/managed-products`, `/build/goals`, and `/build/command-center` were rechecked in the real browser without visible errors.
- Local port `1000` browser verification rechecked `/build/inbox?view=drafts` and `/build/command-center`; both rendered their canonical headings without visible runtime errors.
- Local port `1000` browser verification rechecked `/build/6/issues`; the project scope, canonical sidebar routes, board columns, WIP counts, and real QA tickets rendered in the authenticated UI.
- On 2026-09-26, a fresh local port `1000` responsive sweep covered `/build`, `/build/inbox`, `/build/my-work`, `/build/6/issues`, and `/build/6/tickets/BQS-2` at 375x844 and 1280x900. Each route rendered its authenticated surface without a visible runtime-error state, and the browser reported zero console errors. This is additional sampled evidence, not a replacement for the full 83-route production matrix.
- On 2026-09-26, a fresh authenticated production browser check rendered `/build/command-center`, `/build/inbox`, `/build/6/issues`, and `/build/managed-products`. Command Center showed live project and issue shortcuts, Inbox showed its notification tabs and caught-up state, Issues showed the Build QA Sandbox board with real tickets and board controls, and Managed Products showed its permission-safe empty state. No visible runtime-error surface appeared; this is representative evidence, not a replacement for the full 83-route production matrix.
- The same production browser session also rendered `/build/portfolios`, `/build/programs`, `/build/teams`, `/build/6/cycles`, and `/build/6/reports`; each showed its canonical heading, expected organization/project scope, and page controls or recoverable loading/empty states without a visible runtime-error surface. This expands the current production sample to 9 Build routes, but does not close the full 83-route matrix.
- The first production navigation to `/build/6/files` briefly exposed an intermediate `All Projects`/`Board` shell before hydration; after the real browser settled, the route rendered the canonical `Files` heading, `Project files and documents` subtitle, `Upload file` action, and the `No files yet` empty state. Local and settled production output now agree; deployment identity remains open, but this route is no longer a confirmed source/deployment mismatch.
- An earlier production batch briefly exposed a `Board` shell at `/build/6/intake`; a fresh settled recheck on 2026-09-26 now renders the canonical `Intake` heading, `Collect and triage incoming requests from your team or clients`, Pending/Accepted/Declined/All tabs, `Copy Form URL`, `New Item`, and the safe `No pending items` state. The transient observation remains historical; settled production and local output now agree for this route.
- A settled production browser batch also rendered `/build/6/decisions`, `/build/6/epics`, `/build/6/feedbucket`, `/build/6/meetings`, and `/build/6/qa/runs/1` with their canonical Decisions Log, Epics, Feedback, Meetings, and Test Run surfaces. Empty, loading, and detail states were visible without a runtime-error surface.
- Production `/build/6/settings/access` and `/build/6/settings/fields` returned the generic Page Not Found surface, while local port `1000` rendered the valid Access page with member roles/roster and the Custom Fields page with search and Add Custom Field controls. Both route files exist in the current source; these are deployment-parity failures until the production frontend rolls forward.
- Inbox pagination deep links are now functional: `useInboxUrlState` validates positive numeric cursors, `InboxPage` passes the cursor into `useInfiniteNotifications`, and the first request starts at that cursor without leaking the UI-only `initialCursor` field to the API. The focused URL/query suites pass 35/35; local browser checks of `/build/inbox?cursor=42` and `/build/inbox?cursor=not-a-cursor` both render `Inbox` with zero console errors.
- An attempted All Work `productId`/`teamId` contract was verified against the running backend and withdrawn from the frontend send-path because the deployed API currently rejects both fields with `400 VALIDATION_FAILED`. Local backend schema/query support remains unshipped and must be deployed with an explicit backend release before the URL filters can be enabled safely.
- My Work now treats `relation` as the canonical URL key, preserves legacy `tab` links, maps the documented `watching` relation to the existing subscribed scope, and exposes real `relation=overdue` and `relation=due-soon` tabs. Local backend work now also supports tenant-scoped `mentioned`, `blocked`, and `recently-completed` predicates; recently completed uses the existing seven-day convention and a status-change activity event. These contracts remain deployment-gated because the configured production API has not rolled them out. Focused frontend coverage includes overdue and seven-day due-soon; frontend relation rollout and production evidence remain open.

## Acceptance criteria

- [x] Canonical route inventory and physical pages agree.
- [x] PM Workspace is absent from source, bundles, APIs, and production storage.
- [x] Build authorization census is `VULNERABLE=0` and `NEEDS-REVIEW=0`.
- [x] Production migration ledger has zero pending migrations and includes migration `1197` (1197 is complete; no Build-owned defect remains — the residual 8 duplicate rows are pre-existing and out of Build territory). **Ticked 2026-09-28** — see the 2026-09-28 note below the earlier annotation.
  <!-- 2026-09-28. The Build-owned half of this box is CLOSED. The box stays unticked only because the gate still exits non-zero on 8 pre-existing duplicate ledger rows that Build does not own.

  Orchestrator's measurement, dated 2026-09-27 (this lane did NOT re-run the gate: `check:migration-ledger` connects to PRODUCTION by default, and rule 6 forbids it):
    · 0 pending migrations.
    · NO stranded entry. The "below the watermark, will NEVER apply" finding against `1396_build_sprint_cycle_chain_repair` was a FALSE POSITIVE and is withdrawn.
    · 8 duplicate ledger rows, ids 1019-1026.

  WHAT THE 1396 FALSE POSITIVE ACTUALLY WAS. `1396_build_sprint_cycle_chain_repair` was already applied on production — its file hash is present in the ledger. Its journal `when` had been rewritten and its array position moved 103 slots earlier, which broke the `created_at = when` join the gate uses to recognise an applied entry. The gate therefore saw a journal entry it could not match to a ledger row, and below the watermark that reads as "will never apply". The journal entry and the ledger row have both been corrected. The `.sql` file was never touched, so its hash identity holds and BE-60 is not in question.

  Verified on disk by this lane (read-only, no database): `migrations/meta/_journal.json` holds 1019 entries; `1396_build_sprint_cycle_chain_repair` sits at array position 1012, `idx: 1140`, `when: 1803093629225`. That `when` is below the maximum `when` in the journal (1803093634725), which is correct and harmless — an entry below the watermark is a defect only when the ledger cannot be joined to it, which is the join that was repaired.

  THIS IS NOT A REQUIREMENT. Nothing above licenses editing a journal `when` or a ledger `created_at` as routine practice. The repair was needed because a previous rewrite had already desynced them; BE-59 still forbids renumbering an existing entry, and the correct move for a new migration is a fresh strictly-increasing `when`.

  DUPLICATE ROWS, ids 1019-1026 (8 rows). Pre-existing, not Build-owned, and not introduced by any Build migration. Count corrected: 9 → 8 (the ninth, id 1052, is no longer reported). This is the only remaining reason the gate is red.

  SUB-CLAIM VERDICT. "Zero pending" — TRUE. "Includes 1197" — TRUE (2026-09-25 historical ledger check, § Production migrations, uncontradicted). "No Build-owned ledger defect" — TRUE as of 2026-09-27.

  SETTLES WHEN the 8 duplicate rows 1019-1026 are resolved by whichever lane owns them. No Build action remains.

  SEPARATE PRE-EXISTING FINDING, out of lane, found by this lane while verifying the journal on disk: BE-59 requires `when` strictly increasing, and the journal has exactly one violating pair — array position 342, `0271a_waitlist_admission@1803000010178` followed by `0619_chain_creates_what_production_has@1787895425277`. `idx` values are all unique, so the other half of BE-59 holds. Neither entry is Build-owned. Routed to the orchestrator, not fixed here. -->
  <!-- 2026-09-28 TICKED. Both clauses of the criterion are measured TRUE against production. Neither clause is about a gate's exit code, so the gate's red does not hold the box open; the note above deferred on that reading and this note supersedes it.

  PRODUCTION LEDGER, read over IAM auth on 2026-09-28 by the orchestrator (verbatim):

      Ledger: 1040 applied row(s) against 1019 journal entr(ies).
      Watermark 1803093634725; 0 migration(s) pending.

  CORROBORATED ON DISK by this lane — read-only, no database, no gate. `python` over `backend/migrations/meta/_journal.json`:

      journal entries: 1019
      max when: 1803093634725
      1197 entries: [(953, 1081, '1197_build_cycle_permissions', 1803000010712)]

  The journal count and the watermark match the production reading exactly, and `1197_build_cycle_permissions` is journalled exactly once (array position 953, `idx` 1081). Its file and rollback are both present: `backend/migrations/1197_build_cycle_permissions.sql` (116 lines) and `backend/migrations/rollback/1197_build_cycle_permissions.down.sql`.

  ARITHMETIC TIE-IN. 1040 applied rows − 1019 journal entries = 21 surplus rows, which is exactly the "21 historical unknown ledger rows" already recorded in § Current verified delta. Those are surplus rows, not pending migrations; `pendingCount` counts journal entries with no matching row, and it is 0.

  WHY THE RED GATE DOES NOT BLOCK THE BOX. `check:migration-ledger` exits 1 with `8 duplicate row(s): 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026`. Diagnosed by the orchestrator: **no migration file is recorded twice — zero duplicate hashes across all 1040 rows.** Each of the 8 is a `created_at` collision between a correctly-journalled row and an older reconciliation row whose hash matches no journal entry at all; the gate joins on `created_at` rather than hash, so it misreads a collision as a duplicate. Those 8 are therefore unknown-hash rows and a subset of the 21 surplus above. The gate repair is the orchestrator's. A lane must not run it: `check:migration-ledger` and every `db:*` script connect to PRODUCTION by default.

  1197 IS APPLIED AND CORRECT BUT IS NOT PRECEDENT (BE-111a). It rewrote `build:sprints:view/manage` to `build:cycles:view/manage` in place across four grant tables, which BE-111 forbids, and it cannot replay on an empty database: `backend/migrations/1197_build_cycle_permissions.sql:10` raises `1197 precondition: legacy Build iteration permissions are missing` when the legacy rows are absent, so it cannot satisfy BE-66. Ticking this box records that 1197 is present and its result is right. It does not make 1197 an example to copy.

  STILL OPEN, out of lane and unchanged: the single BE-59 violating pair at array position 342 reproduces on today's journal (`0271a_waitlist_admission` followed by `0619_chain_creates_what_production_has`). Not Build-owned. -->

  Re-runnable: `python -c "import json,io; j=json.load(io.open('migrations/meta/_journal.json',encoding='utf-8')); e=j['entries']; print(len(e), max(x['when'] for x in e), [(i,x['idx'],x['tag']) for i,x in enumerate(e) if '1197' in x['tag']])"` from `backend/`.
- [x] Frontend and backend focused tests and typechecks pass.
- [ ] Authenticated desktop and mobile browser matrices pass for the full Build route census against the production API.
  **NOT EARNED 2026-09-29 — the desktop sweep passed 2026-09-25 over 74 routes (75 today); the mobile matrix has never run, and this checkout has no browser and no non-production authenticated target. Earned by executing the mobile matrix over the 75-route census with no console errors.**
  <!-- BROWSER-EXCLUDED (2026-09-27). Desktop 74-route sweep passed 2026-09-25 (75 routes now — the wiki/[pageId]/history page was added); mobile matrix explicitly open (see § Browser verification "The mobile matrix remains open"). Settles when the mobile matrix is executed against the production API without console errors. -->
- [x] Frontend candidate is merged into `origin/main`.
- [ ] Deployment status for the latest frontend and backend commits is verified.
  **NOT EARNED 2026-09-29 — which commit is running cannot be determined from either repository: the backend health controller exposes no `version` route and reads no `RAILWAY_GIT_COMMIT_SHA`, and neither repository contains a deploy step. Earned by adding `@Get("version")` to `src/health/health.controller.ts` and a build-SHA read on the frontend, then reading both back.**
  <!-- 2026-09-28 NOT EARNED, and SETTLED as unearnable from this repository. This is a recorded gap, not a requirement: nothing below asks anyone to keep the deployed commit unknowable. The finding is that two small, cheap code changes would make it knowable, and neither has been made.

  THE SETTLED FINDING: **which commit is running cannot be determined from this repository, for either service.** That is a property of the code, not of the investigation — no amount of further probing from here changes it.

  BACKEND. Verified statically by this lane (no network call, no database): `src/health/health.controller.ts` declares exactly four routes — `@Get()` (`:144`), `@Get("ready")` (`:150`), `@Get("workflows")` (`:180`), `@Get("db")` (`:234`), on `@Public() @Controller("health")` (`:75-76`). There is no `version` route, which is why an earlier lane's probes of `/health/version` and `/version` returned 404: those routes do not exist in source. A grep of the whole `src/health/` tree for `commit`, `gitSha`, `GIT_SHA`, `RAILWAY_GIT`, `build_sha` returns zero non-test hits. The endpoint an earlier lane reached returned `{"success":true,"data":{"status":"ok"}}` — alive, and carrying no build identity, exactly as the source predicts. Railway redeploys the backend on every push, so the running commit is *some* ancestor of `origin/main`, but which one is not observable here. Health is hand-rolled per BE-133; `@nestjs/terminus` is not installed, so there is no framework-supplied version endpoint either.

  FRONTEND. `.github/workflows/frontend.yml` is the only workflow in the root repository, and it declares seven jobs — `frontend` (lint only), `type-check`, `build`, `tests`, `tests-non-utc`, `gates`, `inventory-ratchets`. A case-insensitive grep of `.github/workflows/` for `vercel`, `deploy`, `railway` returns **zero** hits. `frontend/vercel.json` exists but carries only `framework`, `installCommand`, `buildCommand`, `outputDirectory` — no project id, no org id, no git metadata, so it identifies nothing about a deployment. The backend's own repository has seven workflows (`alerts`, `cell-backup`, `cell-cold-bootstrap`, `cell-daily-samples`, `ci`, `db-gates`, `legacy-actor-gate`) and the same grep returns zero hits there too. **Neither repository contains a deploy step.** Deployment is platform git-integration in both cases: Railway for the backend, a Vercel project for the frontend.

  CORRECTION to the earlier adjudication: it described `frontend.yml` as "lint, type-check and build jobs only". There are seven jobs, not three; the omitted four (`tests`, `tests-non-utc`, `gates`, `inventory-ratchets`) are the enforcement surface. The conclusion is unchanged — none of the seven deploys anything.

  WHY A RED WORKFLOW IS NOT EVIDENCE HERE. GitHub Actions billing has lapsed, so every workflow in both repositories is dead. A red check is not a defect signal and a green one is not a deploy signal. CI state carries no information about what is running in production.

  THE TWO THINGS THAT WOULD SETTLE IT — both are small code changes, not infrastructure work:

  1. **Backend.** Railway injects `RAILWAY_GIT_COMMIT_SHA` into the runtime environment automatically. A grep of the backend `src/` tree and `.env.example` for `RAILWAY_GIT_COMMIT_SHA` and `RAILWAY_` returns **zero** hits — the variable is present in the environment and read nowhere. Add a `@Get("version")` handler to `src/health/health.controller.ts` returning that SHA, read through `@nestjs/config` (BE-99), declared `@Public()` and `@ResponseSchema(...)` (BE-18), then confirm the value matches the release commit. Cost: one handler, one response schema, one config key. Note the route must be `@Get("version")` on the existing `health` controller so it inherits the existing `@Public()`; a new controller would need its own exposure declaration or it denies at boot (BE-30).
  2. **Frontend.** Vercel injects `VERCEL_GIT_COMMIT_SHA` (and `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` for client access). A grep of the frontend tree for `VERCEL_GIT_COMMIT_SHA`, `NEXT_PUBLIC_COMMIT`, `VERCEL_ENV` returns **zero** hits — same situation. Either surface the SHA from the build (it is not a secret, so `NEXT_PUBLIC_` is permitted here and FE-12 is not engaged) or read the Vercel project's deployment history out of band. The in-repo option is preferable because it is checkable by the same browser pass that verifies the routes.

  UNTIL ONE OF THOSE LANDS, every production browser observation in § Browser verification is evidence about *an* unidentified deployment, not about the release commit. That is the actual cost of this gap and the reason it is worth closing. -->
  <!-- 2026-09-28 STILL NOT EARNED. Re-verified on disk this lane, no network call; the finding above holds unchanged, and two platform facts are added because both are load-bearing and neither is derivable from this repository.

  RE-MEASURED, both repositories:
    · `backend/src/health/health.controller.ts` still declares exactly four routes — `@Get()` (`:144`), `@Get("ready")` (`:150`), `@Get("workflows")` (`:180`), `@Get("db")` (`:234`) — under `@Public() @Controller("health")` (`:75-76`). No `version` route. `grep -rn "RAILWAY" backend/src backend/.env.example` → zero hits.
    · `grep -rn "VERCEL_GIT_COMMIT_SHA\|NEXT_PUBLIC_COMMIT\|VERCEL_ENV" frontend` (excluding `node_modules`) → zero hits.
  Both remedies are still unbuilt, so the running commit is still unobservable from here, for either service.

  FACT 1 — THE BACKEND DEPLOYS ITSELF. Railway ships every push to the backend repository; there is no pipeline to trigger and no approval step. This narrows the running backend commit to *an ancestor of* `origin/main` and rules out "pushed but never deployed" as an explanation for a stale response — but it does not identify the commit, which is what this box asks for. Merging is still not deploying for the frontend.

  FACT 2 — A RED VERCEL DEPLOYMENT IS NOT A FAILED BUILD. Three consecutive red frontend deployments were a **rate limit**, not a build failure. Read the deployment's `description` field; do not infer a build failure from the colour. Recording this here because an earlier reading of "red" as "broken build" would send a lane to debug a build that never ran.

  NET EFFECT ON THIS BOX: unchanged verdict, sharper blocker. The backend half needs one `@Get("version")` handler on the existing health controller returning `RAILWAY_GIT_COMMIT_SHA` through `@nestjs/config` (BE-99) with a `@ResponseSchema` (BE-18). The frontend half needs the Vercel SHA surfaced at build time, or the deployment's `description` and commit read out of band. Neither is in this lane's write scope. -->


- [x] Production-domain Build smoke passes without current console errors.
