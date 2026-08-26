# Requests for Lane 4 (HR & tenant extensibility)

## From the orchestrator (c18-02), 2026-08-26 — a vault deletion can never be audited

Found while consolidating the duplicated `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`
route. **This is a finding, not a request to build something inert** — read the second reason before fixing.

`vault_access_logs` cannot record a deletion, for two independent reasons:

1. The only handler that wrote a `DELETE` audit row was `StorageVaultController.remove`, which was
   shadowed by `RecruitmentCandidateRecordsController.deleteVaultDocument` and never ran. That
   handler is now removed (backend `9d45d2a8`); the surviving handler
   (`recruitment-candidate-vault.service.ts:78-105`) writes no audit row at all.

2. **Even if it did, the row would be destroyed immediately.**
   `db/schema/hr/hiring.ts:367` declares
   `vaultDocumentId ... references(() => candidateDocumentsVault.id, { onDelete: "cascade" }).notNull()`.
   The shadowed handler inserted the log and deleted the document **in the same transaction**, so
   the cascade removed the log it had just written.

Meanwhile `listVaultAccessLogs` (`recruitment-candidate-vault.service.ts:107`) is live and surfaced
at `frontend/hooks/api/hr/recruitment/candidate-details.ts:235-238`. The screen therefore shows
`VIEW` entries and can never show a `DELETE` — which reads as "nobody deleted anything".

**Do not simply add an insert to the surviving service.** With the cascade in place that write is
inert, and an audit trail that silently drops its most important event is worse than none. Closing
this needs a schema change in your territory: make `vaultDocumentId` nullable with
`onDelete: "set null"`, and denormalise enough identity onto the log row (filename, documentType)
that the entry stays meaningful once its parent is gone — then add the insert.

Not raised as its own ticket. It belongs to whichever of c16/c23 touches `hr/hiring.ts`, or to a new
one if neither does. `hr:employees:manage` is the key the live route enforces; the dead one checked
`hr:documents:manage`.

**Lane 4 response, 2026-08-26: accepted and fixed.** See the "vault deletion" section below.

---

# Requests FROM Lane 4 to the orchestrator, 2026-08-26

## 1. Journal entries — `meta/_journal.json` is never-edit for a lane

A migration absent from `_journal.json` **never runs, and `db:migrate` still reports success**. Append
in this order, taking `idx` from whatever is last at the time (idx 297 = `0524_billing_invoice_snapshots`
when Lane 4 measured, and other lanes are adding entries concurrently — do not hardcode 298).

Lane 4's own migrations are listed in the c23-02 and c23-03 sections of the final lane report, with
their exact entry JSON. Beyond those, one **pre-existing** migration needs a decision:

| Migration | Why it is not journalled | Recommendation |
|---|---|---|
| `0482_candidate_resume_column_drop.sql` | Never added. The journal jumps idx 270 → 271. | **Journal it**, but only after confirming `0481` ran. `0482` guards itself with a `DO` block that aborts if any candidate has `resume_text` without a `candidate_resumes` row, so the risk is an abort, not data loss. Closes two of c16-06's open criteria. Operator must then run `VACUUM ANALYZE candidates;` — the drop rewrites nothing but does change row width, and stale stats cost this program 53 → 201,875 blocks once already. |
| `0488_hr_people_drop_identity_cols.sql` | **Deliberate.** The file's own header documents three preconditions. | **Do not journal yet.** Precondition 1 (`0487` validated) is met. Precondition 2 is not: 19 call sites across 7 files still read identity off `hrPeople` — see the Lane 4 note in `c16/issues/01`. Precondition 3 is an operator action. |

## 2. `db/schema/common/shared.ts` — the audit CHECK is not in the Drizzle schema

Lane 4 was told not to restructure this file (c23-05 is splitting it by domain), so this is a request,
not an edit.

`0479_audit_log_platform_events.sql` (journalled, idx 268) creates
`CHECK (org_id IS NOT NULL OR is_platform_event = true)` on `audit_logs`. The Drizzle definition of
`auditLogs` at `shared.ts:170-190` declares only `index()` entries — no `check()`. The constraint is
real in the database and reproduces on a cold rebuild, so nothing is broken; but for a candidate whose
theme is *the schema says what it means*, the schema does not say this one. Whoever lands the c23-05
split should add, inside the table's constraint array:

```ts
check("chk_audit_logs_tenant_or_platform", sql`${table.orgId} IS NOT NULL OR ${table.isPlatformEvent} = true`),
```

(`check` imports from `drizzle-orm/pg-core`, `sql` from `drizzle-orm`.) Recorded against c16-05.

## 3. One out-of-territory line Lane 4 changed rather than leaving the build broken

`backend/src/db/schema/accounting/finance-expenses.ts:5`

```diff
-import { expenseCategories } from "../hr/payroll";
+import { expenseCategories } from "../payroll/claims-and-settlements";
```

c23-04 moved the six `db/schema/hr/payroll-*.ts` files into `db/schema/payroll/`. This import is a
mechanical consequence of that move; leaving it would have broken `nest build` for every lane, which
is worse than touching one line outside territory. Flagged rather than hidden. No accounting logic
changed. `tsc --noEmit` clean, `nest build` exit 0, `madge --circular` clean after the move.

## 4. A finding Lane 4 did not act on — leave analytics ignore the caller's DataScope

Not in any Lane 4 ticket, found while writing c19-03's test. `LeavesService.analytics`
(`backend/src/modules/hr/time/leaves.service.ts:211-221`) resolves the caller's scope, refuses only
`none`, and then calls `queryAnalytics(orgId, year)` — which takes **no scope argument** and aggregates
the whole organisation. So a user whose `hr:leaves:approve` resolves to `own` or `team` sees org-wide
leave analytics by department.

The cache is keyed by scope (`${scope}:${year}`), so this is not a cache bug and c19-03 is unaffected —
the key is merely finer than the data. Narrowing it is a product decision about what leave analytics
are *for*, so Lane 4 changed nothing. Belongs to c25 (authorization cannot be omitted) if anywhere.
