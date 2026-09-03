# 30 — Release gates and portable verification harness — HEAD AUDIT

**Audited:** 2026-09-03, ~22:35–23:35 IST, read-only. Nothing in either working tree was
modified. All mutations were performed on copies under the session scratchpad.

| Repo | HEAD at audit | Branch |
|---|---|---|
| backend `streamlineos-backend` | `66f09164f7056b377331bcc1fff5f128ada06b95` | `release/code-10-10-v2` |
| frontend `streamlineos-frontend` | `26df21488854b5ca72b938802295965783f8b948` | `release/code-10-10-v2` |

15 backend commits and 8 frontend commits have landed since the prior audit's closing SHAs
(`591cf663…` / `372cbc10…`). Both trees are also **dirty**: 57 modified paths in the backend,
including `openapi.json` and a 960-line uncommitted rewrite of
`src/scripts/check-envelope-consistency.mjs` by the concurrent envelope-repair wave. Where a
measurement depends on uncommitted work, this report says so.

**Verdict: PARTIALLY MET.**
PRD-C011 and PRD-C015 hold at head and are independently bite-proven below. PRD-C064's
database half — blocked in the prior audit — is now **largely CLOSED** against the two
bootstrapped databases. PRD-C104 is **NOT met**: the knip reach defect is unchanged in both
repos, three further gates were found that cannot bite (two of them new), and
`check:test-suppressions` — the gate that enforces C104's "zero silently skipped/quarantined
tests" clause — is **blocking and RED at head**.

---

## 1. What I read, with numbers

**Documents**
- The ticket (4 criteria) and the prior audit `reports/30-release-gates-harness.md` — 767 lines, read in full.

**Gate corpus enumerated at head**

| | backend | frontend |
|---|---|---|
| `check:*` entries in `package.json` | 189 | 69 |
| — gate invocations (non-`:self-test`) | 100 | 35 |
| — `:self-test` invocations | 89 | 34 |
| "core" gates after removing `:emit/:list/:baseline/:run` helpers | 90 | 35 |
| core gates **with** a `:self-test` | 86 | 33 |
| core gates **without** one | 4 (3 real + madge) | 2 (both accepted) |
| workflow files | 7 | 1 |
| jobs / `run:` steps seen by `check-gate-wiring` | 15 / 161 | 6 / 48 |
| gates `check-gate-wiring` says can FAIL the job | 91 of 100 | 32 of 35 |
| `continue-on-error: true` steps at head | 3 | 3 |

**Executed**
- **123 self-tests** — every `:self-test` in both repos (89 BE + 34 FE), run one at a time under `nice -n 10`.
- **46 distinct gates** run to an exit code (38 backend, 8 frontend), several more than once.
- **9 bite-proof mutations** in scratchpad fixtures: 4 against backend `check-gate-wiring`, 1 against the frontend copy, 4 exit-code cases against `run-gate.mjs`.
- **2 databases** compared object-by-object: `scratch_head_1010` and `scratch_cold_1010` — 944 tables, 12,580 columns, 4,390 index definitions, 12,951 constraint definitions, 980 policy rows, plus 13 aggregate catalog axes.
- **9 gate scripts read line-by-line**: `gate-corpus.mjs` (145), `run-gate.mjs`, `check-gate-wiring.mjs` (both repos, ~790 each), `check-replay-ledger.mjs` (57), `check-cache-key-shapes.mjs` (339), `check-test-suppressions.mjs`, `check-evidence-seal.mjs`, `check-tenant-relationships.mjs` (651), `check-envelope-consistency.mjs` (head/dirty).
- Both `knip.json` files, both `package.json` gate blocks, all 8 workflow files.

**Not run, deliberately:** `pnpm build`, `typecheck`, a bare `jest`, and a raw `knip` module-graph
pass — each wants 4–12 GB and 26 agents share this laptop. Where that blocks a claim it is
marked NOT MEASURED with the exact command that would settle it.

---

## 2. Prior audit re-verified at head

| Prior claim | Status at head | Evidence |
|---|---|---|
| 18 → 6 `continue-on-error` flags, 12 removed | **HOLDS** | 3 BE (`ci.yml:71` raw knip, `1114` perf capture, `1135` artifact upload) + 3 FE (`frontend.yml:558,574,603`). None is a `check:*` gate on the BE side; the 3 FE ones are the registered `NON_BLOCKING_BY_DESIGN` set. |
| `check-gate-wiring` detects step- and job-level `continue-on-error`, 28 assertions | **HOLDS, re-proven** | Self-test 28/28 in both repos. I re-bite-proved it from scratch — see §3.1. |
| No hardcoded workstation path in either repo | **HOLDS** | 0 hits for `/Users/`, `/home/<user>/`, `C:\Users` across `src/scripts`, `scripts`, both `package.json`, all 8 workflows. The 6 remaining `C:\Program Files\…` literals are Chrome/Edge discovery candidates; one more is a platform-aware synthetic root in `frontend/scripts/check-dead-code.mjs:258`. |
| Three depth-guess defects fixed | **HOLDS** | The only surviving `"../../.."` in a top-level gate script is the explanatory comment at `production-ops-evidence.mjs:28`. Every other `../..` resolves script-dir → repo root and stays inside the repository. |
| `run-gate.mjs` is Node and splits exit 2 from exit 1 | **HOLDS, independently proven** | See §3.2 — I ran all four exit classes through it. |
| `check:db-generate-guard` given a real `--check` half | **HOLDS** | `677 journal entries, latest snapshot 0464, real drift 212 — db:generate is BLOCKED` · exit 0. (Drift was 207 at the prior audit; the chain has grown.) |
| `check:openapi-coverage` honest at 25/3642 (0.69%) | **HOLDS** | Gate prints it. **Independently recounted** from `openapi.json`: 3,644 operations, **3,643 carry a bare 2xx key (99.97% — the old false rule), 26 declare a resolvable 2xx schema (0.71%), 0 dangling `$ref`s.** |
| `check:envelope-consistency` exit 1 for `/public/kb/{slug}/attachments` | **RESOLVED, but on dirty code** | The endpoint now declares `data:{items,total,page,pageSize,totalPages}`. The gate now reads **336 of 336 paginated GETs (100%)**, up from 2, and is exit 0 — but that reach comes from a **960-line uncommitted rewrite** of the gate. Committed head is still the 2-of-336 version. Owner: the envelope-repair wave. |
| `check:contract-vendor` exit 1, vendored copy stale | **STILL OPEN** | exit 1: `frontend/contracts/openapi.json` hash `9cba20e2…` vs backend `f3f2e42a…`. `openapi.json` is dirty (mtime 21:47). Owner: ticket 04. |
| `check:baseline-integrity` exit 0 | **REGRESSED to exit 1** | 1 unregistered constant: `check-envelope-consistency.mjs :: MAX_HOPS = 8` — introduced by the same uncommitted envelope rewrite. The mechanism working, on another lane's in-flight work. |
| FE `check:dead-code` red for `chat-helpers.ts:resolveFileUrl` | **CHANGED** | `resolveFileUrl` is gone. Two *different* unclassified exports at head: `hooks/api/id-cursor-page-schema.ts:idCursorPageContract`, `hooks/api/offset-page-schema.ts:offsetPageContract`. The registered exception's stated reason is now false — finding F7. |
| 15 route-bundle breaches | **NOW 18** | Measured. The registered exception still says 15 — finding F7. |
| 1 Web Vitals violation (mobile `/crm/inbox` CLS 0.109) | **HOLDS, unchanged** | Exception recorded, still counted as a failure. |
| 3 backend gates with no self-test | **HOLDS** | `check:s05-artifact-contract`, `check:alert-system`, `check:body-binding`. Confirmed by enumeration of all 90 core gates. |
| knip config NOT landed; 29 BE / 8 FE unclassified | **UNCHANGED — still open** | Both `knip.json` files are byte-for-byte in the defective shape. Finding F1. |
| `check:file-sizes` / `check:type-assertions` red at close | **BOTH GREEN** | FE `check:file-sizes` exit 0 (5,358 files, all <500, 0 exceptions). FE `check:type-assertions` exit 0. |

---

## 3. Per-criterion assessment

### PRD-C011 — Gate integrity — **MET**

Walked in the order the criterion names.

#### 3.1 `check-gate-wiring` detects the "cannot fail" class — bite-proven by me at head

I copied `check-gate-wiring.mjs`, `package.json` and all 7 workflow files into a scratchpad tree
(`…/scratchpad/gwfix`), symlinked `node_modules`, and mutated the **copy**. Control first.

| Fixture | Exit | Verdict printed |
|---|---|---|
| unmutated copy (control) | **0** | `100 gates, 91 able to FAIL the job … 9 deliberate exceptions` |
| step-level `continue-on-error: true` on the `check:conflict-targets` step | **1** | `CANNOT FAIL: check:conflict-targets — every step invoking it carries continue-on-error` |
| job-level `continue-on-error: true` on the `gates` job | **1** | **80** gates reported `CANNOT FAIL` |
| replace the gate's `run:` with `echo skipped` | **1** | `UNWIRED: check:conflict-targets — no run: step of any reachable job invokes it` |
| `ci.yml` reduced to `name: empty` | **1** | `UNPARSEABLE WORKFLOW … GitHub loads nothing from this file, so every gate it names is DEAD` |
| restored control | **0** | — |

Frontend copy, same treatment (`…/scratchpad/gwfe`): control exit 0 (`35 gates, 32 able to FAIL`);
flagging the `check:routes` step → exit 1, `CANNOT FAIL: check:routes`.

Self-tests: **28 assertions pass in both repos.**

#### 3.2 `run-gate.mjs` — bite-proven by me at head

Four synthetic gates in a scratchpad `package.json`, run through `src/scripts/run-gate.mjs`:

| Gate exit | run-gate exit | Behaviour |
|---|---|---|
| 0 | **0** | passes through |
| 1 | **1** | fails the step, and **stops the chain** (`g1 g0` → exit 1) |
| 2 | **0** | tolerated, and emits `::warning title=INCONCLUSIVE::g2 exited 2 — the sibling backend checkout. The rule was NOT checked, so this run proves nothing about it.` Chain continues (`g2 g0` → exit 0). |
| 7 | **7** | any other non-zero fails |

It also refuses to run without `--prerequisite`, so an operator cannot tolerate exit 2 without
naming what was missing. That is a stronger contract than the prior audit described.

#### 3.3 Flag census and exception hygiene

- 6 flags remain, 3 per repo, exactly as claimed. Backend `NON_BLOCKING_BY_DESIGN` is `{}` — the 3 BE flags are on the raw `knip` report, a jest perf capture, and an artifact upload, none of which is a `check:*` gate. Frontend registers all 3 of its own.
- Backend `UNWIRED_BY_DESIGN` holds 9 entries, each with a reason; 8 are live-database or booted-app scripts, 1 is `check:alert-ack` (needs a human-typed nonce).
- **Gap:** `falseReasons` (`check-gate-wiring.mjs:527-540`) validates only `UNWIRED_BY_DESIGN` reasons, and only that a `*.yml` they name exists and mentions the gate. It never inspects `NON_BLOCKING_BY_DESIGN` reasons, and it cannot notice that a reason's cited defect has moved. Two of the three FE entries are now factually wrong — finding **F7**.

**C011 verdict: MET.** The rule exists, bites at step and job level, is self-tested, and I
reproduced every bite independently at head.

---

### PRD-C015 — Release harness portability — **PARTIALLY MET**

| Dimension | Result |
|---|---|
| Hardcoded workstation paths | **0** across `src/scripts`, `scripts`, both `package.json`, all 8 workflows |
| Depth guessing outside the repo | **0** live sites; the only `"../../.."` left is the comment recording the fix |
| Shared resolver adoption | 10 backend scripts, 24 frontend scripts reference the workspace resolver / `STREAMLINE_BACKEND_ROOT` |
| Bash-only constructs in gate steps | **none** — no `$?`, no `set -e`, no `[[ ]]`, no backticks, no `shell:` override in any gate `run:` block in either workflow |
| Shell-out from gate scripts | 1 file (`db-setup.mjs`), not a gate |
| `run-gate.mjs` is Node, not bash | confirmed, both repos, both wired |
| **macOS execution** | **MEASURED** — 123 self-tests and 46 gates all executed here on darwin 25.6.0 |
| **Linux execution** | assumed from CI; not observed by me |
| **Windows execution** | **NOT MEASURED, and no runner exists** |

**The gap:** every job in both repos is `runs-on: ubuntu-latest` — 22 occurrences, zero
`windows-latest`, zero `macos-latest`. The criterion says the harness must resolve roots "on
Windows, macOS and Linux". The Windows half rests entirely on code inspection: Node instead of
bash, `node:path` segment joins, no `$?`. That reasoning is sound and I found nothing
contradicting it, but **nothing has ever executed it on Windows**. Finding **F8**.

**C015 verdict: PARTIALLY MET** — the code is portable and proven so by inspection plus a full
macOS run; the cross-OS *execution* claim has no runner behind it.

---

### PRD-C104 — Every gate bite-proven; zero skipped/quarantined tests — **NOT MET**

Walked as three sub-claims.

#### (a) Bite-proof census — 123 self-tests executed

| | backend | frontend |
|---|---|---|
| `:self-test` scripts run | 89 | 34 |
| exit 0 | **87** | **34** |
| exit 1 | 1 — `check:test-typecheck:self-test` (fixture tsconfig include pattern) | 0 |
| exit 2 | 1 — `check:replay-ledger:self-test` without `COLD_DATABASE_URL` | 0 |

Then the sharper question: **does the script the `:self-test` names actually implement a
self-test?** Static sweep — does the target file contain any `--self-test` / `selfTest` /
`SELF_TEST` handling at all:

> **Backend: 86 of 89 handle the flag. 3 IGNORE IT.**
> `check:replay-ledger:self-test`, `check:cache-key-shapes:self-test`, `check:hr-pagination:self-test`.

Resolved one at a time:

- **`check:hr-pagination`** — false alarm. The script runs its assertions unconditionally and prints `Self-tests passed.` on every invocation. Naming issue only; the bite exists.
- **`check:replay-ledger`** — real. `check-replay-ledger.mjs` is 57 lines with **no argv handling whatsoever**; `--self-test` is silently discarded and the live DB check runs a second time. `db-gates.yml:251-253` already documents this and deliberately does not invoke it — but `package.json:372` still ships the trap. The gate has **no hermetic bite-proof at all**. Finding **F3**.
- **`check:cache-key-shapes`** — the worst of the three. Finding **F2**.

A second, independent sweep asked: which gate scripts contain no `process.exit` / `process.exitCode` / `throw` **and** no output call — i.e. cannot signal a failure?

> Backend: **1** — `src/scripts/check-cache-key-shapes.mjs`. Frontend: **0**.
> (`check:cycles` and `check:tenant-isolation:run` are external tools, correctly excluded.)

I then ran it: `node src/scripts/check-cache-key-shapes.mjs` emits **0 bytes** and exits **0**.
Its header says it outright — *"Cache key SHAPE resolution **for check-cache-invalidation.mjs**"*.
It is a library. Both halves of `ci.yml:470-472` are no-ops.

#### (b) "Critical tests exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches"

Measured, not asserted:

| Gate | Exit | Measured reach |
|---|---|---|
| `check:transaction-callbacks` | 0 | 2,126 spec files · 280 with a transaction double · 482 doubles · **271 invoke the callback**, 7 declared-unreached, 0 reject, 2 VOID (ratchet 2) |
| `check:authz-deny` | 0 | 3,633 HTTP handlers · 3,235 authorization-gated · **924 of 3,235 (29%) have a declared deny test**; 2,311 uncovered against a ratchet of 2,441 |
| `check:vacuous-assertions` | 0 | 2,008 spec files · 15,397 test callbacks · 58,225 `expect()` calls · 1 no-assertion, 2 tautology, 5 early-return, **0 focused, 0 floating** (7 registered) |
| `check:mock-surface` | 0 | 4,194 doubles scanned, 279 classes resolved, **0 phantom mock methods** |
| `check:conflict-targets` | 0 | 0 new uninferable `ON CONFLICT` target, shrink-only |
| `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent`; 4 documented SKIPs |
| `check:outbox-consumers` | 0 | 216 modules / 1,209 providers; 24 emitted event types, all 24 registered |
| `check:n1-growing-loops` | 0 | **97 growing-loop sites across 73 files** against a ratchet of 102 — "a ratchet to drive to zero, not a clean repository" |
| `check:unbounded-reads` | **1** | 2,305 service files · 752 unbounded reads · 3 actionable · **1 unclassified** (finding F5) |

The honest reading: transaction callbacks and mock surface are genuinely covered; the
**authorization deny half is at 29%** and green only because it is ratcheted. That is a measured
C104 shortfall, not a defect — but the criterion asks for the number and the number is 29%.

#### (c) "Zero silently skipped/quarantined tests" — **FAILS**

`check:test-suppressions` is **blocking** (`ci.yml:610`, no `continue-on-error`) and is
**exit 1 at head**:

```
Spec files 2141 · suppression sites 20 · conditional aliases 36
  conditional 37 · placeholder 13 · quarantine 6
FAIL — 37 runtime-selected suppressions, above the ratchet of 29.
```

Re-run minutes later: 38 (other agents are committing). Composition, from `--list`:
- **13 PLACEHOLDER** — empty bodies, mostly `src/degradation/*.spec.ts` (provider integration blocked on real S3/Ably/replica).
- **6 QUARANTINE** — live assertions that do not run, all six in `src/modules/ai/core/crm-copilot.service.phase2.spec.ts` (CRM, out of release scope).
- **37–38 CONDITIONAL** — `const describeDb = ENABLED ? describe : describe.skip` and friends. I enumerated 35 such sites by grep; they are the `.db.spec.ts` wave this release added (chat conflict targets, invoices, party, payroll, activities, finance, build, cron, plus 5 seeded-e2e suites).

The ratchet was re-registered 28 → 29 in `ecbf55c21`. Head is 8–9 above it. This is not gate
noise: it is exactly the clause C104 writes down, failing. Finding **F4**.

#### (d) The vacuity primitive is present but unadopted and unguarded

The prior audit shipped `src/scripts/gate-corpus.mjs` (145 lines, `reportCorpus` refuses an empty
or fully-filtered corpus with exit 2, 20-assertion self-test). I measured its real adoption — not
by regex over prose, but by who imports and calls it:

> **Backend: 2 of 90 core gates (2.2%)** — `check-openapi-coverage.mjs`, `check-envelope-consistency.mjs`.
> **Frontend: 0 of 35. `gate-corpus.mjs` does not exist in the frontend repo at all.**

And its 20-assertion self-test **is not wired anywhere**: `grep gate-corpus package.json` → no
match; `grep gate-corpus .github/workflows/` → no match. The one primitive standing between the
two repaired gates and a return to false-100% reporting has no CI coverage of its own. Findings
**F6** and **F10**.

**C104 verdict: NOT MET.** Three gates cannot bite (one new-and-serious, one documented, one a
naming artifact), the skipped-test clause is red at head, and the anti-vacuity primitive reaches
2.2% of one repo and 0% of the other.

---

### PRD-C064 — Post-cleanup proof chain — **LARGELY CLOSED** (was PARTIAL)

This is where the prior audit stopped. Every row below was executed against the two databases
provided. **Caveat first, because it bounds every row: both databases were bootstrapped at
journal entry 677. Head declares 678** — `1054_chat_presence_membership_unique_total.sql` landed
untracked during this session. So every catalog measurement below is parity *at 677*, not *at 678*.

| C064 sub-proof | Prior | **Head** | Evidence |
|---|---|---|---|
| migration chain | ✅ | **exit 0** | `check:migration-chain` — `no issues found`, watermark `1803000010128` |
| migration ledger | live NOT RUN | **exit 0** | `check:migration-ledger` — 677 applied vs 677 journal entries, 0 orphan/duplicate/unreachable |
| migration discipline | ✅ | **exit 0** | 677 SQL files, 0 new violations; baselines lock_timeout=152, fk-not-valid=40, set-not-null=20 |
| snapshot-chain guard | ✅ | **exit 0** | 677 entries, snapshot 0464, drift 212, `db:generate` blocked |
| replay ledger (cold DB) | NOT RUN | **exit 0 at 20:5x → exit 1 now** | `677/677 applied, 0 orphans, 944 public tables, LEDGER STATE: CLEAN` when I first ran it; after 1054 landed, correctly `678 vs 677 … HAS ISSUES`. The gate biting on real drift, live. |
| **two clean bootstraps** | NOT RUN | **PROVEN** | See §3.4 — byte-identical catalogs across two independently produced databases |
| **catalog parity** | partial | **PROVEN** | 13 aggregate axes identical; 30,901 object definitions diffed line-for-line, **0 differing lines** |
| **tenant relationships** | exit 2 (mid-bootstrap) | **exit 0** | 677/677 ledger rows · 214 single-column tenant FKs · 79 CRM + 134 Inventory + 1 platform-global excluded · **0 actionable**. Independently corroborated: 2,892 FKs total, 1,536 single-column, 209 single-column tenant→tenant, and every one of those I could name outside CRM/Inventory is a CRM table without a `crm_` prefix (`deals`, `leads`, `clients`, `quotes`, `client_accounts`) or the one registered platform-global pair (`organization_reservations → organization_lifecycle_sagas`). |
| tenant indexes | ✅ | **exit 0** | 347 schema files, **840 tenant tables, 840 with a leading tenant index** |
| **RLS** | NOT RUN | **PROVEN** | See §3.5 |
| **query plans** | NOT RUN | **PARTIAL** | Shape proven, cost not — see §3.5 |
| catalog parity (permissions) | ✅ | **exit 0** | `check:permission-keys` — backend catalog 704 keys, frontend `PermissionKey` union 704 keys |
| relation keys reach the frontend | — | **exit 0** | 111 relation keys, all known or triaged |
| OpenAPI coverage | ✅ | **exit 0** | 3,642 ops stamped; error-shapes 100%; request-schemas 1,386/1,386; response-schemas 25/3,642 at the ratchet, printed as NOT A PASS |
| contract breaking-change | ✅ | **exit 0** | 102 published ops, 3,554 internal, 23 webhook events |
| contract registry / operation-ids | ✅ | **exit 0 / exit 0** | 3,656 ops classified; 3,642 ops over 2,700 paths, 0 duplicate ids |
| **contract vendor** | exit 1 | **exit 1 — STILL** | `frontend/contracts/openapi.json` stale. Owner ticket 04. |
| **cache invalidation** | NOT RUN | **exit 0** | `check:cache-invalidation` — **1,076 service files scanned**, 187 write sites / 177 distinct shapes, 475 invalidate sites, 131 `CACHE_KEYS` factories, table map 10/10, 0 blockers. Its self-test is a real named-case fixture (verified distinct from the gate run). |
| `check:audit-log-privileges` (non-owner) | inconclusive | **exit 0** | `{"role":"streamline_app","isAppRole":true,"updateRevoked":true,"deleteRevoked":true,"triggerPresent":true}` |
| `check:module-lifecycle` (non-owner) | inconclusive | **exit 0** | 11/11 timesheet tables have non-nullable `org_id` with an FK |
| declaration↔catalog drift (4 gates) | inconclusive | **exit 0 ×4** | column-drift OK; constraint-drift 873 declared tables / 4,948 declared constraints vs 4,323 live indexes + 5,494 live constraints, 136 integrity + 51 performance findings, **0 new** against baseline 187; referential-action-drift OK (11 baselined mismatches printed); set-null OK — 564 declared SET NULL FKs, 276 needing a column list, **0 unreachable**, 805 catalog SET NULL constraints all matching |
| zero unclassified unnecessary keys / no orphaned schema-or-code reference | NOT RUN | **NOT MET** | BE `check:dead-code` green **over a knip config that cannot see the corpus** (F1); FE `check:dead-code` exit 1 with 2 unclassified exports |

#### 3.4 Two clean bootstraps and catalog parity — the proof

`scratch_head_1010` (built by `db-bootstrap.mjs`) and `scratch_cold_1010` (built by
`replay-chain-cold.mjs`) are two independently produced databases at the same journal point.

Aggregate — identical on all 13 axes:

```
tables 944 · columns 12580 · indexes 4390 · constraints 12951 · fks 2892
rls_enabled_tables 900 · rls_forced_tables 1 · policies 900 · triggers 169
functions 437 · views 0 · sequences 691 · enums 476
```

Aggregates can match while names differ, so I diffed the object definitions themselves:

| Dump | head rows | cold rows | differing lines |
|---|---|---|---|
| `(table, column, type, nullable, default)` | 12,580 | 12,580 | **0** |
| `(indexname, indexdef)` | 4,390 | 4,390 | **0** |
| `(table, conname, pg_get_constraintdef)` | 12,951 | 12,951 | **0** |
| `(table, policy, qual, with_check, cmd, roles)` | 980 | 980 | **0** |

**30,901 object definitions, zero divergence.** That is the "two clean bootstraps + catalog
parity" evidence C064 asks for, and it is the single largest thing the prior audit could not
produce.

#### 3.5 RLS and query plans

RLS census on `scratch_head_1010`:

- 825 tables carry `org_id`; **824 are `relkind='r'` with RLS on, 1 is the partitioned `notifications` with RLS on — 825 of 825.**
- 900 tables have RLS enabled; **every one has exactly one policy** (`policy count distribution: 1 → 900 tables`). **Zero RLS-enabled tables without a policy** — no accidental deny-all.
- The 76 RLS tables lacking `org_id` all carry `organization_id`; **0 RLS tables have neither.** Every policy is `tenant_isolation` keyed on `app.current_org_id()`.
- The 44 tables without RLS are all platform/control-plane (`organizations`, `users`, `permissions`, `billing_plans`, `indian_states`, …) and **none of them has a tenant column.**
- `rolbypassrls` — `streamline_app: f`, owner `t`. The gates above that must see a real boundary were run as `streamline_app`.

Empirical bite, as `streamline_app`:

```
-- app.organization_id unset:
explain select id from hr_people limit 50;
ERROR:  no tenant context: app.organization_id is not set for this transaction   (SQLSTATE 42501)
```

It **fails closed**, at plan time, before a row is considered. With the context set:

```
Limit -> Bitmap Heap Scan on hr_people
          Recheck Cond: (org_id = current_org_id())
          -> Bitmap Index Scan on idx_hr_people_org
```

and an explicit cross-tenant predicate is clamped rather than served:

```
select id from hr_people where org_id = '…0002';
Result
  One-Time Filter: (current_org_id() = '…0002'::text)   -- false, so zero rows
```

**Query plans: PARTIAL.** Plan *shape* is proven (tenant-leading index chosen, RLS predicate
attached, no seq scan). Plan *cost* is not: these databases hold 3 organizations, 3 users and
0 `hr_people` rows, so `EXPLAIN (ANALYZE, BUFFERS)` here measures nothing about tenant size.
What would settle it: the local seeded Postgres run (`jest-e2e-seeded.json`, `route-budget-http`
+ `route-db-call-budget`) with `SEED_ORG_ID` / `SEED_MINORITY_ORG_ID` populated — which is also
what the five absent `CI_PERF_SEED_*` secrets exist to supply.

**C064 verdict: LARGELY CLOSED.** Two clean bootstraps, catalog parity, tenant relationships,
tenant indexes, RLS, migration chain/ledger, cache invalidation and the OpenAPI/contract set are
all now measured green. Three items remain open: the stale vendored contract (ticket 04), query
plans at realistic tenant size (needs a seed), and "zero unclassified unnecessary keys / no
orphaned reference" — which cannot be answered while knip cannot see the corpus.

---

## 4. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P1** | `streamlineos-backend/knip.json:7-11,16` · `streamlineos-frontend/frontend/knip.json:13-15` | knip cannot report dead code in either repo; the BLOCKING backend `check:dead-code` is green over that blind input |
| F2 | P2 | `streamlineos-backend/.github/workflows/ci.yml:470-472` · `package.json:365-366` | `check:cache-key-shapes` and its `:self-test` are two no-op CI steps over a library module — 0 bytes of output, always exit 0 |
| F3 | P2 | `streamlineos-backend/package.json:372` · `src/scripts/check-replay-ledger.mjs` | `check:replay-ledger:self-test` is not a self-test; the script has no argv handling and the gate has no bite-proof |
| F4 | **P1** | `streamlineos-backend/src/scripts/check-test-suppressions.mjs:100` | Blocking gate RED at head: 37–38 runtime-selected suppressions vs a ratchet of 29 — C104's "zero silently skipped tests" clause |
| F5 | P2 | `streamlineos-backend/src/modules/hr/lifecycle/hr-dashboard-attendance.ts:94,108` | Blocking `check:unbounded-reads` RED: two unclassified unbounded reads |
| F6 | **P1** | `streamlineos-backend/src/scripts/check-evidence-seal.mjs:128` | A seal manifest using an unrecognised key shape reads as an empty seal, and the live path has no per-seal floor |
| F7 | P2 | `streamlineos-frontend/frontend/scripts/check-gate-wiring.mjs:104,110` | Two `NON_BLOCKING_BY_DESIGN` reasons are factually false at head, and nothing checks them |
| F8 | P2 | `streamlineos-backend/.github/workflows/ci.yml:14` (and 21 sibling `runs-on:` lines) | No Windows or macOS runner exists; C015's cross-OS claim is inspection-only |
| F9 | P2 | `streamlineos-backend/package.json` (no `gate-corpus` entry) | The anti-vacuity primitive's own 20-assertion self-test is wired into nothing |
| F10 | P2 | `streamlineos-frontend/frontend/scripts/` (no `gate-corpus.mjs`) | `reportCorpus` reaches 2 of 90 backend gates and 0 of 35 frontend gates |
| F11 | P2 | `streamlineos-backend/src/scripts/check-baseline-integrity.mjs` (gate) | Blocking gate RED: `check-envelope-consistency.mjs :: MAX_HOPS = 8` unregistered |
| F12 | P2 | `streamlineos-frontend/frontend/hooks/api/id-cursor-page-schema.ts` · `offset-page-schema.ts` | FE `check:dead-code` exit 1 — two unclassified exports |
| F13 | P2 | `streamlineos-frontend/contracts/openapi.json` | Vendored contract stale against the backend artifact; `check:contract-vendor` exit 1 |
| F14 | P2 | `streamlineos-backend/package.json` (`check:s05-artifact-contract`, `check:alert-system`, `check:body-binding`) | Three backend gates still have no self-test |

### F1 — knip is structurally unable to report dead code, in both repos — **P1**

**Unchanged since the prior audit.** Backend `knip.json:7-11` still lists `src/**/*.spec.ts`,
`src/**/*.e2e-spec.ts`, `src/test/**/*.ts`, `test/**/*.ts`, `evals/**/*.spec.ts` in `entry`;
`:16` still lists `src/**/*.ts` and `test/**/*.ts` in `project`; there is still no `"jest": false`.
Frontend `knip.json:13-15` is the same shape.

**Failure scenario:** a service, its module registration and its schema helper are kept alive
only by their own `.spec.ts`. Every one of them is reachable from a knip entry point, so knip
reports 0 unused files. Backend `check:dead-code` (blocking, `ci.yml:249-251`, no
`continue-on-error`) prints `rc=0, 0 unclassified` and CI is green. Root CLAUDE.md §10 makes knip
the required proof for any dead-code claim, so every "proven dead with knip" citation in this
release rests on that green.

**Not re-measured here:** the prior audit's 29-backend / 8-frontend numbers require a full knip
module-graph pass (4–8 GB), which I did not run under the shared-laptop budget. The **config** is
verified byte-identical to the defective shape, which is the load-bearing half. Corrected configs
and classified outputs remain at `reports/30-knip-reach/`.

**Fix:** land `backend-knip-corrected.json` / `frontend-knip-corrected.json` **together with**
the 29 + 8 classifications in one change — both switches are required (`jest: false` alone moves
the number from 0 to 0), and `*.test-double.ts`, `*.spec-fixtures.ts`, `*.fixture.ts`,
`*-fixtures.ts`, `**/testing/**` must stay excluded so the 7 test-only helpers are not
mistaken for dead code. Add `@nestjs/testing`, `supertest`, `ts-jest` to `ignoreDependencies`.

### F2 — `check:cache-key-shapes` is a library wired as a blocking gate — **P2**

`src/scripts/check-cache-key-shapes.mjs` (339 lines) has no `main()`, no direct-invocation guard,
no `process.exit`, no `console.*`. Its own header: *"Cache key SHAPE resolution **for
check-cache-invalidation.mjs**"*. Measured:

```
$ node src/scripts/check-cache-key-shapes.mjs   →  0 bytes of output, exit 0
$ pnpm check:cache-key-shapes  vs  pnpm check:cache-key-shapes:self-test
   both exit 0, output byte-identical (both empty)
```

`ci.yml:470-472` runs `pnpm check:cache-key-shapes:self-test && pnpm check:cache-key-shapes` as a
blocking step named "Cache key shapes".

**Failure scenario:** a reviewer sees a green blocking step named "Cache key shapes" and counts
it as coverage; `check-gate-wiring` counts it in "91 gates able to FAIL the job" when it is
incapable of failing for any reason short of a syntax error. It can never go red, at any commit,
for any cache-key defect.

**Why P2 and not P1:** the *rule* is genuinely enforced elsewhere. `check:cache-invalidation`
imports this module (`check-cache-invalidation.mjs:34`), runs green over 1,076 service files,
187 write sites and 475 invalidate sites, and has a real named-case self-test (verified
distinct from its gate run). Nothing is unguarded — two CI steps are decorative.

**Fix:** delete `check:cache-key-shapes` and `check:cache-key-shapes:self-test` from
`package.json:365-366` and remove the `ci.yml:470-472` step. Re-measure `check-gate-wiring`'s
`MIN_GATES` floor afterwards.

### F3 — `check:replay-ledger:self-test` is a second copy of the live gate — **P2**

`src/scripts/check-replay-ledger.mjs` is 57 lines and contains no `process.argv` reference;
`--self-test` is discarded. Measured with `COLD_DATABASE_URL` set, gate and "self-test" produce
the same live output and the same exit code.

`db-gates.yml:251-253` already carries the correct comment and deliberately invokes only
`pnpm check:replay-ledger` (`:255`), so no CI step is currently lying. The defect that remains is
(i) `package.json:372` still advertises a self-test that is not one, so the next author wiring
the house pattern `X:self-test && X` silently gets a fake bite-proof; and (ii) the gate has **no
known-bad fixture at all**, which C104 requires of every gate.

**Fix:** either delete `package.json:372`, or give the script a hermetic `--self-test` over a
fixture ledger — the classes to plant are: journal entry with no `__replay` row; `__replay` row
with no journal entry (orphan); duplicate tag; and a zero-entry journal (which must be
INCONCLUSIVE, exit 2, not a pass).

### F4 — `check:test-suppressions` is blocking and red: 37–38 vs a ratchet of 29 — **P1**

`ci.yml:610` runs it with no `continue-on-error`. Measured twice, minutes apart: 37 then 38
(other agents are landing spec files as I write). `CONDITIONAL_BASELINE = 29` at
`check-test-suppressions.mjs:100`, last re-registered 28 → 29 by `ecbf55c21`.

**Failure scenario:** every CI run on this branch fails the gates job at this step. More
importantly the number is the thing C104 legislates — 13 placeholder bodies, 6 quarantined
suites holding live assertions, and 37–38 suites that select themselves out at runtime. The
6 quarantined ones are all `describe.skip` in
`src/modules/ai/core/crm-copilot.service.phase2.spec.ts` (CRM, out of release scope, but they are
live assertions that do not run).

The growth is structural, not sloppy: this release added a wave of `.db.spec.ts` suites gated on
`ENABLED && DB_URL` precisely because a mocked spec cannot observe a plan-time Postgres error
(the lesson from `chat-send-idempotency.spec.ts`). Each honest new DB spec pushes the count up.

**Fix — two parts, in order.** (1) Re-register the ratchet at the head-measured value with the
per-site blockers named, as `ecbf55c21` did for one site — the debt is honest and each site is
prerequisite-gated. (2) Change the shape so honest DB-gating stops consuming the budget: count
`describeDb`-style aliases in a separate class with its own floor, since "a suite that runs when
a database is present" is a different animal from "a hand-written skip". Then drive the
6 quarantine and 13 placeholder sites to zero, which is what C104 actually asks for.

### F5 — blocking `check:unbounded-reads` red on two unclassified reads — **P2**

```
UNCLASSIFIED paths:
  [UNBOUNDED] /hr/lifecycle/hr-dashboard-attendance.ts
      :94   .select({ count: presentPersonDays })
      :108  .select({ count: presentPersonDays })
```

Corpus: 2,305 service files, 752 unbounded reads, 3 actionable, 22 offset sites, 0 unordered
paging. **Failure scenario:** `ci.yml:759` fails on every run until classified. Both sites look
like COUNT aggregates (bounded by construction), so the likely correct entry is FALSE-POSITIVE —
but that judgement belongs to the HR lane (ticket 07), not to the gates territory.
**Fix:** `pnpm check:unbounded-reads:emit-classification`, then hand-write the reason.

### F6 — an unrecognised seal shape reads as an empty seal — **P1**

`check-evidence-seal.mjs:128`:

```js
const hashes = manifest.hashes ?? manifest.files ?? {};
```

Two accepted key names, both object maps. The ticket-35 seal at
`architecture-refactor/final-refactor/evidence/42-production-ops/data-catalogue-c183/artifact-hashes.json`
uses a **third** shape — `"artifacts": [{ "file": …, "sha256": … }]` — so the parser falls
through to `{}`, `sealedCount` is 0, and every one of the five files in that directory is reported
as `UNSEALED … added to a sealed directory after the seal was written`.

That message is **false**: the files were there when the seal was written; the seal simply uses
a schema the gate cannot read. The printed remedy — *"Re-run the sealer only after establishing
why it changed"* — sends the owner to the wrong fix.

**The dangerous half.** The live path enforces `MIN_SEALS` (a floor on how many seal *files*
exist, `:263`) but **no floor on `sealedCount` for any individual seal**. `MIN_SEALED_FILES = 20`
is asserted only inside the self-test (`:235`), only when the workspace is available, and only in
aggregate — 68 sealed files from the other seals satisfy it whatever this one does.

**Failure scenario:** put a mis-shaped `artifact-hashes.json` in a directory that contains
nothing else — or list every sibling file under `"artifacts"` so the walker finds no extras — and
`problems === 0`, so the gate prints `OK  <seal> — 0/0 files match` and exits 0. An evidence
directory attesting to nothing reads as a verified seal, and the aggregate line
(`68/68 sealed files match`) hides it.

**Fix, three lines:** (i) normalise the `artifacts` array shape into the hash map; (ii) when a
manifest parses but yields no recognisable file list, report `BROKEN — the seal declares no
recognisable file list (keys: …)` rather than treating it as an empty seal; (iii) move a
per-seal `sealedCount > 0` floor into the **live** path, not just the self-test.

### F7 — two registered non-blocking exceptions state reasons that are false at head — **P2**

`frontend/scripts/check-gate-wiring.mjs:104` says `check:dead-code` is red for
`features/chat/chat-helpers.ts:resolveFileUrl`. Measured at head: `resolveFileUrl` is gone and the
gate is red for **two different exports** —`hooks/api/id-cursor-page-schema.ts:idCursorPageContract`
and `hooks/api/offset-page-schema.ts:offsetPageContract`.
`:110` says `check:route-bundle-budget` has **15** breaches; measured at head: **18**.

Nothing detects this. `falseReasons` (`:527-540`) inspects only `UNWIRED_BY_DESIGN`, and only
whether a `*.yml` named in the prose exists and mentions the gate.

**Failure scenario:** exactly the hazard this ticket already named for `check:type-assertions` —
"an exception that outlives its site is how the next reader inherits a licence nobody meant to
grant". The next reader deletes the entry because `resolveFileUrl` is gone, the gate becomes
blocking, and CI reds on two exports nobody has triaged.

**Fix:** restate both reasons at head-measured values, and extend `falseReasons` to
`NON_BLOCKING_BY_DESIGN` with the one check that is unambiguous — the gate named must still be
non-blocking **and** must still be exit-non-zero. `check-gate-wiring` already computes
`staleNonBlocking` for the first half; the second half needs the gate to be run, so the honest
form is a required `measuredAt` date field that goes stale after N days.

### F8 — no Windows or macOS runner exists — **P2**

22 `runs-on:` lines across the 8 workflow files; **all 22 are `ubuntu-latest`.** PRD-C015 requires
the harness to resolve roots "on Windows, macOS and Linux". macOS is genuinely covered by this
audit (123 self-tests and 46 gates executed on darwin 25.6.0). Windows is covered by argument
only: Node instead of bash, `node:path` segment arguments, `run-gate.mjs` not depending on `$?`,
and no `shell:`-sensitive constructs in any gate `run:` block — all of which I verified and none
of which is execution.

**Failure scenario:** a `join()` that assumes `/`, a glob that assumes case-sensitivity, or a
`readdirSync` ordering assumption ships and is discovered by the first contributor on Windows,
not by CI.

**Fix:** one `harness-portability` job with
`strategy.matrix.os: [ubuntu-latest, windows-latest, macos-latest]` running the hermetic subset —
`check:gate-wiring:self-test`, `run-gate` over a fixture, `check:file-sizes`, `check:kebab-case`,
`check:migration-discipline`. That is a few minutes of runner time and converts an argument into
evidence.

### F9 — the anti-vacuity primitive's self-test is wired into nothing — **P2**

`src/scripts/gate-corpus.mjs` has 20 assertions and passes. `grep gate-corpus package.json` → no
match. `grep -r gate-corpus .github/workflows/` → no match.

**Failure scenario:** someone "simplifies" `reportCorpus`'s vacuity branch (`:77-84`) — say,
returns instead of `process.exit(2)` when the corpus is empty. `check:openapi-coverage` and
`check:envelope-consistency` immediately go back to printing a clean line over a corpus they
never read, and nothing anywhere goes red. This is the same shape as the false-100% defect the
primitive was written to prevent.

**Fix:** add `"check:gate-corpus:self-test": "node src/scripts/gate-corpus.mjs --self-test"` and
wire it as a blocking step. It runs in under a second.

### F10 — `reportCorpus` reaches 2.2% of one repo and 0% of the other — **P2**

Measured by import-and-call, not by regex over prose:

```
backend: check-openapi-coverage.mjs, check-envelope-consistency.mjs   → 2 of 90 core gates
frontend: gate-corpus.mjs does not exist                              → 0 of 35
```

The prior audit deliberately declined to ship a heuristic rule here and said so; that judgement
was right. But the non-heuristic version it named — *require gates to import and call
`reportCorpus`* — is exactly the measurement above, and it is 2.2%/0%.

**Failure scenario:** the nine recorded instances of "a gate's reported denominator is its own
filtered subset" are all still possible in the 88 backend and 35 frontend gates that do not
declare their reach. Two examples visible in this very audit: `check:module-lifecycle` proves
11 of 944 tables and prints `RESULT: ALL GATES PASSED`; `check:tenant-relationships` prints
`OK — zero actionable` when 214 of 214 candidate FKs were excluded by scope.

**Fix:** copy `gate-corpus.mjs` into `frontend/scripts/`, then adopt per module lane rather than
by unilateral ledger. Start with the gates whose scope carve-outs are largest —
`check:module-lifecycle`, `check:tenant-relationships`, `check:multipart-contracts`,
`check:public-object-urls`, `check:retention-coverage`, `check:idempotent-commands`.

### F11 — `check:baseline-integrity` blocking and red — **P2**

```
Gate scripts 90 · constants 131 · json ratchets 12 in 10 files · registered 142
  ratchet 33 · floor 107 · pinned 2 · unregistered 1 · stale 0
  check-envelope-consistency.mjs :: MAX_HOPS = 8   (unregistered)
```

Introduced by the uncommitted 960-line envelope rewrite. The mechanism working as designed on
another lane's in-flight work. **Fix:** the envelope-repair wave registers `MAX_HOPS` in
`baselines/ratchets.json` with a direction and an owner in the same commit that lands the
rewrite. Note this is the trap the prior audit flagged as worth a line in the gate-authoring
notes; it has now caught a second author.

### F12 — FE `check:dead-code` red on two unclassified exports — **P2**

`hooks/api/id-cursor-page-schema.ts:idCursorPageContract` and
`hooks/api/offset-page-schema.ts:offsetPageContract` — new since the prior audit, from the paging
work of tickets 18/19. The ratchet itself is clean (`baseline files=0 exports=0, current
files=0 exports=0`), so nothing was baselined away. **Fix:** a WIRE or KEEP entry in
`EXPORT_VERDICTS` from the paging lane.

### F13 — vendored contract stale — **P2**

`check:contract-vendor` exit 1: frontend hash `9cba20e2…` vs backend `f3f2e42a…`. Backend
`openapi.json` is dirty (mtime 21:47). Newly blocking since this ticket removed the flag — which
is the fix working. **Owner: ticket 04.** Re-vendor once controller edits settle; re-vendoring
mid-wave only re-stales it.

### F14 — three backend gates still have no self-test — **P2**

`check:s05-artifact-contract`, `check:alert-system`, `check:body-binding`. (`check:cycles` is
`madge`, accepted; FE `check:cycles` and `check:properties` likewise.) Unchanged from the prior
audit. `check:s05-artifact-contract` is measured exit 0 at head in the two-repo layout.

---

## 5. What head already gets right

- **The gate that guards the gates is real and bites.** I reproduced four independent mutations from a clean fixture; every one produced the correct named verdict, and the control was green both before and after. 28 self-test assertions in each repo.
- **`run-gate.mjs` is a better contract than advertised.** It refuses to run without `--prerequisite`, so no operator can tolerate an INCONCLUSIVE without naming what was missing. Exit 1 stops the chain; exit 2 warns and continues; every other code propagates.
- **123 of 123 self-tests execute, and 121 pass** — 87/89 backend (1 fixture-config failure, 1 prerequisite-gated) and 34/34 frontend. Of 90 backend core gates, 86 carry a self-test; of 35 frontend gates, 33 do.
- **The database half of C064 is now genuinely closed.** Two independently produced bootstraps agree on 30,901 object definitions with zero divergence. That is a stronger statement than "catalog parity passed".
- **The tenant boundary is real, not declared.** 825 of 825 tenant-columned tables have RLS; 900 of 900 RLS tables have exactly one policy; zero have none. As `streamline_app` the boundary fails *closed* at plan time (42501) rather than leaking, and an explicit cross-tenant predicate is clamped to a false one-time filter.
- **The honesty conventions are holding.** `check:openapi-coverage` prints `NOT A PASS FOR THIS RULE — 0.69% of the response contract is declared`; `check:n1-growing-loops` prints `this is a ratchet to drive to zero, not a clean repository`; `check:test-suppressions` refuses to absorb its growth; `check:authz-deny` prints `this gate is static … it does not run it`. Those sentences are why this audit could find the remaining gaps at all.
- **`check:migration-discipline` and `check:replay-ledger` both caught live drift during this session** — 1054 landed mid-audit and the replay gate went from CLEAN to HAS ISSUES within the hour, naming the exact tag.
- Zero `continue-on-error` on any of the four gates that are red at head (`test-suppressions`, `unbounded-reads`, `evidence-seal`, `baseline-integrity`) — every one of them will fail CI, which is the arrangement this ticket built.

---

## 6. Blocked on infrastructure / NOT MEASURED

| Item | Blocker | What would settle it |
|---|---|---|
| knip's 29 backend / 8 frontend numbers | A full module-graph pass wants 4–8 GB; 26 agents share 24 GB | `pnpm exec knip --config <corrected> --no-progress` in a quiet window, both repos |
| Query plans at realistic tenant size | Both provided databases hold 3 orgs, 3 users, 0 `hr_people` rows | Local seeded Postgres + `jest-e2e-seeded.json --testPathPattern=route-budget-http\|route-db-call-budget` with `SEED_ORG_ID` / `SEED_MINORITY_ORG_ID` |
| Windows execution of the harness | No `windows-latest` runner in either repo, no Windows machine here | A `harness-portability` matrix job (see F8) |
| Route-budget HTTP capture (BE) | Five `CI_PERF_SEED_*` repository secrets do not exist | Provision them, then delete `ci.yml:1114` and `:1135` |
| `check:alert-ack` | Needs a real `ALERT_WEBHOOK_URL` and a nonce a human types back | Correctly registered `UNWIRED_BY_DESIGN`; no CI job can fabricate it |
| CI behaviour end-to-end | No workflow run was triggered; exit codes are local | Push the branch and read the run |
| Catalog parity at journal 678 | Both databases stop at 677; `1054_chat_presence_membership_unique_total.sql` is untracked at head | Re-bootstrap both after 1054 is committed, then re-run §3.4 |
| Committed-head state of `check:envelope-consistency` and `check:baseline-integrity` | Both verdicts depend on a 960-line uncommitted rewrite | Re-measure after the envelope-repair wave commits |

**Scope notes.** `check:tenant-relationships` is green with an *actionable corpus of zero*: all
214 remaining single-column tenant FKs sit in CRM (79) or Inventory (134) plus one registered
platform-global pair. That is a legitimate pass — the in-scope surface is fully converted to
composite `(org_id, id)` keys — but the gate proves nothing about the 213 out-of-scope ones, and
this report does not count them against the release. Likewise the 6 quarantined suites in F4 and
the single Web Vitals CLS violation are CRM.

---

## 7. Honest gaps in this audit

- Every exit code above was executed and read on this machine. Nothing is claimed as passing that I did not run; NOT MEASURED is written where I did not.
- All mutations were performed on copies under `…/scratchpad/{gwfix,gwfe,rg}`. **Nothing in either working tree was modified**, including during the four workflow mutations.
- Both repositories were dirty and moving throughout: the backend journal grew from 677 to 678 mid-audit, and `check:test-suppressions` reported 37 then 38 within minutes. Where a number moved, both readings are recorded.
- Two gate verdicts (`check:envelope-consistency` green, `check:baseline-integrity` red) are measurements of **uncommitted** code and are labelled as such.
- I did not re-derive the central `check:*` sweep quoted in the brief; I re-ran the 46 gates relevant to this ticket and found four red that the sweep did not list, three of which regressed after it.
