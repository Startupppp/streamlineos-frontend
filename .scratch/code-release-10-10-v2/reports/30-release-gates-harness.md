# 30 — Release gates and portable verification harness

**Status:** PRD-C011 / C015 / C104 closed. PRD-C064 PARTIAL — the database-dependent half could
not run (a bootstrap owned by another agent was mid-replay throughout).

**Measured:** 2026-09-03, 16:17–16:48 IST, on a two-repository local layout. Other agents were committing throughout; see "Closing state" for the final re-run.

| Repo | SHA at start | SHA at end (other agents committing concurrently) |
|---|---|---|
| backend `streamlineos-backend` | `c66bcfb9b3338a5a958d14c09f9e155b36bd4b6e` | `591cf663944498b1de8dc1f08a969ce5319630d1` |
| frontend `streamlineos-frontend` | `61c3510aafe66d0dcb32dc6c01b045e3fa22ed55` | `372cbc10c8f6b938c0eacb153d5d1be24d61b9fd` |

Branch `release/code-10-10-v2` in both. Nothing was committed by this ticket; the orchestrator commits.

---

## THE HEADLINE: 15 gates could not fail CI, and the gate that guards the gates could not see it

`check-gate-wiring` — the gate whose entire job is "a gate that cannot run is indistinguishable
from a gate that passes" — answered exactly one question: *is this gate NAMED by a `run:` step of
a reachable job?* It never asked whether that step could **fail**.

A step carrying `continue-on-error: true` runs, prints, and then reports success whatever it
found. The job goes green and the red is a grey annotation nobody reads. At head, **18 gate steps
across the two repositories carried that flag**, and the `check:*` gates among them numbered
**15** — 8 frontend, 7 backend — every one of which `check-gate-wiring` was certifying as
correctly wired.

The sharpest form of it: **six of those gates exit `2` (INCONCLUSIVE — a named prerequisite is
absent) and `1` (a real defect) and `continue-on-error` swallowed both identically.** Measured
directly, with the sibling root overridden to a nonexistent directory:

```
check:permission-keys          exit 2  INCONCLUSIVE — the frontend PermissionKey union comparison could not run
check:navigation-permissions   exit 2  INCONCLUSIVE — every navigation permission ...
check:s05-artifact-contract    exit 2  INCONCLUSIVE — the approval/evidence template could not be located
check:relation-keys            exit 2  INCONCLUSIVE — the frontend corpus, and with it BOTH rules
check:evidence-seal            exit 2  INCONCLUSIVE — no seal was verified
check:file-sizes (backend)     exit 2  INCONCLUSIVE — the §7 exception registry could not be located
```

So a backend-only permission key — one that can never be gated in the UI — could be merged past a
green job, and nobody could have told from the job status whether the gate had found nothing or
had never looked.

**Fixed three ways:**

1. `check-gate-wiring` now fails on a gate whose every invocation is non-blocking, at **step
   level or job level**, and reports it as `CANNOT FAIL`. Registered exceptions go in a new
   `NON_BLOCKING_BY_DESIGN` map with the same discipline as `UNWIRED_BY_DESIGN`: a measured
   reason and a named owner. Stale entries (a gate that has become blocking) are reported too.
2. `run-gate.mjs`, new in both repos, restores the bite without losing the tolerance: exit 2
   becomes a visible `::warning title=INCONCLUSIVE` annotation and a passing step; **every other
   non-zero code fails the job.** It is Node, not a bash `set +e` snippet, because PRD-C015
   requires the harness to run on Windows and `$?` misreports under PowerShell.
3. Twelve of the eighteen flags are gone. Six remain, each with a named owner and a measured
   reason, and three of those are registered in `NON_BLOCKING_BY_DESIGN` so the gate fails if the
   exception outlives the failure.

Bite-proved in a `mkdtemp` fixture tree (never in the shared working tree), control first:

| Fixture | Result |
|---|---|
| unmutated copy | exit 0, "35 gates, 32 able to FAIL the job" |
| add `continue-on-error: true` to one blocking step | exit 1, `CANNOT FAIL: check:gated-reads` |
| add `continue-on-error: true` to the **job** | exit 1, 32 gates reported `CANNOT FAIL` |
| `continue-on-error: ${{ github.event_name == 'push' }}` | exit 1 — an expression is answered conservatively |
| explicit `continue-on-error: false` | **not** flagged — no false positive |
| plant a stale `NON_BLOCKING_BY_DESIGN` entry | exit 1, `STALE NON-BLOCKING EXCEPTION` |

---

## THE SECOND HEADLINE: `knip` is structurally unable to report dead code, in BOTH repos

Raised by the coordinator from another agent's accounting audit and **reproduced here from
scratch**. It is worse than reported, in three ways: the mechanism needs two switches, not one;
it applies to the frontend as well as the backend; and the blocking gate on top of it is green.

Root CLAUDE.md §10 makes knip the **required** proof for any dead-code claim ("Dead-code claims
are proven by a module-graph tool, not grep"). Every such citation in this release rests on a
tool configured not to find the thing.

### The mechanism

`backend/knip.json` lists every spec file in `entry`:

```
"entry": [ "src/main.ts", ..., "src/**/*.spec.ts", "src/**/*.e2e-spec.ts",
           "src/test/**/*.ts", "test/**/*.ts", "evals/**/*.spec.ts" ]
```

…and leaves knip's **jest plugin** enabled, which adds the same globs again. A spec is therefore
an entry point, so everything a spec imports is reachable. In a repository where nearly every
service has a spec, **production code kept alive only by its own test can never be reported.**

`frontend/knip.json` has the identical defect: `**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}` and
`**/__tests__/**` are all in `entry`.

### Measured — and `jest: false` alone is NOT the fix

Each row executed and read, backend, through the release mutex:

| Config | Unused files |
|---|---|
| **as committed** | **0** |
| `"jest": false` only | **0** |
| spec globs out of `entry` only (jest plugin left on) | **0** |
| spec globs out of `entry` + `project`, jest plugin left on | **1** |
| **spec globs out of `entry`/`project` AND `"jest": false`** | **36** |
| …the same, with test-only helpers classified out by naming convention | **29** |

**Both switches are required.** Either one alone leaves the number at 0–1, because whichever
source of spec-entries survives restores full reachability. The coordinator's report named
`"jest": false`; on its own it moves nothing here.

Frontend, same treatment: **2 → 8**.

### Bite-proof

Not taken on report. Built as a minimal fixture (`mkdtemp`, torn down), four files:
`main.ts` → `live.ts`; `dead.ts` referenced by nothing; `only-tested.ts` imported **only** by
`only-tested.spec.ts`.

| Config shape | Reports |
|---|---|
| **A** — specs as entry (what is committed) | `dead.ts` only |
| **E** — production entries only | `dead.ts` **and** `only-tested.ts` |

That isolates it exactly. The committed config is not *totally* blind — it still catches a file
nothing at all references. What it structurally cannot catch is the common case: **production
code that only its own test keeps alive.**

### Stacked "cannot fail" — which of the 18 flagged steps are in this position

| Layer | Gate | Status |
|---|---|---|
| input blind | `knip` config, both repos | can't see 29 (BE) / 8 (FE) files |
| + `continue-on-error` | BE "Dead-code report" (raw knip) | one of the 18; kept flagged |
| + `continue-on-error` | FE `check:dead-code` | one of the 18; kept flagged, registered `NON_BLOCKING_BY_DESIGN` |
| **blocking, and GREEN** | **BE `check:dead-code`** | **the dangerous one** |

The last row is the finding that matters most. Backend `check:dead-code` is **blocking**, has no
`continue-on-error`, and reports `rc=0, 36 findings, 0 unclassified` — a green tick over a corpus
its input cannot see. A blocking green is cited as evidence in a way an allow-failure red never is.

### What was done, and deliberately not done

**Nothing was deleted. All 36 files are classified, none removed.** The documented trap held:
`db/schema/hrms-phase1-sql-managed.ts` is kept as an `entry` in the corrected config exactly as in
the committed one, so **none of its 11 spec-guarded files appear** in any number above — verified
by grep against the output.

Of the raw 36, **7 are test-only helpers** and are classified out by naming convention rather
than deleted (`in-memory-redis.test-double.ts`, `common/testing/repo-paths.ts`,
`fake-provider-adapter.ts`, `directory.service.spec-fixtures.ts`,
`telephony-call-log.spec-fixtures.ts`, `web-form-fixtures.ts`, `whatsapp-webhook.fixture.ts`).
That is the naive-flip hazard the coordinator flagged, and it is why the corrected `project`
excludes `*.test-double.ts`, `*.spec-fixtures.ts`, `*.fixture.ts`, `*-fixtures.ts`, `**/testing/**`.

**The config was NOT landed.** Correcting it takes a BLOCKING gate from green to 29 unclassified
dead files spread across roughly ten module lanes. The reach fix and the classification are one
atomic change and the classification is not this ticket's to make; landing the reach fix alone
would either red the pipeline for every other agent or invite someone to raise a baseline to
absorb it, which PRD-C104 forbids outright.

Instead: both workflow steps are annotated so the green cannot be cited as evidence, and the
corrected configs plus full outputs are handed over at
`.scratch/code-release-10-10-v2/reports/30-knip-reach/`:

```
backend-knip-corrected.json     frontend-knip-corrected.json
backend-corrected-output.txt    frontend-corrected-output.txt
```

### The 29 backend candidates, for routing

| Owner area | Files |
|---|---|
| cache invalidation | `cache-invalidation-{crm,finance,inventory,matrix,rbac-auth,types}.ts` (6) |
| SLO | `slo/{index,slo-modules,slo-queues,slo-types}.ts` (4) |
| ingress adapters | `attachment-store.ts`, `web-form-submission.ts`, `web-form-to-inbound-event.ts` (3) |
| payroll | `payroll-defaults.ts`, `payroll-subject-filter.ts`, `hra-tds.ts` (3) |
| CRM | `lead-triggers.ts`, `quote-document.ts` (2) |
| common/platform | `command-fence-store-memory.ts`, `legacy-actor-telemetry.ts`, `noisy-neighbour.ts`, `relocation-offsets.ts` (4) |
| other | `fault-server.ts`, `object-access.ts`, `ai-stream-budgets.ts`, `automation-trigger-modules.ts`, `finance-reports-csv.util.ts`, `notification-caller-inventory.ts`, `party-seam.ts` (7) |

**Frontend 8:** `meeting-stream-test-harness.ts`, `notifications-inbox-test-fixtures.ts` (both
test-only), `backend-token-contract.ts`, `command-catalog.ts`, `optimistic-cache.ts`,
`rbac/owner-only-operations.ts`, `rbac/route-access/app-routes.ts`, `scripts/run-gate.mjs` (a CI
CLI entry point added by this ticket — the frontend `knip.json` lacks the `scripts/**/*.mjs` entry
the backend config has; it is excluded from `check:dead-code` by `SCRIPTS_RE` and moves no gate).

Note `@nestjs/testing` / `supertest` / `ts-jest` appear as unused devDependencies under the
corrected config. That is an artifact of `jest: false`, not a finding, and belongs in
`ignoreDependencies` when the config lands.

---

## THE FOURTH: `check:openapi-coverage` reported 100% for a property 1 operation in 3,642 had

The most consequential instance, and the reason the entire response half of the API contract went
unnoticed.

`findMissingResponseSchemas` counted an operation as covered **for having a 2xx KEY**. NestJS
Swagger auto-generates `"200": { description: "" }` — no `content`, no schema — for every single
handler, so the predicate was true for every operation the moment the document was generated.

```
BEFORE:  response-schemas: 3642/3642 ops have a declared response body (100%)
AFTER:   response-schemas: 25/3642 ops declare a response body SCHEMA (0.69%)
                           3617 uncovered [ceiling 3617, ratchet — may only go down]
```

The gate **demanded 100% and got it**, which is why nobody looked. Real coverage when the defect
was introduced: **1 of 3,642 — 0.027%.**

### The rule now

Covered requires `content` → a media type → a `schema` that **resolves** (inline, or a `$ref`
whose target exists). A dangling `$ref` is a broken contract, not a covered one. The 405 carve-out
survives but is narrowed: a non-2xx schema covers an operation only when it has **no 2xx key at
all** — "my 400 has a schema" says nothing about the success body. Each violation carries a
distinct `issue` so the output says *which* failure occurred.

### Bite-proof

The old self-test **enshrined the defect** — it asserted that `{ "201": { description: "Created" } }`
counted as covered. Replaced with seven cases, all passing:

| Case | Verdict |
|---|---|
| 2xx with a real content schema | passes |
| **bare auto-generated 2xx key** | **flagged, and names the bare key as the reason** |
| `content: {}` | flagged |
| media type with no `schema` | flagged |
| `$ref` with no target | flagged |
| `$ref` whose target exists | passes |
| schema on the 400, bare 200 | flagged — the 4xx does not excuse the success body |

Against the **real document** in an isolated tree, control first:

| | Result |
|---|---|
| control (ceiling 3617) | exit 0, `25/3642 (0.69%)` |
| ceiling lowered by one | **exit 1** — "3617 … above the ceiling of 3616" |
| **old rule restored** | exit 0, **`3642/3642 (100%)`** — reproduces the false reading exactly |

### Not ratcheted to green

Per instruction, the honest figure is recorded as a **ratchet**,
`RESPONSE_SCHEMA_UNCOVERED_CEILING = 3617`, registered in `baselines/ratchets.json` with owner and
reason. The 100% requirement was **not** restored — demanding it would red the pipeline on ~3,617
handlers across every module lane, and a gate wired to always fail gets muted within a week. The
gate is green at the ceiling but **cannot be misread**, because it now prints:

```
NOT A PASS FOR THIS RULE — 0.69% of the response contract is declared.
This gate is green because the debt did not GROW, not because the contract is covered.
```

`check:baseline-integrity` stays green (0 unregistered, 0 stale) and will report any improvement
as bankable.

---

## THE FIFTH: `check:envelope-consistency` — one blind spot fixed, one real finding left standing

Green for its whole life because **336 paginated GETs existed and none carried a 2xx schema it
could read** — the same root cause as above. When the ticket-04 agent made real schemas appear,
the first thing the gate did was misread them.

**Fixed (the one-line unwrap):** every handler answers inside a `{ success, data }` envelope, so
the pagination signal lives on `data`, never at the top level — where the only properties are
`success` and `data`, neither of which is a signal. `unwrapSuccessEnvelope` now unwraps before the
check. `GET /storage/quarantine` carries a perfectly good `{ data, pagination }` one level in and
was being reported as a violation; it now passes. **2 → 1.**

Three self-test cases added: the signal is found inside the envelope; a **bare array inside** the
envelope is still flagged (unwrapping must not hide the real finding); and a payload without
`success` is not unwrapped.

**Left standing, deliberately:** `GET /public/kb/{slug}/attachments` takes `page`/`limit` and
returns a bare array inside the envelope. Now reported with the sharper message ("returns a bare
array" rather than "no recognizable pagination signal"). It is **published with external
consumers**, so changing the response shape is a breaking change. **This needs a product decision,
not a code fix** — whether to version the endpoint, add a paginated sibling, or accept the array.
Not this ticket's call. `check:envelope-consistency` is therefore **exit 1 at close**, correctly.

---

## The pattern, stated as its own finding: nine instances of one defect

Every one passed. None was looking. The common shape: **a gate's reported denominator is its own
filtered subset, not the corpus.**

| Gate | Reported | Actually |
|---|---|---|
| `check:openapi-coverage` | 3642/3642 (100%) | 1/3642 (0.027%) |
| `check:envelope-consistency` | green | 336 paginated GETs, 0 readable |
| `knip` (both repos) | 0 unused files | 29 backend / 8 frontend |
| `check:db-generate-guard` | green | read no files at all |
| `check-contract-vendor` | exit 0 under a wrong override | resolved a path the operator overrode away from |
| `check-gate-wiring` itself | "all wired" | 15 of them could not fail |
| `chat-send-idempotency.spec.ts` | 5/5 pass | 100% of chat sends 500ing |
| `check:multipart-contracts` | green | 9/3,644 handlers (0.25%), zero of the real upload path |
| `check:public-object-urls` | green | 0 enforceable sites after its allowlist |
| `check:retention-coverage` | green | 14 of 944 tables |
| `check:outbox-consumers` | green | blind to `eventType` as a variable — the exact regression it exists to catch was simulated and **still passed** |
| `check:idempotent-commands` | green | prints its residual as its scope: 129 of 2,030 (6.4%) |

**`0 violations` and `nothing to check` print identically unless the gate says how much it read.**

### What landed for it

`src/scripts/gate-corpus.mjs` — the shared way to say it, with a **20-assertion self-test**. Adopting
it buys an anti-vacuity floor for free: `reportCorpus` **refuses** a report whose corpus is empty or
entirely filtered out, exiting **2** (INCONCLUSIVE — the rule could not be checked) rather than 1,
which is the distinction `run-gate.mjs` relies on. `coveragePct` will not round 99.996% up to a
false "100%", nor a real 1-in-a-million down to "0.00%".

Adopted in the two gates fixed above, on their real corpora:

```
check-openapi-coverage[response-schemas]: scanned 25 of 3642 operations (0.69%) — 3617 NOT scanned
check-envelope-consistency[pagination]:   scanned 2 of 336 paginated GETs (0.60%) — 334 NOT scanned
```

The second line is the finding the coordinator predicted, now permanent: the envelope gate can
still only read **2 of 336** paginated endpoints, and it says so instead of printing a clean result.

### The structural rule in `check-gate-wiring` — deliberately NOT shipped, with the measurement

I measured it: of 88 backend gates resolving to a script, **55 emit something denominator-ish and
33 emit nothing**. But that number comes from a **regex over source text** — "the evidence was text
near the thing", the precise antipattern `check-gate-wiring`'s own header spends forty lines
warning about. A gate could satisfy it with the word "scanned" in a comment. **I will not ship a
heuristic as a gate**, least of all in the file that exists to stop exactly that.

The non-vacuous version is verifiable: require gates to **import and call `reportCorpus`**, which is
an unambiguous fact rather than a text match, and ratchet the exemption list down. I did not ship it
because seeding that ledger with ~86 entries would create a rule that cannot bite for 86 of 88 of
its corpus — a "gate that cannot fail" introduced by the ticket whose subject is gates that cannot
fail. The primitive is in place and adoption is one import; **the rollout is a decision for you**,
and it wants an owner per module lane rather than a unilateral ledger from me.

---

## THE THIRD SHAPE: a check that cannot observe the thing it claims to cover

Raised by the coordinator alongside the knip finding. It is the same defect wearing different
clothes, and naming the *class* matters more than either instance.

`src/modules/chat/__tests__/chat-send-idempotency.spec.ts` **passed all 5 of its tests** against a
broken `ON CONFLICT` clause that returned **500 on 100% of chat message sends at journal head** —
including sends carrying no client key, because the clause is emitted unconditionally.

It could not have done otherwise. The failure is a Postgres **42P10** raised at *plan time*, when
the planner cannot infer an arbiter index from the conflict target. A mocked spec never reaches a
planner. The spec was not weak, not vacuous, and not badly written: it was structurally incapable
of observing the class of defect it appeared to cover. It was found by accident, by an agent
unblocking an unrelated verification script.

Put beside the other two findings, the pattern is one thing:

| Instance | What it claims | Why it structurally cannot see it |
|---|---|---|
| `knip` config | "no dead code" | specs are entry points, so test-only reachability reads as live |
| `check:db-generate-guard` | "the snapshot is not stale" | it never opened `migrations/meta` |
| `chat-send-idempotency.spec.ts` | "conflict handling is correct" | the error is raised by the planner, and a mock has none |
| `continue-on-error` gates | "the rule holds" | the step reports success whatever it found |

Each passed. None was looking. **A green is only worth the reach of the thing that produced it**,
and none of these four declared its reach — which is why `check-gate-wiring`'s success line now
reports how many gates can *fail*, not how many are wired.

**The remedy that landed** is the chat agent's `check:conflict-targets`, which resolves conflict
targets statically against declared unique indexes instead of trusting a spec to exercise them. It
found **three further genuine 42P10 sites** the moment it ran: billing `versioned-catalog`, hr
`rosters`, payroll `run-result-persister`. Roughly 180 existing gates had missed all four.

It landed in `package.json` unwired, and `check:gate-wiring` caught it the same hour — the rule
this ticket added, working on a gate it was not written for. **Now wired**, in the backend `gates`
job, both halves, `if: ${{ !cancelled() }}`, and deliberately **no `continue-on-error`** because it
is green:

```yaml
- name: ON CONFLICT targets are inferable
  if: ${{ !cancelled() }}
  run: pnpm check:conflict-targets:self-test && pnpm check:conflict-targets
```

MEASURED at head: self-test exit 0 ("the known-bad fixture is flagged and the correct forms are
not"), gate exit 0 ("no new uninferable ON CONFLICT target, 3 ratcheted, shrink-only"). Its three
`MIN_*` anti-vacuity floors were unregistered against the blocking `check:baseline-integrity`;
they are now registered as floors, attributed to that gate's owner.

**Generalisation worth acting on:** a mocked spec cannot cover anything the database decides —
index inference, constraint violation, RLS predicate, plan-time type resolution. Those need a
seeded run or a static gate. This is the same trap the root brief already records for
`db.transaction` mocks that never invoke their callback, one level deeper.

---

## A second gate that could not fail: `check:db-generate-guard`

`package.json` defined it as, literally:

```
"check:db-generate-guard": "node scripts/guard-db-generate.mjs --self-test"
```

The gate **was** its self-test. That self-test asserts `decide()` against four hard-coded literal
argument pairs (`entries: 634, snapshot: 464`) and never opens `migrations/meta` at all. Its own
assertion key is named `reports_the_real_drift`; the number it checks is **169**, while the real
drift in this repository today is **207** (672 journal entries, latest snapshot `0464`). It was
wired into `ci.yml` under the step name *"db:generate cannot be run against a stale snapshot"* — a
claim about this repository that the command could not evaluate. Delete every migration in the
repo and it still exits 0.

It could not simply be run without the flag either: the script's default path spawns
`drizzle-kit generate`, which the root brief records as unusable here. So there was no gate mode
to run. One was added (`--check`), and the two halves are now separate CI steps.

```
check:db-generate-guard: 672 journal entries, latest snapshot 0464, real drift 207
  — db:generate is BLOCKED without ALLOW_DB_GENERATE=1.    exit 0
```

Bite-proved in a temp fixture, control first (control exit 0):

| Mutation | Result |
|---|---|
| journal with zero entries | exit 1 — "declares 0 entries — the read is broken, not the repo" |
| no `NNNN_snapshot.json` at all | exit 1 — "contains no NNNN_snapshot.json" |
| neuter `decide()` so it never blocks | exit 1 — "drift is 207 but the guard would NOT block — db:generate is unguarded" |

The misleading assertion key was renamed `reports_fixture_drift_arithmetic`, and a
`reads_the_real_chain` assertion was added beside it.

---

## The 18 `continue-on-error` steps: measured exit codes and verdicts

Every exit code below was executed and read on 2026-09-03 between 16:17 and 16:40 IST, on a
two-repository layout. "no sibling" is the single-repository checkout CI actually performs,
simulated by pointing the documented root override at a nonexistent directory.

### Frontend — `.github/workflows/frontend.yml` (8)

| # | Step | self-test | gate | no sibling | Flag | What it became |
|---|---|---|---|---|---|---|
| 1 | Module manifest agrees with the sidebar and vocabulary | 0 | **0** | 2 | **REMOVED** | via `run-gate`; exit 1 (real disagreement) now blocks |
| 2 | Home manifest agrees with the dashboard controller | 0 | **0** | 2 | **REMOVED** | via `run-gate` |
| 3 | Files over 500 lines (`check:file-sizes`) | 0 | **0** | hermetic | **REMOVED** | outright — 5,342 files, all within 500, 0 exceptions |
| 4 | Every export is classified (`check:dead-code`) | 0 | **1** | hermetic | **KEPT** | knowingly red — see below |
| 5 | Route bundle bytes within ceiling | 0 | **1** | hermetic | **KEPT** | knowingly red — see below |
| 6 | The only `route.ts` is NextAuth (`check:routes`) | 0 | **0** | hermetic | **REMOVED** | outright — 655 route dirs walked, 2 allowlisted re-checked |
| 7 | Web Vitals budgets (measured) | 0 | **1** | hermetic | **KEPT** | knowingly red — see below |
| 8 | Vendored contract byte-identical | 0 | 0 → **1** | 1 → **2** | **REMOVED** | see "caught live" below |

### Backend — `.github/workflows/ci.yml` (10)

| # | Step | self-test | gate | no sibling | Flag | What it became |
|---|---|---|---|---|---|---|
| 9 | Dead-code report (`knip`) | — | **1** | hermetic | **KEPT** | knowingly red — see below |
| 10 | Permission key catalog check | — | **0** | 2 | **REMOVED** | via `run-gate` |
| 11 | Navigation gates name the route's permission | — | **0** | 2 | **REMOVED** | via `run-gate` |
| 12 | Evidence seals hold | 0 | **0** | 2 | **REMOVED** | via `run-gate`; a broken seal is exit 1 and now blocks |
| 13 | S05 approval and evidence artifact contract | — | **0** | 2 | **REMOVED** | via `run-gate` |
| 14 | Relation keys reach the frontend | — | **0** | 2 | **REMOVED** | via `run-gate` |
| 15 | Files over 500 lines (`check:file-sizes`) | 0 | **0** → **1** | 2 / 2 | **REMOVED** | via `run-gate`; the note's stated reason (self-test exits 1 with no sibling) was stale — both halves exit 2. **Went red at 16:48 from other lanes' in-flight work — see closing state** |
| 16 | Files over 300 lines do not increase | 0 | **0** | 0 (hermetic) | **REMOVED** | outright — 388 of 3,646 vs baseline 392 |
| 17 | Route-budget HTTP capture (perf) | — | **NOT RUN** | — | **KEPT** | needs five `CI_PERF_SEED_*` secrets that do not exist |
| 18 | Upload the perf capture | — | depends on 17 | — | **KEPT** | artifact upload for a step that is itself allow-failure |

**12 removed, 6 kept.** Every kept flag now carries a named owner and a measured reason in its
step comment. The three frontend ones are additionally registered in `NON_BLOCKING_BY_DESIGN`,
so `check:gate-wiring` fails if the exception outlives the failure it excuses.

### The six that stay flagged, and why

| Gate | Measured | Owner |
|---|---|---|
| `check:dead-code` (FE) | rc=1, **one** unclassified export: `features/chat/chat-helpers.ts:resolveFileUrl`. Ratchet itself clean (baseline files=0 exports=0, current files=0 exports=0) — **not** raised to absorb it. The note previously named three exports; two are gone. | chat feature lane (`features/**` is outside this territory) |
| `check:route-bundle-budget` (FE) | rc=1, **15** breaches (was 17), e.g. `/crm/leads` measuredScriptBytes 773,117 over 524,288; `/parties` 618,550 over 524,288 | tickets 22/26 |
| `check:web-vitals-budget` (FE, measured half) | rc=1, **one** violation now, not two: mobile `/crm/inbox` CLS p75 0.109 over 0.100. Both TTFB breaches the note named are gone. Carries a written ticket-26 exception and the gate **still counts it as a failure** — the honest arrangement. Its hermetic half is a separate step and is BLOCKING. | CRM lane |
| `knip` (BE) | rc=1, unused exports/types in `src/modules/**` (chat, notifications, ai, gdpr, organization). No ratchet at all on this raw report | owning module tickets |
| Route-budget HTTP capture (BE) | **NOT RUN** — the five `CI_PERF_SEED_*` repository secrets do not exist, so its CI exit code is not measured and is not claimed. A jest run, not a `check:*` gate, so it has no exit-2 convention to split on | whoever provisions those secrets |
| Upload the perf capture (BE) | Depends on the step above; `if-no-files-found: ignore` already makes an absent artifact a non-event | same |

---

## Caught live by the fix, within twenty minutes of making it

`check:contract-vendor` measured **exit 0** at 16:20 and **exit 1** at 16:35. Between those two
runs another agent regenerated the backend's `openapi.json` (mtime 16:35, `M openapi.json`), and
`frontend/contracts/openapi.json` (mtime 15:41) went stale:

```
✖  frontend/contracts/openapi.json is STALE — it does not match .../streamlineos-backend/openapi.json
   frontend hash: 0ca145222e75aa40...   backend hash: eab846b6b7b33488...
```

Under the old wiring this step was `continue-on-error: true` and that mismatch would have shipped
green. It now blocks. **This is a cross-territory finding, not fixed here** — re-vendoring while
another agent is still changing controllers would only re-stale it. Owner: ticket 04 / contracts.

---

## PRD-C015 — absolute workstation paths and portable resolution

**Sweep performed:** `/Users/`, `C:\`, `/home/` across `scripts/`, `src/scripts/`,
`.github/workflows/**` and both `package.json` files, plus a second sweep for relative-**depth
guessing** (`resolve(x, "../../..")`) reaching outside the repository, which is the same defect
wearing a portable costume.

**No hardcoded workstation path was found in either repo.** The four `C:\Program Files\...`
literals (`browser-driver.mjs`, `browser-driver-auth.mjs`, `measure-web-vitals.mjs`) are legitimate
Windows Chrome/Edge discovery candidates and are correct as they stand.

The starting-point claim that the backend's `check:file-sizes` prints a hardcoded absolute path
into the sibling repo is **stale**: `EXCEPTIONS_DOC` is `join(WORKSPACE_ROOT, ...)`, resolved from
the marker by `check-repo-paths.mjs`. It *prints* an absolute path, but that path is this machine's
correctly-resolved one, and it resolves to a different correct path on any other layout.

**Three real portability defects were found and fixed:**

| File | Was | Now |
|---|---|---|
| `backend/src/scripts/production-ops-evidence.mjs` | `resolve(scriptDir, "../../..")` + `architecture-refactor/...` → resolved to `.../streamline/architecture-refactor/...`, **a directory that exists in no layout this project uses**. Every capture wrote and every verify read somewhere that was not the evidence root | `WORKSPACE_ROOT` from the marker; absent → exit 2 INCONCLUSIVE naming the marker |
| `backend/src/scripts/collect-s7-evidence.mjs` | `resolve(backendDir, "..")` + same suffix → same nonexistent directory; the report was written outside both repositories | `WORKSPACE_ROOT`; absent → exit 2 |
| `frontend/scripts/check-contract-vendor.mjs` | Did not use the shared resolver at all. Guessed `../streamlineos-backend`, `../backend` by depth, **and read a private env var `STREAMLINEOS_BACKEND_ROOT` — one letter from the `STREAMLINE_BACKEND_ROOT` every other frontend gate honours** | shared resolver first and authoritative; legacy env var and monorepo layout kept as fallbacks |

The `check-contract-vendor` env-var divergence was silently defeating the documented override.
**Measured before the fix:** with `STREAMLINE_BACKEND_ROOT=/nonexistent` the gate exited **0**,
comparing against a checkout the operator had explicitly overridden away from. **After:** exit 1
naming the reason (and exit 2 once the INCONCLUSIVE code landed).

The path suffixes were also converted from `"a/b/c"` string literals to `node:path` segment
arguments, per the Windows rule.

---

## PRD-C104 — self-test bite inventory

### (iii) Gates with no `:self-test` at all

| Repo | Gate | Verdict |
|---|---|---|
| both | **`check:gate-wiring`** | **FIXED.** The gate that decides whether every other gate can run had no self-test at all. 28 assertions added, each naming a specific verdict; ported to both repos and wired into both workflows |
| BE | **`check:db-generate-guard`** | **FIXED** — see above; it had no *gate*, only a self-test |
| BE | `check:s05-artifact-contract` | Open. Cross-repo gate; exits 2 without the workspace. Not fixed |
| BE | `check:alert-system` | Open. Not fixed |
| BE | `check:body-binding` | Open. Not fixed |
| both | `check:cycles` | Accepted — it is `madge --circular`, an external tool with its own test suite |
| FE | `check:properties` | Accepted — a composite of four scripts that each have their own self-test, plus madge |

### (i) Hard-coded expected counts

Four self-tests printed a literal assertion count in their PASS line. Three had **drifted from
the number they actually run** — the documented defect class (a backend self-test once printed 27
while its own list named 30):

| File | Claimed | Actually ran | Fix |
|---|---|---|---|
| `frontend/scripts/check-dead-code.mjs` | 18 | **21** | counter, prints the real number |
| `frontend/scripts/check-no-local-formatters.mjs` | 5 | **7** | counter |
| `backend/src/scripts/check-dead-code.mjs` | 20 | 20 (accurate) | counter anyway, so it cannot drift |
| `frontend/scripts/check-client-pages.mjs` | 2 | 2 (accurate) | left |

These are **reporting** inaccuracies, not inabilities to fail — each still exits 1 on a planted
defect. The important instance of the class was `check:db-generate-guard`, above, where the
hard-coded count *was* the whole gate.

### (ii) Self-tests asserting only a non-zero exit

Swept both repos for `status !== 0` / `code !== 0` / `toBeTruthy()` used as the assertion in a
self-test. **No instance found.** The self-tests in this codebase consistently assert a named
verdict (`reason === "vacuous-scan"`, `errors.some(e => e.error.includes("stale line count"))`).
The bar the ticket sets is already the house style; the gap was gates with no self-test at all,
not weak ones.

### Anti-vacuity floors

`check:gate-wiring` gained a floor of a new kind: its success line now reports **how many gates
can FAIL**, not merely how many are wired.

```
FE: check-gate-wiring: 35 gates, 32 of them able to FAIL the job (3 registered non-blocking)
BE: check-gate-wiring: 99 gates, 90 of them able to FAIL the job (0 registered non-blocking)
```

A green that does not name what it proved is how this whole class survived.

### Wired live during the session

`check:conflict-targets` landed in the backend `package.json` while this ticket was running and
`check:gate-wiring` caught it **UNWIRED** the same hour. Measured (self-test exit 0, gate exit 0)
and wired into `ci.yml`. The rule working on a gate it was not written for.

---

## Baseline integrity

`check:baseline-integrity` is **blocking** in `ci.yml` and was **exit 1**. Now **exit 0**:

```
Gate scripts 89 · constants 129 · json ratchets 12 in 9 baseline file(s) · registered 141
  ratchet 32 · floor 107 · pinned 2 · unregistered 0 · stale 0
OK — every gate's own numbers are registered, and none moved in its unsafe direction.
```

Resolved honestly, one at a time. **The reported "NET RAISE of 159" was an artifact**, not a raise:
the tool sums a file's *registered* baselines against its *current* ones, and
`check-gate-wiring.mjs` had one of its three constants registered.

| Constant | Move | Verdict |
|---|---|---|
| `check-gate-wiring.mjs :: MIN_GATES` | floor 60 → 90 | **TIGHTENING, banked.** Raising a floor forces the scan to reach more before it may report clean. 99 gates at head |
| `check-gate-wiring.mjs :: MIN_JOBS = 11` | unregistered → registered | **Not a rename and not a raise.** A different dimension MIN_GATES never covered; it was absent, not lower. 15 jobs at head |
| `check-gate-wiring.mjs :: MIN_RUN_STEPS = 118` | unregistered → registered | Same. 160 run steps at head |
| `check-file-sizes.mjs :: MIN_FILES` | floor 50 → 2000 | **TIGHTENING, banked.** The old 50 was 1.4% of the corpus; the script's own comment records the tmpdir proof it passed over 80% of `src/` |
| `check-over-300.mjs :: BASELINE` | ratchet 394 → 392 | **GENUINE IMPROVEMENT, banked.** This was the one unjustified upward move in either repo (392→394 by `c3f0b73db`); it is now back down. Re-measured 388 of 3,646, four *below* the ratchet. The stale reason text read "RED at head: 406 vs 394" — no longer true |
| `check-placement-bypass.mjs :: PROVIDER_REACH_MAX_DEPTH = 5` | unregistered → **pinned** | Registered `pinned` deliberately. That script is another agent's (mtime 16:29, actively edited) and this ticket did not reason about which direction is safe. `pinned` asserts no direction and forces whoever changes it to re-register with one |
| `check-conflict-target-inference.ts` :: 3 `MIN_*` floors | unregistered → floor | Another agent's brand-new gate, landed unregistered against a blocking gate. Registered at their authored values as floors, owner attributed to them, direction only |

---

## PRD-C064 — what could and could not be run

The database-dependent half **could not run.** `check:tenant-relationships` reports it directly,
and refuses to produce a number rather than producing a misleading one:

```
TARGET IS MID-BOOTSTRAP — this number is not release evidence.
  The target's migration ledger holds 573 of 672 journal entries,
  so the chain is only partly present and constraints later in it have not been created yet.
                                                                          exit 2
```

That is the other agent's bootstrap, in flight. Measured at 16:38 IST.

| PRD-C064 sub-proof | Status |
|---|---|
| migration chain / discipline | `check:migration-discipline` **exit 0** — PASSED |
| migration ledger | self-test **exit 0**; live half **NOT RUN** (needs a bootstrapped DB) |
| migration rollback | self-test **exit 0**; live half NOT RUN |
| snapshot-chain guard | `check:db-generate-guard` **exit 0** — 672 entries, snapshot 0464, drift 207. *This is newly meaningful: until today it read nothing* |
| two clean bootstraps | **NOT RUN** — bootstrap in progress, owned elsewhere |
| catalog parity | `check:permission-keys` **exit 0** (two-repo layout) |
| tenant relationships | **INCONCLUSIVE, exit 2** — target mid-bootstrap, 573/672 |
| tenant indexes | `check:tenant-indexes` **exit 0** — every tenant table leads with its tenant column |
| RLS | **NOT RUN** — needs the bootstrapped DB as `streamline_app` |
| query plans | **NOT RUN** — same |
| OpenAPI / contract compatibility | `check:openapi-coverage` **exit 0** (3,642 operations stamped); `check:contract-breaking-change` **exit 0**; `check:contract-registry` **exit 0** (102 operations, 23 webhook events); `check:operation-ids` **exit 0**. **But `check:contract-vendor` exit 1** — the vendored copy is stale, see above |
| cache invalidation | **NOT RUN** — `check:cache-invalidation` is another agent's file this session |
| zero unclassified unnecessary keys | **NOT RUN** |

PRD-C064 is therefore recorded **PARTIAL**, not closed.

---

## Closing state at 16:48 IST — two gates red from other lanes, honestly recorded

Other agents were committing throughout. Re-run at the very end rather than trusting the
mid-session numbers, per the coordinator's instruction. Everything this ticket owns is green:

```
BE check:gate-wiring 0   BE check:baseline-integrity 0   BE check:conflict-targets 0/0
FE check:gate-wiring 0   BE check:db-generate-guard  0/0
```

Two backend gates are red at close, **both from other lanes' in-flight edits, and both are the
gate working correctly rather than a gate defect**:

| Gate | Red because | Whose |
|---|---|---|
| `check:file-sizes` | (a) `invitation-acceptance.service.ts` registry says 509 lines, file measures 508 — someone shaved a line and the §7 registry is now stale; (b) `src/scripts/check-referential-action-drift.ts` is **596 lines and untracked** — another brand-new gate that landed minutes ago, over the 500 limit with no registry row | organization lane; whoever is adding `check-referential-action-drift` |
| `check:type-assertions` | `cache.service.ts` has no plain assertion left, so its ceiling-ledger entry is stale — "an exception that outlives its site is how the next reader inherits a licence nobody meant to grant". Fix is `--update-ledger`, which can only lower | cache/platform lane; two of its files (`cache-fill.ts`, `response-contract.interceptor.ts`) were mid-edit |

**Called out deliberately:** I removed `continue-on-error` from backend `check:file-sizes` on a
measurement taken at 16:25 when it was exit 0, and it went red at 16:48. **I am not re-adding the
flag.** Both findings are exactly what the gate exists to surface, and re-flagging a gate because
it started doing its job is the defect this ticket removed. But the sequence is worth stating
plainly: a green measured during an active session is a snapshot, not a steady state, and the
honest record is that this gate is blocking and currently red on another lane's debt.

`check:declaration-constraint-drift` measures exit **2** locally — INCONCLUSIVE, no
`CONSTRAINT_DRIFT_GATE_DATABASE_URL` set. That is **not** a red: `db-gates.yml` supplies that URL
from a CI postgres service, so the local 2 is the prerequisite-blocked case behaving correctly.
It is not counted as a failure here.

---

## Files changed

**Backend** (`streamlineos-backend`)
```
.github/workflows/ci.yml
package.json
scripts/guard-db-generate.mjs
src/scripts/check-gate-wiring.mjs
src/scripts/check-dead-code.mjs
src/scripts/collect-s7-evidence.mjs
src/scripts/production-ops-evidence.mjs
src/scripts/baselines/ratchets.json
src/scripts/run-gate.mjs                      (new)
```

**Frontend** (`streamlineos-frontend`)
```
.github/workflows/frontend.yml
frontend/package.json
frontend/scripts/check-gate-wiring.mjs
frontend/scripts/check-contract-vendor.mjs
frontend/scripts/check-dead-code.mjs
frontend/scripts/check-no-local-formatters.mjs
frontend/scripts/run-gate.mjs                 (new)
```

No application source was touched. `src/scripts/check-conflict-target-inference.ts` and
`src/scripts/bootstrap-interrupt-resume.mjs` appear untracked in the backend; they are other
agents' files, not this ticket's.

---

## Cross-territory findings — not fixed here

0c. **`GET /public/kb/{slug}/attachments` returns a bare array from a paginated, PUBLISHED
   endpoint with external consumers.** Needs a product decision (version it, add a paginated
   sibling, or accept it), not a code fix. `check:envelope-consistency` is exit 1 until then.
0b. **~3,617 operations declare no response schema** (0.69% coverage). Recorded as a ratchet at
   the true figure, not ratcheted green. Owner: every lane owning a controller, coordinated by
   ticket 04.
0a. **A mocked spec cannot observe a plan-time database error.** `chat-send-idempotency.spec.ts`
   passed 5/5 against a 100%-failing chat send. Owner: chat lane + testing policy. The static
   remedy (`check:conflict-targets`) is now wired and green.
0. **`knip` cannot report dead code in either repo**, and the BLOCKING backend
   `check:dead-code` is green over that blind input. 29 backend + 8 frontend files need
   classification before the corrected config can land. Corrected configs handed over at
   `reports/30-knip-reach/`. Owner: coordinator to route per module lane.
1. **`frontend/contracts/openapi.json` is STALE** against the backend artifact as of 16:35.
   Newly blocking. Owner: ticket 04 / contracts.
2. **`features/chat/chat-helpers.ts:resolveFileUrl` has no WIRE/KEEP verdict** — the sole thing
   keeping `check:dead-code` red. Owner: chat lane.
3. **15 route-bundle budget breaches**, 1 Web Vitals CLS violation. Owners: tickets 22/26.
4. **`knip` exit 1** — unused exports in chat, notifications, ai, gdpr, organization.
5. **Three backend gates still have no self-test:** `check:s05-artifact-contract`,
   `check:alert-system`, `check:body-binding`.
6. **Five `CI_PERF_SEED_*` repository secrets do not exist**, so the route-budget HTTP capture
   can only skip in CI.
7. **A new gate lands red against `check:baseline-integrity`** until its `MIN_*` floors are
   registered. That is the mechanism working, but it is a trap for the next author and is worth
   a line in the gate-authoring notes.

## Honest gaps

- Every exit code in this report was executed and read. Nothing is claimed as passing that was
  not run; "NOT RUN" is written where it was not.
- CI behaviour is **inferred, not observed** — no workflow run was triggered. The exit codes were
  measured locally, and the single-repository case was simulated by overriding the root resolver
  to a nonexistent directory rather than by performing a real one-repo clone.
- All bite-proofs were performed in `mkdtemp` fixture trees and torn down. No mutation was ever
  planted in the shared working tree.
- Other agents were committing throughout; both SHAs moved during the session and several gates
  were re-measured at the end. `check:contract-vendor` genuinely changed verdict mid-session and
  both measurements are recorded.
