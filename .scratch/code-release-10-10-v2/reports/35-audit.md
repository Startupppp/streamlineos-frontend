# Ticket 35 — Compliance decisions and privacy drills · audit at head

**Audited:** 2026-09-03 (UTC+5:30), read-only.
**Frontend/root head:** `ab6a77a6982add0b6f179f3e99a139486999ced1` (`release/code-10-10-v2`)
**Backend head:** `66f09164f7056b377331bcc1fff5f128ada06b95` (`release/code-10-10-v2`)
**Prior report:** none. Evidence reconstructed from scratch.
**Databases used:** local `scratch_head_1010` (owner `tarunchintakunta` and non-owner
`streamline_app`, `bypassrls=false`) and local `scratch_cold_1010` (owner). No remote,
no writes that were not rolled back.

---

## 0. Evidence staleness — checked first, and it is small

A large evidence tree for tickets 32–36 already exists at head, committed as `ab6a77a69`
("docs(ops): production-ops evidence for tickets 32-36"). It cites backend `45f8a2e99` and
frontend `7469d2789`. Measured distance to head:

| | commits behind head | files changed since | any touch compliance/privacy code? |
|---|---|---|---|
| backend `45f8a2e99` | 4 | 1 (`src/common/pagination/list-query.schema.spec.ts`, +14/-2) | no |
| frontend `7469d2789` | 3 | the evidence commit itself + 2 unrelated a11y/type fixes | no |

So the prior bundle's *code* claims are still current-head claims. Where I re-ran a
command and got a different answer, it was because the shared `scratch_head_1010` has
grown under 26 concurrent agents, not because the code moved. Every such divergence is
called out below.

---

## 1. What I read, with numbers

### Documents

| Artifact | Size | How much I read |
|---|---|---|
| `.scratch/code-release-10-10-v2/issues/35-compliance-privacy-drills.md` | 2,228 B | in full (10 criteria) |
| `architecture-refactor/DATA-CATALOGUE.md` | 698 lines, 19 §§, 16 tables | §0, §0.1, §1, §1.1 in full; all 19 section headers; all 16 table header rows |
| `architecture-refactor/runbooks/RB-10-privacy-compliance-decisions.md` | 29,850 B | header + §6 references via the evidence bundle |
| `architecture-refactor/decisions/README.md` (the decision template) | 1,753 B | in full |
| `decisions/operator-access-2026-09-03.md` | 16,398 B | identity + approval block |
| `decisions/privacy-C184-pii-policy.md` | 19,981 B | identity + approval block |
| `decisions/privacy-C185-provider-approvals.md` | 17,721 B | identity + approval block |
| `decisions/release-authority-2026-09-03-UNSIGNED.md` | 20,812 B | §1–§2 + approval block |
| evidence `42-production-ops/` | **303 files, 2.1 MB, 16 subdirectories** | dir census of all 16; read `RB-10-privacy-compliance/README.md` + `FINDINGS.md` (first 120 of ~350 lines) + 3 run files verbatim; `break-glass/README.md` (first 220 lines) + 2 run files verbatim; all 5 `data-catalogue-c183/` files; `release-authority/DEFERRED-CHECKBOX-LEDGER.md` (C189 entries) |
| sibling audit reports | **31 `NN-audit.md`** | P0/P1 token census across all 31 |

### Backend code

| Surface | Files | Lines | Read |
|---|---|---|---|
| `src/modules/platform/` (operator / break-glass) | 22 | 3,532 | `platform-operator-access.controller.ts` (180), `platform-operator-access.service.ts` (445), `operator-session.guard.ts` (61), `require-operator-grant.decorator.ts` (7), `platform-operator-customer.controller.ts` (33) — **all 5 in full** |
| `src/modules/gdpr/` | 47 | 9,969 | `gdpr-export.service.ts` (251), `gdpr-subject-erasure.service.ts` (259), `gdpr-storage-purge.service.ts` (244), `gdpr-export-outbox.consumer.ts` (80) in full; `gdpr.controller.ts` and `gdpr-export-worker-implementation.ts` in the relevant spans |
| `src/modules/hr/governance/` (retention + legal holds) | 27 | — | `legal-hold-check.helper.ts` (45) in full; `retention.service.ts` `processRequest`/`exportSubjectData`/`anonymizeSubject` in full; `retention.controller.ts` route list |
| cron retention/purge services | **14** | — | all 14 grepped for legal-hold reach; `cron-mail-retention.service.ts` and `cron-gdpr-export-retention.service.ts` read |
| `src/common/tenant/` plumbing | — | — | `tenant-db.ts` (25) in full, `run-in-tenant-transaction.ts` (76) in full, `tenant-context.interceptor.ts` `resolveTenant`+`intercept`, `with-tenant.ts` `withTenant` |
| `src/common/rbac/platform-operators.ts` | 1 | 46 | in full |
| compliance drill scripts | **10** | — | `check-retention-coverage.mjs` (query + exit logic), `check-evidence-seal.mjs` (header + `verifySeal`) |

Route counts measured, not assumed:

- `GdprController` — **8 routes** (`export/me`, `rectification/me`, `export/:personId`, `export-async/me`, `export-async/:personId`, `export-async/:jobId/status`, `export-async/:jobId/download`, `erasure/:subjectId`).
- `PlatformOperatorAccessController` — **6 routes** (create/approve/reject/list grants, revoke, list logs).
- `PlatformOperatorCustomerController` — **2 routes**, and these are the *entire* grant-gated data plane.
- `OperatorScope` union — **5 values**; **2** are enforced by a route, 3 enforce nothing.

### Commands actually run (with real exit codes)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm run check:evidence-seal` (backend) | **1** | 6 seals, 68/68 sealed files match, **1 BROKEN** — `data-catalogue-c183` |
| 2 | `psql` — constraints/RLS/indexes on `operator_access_grants`, `operator_access_log` | 0 | see F-4, F-11, F-12 |
| 3 | `psql` as `streamline_app` — 5 no-GUC reads/writes on the operator tables | error | **42501** `no tenant context` on every one |
| 4 | `psql` — catalogue census (`information_schema`) | 0 | 1,028 base tables (1,027 excl. `drizzle`), 13,536 columns — **exactly the DATA-CATALOGUE numbers** |
| 5 | `psql -f data-catalogue-c183/pd-column-scan.sql` (into scratchpad) | 0 | **296 PD columns / 136 tables — reproduces the sealed CSV byte-for-byte (15,509 B)** |
| 6 | shell diff of all 136 scanned tables against `DATA-CATALOGUE.md`, strict word-boundary match | 0 | **0 not named — the coverage claim holds** |
| 7 | `check-retention-coverage.mjs` vs `scratch_head_1010` | **1** | 2–3 high-growth tables, 1–2 uncovered (`payroll_journal_batch_lines`, `payroll_line_items`) |
| 8 | `check-retention-coverage.mjs` vs `scratch_cold_1010` | **0** | `highGrowthTables: 0` — **vacuous green over a fully-migrated 944-table schema** |
| 9 | same, `--threshold-mb=0.001` vs cold | **0** | identical — integer division proven |
| 10 | `check-retention-coverage.mjs --self-test` | 0 | 22/22, but never touches a database |
| 11 | `psql -f probes/search-vector-deletion-probe.sql` (GUC set, wrapped in ROLLBACK) | 0 | search + vector deletion reproduce; **plan divergence noted in §3, C187** |
| 12 | `psql` — `organization_people` / `hr_employee_sensitive_fields` column census | 0 | 13 and 23 PII columns respectively (evidence for P0-1) |

**NOT MEASURED, and why.** No deployed environment exists on this machine: no TLS
endpoint, no R2/S3 bucket, no provisioned Redis, no PITR, no backup system, no replica.
Every criterion below whose wording contains the word "deployed" is therefore assessed
against code + local Postgres and explicitly marked. I did not run `npm run build`,
`typecheck` or a bare `jest` (laptop budget).

---

## 2. Headline

The prior evidence bundle is honest, self-correcting and unusually good. It found three
real break-glass defects and four real drill defects, and it forged nothing — all 24
approval rows across the four decision records are verifiably blank.

But it audited the **scripts** and the **`gdpr` module**, and the product does not use
either. The erasure and export a customer can actually reach through the StreamlineOS
UI go through `RetentionService`, not `GdprSubjectErasureService`, and they are two-column
and four-field stubs that mark the request `completed`. That is the finding this ticket
exists to catch, and no prior artifact names it.

Second, the operator/break-glass management plane cannot function in a deployed
non-owner configuration: five of its six routes and its expiry cron read the grant tables
outside a tenant transaction, where `app.current_org_id()` *raises* rather than returning
NULL.

**Verdict: not-met.** 0 of 10 criteria fully met. 4 partially met, 6 not met.

---

## 3. Per-criterion assessment

### PRD-C180 — Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation

**Status: not-met.** Two halves: the *approval* (human) and the *mechanism* (code). Both fail.

**Approval half.** `decisions/operator-access-2026-09-03.md` exists, is well-argued, and is
explicitly labelled `UNSIGNED DRAFT — NOT AN APPROVAL`. Its approval table has 6 rows
(Product, Security, Privacy/DPO, Operations, Legal, Finance) and **all 6 are empty** —
verified by grep at lines 39–44. Decision date, status and signature are blank. Nothing is
approved.

**Mechanism half — I walked all ten named dimensions.**

| Dimension the criterion names | Where | Verdict |
|---|---|---|
| roles | `platform-operator-access.controller.ts:52` `isEligibleOperator` | **defective** — gates on TENANT roles (`isOrgOwner \|\| ADMIN\|OWNER\|ORG_ADMIN`). `isPlatformAdmin()` exists at `src/common/rbac/platform-operators.ts:44` for exactly this purpose and is never consulted here (F-9) |
| reason | `service.ts:391-397` `assertReason` — 3..1000 chars, must differ from `incidentRef` | present |
| two-person | `service.ts:143` + DB `CHECK chk_oag_self_approval` | **half-present** — both compare approver to *requester* only (F-4) |
| no-self approval | same | **defeated for the beneficiary** (F-4) |
| duration | `service.ts:27` `MAX_GRANT_DURATION_MS = 4h`, enforced at `:63-67` | present |
| expiry | `assertGrant`/`authorizeRequest` filter `expires_at > now()`; `expirePendingGrants` at `:239` | **the sweep always 500s** (F-3); active grants never transition to `expired` at all, only `pending` ones do, so a lapsed active grant produces **no `grant.expired` audit event** (F-14) |
| tenant scope | `org_id` predicate on every authorization read; RLS `tenant_isolation` on both tables | present in the data plane; **incoherent in the management plane** (F-6) |
| notification | `service.ts:104-116` emits `security.operator_access.requested`, HIGH priority, inside the grant transaction | present. Checked the transaction hazard: `NotificationDispatchService.emit` writes an outbox/persists rows — it does **not** make a provider call — so this is not the "provider call inside a transaction" shape. It is a long transaction, not a defect |
| immutable audit | `operator_access_log` | **not immutable** (F-5); and the audit **viewer** shows the oldest rows only (F-12) |
| revocation | `service.ts:354-389` | code correct; **route always 500s deployed** (F-3) |

Only 4 of 10 dimensions are clean.

### PRD-C181 — Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases

**Status: partially-met (local only), and the surface is two routes.**

The **entire** grant-gated HTTP surface is 2 routes — `GET /platform/operator/organizations/:orgId`
and `.../billing`. I verified this by grepping `RequireOperatorGrant` across `src`: 2
usages, both in `platform-operator-customer.controller.ts`. The guard is correctly wired
(`@UseGuards(OperatorSessionGuard)` on the class, `OperatorSessionGuard` provided in
`platform.module.ts:26`) — **not an inert gate**. Three of the five declared scopes
(`read_messages`, `read_leads`, `manage_subscription`) are enforced by no route (F-13).

The drill `break-glass/drill-c181-sensitive-route-rejections.mjs` replays the service's
own SQL against the non-owner role and reports **9/10, exit 1**. I re-read its captured
output and independently confirmed its one failure against the live catalog:

| Case | Drill | My independent check |
|---|---|---|
| expired | PASS | `gt(expiresAt, now)` at `service.ts:334` — confirmed by reading |
| revoked | PASS | `status='active' AND revoked_at IS NULL` at `:333,335` — confirmed |
| cross-tenant | PASS | `org_id` predicate + RLS `tenant_isolation` `USING (org_id = app.current_org_id())`, `roles={public}` — **confirmed against `pg_policies`** |
| wrong scope | PASS | `scope = :scope` at `:332` — confirmed |
| concurrent approval | PASS | conditional `UPDATE … WHERE status='pending'` at `:149-159` — confirmed |
| audit-write failure | PASS | select and insert share one transaction at `:323-352`, no try/catch — confirmed by reading |
| **beneficiary self-approval** | **FAIL** | **confirmed**: `chk_oag_self_approval` is `CHECK (approver_id IS NULL OR approver_id <> granted_by)` — queried from `pg_constraint`. Neither it nor `service.ts:143` mentions `operator_user_id` |

**"Deployed" is not met.** No deployed environment exists. And what the drill could not
see, because it replayed SQL with the GUC already set, is that 5 of the 6 management
routes cannot run deployed at all (F-3).

Coverage gap the prior bundle correctly flags and I confirm: `platform-operator-access.spec.ts`
and `platform-operator-access-policy.spec.ts` exercise `assertGrant` (`service.ts:211`),
which **has zero production callers**. The live path is `authorizeRequest`
(`service.ts:316`), a duplicated predicate nothing keeps in sync.

### PRD-C182 — Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using RB-10 and the decision template

**Status: not-met. Cannot be met by any agent.**

The template exists (`decisions/README.md`, 6-function approval table plus an attestation
block). RB-10 exists (29,850 B). Four instantiated records exist. I grepped the approval
tables of every file in `decisions/`:

```
operator-access-2026-09-03.md      lines 39-44   6 rows, all blank
privacy-C184-pii-policy.md         lines 35-40   6 rows, all blank
privacy-C185-provider-approvals.md lines 33-38   6 rows, all blank
release-authority-…-UNSIGNED.md    lines 253-258 5 rows, all blank
```

**24 blank approval rows, 0 named decisions.** Every record carries an explicit
"UNSIGNED DRAFT — NOT AN APPROVAL" banner and the C185 record adds "NO PROVIDER BELOW IS
APPROVED". This is the correct posture — nothing is forged — but the criterion asks for
*named* decisions and there are none.

### PRD-C183 — Complete DATA-CATALOGUE.md with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behaviour

**Status: partially-met — the strongest artifact in this ticket, and I verified it rather
than trusting it.**

All eight dimensions appear as table columns across the catalogue's 16 tables (`Purpose`,
`Lawful basis`, `Subjects`, `Processor & location`, `Retention`, `Owner`,
`Deletion behaviour`; `Data class` / `Art. 9` where applicable).

I re-derived every scan number independently:

| Claim in §0/§0.1 | My measurement | Agrees? |
|---|---|---|
| Base tables scanned 1,027 (`public` 944, `build` 80, `build_events` 3, `drizzle` excluded) | 1,028 total; 944 / 80 / 3 / 1 | **yes, exactly** |
| Columns scanned 13,536 (12,580 / 929 / 27) | identical | **yes, exactly** |
| Direct PD columns 296 across 136 tables | re-ran `pd-column-scan.sql`: `TOTAL_DIRECT_COLUMNS 296`, `TOTAL_DISTINCT_TABLES 136`; output CSV 15,509 B — identical size to the sealed one | **yes, exactly** |
| "every one of the 136 tables the scan flagged is named somewhere in this file" | diffed all 136 against the file text, both substring and strict word-boundary: **0 unnamed** | **yes** |

The method's two stated limits are real and correctly stated: name-pattern matching
cannot see PII inside `jsonb` or free text (602 free-text + 45 `jsonb` columns handled as
a class in §14), and cannot see a column whose name does not betray its contents.

Why only *partially*-met: the file's own first line is
`**Status: AWAITING OPERATOR APPROVAL. Nothing in this file is approved.**`, many retention
cells read `DECISION REQUIRED`, and §19 (Approval record) is unsigned. Also, its evidence
bundle is the one directory whose seal is broken (F-10).

### PRD-C184 — Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties

**Status: not-met (analysis present, decision absent).**

`decisions/privacy-C184-pii-policy.md` (19,981 B) covers the six named topics and scopes
itself precisely ("1,027 base tables / 13,536 columns scanned; 296 personal-data columns
across 136 tables"), which matches my own measurement. `INCIDENT-RESPONSE.md` (349 lines)
was added in the same commit and covers breach handling. But the record decides nothing:
6 blank approval rows, blank decision date, blank decision status.

### PRD-C185 — Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure

**Status: not-met (register present, approval absent).**

`decisions/privacy-C185-provider-approvals.md` enumerates **15 external providers**,
derived from the calling code plus `.env.example` and `package.json` rather than from a
prior list — DATA-CATALOGUE §1 R4 records that the earlier list of 11 missed Twilio,
Cloudflare Turnstile, a TURN/STUN relay and Web Push. The record's own banner is
"**NO PROVIDER BELOW IS APPROVED**". 6 blank approval rows.

One measured substantive item worth carrying forward: DATA-CATALOGUE §1.1 R8 records that
on re-run **14 of 20 probe strings reached the AI provider unredacted**, and that *every*
Indian identifier class (PAN, GSTIN, Aadhaar, bare 10-digit mobile) passes the redaction
layer. `redactSensitiveData` exists and is on by default
(`ai-gateway-runner-call.ts:76-82`), so this is a coverage gap in the pattern set, not an
absent control. It is an input to C185's "PII minimization" decision and is unresolved.

### PRD-C186 — Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills

**Status: not-met.** Deployed: impossible here. Locally: **the drills exercised a path the
product does not expose.**

There are **two disjoint erasure/export implementations** in the backend:

| | `gdpr` module | `hr/governance/retention` |
|---|---|---|
| Erasure entry | `GdprSubjectErasureService.eraseSubject` | `RetentionService.anonymizeSubject` |
| Reachable at | `POST /gdpr/erasure/:subjectId` | `POST /hr/governance/retention/requests/:id/process` |
| Called by the frontend? | **no — 0 grep hits for `gdpr` anywhere in `frontend/`** | **yes** — `features/hr/governance/hooks/use-retention.ts:136` |
| What it erases | `organization_people`, `hr_employee_sensitive_fields`, `hr_dependents`, chat + attachments, KB, support tickets + embeddings, export artifacts, global identity, object storage; revokes sessions; bumps permissions version; writes `hr_data_requests` + `audit_logs` | `users.name` and `users.email`. **Nothing else.** |

The drill bundle exercised the left column. The product ships the right column.
This is **P0-1** below.

Dimension-by-dimension:

| Dimension | Local result | Note |
|---|---|---|
| export | drill `runs/02` PASS | but the UI-reachable export returns 4 fields (**P0-2**) |
| correction | **cannot pass by design** — `retention.service.ts:280` throws `ConflictException("Correction requests require verified field-level processing before completion")`. Meanwhile `GdprRectificationService` + `POST gdpr/rectification/me` exist and are unreachable from the UI | contradiction between the two modules |
| portability | not drilled; the actual export file download (`GET gdpr/export-async/:jobId/download`) needs object storage | NOT MEASURED |
| erasure | drill `runs/04` **FAIL exit 1** — aborts on `audit_logs`, 219 tables abandoned. I confirmed the precondition: `audit_logs_append_only` trigger present on `public.audit_logs`, firing `prevent_audit_log_mutation` | reproduces |
| legal hold | drill `runs/03` PASS 9/9 | but **TOCTOU** in the real service (F-7) and **10 of 14 retention sweeps ignore holds entirely** (F-8) |
| transfer / residency | not drilled | NOT MEASURED — needs a second region |
| cross-tenant | drill `runs/02` PASS — 0 rows under a foreign-org GUC, 1 under the correct one | reproduces the RLS semantics I verified in `pg_policies` |
| repeat-request | idempotency at `gdpr-export.service.ts:34-57,65-66`. **I verified the `ON CONFLICT` arbiter is inferrable**: `uniq_gdpr_export_jobs_org_idempotency ON (org_id, idempotency_key)` exists in `pg_indexes`. Reused key with a different subject → `BadRequestException` | clean |

### PRD-C187 — Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion

**Status: partially-met locally; the deployed half is untouchable here.**

| Store | Verdict |
|---|---|
| **search** (GIN over generated `tsvector`, 2 columns) | **proven.** I re-ran the probe: `Bitmap Index Scan on idx_kb_pages_fts` before delete, 0 rows after, with `enable_seqscan=off` |
| **vector** (pgvector HNSW, 4 columns) | **deletion proven; the "through the HNSW index" claim is not stable.** The sealed run at 21:57 planned `Index Scan using idx_kb_chunks_embedding_hnsw`. My re-run on a now-larger table planned `Index Scan using uniq_kb_article_chunks_org_id` + `Sort` — because RLS forces `org_id = current_org_id()` and the planner prefers the org index. The *result* (0 rows after delete) reproduces either way, which is what the criterion needs; the *plan* claim in `runs/17` is data-dependent and should not be restated as a property |
| **object store** | **not proven, and defective.** `purgeFromManifest` (`gdpr-storage-purge.service.ts:104-192`) drops failed keys (F-2) |
| **cache** | `bustMembershipStatusCache` + `bumpPermissionsVersion` only. Directory/profile caches not invalidated (prior F-8, corroborated by reading) |
| **downstream / analytics mirrors** | traced in `C187-downstream-store-trace.md`; no subject-level deletion path |
| **backup aging, restore-time deletion** | **NOT MEASURED.** No PITR, no backup system on this machine. Would need: a provisioned managed Postgres with PITR, a restore to a timestamp after an erasure, and a re-query of the restored snapshot for the subject |

### PRD-C188 — Run retention/legal-hold drills and store a redacted, hashed evidence bundle

**Status: partially-met.**

Drills ran and are recorded. Redaction posture is genuinely good: every subject synthetic,
every address on the reserved `.invalid` TLD, and the bundle was scanned for the scratch
password / Neon host / Upstash host / AWS key prefixes before sealing.

Three problems:

1. **The hash gate is red at head.** `npm run check:evidence-seal` → **exit 1**. Five of
   six seals use `hashes: {name: sha256}`; `data-catalogue-c183/artifact-hashes.json` uses
   `artifacts: [{file, sha256}]`, which `check-evidence-seal.mjs`'s
   `manifest.hashes ?? manifest.files ?? {}` cannot read. It therefore counts the seal as
   covering 0 files and every one of the 5 files in the directory as UNSEALED. I recomputed
   the 4 declared hashes by hand — **all 4 match** — and found `README.md` on disk and not
   declared. So the content is intact; the *schema* is wrong and the *seal* is inert.
   (F-10)
2. **The retention gate is vacuous, and I proved it two ways.** Against
   `scratch_cold_1010` — 944 tables, all 677 migrations applied —
   `check:retention-coverage` reports `{"highGrowthTables":0,"covered":0,"uncovered":0}`
   and **exits 0**, even at `--threshold-mb=0.001`. `pg_total_relation_size(c.oid) / 1048576`
   at `check-retention-coverage.mjs:291` is integer division; on `scratch_head_1010` it
   sees 3 tables ≥1 MB while the float formula sees **41 tables ≥0.1 MB**. There is no
   anti-vacuity floor at `:342-351`. (F-11)
3. **The bundle's own summary is now false at head.** `RB-10-privacy-compliance/README.md`
   states "After sealing: **5 seals, 68/68 sealed files match, 0 broken, exit 0**". At head
   it is 6 seals, 68/68 match, **1 broken, exit 1** — the C183 seal was written 13 minutes
   after that sentence.

New, and not in any prior artifact: at head the retention gate **fails** on
`scratch_head_1010` naming `payroll_journal_batch_lines` (2 MB) and `payroll_line_items`
(1 MB) as having no retention decision. Two payroll tables with no retention policy is a
genuine C188 gap independent of the gate's bug.

### PRD-C189 — Close or formally disposition every production/security/privacy/compliance P0/P1 finding

**Status: not-met.**

`DEFERRED-CHECKBOX-LEDGER.md:376-383` classes C189 as HUMAN and `:317` argues "the register
is empty for the reason that blocks the criterion" — i.e. production findings need
deployed drills. That reasoning covers *production* findings. It does not cover the
**security/privacy/compliance** findings the criterion also names, which exist at head and
are not dispositioned anywhere:

- `break-glass/README.md` — P0-1, P0-2, P1-1
- `RB-10-privacy-compliance/FINDINGS.md` — 10 findings (3×P1, 7×P2)
- **31 sibling audit reports** under `.scratch/code-release-10-10-v2/reports/`; **26 of
  the 31** mention P0 or P1 at least once (token census: 0–29 P0 tokens and 3–28 P1
  tokens per report)
- this report — 3 P0, 7 P1

I searched `architecture-refactor/` for any consolidated register (`*finding*register*`,
`*risk-register*`, `*RESIDUAL*`): **none exists.** There is no artifact that a human could
sign to disposition these, and no owner is assigned to any of them. (F-15)

---

## 4. Findings

Severity per the wave rubric. Where the prior bundle assigned a different severity to the
same defect I say so.

| # | Sev | file:line | Summary |
|---|---|---|---|
| P0-1 | **P0** | `backend/src/modules/hr/governance/retention/retention.service.ts:451` | The only erasure the product's UI can reach rewrites 2 columns and marks the request `completed` |
| P0-2 | **P0** | `backend/src/modules/hr/governance/retention/retention.service.ts:436` | The only export the product's UI can reach returns 4 fields and marks the request `completed` |
| P0-3 | **P0** | `backend/src/modules/platform/platform-operator-access.service.ts:240` | `/cron/operator-grant-expiry` raises SQLSTATE 42501 on every run in a deployed non-owner configuration |
| P1-4 | P1 | `backend/src/modules/platform/platform-operator-access.service.ts:143` | The beneficiary of a break-glass grant can approve their own access (*prior bundle: P0-2*) |
| P1-5 | P1 | migration `0930_audit_logs_append_only_trigger.sql` / absent for `operator_access_log` | The app role can UPDATE and DELETE the break-glass audit trail (*prior bundle: P0-1*) |
| P1-6 | P1 | `backend/src/modules/platform/platform-operator-access.controller.ts:135,150,95,117,168` | Cross-org grant management is half-wired: create works cross-org, approve/reject/revoke/list do not, and list returns `[]` instead of an error |
| P1-7 | P1 | `backend/src/modules/gdpr/gdpr-subject-erasure.service.ts:110` | Legal-hold check is read outside the erasure transaction and never re-checked inside it |
| P1-8 | P1 | `backend/src/modules/gdpr/gdpr-storage-purge.service.ts:169` | Failed object deletes are counted and discarded; `storage_pending_purge` exists and is never written by the subject path |
| P1-9 | P1 | `backend/src/modules/cron/cron-mail-retention.service.ts:91` | 10 of 14 retention/purge sweeps delete on schedule with no legal-hold check |
| P1-10 | P1 | `backend/src/modules/platform/platform-operator-access.controller.ts:52` | The break-glass management plane is gated on tenant roles while `isPlatformAdmin()` exists unused |
| P2-11 | P2 | `evidence/42-production-ops/data-catalogue-c183/artifact-hashes.json:1` | Seal uses a schema the verifier cannot read; `check:evidence-seal` exits 1 at head |
| P2-12 | P2 | `backend/src/scripts/check-retention-coverage.mjs:291,342-351` | Integer division + no anti-vacuity floor: exits 0 having measured 0 tables |
| P2-13 | P2 | `backend/src/modules/platform/platform-operator-access.service.ts:442` | Operator audit log is served oldest-first; the supporting index is `(org_id, accessed_at DESC)` |
| P2-14 | P2 | `backend/src/modules/platform/platform-operator-access.service.ts:414-427` | `listGrants` has no LIMIT and its DTO has no limit parameter |
| P2-15 | P2 | `backend/src/modules/platform/platform-operator-access.service.ts:239` | Active grants never transition to `expired`; no `grant.expired` audit event is ever written for a lapsed active grant |
| P2-16 | P2 | `backend/src/modules/platform/platform-operator-access.service.ts:20-25,211,286` | 3 of 5 declared `OperatorScope` values enforce nothing; `assertGrant`/`assertAndLog`/`recordAccess` have no production callers |
| P2-17 | P2 | `architecture-refactor/` (absent) | No consolidated P0/P1 finding register exists for C189 to disposition |

### P0-1 · The UI-reachable erasure erases almost nothing

`retention.service.ts:451`:

```ts
private async anonymizeSubject(orgId: string, subjectUserId: string): Promise<void> {
  await this.assertSubjectInOrg(orgId, subjectUserId);
  const [{ value: memberships }] = await this.db
    .select({ value: count() }).from(organizationMembers)
    .where(eq(organizationMembers.userId, subjectUserId));
  if (Number(memberships) > 1) throw new BadRequestException(…);
  await this.db.update(users)
    .set({ name: "Anonymized User", email: `anonymized_${subjectUserId}@removed.invalid` })
    .where(eq(users.id, subjectUserId));
}
```

That is the whole function. `processRequest` then sets
`status: "completed", completedAt: …` at `:323` and audits
`data_request.processing_completed`.

**Failure scenario.** An employee submits a deletion request. An HR admin holding
`hr:retention:manage` approves it and clicks Process in
`features/hr/governance/components/data-requests-tab.tsx`. The request goes to
`POST /hr/governance/retention/requests/:id/process` (`use-retention.ts:136`). Two columns
on `users` are rewritten. The following survive, verified against
`information_schema.columns` on `scratch_head_1010`:

- `organization_people` — **13 PII columns**: `first_name`, `last_name`, `display_name`,
  `preferred_name`, `personal_email`, `work_email`, `phone`, `address`, `date_of_birth`,
  `gender`, `nationality`, `emergency_contact`, `avatar_url`
- `hr_employee_sensitive_fields` — **23 columns**, including `bank_details`, `tax_id`,
  `pan_number`, `national_id`, `passport_number`, `medical_notes`, `blood_group`,
  `disciplinary_records`, `grievance_records` — GDPR Art. 9 special-category data
- plus chat messages and attachments, KB content, support tickets and their embeddings,
  the subject's own completed GDPR export archive in object storage, and every live session

The request record and the audit log both say the erasure completed. A DSAR response
generated from this record would be false.

`GdprSubjectErasureService.eraseSubject` does all of this correctly. Grep for
`eraseSubject(` across `src` returns exactly two hits: its definition and
`gdpr.controller.ts:188`. Grep for `gdpr` across the entire `frontend/` tree
(excluding `node_modules` and `.next`) returns **0 hits**. The correct implementation is
unreachable from the product.

**Fix.** `RetentionService.processRequest` must delegate `delete`/`anonymize` to
`GdprSubjectErasureService.eraseSubject` (and `export` to `GdprExportService.create` —
see P0-2), rather than carrying its own stub. Until it does, a release-blocking assertion
belongs beside it: a spec that fails if `anonymizeSubject` touches fewer than the tables
`DRY_RUN_TABLES` (`gdpr-subject-erasure.service.ts:56-71`) enumerates.

### P0-2 · The UI-reachable export exports four fields

`retention.service.ts:436` returns
`{ exportedAt, subjectUserId, orgId, profile: { id, email, name, createdAt } }`.
`GdprExportWorkerService.process` (`gdpr-export-worker-implementation.ts:141+`) drains
**15 paginated sections** — memberships, employment, reporting lines, data requests,
attendance regularizations, legal holds, audit entries, AI chat conversations, AI chat
messages, AI feedback, and more — none of which the UI path uses.

**Failure scenario.** A subject exercises their Art. 15/20 right through the product. They
receive four fields they already knew. The request is marked `completed`. Portability
(C186) is not satisfied, and the compliance record says it was.

**Fix.** As P0-1 — delegate to `GdprExportService.create` and hand back the async job id.

### P0-3 · The operator-grant expiry cron always 500s deployed

`platform-operator-access.service.ts:239-247` opens with a cross-org read on `this.db`:

```ts
const grants = await this.db.select({…}).from(operatorAccessGrants)
  .where(and(eq(status,"pending"), lte(expiresAt, now), isNull(revokedAt)));
```

`this.db` is `createTenantAwareDb` (`src/common/tenant/tenant-db.ts:14-24`), which routes
to the ambient tenant transaction **when one exists** and falls through to the pool when
one does not. Its caller is `CronPlatformController.runOperatorGrantExpiry`
(`cron-platform.controller.ts:435-446`) on a `@Public()` controller
(`cron-platform.controller.ts:31`). `@Public()` means `req.user` is undefined, so
`resolveTenant` (`tenant-context.interceptor.ts:80-94`) returns `null` and
`TenantContextInterceptor` opens no transaction. There is no ambient context, so the
query hits the pool with no `app.organization_id`.

**Measured, as `streamline_app` (`bypassrls=false`), the exact SQL:**

```
ERROR:  42501: no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function current_org_id() line 7 at RAISE
```

`app.current_org_id()` **raises**; it does not return NULL. The RLS policy
`tenant_isolation` on `operator_access_grants` is `PERMISSIVE … roles={public}`, so it
applies to every non-bypassrls role — i.e. to the running service. The controller wraps
the call in `try { … } catch { throw new InternalServerErrorException("Internal server
error") }`, so the operator sees a generic 500 with the real cause only in the log.

The same no-GUC shape covers `listGrants` (`:414`), `listLogs` (`:431`), `recordAccess`
(`:294`) and `assertGrant` (`:217`) when there is no ambient context — I ran all five
statement shapes as the app role and every one raised 42501. `expirePendingGrants` is the
only one of them with a caller that has no ambient context, which is why it is the P0.

**Consequence.** Stale pending grants are never expired, no `grant.expired` audit event
is ever written, and the approval queue grows without bound.

**Fix.** Follow the codebase's own pattern: `forEachOrg` (`src/common/tenant/for-each-org.ts`)
opens a tenant transaction per org and 14 sibling cron services already use it. Replace
the cross-org select with a `forEachOrg` sweep, or wrap the whole method in an explicit
per-org `runInNewTenantTransaction`.

### P1-4 · The beneficiary can approve their own break-glass grant

Both no-self checks compare the approver with the **requester**:

- `platform-operator-access.service.ts:143` — `if (grant.grantedBy === approverId) throw new ForbiddenException(…)`
- DB, queried from `pg_constraint`: `chk_oag_self_approval CHECK ((approver_id IS NULL) OR (approver_id <> granted_by))`

Neither mentions `operator_user_id`.

**Failure scenario.** `createGrantAndLog` requires the beneficiary to be an **ACTIVE
member of the target org** (`:70-80`), and `humanOperatorId` requires the approver to hold
`ADMIN`/`OWNER`/`ORG_ADMIN` (`:52`). The intended operator is therefore very likely to be
an eligible approver — this is the *default* shape, not an exotic one. Admin M files a
grant naming operator O; O calls `POST grants/:grantId/approve`; `grantedBy (M) !== approverId (O)`
so the service check passes, and `approver_id (O) <> granted_by (M)` so the CHECK passes.
O now holds break-glass access to customer data that O approved for O.

**Fix.** Add `if (grant.operatorUserId === approverId) throw new ForbiddenException(…)` at
`:144`, and widen the constraint to
`CHECK (approver_id IS NULL OR (approver_id <> granted_by AND approver_id <> operator_user_id))`.
Because this is also a policy question, the option belongs in
`decisions/operator-access-2026-09-03.md` before it is silently closed.

### P1-5 · The break-glass audit trail is mutable

Break-glass writes to `public.operator_access_log` and never to `public.audit_logs`
(I confirmed: no reference to `auditLogs` anywhere in `src/modules/platform/`).
`audit_logs` carries the `audit_logs_append_only` trigger (verified in `pg_trigger`) and
has UPDATE/DELETE revoked from `streamline_app`. `operator_access_log` has **neither** —
I queried `pg_trigger` for it and got zero non-internal triggers. The prior bundle's
`runs/04` shows a successful `UPDATE 1` and `DELETE 1` on a real break-glass row as the
app role.

**Failure scenario.** Any code path or injection running as the application role can
rewrite `action`/`ip_address` on, or delete outright, the record of its own break-glass
access. C180's "immutable audit" is not met.

**Fix.** A migration mirroring `0930`: `REVOKE UPDATE, DELETE ON public.operator_access_log
FROM streamline_app` plus a `BEFORE UPDATE OR DELETE … FOR EACH ROW` trigger, and extend
`verify-audit-log-privileges.mjs` to assert both tables. Consider the same for
`operator_access_grants`, whose `approver_id` and `revocation_reason` are freely
rewritable today.

### P1-6 · Cross-org grant management is half-wired, and one half fails as an empty state

`createGrantAndLog` writes inside `runInNewTenantTransaction(this.db, params.orgId, …)`
(`:69`) — the **target** org's GUC — so a grant can be created for any org.
`approveGrant` (`:127`), `rejectGrant` (`:174`), `revokeGrant` (`:356`), `listGrants`
(`:414`) and `listLogs` (`:431`) all read via `this.db` with no explicit transaction, so
on an HTTP request they resolve through the tenant proxy to the ambient transaction —
whose GUC is the **caller's** org (`resolveTenant` uses `req.user?.orgId`).

**Failure scenario.** A StreamlineOS platform admin in org A files a break-glass grant for
customer org B. It is created, and org B receives a HIGH-priority security notification.
The admin then calls `GET /platform/operator-access/grants?orgId=B`. RLS filters the read
to org A, so the response is **`[]` — HTTP 200, an empty list, indistinguishable from
"no grants exist"**. `POST grants/:grantId/approve` returns
`NotFoundException("Grant not found")` because RLS hid the row. The grant can never be
approved, listed or revoked. Break-glass, whose entire purpose is vendor access to a
customer tenant, does not function for that purpose — and the failure is rendered as an
empty state, the exact shape this codebase has shipped before.

**Fix.** Decide the model explicitly. If break-glass is vendor-to-customer, every
management read must run in `runInNewTenantTransaction(this.db, targetOrgId, …)` like the
create path does, and the caller's entitlement to `targetOrgId` must be checked against
`isPlatformAdmin` (P1-10). If it is intra-tenant elevation, `orgId` must come from the
session, not the query string, and the `@AuthorizedInService` strings that say
"StreamlineOS platform admin only" must be corrected.

### P1-7 · Legal-hold TOCTOU in subject erasure

`gdpr-subject-erasure.service.ts:110` reads the hold; `:126` builds the storage manifest;
`:155` opens `this.db.transaction`. The hold is never re-read inside the transaction and
no row lock is taken on `hr_legal_holds`.

**Failure scenario.** Legal places a hold on a subject at the moment an admin triggers
erasure. The hold row is committed after `findActiveLegalHold` returns `null` and before
the erasure transaction opens. The erasure proceeds and destroys material under hold —
spoliation, with an `audit_logs` row asserting `subject.data.erased`.

**Fix.** Move the hold check inside the transaction and take `FOR SHARE` on the matching
`hr_legal_holds` rows (or `FOR UPDATE` on a hold-guard row), so a concurrent hold
serialises against the erasure instead of racing it.

### P1-8 · A failed object delete is counted and forgotten

`gdpr-storage-purge.service.ts:138-192`: each key gets 3 attempts; on final failure the key
is pushed to a local `failed[]`. `recordErasureAudit` (`:176`) persists only
`failedCount` — a number. The key itself is returned to the caller and then discarded.
There is no retry queue.

`storage_pending_purge` **exists** (`src/db/schema/common/storage-pending-purge.ts`, with
`uniq_storage_pending_purge_org_key` and `idx_storage_pending_purge_retry`) and is written
by the **organization** purge path (`organization-purge-adapters.ts:151,170,209`). The
subject purge path never touches it.

**Failure scenario.** The object store returns 503 for one of a subject's files during
erasure. Three attempts fail. The DB rows are already anonymised (the transaction
committed at `:213` before the purge at `:218`), so the `*_key` column that named the
object is gone. The file — a scanned passport, a signed document, a profile photo —
survives in the bucket permanently, unreferenced, with no record of which key failed and
no path to retry. Rebuilding the manifest later returns nothing, because the key columns
are already nulled.

**Fix.** Enqueue every `failed[]` entry into `storage_pending_purge` with
`(org_id, storage_key)` as the conflict target, and drain it from the existing retry
worker. Persist the manifest before the erasure transaction commits, not after.

### P1-9 · Most retention sweeps do not consult a legal hold

Measured across all 14 retention/purge cron services:

| legal-hold references | services |
|---|---|
| **0** | `cron-ai-usage-retention`, `cron-announcements-retention`, `cron-build-retention`, `cron-gdpr-export-retention`, `cron-kb-chunk-retention`, **`cron-mail-retention`**, `cron-notification-outbox-retention`, `cron-notification-retention`, `cron-outbox-retention`, `cron-retention-scheduler` — **10 of 14** |
| ≥1 | `cron-helpdesk-retention` (1), `cron-hr-retention` (3), `cron-org-purge-worker` (9), `cron-kb-chat-retention` (11) |

`isUnderLegalHold`/`subjectsUnderLegalHold` (`legal-hold-check.helper.ts`) have exactly
**one** importer: `retention.service.ts:18`. Three further private duplicates of the same
query exist (`gdpr-subject-erasure.service.ts:241`, `gdpr-storage-purge.service.ts:193`,
`organization-legal-hold.service.ts`).

**Failure scenario.** A litigation hold is placed on an employee. That night
`CronMailRetentionService.sweep` runs; `sweepMetadata` at `:87-107` issues
`delete(mailMessageMetadata)` on everything past the cutoff, batched, per org, with **no
hold consultation**. Mail metadata is the archetypal litigation-hold artefact. It is gone,
and the hold record still says `active`.

**Fix.** Make the hold check a shared precondition rather than an opt-in. Either route
every subject-bearing sweep through a helper that excludes held subjects, or add a
per-table `LEGAL_HOLD_SCOPED` declaration to `retention-schedule.ts` and fail the sweep
closed for any table that carries a subject reference and has no declaration.

### P1-10 · The break-glass management plane is gated on tenant roles

`platform-operator-access.controller.ts:52`:

```ts
function isEligibleOperator(user: CurrentUserContext): boolean {
  return user.isOrgOwner || ["ADMIN", "OWNER", "ORG_ADMIN"].includes(user.role);
}
```

Every route's `@AuthorizedInService` string says "StreamlineOS platform admin only". The
code enforces "any tenant admin, plus the shared `INTERNAL_API_SECRET` header".
`isPlatformAdmin()` (`src/common/rbac/platform-operators.ts:44`) exists precisely for this
— its own header comment explains that a global surface has no tenant to bind and that
tenant roles are the wrong gate — and it is used only by `access-policy.ts:144`.

Secondary: `assertInternalSecret` (`:35`) compares with `!==`, not a constant-time
comparison.

**Failure scenario.** The internal secret leaks (a log, a CI variable, a shared runbook).
Any tenant ADMIN can then create break-glass grants naming any active member of any
organization and spray HIGH-priority security notifications into other tenants. The
allowlist that would have stopped this is compiled into the binary and not called.

**Fix.** `isEligibleOperator` must be `isPlatformAdmin(user.userId)`. Use
`crypto.timingSafeEqual` for the secret.

### P2-11 · `check:evidence-seal` is red at head

`data-catalogue-c183/artifact-hashes.json` declares `{"artifacts":[{"file","sha256"}…]}`.
`check-evidence-seal.mjs:120` reads `manifest.hashes ?? manifest.files ?? {}`. The seal
resolves to `{}`, so 0 files are covered and the checker's third rule ("an unsealed file
appearing in a sealed directory") fires on all 5 files. Gate exits 1.

I recomputed the 4 declared SHA-256 values by hand: **4/4 match**. `README.md` is on disk
and undeclared. So the evidence is intact; the seal is inert and the gate is correctly
loud about it.

**Fix.** Rewrite that one seal in the `hashes: {}` shape used by the other 5 and include
`README.md`. Optionally teach `verifySeal` to accept the array form so a future writer
cannot silently produce an inert seal — but the loud failure is better than silent
acceptance, so the schema fix is the one that matters.

### P2-12 · `check:retention-coverage` can pass having measured nothing

`check-retention-coverage.mjs:291` — `pg_total_relation_size(c.oid) / 1048576` — is
integer division on a `bigint`. Every table under 1 MB reports `0`, and `--threshold-mb`
below 1 can never select anything. `:342-351` exits 1 only when `uncovered.length > 0`,
with no floor on `highGrowth.length`.

**Measured:**

| target | `highGrowthTables` | exit |
|---|---|---|
| `scratch_cold_1010` (944 tables, 677 migrations, freshly replayed) | **0** | **0 — vacuous green** |
| same, `--threshold-mb=0.001` | **0** | **0** |
| `scratch_head_1010` (same schema, data written by concurrent agents) | 2–3 | 1 |

On `scratch_head_1010` the gate's formula sees 3 tables ≥1 MB while
`pg_total_relation_size(c.oid)/1048576.0 >= 0.1` sees **41**. `audit_logs` is 229,376 B =
0.2188 MB and reports as `0`.

Note for the record: the prior bundle's F-3 states `highGrowthTables: 0` on
`scratch_head_1010`. That is no longer reproducible there — the database has grown. The
bug it describes is real and unchanged; the cold database is the reproduction that holds.

**Fix.** `/ 1048576.0`, and refuse to exit 0 when `highGrowth.length === 0`, exactly as
`check-evidence-seal.mjs` refuses on zero seals (`MIN_SEALS`, `MIN_SEALED_FILES`).

### P2-13 · The operator audit viewer shows the oldest rows

`platform-operator-access.service.ts:442` — `.orderBy(operatorAccessLog.accessedAt)`, with
no `desc()` anywhere in the file. The supporting index is
`idx_oal_org_time ON (org_id, accessed_at DESC)` — built for a newest-first read.

**Failure scenario.** An org accumulates 500+ operator-access events. A security reviewer
calls `GET /platform/operator-access/logs?orgId=…&limit=500` and receives the 500 oldest
entries. Recent break-glass access is invisible through the only route that exposes it.

**Fix.** `.orderBy(desc(operatorAccessLog.accessedAt))`, and add a cursor.

### P2-14 · `listGrants` is unbounded

`:414-427` issues `select … from operator_access_grants where …` with no `limit`.
`listGrantsQuerySchema` (`dto/platform.schemas.ts:33-36`) accepts `orgId` and `status` and
declares **no limit parameter** — unlike `listLogsQuerySchema` (`:40-43`), which caps at
500. `?status=expired` over a long-lived org returns every historical grant in one
response.

**Fix.** Add `limit` (capped) and a `createdAt` cursor to the DTO and the query.

### P2-15 · Active grants never become `expired`

`expirePendingGrants` (`:239-284`) filters `status = 'pending'`. An **active** grant that
passes `expires_at` is filtered out at authorization time but keeps `status = 'active'`
forever and never produces a `grant.expired` log row. C180 names expiry and immutable
audit together; the audit half of expiry does not exist for the grants that mattered.

### P2-16 · Declared-but-unenforced scopes and dead enforcement helpers

`OperatorScope` declares 5 values (`:20-25`). Grep for `RequireOperatorGrant` across `src`
returns 2 route usages, covering `read_customer_data` and `read_payments` only.
`read_messages`, `read_leads` and `manage_subscription` can be granted and authorize
nothing. Separately, `assertGrant` (`:211`), `assertAndLog` (`:304`) and `recordAccess`
(`:286`) have **zero** production callers — yet they are what
`platform-operator-access.spec.ts:346-386` and `platform-operator-access-policy.spec.ts:99-144`
test. The live predicate is the duplicate at `:325-338`, which nothing keeps in sync.

### P2-17 · No consolidated finding register exists

Searched `architecture-refactor/` for `*finding*register*`, `*risk-register*`,
`*RESIDUAL*`: no match. C189 asks a human to close or disposition every P0/P1; there is no
document to sign and no owner assigned. 26 of 31 sibling audit reports mention P0/P1
findings; none feeds a register.

**Fix.** One `architecture-refactor/FINDING-REGISTER.md` keyed by `<ticket>-<n>`, with
severity, `file:line`, owner, status (`closed` / `accepted` / `deferred`), and the
signature block from `decisions/README.md`. Populate it from the 31 audit reports and this
one before asking anyone to sign C189 or C194.

---

## 5. What head already gets right

Not a small list, and it should not be lost behind the findings.

- **The DATA-CATALOGUE is real and I verified it.** 1,027 base tables, 13,536 columns, 296
  PD columns across 136 tables — every number reproduced exactly, and every one of the 136
  flagged tables is named in the file under a strict word-boundary match. Revision 3
  corrected four of revision 2's own claims, including two evidence citations that pointed
  at files which do not exist. A compliance document that publicly corrects its own prior
  revision is rare and worth preserving.
- **Nothing is forged.** 24 approval rows across 4 decision records, all blank; every
  record carries an explicit "NOT AN APPROVAL" banner; the release-authority record's
  filename says UNSIGNED. I checked this specifically because it is the easiest thing for
  an automated pass to get wrong, and it is clean.
- **RLS on the operator tables is genuinely enforced.** `tenant_isolation` with
  `USING (org_id = app.current_org_id())` and `roles={public}` on both
  `operator_access_grants` and `operator_access_log`; the function *raises* rather than
  returning NULL, which converts a missing tenant context into a loud failure instead of a
  silent full-table read. That design is why P0-3 is a 500 and not a cross-tenant leak.
- **Five of C181's six rejection cases hold**, and the audit-write ordering genuinely
  fails closed: `authorizeRequest` selects and inserts inside one transaction with no
  try/catch, and `OperatorSessionGuard.canActivate` awaits it before returning true.
- **GDPR export idempotency is correct and its `ON CONFLICT` arbiter is inferrable** —
  `uniq_gdpr_export_jobs_org_idempotency ON (org_id, idempotency_key)` exists; a reused key
  with a different subject is rejected at `gdpr-export.service.ts:65-66`.
- **The `gdpr` module's erasure is thorough** where it is reachable: 14 declared tables,
  object-storage manifest captured *before* anonymisation (with a comment explaining
  exactly why), session revocation, permission-version bump, and an audit row carrying a
  hashed subject id.
- **Search and vector deletion reproduce** through their indexes with `enable_seqscan=off`.
- **The GDPR controller's gates are not inert**: `@UseGuards(PermissionGuard)` +
  `@RequirePermission("hr:retention:manage")` on every third-party route, plus an explicit
  `rbacScope` check that rejects `scope === "none"` and cross-subject access without
  `scope === "all"`.
- **`check:evidence-seal` itself is a good gate.** It refuses on zero seals, on a changed
  file, on a deleted file *and* on an unsealed file appearing in a sealed directory. It is
  the reason P2-11 is visible at all rather than passing as `0/0 match`.
- **The correction path fails loudly rather than lying.** `retention.service.ts:280`
  throws rather than marking an unimplemented correction `completed`, and audits
  `data_request.correction_manual_review_required` first. That is the right instinct — it
  is the same instinct P0-1 and P0-2 are missing.

---

## 6. Blocked on infrastructure

Named precisely, so a later wave knows what to buy rather than what to write.

| Criterion | What is missing | What would measure it |
|---|---|---|
| C181 "deployed" | a deployed environment | an HTTPS deployment of this commit, a real `INTERNAL_API_SECRET`, and an HTTP-level replay of the six rejection cases against live routes |
| C182, C184, C185, C180 (approval half) | six named humans | Product, Security, Privacy/DPO, Operations, Legal and Finance signing the four records in `architecture-refactor/decisions/` |
| C186 "deployed", transfer/residency | a second region and a deployed app | two regional deployments with distinct data residency, plus a transfer drill across them |
| C186 portability (export file) | provisioned object storage | R2/S3 credentials, then `POST gdpr/export-async/me` → `GET …/download` end to end |
| C187 object store | provisioned object storage | a bucket, then a subject erasure followed by a provider-side HEAD on every manifest key |
| C187 cache | a provisioned Redis for the app | a cache-resident subject read before and after erasure |
| C187 backup aging, restore-time deletion | PITR and a backup system | a managed Postgres with PITR, a restore to a timestamp *after* an erasure, and a re-query of the restored snapshot for the subject — this is the single largest untested claim in the ticket |
| C189 | a register and an accountable owner | `FINDING-REGISTER.md` populated from the 31 audit reports, then a human disposition per row |

Everything else in this report was measurable here and was measured.
