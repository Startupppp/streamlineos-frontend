# Ticket 36 — Production release authority — current-head audit

**Audited:** 2026-09-03
**Frontend/root head:** `ab6a77a6982add0b6f179f3e99a139486999ced1` (`release/code-10-10-v2`) — **115 porcelain entries, NOT clean**
**Backend head:** `66f09164f7056b377331bcc1fff5f128ada06b95` (`release/code-10-10-v2`) — **182 porcelain entries, NOT clean**
**Prior report:** none. This is the first `36-audit.md`; evidence reconstructed from scratch.
**Verdict:** **not-met** on all 7 criteria. A substantial and unusually honest *apparatus* exists; **none of it is satisfaction**, and at head it has gone stale in four measurable ways and is enforced by **zero gates**.

---

## 0. The one-paragraph answer

Ticket 36's seven criteria are records, not code. A prior pass authored the apparatus — a 634-line
classification ledger, a 388-line measurement definition, a 233-line template and a 356-line
unsigned instance. That apparatus is real, is scrupulously unsigned, and its ownership mapping is
**exactly consistent with the PRD and the traceability manifest at head (195/195/195, 0 mismatches,
verified programmatically)**. But it was stamped at `7469d2789`/`2f37e1bb0` and head is **3 frontend
and 4 backend commits past that**; four of its measured numbers are now wrong; its definition of the
C190 gate list omits **77 of the 136 gates that exist**, including **five of the six gates I measured
red at head**; its definition of the C194 register excludes the **1 P0 + 9 P1 production findings that
ticket 32 filed at head**; and its three compliance findings are propagated from **three hardcoded
`log()` lines in `compliance-drill.mjs` that head's own source refutes**. Nothing in either repository
detects any of this: **no gate anywhere references `release-authority`, `RELEASE-AUTHORITY-TEMPLATE.md`,
`DEFERRED-CHECKBOX-LEDGER.md` or `C190-C194-MEASUREMENT-DEFINITION.md`.**

---

## 1. What I read, with numbers

### 1.1 The ticket's own governing documents

| Document | Size | What I took from it |
|---|---:|---|
| `.scratch/code-release-10-10-v2/issues/36-production-release-authority.md` | 27 lines | 7 criteria: PRD-C016, C190–C195 |
| `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` | 664 lines | **37 checked / 195 unchecked**; deferred section = **28** criteria (C162–C189); final gate = **6** (C190–C195); **34 deferred boxes total** |
| `.scratch/code-release-10-10-v2/TRACEABILITY.md` | 247 lines | 195 rows, 36 tickets; ticket 36 owns exactly C016, C190, C191, C192, C193, C194, C195 |

### 1.2 Ticket 36's existing apparatus — read in full

`architecture-refactor/final-refactor/evidence/42-production-ops/release-authority/` — **3 files, 1,183 lines, 0 `.json`**

| File | Lines | Claims criteria |
|---|---:|---|
| `README.md` | 161 | the whole ticket |
| `C190-C194-MEASUREMENT-DEFINITION.md` | 388 | PRD-C190, PRD-C194 |
| `DEFERRED-CHECKBOX-LEDGER.md` | 634 | PRD-C191 |

`architecture-refactor/decisions/` — **6 files, 1,364 lines**

| File | Lines | Signed? |
|---|---:|---|
| `README.md` (S05 template) | 58 | n/a |
| `RELEASE-AUTHORITY-TEMPLATE.md` | 233 | n/a — template |
| `release-authority-2026-09-03-UNSIGNED.md` | 356 | **no** — 6 blank approval rows |
| `operator-access-2026-09-03.md` | 213 | **no** — 6 blank approval rows |
| `privacy-C184-pii-policy.md` | 294 | **no** — 6 blank approval rows |
| `privacy-C185-provider-approvals.md` | 210 | **no** — 6 blank approval rows |

**36 approval cells across 6 documents. Every one is blank.** Verified by regex over
`^\| *(Product|Security|Privacy ?/ ?DPO|Operations|Legal|Finance) *\|`. No forged signature exists.

### 1.3 The production-evidence corpus this record has to index

`architecture-refactor/final-refactor/evidence/42-production-ops/` — **303 files across 17 directories**

| Directory | Files | | Directory | Files |
|---|---:|---|---|---:|
| `RB-01-cell-isolation` | 48 | | `break-glass` | 9 |
| `RB-02-pitr-backup` | 11 | | `data-catalogue-c183` | 6 |
| `RB-03-read-replica` | 5 | | `deploy-safety` | 38 |
| `RB-04-recovery-drill` | 6 | | `edge-security` | 29 |
| `RB-05-production-load` | 13 | | `observability-c173` | 11 |
| `RB-06-live-alert-delivery` | 18 | | `provider-drills` | 27 |
| `RB-07-per-cell-cost` | 19 | | `release-authority` | 3 |
| `RB-08-cell-resource-accounts` | 27 | | root (`README`, `MANIFEST-INTAKE`, `manifest-readiness.mjs`) | 3 |
| `RB-10-privacy-compliance` | 30 | | **Total** | **303** |

**Of those 303 files, 0 are valid deployed-evidence manifests.** 11 are `.json` and are therefore read
by the gate as manifests and rejected (see F2). `architecture-refactor/runbooks/` holds 11 files
(RB-01…RB-10 + a data-map template).

### 1.4 Gate surface, enumerated

| | Backend | Frontend |
|---|---:|---:|
| `package.json` scripts | **368** | **85** |
| `check:*` scripts | **189** | **69** |
| Gates under `check-gate-wiring`'s own predicate (`check:`/`verify:`/`db:check-` minus `:self-test\|fix\|emit\|list\|baseline\|write\|report\|verify\|build`) | **100** | **35** |
| `check:gate-wiring` verdict at head | exit **0** — 100 gates, 91 blocking, 0 non-blocking, 9 unwired-by-design | exit **0** — 35 gates, 32 blocking, **3 non-blocking**, 0 exceptions |

### 1.5 Source read for the mechanisms behind the records

`src/scripts/production-ops-evidence.mjs` (264), `src/scripts/check-gate-wiring.mjs` (791),
`src/scripts/run-gate.mjs` (148), `src/scripts/compliance-drill.mjs` (348),
`src/scripts/check-evidence-seal.mjs` (partial), `src/scripts/check-s05-artifact-contract.mjs` (partial),
`src/modules/organization/core/lifecycle/organization-purge-adapters.ts` (361),
`src/modules/organization/core/org-purge.service.ts` (413),
`src/modules/gdpr/gdpr-export-worker-implementation.ts` (403),
`.github/workflows/` — backend 7 workflow files, frontend 1.
**29** v2 ticket reports now exist under `.scratch/code-release-10-10-v2/reports/` (01–17, 19, 20, 22–26, 28–32).

### 1.6 Commands actually run at head — 21 gate/script executions, 6 psql queries

| # | Command | Exit | Headline |
|---:|---|---:|---|
| 1 | `BE check:baseline-integrity` | **1** | RED — `check-envelope-consistency.mjs :: MAX_HOPS = 8` unregistered; 90 scripts, 131 constants, 142 registered, 0 stale |
| 2 | `BE ops:evidence:check` | **1** | **11 manifest candidates, 11 rejected, 0 PASS, RB-01…RB-08 all missing** |
| 3 | `BE ops:evidence:self-test` | **0** | `validDeployedShapePasses`, `alteredArtifactBlocked`, `selfTestClaimBlocked` all true |
| 4 | `BE check:evidence-seal` | **1** | 6 seals · 68/68 sealed files match · **1 BROKEN** (`data-catalogue-c183`, 5 unsealed files) |
| 5 | `BE check:gate-wiring` | **0** | 100 gates, 91 blocking, 161 run steps / 15 jobs / 7 files, 9 exceptions |
| 6 | `BE check:s05-artifact-contract` | **0** | template carries all six functions and all three evidence-index columns |
| 7 | `BE check:alert-ack` | **2** | `PREREQUISITE MISSING: ALERT_WEBHOOK_URL is not set` |
| 8 | `BE check:type-assertions` | **1** | 1 stale ceiling entry (`support-sla.controller.ts`) |
| 9 | `BE check:envelope-consistency` | **0** | 0 violations (repaired since the record was written) |
| 10 | `BE check:placement-bypass` | **0** | repaired |
| 11 | `BE check:benchmark-manifest` | **1** | 154/280 statement ceilings (55.0%), 137/164 request slots (83.5%) |
| 12 | `BE check:migration-rollback` | **0** | **681** migrations scanned |
| 13 | `BE check:replay-ledger` (`COLD_DATABASE_URL`) | **1** | journal 681, applied 677, **4 not applied** (1054, 1055, 1056, 1057) |
| 14 | `BE check:dead-code` | **0** | knip 0 unused files; 9,916-file importer graph |
| 15 | `BE compliance-drill.mjs` (dry run, `scratch_head_1010`) | **0** | 7/7 steps, **7/7 audit rows**, erasure refused under hold, rolled back |
| 16 | `FE check:prd-traceability` | **0** | **195 criteria, 36 tickets, 0 checked / 195 unchecked**, one owner each |
| 17 | `FE check:gate-wiring` | **0** | 35 gates, 32 blocking, **3 registered non-blocking** |
| 18 | `FE check:type-assertions` | **0** | 999 ledgered plain assertions; 0 `as any`/`@ts-ignore` |
| 19 | `FE check:web-vitals-budget` | **1** | 1 budget violation (mobile `/crm/inbox` CLS 0.109 > 0.100) |
| 20 | `FE check:route-bundle-budget` | **1** | **18 breaches** (e.g. `/crm/leads` 773,117 B > 524,288 B) |
| 21 | `FE check:dead-code` | **1** | **2 unclassified exports** — `hooks/api/id-cursor-page-schema.ts:idCursorPageContract`, `hooks/api/offset-page-schema.ts:offsetPageContract` |

**Tally: 11 exit 0 · 9 exit 1 · 1 exit 2.**

psql against the local instances:

| Measure | Record's stamp (2026-09-03, `7469d2789`/`2f37e1bb0`) | **Head** |
|---|---:|---:|
| `migrations/meta/_journal.json` entries | 677 | **681** |
| `migrations/*.sql` files | 677 | **681** |
| `scratch_head_1010 drizzle.__drizzle_migrations` | 677 | **681** |
| `scratch_cold_1010 drizzle.__replay` | 677 | **677 — now 4 behind the journal** |
| public tables (head / cold) | 944 / 944 | **944 / 944** |
| RLS-enabled tables | 899 | **900** |
| policies | 900 | **900** |
| `streamline_app.rolbypassrls` | false | **false** |

---

## 2. Per-criterion assessment

### PRD-C016 — *"complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing."*

**Status: not-met.** Three independent halves, all open.

**(a) Ticket 31.** `31-audit.md:18` at head: *"Verdict: **not-met** on 11 of 12 criteria; **partially-met** on 1 (PRD-C157)."* C016's precondition is unmet by its own owner's current report.

**(b) One clean commit pair.** Measured this pass: frontend **115** porcelain entries, backend **182**.
The record itself recorded 40→68 and 21 nine minutes apart; at head the counts have grown again.
No clean pair exists, and none of the three SHA pairs stamped anywhere in the evidence tree
(`7469d2789`/`2f37e1bb0`, `7469d2789`/`45f8a2e99`, head) describes a clean tree.

**(c) "interrupted, skipped and prerequisite-blocked gates never count as passing."** This is the only
half that is *machinery* rather than state, and at head it is enforced by prose, not by a mechanism:

- `run-gate.mjs:52-55` turns exit 2 into `{exit: 0, warn: <::warning annotation>}`. The step passes.
  The annotation is an ephemeral CI log line. **Nothing aggregates inconclusive gates into an artifact
  a release record can cite**, so "0 inconclusive" in the record's §4.1 is an assertion over a
  hand-picked 5-gate subset, not a measurement over 136 gates.
- run-gate is wired into only **6 backend steps and 3 frontend steps**.
- Three frontend gates are registered **non-blocking** (`frontend.yml:558`, `:574`, `:603`;
  registry at `frontend/scripts/check-gate-wiring.mjs:97-122`). One of them, `check:dead-code`, is
  **gate #27 of the C190 list** and is **exit 1 at head**. A "skipped" verdict is exactly what
  `continue-on-error: true` produces, and C016 forbids it counting as passing — yet the C190
  definition contains no rule about it and the record's §4.1 does not list it. See **F7**.

### PRD-C190 — *"Immediate code-level gate remains green at the deployed commit."*

**Status: not-met**, for three reasons of increasing seriousness.

1. **There is no deployed commit.** §3 of the unsigned record states this plainly and correctly.
2. **The gate is not green at the *current* commit either.** Of the 70 gates the definition lists,
   I measured three members red at head: **#27 `FE check:dead-code` (exit 1)**,
   **#63 `BE check:baseline-integrity` (exit 1)**, **#70 `BE check:evidence-seal` (exit 1)**.
   The other 67 were not run by this audit and are reported as **not run**, never as passing.
3. **The definition of "the gate" is under-inclusive by 77 gates, and its closure argument is false.**
   This is the finding that matters. `C190-C194-MEASUREMENT-DEFINITION.md:197-206` claims:

   > *"Gate 61's own output is the completeness proof for this whole list … If a gate exists in
   > `package.json` and is not in the list above, gate 61 either accounts for it as one of the 9
   > registered exceptions or fails. That is what makes the list closed rather than a matter of taste."*

   `check-gate-wiring.mjs` asserts only that each gate is invoked by *some* reachable CI `run:` step.
   It has no knowledge of the C190 list. I extracted every backticked command from §1.2
   (**130 raw, 79 non-helper**) and compared it to the gate sets both `check:gate-wiring`
   implementations enumerate:

   | | Gates that exist | Named in the C190 list | **Absent from it** |
   |---|---:|---:|---:|
   | Backend | 100 | 44 | **56** |
   | Frontend | 35 | 15 | **21 (of 36 by my predicate)** |
   | **Total** | **136** | **59 (43%)** | **77 (57%)** |

   And the omission is not random with respect to redness. **Five of the six gates I measured exit 1
   at head are outside the list:** `BE check:type-assertions`, `BE check:benchmark-manifest`,
   `BE check:replay-ledger`, `FE check:web-vitals-budget`, `FE check:route-bundle-budget`.
   Also absent: `check:unbounded-reads`, `check:db-call-count`, `check:n1-growing-loops`,
   `check:query-projections`, `check:relation-hydration`, `check:module-lifecycle`,
   `check:audit-log-privileges`, `check:declaration-column-drift`, `check:hardcoded-secrets`,
   `check:log-secrets`, `check:body-binding`, `check:owner-authority`, `verify:rbac-integrity`,
   `verify:membership-revocation`, `FE check:response-contracts`, `FE check:route-access-contract`,
   `FE check:named-handlers`. See **F1**.

### PRD-C191 — *"Every deferred checkbox is complete with current evidence."*

**Status: not-met.** Measured: `FE check:prd-traceability` exit 0 reports **0 checked / 195 unchecked**.
**0 of the 34 deferred checkboxes (28 in C162–C189 + 6 in C190–C195) is complete.**

The ledger is not the criterion; it is the inventory that makes the criterion answerable. Audited on
its own terms it is **sound and current**:

- 195 rows, **195 distinct criterion IDs**, class totals **159 CODE / 26 DEPLOYED / 10 HUMAN** —
  the table body reproduces its own stated totals exactly.
- Cross-checked programmatically against `TRACEABILITY.md` and the PRD: **195 / 195 / 195 rows,
  0 ownership mismatches, 0 IDs in one and not the other.**
- Ticket 36's own row set: **5 DEPLOYED + 2 HUMAN = 7**, matching the ticket and the manifest.
- Every DEPLOYED and HUMAN call quotes the criterion's own wording, so a reader can dispute the text
  rather than an opinion. This is the correct methodology and it is followed consistently.

Two defects against it:

- **Its one CODE call inside the deferred section, PRD-C188, rests on a stale drill.** The ledger
  and the README argue C188 is "misfiled as deferred" because `compliance-drill.mjs` ran exit 0.
  It does still run exit 0 at head (I reproduced it: 7/7 audit rows). But the drill's *"Known gaps
  (honest report)"* block is three unconditional `log()` calls and **all three are false at head**.
  See **F3**. The classification survives; the evidence cited for it does not.
- **Nothing re-derives the ledger.** No gate reads it. If the PRD gains or loses a criterion, or a
  ticket reassignment lands, the ledger silently diverges from the manifest that
  `check:prd-traceability` does keep fail-closed. See **F4**.

### PRD-C192 — *"Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement."*

**Status: not-met.** Measured at head: `ops:evidence:check` **exit 1**.

- **11 manifest candidates found, 11 rejected, 0 PASS.**
- **`missing passing deployed evidence for RB-01, RB-02, RB-03, RB-04, RB-05, RB-06, RB-07, RB-08` — 0 of 8.**
- `ops:evidence:self-test` **exit 0**: the detector accepts a valid deployed shape, blocks an altered
  artifact, and blocks a self-test claiming to be evidence. **The gate bites.**
- The record's §4.2 assertion table is **accurate at head** — I checked all 24 required assertion IDs
  against `production-ops-evidence.mjs:50-58`; they match exactly.
- Every rejection reason is a property of a deployed run a local one cannot have: `evidenceKind must
  be deployed-operator-attested`, `live=true`, non-local `https` `environment.target`,
  `release.topologySha256` SHA-256, **`named operator is required`**.

Two things the record did not say, and which change how this number should be read:

- **None of the 11 rejected candidates is an attempted evidence manifest.** They are 3 sealer
  `artifact-hashes.json` files, 3 `pnpm audit` JSON outputs, 4 drill/probe state files and 1 more.
  "11 rejected" reads like 11 failed evidence attempts; it is 11 unrelated files.
- **Because of that, the gate can never exit 0 while those files exist** — even with all 8 runbooks
  passing. `production-ops-evidence.mjs:170-188` pushes every throwing candidate into `failures` and
  then `if (failures.length > 0) throw`. There is no allowlist and no format discriminator. See **F2**.

Local drill output is honestly labelled — `RB-05-local-run-NOT-deployed-evidence.md`,
`RB-07-local-run-NOT-deployed-evidence.md`, `09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json`.
That labelling discipline is a real strength of tickets 33–35 and should be preserved.

### PRD-C193 — *"Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded."*

**Status: not-met. 0 of 6.** Measured across all 6 decision documents: **36 approval cells, all blank.**
`check:s05-artifact-contract` exit 0 confirms the template carries all six functions and all three
evidence-index columns, so the *shape* is right and a human has only to sign.

The one correction head forces on the record: `release-authority-2026-09-03-UNSIGNED.md:233` says
*"no `privacy-YYYY-MM-DD.md` instance exists"*. Three instances now exist
(`operator-access-2026-09-03.md`, `privacy-C184-pii-policy.md`, `privacy-C185-provider-approvals.md`),
authored by ticket 35 after this record was written. All three are explicitly `UNSIGNED DRAFT — NOT AN
APPROVAL`, so line 242's *"Zero signed decision records exist"* remains **true**, but §4.4's evidence
index is stale. See **F4**.

### PRD-C194 — *"No unresolved production/compliance P0/P1 finding remains."*

**Status: not-met — and, more importantly, currently *mismeasured*.**

The record concludes C194 is *"OPEN and unmeasurable"* because its §2.2 register table
(`C190-C194-MEASUREMENT-DEFINITION.md:294`) declares deployed evidence manifests
**"the only register that can hold a C194 finding"**. That definition was defensible when written.
At head it is not: **ticket 32's audit exists and files production-class findings directly against
C162–C164.**

`.scratch/code-release-10-10-v2/reports/32-audit.md:18` — *"one **P0 and nine P1**, seven of them not
present in the pre-existing evidence directories."* Its finding table (`:211` onward):

| ID | Sev | Subject |
|---|---|---|
| F1 | **P0** | `payment-webhook-health.service.ts:199` — "Retry" on a failed payment webhook re-runs no effect **and erases the failure record** |
| F2 | P1 | `X-Forwarded-For` / `X-Client-Ip` are attacker-chosen |
| F3 | P1 | rate-limit coverage gate blind to class-level `@Public()` |
| F4 | P1 | a spam complaint permanently suppresses an address **for every tenant** |
| F5 | P1 | one backlogged tenant starves every later tenant's notifications |
| F6 | P1 | database TLS conditional on the hostname being Neon |
| F7 | P1 | delivered CSP blocks Ably realtime |
| F8 | P1 | bot verification fails open |
| F9 | P1 | key rotation cannot retire a key |
| F10 | P1 | secret-gated public webhooks have no rate limit |

F4 (cross-tenant suppression) and F6 (conditional TLS) are squarely compliance. **None of these ten
appears in the release-authority record's §7 table**, and none is dispositioned. So the honest
statement at head is not *"the register is empty for the wrong reason"* — it is **"the register is
non-empty and the record is not reading it."** See **F5**.

The record's §7 table itself is stale in the other direction: **rows 3, 4 and 5 no longer reproduce**
(see F3), and row 8's two broken seals are now **one**, in a different directory.

### PRD-C195 — *"Release authority records commit, environment, evidence, accepted residual risks and date."*

**Status: not-met.** No release authority exists, so nothing has been recorded *by* one. The
*artifact* a release authority would sign does exist and is well-built — `RELEASE-AUTHORITY-TEMPLATE.md`
covers all five C195 fields plus a scope switch that distinguishes C161 (code-level) from C195
(production), and the unsigned instance fills every measurable field. Assessed as a record:

| C195 field | State at head |
|---|---|
| commit | **stale** — §2:42 records `7469d2789` / `2f37e1bb0`; head is `ab6a77a69` / `66f09164f`, **3 and 4 commits later** |
| environment | recorded as **NONE / NEVER**, correctly and explicitly |
| evidence | §4.1 subset partly stale (`check:envelope-consistency` and `check:placement-bypass` are green now); §4.4 stale (3 decision drafts landed); §3's DB census stale in **3 of 4 numbers** |
| accepted residual risks | **empty, and correctly labelled empty** — "not because there is nothing to accept" |
| date | 2026-09-03 — present |
| signature | **blank, deliberately.** Verified: no signature anywhere in any of the 6 documents |

The record's own §2 warns *"The SHAs above are provisional and expected to be superseded."* At head
they **have been** superseded, and nothing noticed. See **F4**.

---

## 3. Findings

| # | Sev | file:line | Finding |
|---:|---|---|---|
| F1 | **P1** | `architecture-refactor/final-refactor/evidence/42-production-ops/release-authority/C190-C194-MEASUREMENT-DEFINITION.md:197-206` | The C190 gate list omits 77 of 136 gates and its closure argument is false |
| F2 | **P1** | `streamlineos-backend/src/scripts/production-ops-evidence.mjs:159-188` | `ops:evidence:check` can never exit 0 while any non-manifest `.json` sits in the evidence tree; 11 do |
| F3 | **P1** | `streamlineos-backend/src/scripts/compliance-drill.mjs:284-287` | PRD-C188's evidence bundle prints three hardcoded "known gaps" that head's source refutes |
| F4 | **P1** | `architecture-refactor/decisions/release-authority-2026-09-03-UNSIGNED.md:42` | The release-authority record is stale at head in four measured ways and **no gate detects it** |
| F5 | **P1** | `…/release-authority/C190-C194-MEASUREMENT-DEFINITION.md:294` | The C194 register definition excludes the 1 P0 + 9 P1 production findings filed at head |
| F6 | P2 | `streamlineos-backend/src/scripts/production-ops-evidence.mjs:124` | `release.sha` is never resolved against a repository; the evidence tree already carries ≥3 different SHAs |
| F7 | P2 | `.github/workflows/frontend.yml:558` (also `:574`, `:603`) | A C190-listed gate is registered non-blocking and is red at head; C016 forbids that counting as passing |
| F8 | P2 | `streamlineos-backend/src/scripts/run-gate.mjs:52-55` | Exit 2 is tolerated only as an ephemeral CI annotation; nothing aggregates inconclusive gates into a citable artifact |
| F9 | P2 | `architecture-refactor/final-refactor/evidence/42-production-ops/data-catalogue-c183/artifact-hashes.json:1` | Broken seal at head — C190 gate #70 is exit 1 for a *different* reason than the record records |

---

### F1 (P1) — the C190 gate list omits 77 of 136 gates, and its closure proof does not prove closure

**Where.** `C190-C194-MEASUREMENT-DEFINITION.md:197-206`.

**What is claimed.** *"Gate 61's own output is the completeness proof for this whole list… If a gate
exists in `package.json` and is not in the list above, gate 61 either accounts for it as one of the 9
registered exceptions or fails. That is what makes the list closed rather than a matter of taste."*

**Why it is false.** `check-gate-wiring.mjs:466-530` enumerates gates from `package.json`, matches them
against `run:` steps in `.github/workflows/`, and fails on a gate that is neither invoked nor registered
as `UNWIRED_BY_DESIGN`. It never reads `C190-C194-MEASUREMENT-DEFINITION.md`. A gate can be perfectly
wired, blocking, red — and absent from the C190 list — and gate 61 exits 0. It did exactly that this
pass.

**Measured.** 79 non-helper commands named in §1.2 vs 100 backend + 35 frontend gates under
gate-wiring's own predicate → **56 backend and 21 frontend gates absent**, 43% coverage.

**Failure scenario.** A release authority runs the 70 listed items at the release commit. Every one
passes. The record says *"the immediate code-level gate remains green."* Simultaneously, at that same
commit: `FE check:route-bundle-budget` is exit 1 with **18 measured byte breaches**,
`FE check:web-vitals-budget` is exit 1, `BE check:type-assertions` is exit 1,
`BE check:benchmark-manifest` reports **only 55.0% of statement ceilings measured**, and
`BE check:replay-ledger` is exit 1 with **4 unapplied migrations**. None is in the list, so none
appears in the record. The label is granted over five known violations. This is the
"gates report green over unread code" shape the repository has been burned by before — moved up one
level, from a gate reporting green over unread code to a *definition of green* reporting green over
unread gates.

**Proposed fix.** Stop maintaining the list by hand. Emit it: add `check:c190-gate-list` that reads both
`package.json` files with gate-wiring's own predicate, subtracts the documented exceptions, and **fails
when a gate exists that the C190 definition does not name** — the same fail-closed shape
`check:prd-traceability` already gives the criteria manifest. Until then, mark §1.2 as a *subset*, not
a closed list, and state the coverage fraction (59/136) in the record.

---

### F2 (P1) — `ops:evidence:check` is unsatisfiable while any non-manifest `.json` sits in the evidence tree

**Where.** `production-ops-evidence.mjs:159-168` (`collectJson`) and `:170-188` (`verify`).

```
159 function collectJson(dir) { … result.push(full) for every *.json except *.input.json … }
170 function verify(dir) {
183     } catch (error) {
184       failures.push(`${…}: ${error.message}`);
187   for (const runbook of RUNBOOKS) if (!seen.has(runbook)) failures.push(`missing passing deployed evidence for ${runbook}`);
188   if (failures.length > 0) throw new Error(`PRODUCTION OPS EVIDENCE GATE FAILED\n…`);
```

Every `.json` under the tree is a manifest candidate. There is no `format` discriminator, no filename
convention, no allowlist. A candidate that fails validation joins `failures`, and a non-empty
`failures` throws — **independently of whether all 8 runbooks passed**.

**Measured at head:** 11 such files, none of which is an attempted manifest —
`RB-04-recovery-drill/recovery-drill-dry-run.json`, `RB-06-live-alert-delivery/raw/08-…json`,
`…/09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json`, `…/10-GATE-PROBE-synthetic-STALE-…json`,
`RB-10-privacy-compliance/artifact-hashes.json`, `…/probes/artifact-hashes.json`,
`…/runs/artifact-hashes.json`, `data-catalogue-c183/artifact-hashes.json`,
`edge-security/commands/backend-pnpm-audit-all-severities.json`,
`…/frontend-pnpm-audit-all-severities.json`, `…/frontend-pnpm-audit-prod.json`.

The collision is structural, not accidental: `record-artifact-hashes.mjs:15` writes
`artifact-hashes.json` **into the evidence tree** to satisfy `check:evidence-seal`, and its payload uses
the key `artifacts: [{file, sha256}]` — the same field name the manifest format uses with `path`
instead of `file`. That is precisely why `data-catalogue-c183/artifact-hashes.json` is rejected with
the distinct message `artifact path is missing` rather than the usual eighteen. **Two gates that share
one directory are in structural conflict.**

**Failure scenario.** RB-01…RB-08 are executed against a real production cell. Eight valid
operator-attested manifests land. `pnpm -C backend ops:evidence:check` still exits 1, listing eleven
"malformed manifests" that are seal files and audit output. PRD-C175 and PRD-C192 — whose *only*
declared measurement is this command — cannot be closed. Someone deletes the seal files to get the
gate green, and `check:evidence-seal` goes red instead.

**Proposed fix.** In `collectJson`, keep a `.json` only if it parses and
`record.format === "streamlineos.production-ops-evidence/v1"`; report everything else on a separate
`IGNORED (not a manifest)` line that does not enter `failures`. Alternatively require manifests to be
named `*.manifest.json`. Either way the sealer's output stops being read as evidence. (I could not
demonstrate this end-to-end: `production-ops-evidence.mjs:259` refuses a `--dir` outside the evidence
root, and this wave is read-only, so the conclusion is derived from source, not from a run.)

---

### F3 (P1) — PRD-C188's evidence bundle prints three hardcoded gaps that head refutes

**Where.** `compliance-drill.mjs:284-287`.

```
284  log("\n─── Known gaps (honest report) ────────────────────────────");
285  log("  INCOMPLETE: Export pipeline — hr_data_requests tracks requests; no export worker produces an actual data file.");
286  log("  INCOMPLETE: object_storage purge adapter — returns FAILED ('not yet implemented, manual cleanup required').");
287  log("  INCOMPLETE: database_rows adapter — marks statusV2=PURGED but does NOT physically delete tenant data rows.");
```

These are unconditional `log()` calls in the drill's happy path. Nothing measures them. I reproduced
the drill at head (exit 0, 7/7 audit rows) and all three print verbatim. All three are false:

| Claim | Head |
|---|---|
| "no export worker produces an actual data file" | `gdpr-export-worker-implementation.ts:356-390` builds a JSON payload and calls `this.storage.uploadFile(...)`. `gdpr-export-outbox.consumer.ts` and `gdpr-export-worker.service.ts` exist. |
| "`object_storage` returns FAILED — not yet implemented" | `organization-purge-adapters.ts:91-125` enumerates file-key columns from `pg_catalog`, collects org file keys, deletes them, and returns `CONFIRMED` when there are none. **The string "not yet implemented" does not occur in that file.** |
| "`database_rows` marks PURGED but does NOT physically delete" | `organization-purge-adapters.ts:78-83` returns CONFIRMED with *"the purge orchestrator physically deletes the organization row after all adapters confirm"*, and `org-purge.service.ts:226` is `await tx.delete(organizations).where(eq(organizations.id, orgId))`. |

**Failure scenario.** PRD-C188 is the one deferred criterion the ledger classifies CODE, and its
evidence is this drill's output. The release-authority record propagates the three lines verbatim into
§4.3 and into §7 as findings 3, 4 and 5, owner "ticket 35". A Privacy/DPO approver reads §7, sees
*"erasure marks PURGED without deleting tenant rows"*, and withholds approval — for a defect that was
fixed at `org-purge.service.ts:226`. The inverse is equally live: if a real gap opens, this block will
keep printing the three that closed and stay silent about it. **A hardcoded honesty report is not an
honesty report.**

**Proposed fix.** Derive the block. Iterate `PURGE_ADAPTER_REGISTRY`, call each `confirm` against the
synthetic org inside the drill's transaction, and print the adapters that return `FAILED` with their
real `detail`. For the export half, assert on `storage.uploadFile` being reached (or on an
`hr_data_requests` row transitioning to a completed status with a non-null artifact key). If the block
cannot be derived, delete it — a silent drill is better than a confidently wrong one.

---

### F4 (P1) — the release-authority record is stale at head in four measured ways, and no gate detects it

**Where.** `release-authority-2026-09-03-UNSIGNED.md:42` (§2 SHAs), `:104-106` (§3 DB census),
`:233` (§4.4 decision records), `:~300` (§7 finding table);
`DEFERRED-CHECKBOX-LEDGER.md:8-9`; `C190-C194-MEASUREMENT-DEFINITION.md:22-24`.

**Measured drift at head:**

| Recorded | At head |
|---|---|
| `7469d2789` / `2f37e1bb0` | `ab6a77a69` / `66f09164f` — **+3 / +4 commits** |
| journal 677, `.sql` 677, `__drizzle_migrations` 677, `__replay` 677, RLS tables 899 | **681, 681, 681, 677, 900** — and `check:replay-ledger` is now **exit 1** |
| §4.4 *"no `privacy-YYYY-MM-DD.md` instance exists"* | 3 unsigned instances exist (`operator-access-2026-09-03.md`, `privacy-C184-pii-policy.md`, `privacy-C185-provider-approvals.md`) |
| §7 row 8: *"2 BROKEN seals — RB-10 `probes/` and `runs/`"* | **1 broken seal**, in `data-catalogue-c183/`; both RB-10 seals now read **OK** |
| §4.1 not listed; §7 rows 3–5 open | `check:envelope-consistency` and `check:placement-bypass` are **green** now; rows 3–5 do not reproduce (F3) |

**And nothing notices.** I grepped both repositories' script directories for `release-authority`,
`RELEASE-AUTHORITY`, `DEFERRED-CHECKBOX` and `C190-C194`: **zero matches.** Contrast
`check:s05-artifact-contract`, which validates the S05 approval template's six functions and three
evidence-index columns and exits 0 at head. The S05 template is gate-protected; the release-authority
record — the more consequential artifact — is not.

**Failure scenario.** A reviewer opens the record at some later head, reads §2, and treats
`7469d2789`/`2f37e1bb0` as the release commit pair. Every number in §3 and §4 was measured at that pair
and none of them holds at the pair being released. Because the record is Markdown with no gate, the
divergence is invisible until someone re-reads all 356 lines by hand — which is exactly the labour the
apparatus exists to remove.

**Proposed fix.** Add `check:release-authority-currency`, wired blocking, that fails when any of:
(a) the record's §2 SHAs ≠ `git rev-parse HEAD` in each repo; (b) the record's `mtime` is older than
the newest file under `42-production-ops/`; (c) the ledger's row count ≠ `TRACEABILITY.md`'s;
(d) any of the 36 approval cells is non-blank while the filename still carries `UNSIGNED`. (d) is the
important one: it is the only mechanical defence against automation filling a signature.

---

### F5 (P1) — the C194 register definition excludes the production findings that actually exist

**Where.** `C190-C194-MEASUREMENT-DEFINITION.md:294` and §2.3.

The table declares deployed evidence manifests **"the only register that can hold a C194 finding"**,
and §2.3 makes `ops:evidence:check` the measurement, *"and it is not a proxy for one."* The conclusion
follows: exit 1, no manifests, therefore *"OPEN and unmeasurable."*

At head that conclusion is wrong. `32-audit.md` — a report filed **against C162, C163 and C164, which
are production criteria** — records **1 P0 and 9 P1**, of which F4 (a spam complaint permanently
suppressing an address for *every* tenant) and F6 (database TLS conditional on the hostname being
Neon) are compliance-class by the definition's own §2.1 wording. **None is dispositioned. None appears
in the record's §7.**

**Failure scenario.** The record states *"the production/compliance register is empty… A reader who
sees '0 findings' and concludes C194 is satisfied has inverted it."* The warning is right and the data
behind it is wrong: the register is **not** empty. An unresolved **P0** — a payment-webhook "Retry"
that re-runs no effect and destroys the failure record — sits outside the record's field of view
because the record only looks at a directory that is empty by construction.

**Proposed fix.** Widen §2.2 to: *a C194 finding is (a) any non-passing assertion in a captured
deployed manifest, **or** (b) any P0/P1 finding filed against PRD-C162–C189 in a v2 ticket report that
is not closed or dispositioned under PRD-C189.* Then enumerate (b) in §7 — at head that is ticket 32's
ten, and tickets 33, 34 and 35 will add more as their reports land. Adopt the §2.4 severity rubric
explicitly, since C194 cannot be closed on severity grounds while the rubric is merely "proposed".

---

### F6 (P2) — nothing binds an evidence manifest's `release.sha` to a real commit, or to the record's pair

**Where.** `production-ops-evidence.mjs:124` — `add(typeof release.sha === "string" && /^[0-9a-f]{7,64}$/i.test(release.sha), …)`.

Any 7–64 hex string passes. There is no `git cat-file -e`, no comparison across the eight manifests in
one run, and no comparison to the release-authority record's §2. `release.topologySha256` is checked
for shape only. At head the evidence tree already cites **at least three distinct commit pairs** —
the record's `7469d2789`/`2f37e1bb0`, `data-catalogue-c183/artifact-hashes.json`'s
`7469d2789`/`45f8a2e99`, and head's `ab6a77a69`/`66f09164f` — with nothing reconciling them.

**Failure scenario.** RB-01 is attested at commit A, RB-05 at commit B a week later, RB-07 at commit C.
All eight manifests validate, `ops:evidence:check` exits 0, and PRD-C190's *"green at the deployed
commit"* is granted for a commit at which the isolation evidence and the load evidence were never
simultaneously true. The singular "the deployed commit" is the whole content of C190 and nothing
enforces it.

**Proposed fix.** Require `release.sha` to resolve in the backend repo (`git cat-file -e <sha>^{commit}`),
require all manifests in one `verify` run to carry an identical `release.sha` and
`release.topologySha256`, and have the release-authority record's §2 assert equality with them.

---

### F7 (P2) — a C190-listed gate is registered non-blocking and is red at head

**Where.** `.github/workflows/frontend.yml:556-559`, `:572-575`, `:601-604`;
registry at `frontend/scripts/check-gate-wiring.mjs:97-122`.

`FE check:gate-wiring` exits 0 reporting **3 registered non-blocking gates**: `check:dead-code`,
`check:route-bundle-budget`, `check:web-vitals-budget`. Each carries an honest, dated, owner-named
reason and a stated number that must reach zero — good practice, and `staleNonBlocking` at `:512-514`
fails the gate if the entry outlives the failure. But:

- **`check:dead-code` is gate #27 of the C190 list**, and I measured it **exit 1** at head
  (2 unclassified exports — `hooks/api/id-cursor-page-schema.ts:idCursorPageContract` and
  `hooks/api/offset-page-schema.ts:offsetPageContract`, *different* from the single export the
  registry's reason names, so the reason text is itself stale).
- The C190 definition contains no rule about non-blocking registration, and the record's §4.1 has no
  column for it.

**Failure scenario.** CI is green at the release commit. The record's §4.1 reports the C190 subset
green. Three gates were red and muted by registration, one of them a listed member. PRD-C016's
*"skipped … gates never count as passing"* is violated by a mechanism that is itself well documented —
the documentation just never reaches the release record.

**Proposed fix.** Have `check:release-authority-currency` (F4) read both `NON_BLOCKING_BY_DESIGN`
registries and fail if any C190-listed gate appears in either; and give §4.1 a required
`blocking?` column so a muted red is visible in the record rather than only in a script comment.

---

### F8 (P2) — inconclusive gates leave no artifact the release record can cite

**Where.** `run-gate.mjs:52-55`; no aggregator anywhere.

`decide(2, …)` returns `{exit: 0, warn: annotation}`. The annotation text is excellent — *"This step
passes only because the prerequisite is absent, never because the gate was satisfied."* — but it is a
GitHub log line. It is not written to a file, not counted, and not reachable from the release-authority
record. run-gate is wired into 9 steps total across both repos.

**Failure scenario.** At the release commit, the hermetic `gates` job runs without a database. Six
database-dependent gates exit 2. Every step is green and every annotation scrolls past. The record's
§4.1 says *"Gates that exited 2 (inconclusive) in this subset: none"* — true of its hand-picked
5-gate subset, and read by the next person as true of the release. C016's clause is satisfied in
spirit by a warning nobody has to read.

**Proposed fix.** Have `run-gate.mjs` append `{script, exitCode, prerequisite, timestamp}` to
`$GITHUB_STEP_SUMMARY` **and** to a `gate-results.jsonl` uploaded as a workflow artifact; add a final
job that fails when that file is non-empty on a release-tagged run. Make §4.1 of the record cite that
artifact rather than a hand-typed "none".

---

### F9 (P2) — a broken seal at head, in a different place than the record records

**Where.** `architecture-refactor/final-refactor/evidence/42-production-ops/data-catalogue-c183/artifact-hashes.json`;
sealer at `check-evidence-seal.mjs:50`.

Measured: `BE check:evidence-seal` **exit 1** — `6 seal(s) verified · 68/68 sealed files match · 1 broken`.
The broken one is `data-catalogue-c183/artifact-hashes.json` — `0/0 match`, with five files added to the
sealed directory after the seal was written (`README.md`, `ai-redaction-probe.mjs`,
`ai-redaction-probe.txt`, `pd-column-scan.sql`, `pd-columns.csv`). The record's §7 row 8 describes two
broken seals in `RB-10-privacy-compliance/probes/` and `/runs/`; both now read **OK**.

This is a gate doing its job over a tree still being written, not tampering. But C190 gate #70 is red
at head, and the record's account of *why* is wrong. **Proposed fix:** ticket 35 re-seals
`data-catalogue-c183/` once it stops writing; the release-authority record re-reads the gate rather
than quoting a 15-minute-old reading.

---

## 4. What head already gets right

Recorded deliberately, because a release-authority audit that lists only defects mis-describes this
ticket. The apparatus is the strongest artifact I read in this wave.

1. **Nothing is forged.** 36 approval cells across 6 decision documents; every one blank. Three
   decision drafts landed from ticket 35 *after* this record was written and every one opens with
   `UNSIGNED DRAFT — NOT AN APPROVAL`. The record's §9 grants `Label: none` and its attestation block
   is blank with an explicit prohibition on automation filling it. This is the single most important
   property of the ticket and it holds without exception.
2. **The ledger is arithmetically and referentially sound.** 195 rows, 195 distinct IDs,
   159/26/10 reproducing its stated totals, and — verified programmatically against `TRACEABILITY.md`
   and the PRD — **0 ownership mismatches, 0 orphans in either direction**. Every DEPLOYED and HUMAN
   call quotes the criterion's own wording so the classification is disputable on text.
3. **`check:prd-traceability` is fail-closed and green at head**: 195 manifest rows, 195 ticket
   criteria, 0 checked / 195 unchecked, one owner each, quoted verbatim.
4. **The deployed-evidence gate bites and cannot be laundered.** `ops:evidence:self-test` exit 0 with
   `validDeployedShapePasses`, `alteredArtifactBlocked`, `selfTestClaimBlocked`. Artifacts are
   re-hashed and byte-counted; `FORBIDDEN` rejects self-test/dry-run/mock/fixture/fake/simulation
   wording in artifact bodies; `SECRET` rejects unredacted credentials; `safePath` refuses symlinks and
   path escapes. **303 local evidence files have accumulated and the runbook count is still 0 of 8**,
   which is exactly correct.
5. **`check:alert-ack` refuses to pretend.** Exit **2** with `PREREQUISITE MISSING: ALERT_WEBHOOK_URL`,
   its self-test green, and `check-gate-wiring` registering it unwired-by-design because it needs
   *"proof a person received the page, which no CI job can fabricate."* Running it to record a blocked
   state rather than assuming one is the right instinct and it reproduced this pass.
6. **The template distinguishes C161 from C195 on the single word "environment"** and forces a scope
   choice, which is a genuinely subtle reading of two criteria that look identical.
7. **Local drill output is labelled as local.** `RB-05-local-run-NOT-deployed-evidence.md`,
   `RB-07-local-run-NOT-deployed-evidence.md`, `09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json`.
   Tickets 33–35 could have quietly deposited 303 files and let the count speak; they did not.
8. **The record volunteers its own instability** — two `ops:evidence:check` readings nine minutes
   apart, three `check:evidence-seal` readings, and the explicit conclusion that *"an evidence tree
   written by many concurrent agents is not stable at a wall-clock time."* That conclusion is correct
   and this audit is its confirmation: four of its numbers moved again.
9. **`compliance-drill.mjs` genuinely works.** Exit 0 at head, 7 of 7 steps, 7 of 7 required audit
   rows, erasure correctly refused under legal hold, transaction rolled back, nothing committed. Only
   its epilogue is wrong (F3).

---

## 5. Blocked on infrastructure — and what would actually measure each

Five of ticket 36's seven criteria cannot be closed on this machine at any effort. Naming the exact
missing input for each, so no later reader mistakes "blocked" for "not attempted":

| Criterion | Missing input | What would measure it |
|---|---|---|
| C016 (deployed half) | a deployed environment **and** a clean commit pair | orchestrator lands/reverts 115 + 182 porcelain entries; a deploy of that pair |
| C190 | a deployed commit | the full 70-gate run (after F1 widens it to 136) at the deployed SHA, through `run-gate.mjs`, with the exit-2 artifact from F8 |
| C191 | 33 of 34 deferred boxes need an environment or a person | RB-01…RB-08 executed; six signatures |
| C192 | a provisioned cell: region, cell id, non-local `https` target, physical replica, PITR, object store, alert webhook, cloud invoice | 8 `deployed-operator-attested` manifests → `ops:evidence:check` exit 0 (blocked today by F2 regardless) |
| C193 | six named humans | signatures in `release-authority-…md` §5 and the S05 records |
| C194 (deployed half) | the drills that produce deployed findings | after F5, `ops:evidence:check` assertions **plus** the disposition state of every P0/P1 filed against C162–C189 |
| C195 | a release authority | a named person signing §9 at a clean, deployed pair |

**Not measured by this audit, and not claimed:** backend/frontend builds, typechecks, `test`,
`test:e2e:seeded`, `migration:proof`, `db:verify-rls`, and **67 of the 70 gates in the C190 list**.
Those are the orchestrator's and ticket 31's. Every one is reported here as **not run**, never as
passing. `check:alert-ack` exited **2** and is reported as **inconclusive**, never as green.

---

## 6. The shortest path to closing what *can* be closed

Everything below is repository work and needs no environment and no signature:

1. **F1** — replace §1.2's hand-maintained list with a generated one, or state its 59/136 coverage
   honestly. Without this, every future "C190 green" is unsound.
2. **F2** — give `collectJson` a `format` discriminator. Without this, C192/C175 cannot reach exit 0
   even after eight real deployed drills.
3. **F3** — derive or delete `compliance-drill.mjs:284-287`. Three false compliance findings currently
   propagate into the record a DPO is being asked to read.
4. **F5** — widen §2.2 and enumerate ticket 32's 1 P0 + 9 P1 in §7.
5. **F4** — add `check:release-authority-currency`, including the "no filled signature in an UNSIGNED
   file" assertion.
6. **F9** — ticket 35 re-seals `data-catalogue-c183/`; the record re-reads gate #70.
7. Re-stamp §2, §3, §4.1 and §4.4 at whatever pair the orchestrator lands — after, not before, 1–6.

---

## 7. Completion-evidence status for the ticket

The ticket asks for *"frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and
artifact locations"* and for the *"source PRD checkbox states and the traceability manifest updated in
the same completion commit."*

- SHAs: recorded (§0). **Neither tree clean.**
- Commands and pass/fail/skip: recorded (§1.6) — **11 pass · 9 fail · 1 inconclusive**, over 21
  executions, plus 6 psql queries.
- Artifact locations: recorded (§1.1–1.5).
- **PRD checkbox states: NOT updated, and correctly so.** `check:prd-traceability` reads
  0 checked / 195 unchecked at head, and no criterion of ticket 36 is met. Checking any box for
  ticket 36 at this head would be false.
