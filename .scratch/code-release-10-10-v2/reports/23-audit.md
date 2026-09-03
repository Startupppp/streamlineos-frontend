# 23 — Observability and asynchronous reliability — AUDIT AT HEAD

**Backend** `streamlineos-backend` @ `138709f35befcd558c86ab04f65edf8344f6a545` (branch `release/code-10-10-v2`, 2026-09-03 21:51 IST)
**Frontend** `streamlineos-frontend` @ `7469d27895add587f9427e7c50c457f56e0048bf` (same branch)
**Prior audit** `23-observability-async-reliability.md`, taken at backend `591cf663`. **13 commits have landed since.**
**Mode** READ-ONLY. This file is the only write. No source file was edited.

Criteria: PRD-C082, C083, C084, C102, C136, C146, C147.

---

## 0. Relationship to the prior audit

The prior audit is good and I did not repeat it. I re-verified its live claims at head and then pushed into
what its own §5 named as **"Not run"** or **"Not independently verified"**: C082 entirely, C136's
circuit-breaker / retry-bound / credential-isolation / failure-mode limbs, C146 beyond three sampled sites,
and C147's per-tenant limb.

| prior claim | status at head | evidence |
|---|---|---|
| 45 provider-in-transaction handlers | **HOLDS — still exactly 45** | `check:placement-bypass` → `grep -c "SKIP  \[provider-in-transaction\]"` = 45 |
| `check:placement-bypass` exits 1 | **CHANGED — now exits 0** | re-run at head, `EXIT=0`, "OK — every database bypass is on the allowlist with a reason" |
| `crm-mailbox.service.ts:341` leaks a mailbox address at `warn` | **HOLDS, unfixed** | `sed -n '340,342p'` — `` `sweep failed for ${row.mailboxAddress}: ${message}` `` |
| `notification-email.provider.ts:55` recipient+title at `debug` | **HOLDS, unfixed** | line 55 verbatim; `debug` is dropped in production (`logger.service.ts:11-13`) |
| `support-kb-gap.service.ts:94` logs `quota_exceeded` at `error` | **HOLDS, unfixed** | lines 93-97 |
| redactor = 23 substrings + 18 exact | **HOLDS** | `check:log-secrets` self-report at head |
| 245 `@Idempotent` / 11.5 % of mutating handlers | **HOLDS — 245 / 2,134 = 11.5 %** | my own census, below |
| `check:idempotent-commands` enforces over ~11 | **WORSE THAN STATED — enforces over 0** | 546 controllers scanned, **11 in scope, all 11 excused** |
| `check:log-secrets` enforced population 0/690 | **HOLDS** | exit 0, 3,650 files, same vocabulary |

The two commits that claimed C147 progress since the prior audit — `41dfe5b5d` and `ccd31ad23` — did not
reduce the count. `41dfe5b5d` ("release the connection on six more provider-in-transaction handlers")
**touches only `src/scripts/check-placement-bypass.mjs`** (`git show --stat`: 1 file, 8 insertions); the
source changes were already in the prior audit's own working tree. The number is 45 before and 45 after.

---

## 1. What I read, with numbers

### Backend corpus
| quantity | count |
|---|---|
| `.ts` files under `src/` | 5,718 |
| …excluding specs | 3,797 |
| `*.controller.ts` (non-spec) | 550 |
| `*.service.ts` (non-spec) | 1,078 |
| module folders under `src/modules/` | 76 |
| subsystem folders under `src/common/` | 38 |
| non-spec files: `src/modules` / `src/common` / `src/db` / `src/health` | 3,056 / 230 / 365 / 8 |
| HTTP handlers (from `check:authz-deny`) | 3,631 · authorization-gated 3,235 |
| mutating handlers (`@Post`/`@Put`/`@Patch`/`@Delete`) | 2,134 (1,310 / 29 / 465 / 330) |
| OpenAPI operations (live document) | 3,642 |
| outbox consumers (`implements OutboxEventConsumer`) | 25 |
| declared / emitted / registered outbox event types | 29 / 24 / 29 |
| `forEachOrg(` call sites (non-spec) | **84** |
| `callProvider(` call sites (non-spec, product code) | **3** |
| raw `fetch(` sites in app code (non-spec, non-scripts) | 20 across 18 files |
| tables in `scratch_head_1010` | 944 |

### Files opened in full or in load-bearing part (35)
`common/outbound/{call-provider,provider-circuit-breaker,safe-webhook-transport}.ts` ·
`common/outbox/outbox-publisher.service.ts` · `common/tenant/{for-each-org,tenant-db,with-tenant,run-in-tenant-transaction,tenant-context}.ts` ·
`common/admission/{admission.guard,admission.service,admission.config,admission-slot,work-class,admission.interceptor}.ts` ·
`common/ratelimit/{rate-limit.guard,rate-limit.service,rate-limit-coverage.spec}.ts` ·
`common/observability/redact.ts` · `common/logger/logger.service.ts` ·
`db/{pool.config,pool-admission}.ts` · `health/{health.controller,dependency-checks,readiness.config}.ts` ·
`modules/storage/{media-transform.runner,storage.controller}.ts` ·
`modules/billing/payments/adapters/razorpay.adapter.ts` ·
`modules/{webhooks/webhooks-dispatch,build/core/projects-webhooks-dispatch}.service.ts` ·
`modules/expenses/expense-outbox.consumer.ts` · `modules/finance/reports/{finance-report-export.consumer,finance-report-export-worker.service}.ts` ·
`modules/ingress/adapters/crm-mailbox.service.ts` · `modules/notifications/providers/notification-email.provider.ts` ·
`modules/support/kb-gap/support-kb-gap.service.ts` · `modules/ai/core/providers/llm.service.ts` ·
`scripts/{check-placement-bypass,check-module-entitlement,check-module-gate,check-record-access,check-scope-application,check-unbounded-reads,check-cache-key-shapes}.mjs`

### Frontend
6 files carrying correlation vocabulary; `lib/api-client.ts` opened; the four other fetch wrappers
(`portal-api-client.ts`, `public-fetch.ts`, `server-fetch.ts`, `features/notifications/notification-event-stream.ts`) opened at their header-building lines. 18 files issue raw `fetch(` outside `api-client.ts`.

### Gates run (20) — every exit code recorded
```
check:placement-bypass         EXIT 0   147 SKIPs · 45 provider-in-transaction · 45 no-tenant-transaction
check:route-classification     EXIT 0   UNDECLARED 0
check:module-entitlement       EXIT 0   ** 1 module (timesheets) of 76 **
check:module-gate              EXIT 0   391 of 550 controllers, 22 of 76 module folders (floor CONTROLLER_MIN=200)
check:record-access            EXIT 0   1,192 findFirst · 591 record reads · soft-delete only
check:scope-application        EXIT 0   150 scope resolutions / 150 applied
check:authz-deny               EXIT 0   3,235 gated handlers · 924 with a deny test (29%) · ** 2,311 uncovered, ratchet 2,441 **
check:permission-keys          EXIT 0   704 backend keys == 704 frontend union
check:unbounded-reads          EXIT 0   2,301 service files, ** src/modules ONLY ** · 750 raw · 3 actionable
check:n1-growing-loops         EXIT 0   2,161 service files · 97 growing sites (ratchet 102)
check:idempotent-commands      EXIT 0   546 controllers · ** 11 in scope, 11 excused, 0 enforced **
check:fire-and-forget          EXIT 0   3,663 files · tier1 0 · tier2 255 (ratchet 279) · 56 registerAfterCommit
check:outbox-consumers         EXIT 0   216 modules / 1,209 providers · 24 emitted, all registered
check:transaction-callbacks    EXIT 0   2,114 specs · 481 doubles · 270 invoking · VOID 2
check:cache-invalidation       EXIT 0   1,076 service files · 187 write / 475 invalidate sites
check:cache-key-shapes         EXIT 0   ** no output at all — it is a library for check-cache-invalidation, not a gate **
check:bulk-id-limits           EXIT 0   3,384 schema files, no unbounded id arrays
check:bounded-contracts        EXIT 0   4 violations, all inventory (out of scope) → in-scope 0
check:envelope-consistency     EXIT 1   ** 6 violations, 4 in scope **
check:compression              EXIT 0   middleware detected
check:route-budgets            EXIT 0   ** 92/3,642 ops carry a budget (2.5%); 43 of 67 cron batches undeclared; BatchSize 0/22, DurationMs 0/22 **
check:openapi-coverage         EXIT 0   ** response schemas 25/3,642 = 0.69% — the gate says "NOT A PASS FOR THIS RULE" and exits 0 **
check:tenant-isolation         EXIT 0   static only; execution proof is check:tenant-isolation:run (NOT RUN)
check:log-secrets              EXIT 0   3,650 files · 23 substrings + 18 exact
```

### Measurements I took myself
- **Per-tenant transaction floor**, `scratch_head_1010` on localhost: 200 real `BEGIN; SELECT set_config(×5); COMMIT;` round trips = **161 ms → 0.81 ms per org**. In-process GUC-only cost (no round trip) = 0.012 ms. So ~98.5 % of the cost is round trips: 3 per org. On a Neon endpoint at 10 ms RTT that is ≈30 ms per org.
- `outbox_events` catalog inspected: `correlation_id` column present, RLS `tenant_isolation` policy present, claim indexes `(delivery_state, lease_expires_at, created_at)` and `(organization_id, delivery_state, occurred_at)`.

---

## 2. Per-criterion assessment

### PRD-C082 — module, permission, tenant, record and DataScope checks at the correct seam
**PARTIALLY MET.** The prior audit did not derive this at all; here it is, dimension by dimension.

The seam is real and layered — `app.module.ts:206-210` registers five `APP_GUARD`s in order:
`RouteClassifierGuard` → `JwtAuthGuard` → `AdmissionGuard` → `MfaGuard` → `ModuleGuard`, with
`PermissionGuard` (`src/modules/access/permission.guard.ts`) applied per route. 11 guard classes exist.

| dimension | enforced? | gate | reach measured |
|---|---|---|---|
| **module** | yes, via `@RequireModule` + `ModuleGuard` | `check:module-gate` | **391 of 550 controllers, 22 of 76 module folders.** 159 controllers sit outside any registry folder and get no module check. Has a vacuity floor (`CONTROLLER_MIN=200`) — good. |
| **module entitlement** (plan gating) | yes at runtime | `check:module-entitlement` | **1 module.** `PILOT_MODULE = "timesheets"` hard-coded at `check-module-entitlement.mjs:7`; the file is 90 lines, most of it self-test. It exits 0 having checked 1 of 76 modules. This is the gate-corpus shape. |
| **permission** | yes, `@RequirePermission` + catalog | `check:permission-keys` | **704 keys, backend catalog == frontend union.** Strong. |
| **permission is not inert** | — | `check:authz-deny` | **924 of 3,235 gated handlers (29 %) have a deny test. 2,311 do not.** The gate passes because `uncoveredRatchet = 2,441` is a ratchet, not a floor. It is also explicitly static ("proves a deny test EXISTS… does not run it"), and attribution is per spec *file*, not per `it()`. So the true enforced number is ≤ 924. |
| **tenant** | yes, RLS + `withTenant` GUCs | `check:tenant-isolation` (static), `check:tenant-relationships` | Static gate passes. **`check:tenant-isolation:run` — the execution proof the gate itself names as required — NOT RUN.** |
| **record** | **NOT GATED** | `check:record-access` | The gate's own header (`check-record-access.mjs:1-13`) says it answers one question only: "A record fetched by id must not be able to be a deleted one." It is a **soft-delete** gate. "The tenant half is reported by `--tenant`, **not gated**." No gate anywhere asserts that a per-record authorization decision is made at the right seam. 1,192 `findFirst` calls / 591 record reads scanned, all for soft-delete. |
| **DataScope** | yes where resolved | `check:scope-application` | **150 resolutions, 150 applied — but only 25 `scopeFor(` call sites exist and only 150 handlers of 3,235 gated ones (4.6 %) resolve a scope at all.** The gate's header is honest about the direction: it "finds handlers that resolve the caller's DataScope and then never spend it." A handler that *should* have resolved a scope and never did produces no finding. The denominator is unmeasured. |

**Systemic reach defect (my finding, F7):** five of the data-access gates scan `src/modules` **only**:
`check-unbounded-reads.mjs:30` (`ROOT = new URL("../modules")`), `check-n1-growing-loops.mjs`,
`check-db-call-count.mjs`, `check-record-access.mjs:25` (`MODULES_DIR`), `check-scope-application.mjs:20`.
`src/common/` — **230 non-spec files holding the entire asynchronous substrate**: the outbox publisher, the
per-tenant fanout, pool admission, the admission guard, the cache, the outbound adapter — and `src/db/`
(365 files) are outside their corpus. Every one of ticket 23's seven criteria concerns behaviour that lives
mostly in `src/common/`. This is why the findings in §3 are invisible to a green gate sweep.

### PRD-C083 — transactional, idempotent, concurrent-retry-safe writes; after-commit/outbox; never a dead request transaction
**NOT MET.** Three of the four limbs fail, each with a concrete instance.

- **Transactional** — met. `TenantContextInterceptor` wraps every request in one `withTenant` transaction
  (`with-tenant.ts:144-155`, `regional.transaction(...)` with `SET LOCAL` GUCs and a write fence).
- **Concurrent-retry-safe** — met *for the outbox*. `outbox-publisher.service.ts:141-158` claims with
  `for update skip locked`, `limit ${remaining}`, and a lease. This is correctly built.
- **Idempotent** — **NOT MET.** 245 of 2,134 mutating handlers carry `@Idempotent` (**11.5 %**), and
  `check:idempotent-commands` scans 546 controllers, finds **11 handlers in scope, and excuses all 11**.
  Its enforced population is **zero**. It prints "OK — every in-scope mutating handler carries `@Idempotent`"
  over an empty set. (Finding F8.)
- **After-commit / outbox, never a dead request transaction** — **NOT MET.** Findings **F3** (a raw
  `void this.run(...)` that writes on a committed transaction, 7+ product callers) and **F1** (every outbox
  consumer's `handle()` runs inside a tenant transaction that spans a provider round trip). `registerAfterCommit`
  exists and is used at 56 sites; the webhook dispatcher does not use it. `check:fire-and-forget` reports
  183 floating promises + 72 swallowed rejections at tier 2 against a ratchet of 279 — a ratchet, not a floor;
  23 of the 51 `void this.<m>(` call sites reach a method whose body touches `this.db` or a transaction.

### PRD-C084 — minimal response projections, redaction, generic errors, resource limits, stable HTTP semantics
**PARTIALLY MET.**

- **Generic errors / redaction** — met, and well built. Confirmed at head: one envelope in
  `all-exceptions.filter.ts`; 4xx `HttpException` falls through with no log and no error report; query
  *values* discarded and only parameter names kept. `redact.ts` still 23 substrings + 18 exact names, with
  `truncateForLog` as the single string chokepoint and `scrubBindParameters` for Drizzle's `Failed query:` shape.
- **Minimal response projections** — **NOT MET, and the gate says so.** `check:openapi-coverage`:
  **25 of 3,642 operations declare a response body schema — 0.69 %.** The gate prints
  *"NOT A PASS FOR THIS RULE — 0.69 % of the response contract is declared. This gate is green because the
  debt did not GROW, not because the contract is covered"* and **exits 0**. Request schemas are 1,386/1,386
  (100 %) and 4xx `$ref`s are 3,642/3,642 (100 %) — the request half is arbitrated, the response half is not.
- **Resource limits** — **PARTIALLY MET.** `check:bulk-id-limits` is clean over 3,384 schema files and
  `check:bounded-contracts` has 0 in-scope violations. But my own scan of 367 `*.schemas.ts` / `*.dto.ts` files
  found **439 `z.array(` properties, 153 with a `.max()`, 286 without** (ai 69, hr 52, crm 51, inventory 28,
  build 17). Many of the 69 in `ai/` are LLM *output* schemas — which is C136's "schema-validated provider
  responses": validated for shape, unbounded in size, so a runaway completion is parsed into memory whole.
- **Stable HTTP semantics** — **NOT MET.** `check:envelope-consistency` **exits 1** with 6 violations, of
  which **4 are in scope**: `GET /me/inbox`, `GET /notification-templates`, `GET /notifications`,
  `GET /sign/envelopes` answer with a bare array instead of the pagination envelope (2 are inventory,
  out of scope). This is one of the 6 known backend gate failures under repair in a concurrent wave.

### PRD-C102 — structured, redacted, tenant-safe logs, metrics and trace context across eight boundaries
**SUBSTANTIALLY MET on the backend; three known leaks unfixed; the trace does not start at the browser for four entry classes.**

The prior audit's §1 is correct and I re-verified its load-bearing claims at head — the logger, the redactor's
two lists, the message-path chokepoint, the production `warn` threshold, the eight-boundary table and its
enforcing spec (`trace-boundary-coverage.spec.ts`). I am not repeating it. What I add:

- **The three leaks are all still present at head** (F9, F10, F11 below), unchanged.
- **The frontend half is incomplete (F12).** Only `frontend/lib/api-client.ts:181-184` mints and sends
  `x-correlation-id` (and calls `noteCorrelationId` so a browser error report can be joined to server logs).
  Four other request paths issue backend calls with **no** correlation header:
  `lib/portal-api-client.ts:93-101`, `lib/public-fetch.ts:69,88`, `lib/server-fetch.ts:20-28`, and
  `features/notifications/notification-event-stream.ts:26-27` (the SSE stream — an asynchronous boundary
  C102 names explicitly). 18 frontend files issue raw `fetch(` outside `api-client.ts`.
- **A metric that reports a number bounding nothing (part of F6).** `AdmissionService.snapshot()`
  (`admission.service.ts:59-65`) reports `maxConcurrent: 200`. The actual admission ceilings are **160**
  (ordinary-write, from `sheddingThreshold(5)` = `floor(floor(200×0.8)×6/6)`) and **400** (reserved classes,
  which skip the shedding threshold and face only `maxQueueDepth`). 200 is neither.
- **A readiness signal that can never fire (F6).** See below.

### PRD-C136 — shared-adapter evidence across nine dimensions
**NOT MET.** The prior audit verified observability and SSRF and explicitly did not verify the rest. Here is each limb.

| limb | verdict | evidence |
|---|---|---|
| tenant-safe interfaces | partial | webhook breakers key on `webhook:${endpoint.id}` / `build-webhook:${endpoint.id}` — tenant-scoped. Razorpay keys on the global string `razorpay-orders` while credentials are per-tenant (`razorpay.adapter.ts:96 configure(credentials)`). |
| bounded retries | yes | `callProvider` loops `attempt <= descriptor.maxAttempts`; full-jitter backoff at `call-provider.ts:38-47` with a documented anti-thundering-herd rationale. |
| timeouts | yes | `wrapWithTimeout` at `:53-64`, per attempt. |
| circuit breakers | **built, but mis-wired — F5, F6** | terminal (4xx) failures count toward the breaker; the shared breaker is never fed. |
| idempotency | **no** | 11.5 % of mutating handlers; gate enforces over 0. |
| backpressure | **no at the provider seam** | 45 handlers still hold a pooled connection across a provider call; see C147. |
| schema-validated provider responses | partial | razorpay does `razorpayOrderResponseSchema.parse(data)` and `razorpayOrderErrorSchema.safeParse` — correct. The AI output schemas are validated but **unbounded** (69 uncapped arrays in `ai/core/dto/`). |
| cache / credential isolation | partial | breaker state is process-local by design and documented; credentials are per-tenant, but the breaker key that guards them is not. |
| observability | yes | span per **attempt** (`:117-127`), `traceparent` + `x-correlation-id` injected (`:93-100`). |
| failure-mode tests | yes for the adapter | `call-provider.spec.ts` covers open/half-open/cooldown and "terminal is NOT retried". **No spec asserts whether a terminal failure counts toward the breaker** — so F5 is unspecified behaviour, not a deliberate choice. |
| **removal of duplicate provider-specific policy from product modules** | **NOT DONE — F13** | **3** `callProvider` call sites exist in the whole tree. Against that, product modules run their own policy against raw `fetch`: `hr/automations/hr-webhooks.service.ts:32-33` has its own `backoffMs(attempt)` (`min(60min, 2^attempt × 60s)`); `inventory/webhooks/webhook-emitter.service.ts:94-129` has its own `AbortController` + 10 s timeout + attempt counter; plus `automation/automation-webhook.service.ts:67-75`, `crm/automation-studio/crm-automation-runner.service.ts:234-238`, `chat/chat-link-preview.controller.ts:38-40`, `hr/automations/hr-automation-actions.service.ts:135-139`, `common/security/turnstile.service.ts:41-46`, `common/security/virustotal-av-scanner.ts:39-43`. Eight independent timeout constants and two independent retry policies. Each is SSRF-guarded (`checkWebhookUrl`) — that limb is genuinely centralised — but none is circuit-broken, traced, or observable through the shared seam. |

### PRD-C146 — move CPU/IO-heavy work off request threads; return a durable job/status contract promptly
**PARTIALLY MET — the pattern exists and is excellent where applied; adoption is partial.**

**What is right, and is the reference implementation:** `modules/storage/storage.controller.ts:120-208`.
Validation → magic-byte check → **capacity check before any expensive work** (`transforms.hasCapacity()`,
:142) → quota → AV scan → `planUpload` → durable `quarantineId` row → `registerAfterCommit(enqueue)` →
returns `{ quarantineId, status: "pending_scan", key, mimeType, size, sha256 }` **immediately**. The
compression runs in `MediaTransformRunner` (`media-transform.runner.ts`) under three real bounds:
`MAX_CONCURRENT=2`, `MAX_QUEUED=32` with submission **refused** past that, and `JOB_TIMEOUT_MS=60_000` with
compensation on expiry and `drain()` on shutdown. Its header states the tradeoff honestly ("an unbounded
queue of detached promises is a worse failure than doing the work inline").

**Durable job/status contract:** 13 per-module job tables exist — `finance_report_export_jobs`,
`kb_import_jobs`, `kb_export_jobs`, `inv_import_jobs`, `inv_export_jobs`, `gdpr_export_jobs`,
`hr_import_jobs`, `hr_export_jobs`, `payroll_run_export_jobs`, `expense_export_jobs`, `sign_bulk_send_jobs`,
`ai_jobs`, `timesheet_exports`. There is **no single shared job contract**; each module re-implements
claim/progress/complete/fail. `FinanceReportExportRequestedConsumer.handle` (`:17-20`) is the correct shape —
it only calls `worker.wake()` and returns, so the export never runs on the consumer's transaction.

**What is still on a request thread**, from the 45-site provider-in-transaction set:
- `support/core/support-kb.controller.ts:294` `reindexAll` — re-indexes an entire corpus (embed batches through `AiGatewayService.embedBatchWithCredit`) on a request thread.
- `kb/wiki/kb-media.controller.ts:30` and `kb/wiki/kb-sources.controller.ts:48` `upload` — blob fetch + parse + embed inline. These do **not** go through `MediaTransformRunner`; `kb-media.service.ts:104` calls `avScanner.scan` directly with no capacity check.
- `feedbucket/feedbucket-public.controller.ts:335` — **unauthenticated**, reaches `AiGatewayService.invokeStructuredWithImageWithUsage`. It *does* check `transforms.hasCapacity()` at :219 for media, but the AI path has no such check.
- `MediaTransformRunner` is used by exactly 3 controllers (`storage`, `storage-onboarding`, `feedbucket-public`); 47 other modules with heavy paths do not.

### PRD-C147 — connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure
**NOT MET.** Each named limb, with its number.

| limb | mechanism | number | verdict |
|---|---|---|---|
| **connection pool** | `db/pool-admission.ts` — a gate *in front of* the driver, because postgres-js has no acquire timeout and pushes onto an unbounded FIFO (`:5-21`, correct and well-reasoned) | `max` = **10** direct Neon / 20 pooled / 5 dev (`pool.config.ts:177`); queue = `max × 4` = **40**; acquire timeout **5,000 ms**; sheds with `PoolSaturatedError` 503 + `Retry-After` | **met in mechanism** |
| **worker concurrency** | `MediaTransformRunner` | 2 concurrent / 32 queued / 60 s deadline | **met for media; nothing else has one** |
| **queue** | outbox publisher | `BATCH_SIZE = 50`, `for update skip locked`, lease | bounded **per tick**, but **starves by org id** (F2), and the tick pays N transactions regardless (F4) |
| **provider** | circuit breaker + per-attempt timeout | threshold 5, cooldown 120 s; LLM 30 s fast / 60 s standard + retries | **breaker mis-wired** (F5, F6); **45 handlers hold a connection across the call** |
| **per-tenant** | `AdmissionGuard` (`APP_GUARD`, `app.module.ts:208`) → `AdmissionService.tryAdmit(workClass, orgBucket)` | `ADMISSION_ORG_MAX_CONCURRENT = 50` | **exists but is not a fairness bound — F6** |

**The arithmetic that makes C147 fail.** Take a production direct-Neon deployment at defaults:

```
DB pool                 max 10 connections + 40 queued  =  50 total capacity
ADMISSION_ORG_MAX_CONCURRENT                            =  50      <-- exactly the whole pool
ADMISSION_MAX_CONCURRENT (reported by snapshot())       = 200      <-- 4x the pool; bounds nothing
  real ceiling, ordinary-write  floor(200*0.8*6/6)      = 160
  real ceiling, reserved classes (maxQueueDepth)        = 400
LLM per-attempt timeout                    30,000 ms fast / 60,000 ms standard, plus retries
idle_in_transaction_session_timeout                     = 60,000 ms   <-- equal to the standard timeout
acquire timeout                                         =  5,000 ms
```

- One tenant at its own admission ceiling (50) consumes **100 %** of the process's database capacity. The
  per-org limit and the pool were sized independently and never reconciled.
- **11 concurrent AI requests exhaust the pool** on a direct endpoint, because 45 handlers hold their
  connection across the provider call. Requests 12–51 queue and are killed after 5 s. One slow provider takes
  every unrelated route down in five seconds.
- A standard-tier LLM call that runs its full 60 s sits exactly on the 60 s idle-in-transaction kill line —
  the outcome is a coin toss.
- `pool.config.ts:255-257` already names this in prose. The code knows; 45 handlers still do it.
- **The rate limiter has no tenant dimension at all**: `rate-limit.guard.ts:30` keys on
  `req.user?.userId ?? clientIp` and `rate-limit.service.ts:188` builds `rl:${tier}:${identifier}` —
  no `orgId`. 115 `@UseRateLimit` sites of 3,631 handlers (3.2 %); `rate-limit-coverage.spec.ts:1-27`
  documents this as deliberate and points at admission as the ambient layer, which is fair — but admission's
  per-org number is the one in the table above.
- **43 of 67 scheduled batches carry no ceiling of any kind**, and even the 22 that declare one have
  `BatchSize 0/22 · DurationMs 0/22` measured (`check:route-budgets`). 92 of 3,642 operations (2.5 %) carry
  a budget at all. The gate exits 0 and calls itself "PARTIAL".

---

## 3. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F1 | **P1** | `src/common/outbox/outbox-publisher.service.ts:190` | Every outbox consumer's `handle()` runs inside a tenant transaction that spans a provider round trip — invisible to `check:placement-bypass` |
| F2 | **P1** | `src/common/outbox/outbox-publisher.service.ts:137-141` | Outbox batch claim starves tenants by ascending org id |
| F3 | **P1** | `src/modules/webhooks/webhooks-dispatch.service.ts:119-123, :152` | Detached webhook dispatch writes on a committed request transaction |
| F4 | **P1** | `src/common/tenant/for-each-org.ts:157-161, 168-205` | `forEachOrg` is an unbounded, deadline-free, non-resumable per-tenant fanout at 84 call sites |
| F5 | **P1** | `src/common/outbound/call-provider.ts:134` | A terminal (4xx) provider failure counts toward the circuit breaker; razorpay's key is process-global across tenants |
| F6 | **P1** | `src/health/health.controller.ts:80` | The readiness provider check reads a breaker nothing writes — it can never report a provider down |
| F7 | **P1** | `src/scripts/check-unbounded-reads.mjs:30` (+4 gates) | Five data-access gates scan `src/modules` only; `src/common/` (230 files, the whole async substrate) is outside every corpus |
| F8 | P2 | `src/scripts/check-idempotent-commands.mjs` | The idempotency gate enforces over 0 handlers (11 in scope, 11 excused) while 88.5 % of mutating handlers are unfenced |
| F9 | P2 | `src/modules/ingress/adapters/crm-mailbox.service.ts:341` | Customer mailbox address logged at `warn` — clears the production threshold (**unfixed since prior audit**) |
| F10 | P2 | `src/modules/support/kb-gap/support-kb-gap.service.ts:94` | `quota_exceeded`, an expected billing outcome, logged at `error` (**unfixed**) |
| F11 | P2 | `src/modules/notifications/providers/notification-email.provider.ts:55` | Recipient address + notification title in a `debug` message string (**unfixed**; dropped in production) |
| F12 | P2 | `frontend/lib/portal-api-client.ts:93`, `lib/public-fetch.ts:69`, `lib/server-fetch.ts:20`, `features/notifications/notification-event-stream.ts:26` | Four request classes reach the backend with no `x-correlation-id`; only `lib/api-client.ts:181` sets one |
| F13 | P2 | `src/modules/hr/automations/hr-webhooks.service.ts:32` (+7 sites) | Duplicate provider-specific retry/timeout policy in product modules; 3 `callProvider` call sites tree-wide |
| F14 | P2 | `src/scripts/check-placement-bypass.mjs:395-421` | 4 dead excuses in `PROVIDER_IN_TRANSACTION_ALLOWLIST` — the file's own comment forbids exactly this |
| F15 | P2 | `src/modules/storage/media-transform.runner.ts:23,63,72` | No per-tenant share of the 32-slot transform queue; `job.orgId` is captured and used only in log lines |
| F16 | P2 | `src/scripts/check-module-entitlement.mjs:7` | Module-entitlement gate is a one-module pilot covering 1 of 76 modules |
| F17 | P2 | `src/scripts/check-authz-deny.mjs` | 2,311 of 3,235 authorization-gated handlers have no deny test; the gate is a ratchet at 2,441, not a floor |
| F18 | P2 | `src/modules/notifications/notifications.controller.ts` + 3 others | 4 in-scope endpoints answer with a bare array — `check:envelope-consistency` exits 1 |

### F1 — P1 — `src/common/outbox/outbox-publisher.service.ts:190`
```ts
private async deliver(event: OutboxEventRow): Promise<void> {
  const consumer = this.registry.get(event.eventType);
  ...
  await runInNewTenantTransaction(this.db, event.organizationId, async () => {
    await consumer.handle(event);      // <-- the whole consumer runs inside a tenant transaction
  });
}
```
`runInNewTenantTransaction` (`run-in-tenant-transaction.ts:38-55`) opens a real `withTenant` transaction, which
is `regional.transaction(...)` on a reserved pooled connection (`with-tenant.ts:144-155`).

**Two live chains reach a provider from inside it.**

*(a) AI.* `expense-outbox.consumer.ts:88` → `AutomationService.runAutomationsForEvent` →
`automation.service.ts:289 runRule` → `:262 executeAction` → `:238 this.aiNodeExecutor.executeNode(...)` →
`AiGatewayService.invokeStructured` → `LlmService` at **30 s (fast) or 60 s (standard) per attempt, plus retries**
(`llm.service.ts:100-101, :202`).

*(b) Webhooks.* `ProjectsWebhooksDispatchService` (`projects-webhooks-dispatch.service.ts:114,117,192`) is a
registered consumer for `build.project-webhook.delivery.requested` and dispatches at `:260` via `callProvider`
with `WEBHOOK_TIMEOUT_MS = 10_000`, `WEBHOOK_MAX_ATTEMPTS = 5`, `WEBHOOK_BASE_DELAY_MS = 1_000`,
`WEBHOOK_MAX_DELAY_MS = 30_000` (`:26-30`).

**Failure scenario.** A customer's webhook endpoint accepts the TCP connection and never responds. Worst case
per delivery: 5 attempts × 10 s = 50 s of provider wait, plus 4 full-jitter backoff sleeps
(`providerBackoffMs` at `call-provider.ts:38-47`: ~0.5-1 s, ~1-2 s, ~2-4 s, ~4-8 s) ≈ 15 s. **Total ~65 s inside
one tenant transaction, against `idle_in_transaction_session_timeout = 60_000 ms`** (`pool.config.ts:122`).
Postgres kills the connection. The consumer's transaction aborts; `mark(event, "DELIVERED")` never runs; the
delivery-record write at `:294` is lost; the event is re-leased and **retries forever**, re-POSTing to the
customer's endpoint each cycle. Because the publisher processes its 50-event batch **serially** (`:61-62
for (const event of claimed)`), one such endpoint stalls the entire outbox for that tick — chat fanout,
payroll posting intents and e-sign completions all queue behind it.

**Why no gate sees this.** `check-placement-bypass.mjs`'s own header (`:40-42` and the RESIDUAL RISK note at
`:345-353`) says the detector "follows `this.<field>.<method>()` through constructor-injected fields" and
"does NOT follow a provider call [reached through] an interface token, a `moduleRef.get`, or a callback
argument". The consumer is resolved by `this.registry.get(event.eventType)` — an `OutboxEventConsumer`
interface token. **The 45 the gate reports is a count of HTTP handlers only; the entire asynchronous path is
outside its reach.**

**Fix.** In `deliver`, do not wrap `consumer.handle` in a transaction. Give `OutboxEventConsumer` the same
contract the HTTP side got: the consumer opens its own short `runInNewTenantTransaction(db, orgId, …)` for
each read and each write, and the provider call sits between them. `FinanceReportExportRequestedConsumer:17-20`
(`this.worker.wake()` and return) is the in-repo reference for a consumer that does no work on the
publisher's connection.

### F2 — P1 — `src/common/outbox/outbox-publisher.service.ts:137-141`
```ts
await forEachOrg(this.db, "outbox-events-flush", async (tx, orgId) => {
  const remaining = BATCH_SIZE - claimed.length;   // BATCH_SIZE = 50
  if (remaining <= 0) return;
  ...  limit ${remaining} for update skip locked
```
`forEachOrg` enumerates `order by organizations.id asc` (`for-each-org.ts:161`). The first org in id order
takes `min(50, its backlog)`; the next takes what is left.

**Failure scenario.** Org `a1b2…` runs a bulk import that emits 400 `chat.message.fanout` events. Every tick,
`remaining` is 50 at that org and 0 by the time the loop reaches org `z9f8…`. Org `z9f8…`'s
`payroll.run.posting-intent` — a **reserved, money-moving** event class — is not claimed at all while the
first org's backlog exceeds 50 per tick. There is no per-org cap inside the batch and no round-robin cursor.
**Fix.** Cap per org at `ceil(BATCH_SIZE / expectedOrgsWithBacklog)` or, simpler, persist a
round-robin cursor (last org id claimed from) in the sweep state and resume enumeration from it.

### F3 — P1 — `src/modules/webhooks/webhooks-dispatch.service.ts:119-123`
```ts
dispatch(orgId, eventName, payload): void {
  void this.run(orgId, eventName, payload).catch((error) =>
    logger.error("[webhooks] dispatch run failed", { orgId, eventName, error }),
  );
}
```
A raw `void`, **not** `registerAfterCommit` (which exists at `tenant-context.ts:39-44` and is used at 56 other
sites). `run()` at `:126` reads `webhookEndpoints` through `this.db`; `this.db` is the tenant-aware proxy
(`tenant-db.ts:14-24`) which resolves to `getTenantContext().tx` whenever an ambient context exists. A promise
detached with `void` **inherits the AsyncLocalStorage store**, so `getTenantContext()` keeps returning the
request's context after the request has returned. Then `run()` makes up to `WEBHOOK_MAX_ATTEMPTS = 5` ×
`WEBHOOK_TIMEOUT_MS = 10_000` HTTP attempts per endpoint in chunks of `WEBHOOK_DISPATCH_CHUNK = 8`, and at
`:152` does `await this.db.insert(webhookLogs).values(rows)`.

**Failure scenario.** `PATCH /leads/:id` returns 200. `TenantContextInterceptor` commits the request
transaction and `withTenant`'s `regional.transaction` releases the reserved connection to the pool. Up to 50 s
later the detached `run()` issues `insert into webhook_logs` on a `tx` object bound to that released
connection — which by then may be checked out by a different request under a **different** `app.organization_id`
GUC. Best case the insert throws and is swallowed by the `.catch` at `:120`, so **webhook delivery logs are
silently missing**. Worst case the write lands under another tenant's GUC. Callers, all inside the ambient
request transaction: `leads.service.ts:232,333`, `deals.service.ts:384,386`,
`hr/directory/employee-onboarding.service.ts:345`, `hr/time/leave-decision-effects.service.ts:60`,
`surveys/survey-automation.service.ts:27`, `e-sign/sign-integrations.service.ts:97`.

**I did not run this to observe which of the two outcomes occurs** — that needs a booted API and a slow
endpoint. The mechanism is read from source and is stated as such.

**Fix.** `if (!registerAfterCommit(() => this.run(...))) void this.run(...)` — the pattern already used at
`storage.controller.ts:201`. Better: emit an outbox event and let a consumer deliver it, which is exactly what
`ProjectsWebhooksDispatchService` already does for the build module. 23 of the 51 `void this.<m>(` sites reach
a method that touches `this.db`; the in-scope ones are `ai/core/controllers/crm-ai.controller.ts:135,150`,
`deals.service.ts:399`, `hr/interviews/hr-interview-scheduling.service.ts:111,250,255`,
`hr/recruitment/recruitment-candidate-ops.service.ts:287`, `hr/recruitment/recruitment-candidates.service.ts:328,429`,
`hr/time/work-logs.service.ts:252`, `leads/lead-conversion.service.ts:57`, `leads/leads.service.ts:212`
(the `crm/` and `inventory/` ones are out of scope for this release).

### F4 — P1 — `src/common/tenant/for-each-org.ts:157-161`
```ts
const orgs = await enumerationDb
  .select({ id: organizations.id })
  .from(organizations)
  .where(and(isNull(organizations.deletedAt), eq(organizations.status, "ACTIVE")))
  .orderBy(asc(organizations.id));          // no .limit(), no cursor
```
then a serial loop at `:168-205`, one `withTenant` transaction per org, with no deadline and no resumption
point. `grep -cE "limit|deadline|budget|cursor|batch"` over the file returns **0**. **84 call sites.**

**Measured cost.** 200 real `BEGIN; SELECT set_config(×5); COMMIT;` round trips against `scratch_head_1010`
on localhost: **161 ms, 0.81 ms per org**. The in-process GUC work alone is 0.012 ms per org, so ~98.5 % is
round-trip latency — 3 round trips per org. On a Neon endpoint at 10 ms RTT that is ≈30 ms per org **before
the callback does anything**.

**Failure scenario.** Every cron sweep is an HTTP route (`src/modules/cron/` — 11 controllers, 130 operations,
0 `@Cron` decorators; an external scheduler drives them). At 1,000 orgs a sweep pays ≈30 s of pure transaction
overhead on one HTTP request before any work. Add per-org work and the request exceeds the proxy's timeout;
the scheduler sees 502 and retries; `forEachOrg` restarts **from the lowest org id**. Orgs late in the id order
are swept repeatedly-never while orgs early in the order are swept repeatedly. `check:route-budgets` confirms
nothing bounds this: **43 of 67 scheduled batches declare no ceiling of any kind, and `BatchSize 0/22 ·
DurationMs 0/22` of the declared ones are measured.** The `outbox-events-flush` case is worse still — F2's
`if (remaining <= 0) return;` skips the *work* but the transaction is opened at `:180` before `fn` runs, so a
full tick pays N transactions to claim zero.

**Fix.** Add `maxOrgs` and `deadlineMs` parameters with a persisted resume cursor (last org id completed per
sweep name), so a truncated sweep resumes where it stopped rather than restarting. Declare `BatchSize` and
`DurationMs` budgets for the 43 undeclared cron routes.

### F5 — P1 — `src/common/outbound/call-provider.ts:134`
```ts
} catch (err: unknown) {
  ...
  const cls = descriptor.classify(err);
  breaker.recordFailure(descriptor.provider, Date.now());   // <-- unconditional
  if (cls === "terminal")
    return { ok: false, kind: "terminal", error, attempts: attempt };
```
A **terminal** failure is by the caller's own classification a 4xx — the provider is healthy and the request
was bad. It nevertheless increments the breaker. `razorpay.adapter.ts:50-55` classifies `RazorpayClientError`
(4xx) as `"terminal"`, and the descriptor's provider key at `:116` is the process-global string
`"razorpay-orders"` on a module-level breaker (`:57 const razorpayBreaker = new ProviderCircuitBreaker()`).
`DEFAULT_THRESHOLD = 5`, `DEFAULT_COOLDOWN_MS = 120_000`.

**Failure scenario.** Tenant A saves a live Razorpay key into the test environment. Five checkout attempts
return 400 `RazorpayClientError` → five `recordFailure("razorpay-orders")` → the circuit opens. For the next
**120 seconds every other tenant's** `createOrder` returns `{ ok: false, kind: "circuit-open" }` without ever
calling Razorpay. One tenant's misconfiguration is a platform-wide payment outage. **No spec asserts this
behaviour either way** — `call-provider.spec.ts:193-209` asserts only that a terminal error is not *retried*.

**Fix.** Move `breaker.recordFailure` below the terminal branch, or gate it on `cls === "retryable"`. Key the
razorpay descriptor per tenant (`razorpay-orders:${orgId}`) so a credential fault is contained.

### F6 — P1 — `src/health/health.controller.ts:80`
```ts
providerCheck(this.config.requiredProviders, (now) => sharedProviderBreaker.openProviders(now), () => Date.now())
```
`sharedProviderBreaker` (`provider-circuit-breaker.ts:83`) is the **default** argument of `callProvider`
(`call-provider.ts:105`). **All three production call sites override it** with a private instance:
`razorpay.adapter.ts:57`, `webhooks-dispatch.service.ts:115`, `projects-webhooks-dispatch.service.ts:118`.
Nothing in the application ever calls `sharedProviderBreaker.recordFailure`, so its state `Map` is
permanently empty and `openProviders(now)` always returns `[]`.

**Failure scenario.** An operator sets `READINESS_REQUIRED_PROVIDERS=razorpay` — the exact vocabulary the
gate's own spec uses (`dependency-checks.spec.ts:141` asserts `openProviders(...)` returns `["razorpay"]`).
`providerCheck` computes `required.filter(p => open.has(p))` over an always-empty set, returns `{ state: "up" }`
forever, and the replica stays in the load-balancer rotation through a total payment-provider outage. It is
an inert gate: it renders and never denies. Compounding it, the key the razorpay adapter actually registers
is `"razorpay-orders"`, so even if the shared breaker *were* fed, `"razorpay"` would never match.
Default `requiredProviders` is `[]` (`readiness.config.ts:68`) so the check currently reports `skipped` —
the defect is latent until someone configures it, which is precisely when they need it.

**Related, same file family — the admission numbers do not bound what they claim.**
`AdmissionService.tryAdmit` (`admission.service.ts:27,30-33,35-41`) gates on `maxQueueDepth` (400) first, then
returns early for a **reserved** work class *before* the per-org check at `:39-41`. So:
`authentication`, `authorization-revocation`, `ownership`, `billing-ledger`, `payroll-posting`, `audit`,
`mandatory-security-delivery` have **no per-org ceiling at all** and face only 400; ordinary writes face
`sheddingThreshold(5)` = 160; and `snapshot()` at `:62` reports `maxConcurrent: 200`, a number that bounds
neither. Meanwhile `ADMISSION_ORG_MAX_CONCURRENT = 50` (`admission.config.ts:63`) is **exactly** the direct-Neon
pool's total capacity (`max` 10 + queue 40), so a single tenant at its own permitted ceiling exhausts the
database for the entire process and every other tenant receives `DB_POOL_SATURATED` 503s.
**Fix.** Feed `sharedProviderBreaker` (drop the private instances, or register each private breaker with a
process registry the health check reads); align the razorpay key with the configured vocabulary; derive
`ADMISSION_ORG_MAX_CONCURRENT` from the pool `max` rather than declaring it independently; report the real
ceiling in `snapshot()`.

### F7 — P1 — `src/scripts/check-unbounded-reads.mjs:30` and four more
```js
const ROOT = new URL("../modules", import.meta.url).pathname…   // check-unbounded-reads.mjs:30
const MODULES_DIR = join(BACKEND_ROOT, "src", "modules");        // check-record-access.mjs:25, check-scope-application.mjs:20
```
Also `check-n1-growing-loops.mjs` and `check-db-call-count.mjs` (`new URL("../modules")`).
`src/common/` holds **230 non-spec files** — the outbox publisher, `for-each-org.ts`, `pool-admission.ts`,
the admission guard, the cache service, the outbound adapter, the rate limiter — and `src/db/` holds 365 more.
Both are outside all five corpora.

**Failure scenario.** `check:unbounded-reads` reports "3 actionable" over 2,301 files and exits 0. The single
largest unbounded read in the repository — `for-each-org.ts:157-161`, a `select` over `organizations` with no
`LIMIT`, executed from 84 call sites — is not in the file set it walked. Every finding in this report except
F9-F13 lives in `src/common/`. A green sweep of these gates is evidence about `src/modules` only, and it has
been read as evidence about the system.
**Fix.** Add `src/common` and `src/db` to the scan roots of all five, then re-baseline each ratchet at its new
measured value in the same commit.

### F8 — P2 — `src/scripts/check-idempotent-commands.mjs`
```
Controllers scanned   546
Handlers in scope     11
EXCLUDED BY DESIGN — named, not hidden:   [11 SKIP lines]
OK — every in-scope mutating handler carries @Idempotent.
```
Every one of the 11 in-scope handlers is excused (`bespoke-mechanism` ×8, `http-put-idempotent` ×1,
`internal-api-no-jwt-context` ×2), so the enforced population is **zero**. My census: **245 `@Idempotent`
decorators across 120 files against 2,134 mutating handlers — 11.5 %.** A `POST` retried by a client, a proxy,
or the frontend's own retry path creates a duplicate on 88.5 % of the mutating surface.
The frontend does supply a last-resort key (`lib/api-client.ts:190-192`), which is why this is P2 rather than
P1 — but only for requests that go through `api-client.ts`, and only where the backend route declares
`@Idempotent` to consume it.
**Fix.** Widen the gate's in-scope predicate (it currently matches only a narrow route-name regex) and set a
coverage floor rather than an all-excused pass.

### F9-F11 — P2 — the three log defects, all unfixed at head
- `ingress/adapters/crm-mailbox.service.ts:341`
  `` this.logger.warn(`sweep failed for ${row.mailboxAddress}: ${message}`) `` — a **customer mailbox address**
  in the message string. `warn` clears the production threshold (`logger.service.ts:11-13`), and the message
  path runs only `truncateForLog` → `scrubBindParameters`, which matches the Drizzle `Failed query:` shape and
  nothing else (`redact.ts:120-138`). The address is emitted verbatim to stderr in production.
  **Fix:** move it into the meta object under a key containing `email`/`address`/`recipient`; `redact.ts:18-47`
  then withholds it automatically.
- `support/kb-gap/support-kb-gap.service.ts:94` — `logger.error(..., { kind: gatewayResult.kind })` fires for
  **all** gateway failure kinds including `quota_exceeded` (`:95`), an expected billing outcome. No data leaks
  (only `kind` is logged); it is a classification defect that trains operators to ignore the stream, which is
  the exact rationale `all-exceptions.filter.ts:188-200` writes down. **Fix:** branch first, log `error` only
  for the actionable kinds.
- `notifications/providers/notification-email.provider.ts:55` — recipient address and notification title in a
  `debug` message string. Dropped in production by the threshold, so P2-low. **Fix:** same as F9.

### F12 — P2 — frontend trace does not start at the browser for four entry classes
`frontend/lib/api-client.ts:181-184` is the only place that mints `x-correlation-id` and calls
`noteCorrelationId` so a browser error report joins the server logs. These four do not:
`lib/portal-api-client.ts:93-101` (whole vendor/customer portal), `lib/public-fetch.ts:69,88` (public forms,
careers, KB), `lib/server-fetch.ts:20-28` (all RSC/route-handler server-side calls), and
`features/notifications/notification-event-stream.ts:26-27` (the SSE stream — an asynchronous boundary C102
names). The backend still mints its own at `correlation-id.middleware.ts:52-55`, so server-side logs stay
internally joinable; what is lost is the browser↔server join. 18 frontend files issue raw `fetch(`.
**Fix.** Hoist the four header lines into a shared `withCorrelation(headers)` helper and call it from all five wrappers.

### F13 — P2 — duplicate provider policy in product modules
`callProvider` has **3** call sites tree-wide. Against that: `hr/automations/hr-webhooks.service.ts:32-33`
implements its own `backoffMs(attempt) = min(60min, 2^attempt × 60s)`;
`inventory/webhooks/webhook-emitter.service.ts:94-129` its own `AbortController` + 10 s timeout + attempt
counter; and six more sites carry their own timeout constant:
`automation/automation-webhook.service.ts:75` (`WEBHOOK_TIMEOUT_MS`),
`crm/automation-studio/crm-automation-runner.service.ts:238` (10 s),
`chat/chat-link-preview.controller.ts:40` (4 s),
`hr/automations/hr-automation-actions.service.ts:139`,
`common/security/turnstile.service.ts:46` (5 s),
`common/security/virustotal-av-scanner.ts:43`. None is circuit-broken, none emits a `provider.*` span, none
propagates `traceparent`. SSRF *is* correctly centralised (`checkWebhookUrl` at every webhook site), so the
security limb of C136 holds; the reliability and observability limbs do not.
**Fix.** Route each through `callProvider` with a per-module `ProviderDescriptor`; the razorpay adapter is the
in-repo reference.

### F14 — P2 — `src/scripts/check-placement-bypass.mjs`, PROVIDER_IN_TRANSACTION_ALLOWLIST
22 entries naming 49 handlers; **45 produce a live finding and 4 do not**:
`kb/help-centre/kb-authoring.controller.ts#draft,improve,summarize` and
`kb/retrieval/kb-ask.controller.ts#askQuestion`. Those four were fixed and now carry `@NoTenantTransaction`,
so the rule no longer fires on them — but their excuses were left in place. The file's own comment (just
above, where the e-sign and timesheets entries were correctly *deleted*) states the rule: *"a dead excuse is
worse than no excuse, because it silently re-excuses the same handler the day somebody drops the decorator."*
**Fix.** Delete the four dead entries. Better: make the gate fail on an allowlist entry that matches nothing.

### F15 — P2 — `src/modules/storage/media-transform.runner.ts:23,63,72`
`MAX_QUEUED = 32` is a single global counter. `MediaTransformJob.orgId` is declared at `:5` and read only at
`:146` and `:159` — both log lines. One tenant uploading 32 files puts every other tenant's upload into
`ServiceUnavailableException("Upload processing is saturated")` at `storage.controller.ts:142-143`.
C147 names per-tenant limits explicitly. **Fix.** Track a per-org count in `submit`/`execute` and refuse at
`ceil(MAX_QUEUED / expectedActiveOrgs)` or a configured per-org share, before the global check.

### F16-F18 — P2 — gate reach and HTTP semantics
- `check-module-entitlement.mjs:7` `const PILOT_MODULE = "timesheets"` — 90 lines, 1 module of 76, exits 0.
- `check:authz-deny` — 2,311 of 3,235 gated handlers with no deny test (29 % covered), passing on a
  ratchet of 2,441. The gate's own note: attribution is per spec *file*, and it does not run the test.
- `check:envelope-consistency` **exits 1**; in-scope violations are `GET /me/inbox`,
  `GET /notification-templates`, `GET /notifications`, `GET /sign/envelopes` — each answers with a bare array
  where the pagination envelope is the contract. (`/inventory/products/variants` and `/inventory/warehouses`
  are the other two and are out of scope.) This is one of the 6 known backend gate failures already routed to
  the concurrent repair wave.

---

## 4. What head already gets right

Not padding — each of these is a place I went looking for a defect and did not find one.

1. **The redaction chokepoint is the strongest single piece of this subsystem.** `truncateForLog` is the one
   string path (`redact.ts:128-138`), and `scrubBindParameters` handles the case that actually leaks — Drizzle
   puts bind values in the *message*, not on a property, so a key-based redactor alone would be redaction in
   name only. The comment at `:107-119` says exactly this. 93 call sites passing a raw `error` are correct
   *because* of it.
2. **The expected/actionable split is explicit and tested.** `all-exceptions.filter.ts:201` logs and reports
   only ≥500; a 4xx `HttpException` produces no log line and no error report (`:211-213`), with the reasoning
   written at `:188-200`. Asserted at `failure-classification.spec.ts:62-79`.
3. **Trace context is gate-enforced, not incidental.** `trace-boundary-coverage.spec.ts:104-118` asserts the
   boundary set is exactly the eight PRD names, `:161-168` asserts `randomUUID` appears in no consumer
   (the "a consumer mints an id that looks like a correlation" regression), and `:131-151` asserts the join key
   survives the projection — `workflow_runs.correlation_id` must appear in a `RETURNING` list.
4. **The pool admission gate sits in front of the driver, for a documented reason.** `pool-admission.ts:5-21`
   establishes that postgres-js has no acquire timeout and pushes onto an unbounded FIFO, and that racing
   `sql.begin()` would shed the caller while still executing the query — a phantom write. Getting that
   distinction right is not obvious.
5. **The outbox claim is correct.** `for update skip locked`, `limit`, lease-based, tenant-scoped, with
   `uniq_outbox_events_org_agg_version` and `uniq_outbox_events_event_id` in the catalog and an RLS
   `tenant_isolation` policy. `check:outbox-consumers` builds a real module graph (216 modules, 1,209 providers)
   and every one of 24 emitted event types has a registered consumer.
6. **`storage.controller.ts` is a complete, correct C146 implementation** — capacity checked *before* the
   expensive work, durable id returned immediately, `registerAfterCommit` for the enqueue, compensation on
   failure, and a bounded runner with a deadline and a shutdown drain.
7. **The admission slot release is one-shot** (`admission-slot.ts:24-35`) and hooks both `close` and `finish`,
   with the comment explaining that a downstream guard's rejection never reaches the interceptor's `finalize`.
   I went looking for a double-release under-counting the limiter and it is handled.
8. **`check:permission-keys` is a real cross-repo invariant** — 704 backend catalog keys equal 704 frontend
   union members. That is the kind of gate the rest of this list should look like.
9. **Console hygiene holds.** One `console.*` in `src/` outside `src/scripts/` and specs
   (`modules/email/app-url.ts:12`, a pre-DI startup warning with no tenant data).
10. **The frontend supplies a last-resort `Idempotency-Key`** (`lib/api-client.ts:188-193`) with a comment
    naming the exact trap — an `@Idempotent` route 400s without it and the error reads like a body validation
    failure.

---

## 5. Blocked on infrastructure — NOT MEASURED

Stated precisely, with what would measure each.

| what | why blocked | what would measure it |
|---|---|---|
| **F3's actual outcome** — does the post-commit `insert` throw, or land on a recycled connection under another tenant's GUC? | needs a booted API, a deliberately slow webhook endpoint, and connection-level tracing | boot the API against `scratch_head_1010`, register a webhook pointing at a 30 s-delay sink, `PATCH /leads/:id`, then `select count(*) from webhook_logs` and read `pg_stat_activity` for the connection's GUC at insert time |
| **The 11-concurrent-AI-request pool exhaustion** | needs a booted API, a stubbed slow LLM, and 12+ concurrent clients | boot with `DB_POOL_MAX=10`, stub the LLM at 30 s, fire 12 concurrent `POST /support/ai/analyze`, assert requests 12+ get `DB_POOL_SATURATED` 503 within 5 s |
| **F1's 65 s transaction actually being killed** | needs a booted API plus an outbox tick against a black-holing endpoint | emit `build.project-webhook.delivery.requested` at an endpoint that accepts and never responds, run one publisher tick, then `select delivery_state, retry_count, last_error from outbox_events` |
| **`check:tenant-isolation:run`** | the gate itself names it as required and I did not run it — it is a seeded-DB suite, outside the stated laptop budget | `pnpm check:tenant-isolation:run` against a local seeded Postgres with `APP_DATABASE_URL` on the non-owner role |
| **`check:alert-ack`** | needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement | unchanged from the release-wide note |
| **F5's cross-tenant blast radius end to end** | needs two tenants with distinct Razorpay credentials | configure tenant A with a live key in the test environment, drive 5 checkouts, then assert tenant B's `createOrder` returns `circuit-open` |
| **Whether `forEachOrg` at real tenant counts exceeds a proxy timeout** | needs an org population at production scale | seed 1,000 orgs into `scratch_head_1010`, time one `POST /cron/daily-notifications` |
| Any typecheck, `next build`, `pnpm lint`, or full jest run | explicitly forbidden by the laptop budget (8-12 GB each, 26 concurrent agents) | run centrally by the orchestrator |

I ran no booted-API request and no seeded e2e suite. Every claim above is either a gate exit code I captured,
a `psql` measurement I took, or a `file:line` I opened and quoted.

---

## 6. Verdict

**PARTIALLY MET — 0 of 7 criteria fully met.**

| criterion | verdict | the one thing that decides it |
|---|---|---|
| C082 | partially-met | the record dimension is gated by no check; 71 % of gated handlers have no deny test; module entitlement is a 1-of-76 pilot |
| C083 | **not-met** | the idempotency gate enforces over 0 handlers; F1 and F3 are live "dead transaction / side effect in transaction" instances |
| C084 | partially-met | errors and redaction are solid; response projections are 0.69 % declared and `check:envelope-consistency` exits 1 |
| C102 | partially-met | backend is genuinely well built; three leaks unfixed; the browser↔server join is missing on four entry classes |
| C136 | **not-met** | 3 `callProvider` sites against 8+ hand-rolled policies; the breaker counts 4xx and the health check reads a breaker nothing writes |
| C146 | partially-met | `storage.controller.ts` is a correct reference implementation used by 3 controllers; `reindexAll`, `kb-media`, `kb-sources` still run corpus-scale work on request threads |
| C147 | **not-met** | 45 handlers hold a connection across a provider call; `ADMISSION_ORG_MAX_CONCURRENT` equals the entire pool; 43 of 67 cron batches have no ceiling; `forEachOrg` has none of limit, deadline or cursor |

The prior audit's C147 verdict stands unchanged at head. What is new is that the defect is not confined to the
45 HTTP handlers the gate can see: **the same shape exists on the asynchronous path (F1), where no gate looks
at all (F7)**, and the mechanisms meant to bound it — the circuit breaker (F5), the readiness signal (F6), the
per-org admission ceiling (F6) — are each mis-wired in a way that is invisible until the moment they are needed.
