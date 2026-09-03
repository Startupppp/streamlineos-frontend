# Ticket 34 — Production operations, alerts and cost — current-head audit

**Audited:** 2026-09-03. Branch `release/code-10-10-v2` in both repos.
**Prior report:** none. This reconstructs ticket 34's evidence from scratch.
**Scope note:** CRM and Inventory are out of release scope; findings there are recorded but not
counted against the release.

Ticket 34 owns 11 PRD criteria. **Ten of the eleven (C165, C166, C167, C172, C173, C174, C175,
C176, C177, C178) sit inside the PRD's own "Deferred production-readiness evidence" section**
(`PRD-10-10-CODE-RELEASE-TODO.md:619-639`); C010 (`:31`) defers its ticket-34 half explicitly.
So the honest question is not "does head satisfy them" — no repository can — but **"is the machinery
that will produce that evidence correct, non-vacuous, and honest about what it has not measured?"**
That is what this audit measured, and the answer is: mostly yes, with **21 findings, 10 of them P1**,
including four gates that return a green exit code over an input that proves nothing.

---

## 1. What I read, with numbers

### Repository surface enumerated

| Surface | Count | How counted |
|---|---|---|
| Backend `package.json` scripts | **368** total, **101** ops/alert/cell/evidence-related | `Object.keys(scripts)` + regex |
| Backend `src/scripts/` files | **252** | `ls` |
| `alert-*.mjs` detectors on disk | **14** | `ls src/scripts/alert-*.mjs` |
| Alert dispatch registry entries | **12** | `alert-dispatch.mjs:15-37` |
| Alerts covered by `check:alert-system` | **12 of 14** (+2 helpers = 14 spawned) | `check-alert-system.mjs:8-23` |
| Alerts named in `INCIDENT-RESPONSE.md` §1.2 | **12** | table rows |
| `cell*` operator scripts | **19** | `ls src/scripts \| grep cell` |
| `src/common/observability/` files | **34** | `ls` |
| `src/health/` files | **15** | `ls` |
| `src/common/slo/` files | **5** | `ls` |
| Runbooks `RB-01…RB-10` + template | **11 files** | `ls architecture-refactor/runbooks` |
| Production-ops evidence tree | **303 files / 1,503,006 bytes / 27 directories** | `find … -type f` |
| Bare `.json` under the evidence root | **11** (MANIFEST-INTAKE.md documented 7) | `find … -name '*.json' ! -name '*.input.json'` |
| `*_url` columns in live schema `scratch_head_1010` | **69** | `information_schema.columns` |
| Backend source files scanned by `check:log-secrets` | **3,663** | gate output |
| `withLease(...)` cron callers | **30+** across 6 controllers | grep |
| Deployment manifests (k8s/ECS/compose) in either repo | **0** | `find` for `*.yaml`/`*.yml` outside `.github/`; `grep` for `terminationGracePeriodSeconds\|readinessProbe\|livenessProbe\|preStop` → **0 hits repo-wide** |

### Documents read in full

`architecture-refactor/`: `INCIDENT-RESPONSE.md` (349 lines), `RB-06-live-alert-delivery.md`,
`RB-07-per-cell-cost.md`, `PRD-10-10-CODE-RELEASE-TODO.md` §deferred, plus
`SLO-CATALOGUE.md` / `RELEASE-ENGINEERING.md` / `PROVIDER-RELIABILITY.md` headers.
Evidence: `42-production-ops/README.md`, `MANIFEST-INTAKE.md`, `observability-c173/README.md`,
`deploy-safety/README.md`, `RB-05-…-NOT-deployed-evidence.md`, `RB-07-…-NOT-deployed-evidence.md`,
`RB-06/raw/07-check-alert-ack-exit-matrix.txt`, `RB-06/raw/12-log-backed-detectors-no-stream.txt`,
`deploy-safety/raw/lease-recovery-drill.txt`.

### Code read line-by-line

`production-ops-evidence.mjs` (264), `check-alert-ack.mjs` (228), `drill-alert-system.mjs` (163),
`check-alert-system.mjs` (81), `alert-dispatch.mjs` (registry + dispatch, 140 of 330),
`alert-tenant-ctx-errors.mjs` (125), `alert-p95.mjs` (head), `alert-seam-latency.mjs` (head),
`check-cell-load-headroom.mjs` (180), `check-evidence-seal.mjs` (140 of ~400),
`check-feature-flag-governance.mjs` (96), `main.ts` (142), `logger.service.ts` (51),
`redact.ts` (193), `release.ts` (15), `observability-context.ts` (76), `log-span-exporter.ts` (30),
`health.controller.ts` (232), `shutdown-gate.ts` (46), `shutdown-state.ts` (114),
`readiness.config.ts` (72), `cron-lease.service.ts` (115), `workflow-store.ts` (lifecycle half),
`feature-flags.ts` schema (46), `Dockerfile` (23), `.github/workflows/alerts.yml` (92),
`.github/workflows/cell-daily-samples.yml` (71), `settings.controller.ts` flags endpoints.

### Commands actually run at head (exit codes are mine, not quoted)

| Command | Exit | Headline |
|---|---|---|
| `node src/scripts/production-ops-evidence.mjs verify` | **1** | 0/8 runbooks + **11** spurious `.json` failure lines |
| `node src/scripts/production-ops-evidence.mjs --self-test` | 0 | `{"pass":true,"validDeployedShapePasses":true,"alteredArtifactBlocked":true,"selfTestClaimBlocked":true}` |
| `node src/scripts/check-alert-system.mjs` | 0 | `{"allPassed":true,"checkedScripts":14}` |
| `node src/scripts/check-alert-ack.mjs` | **2** | `PREREQUISITE MISSING: ALERT_WEBHOOK_URL is not set` |
| `check-alert-ack.mjs` (webhook set, no state) | **2** | `no acknowledgement record at …/alert-drill-ack.json` |
| `check-alert-ack.mjs --self-test` | 0 | 7/7 checks |
| `check-alert-ack.mjs --state-file=<2-yr-stale> ` | **1** | `STALE ACK` — correct |
| `check-alert-ack.mjs --state-file=<same> --max-age-hours=abc` | **0** | **`{"acked":true,"ackedAt":"2024-01-01…"}` — staleness silently disabled** |
| `alert-p95 / seam-latency / pool-saturation < /dev/null` | **2** each | correct "exporter unwired" |
| `alert-tenant-ctx-errors < /dev/null` | **0** | **`{"fired":false,"count":0}` — vacuous green** |
| `alert-dispatch --alert-id=workflow-stranded --dry-run` | **2** | `Unknown alert id` |
| `alert-dispatch --alert-id=retention-dead-man --dry-run` | 0 | routes to platform-reliability/critical |
| `alert-workflow-stranded --self-test` | 0 | 2/2 |
| `alert-retention-dead-man --self-test` | 0 | 23/23, 16 monitored sweeps |
| `check-cell-load-headroom --results=<1-of-14 objectives>` | **0** | **`HEADROOM PASS measured=1 skipped=13`** |
| `check-evidence-seal.mjs` | **1** | 6 seals, 68/68 files match, **1 BROKEN** |
| `check-evidence-seal.mjs --self-test` | 0 | 17 passed |
| `check-log-secrets.mjs` | 0 | 3,663 files, 101 TIERS, 23+18 redactor names |
| `check:feature-flag-governance` | 0 | reads **1 file**, 2 regexes |
| `check:idempotent-commands` | 0 | 546 controllers, 11 fenced |
| `check:outbox-consumers` | 0 | 29 registered event types, no orphan emitter |
| `check:contract-breaking-change` | 0 | 102 published operations, 23 webhook names |
| `cell:degraded:self-test` / `cell:drill:self-test` / `failure-drill:self-test` | 0 | pass |
| `cell:rollout:self-test` (no `APP_DATABASE_URL`) | **1** | `APP_DATABASE_URL is required` — should be exit 2 |
| `cell:rollout:self-test` (local `APP_DATABASE_URL`) | 0 | healthy 83.4ms DEPLOY / regressed 2010.9ms ROLLBACK |
| `frontend check:web-vitals-budget` | **1** | 1 violation, **on `/crm/inbox` (out of scope)** |
| `frontend check:web-vitals-budget --self-test` | 0 | bite-proven |
| `frontend check:route-bundle-budget` | **1** | 18 breaches / 13 routes |
| `check:public-object-urls` | 0 | 3,664 files, 9 declared, 0 minted public URLs |

Nothing was run against the shared remote Neon branch. Local DBs used:
`scratch_head_1010` (owner and `streamline_app` non-owner).

---

## 2. Per-criterion assessment

### PRD-C010 — Uploads/operator cutover: ticket 21 code lifecycle + **ticket 34's deployed private-bucket/backfill evidence**

**NOT MET — blocked on infrastructure, and the backfill half has no code at all.**

*Code half (in ticket 34's reach to verify):* `check:public-object-urls` is green over **3,664 source
files** with 9 declared non-minting references and **0 upload-result URL fields**. `storage.service.ts`
mints only presigned URLs (`getSignedUrl`, `:232`); the minting counterpart `publicUrlFor` was deleted
in ticket 33 and its absence is pinned by `storage-tenant-private.spec.ts`. That is real and
non-vacuous.

*Backfill half:* the live schema carries **69 `*_url` columns**. At least 17 are object-store
carriers — `chat_attachments.file_url`, `documents.file_url`, `candidate_documents_vault.file_url`,
`kb_article_attachments.file_url`, `support_ticket_attachments.file_url`,
`gl_document_attachments.storage_url`, `ar_documents.pdf_storage_url`, `payslip_publications.pdf_url`,
`expenses.receipt_url`, `reimbursements.receipt_url`, `onboarding_documents.file_url`,
`hr_contracts.document_url`, and, named for what it is,
**`termination_supporting_documents.legacy_url`**. `storage.service.ts:368 getFileKeyFromUrl` exists
precisely because stored values may still be `https://<public base>/<key>` rather than a key.

**There is no backfill script for any of them.** `package.json` declares six `backfill:*` scripts
(member-roles, system-roles, crm-metadata, person-employment, financial-actors, kb-pages); none
touches storage. Grepping `src/scripts/*.{mjs,ts}` for a storage/bucket/object URL backfill returns
nothing. So C010's ticket-34 deliverable is blocked on **both** a deployed private bucket *and* a
migration/script that does not exist yet.

### PRD-C165 — production-build / reference-device Web Vitals; Product acceptance if the frozen landing animation blocks its target

**PARTIALLY MET.** Production-build evidence exists and is real. Reference-device evidence and the
Product acceptance record do not.

- The gate refuses non-production measurement: `check-web-vitals-budget.mjs:651` fails outright
  unless `results.serverMode === "production"`. The committed `.browser-driver-results.json` records
  `serverMode:"production"`, a `buildId`, `repeat:8`, and 13 authenticated routes.
- **Every in-scope route passes every budget.** The single violation at head is
  `[mobile] /crm/inbox CLS p75 0.109 > 0.100` — **CRM, out of release scope**, already annotated with
  a recorded ticket-26/S11 exception and still counted as a failure (correctly — an exception that
  removed the failure would be worse).
- **Reference device: not met.** `conditions` records `mobile: 390x844@3x, 4x CPU, 1.6 Mbps down,
  150ms RTT` against `http://localhost:1000` on a 15-core macOS laptop, with the driver's own warning
  that "a throttled mobile profile on a contended host measures the host". That is an emulated
  profile, not a named reference device.
- **Landing animation: moot but unrecorded.** The landing page is not in the measured route set at
  all — `check-web-vitals-budget.mjs:668` states "these budgets govern authenticated in-scope routes;
  landing-page figures" are separate. No Product acceptance decision exists under
  `architecture-refactor/decisions/` for it.
- Adjacent: `check:route-bundle-budget` fails with **18 breaches across 13 routes**; 15 are in-scope
  (`/chat` +292,720 B script, `/build/my-work` +259,808 B, `/support/inbox` +201,663 B). That is
  ticket 29's criterion, not C165's, but C165 evidence cannot be called complete beside it.

### PRD-C166 — realistic load; pools, queues, CPU, memory, errors, replica behaviour, sustained/burst capacity

**NOT MEASURED — blocked on infrastructure.** Confirmed independently at head.

`cell:load` exits 1 with `MISSING PREREQUISITE: .load-driver-results.json does not exist` — the load
driver has never produced a result on this machine, and `RB-05-local-run-NOT-deployed-evidence.md`
says so plainly. The envelope is declared (`envelope-profile.mjs`: **14 latency objectives**;
`CELL_SHARE` = 1,000 orgs, 100,000 largest-org members, 50 sustained rps / 100 burst rps,
1,000 async events/min, 1,000,000 knowledge chunks) and `load:drive:verify` (15 assertions) proves
the driver's own correctness. What is absent is a colocated runner and a seeded 100,000-member
fixture.

**What would measure it:** `pnpm -C backend seed:envelope` then `pnpm load:drive` executed from a
host in the same region as the cell's Postgres endpoint (the script's header warns that a public-
internet runner's 80ms RTT floor exceeds several targets on its own), then `pnpm cell:load`.

### PRD-C167 — prove declared SLOs with ≥ 40% capacity headroom

**NOT MEASURED for the load half; the capacity half ran locally; and the gate that decides it is
vacuity-prone — see F-02, the most important finding in this ticket.**

- Headroom formula is correct: `(target − measured) / target ≥ 0.40`
  (`check-cell-load-headroom.mjs:52-58`), with four boolean objectives correctly exempted.
- Two vacuity guards exist: empty `objectives` array (`:143`) and insufficient
  `organizationMembers` (`:151`).
- **No coverage floor.** I constructed a results file with `organizationMembers: 100000` and
  **one** measured objective and ran the gate: it printed `RESULT: HEADROOM PASS measured=1
  skipped=13 breached=0` and **exited 0**. Thirteen of fourteen SLOs were `NOT_DRIVEN` and the
  release gate said pass.
- The capacity half did run locally (`cell:capacity`, limiting resource `table-bloat` at 53.1%,
  cell OPEN under a 60% admission threshold) but over a near-empty database, which the RB-07
  evidence document states explicitly.

### PRD-C172 — measure/approve per-cell and active-tenant cost using RB-07

**NOT MEASURED — blocked on vendor API credentials and a named approver. The model is honest.**

`run-cell-unit-cost.mjs` (365 lines) refuses rather than invents, in eight distinct places:
`REFUSED — active org count not measured (occupancy unknown; a cheap empty cell is not a finding)`,
`REFUSED — only N well-spaced sample(s); need 3 each ≥Nd apart`,
`AI cost note: dollar value requires credit-to-USD rate from the billing config`,
`Non-AI cost units: UNMEASURED without Neon/Resend/Cloudflare vendor API credentials`.
AI cost is carried in **integer milli-credits** (`sum(credits_milli)::bigint`), not floats — the
money-in-float shape does not apply to the credit ledger. `Number(row.cost_usd)` at `:61` and
`.toFixed(4)` at `:148` are float, but on a *display* path for a vendor-invoice figure, not a ledger
write; I rate that P2 only because it feeds the `operator-capacity-approval` assertion a human signs.

`cell-daily-samples.yml` schedules `cell:capacity:record` + `cell:cost:record` daily at 02:00 UTC
and caches the two history files — the trend infrastructure is wired. It is gated on
`secrets.CI_APP_DATABASE_URL`, which is unset, so it emits a `::warning` and the job goes **green**
(same shape as F-14 below).

**Blocked on:** Neon / Upstash / Cloudflare R2 / Resend billing API keys, three samples ≥ the
minimum spacing apart from a populated cell, and `operator-capacity-approval` — a human act.

### PRD-C173 — production logs, traces and release metadata **with redaction**

**PARTIALLY MET.** Logs and redaction are met and installed process-wide. Traces are met in code
with no collector. Release metadata is plumbed and **entirely unpopulated**. Two new defects.

*Met, and verified:*
- `main.ts:75 app.useLogger(structuredNestLogger)` converts the framework's own output and ~70
  module-constructed `Logger`s into one JSON line each, carrying `timestamp, level, message,
  correlationId, release, cellId, orgId, actorId, method, route` (`logger.service.ts:22-37`).
- Redaction is on the hot path, not merely defined: every `meta` goes through
  `redact(meta)` at `logger.service.ts:36`. `redact.ts` withholds **23 key substrings + 18 exact
  names**, including tenant content (`emailaddress`, `phonenumber`, `prompt`, `filename`,
  `subject`, `to/cc/bcc`) and Drizzle's two leak carriers (`params`, `driverdetail`), plus
  `scrubBindParameters` for the bind values Drizzle embeds in the *message* string.
- `check:log-secrets` exits 0 over **3,663 files** and cross-checks that every name it guards is
  actually withheld by the runtime redactor, so gate and redactor cannot drift apart.
- Traces: W3C `traceparent` implemented directly (`tracing.ts`), joined not replaced, echoed back;
  `setSpanExporter(new LogSpanExporter())` **is** wired at `main.ts:82`. Attaching a collector is an
  exporter implementation, not a re-instrumentation.

*Not met:*
- **`APP_RELEASE` is never set anywhere.** Re-confirmed at head: it appears only in `.env.example:10`
  (blank), `env.validation.ts:38` (optional), `release.ts:13` (the reader), its consumers and their
  tests. `Dockerfile` declares only `NODE_ENV` and `TZ` — no `ARG`/`ENV`. No workflow exports it.
  Every production log line, error report and async hop would read `"release":"unknown"`, and
  "which deploy caused this?" is unanswerable from the logs. The frontend has no counterpart either
  (`VERCEL_GIT_COMMIT_SHA` / `NEXT_PUBLIC_RELEASE` / `COMMIT_SHA`: **0 hits**).
- **New (F-11): `logger.service.ts:12` sets the production threshold to `warn`.** Every
  `logger.info` and `logger.debug` is dropped in production. That includes the successful-drain
  line at `health.controller.ts:106` — in production you observe a *failed* drain and never a
  successful one. `LogSpanExporter` writes to stdout directly and is unaffected, so the p95 and
  seam detectors survive; anything else emitted at `info` does not.
- **New (F-19): `log-span-exporter.ts:26`** spreads `redactAttributes(span.attributes)` *after* the
  span's own fields, so an attribute named `name`, `status`, `traceId`, `latencyMs` or `message`
  silently overwrites the field the detectors key on.

### PRD-C174 — test live alerts and human acknowledgement using RB-06

**NOT MET — blocked on `ALERT_WEBHOOK_URL` + a human, as designed. Five defects found in the
machinery that will be used.**

Measured at head: `check:alert-ack` exits **2** (prerequisite absent) — correctly not a pass.
`check:alert-system` exits **0** with `checkedScripts:14`. The prior wave's exit-code matrix
(RB-06 `raw/07`) is reproducible.

The delivery path is real: `drill-alert-system.mjs` posts a nonce, refuses to claim success on a
closed port (`ECONNREFUSED` → exit 1), exits 3 in non-interactive mode rather than folding an
unacknowledged delivery into a pass, and only writes `acked:true` when a human types back the
nonce. `check-alert-ack.mjs` fails closed on missing/`false`/`null`/undelivered/stale.

But:
- **F-03: `--max-age-hours=<non-numeric>` disables the staleness check entirely.** Measured: the
  same 2-year-stale state file exits **1** with the default and **0** with `--max-age-hours=abc`.
  `Math.max(1, parseInt("abc",10))` is `NaN`, and `ageMs > NaN` is always false.
- **F-05: `alert-tenant-ctx-errors.mjs` is vacuous on an empty stream** — exit 0, `"fired":false`.
  Its three log-backed siblings all exit 2 with an explicit "the exporter is unwired" message.
  A broken log pipeline reads as "no tenant-context errors".
- **F-08: `workflow-stranded` cannot be dispatched.** It has a detector, a passing self-test and a
  `package.json` script, but no `alert-dispatch.mjs` REGISTRY entry — measured exit 2
  `Unknown alert id`. Given this project's recorded "workflow relay breaks under RLS, the cron tick
  500s and no durable workflow advances" incident, the alert for exactly that condition is the one
  that cannot reach a pager.
- **F-13: `alert-retention-dead-man.mjs` is an orphan in the other direction.** 437 lines, a
  23-check self-test that passes, a `critical` entry in the dispatch registry, and a row in
  `INCIDENT-RESPONSE.md` §1.2 — but **no `package.json` script and no place in
  `check-alert-system.mjs`**. Nothing runs it.
- **F-14: `.github/workflows/alerts.yml` is green when the pager is unconfigured.** The daily
  `test-event` job checks `ALERT_WEBHOOK_URL`, emits `::warning` when unset, skips every subsequent
  step and **exits 0**. It also runs only **7** of the 14 self-tests and never invokes
  `check:alert-system` or `check:alert-ack`.
- Design limit, correctly and publicly documented: the ack gate reads a JSON file in `tmpdir()`
  with no signature or identity binding, so it is an honour-system attestation. The prior wave
  proved this itself with `raw/09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json`. I record it rather
  than rating it — a file-based human attestation cannot be made cryptographic without a signer.

### PRD-C175 — passing RB-01…RB-08 manifests with identity, topology, SHA, operator, timestamps, exit code and hashes

**NOT MET — 0 of 8 runbooks, which is the intended state. Format is correct; three defects.**

`ops:evidence:check` exits **1** at head. All seven PRD-C175 elements are real fields with real
enforcement (`production-ops-evidence.mjs:110-146`): non-local `https://` target, 64-hex topology
digest, `^[0-9a-f]{7,64}$` SHA, non-empty operator + ISO `approvedAt`, `finishedAt >= startedAt`,
`exitCode === 0`, and recomputed `sha256`/`bytes` per artifact. Tamper detection is bite-proven
(`--self-test` exits 0 with `alteredArtifactBlocked:true`).

- **F-04 (P1): the credential screen is decorative.** `SECRET` at `:61` matches only
  `key: value` / `key=value` forms. I ran nine realistic secret shapes through it: **8 of 9 pass.**
  A Postgres URL with a password, a `hooks.slack.com` webhook URL (which *is* the `ALERT_WEBHOOK_URL`
  RB-06 evidence would quote), a PagerDuty routing key, a `rediss://default:<pw>@…` URL, an
  `AKIA…` key id, an AWS secret access key value, a bearer JWT and a PEM private-key block all
  survive. The README promises capture "refuses … likely unredacted credentials"; at head it would
  commit a live pager webhook into git.
- **F-09 (P1): `check:evidence-seal` fails at head, exit 1.** Six seals, 68/68 sealed files match,
  and one BROKEN: `42-production-ops/data-catalogue-c183/artifact-hashes.json` reports `0/0 match`
  and flags all five sibling files as "added to a sealed directory after the seal was written".
  The diagnosis is wrong. That seal is not empty — it lists four artifacts as
  `{"artifacts":[{"file":…,"sha256":…}]}`, an array. `check-evidence-seal.mjs:126` accepts only
  `manifest.hashes ?? manifest.files ?? {}` — object maps — and silently degrades an unrecognised
  shape to zero sealed names. This is a **seventh backend gate failure at head**, not on the six
  named in the wave's ground-truth sweep.
- **F-16 (P2): `capturedAt` is claimed enforced and is not.** `MANIFEST-INTAKE.md` lists
  `capturedAt` under "timestamps … Enforced by". `checksFor` never references it, and `verify`
  never requires it. A hand-authored `manifest.json` with correct hashes verifies identically to
  one produced by `capture`, so the `capture` step is not actually a required path. Nor is
  `release.sha` checked against a real commit — `git cat-file -e` would cost nothing.
- **F-17 (P2): two gates structurally contradict each other.** `check-evidence-seal.mjs:50` requires
  files literally named `artifact-hashes.json` inside the evidence tree; `production-ops-evidence.mjs:165`
  treats every non-`*.input.json` `.json` anywhere under `42-production-ops/` as an evidence manifest.
  Four of the six seals live under that root. At head the ops gate emits **11** spurious failure
  lines (MANIFEST-INTAKE.md recorded 7 and predicted growth; it grew) and the one real reason —
  "0/8 runbooks" — is buried beneath them. MANIFEST-INTAKE's rule "never a bare `.json`" is
  unfollowable for a sealed directory.

**Blocked on:** a deployed cell (`environment.*`, `release.sha`, `release.topologySha256`,
`dataset.activeOrganizations`, execution timestamps) and a named human
(`operator.name`/`approvedAt`, and by their own assertion ids RB-06's `human-acknowledgement` and
RB-07's `operator-capacity-approval`).

### PRD-C176 — rolling compatibility, canary aborts, kill switches, degraded modes, rollback/forward-fix under induced failure

**PARTIALLY MET. Canary abort and degraded modes are real. Kill switches are not — the only
working one is out of release scope, and the governed one is inert.**

*Met:*
- **Canary abort:** `cell:rollout:self-test` (with `APP_DATABASE_URL`) measured a healthy canary at
  p99 83.4ms → `DEPLOY` and a regressed canary at p99 2010.9ms → `ROLLBACK` (+2311% against a 20%
  threshold). That is a real measurement against Postgres, not a fixture.
- **Degraded modes:** `ProviderCircuitBreaker` (`provider-circuit-breaker.ts:83`) wraps every
  outbound call (`call-provider.ts:105`) and its open providers are surfaced in readiness
  (`health.controller.ts:80`). Cache degradation is explicit (`cache-fill.ts`, `cache.service.ts`).
  `cell:degraded:self-test` exits 0 with "a registry that falls back instead of refusing is
  reported as a failure" — the guard bites in the right direction.
- **Rolling compatibility:** `check:contract-breaking-change` (102 published operations, 23 webhook
  event names, no narrowing), `check:migration-discipline` (677 SQL files, expand/contract
  baselined), `check:outbox-consumers` (29 registered event types, no orphan emitter),
  `check:idempotent-commands` (546 controllers, 11 in-scope handlers fenced). All exit 0.
- **Induced failure:** `failure-drill:self-test` proves five drills exist, all dry-run by default,
  and that the two unsafe ones are *blocked* in execute mode rather than faked.

*Not met — F-07 (P1):*
- The `feature_flags` table has **owner** and **non-null expires_at**, plus `rollout_percentage`
  and `org_overrides` for percentage/canary rollout. **Nothing reads it.** Across 3,663 backend
  source files the only references outside the schema definition are a cache key with no reader
  (`cache-keys.ts:170: "feature-flags:all"`) and an invalidation namespace with nothing to
  invalidate (`cache-invalidation-rbac-auth.ts:51`). No service, no controller, no query. The live
  schema holds **0 rows**.
- The flags that *are* live are a different mechanism: six hardcoded AI enum values
  (`aiChat, aiLeadScoring, aiEmailDraft, aiSmartNotifications, aiWeeklyRecap, supportAi`) stored in
  `organizations.settings` JSONB and toggled through `PATCH /settings/feature-flags`
  (`settings.controller.ts:156-164`). They carry **no owner, no expiry**, are per-tenant rather than
  operator-controlled, and are **not covered by `check:feature-flag-governance`** — which reads
  exactly one file (`check-feature-flag-governance.mjs:10`) and asserts two regexes against a schema
  nobody uses. The gate is green over the wrong corpus.
- The only real kill switch is `autonomy_switches` / `resolveSwitch`
  (`src/modules/autonomy/kill-switch.ts`, 77 lines, 3 consumers, schema under `src/db/schema/crm/`).
  It is proven correct by `kill-switch-readpath-drill.ts` (7/7 against the production resolver under
  RLS) — but it gates the **CRM autonomy** surface, which is out of release scope. There is no kill
  switch for AI streaming, email/notification delivery, realtime, payments, or search/vector.
- **Rollback/forward-fix of a real release is not measurable here**, and the deploy-safety README
  says so: it needs two deployed replicas behind a load balancer.

### PRD-C177 — probes, graceful shutdown, draining, worker lease recovery, duplicate/loss safety during deployment/autoscaling

**PARTIALLY MET. The drain implementation is excellent and was proven live. Lease fencing has one
confirmed hole, the lease fails open, and no orchestrator contract exists anywhere.**

*Met, and proven with a live SIGTERM (`deploy-safety/raw/drain-probe-samples.txt`):*
- Ordering is right and observed: `t=0 /health=200, /health/ready=503, /v1/*=404` →
  `t=3113 /v1/* = 503 Retry-After=5 Connection=close`. Readiness fails first, ordinary traffic is
  served for the full settling window, only then is new work refused; the in-flight request was
  answered, not dropped; the process exited at t=3650ms by re-raised SIGTERM, never SIGKILL.
- `shutdownGate` is installed **ahead of Nest routing** (`main.ts:105`), so a request refused during
  drain never acquires a connection or a tenant transaction (`shutdown-gate.ts:19-45`), while
  `/health` stays open throughout — liveness must keep answering or the orchestrator kills the
  process mid-drain.
- `beginDrain` / `stopAccepting` are deliberately separate (`shutdown-state.ts:51-58`) and
  `beforeApplicationShutdown` runs on the health controller so `DrizzleModule.onApplicationShutdown`
  cannot close the pool first (`health.controller.ts:98-113`).
- Liveness is deliberately shallow and touches no dependency (`health.controller.ts:117-121`).
- `CronLeaseService` refuses a new lease while draining (`cron-lease.service.ts:34-39`) — a handoff,
  not a loss.
- Outbox terminal writes **are** lease-fenced: `eq(outboxEvents.leaseExpiresAt, event.leaseExpiresAt)`
  at `outbox-publisher.service.ts:221-223, 248-250, 272-274`. The drill confirmed
  `rowsUpdatedByZombie=0`.

*Not met:*
- **F-01 (P1): workflow-run terminal writes are unfenced.** `workflow-store.ts:135-146` builds
  `ownRun = organizationId AND workflowRunId` with **no lease term and no status term**, and
  `write()` applies it to `complete` (:151), `suspend` (:164), `retry` (:169) and `deadLetter`
  (:175). The drill reproduced it: `FAIL workflow: the stale worker's terminal write is FENCED by
  its stale lease — rowsUpdatedByZombie=1 (expected 0)`, run now `status=COMPLETED lease=NULL` while
  worker B held a live lease. The correct pattern already exists eight lines away in the outbox
  publisher and was not applied.
- **F-10 (P1): the cron lease fails open.** `cron-lease.service.ts:41-44` and `:53-56` run the sweep
  **without dedup** when Redis is null or throws. During a rolling deploy with N replicas and a Redis
  blip, all N run every sweep concurrently — across 30+ registered jobs including
  `email-outbox-flush`, `notification-outbox-flush`, `payroll`-adjacent and `org-purge-worker`. It is
  logged at `warn` (so it does survive the production threshold), and it is a deliberate
  availability-over-dedup trade — but C177 asks to *prove* duplicate safety, and this is the case
  where it does not hold.
- **F-21 (P2): no orchestrator contract exists.** `terminationGracePeriodSeconds`, `readinessProbe`,
  `livenessProbe`, `preStop`: **0 occurrences across both repositories.** No k8s manifest, no ECS
  task definition, no compose file. The default budget is `settlingDelayMs 5000 +
  drainTimeoutMs 25000 = 30,000ms` (`readiness.config.ts:69-70`) — exactly a Kubernetes default
  grace period, leaving zero margin for `DrizzleModule.onApplicationShutdown` to close the pool.
  Nothing declares otherwise.
- **F-06 (P1): the one probe contract that does exist points at the wrong probe.**
  `Dockerfile:21` sets `HEALTHCHECK … CMD fetch(…/health/ready)`. `/health/ready` returns 503 when
  a *shared* dependency is down (`health.controller.ts:125-138` → `databaseCheck`/`cacheCheck`).
  Under any runtime that replaces unhealthy containers, one Postgres blip marks **every** container
  unhealthy and restarts the whole fleet — the exact amplification the file's own liveness comment
  warns against ("a probe that fails on a database blip gets the process killed instead of
  drained"). The Dockerfile contradicts the controller.
- No `STOPSIGNAL` and no init process; node runs as PID 1. Nest's default shutdown-hook signal set
  includes SIGTERM so this works, but it is undeclared.
- **Autoscaling behaviour is NOT MEASURED** and needs an orchestrator.

### PRD-C178 — publish on-call ownership, escalation, incident severity, customer/status communication, post-incident review

**MET as a published procedure, with one coverage gap.**

`INCIDENT-RESPONSE.md` (349 lines) covers all five named elements in seven sections: ownership
(§1, nine owners drawn from `slo-types.ts` and build-enforced by `slo-catalogue.spec.ts` rather than
re-declared in prose), escalation (§2, ladder + acknowledgement), severity (§3, incl. automatic SEV1
triggers and an explicit "SLO breach is not automatically an incident"), customer/status
communication (§4, principles, cadence, update template, regulatory notification), and post-incident
review (§5, when, blameless, required sections, action items, feed-back-into-code). Every place
needing a human name, rota, phone number or contract is marked `[HUMAN REQUIRED]` and left blank —
which is the right call; §7 tabulates all eight of them. §6.1 self-reports the `APP_RELEASE` gap.

*Gap:* §1.2's ownership table has **12 rows** and is sourced from the dispatch registry, which also
has 12. But there are **14** alert detectors on disk. `alert-workflow-stranded` appears in neither
— it has **no owner, no severity and no runbook anchor** (F-08). And `retention-dead-man` is in the
table and the registry but has no runnable script (F-13). So the published ownership map covers
12 of 14 detectors, and the two it misses are the two with the worst asymmetry.

---

## 3. Findings

| # | Sev | File:line | Summary | Failure scenario | Fix |
|---|---|---|---|---|---|
| F-01 | **P1** | `backend/src/common/workflow/workflow-store.ts:135` | Workflow-run terminal writes are not lease-fenced | Worker A claims run R with lease L1 and stalls; the lease expires; worker B reclaims R with L2 and begins re-executing; A wakes and calls `complete(R)` — `ownRun` is `org AND runId` only, so the update succeeds, setting `status=COMPLETED, lease_expires_at=NULL` under B. `suspend()`/`retry()` from A likewise reset a run B already finished, re-queuing an end-to-end second execution and every external effect in it. Reproduced: `deploy-safety/raw/lease-recovery-drill.txt` → `rowsUpdatedByZombie=1 (expected 0)` | Thread the lease the worker was handed at claim time into `createLifecycleStore` and add `eq(workflowRuns.leaseExpiresAt, heldLease)` to `ownRun`, mirroring `outbox-publisher.service.ts:272-274`. On a 0-row update, log and abandon rather than proceed. |
| F-02 | **P1** | `backend/src/scripts/check-cell-load-headroom.mjs:66` (and `:173`) | The C167 headroom gate exits 0 over one measured objective in fourteen | A load run that only exercised Redis produces `RESULT: HEADROOM PASS measured=1 skipped=13 breached=0`, exit 0. Measured directly with a synthetic results file. Every `NOT_DRIVEN` objective is `skip`ped and `:173` auto-appends the undriven ones as `NOT_DRIVEN`, so absence of measurement is indistinguishable from a pass at the exit code — which is what a release gate consumes. | Add a coverage floor: every objective not in `NO_HEADROOM_OBJECTIVES` must be measured or carry an explicit written `reason`; otherwise exit 2 (INCONCLUSIVE). The assertion already exists in `load:drive:verify`; move it into the gate. |
| F-03 | **P1** | `backend/src/scripts/check-alert-ack.mjs:28` | A non-numeric `--max-age-hours` silently disables the staleness check | `Math.max(1, parseInt("abc",10))` is `NaN`, so `maxAgeMs` is `NaN` and `ageMs > NaN` is always false. Measured: the same 2-year-stale state file exits **1** with the default and **0** (`{"acked":true,"ackedAt":"2024-01-01…"}`) with `--max-age-hours=abc`. A templated or typo'd flag in a CI job turns the C174 gate green forever. | Parse strictly: reject a `NaN` result with exit 2 and a named error rather than folding it into `Math.max`. Same pattern in `--top=`, `--hours=`, `--threshold=` across the alert scripts. |
| F-04 | **P1** | `backend/src/scripts/production-ops-evidence.mjs:61` | Evidence capture's credential screen blocks 1 of 9 realistic secret shapes | `SECRET` matches only `key: value` / `key=value`. Measured: a Postgres URL with a password, a `hooks.slack.com` webhook URL, a PagerDuty routing key, `rediss://default:<pw>@…`, an `AKIA…` id, an AWS secret value, a bearer JWT and a PEM block all **pass**. An operator capturing RB-06 evidence that quotes the live `ALERT_WEBHOOK_URL` commits a working pager webhook into git, and the README told them capture would have caught it. | Reuse the backend's own detectors instead of a second weaker one: `redact.ts`'s `SENSITIVE_SUBSTRINGS`/`SENSITIVE_EXACT` plus `check-log-secrets.mjs`'s patterns, and add URI-credential (`scheme://user:pw@`), `AKIA[0-9A-Z]{16}`, `-----BEGIN …PRIVATE KEY-----`, JWT and known-webhook-host shapes. |
| F-05 | **P1** | `backend/src/scripts/alert-tenant-ctx-errors.mjs:110` | Detector reports "clear" on an empty log stream | `journalctl … \| alert-tenant-ctx-errors.mjs` after a unit rename, a log-rotation change, a container restart or journald retention expiry reads zero lines → `count=0` → `fired=false` → **exit 0**. The signal for SQLSTATE 42501 — the class that caused this project's tenant-context outage — is permanently green while the pipeline is broken. Measured; its three log-backed siblings all exit **2** with an explicit "unwired" message. | Add the same floor: if `linesRead === 0`, emit the sibling scripts' "window is empty or the log pipeline is unwired" message and exit 2. |
| F-06 | **P1** | `backend/Dockerfile:21` | Container HEALTHCHECK targets readiness, not liveness | `/health/ready` 503s whenever a **shared** dependency is down (`health.controller.ts:125-138`). Under Swarm/ECS/any restart-on-unhealthy runtime, one Postgres or Redis blip marks every container unhealthy simultaneously and restarts the whole fleet, amplifying a dependency outage into a total one. `health.controller.ts:117-120` states this exact rationale for keeping liveness shallow; the Dockerfile then wires the deep probe. | Point `HEALTHCHECK` at `/health` (liveness). Route `/health/ready` to the load-balancer/orchestrator readiness probe only, in the deployment manifest that F-21 says does not yet exist. |
| F-07 | **P1** | `backend/src/db/schema/common/feature-flags.ts:9`; `backend/src/scripts/check-feature-flag-governance.mjs:10` | The governed feature-flag table is inert; the live flags are ungoverned | `feature_flags` has `owner`, non-null `expires_at`, `rollout_percentage` and `org_overrides` — and **zero runtime consumers** across 3,663 files (only a cache key with no reader at `cache-keys.ts:170` and an invalidation namespace at `cache-invalidation-rbac-auth.ts:51`); **0 rows** in the live schema. The flags actually in use are six hardcoded AI enums in `organizations.settings` JSONB behind `PATCH /settings/feature-flags` (`settings.controller.ts:156`), with no owner, no expiry and no operator-level off switch. `check:feature-flag-governance` reads **one file** and asserts **two regexes** against the unused table and exits 0. So C176's "kill switches" is proven for nothing in scope: the only working switch (`autonomy_switches`) gates CRM autonomy, which is out of release scope. | Either implement a resolver over `feature_flags` and route the six settings flags through it, or delete the table and extend the gate to the mechanism that is live — asserting each live flag has an owner from `SLO_OWNERS`, a future `expires_at`, and a platform-scope override an operator can flip without a tenant admin. |
| F-08 | **P1** | `backend/src/scripts/alert-dispatch.mjs:15` | `workflow-stranded` has no dispatch-registry entry and cannot be paged | Measured: `alert-dispatch.mjs --alert-id=workflow-stranded` exits **2**, `Unknown alert id`. The detector exists, its self-test passes, `alert:workflow-stranded` is in `package.json` — but a fired alert has no owner, no severity and no runbook, and cannot reach `ALERT_WEBHOOK_URL`. This is the detector for stranded durable workflows, i.e. the recorded "cron tick 500s under RLS and nothing advances" incident. It is also absent from `INCIDENT-RESPONSE.md` §1.2. | Add `"workflow-stranded": { owner: "platform-reliability", runbookFile: FAILURE_RUNBOOK, runbookAnchor: "#workflow-stranded", severity: "critical" }` and the matching §1.2 row; add a `check-alert-system.mjs` assertion that every `alert-*.mjs` on disk has a REGISTRY entry and vice versa. |
| F-09 | **P1** | `backend/src/scripts/check-evidence-seal.mjs:126` | `check:evidence-seal` fails at head, and mis-diagnoses why | Measured exit **1**: 6 seals, 68/68 sealed files match, one BROKEN — `42-production-ops/data-catalogue-c183/artifact-hashes.json` reports `0/0 match` and calls all five sibling files "added to a sealed directory after the seal was written". That seal is not empty; it lists four artifacts as `{"artifacts":[{file,sha256}]}`. `manifest.hashes ?? manifest.files ?? {}` accepts only object maps and silently degrades an unrecognised shape to zero. An operator would re-seal instead of fixing the shape, and the same trap recurs. This is a seventh backend gate red at head, beyond the six named in the wave's sweep. | Reject an unrecognised seal shape explicitly (`unreadable: "unrecognised seal shape; expected hashes|files map"`) instead of defaulting to `{}`, and accept the `artifacts[]` array form that two producers already emit. |
| F-10 | **P1** | `backend/src/modules/cron/cron-lease.service.ts:41` (and `:53`) | The cron lease fails open — no dedup when Redis is unavailable or errors | With N replicas mid-rolling-deploy and a Redis blip, every replica runs every sweep concurrently: 30+ registered jobs including `email-outbox-flush`, `notification-outbox-flush`, `notification-digest-flush`, `org-purge-worker` and `payroll`-adjacent sweeps. C177 asks to prove duplicate safety during deployment/autoscaling; in this branch it does not hold. | Make the fail-open a declared, per-job policy rather than a global default: jobs whose effects are externally visible must refuse to run without a lease (return `{ran:false}` and alert), while idempotent read-only sweeps may proceed. Also renew the lease on long jobs — `withLease` never extends `windowSeconds`, so a sweep exceeding its window (e.g. `workflow-tick`'s 55s) is claimable by a second replica mid-run. |
| F-11 | P2 | `backend/src/common/logger/logger.service.ts:12` | Production log threshold is `warn`, dropping every `info`/`debug` line | In production `threshold()` returns `"warn"`, so `logger.info` never reaches the stream — including `"Shutdown drain complete — no requests in flight"` (`health.controller.ts:106`). An operator can observe a *failed* drain and never a successful one, and any request-level or workflow-progress telemetry emitted at `info` is invisible in the environment C173 is about. `LogSpanExporter` writes stdout directly and is unaffected. | Make the threshold configurable (`LOG_LEVEL`, defaulting to `info` in production) and move genuinely per-request chatter to `debug`, rather than muting a whole level. |
| F-12 | P2 | `backend/src/common/observability/release.ts:13` | `APP_RELEASE` is never set, so `release` is the literal `"unknown"` everywhere | Confirmed at head across both repos: the variable appears only in `.env.example:10` (blank), `env.validation.ts:38` (optional), the reader, its consumers and their tests. `Dockerfile` declares no `ARG`/`ENV`; no workflow exports it; the frontend has no `VERCEL_GIT_COMMIT_SHA`/`NEXT_PUBLIC_RELEASE` equivalent. "Which deploy caused this spike?" is unanswerable from logs, traces or error reports — a material gap for C173's release metadata and for `INCIDENT-RESPONSE.md` §5.3's timeline. Already self-reported by the prior wave; re-confirmed unfixed. | `ARG APP_RELEASE` / `ENV APP_RELEASE=$APP_RELEASE` in the Dockerfile's run stage, set from the commit SHA at build time, plus the same in whatever deploys the image, plus a `NEXT_PUBLIC_RELEASE` on the frontend. |
| F-13 | P2 | `backend/src/scripts/check-alert-system.mjs:8` | 2 of 14 alert detectors are covered by no gate, one by no script at all | `alert-retention-dead-man.mjs` is 437 lines with a 23-check self-test that passes, is a **critical** entry in the dispatch registry and a row in `INCIDENT-RESPONSE.md` §1.2 — and has **no `package.json` script and no place in `check-alert-system.mjs`**. `alert-workflow-stranded.mjs` has a script but no gate coverage. A regression in either is invisible to CI. | Derive `ALERT_SCRIPTS` from `readdirSync` over `alert-*.mjs` rather than a hand-maintained literal, and add `alert:retention-dead-man` + `:self-test` to `package.json`. |
| F-14 | P2 | `backend/.github/workflows/alerts.yml:61` | The daily alert-delivery workflow is green when the pager is unconfigured | When `ALERT_WEBHOOK_URL` is unset the check step emits `::warning`, every later step is skipped by `if:`, and the job **exits 0**. A permanently unconfigured pager shows a passing scheduled workflow indefinitely — the precise "webhook that 200s into a dead channel" failure `check-alert-ack.mjs` exists to prevent. The same shape is in `cell-daily-samples.yml:20-30` for `CI_APP_DATABASE_URL`. The `self-tests` job also runs only 7 of the 14 self-tests and never calls `check:alert-system` or `check:alert-ack`. | Fail the job (`exit 1`) when the secret is absent, or mark it `continue-on-error` with a required downstream status so "unconfigured" is visibly not "passing". Replace the seven hand-listed steps with one `pnpm check:alert-system`. |
| F-15 | P2 | `backend/src/scripts/run-cell-rollout.ts` | `--self-test` exits 1 (violation) instead of 2 (prerequisite) without `APP_DATABASE_URL` | Measured both ways: exit **1** with `ROLLOUT RUNNER FAILED: APP_DATABASE_URL is required` when unset, exit 0 with the local non-owner URL. In CI without that variable the canary-rollout gate reads as a *failure of canary rollout*, not a missing prerequisite — a direct violation of this project's own 0/1/2 convention. It is also not a pure self-test: it measures a real `generate_series 200k sort` against Postgres, so its numbers vary with host load. | Exit 2 with a named prerequisite when `APP_DATABASE_URL` is absent, and rename the flag (`--measure` vs `--self-test`) so a DB-dependent measurement is not labelled a self-test. |
| F-16 | P2 | `backend/src/scripts/production-ops-evidence.mjs:110` | `capturedAt` is documented as enforced and is not; `release.sha` is never resolved | `MANIFEST-INTAKE.md` lists `capturedAt` under "timestamps … Enforced by `production-ops-evidence.mjs`". `checksFor` never references it and `verify` never requires it, so a hand-authored `manifest.json` with correct hashes verifies identically to a captured one and the `capture` step is not on the required path. `release.sha` is only regex-shaped (`^[0-9a-f]{7,64}$`), never checked to name a commit that exists. | Require `capturedAt` to be a valid ISO timestamp in `checksFor`, and verify `release.sha` with `git cat-file -e <sha>^{commit}` (soft-fail with a named reason when the repo is unavailable). |
| F-17 | P2 | `backend/src/scripts/production-ops-evidence.mjs:165` vs `check-evidence-seal.mjs:50` | Two gates require and forbid the same filenames | `check-evidence-seal` requires files named `artifact-hashes.json` inside the evidence tree; `ops:evidence:check` parses every non-`*.input.json` `.json` under `42-production-ops/` as an evidence manifest. Four of six seals live there. At head the ops gate emits **11** spurious `wrong or missing evidence format` lines (documented as 7 and predicted to grow — it grew), burying the one real reason. MANIFEST-INTAKE's "never a bare `.json`" rule cannot be followed inside a sealed directory. | Scope `collectJson` to `RB-0N/` directories, or require manifests to be named `*.manifest.json`, and exempt `artifact-hashes.json` by name. |
| F-18 | P2 | `frontend/architecture-refactor/final-refactor/evidence/42-production-ops/deploy-safety/kill-switch-readpath-drill.ts:14` | Published drill hardcodes an absolute workstation path | `import postgres from "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/index.js"` — the deploy-safety README publishes a "Reproduce:" block that cannot run on any other machine or in CI. PRD-C015 explicitly requires removing absolute workstation paths and resolving both repositories from the workspace. | Import `postgres` by package name and run the drill with the backend as cwd, or resolve it through `check-repo-paths.mjs` like the other cross-repo scripts. |
| F-19 | P2 | `backend/src/common/observability/log-span-exporter.ts:26` | Span attributes are spread over the span's own fields | `...redactAttributes(span.attributes)` comes last, so an attribute keyed `name`, `status`, `traceId`, `spanId`, `latencyMs` or `message` overwrites the span field of the same name. `alert-p95.mjs` filters on `record.message === "SPAN"` and groups by `record.name`; `alert-seam-latency.mjs` reads `record.latencyMs` and `record.status`. A single mis-named attribute silently corrupts the p95 ranking and the seam-budget verdict with no error. | Nest attributes under an `attributes` key, or drop any attribute whose key collides with a reserved span field and count the drops. |
| F-20 | P2 | `backend/src/scripts/alert-tenant-ctx-errors.mjs:109` (also `alert-p95.mjs:184`, `alert-pool-saturation.mjs:239`, `alert-seam-latency.mjs:180`) | The whole log window is buffered into memory before scanning | `for await (const line of rl) allLines.push(line)` accumulates every line of the window before `scanLines`/`summarise` runs. At production volume, `journalctl --since "1 hour ago"` is hundreds of MB, and the alert process OOMs — so the alert that should fire during a high-volume incident is the one that dies. | Stream: accumulate only matched records (and per-endpoint latency arrays, already bounded by endpoint cardinality) instead of raw lines. |
| F-21 | P2 | (absent) — no deployment manifest in either repo | No orchestrator contract exists for the probes and drain the code implements | `terminationGracePeriodSeconds`, `readinessProbe`, `livenessProbe`, `preStop`: **0 occurrences repo-wide**. The default budget is `5,000 + 25,000 = 30,000ms` (`readiness.config.ts:69-70`) — exactly a Kubernetes default grace period, so SIGKILL would land the instant the drain window closes and `DrizzleModule.onApplicationShutdown` would never close the pool. Nothing declares that any orchestrator calls `/health` or `/health/ready` at all. C177's "during deployment/autoscaling" has no artifact to verify. | Commit the deployment manifest with `livenessProbe: /health`, `readinessProbe: /health/ready`, `terminationGracePeriodSeconds` ≥ `settling + drain + pool-close + margin` (≥ 45s for the defaults), and a `preStop` sleep covering the LB deregistration window. |

Out-of-scope, recorded not counted: `[mobile] /crm/inbox CLS p75 0.109 > 0.100` (the sole
`check:web-vitals-budget` violation) and 3 of the 18 `check:route-bundle-budget` breaches
(`/crm/inbox`, `/crm/leads`).

---

## 4. What head already gets right

These are load-bearing and should not be disturbed by the repair wave.

1. **The evidence gate is honest and fails for the right reason.** `ops:evidence:check` exits 1 with
   `missing passing deployed evidence` for all eight runbooks, its `--self-test` proves tamper
   detection bites (`alteredArtifactBlocked`, `selfTestClaimBlocked`), and both the README and
   `MANIFEST-INTAKE.md` state that this failure must never be waived. `FORBIDDEN` at `:60` makes
   local self-test output structurally inadmissible as deployed evidence — the single most valuable
   property in this ticket.
2. **Redaction genuinely runs on the hot path.** One chokepoint (`logger.service.ts:36`) installed
   process-wide at `main.ts:75`, covering the framework's own output and ~70 module loggers, with
   23 key substrings + 18 exact names, tenant content withheld alongside credentials, and Drizzle's
   two leak carriers (`params`, `driverDetail`) plus the bind values it embeds in the message string.
   `check:log-secrets` (3,663 files, exit 0) cross-checks gate against redactor so they cannot drift.
3. **Graceful drain is correct and was proven with a live SIGTERM**, not a unit test: readiness fails
   first, traffic is served through the settling window, the in-flight request is answered, the
   process exits by re-raised SIGTERM at t=3650ms. `shutdownGate` sits ahead of routing so a refused
   request never takes a connection.
4. **Outbox lease fencing is right** (`outbox-publisher.service.ts:221-274`), including the
   `isNull` branch for a null prior lease, and the drill proves both directions: the zombie is fenced
   (0 rows) and the live lease-holder still completes (1 row).
5. **Three of four log-backed detectors fail closed on an empty window** with an exit 2 and a message
   naming the likely cause. That is the anti-vacuity discipline this project needs, applied
   correctly — F-05 is the one that was missed, not the rule.
6. **The alert dispatch payload carries what an on-call needs**: `alertId`, `owner`, `severity` and a
   resolvable `runbook` anchor on every dispatch, with per-breach fingerprint dedup and a suppression
   window.
7. **`INCIDENT-RESPONSE.md` refuses to invent humans.** Every rota slot, contact and provider account
   is `[HUMAN REQUIRED]` and blank, with the reason stated: "a rota with an invented name in it is
   worse than no rota". Ownership is sourced from `SLO_OWNERS` in code and build-enforced rather than
   re-declared in prose.
8. **The cost model refuses rather than extrapolates** — eight distinct `REFUSED` paths, integer
   milli-credits for the AI ledger, and explicit `UNMEASURED without vendor API credentials`.
9. **The web-vitals gate rejects a dev-server measurement outright** (`:651`), keeps a recorded
   exception from erasing a failure, and judges each route on its own so twelve quiet routes cannot
   dilute one bad one. Every in-scope route passes every budget.
10. **`check-evidence-seal.mjs` has real anti-vacuity floors** (`MIN_SEALS = 2`,
    `MIN_SEALED_FILES = 20`) and three bite-proven failure modes, and its `DECLARED_UNSEALED` list
    fails on a stale entry so it cannot rot into a blanket exemption.
11. **The prior wave's own evidence documents are trustworthy.** `RB-05-…-NOT-deployed-evidence.md`
    and `RB-07-…-NOT-deployed-evidence.md` are named for what they are not, are deliberately `.md` so
    the gate cannot mistake them for manifests, and record `Operator: unattested — executed by an
    automated agent`. Everything I re-ran from them reproduced.

---

## 5. Blocked on infrastructure or a named human

| Blocked item | Criteria | Blocker |
|---|---|---|
| Deployed cell: `environment.name/region/cell/target`, `release.sha`, `release.topologySha256`, `dataset.activeOrganizations`, execution timestamps | C175, and every RB-01…RB-08 manifest | No deployed StreamlineOS environment; the configured `DATABASE_URL` is a shared Neon branch, not a cell |
| `ALERT_WEBHOOK_URL` to a real pager + a human entering the drill nonce | C174 (`live-alert-delivery`, `human-acknowledgement`) | Paging-provider account (`INCIDENT-RESPONSE.md` §7) + a person |
| Colocated load runner + seeded 100,000-member envelope fixture | C166, C167 | No same-region runner; `.load-driver-results.json` has never been produced |
| Neon / Upstash / Cloudflare R2 / Resend billing API keys; ≥3 well-spaced samples from a populated cell | C172 | Vendor credentials; `CI_APP_DATABASE_URL` secret unset |
| `operator-capacity-approval`, `operator.name`/`approvedAt` | C172, C175 | Human attestation; no agent may supply it |
| Two deployed replicas behind a load balancer; an orchestrator | C176 (rolling deploy, real canary abort, rollback/forward-fix), C177 (autoscaling) | No deployed topology; and F-21 — no manifest declares one |
| A trace collector endpoint; log shipping to an aggregator; `APP_RELEASE` from a build pipeline | C173 | Deployment decision (the exporter port exists and is wired) |
| A named reference device, and a Product acceptance decision for the landing animation | C165 | Hardware + a named Product approver; no decision record exists under `architecture-refactor/decisions/` |
| A deployed private bucket, **and a storage-URL backfill script that does not exist** | C010 | Infrastructure *plus* missing code — see §2 C010 |
| A second provisioned cell database with an organization placed in it | C176 (`cell:degraded`, full `cell:rollout`) | No second cell |

**Everything else in this report was measured on this machine at head.** Where I did not measure, I
have said NOT MEASURED and named what would measure it.

---

## 6. Verdict

**partially-met.** Ten of eleven criteria are PRD-deferred and cannot be closed from a repository;
C178 is met as published procedure with one 2-of-14 coverage gap. The machinery is unusually good
and unusually honest — but four gates return exit 0 over inputs that prove nothing (F-02, F-03,
F-05, F-07), one gate is red at head for a mis-diagnosed reason (F-09), one correctness defect is
reproduced and unfixed in the workflow lease path (F-01), and the single deployment artifact that
does exist wires the wrong probe (F-06). Those seven should be repaired before any deployed run,
because each one would make a deployed run report a result that is not true.
