# Migration runbook — Sprint/Cycle and QA Bug contraction

**Status:** the Sprint/Cycle and QA Bug contraction described here was executed in production on 2026-09-22. Do not rerun these files. This document is retained for rollback reasoning and for the ordering rules that apply to future destructive migrations. Current migration state lives in [RELEASE-STATUS.md](./RELEASE-STATUS.md); canonical Build search migrations `1185_roadmap_search_id_probe` and `1186_project_programs_list_indexes`, historically deployed as `1177` and `1178`, are outside this contraction runbook.

These phase files live in `backend/migrations/sql/` and were deliberately not journalled, so they required explicit one-at-a-time execution in the order below.

---

## The rule that governs the whole sequence

A **drop** is safe once no source file references the object: an unreferenced column or table costs a
deployed reader nothing, so the code can stop using it long before the database loses it.

A **rename** is the opposite: the old name stops resolving at the instant the new one starts, so there is
no overlap window and no safe ordering without a lockstep deploy.

A **declaration** must be removed *before* the column is dropped, not after. Drizzle names every declared
column in its INSERT column list — with `default` as the value, even when the TypeScript object never
mentions the field — so a declaration that outlives its column raises `42703` on every insert and every
bare select. An earlier cutover plan stated the reverse; this rule is the corrected authority.

---

## Preconditions recorded for the completed contraction

| # | Precondition | State |
|---|---|---|
| P1 | No application code reads or writes `tickets.sprint_id`, `project_meetings.sprint_id`, `test_runs.sprint_id`, `sprint_scope_events.sprint_id` | **MET** |
| P2 | No Drizzle declaration names those columns | **MET** |
| P3 | No application code reads or writes `build.sprints` | **MET** |
| P4 | No application code writes `build.bugs` | **MET** |
| P5 | The merged code is deployed to production | **MET before execution** |
| P6 | `b-qa-bug-03-verify.sql` returns 0 for all 14 checks | **MET before execution** |
| P7 | Every `tickets.sprint_id` value is archived in `build.sprint_binding_archive` | **MET by the phase 04 guard** |

**P5 is not a formality.** Applying a destructive migration before the matching code deploy drops an object under a running reader and raises `42703` on live traffic. A data guard cannot prove application compatibility.

---

## Connection

There is **no non-production database**. `.env` and `.env.production` both resolve to the same production
Aurora host, verified repeatedly. Aurora is on IAM auth, so a plain `DATABASE_URL` dies `28P01 PAM
authentication failed`, which reads exactly like a wrong password and is not one.

Mint a token with the wrapper at `D:/agent-work/mig-iam.mjs` (parse the region with
`hostname.split(".").at(-4)`, not `at(-3)` — `at(-3)` yields `"rds"` and mints a token that fails `28P01`).

Apply un-journalled phase SQL with an explicit URL, never a bare invocation:

```
node scripts/apply-migration-file.mjs <file.sql> --url "<iam-token-url>"
```

`apply-migration-file.mjs` and `db-query.mjs` both call `dotenv.config()` **internally**. There is no
`--env-file` flag to warn you. Omitting `--url` silently targets production.

---

## Order

Take a snapshot before step 3. The precedent in this repo is a named RDS snapshot
(`streamlineos-pre-build-p0-…`) taken immediately before each authorised production execution.

| Step | Action | Reversible? |
|---|---|---|
| 1 | **Deploy** the merged backend and frontend **together** | n/a |
| 2 | Browser-verify the deployed release candidate and record evidence in `RELEASE-STATUS.md` | n/a |
| 3 | Snapshot the cluster | n/a |
| 4 | `b-qa-bug-03-verify.sql` — 14 read-only checks, all must return 0 | read-only |
| 5 | `a-sprint-cycle-04-detach.sql` — drops `sprint_id` from 4 tables | `-rollback.sql`, but dropped values survive only in `sprint_binding_archive` |
| 6 | `a-sprint-cycle-05-drop.sql` — archives then drops `build.sprints` | `-rollback.sql`, restores from `build.sprints_archive` |
| 7 | `b-qa-bug-04-contract-freeze.sql` — REVOKEs write grants on `build.bugs` | `-rollback.sql` re-GRANTs |
| 8 | `b-qa-bug-05-contract-drop.sql` — drops `linked_bug_id`, `build.bugs`, `bug_priority` | **no rollback file exists** |
| 9 | `a-sprint-cycle-06-rename-scope-events.sql` — **only** in lockstep with a deploy that renames the Drizzle declaration | `-rollback.sql`, same lockstep in reverse |

Steps 5 and 6 may be run together. Step 8 is the only irreversible one and the only one with no rollback
authored; it should wait until `build.bugs` write volume has been observed at zero for a monitoring
window after step 7.

Step 9 is **cosmetic**. It renames `sprint_scope_events` to `cycle_scope_events` and its enum. Skipping it
indefinitely costs one stale word in the catalog. Running it without the matching deploy breaks the
burnup report.

---

## Verification after each step

Query the catalog directly on the same IAM connection rather than trusting the applier's output:

- after 5: `information_schema.columns` — `sprint_id` absent from all four tables
- after 6: `build.sprints` absent; `build.sprints_archive` row count equals the pre-drop live count
- after 7: `has_table_privilege('streamline_app', 'build.bugs', 'INSERT')` is false
- after 8: `build.bugs` absent; `test_run_results.linked_bug_id` absent

Read the constraint and index names **out of the migration file**, never from memory — a guessed
identifier reads as a missing object.

---

## If something fails mid-sequence

Each file runs as a single simple-query batch, so a `DO $$` guard that raises aborts the whole file with
no partial damage. That is by design and has been confirmed. A failure at step 5 or 6 means a
precondition is genuinely unmet — read the `RAISE EXCEPTION` message, do not retry, and do not edit the
guard out.

---

## Migration 1197 — BE-111 conflict and replay limitation

**Audit qualification, 2026-09-27:** The operational justification in the historical paragraph
below has not been independently established in this audit. Record it as the earlier author's
rationale, not a new exception to BE-111. The legacy-key precondition proves failure when those
keys are absent; it does not prove that a complete ordered cold replay, including earlier seeds,
always fails. No database was queried in this documentation audit.

- [ ] Verify the complete ordered replay with its intended historical seed state and document the result without editing an already-applied migration's bytes
- [ ] Add a discoverable exception/compatibility reference at the rule's owning documentation, or record that no exception is authorized; do not generalize one historical rename into permission to backfill grants

`backend/migrations/1197_build_cycle_permissions.sql` renamed `build:sprints:view/manage` to `build:cycles:view/manage` by directly rewriting existing rows in `role_permission_grants`, `user_permission_grants`, `permission_supported_scopes`, and `user_delegation_permissions`.

**Conflict with BE-111:** `backend/CLAUDE.md:150` (rule BE-111) prohibits backfilling grants by migration: "Widen a role template and let `RoleGrantReconcilerService` converge at boot. Never backfill grants by migration." Migration 1197 was applied to production before that rule was written as a firm prohibition, and was the correct operational choice at the time — a rename of live permission keys with zero downtime required an in-place rewrite because `RoleGrantReconcilerService` could not reach rows bearing a key it did not know. The migration is applied and its result is correct; the conflict is recorded here so a future reader of BE-111 understands why an exception exists in the history.

**Replay limitation:** lines 6-11 of the migration raise `RAISE EXCEPTION '1197 precondition: legacy Build iteration permissions are missing'` when the old keys (`build:sprints:view`, `build:sprints:manage`) are absent from the `permissions` table. On a fresh empty database seeded only by `RoleGrantReconcilerService` those keys do not exist, so the migration fails. This migration cannot be verified by replaying it on an empty database (contra BE-66). Record this explicitly rather than running it on a cold chain and misreading the failure as a broken migration.
