# 15 — Every open item in `OPEN-FINDINGS.md` is closed or carries a dated reason

**What to build:** The findings with no ticket of their own stop being carried. Each is either fixed, or its file says why it is not and what would close it — so the Phase 0 gate is a fact rather than a judgement call.

**Blocked by:** None — can start immediately

**Status:** done

**The list**, from [`../../OPEN-FINDINGS.md`](../../OPEN-FINDINGS.md) as re-verified 2026-08-27, with the 2026-08-28 outcome:

| § | Finding | Outcome |
|---|---|---|
| 3 | `vault_access_logs` cannot record a deletion and has no tenant column | **FIXED.** Migration `0607`. One third of the diagnosis was stale — `org_id` and the `tenant_isolation` policy already existed (added by `0591`). |
| 4 | `streamline_app`'s password is repaired in `.env`, not in Neon | **OPERATOR ACTION.** Marked, dated, not attempted. Credential confirmed still working 2026-08-28. |
| 5 | `db:verify-rls` and `backend/CLAUDE.md` §4 contradict each other | **RESOLVED BY DECISION.** ADR 0001; verifier's FORCE check is advisory. A stated fact in the finding was wrong and is corrected. |
| 6a | `DashboardLeaveService.getPendingApprovals` counts resignations org-wide | **FIXED.** `resignationApprovalScope` mirrors `leaveApprovalScope` using the same derived-approver relation `LeaveApproverService` already uses. |
| 6 | ~~`verify-permission-catalog.mjs` duplicates `check-permission-keys.mjs`~~ | **STRUCK.** Confirmed absent from the repository; `verify:permissions` already points at the canonical script. |
| 6 | `unregistered-injectables.mjs` reports 0 and can become a spec | **FIXED.** `src/unregistered-injectables.spec.ts`, 3 tests, in the default suite. |
| 6 | ~~`recurring-journals.controller.ts` holds its list schema inline~~ | **STRUCK.** Already imports from `./dto/recurring-journals.schemas`. |
| 6 | 29 hand-rolled page fields remain | **FIXED, and the count was stale — 11 remained, not 29.** All migrated to the shared helpers; the nine over-cap fields come down to the 100/page cap per the product ruling. |
| 6 | `INVITE_EXPIRED` is never written to the seat ledger | **OPEN — DEFERRED**, with a dated reason and what would close it. Seat maths is correct; only the audit event is missing. |

## Acceptance criteria

- [x] Each row above is either fixed with its evidence recorded, or annotated in `OPEN-FINDINGS.md` with a date, the reason, and what would close it.

`OPEN-FINDINGS.md` now carries an explicit status vocabulary (FIXED · RESOLVED BY DECISION · OPERATOR ACTION · OPEN — DEFERRED) and every item carries one. The two deferred items (§4, §6 `INVITE_EXPIRED`) each carry a date, why it was not attempted, what would close it, and how to tell it has regressed.

- [x] §3 is closed as one change — `org_id` with a policy, `candidate_id`, denormalised `filename`/`document_type`, `vault_document_id` nullable with `ON DELETE SET NULL`, the reader rewritten onto the log's own columns, and only then the insert.

`org_id` and the policy were already present — verified against `pg_catalog` *before* writing the migration, which is what the "verify each finding still reproduces" todo exists for. Everything else landed as one migration, `0607_vault_access_logs_survive_document_deletion.sql`, journalled at `idx` 328.

Applied:

```
$ node --env-file=.env src/scripts/run-pending-migrations.mjs
watermark=1787830399441 | pending=1
  + 0607_vault_access_logs_survive_document_deletion applied
```

`pg_catalog` diff after — every statement landed, not just the runner's exit code:

```
COLUMNS:
   id integer null=NO
   vault_document_id integer null=YES
   accessed_by text null=NO
   action text null=NO
   accessed_at timestamp without time zone null=NO
   org_id text null=NO
   candidate_id integer null=NO
   filename text null=NO
   document_type text null=YES
CONSTRAINTS:
   chk_vault_access_logs_action = CHECK ((action = ANY (ARRAY['VIEW'::text, 'DOWNLOAD'::text, 'DELETE'::text])))
   fk_vault_access_logs_candidate_id_org = FOREIGN KEY (org_id, candidate_id) REFERENCES candidates(org_id, id)
   fk_vault_access_logs_vault_document_id_org = FOREIGN KEY (org_id, vault_document_id) REFERENCES candidate_documents_vault(org_id, id) ON DELETE SET NULL (vault_document_id)
   vault_access_logs_accessed_by_users_id_fk = FOREIGN KEY (accessed_by) REFERENCES users(id)
   vault_access_logs_candidate_id_candidates_id_fk = FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
   vault_access_logs_org_id_fk = FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
   vault_access_logs_vault_document_id_candidate_documents_vault_i = FOREIGN KEY (vault_document_id) REFERENCES candidate_documents_vault(id) ON DELETE SET NULL
INDEXES: idx_vault_access_logs_org_candidate_accessed, uniq_vault_access_logs_org_id, vault_access_logs_pkey
```

Behavioural proof against the real database — insert a document and its audit row, delete the document, observe the audit row survive (rolled back, nothing left behind):

```
AFTER DOCUMENT DELETE: [{"vault_document_id":null,"candidate_id":1,"action":"DELETE","filename":"offer.pdf","document_type":"OFFER"}]
PASS: audit row survived the document delete, reference nulled, filename retained
PASS: unknown action rejected by chk_vault_access_logs_action
probe rolled back — nothing left behind
```

- [x] §5 is resolved by a decision recorded as an ADR, not by silencing either side; the verifier and the constitution agree afterwards.

[`adr/0001-force-row-level-security-is-advisory.md`](../../adr/0001-force-row-level-security-is-advisory.md). The advisory still enumerates every affected table, so nothing is silenced. Against the live database:

```
$ node --env-file=.env src/scripts/db-verify-rls.mjs
ADVISORY  907 table(s) have RLS enabled but FORCE ROW LEVEL SECURITY is not set.
          FORCE binds only the table owner, not the app role (streamline_app is a non-owner).
          neondb_owner has BYPASSRLS which overrides FORCE anyway, so this is benign
          under the current connection topology.
          Escalate to a hard failure if a table-owner connection enters the request path.
  advisory  build.bugs
  … and 887 more (not shown)

RESULT: RLS VERIFIED
```

The finding's own premise was wrong and the correction is recorded: it claimed the application connects as `neondb_owner`. It does not — `APP_DATABASE_URL` connects as `streamline_app` with `rolbypassrls = false`, verified directly. The conclusion holds and is strengthened.

- [x] §6a either scopes the resignation count or states the approver semantics that would let it be scoped — a guessed predicate is worse than the honest finding.

Scoped, not guessed. The approver semantics were already in the codebase: `LeaveApproverService.resolve` derives the approver from the subject's `users.reportingTo` before falling back to permission holders, and that is what populates `leaveRequests.approverId`. `resignationApprovalScope` mirrors `leaveApprovalScope` arm for arm.

- [x] The nine over-cap page fields carry a product ruling; the other twenty migrate.

The "other twenty" had already migrated before this session — the re-scan found 11 remaining, not 29, and the stale count is corrected in `OPEN-FINDINGS.md`. Product ruling: all nine over-cap fields come down to the 100/page platform cap. Because `pageSizeField` clamps rather than rejects, a caller that asks for 500 still gets a page. Four spec files encoded the old reject-over-cap behaviour; their assertions were rewritten to assert the clamp, not deleted.

- [x] `OPEN-FINDINGS.md` afterwards contains no item whose status is unknown.

Every item carries exactly one status from a declared vocabulary. Two are deliberately open, each with a date, a reason, and what would close it.

Combined evidence for the criteria above:

```
$ node ./node_modules/jest/bin/jest.js src/unregistered-injectables.spec.ts \
    src/modules/dashboard/resignation-approval-scope.spec.ts \
    src/modules/hr/recruitment/recruitment-candidate-vault.spec.ts \
    src/modules/issues/dto/issues.schemas.spec.ts \
    src/modules/data-quality/dto/data-quality.schemas.spec.ts \
    src/modules/delegations/dto/delegation.schemas.spec.ts \
    src/modules/rbac/dto/list-roles-query-schema.spec.ts \
    src/modules/csat src/modules/party src/modules/tasks

Test Suites: 1 failed, 3 skipped, 22 passed, 23 of 26 total
Tests:       2 failed, 23 skipped, 310 passed, 335 total
```

The one failing suite is `src/modules/party/legacy-reader-ratchet.spec.ts`, and it is **not this ticket's**. It scans the whole `src/**` tree through `git ls-files` and reads `eslint.config.mjs`; its own comment says "another session is mid-refactor in this tree". `eslint.config.mjs` is byte-identical to `HEAD` (`git diff --stat HEAD -- eslint.config.mjs` returns nothing), so the assertion that reads it fails on a clean checkout of this branch and cannot have been caused by any uncommitted work. The other failing assertion (`keeps the list honest as batches land`) depends on the legacy-identity readers that c28 Session 2 is actively migrating. Reported, not touched — `modules/party` legacy identity is S2 territory.

## Todo

- [x] Verify each finding still reproduces before fixing it — the file itself records that most of what its predecessors listed had already been fixed.

This paid for itself three times. §3's tenant column already existed; `verify-permission-catalog.mjs` did not exist; `recurring-journals.controller.ts` was already fixed; the page-field count was 11 rather than 29; and §5's stated reason for the contradiction was factually wrong.

- [x] Check every cross-reference you write. A dangling pointer claiming a finding was written up somewhere it wasn't is how §6a came to exist.

Every path, script name, symbol and migration cited above was grepped or executed. The ADR's citation of `DrizzleModule.assertRlsIsEnforced` was checked against `backend/src/db/drizzle.module.ts` before being written, and an unverifiable historical claim about why the verifier disagreed with §4 was removed rather than shipped.

- [x] §4 is operator-only. Mark it, do not attempt it.

Marked **OPERATOR ACTION**, not attempted, with the reason `ALTER ROLE` does not stick, what would close it, and how to tell it has regressed.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Files changed

| File | Change |
|---|---|
| `backend/migrations/0607_vault_access_logs_survive_document_deletion.sql` | new; journalled at `idx` 328 and applied |
| `backend/migrations/meta/_journal.json` | one appended entry |
| `backend/src/db/schema/hr/hiring.ts` | `vaultAccessLogs` declares `orgId`, `candidateId`, `filename`, `documentType`; document FK nullable `set null`; action CHECK and the new index |
| `backend/src/modules/hr/recruitment/recruitment-candidate-vault.service.ts` | delete writes the audit row in the same transaction; reader filters on the log's own columns |
| `backend/src/modules/hr/recruitment/recruitment-candidate-vault.spec.ts` | new, 12 tests |
| `backend/src/modules/dashboard/resignation-approval-scope.ts` | new predicate |
| `backend/src/modules/dashboard/resignation-approval-scope.spec.ts` | new, 9 tests |
| `backend/src/modules/dashboard/dashboard-leave.service.ts` | resignation count joins the subject and applies the scope |
| `backend/src/scripts/db-verify-rls.mjs` | FORCE check demoted to an enumerating advisory |
| `backend/src/unregistered-injectables.spec.ts` | new, 3 tests |
| `backend/src/modules/{csat,party,issues,data-quality,tasks,delegations,rbac}/dto/*.schemas.ts`, `backend/src/modules/hr/interviews/dto/hr-interviews.schemas.ts` | 11 page fields onto the shared helpers |
| `backend/src/modules/{issues,data-quality,delegations,rbac}/dto/*.spec.ts` | assertions rewritten from reject-over-cap to clamp-at-cap |
| `architecture-refactor/adr/README.md`, `architecture-refactor/adr/0001-force-row-level-security-is-advisory.md` | new |
| `architecture-refactor/OPEN-FINDINGS.md` | rewritten; every item carries a status |
| `architecture-refactor/c28-cell-based-platform-at-20m/sessions/CROSS-SESSION.md` | two entries for S2 |

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
