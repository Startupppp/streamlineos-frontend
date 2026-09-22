# Final closure — 2026-09-22, legacy sprint identity removed

**Authoritative for the work below.** Where an earlier row in `IMPLEMENTATION-STATUS.md` disagrees, this
file wins; the earlier rows stay as the historical record. Nothing here was taken from an agent report
without the coordinator reproducing it.

## The owner decision that changed the shape of this session

Mid-session the repo owner ruled that **the legacy sprint identity is not to be maintained at all**. That
replaced the backward-compatible plan two agents were already executing. `cycleId` is now the only
iteration identity, and `sprintId` is a **breaking removal**, not a deprecation.

## Merged

| Repo | Merge | What |
|---|---|---|
| root | `a4a1956e8` → `8969d4756` | Modal overlay descriptions; Feedbucket widget rebuilt |
| root | `36e7402ad` → `f794b484a` | Frontend legacy sprint identity removed |
| root | `29d104aff` | WCAG contrast fix on a muted icon |
| backend | `bcf3cba6a` → `47adc83a1` | `sprint_id` write cutover for tickets, meetings, sprint hrefs |
| backend | `06b398ec8` → `1e008ac13` | Dead `build.bugs` writer deleted; real unreachability proof |
| backend | `8bd5a84b4` → `d5bfaa493` | Invoice line to approved-timesheet traceability |
| backend | `fccfff70e` | Two crossed tripwires closed |
| backend | `f10f28b7a` | Feedbucket convert-to-ticket gated on project membership |
| backend | `e06314424`, `de8ccd58a` | Drizzle `sprint_id` declarations removed; relational-read scanner |
| backend | `0a2d587fa` → `6d8c16367` | Legacy sprint identity removed from the API contract |
| backend | `265e6eca7` | Cycle binding scoped to the project on create and update |
| backend | `f5fa316da`, `1cf147ff1` | Contract registry regenerated; census re-anchored |

`e06314424` and `265e6eca7` carry this session's work under a **peer session's** commit message: that
session committed the shared working tree before the coordinator could. Nothing was lost and the content
is verified, but those messages do not carry the reasoning, which is why it is recorded here.

## Counts that settle the cutover

| Measure | Before | After |
|---|---|---|
| `sprintId` / `sprint_id` in `frontend/` (excluding the generated contract) | 102 | **0** |
| `sprintId` in backend runtime source | 100 | **13**, all the `:sprintId` path param on the frozen routes |
| `legacySprintId` application readers | 40 | **0** |
| `sprintId` in the published contract | 64 | **4**, the same frozen path param |

## Five blockers, not four, and the fifth was invisible to every scanner

The detach invariant had three scanners: property-access (`tickets.sprintId`), relational-select
(`sprintId: true`), and — added this session — the object-literal write (`sprintId: body.sprintId`). The
write form is what let three live writes survive: ticket create, meetings, test runs.

A **fourth** form was caught only by `tsc`. `projects-tickets-detail.service.ts` asked Drizzle for the
`sprint` **relation** through a `with:` clause. That is none of the three shapes, and it emitted a join
on `tickets.sprint_id`. A fourth scanner now covers it, mutation-proved by restoring the line.

**The ordering in `lane-1-cycle-cutover.md` was backwards and would have caused an outage.** It says not
to remove a Drizzle declaration until phase 05 is applied. Disproved by rendering real SQL: Drizzle names
every **declared** column in its INSERT list, with `default` as the value, even for an insert whose
TypeScript object never mentions the field. A declaration that outlives its column raises `42703` on
every insert and bare select. **Declarations must be removed and deployed before phase 04 runs.**

## Findings the work surfaced

**Feedbucket submission-to-ticket was a live in-tenant escalation.** The convert schema accepts a
`projectId`, the routing helper lets that override win over the widget's own project, and the only check
was `assertProjectInOrg` — an organization check. Any holder of `feedbucket:submissions:manage` could
write a ticket, watcher and activity row into any project in their org, including ones they were not a
member of. Both paths now assert `assertProjectAccess` against the **resolved** project. It escaped the
authorization census because the census models `build/` controllers, not `feedbucket/`. Fixed with the
owner's explicit approval, and **it is a behaviour change**: a triager who legitimately filed across
projects now gets 403.

**A ticket could be bound to another project's cycle.** `fk_tickets_org_cycle` enforces the organization
and nothing enforced the project. The bulk mutation checked it; single create and update did not. Both
now match the bulk precedent and the sibling epic check in the same file. The BOLA binder moved both
`createTicket` bindings from unresolved to `org-predicate` as a result.

**The Feedbucket widget's accessibility fix had never shipped.** Source landed 2026-09-22; the built
`public/feedbucket-widget.js` was last committed 2026-09-17 and still served `aria-modal="false"` with no
`aria-labelledby` and no focus trap. Rebuilt, with the baked API base and absolute host set unchanged.
The browser-QA note blaming the widget for the missing-dialog-description warning was **wrong**: the
bundle contains no Radix and no React. The app resolves `@radix-ui/react-dialog` 1.1.15, which carries
the warning; vaul resolves its own 1.1.18, where it was removed upstream. Dialog and Sheet warn; Drawer
cannot.

**The "legacy bug writer is unreachable" proof was worthless.** It read one controller as a string, and
its load-bearing assertion sliced the service source from the first occurrence of the consolidated
method — it only ever worked by accident of method ordering. Proven by planting a live writer on a real
route: the old spec stayed 4/4 green. Replaced with a Nest route-metadata walk plus a repo-wide scan;
the same plant takes the new one red.

**`ticket.moveToSprint` was a dead AI executor with no proposer.** Deleted, and proposer/executor
agreement on both the action key and the payload field is now pinned — that pairing has shipped broken
before.

**A stale `openapi.json` was disarming two security gates.** Regenerating it revealed 57 operations and
32 id-shaped fields the BOLA ratchet had never seen, plus two operations `check:contract-registry` fails
closed on. Both gates now pass, and `bola-body-id-binding.spec.ts` went from 3 pre-existing failures to
24/24.

## Verified here

| Check | Result |
|---|---|
| backend `build` + `feedbucket` + `invoices` + `agent-access` | **246 suites / 2222 tests pass** |
| frontend `features/build` + `lib/build` + `hooks/api/build` | **217 suites / 1631 tests pass** |
| backend `typecheck` | 1 error — the documented `manager-home.service.ts` HR baseline |
| backend `typecheck:test` | 2 errors — the same plus the documented `portal-client-submit-cr` baseline |
| frontend `type-check` | **exit 0** |
| frontend `type-check:specs` | **0 errors** |
| `check:build-authz-census:check` | **VULNERABLE 0** across 322 handlers |
| `check:contract-vendor` | PASS, sha256 `5426ca9f` |
| `check:contract-registry` | **PASS** — was FAIL |
| `bola-body-id-binding` | **24/24** — was 3 failing |
| migration discipline / immutability / rollback / drop-column-safety / destructive-targets | PASS |
| `check:route-census` | PASS — 88 routes, 79 pages, 0 weak cold-load gates |
| `check:dialog-descriptions` | PASS, ratchet 215 |
| `check:colors` | PASS — restored after a regression |
| `check:route-classification`, `list-projections`, `query-projections`, `get-route-writes` | PASS |

**Red and not from this work, each reproduced on a control:** `check:tenant-isolation` (3 services, one
a peer's new `ticket-export.service.ts`); `check:outbox-consumers` (`build.incident.status_changed`);
`check:bounded-contracts` (6, all CRM); `check:over-300` (568 against a 513 baseline — the frontend
cutover improved it to 565 and peer commits added 3 back); `check:dead-code` (a peer's in-flight
notifications refactor, whose failure changed between two consecutive runs).

## Still BLOCKED — do not run these

| Migration | Blocker |
|---|---|
| `a-sprint-cycle-04-detach.sql` | Application code is ready. Needs **deployment first**, then the archive precondition its own DO-block checks. |
| `a-sprint-cycle-05-drop.sql` | **Two `build.sprints` touch points survive outside the frozen service** — the project-delete cascade in `projects-write.service.ts` and the sprint entity card in `build-entity-reads.service.ts`. Pinned by an allowlist that must reach empty first. |
| `b-qa-bug-04-contract-freeze.sql` | The 14-check verifier has never been run. A runner now exists that **refuses to start without an explicit non-production `--url`**; there is still no non-production database to point it at. |
| `b-qa-bug-05-contract-drop.sql` | Requires 04, plus removing the `bugs` declaration from `src/db/schema`. |

No database was contacted in this session. No migration was applied. No destructive SQL was run.

## Deployment order, which is not optional

1. Deploy backend and frontend **together**. The contract change is breaking in both directions: the
   frontend no longer sends or reads `sprintId`, and the backend now rejects it with a 400.
2. Verify in a browser against the deployed build using `FINAL-BROWSER-QA.md`.
3. Only then consider `a-sprint-cycle-04-detach.sql`.

## Browser verification

**Not performed and not claimed.** Claude opened no browser, took no screenshot and verified no UI. The
checklist is `docs/build-module/FINAL-BROWSER-QA.md`. It must run after deployment, at desktop and
375 px, and it names the two deliberate behaviour changes — stale `?sprintId=` links (§1.8) and the
Feedbucket 403 (§6) — so neither is misread as a defect.

---

# Migrations APPLIED — 2026-09-22

Executed against production over IAM auth with the repo owner's explicit authorization, after they
confirmed the merged code was deployed and that they are the only user of the database.

| Step | File | Result |
|---|---|---|
| verify | `b-qa-bug-03-verify.sql` | **all 14 checks returned 0**, read-only, first run ever |
| detach | `a-sprint-cycle-04-detach.sql` | applied — `077e7608…` |
| drop | `a-sprint-cycle-05-drop.sql` | applied — `6bfdf9b8…` |
| freeze | `b-qa-bug-04-contract-freeze.sql` | applied — `3a7903b0…` |
| contract drop | `b-qa-bug-05-contract-drop.sql` | applied — `bf467ef1…` |
| rename | `a-sprint-cycle-06-rename-scope-events.sql` | applied — `afd5a242…`, with the declaration renamed in the same change |
| trigger repair | `1152_build_report_revision_cycles` | applied — journalled, committed by a peer and never run |

Ledger 908 → 914. All six phase files and the one journalled migration are applied; nothing is outstanding.

## Preconditions measured before executing, not assumed

- Phase 04's own guard condition — tickets with `sprint_id` set and no row in `sprint_binding_archive` —
  read **0**, against 103 archived bindings.
- **0** tickets would have lost their iteration: all 103 carrying `sprint_id` also carried `cycle_id`.
- `project_meetings`, `test_runs` and `sprint_scope_events` held **no** `sprint_id` values at all.
- `build.bugs` held **0 rows**, and `streamline_app` already lacked INSERT on it.

## Verified after, from the catalog

`build.sprints` gone, all 4 rows in `build.sprints_archive` with RLS and its `tenant_isolation` policy.
`build.bugs`, `test_run_results.linked_bug_id` and the `bug_priority` type gone. `bug_status` and
`bug_severity` survive, correctly — `work_item_qa_details` still binds them. 220 tickets, 103 with a
cycle, 44 of type BUG, 5 cycles. `sprint_scope_events` still carries its pre-rename name, which is the
only state in which phase 06 is unapplied and the burnup report resolves.

## What the migrations then broke in code, and what it cost to find

Dropping a column inverts the declaration rule. Before the drop, a declaration that outlives its column is
the hazard; after it, **any surviving declaration is a query against something that does not exist**.

`test-runs.service.ts` projected `linked_bug_id` on `getRun` and `listRunResults`. Both would have raised
`42703` on every read. The frontend was worse: `qa-schema.ts` declared `linkedBugId` **required**, so
`applyContract` would have thrown and killed the test-run results screen rather than degrading it. Also
removed: the `bugs` and `sprints` table declarations, `sprintsRelations`, the `bug_priority` pgEnum, and
two membership-artifact rulings on a dropped table — replaced by the `work_item_qa_details` QA-owner
pointer, which had never been ruled.

The dual-identity tripwires are retired, which is what their own text instructed. Where a spec still
needed the dropped vocabulary it now reads it from an artifact that survives: the sprint status CHECK from
the phase 05 rollback, the bugs column list from the disposition map.

## Phase 05 was unsafe as written, and was split before running

It ended with `ALTER TABLE sprint_scope_events RENAME TO cycle_scope_events` and the matching enum rename.
Dropping `build.sprints` is safe once nothing queries it; a rename is not, because the old name stops
resolving at the instant the new one starts. `projects-reports.service.ts` reads that table for the burnup
report through a declaration that still names it, so phase 05 would have dropped the table successfully
and broken burnup in the same transaction. Both renames now live in phase 06 with a rollback and a
tripwire pinning the lockstep.


---

# Phase 06 and the trigger nobody had applied — 2026-09-22

`a-sprint-cycle-06` is applied and the declaration moved with it, in the same change. The physical table
is `cycle_scope_events` and the type is `cycle_scope_event_type`. The constraint and index names stay
spelled `sprint_scope_events` — `ALTER TABLE ... RENAME` does not touch them — so the declaration keeps
the old spellings on purpose, and a test pins that pairing so a future author does not "tidy" them into
objects the catalog does not have.

**Migration 1152 had been committed by a concurrent session and never applied.** It rewrites
`build.bump_report_revision`, whose body still joined `build.sprints` and read `c.sprint_id`, both dropped
by phases 04 and 05, while wired to twelve triggers including every write on `build.tickets`.

It did not raise, and the reason is worth recording rather than being relieved about. The offending join
sits behind `IF TG_TABLE_NAME = 'sprint_scope_events'`, and that stopped matching the instant phase 06
renamed the table. So the branch became unreachable rather than broken — which also means scope-event
writes were silently skipping their revision bump and serving stale reports until the TTL expired. A
latent correctness bug, not an outage, and invisible either way.

1152's own header says it **must be applied before** `a-sprint-cycle-04-detach.sql`. It was not. The order
was wrong and the only thing that made it survivable was the guard above. Applied now and verified: the
function names neither dropped object, and its triggers additionally cover `build.cycles`, which the
original 1073 never did — so editing a cycle now bumps the reports that read it.

**Verified after:** ledger 914, function clean, fifteen triggers, and a ticket `UPDATE` inside a
rolled-back transaction succeeds.
