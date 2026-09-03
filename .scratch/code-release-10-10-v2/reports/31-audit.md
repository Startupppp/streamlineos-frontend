# Ticket 31 — One-commit code-release verification — current-head audit

Auditor: read-only agent. No file in either repository was edited. This report is the only write.
Audit window: **2026-09-03 22:39 → 22:55 IST**. Every number below carries the minute it was taken,
because *head moved four times during the audit* and that movement is itself the headline finding.

---

## 0. The one-line answer

**Ticket 31 cannot be satisfied at head, and not because of any single defect.** Its twelve criteria
are all forms of one requirement — *one recorded commit pair, one set of evidence, nothing
unresolved* — and at the moment of this audit **neither repository has a clean commit, the migration
journal gained three entries in thirteen minutes, two of the migrations the evidence depends on are
untracked files, 18 of 36 blocking tickets have no report at all, and 15 P0 + 106 P1 findings stand
across the reports that do exist.**

Verdict: **not-met** on 11 of 12 criteria; **partially-met** on 1 (PRD-C157).

---

## 1. What I read, with numbers

### 1.1 Ticket, PRD and manifest

| artifact | size read |
|---|---|
| `.scratch/code-release-10-10-v2/issues/31-one-commit-code-release.md` | 2,635 bytes, 12 acceptance criteria — read in full |
| `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` | 664 lines — read §"Current completion", §"Current remaining execution list", §"Immediate code-level release candidate" (lines 167–601), §"Closure protocol", §"Deferred production-readiness evidence" |
| `.scratch/code-release-10-10-v2/TRACEABILITY.md` | 247 lines, 195 criterion rows — read in full; confirmed all 12 of my criteria map to ticket 31 and to no other ticket |
| `architecture-refactor/decisions/release-authority-2026-09-03-UNSIGNED.md` | read in full (the production release-authority record) |
| `architecture-refactor/final-refactor/evidence/SUPERSEDED-FORMER-HEAD.md` | read in full |
| `architecture-refactor/final-refactor/evidence/s02-bootstrap-parity.md` (header) + `bootstrap-head-637/README.md` + `manifest.json` | read the parity/interrupt/resume claims and the release-identity block |

### 1.2 Prior audit corpus

At **22:39** the reports directory held **18** `NN-audit.md` files; at **22:52** it held **21**.
I audited against the 18-file snapshot and name it as such.

| present at 22:39 | absent at 22:39 |
|---|---|
| 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 16, 23, 24, 25 (18 tickets, 786 KB) | **15, 17, 18, 19, 20, 21, 22, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36 (18 tickets)** |

Findings-table rows extracted across those 18 reports:

| severity | rows |
|---:|---:|
| **P0** | **15** |
| **P1** | **106** |
| P2 | 146 |

Ticket 31 is *blocked by 02–30*. **11 of the 29 blocking tickets (15, 17–22, 26–30) had no report
at the time of this audit**, so their P0/P1 census does not exist yet and the totals above are a
floor, not a total.

### 1.3 Code and catalog corpus actually measured

| thing | measured |
|---|---|
| backend files scanned by `check:cycles` | 5,750 |
| frontend files scanned by `check:cycles` | 5,371 |
| backend service files scanned by `check:unbounded-reads` | 2,305 across 74 modules |
| OpenAPI operations | 3,644 across 2,701 paths |
| `scratch_head_1010` catalog | 944 tables · 12,580 columns · 4,390 indexes · 12,951 constraints · 900 policies · 468 functions · 169 triggers · 476 enums · 608 sequences |
| `scratch_cold_1010` catalog | identical counts on all ten classes |
| `.e2e-spec.ts` files reachable by `jest-e2e.json` | **415**, of which **269 live under `.claude/worktrees/`** |
| `*.seeded-e2e-spec.ts` (the disposable-database suite) | **11** + 2 harness specs |
| gates run by me | **34** (`check:*` and `db:*`, both repos) |
| P0 findings re-verified by me at head, one by one | **15 of 15** |

---

## 2. The measurement that invalidates the ticket: head is not still

Three snapshots, thirteen minutes apart, same machine, no action by me:

| | 22:39 | 22:48 | 22:52 |
|---|---:|---:|---:|
| frontend `git status --porcelain` entries | 100 | — | **119** |
| backend `git status --porcelain` entries | 77 | — | **155** |
| `migrations/meta/_journal.json` entries | **678** | **679** | **680** |
| audit reports on disk | 18 | — | 21 |

Commit pair at the start of the window:

| | SHA | subject |
|---|---|---|
| frontend / root | `26df21488854b5ca72b938802295965783f8b948` | *fix(a11y,chat): make the Share button's name stable, and deep-import the heartbeat* |
| backend | `66f09164f7056b377331bcc1fff5f128ada06b95` | *fix(spec): probe paging style with safeParse — strict offset schemas are not defects* |

Both on `release/code-10-10-v2`. **Neither tree is clean.**

The consequence is not stylistic. Two of the migrations that the local scratch databases depend on
are **untracked working-tree files**:

```
?? migrations/1054_chat_presence_membership_unique_total.sql
?? migrations/1055_t02_affiliates_org_scoped_user_unique.sql
 M migrations/meta/_journal.json
```

`scratch_head_1010` has 678 ledger rows, i.e. it has applied `1054`. That migration exists in **no
commit**. So the catalog every DB-dependent gate reads today describes a database that cannot be
rebuilt from either SHA above. Any statement of the form "gate X was green at commit
`66f09164f`" is false by construction right now.

This is the same blocker the production release-authority record already named as its finding #2 at
21:17 — *"Neither working tree is clean, so PRD-C016's 'one clean frontend/backend commit pair' does
not exist"* — and in the ninety minutes since, both trees got **worse** (backend 21 → 155 entries).

---

## 3. Per-criterion assessment

### PRD-C008 — Calendar / Inbox / Knowledge (v2 tickets 13, 14, 16)

> *complete v2 tickets 13, 14 and 16 respectively, including provider drift, sync correctness,
> bounded read paths, ACL-aware retrieval and current performance evidence.*

**NOT MET.** All three tickets have a report; none of the three closes.

| ticket | that report's own verdict | P0 | P1 |
|---|---|---:|---:|
| 13 Calendar | 23 findings; no criterion marked met | 2 | 7 |
| 14 Inbox/mail | `PRD-C130` **partially met**, `PRD-C131` **partially met** (14-audit.md:224, :291) | 0 | 7 |
| 16 Knowledge | `PRD-C133` **partially met**, `PRD-C134` **NOT MET**, `PRD-C135` **partially met** (16-audit.md:117, :140, :165) | 1 | 7 |

Re-verified by me at head, dimension by dimension as the criterion names them:

**Provider drift / sync correctness (Calendar) — now repaired.** Both calendar P0s are gone:
`cron-platform.controller.ts:278` now calls `this.calendarProviderSyncSweep.run()` (13-F1 was "no
production caller, the queue never drains"), and `calendar-provider-webhook.service.ts` now resolves
the org from the connection row and wraps every read in `runInNewTenantTransaction`
(`:89, :117, :141, :158`) — 13-F2's "always 500s, RLS read with no tenant GUC" is fixed. *That
repair is itself what broke `check:file-sizes`; see §4.*

**Bounded read paths / sync correctness (Inbox/mail) — still open.** Three of ticket 14's seven P1s
reproduce verbatim at head:

- `src/modules/mail/mail.controller.ts` carries **no** `@NoTenantTransaction()` (grep: zero hits).
  Every `POST /mail/ai/draft` therefore holds a pooled Postgres transaction open across a Composio
  fetch *and* an LLM completion, against a 60 s `idle_in_transaction_session_timeout`. 36 other
  files already carry the decorator.
- `src/modules/mail/mail-metadata.service.ts:164` still reads
  `if (rows.length === 0 || rows.length > SEARCH_ID_CAP) return literal;` — the definer's *empty*
  answer is still discarded into a leading-wildcard ILIKE scan (measured in 14-audit at 2.2 ms/486
  buffers → 184 ms/5,006 buffers).
- `src/modules/integrations/core/integrations.service.ts` still calls neither `markStaleForAccount`
  nor `clearPositions` (grep: zero hits). Revoking a mailbox still leaves mirrored subjects, senders
  and thread ids for up to 365 days.

**ACL-aware retrieval (Knowledge) — still open, and worse than the report says.**
`src/modules/kb/retrieval/kb-candidate.service.ts:26-38` at head:

```ts
async vectorChunkIds(vector: string, cap: number): Promise<number[]> {
  if (cap === 0) return [];
  await this.db.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`);
  const annRows = await this.db.execute(
    sql`SELECT id FROM public.kb_article_chunks ORDER BY embedding <=> ${vector}::vector LIMIT ${cap}`,
  );
  const annIds = annRows.map((r) => Number(r["id"]));
  if (annIds.length > 0) return annIds;
  const fenceRows = await this.db.execute(
    sql`SELECT app.search_kb_chunk_ids(${vector}::vector, ${cap}) AS id`,
  );
  return fenceRows.map((r) => Number(r["id"]));
}
```

The `app.search_kb_chunk_ids` fence — the branch 16-audit measured returning the full 50/50 — is
reached **only when the ANN returns zero rows**. 16-audit F1's failure is a *short* return
(50 of 240 = 21%), not an empty one, so the fence never fires for it. F1 stands.
The method also takes **no `orgId` at all**: the raw ANN has no tenant predicate, so KB retrieval
tenancy rests entirely on RLS being active on that connection (16-audit F12).

**Current performance evidence** — 16-audit carries measured pgvector and temp-spill numbers;
13-audit and 14-audit carry measured buffer counts. I did not re-run any of them. **NOT MEASURED
by me.**

---

### PRD-C014 — Current P0/P1 audit (tickets 08, 15, 22 + every surviving P0/P1)

> *resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08,
> notification/email permission and delivery gaps in v2 ticket 15, security findings in v2 ticket 22,
> and every surviving P0/P1 before v2 ticket 31.*

**NOT MET**, on all four clauses.

- **Ticket 08 (Payroll)** — report exists, 2 P0 + 5 P1 + 8 P2. One of the two P0s is **repaired**
  (`journal.service.ts` now aggregates in integer paise inside Postgres with a documented MONEY
  comment; the 1000-row truncation that broke at 77 employees is gone). **The other is live** — see
  Finding 1 below.
- **Ticket 15 (notifications/email)** — **no report exists.** Its permission and delivery gaps have
  not been enumerated at all, so they can be neither resolved nor dispositioned.
- **Ticket 22 (security)** — **no report exists.** Same.
- **"every surviving P0/P1"** — 15 P0 + 106 P1 are recorded in the 18 reports that exist; **0** of
  them appear in any disposition register. The only register in the repository is §6 of the
  production release-authority record, which reads *"P0 residual risks accepted: 0 · P1 residual
  risks accepted: 0"* and explains that the table is empty *"because nobody has accepted anything,
  not because there is nothing to accept."*

I re-verified all 15 recorded P0s at head, individually:

| # | report | P0 | status at head | evidence |
|---:|---|---|---|---|
| 1 | 03-F3 / 12-F1 | chat presence `ON CONFLICT` 42P10 | **FIXED — but only in the working tree** | `migrations/1054_…sql` is **untracked**; `scratch_head_1010` shows the index TOTAL, `scratch_cold_1010` still shows it PARTIAL |
| 2 | 07-F1 | payroll input snapshot sums rupees + cents | **FIXED** | `payroll-inputs-build.service.ts:357,360` are cents-only (`amountCents`, `totalRepaymentCents`); the mixed `totalAmount` is gone |
| 3 | 08-F1 | journal truncates at 1000 lines / 77 employees | **FIXED** | `journal.service.ts:55-90` — grouped by component×cost-centre, `sum(round(amount*100))::text` |
| 4 | 08-F2 | run marked PAID with HELD payees; full net posted | **OPEN** | see Finding 1 |
| 5 | 09-F01 | `actualCost: 0` for every project | **FIXED** | `projects-budget.service.ts:153-171` computes `actualCostMinor` from billable timesheet hours × `hourlyRateMinor` |
| 6 | 10-P0a | checkout labels INR paise with the accounting base currency | **FIXED** | `billing-payment-activation.ts:190-213` — amount and currency now come from one source, documented |
| 7 | 10-P0b | editing draft lines zeroes `tax_amount`, leaves CGST/SGST | **OPEN (reduced)** | see Finding 2 |
| 8 | 10-P0c | POSTED entries with no balance assertion | **FIXED** | `journal-posting.service.ts:73-92` `assertBalanced` runs before persist |
| 9 | 10-P0d | webhook idempotency key from an unsigned header | **FIXED** | `payment-webhook-receiver.service.ts` `resolveProviderEventId` keys on the signed envelope or a SHA-256 of the signed body |
| 10 | 11-F1 | `postJournal` with no `exchangeRate` → always 400 | **FIXED** | `provider-bridge.service.ts:63-74` resolves a rate when `currency !== baseCurrency` |
| 11 | 12-F2 | FE Ably channel names lack the `cell:` prefix | **FIXED** | `chatChannelName()` + `cellPrefixed()` in `lib/ably-channel-names`, with a cross-repo contract test that re-derives the backend template |
| 12 | 13-F1 | provider-sync sweep has no caller | **FIXED** | `cron-platform.controller.ts:278` |
| 13 | 13-F2 | provider webhook always 500s | **FIXED** | `runInNewTenantTransaction` at 4 sites |
| 14 | 16-F1 | vector retrieval returns 21% of the pool | **OPEN** | fence only fires on a zero-row ANN, not a short one |
| 15 | — | *(03-F3 and 12-F1 are the same defect, counted once above)* | | |

**Net: 12 of 15 P0s repaired, 3 live, and one of the 12 exists only as untracked files.** The 106
P1s were **not** individually re-verified — I spot-checked three (all still open, §PRD-C008) and
name the rest **NOT MEASURED**.

---

### PRD-C018 — Disposable-database E2E for 15 named areas

> *Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing,
> Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.*

**NOT MET.** I did not run the suite (12 GB, forbidden under the laptop budget) — but the suite
*cannot* satisfy this criterion, because it does not contain specs for 13 of the 15 areas.

The disposable-database harness is real: `test/helpers/disposable-database.ts` exports
`assertDisposableDatabase`, used by 6 files, and `jest-e2e-seeded.json` matches exactly
`test/**/*.seeded-e2e-spec.ts` plus one harness self-test. Its entire membership:

| # | spec | C018 area it serves |
|---:|---|---|
| 1 | `test/kb/kb-page-visibility.seeded-e2e-spec.ts` | **Knowledge** |
| 2 | `test/billing/ai-credits-reserve-race.seeded-e2e-spec.ts` | **Billing** (one race, not the module) |
| 3 | `test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts` | cross-cutting (ticket 22) |
| 4 | `test/security/bola/t15-own-tenant-500.seeded-e2e-spec.ts` | cross-cutting |
| 5 | `test/security/gdpr-export-cross-module-privacy.seeded-e2e-spec.ts` | cross-cutting |
| 6 | `test/support/support-ticket-follow.seeded-e2e-spec.ts` | Support — not a C018 area |
| 7 | `test/db/postgres-error-shape.seeded-e2e-spec.ts` | infrastructure |
| 8 | `test/perf/route-budget-http.seeded-e2e-spec.ts` | performance |
| 9–11 | `test/crm/crm-tenant-isolation`, `crm-import-roundtrip`, `crm-inbound-ingress` | **CRM — explicitly out of scope** |

**Coverage against C018's fifteen named areas: 2 covered (Knowledge, Billing-partial), 13 with zero
disposable-database spec** — Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Payments,
Accounting, Chat, Calendar, Notifications, Workflows, Inbox/mail. Three of the eleven seeded specs
serve a module the release excludes.

The 143 `*.e2e-spec.ts` files under `src/` run under `jest-e2e.json`, which is **not** disposable —
it points at whatever `DATABASE_URL` is in `.env` (the shared remote Neon branch). It is not the
suite this criterion names. See Finding 3 for why its counts would be untrustworthy anyway.

---

### PRD-C019 — Record command, SHA, database identity, dataset shape, pass/fail/skip, artifacts

**NOT MET.** No such record exists for the current head, and the fields it needs are currently
unrecordable:

- **Release SHA** — not stampable: both trees dirty (§2), and the DB depends on two untracked
  migrations.
- **Database identity** — the only databases at (near) head are `scratch_head_1010` and
  `scratch_cold_1010`, and they disagree (§PRD-C159). Meanwhile the gates that read `.env` read the
  shared remote, which `check:migration-ledger` reports at **635 applied rows against 678 journal
  entries — 43 migrations pending**. Three different "the database" answers are in play.
- **Dataset shape** — `seed:scratch-e2e` exists; no seeded-shape record exists at head.
- **Pass/fail/skip counts** — the only counts recorded anywhere are the production
  release-authority record's own honest subset: *"4 passed · 1 failed · 0 inconclusive · **65 not
  run** out of 70"*.
- **Failure artifacts** — `check:evidence-seal` is **exit 1** at head with a broken seal
  (`evidence/42-production-ops/data-catalogue-c183/artifact-hashes.json` — 5 files added after
  sealing). The artifact store itself is not currently attestable.

---

### PRD-C020 — Seventeen gate families at the same commit

**NOT MET.** "At the same commit" is unavailable (§2). Setting that aside, I ran 34 gates and
mapped each named family. Results as measured 22:41–22:55:

| C020 family | gate(s) | exit | note |
|---|---|---:|---|
| backend build/typecheck | `build`, `typecheck` | — | **NOT MEASURED** — orchestrator-only under the laptop budget |
| spec typecheck | `check:spec-typecheck` | — | **NOT MEASURED** — invokes `tsc`; excluded by the same budget |
| frontend typecheck | `type-check` | — | **NOT MEASURED** — same |
| OpenAPI freshness | `check:openapi-coverage` | **0** | green, and near-vacuous: *"scanned 27 of 3644 operations (0.74%) — 3617 NOT scanned … green because the debt did not GROW"*. `openapi.json` is also uncommitted-modified. |
| | `check:operation-ids` | 0 | 3,644 ops / 2,701 paths, no duplicates |
| cycle | `check:cycles` BE / FE | 0 / 0 | 5,750 and 5,371 files, zero circular deps |
| file-size | **`check:file-sizes` BE** | **1** | `src/modules/cron/cron-platform.controller.ts` = **517 lines, unregistered** |
| | **`check:over-300` BE** | **1** | `inv-warehouses.service.ts` 301, `notification-events.catalog.ts` 301 |
| | `check:file-sizes` FE / `check:over-300` FE | 0 / 0 | 5,361 files ≤500; 515 over 300 vs baseline 516 |
| dead-code | `check:dead-code` BE | 0 | knip 0 unused files, 7 findings, all classified (1 KEEP, 2 WIRE, 2 REMOVE) |
| | **`check:dead-code` FE** | **1** | 2 unclassified exports: `hooks/api/id-cursor-page-schema.ts:idCursorPageContract`, `hooks/api/offset-page-schema.ts:offsetPageContract` |
| tenant-isolation | `check:tenant-isolation` | 0 | mapping only — its own output says *"This says the test EXISTS, not that it passes"*; `check:tenant-isolation:run` **NOT MEASURED** |
| | `check:tenant-relationships` | 0 | 0 actionable (against `scratch_head_1010`) |
| **RLS** | **`db:verify-rls`** | **2** | **INCONCLUSIVE — not a pass.** *"PREREQUISITE UNMET … the target is at 678 of 679 journal entries — 1 migration pending"* |
| permission | `check:permission-keys` BE | 0 | every `@RequirePermission` resolves |
| | `check:permission-catalog` FE | 0 | 633 route-bound permissions, byte-identical regeneration |
| | `check:permission-binding` FE | 0 | 2,385 bindings; 13 reads held back and counted |
| cache | `check:cache-invalidation` | 0 | 187 write sites / 475 invalidate sites / 131 factories |
| | `check:cache-key-shapes` | 0 | |
| outbox | `check:outbox-consumers` | 0 | 29 declared = 29 registered |
| idempotency | `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| | `check:conflict-targets` | 0 | shrink-only, 0 ratcheted |
| migration | `check:migration-chain` | 0 | |
| | `check:migration-ledger` | 0 | **but reports 43 pending against the `.env` target** |
| | `check:migration-discipline` | 0 | |
| | `check:migration-rollback` | 0 | 680 migrations scanned |
| | **`check:replay-ledger`** | **1** | cold DB missing `1054_chat_presence_membership_unique_total` |
| | `check:declaration-column-drift` | 0 | against `scratch_head_1010` |
| | `check:declaration-constraint-drift` | 0 | 873 tables; 136 integrity + 51 perf findings **baselined**, 0 new |
| | `check:referential-action-drift` | 0 | 4 PERMISSIVE + 1 WEAK divergence baselined |
| | `check:set-null-column-lists` | 0 | 564 declared / 805 catalog |
| vulnerability | `check:vulnerabilities` | 0 | no high/critical in prod deps |
| license | `check:licenses` | 0 | 2 exceptions, one marked **"OWNER: PENDING LEGAL REVIEW — NOT a legal sign-off"** |
| **SBOM** | — | **n/a** | **No SBOM *gate* exists.** `sbom:generate` + `sbom:generate:self-test` are a generator; `sbom.json` (231 KB) was written 07:39 today and nothing verifies it is fresh at the commit. |

Additional reds found while sweeping, all inside C020's scope by implication:

| gate | exit | detail |
|---|---:|---|
| `check:unbounded-reads` | **1** | 2 unclassified paths: `hr/lifecycle/hr-dashboard-attendance.ts:94,:108`, `invoices/invoices-update.service.ts:127` |
| `check:evidence-seal` | **1** | 1 broken seal, 5 files added to a sealed directory |
| `check:baseline-integrity` | **1** | `check-envelope-consistency.mjs :: MAX_HOPS = 8` unregistered — a **net raise of 8** |
| `check:type-assertions` BE | **1** | 1 stale ceiling entry (`support-sla.controller.ts`) |
| `check:benchmark-manifest` | **1** | 154/280 (55.0%) statement ceilings measured |
| `check:web-vitals-budget` FE | **1** | 1 CLS breach (0.0977–0.109 against a 0.1 budget, mobile profile) |
| `check:route-bundle-budget` FE | **1** | **18** breaches, incl. `/crm/leads` +63 KB and `/parties` +94 KB |

**Tally of what I actually ran: 34 gates — 22 exit 0, 11 exit 1, 1 exit 2.** Three gate families
(build, typecheck ×2, spec typecheck) were not run at all, and the SBOM family has no gate to run.

Two of the reds are *caused by repairs landing in this same wave*: `cron-platform.controller.ts`
crossed 500 lines when the calendar-sweep P0 fix was added to it, and `MAX_HOPS = 8` was introduced
by the `check-envelope-consistency.mjs` repair. That is the shape of the problem this ticket exists
to catch: a moving tree cannot be green everywhere at once.

---

### PRD-C021 — Resolve every code-level P0/P1; owner/deadline for accepted residuals

**NOT MET.** 3 P0 and 106 P1 stand (§PRD-C014). The residual-risk register
(release-authority §6) is empty with **0 accepted P0 and 0 accepted P1**, and its own text says an
acceptance is impossible while §5 holds 0 of 6 approvals. **No finding anywhere carries an owner or
a deadline.**

---

### PRD-C156 — Every unchecked item under "Immediate code-level release candidate" is complete

**NOT MET, by a wide margin.** Measured directly from the PRD at 22:44:

| section | `- [ ]` | `- [x]` |
|---|---:|---:|
| **"Immediate code-level release candidate"** (lines 167–601) | **144** | 37 |
| whole file | 195 | 37 |

`check:prd-traceability` is **exit 0** — *"195 manifest rows, every criterion quoted verbatim with
exactly one owner"* — so the 144 is a trustworthy count, not a parsing artifact.

---

### PRD-C157 — CRM/Inventory excluded; public landing visuals/animations unchanged

**PARTIALLY MET.** This is the only criterion with a genuinely good answer, and it has one gap.

**Landing visuals — MET, measured.** Across **237 commits** from the PRD's own reconciliation base
`4ade571fa` to head:

```
git diff --stat 4ade571fa..HEAD -- frontend/features/landing   → (empty)
git diff --stat 4ade571fa..HEAD -- frontend/app/page.tsx       → (empty)
```

Zero bytes changed in `frontend/features/landing/` (7 files incl. `landing-page-motion.tsx`,
`landing-page.tsx`, `public-shell.tsx`) or in the root landing route. Only two `(public)` files
changed — `forms/[token]/page.tsx` and `intake/[projectId]/page.tsx` — both functional public forms,
not landing visuals or animation.

**CRM/Inventory exclusion — the machinery works; the "reported separately" half does not.**
The gates classify correctly: `check:file-sizes` FE prints *"CRM/Inventory (out-of-scope,
informational — 2 file(s) over 500 lines)"*; `check:dead-code` FE tags
`hooks/api/inventory/reports-types.ts:ReorderReportParams` *"CRM/Inventory excluded from PRD scope;
not counted"*; `check:tenant-relationships` excludes 134 inventory FKs under "AR-02 scope
exclusion"; BE `check:dead-code` defers `crm-brief-loaders.ts:loadLeadProfile` to "the CRM/leads
lane".

But **14 CRM/Inventory files are being modified in the current uncommitted wave** with real
behaviour changes, and no separate report exists for them:

```
frontend: crm/inbox/page.tsx, crm/leads/page.tsx, inbox-section-card.tsx,
          lead-export-dialog.tsx, lead-list-view.tsx, lead-record.ts,
          hooks/api/crm/deals.ts, hooks/api/inventory/{products,warehouses}.ts   (9 files, +101/-48)
backend:  contact-roles.service.ts, deals-crud.service.ts,
          inv-product-catalog.service.ts, inv-warehouses.service.ts,
          inv-products-warehouses-vendors-isolation.spec.ts                       (5 files, +171/-90)
```

`inv-product-catalog.service.ts` gains `buildListResponse` and a `count()` — a pagination-envelope
change. One of those files (`inv-warehouses.service.ts`, now 301 lines) is **currently failing
`check:over-300`**. Excluded modules are being changed and are already breaking an in-scope gate.

---

### PRD-C158 — Builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit

**NOT MET**, on both halves:

1. **"at one commit"** — impossible today (§2): 119 + 155 dirty entries, journal +3 in 13 minutes,
   two untracked migrations under the evidence.
2. **"pass"** — at least **11 architecture gates are exit 1 and 1 is exit 2** right now (§PRD-C020).
   Builds, typechecks, spec typecheck and the disposable E2E were **NOT MEASURED**.

---

### PRD-C159 — Two empty bootstraps + interrupted-then-resumed produce the same catalog

**NOT MET.** This is the most interesting result of the audit, so I state it in three parts.

**(a) The evidence C159 asks for exists — at journal head 637, on `main`, 43 migrations ago.**
`architecture-refactor/final-refactor/evidence/bootstrap-head-637/` records exactly the three runs:

- *§1 Two independent clean bootstraps — PASS*
- *§2 Interrupted mid-chain and resumed — PASS* — a real `SIGKILL` at `OK_count ≥ 346` (not
  simulated), then `resume, same command, no flags → 291 applied, 346 skipped, REACHED_HEAD 637/637`
- *§3 Catalog parity — PASS, `differences=0` on every pair* (b:c, b:d, c:d, plus an informational
  b:a on a fourth independent cold build)

Its `manifest.json` pins `frontend refs/heads/main @ e33873d6c…`, `backend refs/heads/main @
5ba6bbd7f…`, and carries its own `workingTreeCaveat` that the proofs ran against an uncommitted
tree. Its README says plainly: *"Head-637 parity is not head-639 parity; a fresh pair of clean
bootstraps is [required]."* **Current head is 680.** So the method is proven and the artifact is
honest, but it is **43 migrations and a different branch away from this release.** The earlier
634-entry set is formally retired by `SUPERSEDED-FORMER-HEAD.md`, which also records that the old
comparator keyed on object *names* and so `differences=0` did not mean what it appeared to.

**(b) The only comparison available at head FAILS.** I ran the project's own comparator across the
two databases the orchestrator built:

```
$ node src/scripts/compare-bootstraps.mjs --a=…/scratch_head_1010 --b=…/scratch_cold_1010
  A ledger rows: 678  watermark: 1803000010129
  B ledger rows: -1   watermark: -1
FAIL  tables    A=1028 B=1027   MISSING IN B  pg_temp_82.kbprobe_centres
FAIL  columns   A=13538 B=13536 MISSING IN B  pg_temp_82.kbprobe_centres.{cid,v}
FAIL  indexes   A=4764 B=4764
        MISSING IN B  public.uniq_chat_presence_org_membership :: … (org_id, membership_id)
        ONLY IN B     public.uniq_chat_presence_org_membership :: … WHERE (membership_id IS NOT NULL)
FAIL  migrationLedger  A=678  B=-1
PASS  constraints · policies · functions · triggers · extensions · enums · rlsState · sequences · views
RESULT: SCHEMAS DIFFER  differences=6
```

Confirmed by `check:replay-ledger` (**exit 1**): the cold database is missing
`1054_chat_presence_membership_unique_total`.

**(c) Three separate causes, only one of which is a real determinism problem.** I separate them
rather than reporting a single red:

1. **Head skew, not nondeterminism.** The two databases were built at different journal heads (cold
   677, head 678, journal now 680). The index difference is `1054` — an **untracked** migration.
   This is a scheduling artifact, and it is the direct consequence of §2.
2. **A gate defect (Finding 4).** `compare-bootstraps.mjs:60` sets
   `SYSTEM_SCHEMAS = ["pg_catalog","information_schema","pg_toast","drizzle"]` — `pg_temp_*` is not
   excluded. A concurrent session's temp table (here, another ticket's `kbprobe_centres` KB probe)
   fails the bootstrap-parity gate for reasons that have nothing to do with the migration chain.
3. **A gate limitation (Finding 5).** `replay-chain-cold.mjs` writes `drizzle.__replay`, not
   `drizzle.__drizzle_migrations`, so `migrationLedger` reads `-1` for a cold database and this
   comparator can **never** return `differences=0` between a bootstrap DB and a cold-replay DB.

Counts alone agree perfectly (944 / 12,580 / 4,390 / 12,951 / 900 / 468 / 169 / 476 / 608 / 0 on
both) — which is exactly why the name-only comparator gave a false `differences=0` historically, and
why the definition-level comparator is the right one.

**Neither an interrupted-then-resumed bootstrap nor a second clean bootstrap was run at current
head. NOT MEASURED.** What would measure it: `node src/scripts/db-bootstrap.mjs` into two fresh
empty databases plus a third with the `logs/05-interrupt-harness` SIGKILL-at-N pattern, all three at
a *frozen* journal, then `compare-bootstraps.mjs` across all three pairs.

---

### PRD-C160 — No unresolved code-level P0/P1 finding remains

**NOT MET.** **3 P0** (Findings 1, 2 and 16-F1) and **106 P1** are open, from a corpus that covers
only 18 of the 29 blocking tickets. The number can only rise as reports for 15, 17–22 and 26–30 land.

---

### PRD-C161 — Release authority records commit, evidence, accepted residual risks and date

**NOT MET. The code-level record does not exist.**

What exists is `architecture-refactor/decisions/release-authority-2026-09-03-UNSIGNED.md` —
`RA-2026-09-03-PROD-UNSIGNED`, scope **`production (PRD-C195)`**, status **`withheld`**, label
granted **`none`**, §5 approvals **0 of 6**, §6 accepted risks **0**, attestation deliberately blank.
Its §8 says so explicitly:

> *"the code-level release-authority record required by **PRD-C161** is ticket 31's, not ticket 36's.
> This record is the production one (PRD-C195). The template they share is
> `RELEASE-AUTHORITY-TEMPLATE.md`; set its `Record scope` to `code-level (PRD-C161)` for that one."*

So C161 needs a **new** record instantiated from `RELEASE-AUTHORITY-TEMPLATE.md` at scope
`code-level (PRD-C161)`, and none of its four required fields is currently fillable: **commit** (no
clean pair), **evidence** (11 red gates, 1 inconclusive, broken seal), **accepted residual risks**
(no approver exists to accept), **date** (nothing to date).

The existing record is a model of how to do this honestly and should be reused verbatim in
structure. It is also **correct and current** in its two overlapping findings: #1
(`check:baseline-integrity` red) and #2 (no clean commit pair) both still reproduce 90 minutes later.

---

## 4. Findings

Severity per the brief: **P0** = data loss / cross-tenant leak / money wrong / always-500.
**P1** = correctness or authorization defect with a real trigger. **P2** = everything else.

Findings 1, 2 and 3 are new-to-this-report or materially re-scoped. Findings 4–8 are properties of
the release-verification machinery itself, which is what ticket 31 owns.

| # | sev | file:line | summary |
|---:|---|---|---|
| 1 | **P0** | `streamlineos-backend/src/modules/payroll/payout/lib/payout-run-completion.ts:138` | A payroll run with HELD payees is still marked `PAID` and still posts the **full run net** to accounting |
| 2 | **P0** | `streamlineos-backend/src/modules/invoices/invoices-update.service.ts:127` | Editing a GST invoice's line items rewrites `tax_amount` from `taxRate` but never touches `cgst/sgst/igst_amount`; the invoice's own totals go internally inconsistent |
| 3 | **P1** | `streamlineos-backend/jest-e2e.json:8` | `testPathIgnorePatterns` omits `.claude/worktrees`; **269 of the 415** files the E2E suite collects are stale copies from other agents' worktrees |
| 4 | **P1** | `streamlineos-backend/src/scripts/compare-bootstraps.mjs:60` | The C159 bootstrap-parity gate does not exclude `pg_temp_*`; any concurrent session with a temp table fails it |
| 5 | **P2** | `streamlineos-backend/src/scripts/compare-bootstraps.mjs` (`migrationLedger` category) | The gate can never pass between a `db-bootstrap` database and a `replay-chain-cold` one, because only the former writes `drizzle.__drizzle_migrations` |
| 6 | **P1** | `streamlineos-backend/package.json` (`sbom:generate`) | PRD-C020 names an SBOM **gate**; only a generator exists. `sbom.json` can silently drift from the commit and nothing fails |
| 7 | **P2** | `streamlineos-backend/src/modules/cron/cron-platform.controller.ts:1` | 517 lines, unregistered — `check:file-sizes` exit 1, introduced by the 13-F1 repair |
| 8 | **P2** | `streamlineos-frontend/frontend/hooks/api/id-cursor-page-schema.ts` + `offset-page-schema.ts` | 2 unclassified exports — FE `check:dead-code` exit 1, introduced by the pagination-contract work |

### Finding 1 — P0 — a run with HELD payees is marked PAID and posts the full net

`payout-run-completion.ts:124-139` (`checkRunCompletion`):

```ts
const [coverage] = await deps.db
  .select({
    subjects:     sql`count(distinct ${payrollBankBatchItems.runEmployeeId})::int`,
    paidSubjects: sql`count(distinct …) filter (where ${payrollBankBatchItems.status} = 'PAID')::int`,
  })
  .from(payrollBankBatchItems)
  .where(and(eq(…orgId, orgId), inArray(…batchId, batchIds)));

const subjects = coverage?.subjects ?? 0;
const paidSubjects = coverage?.paidSubjects ?? 0;
if (subjects === 0 || paidSubjects !== subjects) return;
```

`subjects` is drawn **from bank-batch items only**, and HELD payees never become bank-batch items —
`batch-creator.service.ts:115` is `if (e.status === "HELD" || e.holdReason) return false;`
(`payout-validation.service.ts:128` agrees). So a HELD payee is invisible to the coverage check.
When every *batched* payee is paid, the run flips to `PAID` (`:180`) and the outbox emits

```ts
eventType: PAYROLL_RUN_PAYOUT_POSTING_INTENT_EVENT,
payload: { runId, month: currentRun.month, net: currentRun.netTotal ?? "0", … }
```

— `payrollRuns.netTotal`, the **whole run's** net, including the HELD employees who were never paid.

**Failure scenario.** A 50-employee run, one employee held for a bank-detail mismatch. 49 batch items
are created and paid. `subjects = 49`, `paidSubjects = 49`, so the run is marked `PAID` and one
`payroll_run_employees` row stays un-`PAID` while the run above it says otherwise. Accounting then
receives an intent for 50 employees' net. The ledger records salary expense and a bank credit for
money that never left the account, and the discrepancy equals exactly one salary — permanently,
because the run is `PAID` and `payout-run-completion` early-returns on `status === "PAID"` forever
after.

**Proposed fix.** Compute `subjects` from `payroll_run_employees` for the run (the true payee set),
not from batch items, and refuse completion while any payee is neither `PAID` nor explicitly
excluded with a recorded reason. Emit `net` as the **sum of the actually-paid** run employees rather
than `payrollRuns.netTotal`, or carry `heldNet` alongside it so the consumer can post the difference
to a holding account.

### Finding 2 — P0 — editing a GST invoice's lines desynchronises its tax columns

`invoices-update.service.ts:115-131`:

```ts
if (input.lineItems) {
  const subtotal  = Number(newLineItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
  const taxRate   = input.taxRate  ?? Number(existing.taxRate  ?? 0);
  const discount  = input.discount ?? Number(existing.discount ?? 0);
  const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
  const total     = Number((subtotal + taxAmount - discount).toFixed(2));
  updateData.taxAmount = taxAmount.toString();
  updateData.total     = total.toString();
  // cgstAmount / sgstAmount / igstAmount are NEVER written
}
```

Meanwhile the issue path at `:53-58` builds its posting from precisely those columns:

```ts
const cgst = Number(existing.cgstAmount ?? 0);
const sgst = Number(existing.sgstAmount ?? 0);
const igst = Number(existing.igstAmount ?? 0);
const taxPool = Math.round((cgst + sgst + igst) * 100) / 100;
const total   = Number(existing.total ?? 0);
```

**Failure scenario.** A draft invoice carries `subtotal 10,000 · cgst 900 · sgst 900 · taxRate 0 ·
total 11,800`. An operator edits a line, dropping the subtotal to 9,000. The branch writes
`taxAmount = 0` and `total = 9,000`, and leaves `cgst = 900, sgst = 900`. The invoice now shows a
₹9,000 total whose stored GST split is ₹1,800 — the document is wrong on its face and the GST
figures no longer correspond to any line. On issue, `postInvoiceSend` receives `total = 9,000` with
`taxPool = 1,800`, debits AR ₹9,000 and credits revenue ₹9,000 plus CGST ₹900 plus SGST ₹900 → a
₹1,800 imbalance.

The blast radius is **smaller than when 10-audit wrote it**, because `assertBalanced`
(`journal-posting.service.ts:73-92`) now exists and throws `Unbalanced journal entry: debit=… credit=…`
before persisting. That converts silent ledger corruption into a 500 on issue — a strictly better
failure, but the invoice is still wrong in the database and the route is still unusable. **P0 stands
on the money-is-wrong clause, not the always-500 clause.**

**Proposed fix.** Recompute the GST split in the `lineItems` branch from the same
`resolveSupplierStateCode` / place-of-supply rule the create and issue paths use, writing
`cgstAmount`/`sgstAmount`/`igstAmount` and deriving `taxAmount` as their sum; or refuse a line-item
edit on an invoice that carries a non-zero GST split until the split is recomputed. Note the same
line (`:127`) is one of the two paths `check:unbounded-reads` currently flags as unclassified.

### Finding 3 — P1 — the E2E suite collects 269 stale worktree specs

`jest-e2e.json` sets `"rootDir": "."` with
`"testPathIgnorePatterns": ["seeded-e2e-spec", "node_modules", "dist"]`. `.claude/worktrees` is not
in that list, and two abandoned worktrees (`eager-robinson-08f763`, `bold-napier-7a4a41`) each carry
a full copy of the tree. Proven without executing anything:

```
$ node ./node_modules/jest/bin/jest.js --config ./jest-e2e.json --listTests
TOTAL LISTED: 415
FROM .claude/worktrees: 269
/…/.claude/worktrees/eager-robinson-08f763/src/modules/module-access/__tests__/module-access.controller.e2e-spec.ts
/…/.claude/worktrees/bold-napier-7a4a41/src/modules/module-access/__tests__/module-access.controller.e2e-spec.ts
```

**Failure scenario.** PRD-C019 requires the release record to carry "pass/fail/skip counts". Run
today, `npm run test:e2e` produces a count in which **65% of the suites are code that is not at
head** — an old spec that still passes hides a regression, and an old spec that fails is attributed
to head. Every worker also runs 2–3 copies of the same spec against one shared database, so
same-name fixtures collide and the failures look like flake. The recorded number would be
meaningless and would look authoritative.

**Proposed fix.** Add `".claude/"` (and any other worktree root) to `testPathIgnorePatterns` in both
`jest-e2e.json` and `jest-e2e-seeded.json`, or set `"roots": ["<rootDir>/src", "<rootDir>/test"]`.
Add an anti-vacuity assertion to the release harness: the collected-file count must equal the count
under `src/` + `test/`.

### Findings 4 and 5 — the C159 gate cannot currently return a verdict

Both are shown reproducing in §PRD-C159(b). Fix for 4: append `"pg_temp"`-prefix exclusion to
`SYSTEM_SCHEMAS` (a `nspname NOT LIKE 'pg_temp%' AND nspname NOT LIKE 'pg_toast_temp%'` predicate on
every one of the twelve category queries). Fix for 5: read whichever of
`drizzle.__drizzle_migrations` / `drizzle.__replay` exists on each side and compare the applied
*tag set*, or accept a documented `--allow-ledger-shape-mismatch` when comparing a bootstrap to a
cold replay — and make `compare-bootstraps.mjs` refuse outright when the two sides are at different
journal heads, which is the condition that actually invalidated today's run.

### Finding 6 — P1 — no SBOM gate exists

`sbom.json` is 230,896 bytes, mtime 2026-09-03 07:39 — 15 hours and roughly 40 migrations before the
head I audited. `package.json` offers `sbom:generate` and `sbom:generate:self-test`; there is no
`check:sbom`, and `check:gate-wiring`'s 100-gate inventory does not include one.

**Failure scenario.** A dependency is added at 14:00. `sbom.json` is not regenerated. Every gate
stays green, and the release record cites an SBOM that omits the new component — precisely the
artifact a supply-chain review would rely on.

**Proposed fix.** Add `check:sbom` that regenerates into a temp file and byte-compares against
`sbom.json`, failing on drift (the pattern `check:permission-catalog` already uses for the vendored
permission catalogue: *"byte-identical to a fresh regeneration"*), and register it in
`check-gate-wiring.mjs`.

---

## 5. What head already gets right

Worth recording, because a release verification that only lists reds is not a verification.

1. **The chat-presence 42P10 P0 is genuinely dead.** `migrations/1054` is one of the most careful
   migrations in the tree: it refuses rather than guesses if `membership_id` is not `NOT NULL`, does
   `DROP` + `CREATE` inside the single-file transaction rather than a create/drop/rename dance, and
   then **reads `pg_index` back** and raises if the predicate survived. `scratch_head_1010` confirms
   the index is total.
2. **Nine other P0s are repaired, and the repairs are of high quality** — not patches but rewrites
   with the invariant written down: `billing-payment-activation.ts:189-201` explains in prose why the
   tenant's base currency must *not* participate in the price; `journal.service.ts:63-66` states the
   MONEY contract (`numeric(15,2)` rupees → integer paise via `round(x*100)` inside Postgres, `::text`
   to keep the driver's float path out of it); `resolveProviderEventId` documents why an unsigned
   header may cross-check the key but may never be it.
3. **Zero circular dependencies in either repo**, over 5,750 + 5,371 files.
4. **The declaration↔catalog drift family is fully instrumented and green** against a real
   catalog: column drift, constraint drift, referential-action drift and SET NULL column lists all
   exit 0 over 873 declared tables / 4,948 declared constraints, with 187 baselined divergences and
   **0 new**. Each baselined divergence carries a plain-English consequence
   (*"deleting an organization_members row SUCCEEDS and NULLs tickets; the declaration says the
   delete is refused"*).
5. **The outbox is closed**: 29 declared event types = 29 registered consumers, enumerated by name.
6. **Idempotency is enforced** on every in-scope mutating handler, with named per-route SKIPs that
   state why the service is idempotent without the decorator.
7. **The landing freeze holds exactly** — zero bytes changed in `frontend/features/landing/` or
   `frontend/app/page.tsx` across 237 commits.
8. **Frontend test integrity is real**: 366 test files, 2,843 callbacks, 9,576 `expect()` calls,
   and all seven vacuity ratchets at 0 — no assertion-free test, no tautology, nothing focused,
   nothing skipped.
9. **Gates report their own corpus and their own vacuity.** `check:openapi-coverage` volunteers
   *"NOT A PASS FOR THIS RULE — 0.74% of the response contract is declared … green because the debt
   did not GROW"*. `check:tenant-isolation` volunteers *"This says the test EXISTS, not that it
   passes."* `db:verify-rls` refuses to give a verdict against a target one migration behind. That
   discipline is why this audit could be written at all.
10. **The production release-authority record refuses to sign itself**, and says why in terms a
    human can act on. Its closing line — *"A release-authority record carrying a signature nobody
    gave is a forged compliance record, and that is a worse outcome than every blocker listed above
    combined"* — is the correct posture and should be inherited verbatim by the C161 code-level
    record.

---

## 6. Not measured / blocked on infrastructure

Stated plainly, with what would measure each.

| not measured | blocker | what would measure it |
|---|---|---|
| backend `build`, backend `typecheck`, frontend `type-check`, `check:spec-typecheck` | 8–12 GB each; 26 concurrent agents on 15 cores / 24 GB | the orchestrator's single central run, at a frozen commit pair |
| the disposable-database E2E suite (`test:e2e:seeded`) | 12 GB heap, `--runInBand`, shared-DB contention | `pnpm seed:scratch-e2e` against a dedicated local Postgres, then `test:e2e:seeded` — **after** Finding 3 is fixed, or the counts are meaningless |
| the non-seeded E2E suite (`test:e2e`) | same, plus Finding 3 makes 65% of it stale | as above |
| `check:tenant-isolation:run` (execution, not mapping) | runs the isolation specs; same memory profile | central run |
| **two clean bootstraps + interrupted/resumed at current head (C159)** | needs a frozen journal; the journal moved 678→680 during this audit | freeze the journal, then `db-bootstrap.mjs` ×2 into fresh empty DBs + one SIGKILL-at-N run using `bootstrap-head-637/logs/05-interrupt-harness`, then `compare-bootstraps.mjs` on all three pairs — **after** Findings 4 and 5 |
| the 106 P1 findings, individually re-verified at head | volume; 18 reports × ~6 P1 each | one pass per owning ticket, as I did for the 15 P0s |
| `check:alert-ack` | needs a real `ALERT_WEBHOOK_URL` and a human to enter the nonce | deployed environment (PRD-C174, deferred) |
| P0/P1 census for tickets 15, 17–22, 26–30 | **those reports do not exist yet** | those 11 audits landing |
| Web Vitals on a production build / reference device | `check:web-vitals-budget`'s red is a dev-profile measurement | PRD-C165, deferred |

**What is genuinely blocked on infrastructure: only `check:alert-ack` and the deferred
production-evidence family (PRD-C162–C185).** Everything else on this list is blocked on *the tree
holding still* — which is a scheduling decision, not a missing capability.

---

## 7. The shortest path to closing ticket 31

Not a finding; the ordering the evidence implies.

1. **Freeze.** Land or revert the 119 + 155 outstanding entries, commit `1054`/`1055`, stamp a real
   pair of SHAs. Nothing below is worth doing before this.
2. Fix the six gate reds the wave itself created (`check:file-sizes`, `check:over-300`,
   `check:baseline-integrity`, `check:type-assertions`, FE `check:dead-code`,
   `check:unbounded-reads`) and re-seal the broken evidence directory.
3. Fix Finding 3 before recording any E2E count, and Findings 4 + 5 before attempting C159.
4. Land the 11 missing ticket audits; only then is the P0/P1 census (C014, C021, C160) countable.
5. Close the 3 live P0s (Findings 1, 2, 16-F1).
6. Run C159's three bootstraps at the frozen journal; run C020's full gate list including the
   missing SBOM gate (Finding 6); run C018 against the disposable harness — **and extend it, since
   13 of its 15 named areas have no spec.**
7. Instantiate `RELEASE-AUTHORITY-TEMPLATE.md` at scope `code-level (PRD-C161)` and fill it from
   steps 1–6.

---

## 8. Evidence appendix — commands run

All run with `nice -n 10`. Databases: `scratch_head_1010` (owner, 678 ledger rows),
`scratch_cold_1010` (cold replay, no drizzle ledger). Times IST 2026-09-03.

```
22:39  git log -1 / rev-parse / status --porcelain            both repos
22:40  ls .scratch/…/reports; grep -E findings rows           18 reports, P0=15 P1=106 P2=146
22:41  psql -Atc <10-class catalog census>                    both scratch DBs — identical
22:42  node src/scripts/compare-bootstraps.mjs --a= --b=      RESULT: SCHEMAS DIFFER differences=6
22:43  npm run check:{cycles,migration-chain,migration-ledger,
                      migration-discipline,idempotent-commands,outbox-consumers}   0,0,0,0,0,0
22:44  awk/grep PRD checkbox census                           144 unchecked in the Immediate section
22:45  npm run check:{file-sizes,over-300,openapi-coverage,operation-ids,
                      permission-keys,cache-invalidation,cache-key-shapes}         1,1,0,0,0,0,0
22:46  npm run check:{tenant-isolation,conflict-targets,unbounded-reads,gate-wiring} 0,0,1,0
22:46  COLUMN_DRIFT_… CONSTRAINT_DRIFT_… REFERENTIAL_ACTION_… SET_NULL_…
       TENANT_RELATIONSHIP_… COLD_DATABASE_URL=… npm run check:<6 drift gates>      0,0,0,0,0,1
22:47  npm run check:{vulnerabilities,licenses,evidence-seal,baseline-integrity}    0,0,1,1
22:48  DATABASE_URL=…scratch_head_1010 npm run db:verify-rls                        EXIT 2
22:48  node jest.js --config jest-e2e.json --listTests                              415 / 269 worktree
22:49  npm run check:{type-assertions,benchmark-manifest,placement-bypass,
                      migration-rollback,envelope-consistency}                      1,1,0,0,0
22:50  (frontend) npm run check:{cycles,file-sizes,over-300,permission-catalog,
                      permission-binding,contract-drift,prd-traceability}           0,0,0,0,0,0,0
22:51  (frontend) npm run check:{type-assertions,web-vitals-budget,
                      route-bundle-budget,test-integrity}                           0,1,1,0
22:51  npm run check:dead-code  BE / FE                                             0 / 1
22:52  git rev-parse / status / journal recount                                     journal=680
```

Reads: 18 audit reports (786 KB), the PRD, the traceability manifest, the unsigned release-authority
record, `SUPERSEDED-FORMER-HEAD.md`, `bootstrap-head-637/{README.md,manifest.json}`,
`compare-bootstraps.mjs`, `migrations/1054_chat_presence_membership_unique_total.sql`,
`jest-e2e.json`, `jest-e2e-seeded.json`, and the 11 backend/frontend source files cited by
file:line above.

**Nothing in either repository was modified.**
