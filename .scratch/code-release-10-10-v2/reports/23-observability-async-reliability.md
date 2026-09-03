# 23 — Observability and asynchronous reliability (PRD-C082, C083, C084, C102, C136, C146, C147)

**Repo:** `streamlineos-backend`, branch `release/code-10-10-v2`, HEAD `591cf663` at the start of this run.
Companion measurement — gate reach, C079, C074, the partition question — is in
`18-query-cache-contracts.md`; this report does not repeat it.

Nothing here is a checkbox. Every claim carries a file:line I opened, and §6 lists every command with
its exit code.

---

## 1. C102 — structured, redacted, tenant-safe logs with trace context

**Substantially met, and better built than I expected.** The failure shape I went looking for —
`logger.error` firing on 4xx domain outcomes, training operators to ignore the stream — **is not
present**. I searched for it two ways and found **0** genuine instances.

### 1a. What exists

- **Logger:** `src/common/logger/logger.service.ts`, 51 lines, hand-rolled. Structured JSON, one
  object per line (`:23-37`). `error`/`warn` → stderr, `info`/`debug` → stdout (`:39-43`). Neither
  pino nor winston is installed — verified against `package.json`.
- **Record shape** (`:24-36`): `timestamp, level, message, correlationId, release, cellId, orgId,
  actorId, method, route, meta`. Identity is stamped **top-level**, not buried in `meta`, so an
  aggregator can index on it. `orgId` is populated at the edge by
  `src/common/observability/observability-enrichment.interceptor.ts:30-32` and per-tenant inside
  sweeps by `src/common/tenant/for-each-org.ts:125`.
- **`message` is itself redacted** — `truncateForLog(message)` at `logger.service.ts:26`. The message
  is not treated as a trusted channel.
- **Production drops `info` and `debug`** — `threshold()` at `:11-13`. This is load-bearing for the
  severity ranking in §3.
- **Nest's `Logger` is not a second unredacted path.** 167 sites do `new Logger(...)`, but
  `src/main.ts:75` calls `app.useLogger(structuredNestLogger)` and
  `src/common/observability/nest-logger.adapter.ts:71` funnels every level back into the canonical
  logger.

### 1b. Redaction — `src/common/observability/redact.ts`

**23 substrings** (`:18-47`) matched after `normaliseKey` lowercases and strips non-alphanumerics
(`:83-85`, `:90`): `password passwd secret token authorization cookie apikey accesskey credential
privatekey sessionid aadhaar pannumber pancard cardnumber accountnumber connectionstring emailaddress
phonenumber mobilenumber recipient prompt filename`.

**18 exact names** (`:58-81`): `pan otp cvv ssn dsn pin jwt bearer query params driverdetail email
emails phone to cc bcc subject`.

Coverage of the nine field names I was asked about:

| key | withheld? | proof |
|---|---|---|
| `prompt` / `promptText` | **YES** | `redact.ts:45` substring + `:90` |
| **SQL bind values** | **YES, twice** | key path `params` (`:70`); **message** path `scrubBindParameters` (`:120-126`) |
| `system` `user` `content` `body` `text` `fileContent` | **NO** | absent from both lists. `fileContent` → `filecontent`, which does **not** contain `filename` (`:46`) — a near-miss |

The bind-value handling is the strongest part of the file and worth preserving verbatim. Drizzle
builds `DrizzleQueryError.message` as `` `Failed query: <sql>\nparams: <bind values>` ``, so the values
ride in the *message*, not on a property — `redact.ts:107-119` says exactly this, and
`scrubBindParameters` (`:120-126`) strips them from the string. `truncateForLog` (`:134-138`) is the
single chokepoint every string crosses.

**Consequence for the 93 call sites that pass a raw `error`:** they are *correct*, not defective.
`redact.ts:166` intercepts `value instanceof Error` → `describeError` (`:140-150`) → `truncateForLog`
on message and stack; a wrapped Postgres error's `cause` is re-walked so its `query` and `params` keys
hit the exact-name set. `{ error }` preserves `name`, `code` and the cause chain while the chokepoint
handles safety. `redact.ts:128-133` states this is the intent — the guarantee is meant to hold "for
call sites that have not been written yet."

Structural caps: depth 4, string 1000, array 100, keys 60 (`:10-13`); cycles → `[circular]` (`:170`).

### 1c. Trace context — all eight boundaries, and it is gate-enforced

Generated at `src/common/http/correlation-id.middleware.ts:52-55` (`x-correlation-id`, else
`x-request-id`, else `randomUUID()`), wired at `src/main.ts:106`. The inbound header is treated as
hostile: `sanitise` (`:40-45`) takes only the leading run up to whitespace — which is what stops a
newline plus a JSON fragment forging a second log record — strips to `[A-Za-z0-9._-]` and caps at 64.

Carried in `AsyncLocalStorage` (`src/common/observability/observability-context.ts:28`).
`correlationId` is `readonly` (`:14`) and `enrichObservabilityContext` (`:46-59`) never reassigns it,
so a caller-supplied value cannot displace the join key mid-request.

**OpenTelemetry is NOT installed** — verified against `package.json`: no `@opentelemetry/*`. This is a
deliberate hand-roll and the reasoning is written down at `src/common/observability/tracing.ts:12-17`:
W3C trace context is a string format, so real `traceparent` headers go out now and attaching OTel
later is an exporter swap rather than a re-instrumentation. `parseTraceparent` (`:87-97`) rejects
all-zero ids per spec.

| boundary | propagated | evidence |
|---|---|---|
| HTTP responses | yes | `correlation-id.middleware.ts:59-60`, `:83` echoes `traceparent` |
| DB adapter | yes | `src/db/query-telemetry.ts:79`; `src/db/pool-telemetry.ts:95` `db.pool.wait` |
| Cache adapter | yes | `src/common/cache/cache.service.ts:125-138` `withSpan("cache.roundtrip")` |
| Provider / HTTP client | yes (3) | `src/common/outbound/call-provider.ts:123` (span per **attempt**, `:117-122`); `src/common/http/outbound-request.ts:58`; `src/common/outbound/safe-webhook-transport.ts:83`. Headers injected at `call-provider.ts:93-100` — `traceparent` **and** `x-correlation-id` |
| Outbox publication | yes (both halves) | producer `src/common/outbox/outbox-writer.ts:19,41`; consumer `src/common/outbox/outbox-publisher.service.ts:85-99` |
| Queue / event consumers | yes | `src/common/workflow/workflow-outbox-relay.service.ts:160-164`; `workflow-runner.service.ts:82-92` |
| Cron jobs | yes, indirectly | there are **0** `@Cron`/`@Interval`/`@Timeout` decorators in `src/`; cron is **11 HTTP controllers** under `src/modules/cron/` driven by an external scheduler, so the middleware establishes context at the edge and `forEachOrg` (`for-each-org.ts:116-130`) carries it per tenant, inheriting `correlationId` at `:124` |
| AI streams | yes | `src/modules/ai/core/telemetry/ai-correlation.ts:16-18`; `ai-call-metrics.ts:114,122` |

The asynchronous hop is a **single shared primitive** — `src/common/observability/async-hop.ts`,
producer `correlationIdToPersist` (`:33-36`, returning `null` rather than minting a fake id, `:28-32`)
and consumer `runInRestoredContext` (`:67-85`). Deliberately `runWithObservabilityContext` rather than
`bind…` (`:56-60`), so a consumer on a timer does not inherit the tick's context.

**And it is enforced, not incidental.** `src/common/observability/trace-boundary-coverage.spec.ts`
lists every boundary and the primitive it must reach for (`:20-96`) and asserts the set is exactly the
eight PRD names (`:104-118`). Two further assertions are the reason I trust it:
`:161-168` asserts `randomUUID` appears in **no** consumer — the regression where a consumer mints an
id that *looks* like a correlation and is not — with the single minting site pinned at `:170-174`; and
`:131-151` asserts the join key survives the **projection**, e.g. `workflow_runs.correlation_id` must
appear in a `RETURNING` list (`:135`), because that table shipped with the column written on every row
and named in no projection that read one back (`:121-130`).

### 1d. Expected vs. actionable — an explicit, tested line

`src/common/http/all-exceptions.filter.ts:201`:

```ts
if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
  logger.error("Server-side HttpException", { status, ...describeUnhandled(exception), request });
  if (!isHealthProbe(request)) reportError(exception, request);
}
```

A 4xx `HttpException` falls straight through to `:211-213` — **no log line, no error report**. The
rationale at `:188-200` names the failure mode: logging those at error level "is what turns a routine
404 into a page, and what trains an operator to ignore the stream." Four further tiers: `ZodError` →
400 with **no log** (`:170-182`); body-parser failure → `logger.warn` (`:220`); transient DB error →
`logger.warn` + 503 (`:229-238`, classified by `src/common/db/transient-error.ts`); health probes log
but do not report (`:262-267`).

Separately, `src/common/observability/error-classification.ts:22-32` lifts the Postgres SQLSTATE out
of up to six `cause` links so `42501` — a missing tenant GUC (`:17`) — is distinguishable from any
other 500. The comment at `:1-13` ties this to the incident that emptied `notifications`
platform-wide.

Asserted at `src/common/http/failure-classification.spec.ts:62-69` (404/403/400 → 0 reports **and** 0
log lines) and `:71-79` (500/503 → exactly one report and one log line).

**The count I was asked for is 0.** Searching `logger.error` within 4 lines of a 4xx `throw` gives 3
candidates; widened to 10 lines and all 4xx exception types, 11. Every one dismissed on inspection:
five are the payroll pattern where the log is explicitly guarded `if (!isUniqueViolation(err))` so the
409 path never reaches it (`payroll/entities/entities.service.ts:79-85`,
`payroll/jobs/payroll-jobs.service.ts:67-73`, `payroll/runs/profiles.service.ts:161-168,306,336`);
three are unexpected side-effect failures in swallowed catches; `permission.guard.ts:42` correctly
logs the *unexpected throw* from `authorize()` and then fails closed with 403 at `:46`, distinguishing
the fault from the response. The payroll guard is the tell that this was done deliberately.

**One site is worth tightening:** `src/modules/support/kb-gap/support-kb-gap.service.ts:94` logs at
`error` for **all** gateway failure kinds before branching, including `quota_exceeded` (`:95`) — an
expected billing outcome, not an actionable fault. It logs `kind`, not the prompt, so nothing leaks;
it is a classification defect only. In my territory but it is a one-line judgement call about which
`kind`s are faults, and I left it rather than guess — routed with the rest.

### 1e. AI streams — clean

**Nothing logs a prompt or a completion.** 24 `logger.*` calls under `src/modules/ai/`; three match a
keyword grep and all three match on the *message string*, not a payload:
`ai/core/streaming/ai-stream-response.ts:37` ("AI stream terminated before completion", meta
`{ error, feature, orgId }`), `ai/core/gateway/ai-gateway-stream.helper.ts:152` and `:184` (meta
`{ error, feature, orgId }` / `+ reservationId`). What is recorded is token **counts** —
`ai-gateway-stream.helper.ts:163-169` derives `promptTokens`/`completionTokens` from
`usage.inputTokens`/`usage.outputTokens`. `promptTokens` would in fact be redacted by `redact.ts:45`
if it ever reached `meta`, which it does not.

The discipline is visible in the contrast: `support-kb-gap.service.ts:86-90` builds a live prompt with
`system` and `user` fields carrying tenant content (`gap.representativeQuestion`, `:89`), and the log
four lines later at `:94` carries only `{ orgId, gapId, kind }`.

### 1f. Console hygiene

| call | `src/` excluding `src/scripts/` | including |
|---|---|---|
| `console.log` | 0 | 200 |
| `console.error` | 0 | 105 |
| `console.warn` | **1** | 7 |
| total | **1** | 312 |

Independently verified: `grep -rn "console\.(log|error|warn|info|debug)(" src | grep -v '^src/scripts/'
| grep -v spec` → **1**. That site is `src/modules/email/app-url.ts:12`, a startup config warning that
fires before the DI container exists (`:19-22`) and carries no tenant data. The 312 in `src/scripts/`
are CLI tools writing to a terminal. Clean split: 146 files import the structured logger; the app uses
`logger` exclusively and the scripts use `console` exclusively.

`logger.error` 350 · `logger.warn` 226 · `logger.info` 25 · `logger.debug` 36 = **637**.

---

## 2. THE C102 GATE DEFECT — `check:log-secrets` enforces over 0 of 690 sites

`pnpm check:log-secrets` → **exit 0**, `Scanned 3648 source files · TIERS map 101 entries · Redactor 23
substrings + 18 exact names · OK — no plaintext secret logging found … every name this gate guards is
withheld by the runtime redactor.`

That closing clause is true and **vacuously so — the gate guards a strict subset of what the redactor
withholds.** `SENSITIVE_NAME_RE` (`src/scripts/check-log-secrets.mjs:65-66`) holds ~15 secret-shaped
names. `redact.ts` withholds **41**, including nine PII names the gate never checks: `emailaddress`,
`phonenumber`, `mobilenumber`, `recipient`, `email`, `to`, `cc`, `bcc`, `subject`, `filename`.

Measured (`<scratch>/log-vocab.mjs`, replicating the gate's own `stripStringLiterals`):

```
logger/console call sites on one line (excl. src/scripts, excl. specs)   690
  with a template-literal message interpolating a value                  126
  matching SENSITIVE_NAME_RE — the gate's ENTIRE enforced population        0
  interpolating a name redact.ts withholds but the gate never checks        6
```

**The gate is not blind to template literals** — `stripStringLiterals` at
`check-log-secrets.mjs:162-169` deliberately preserves `${…}` spans and feeds the expression to the
regex. It is blind to the **vocabulary**. Extending `SENSITIVE_NAME_RE` to the redactor's own name set
— they are two lists of the same thing, in two files, that have drifted — closes the class. That
would have caught both leaks in §3 and costs nothing else: the other four hits are already safe.

---

## 3. The two real leaks — both outside my territory

| # | site | what leaks | reaches production? |
|---|---|---|---|
| **1** | `src/modules/ingress/adapters/crm-mailbox.service.ts:341` | `` this.logger.warn(`sweep failed for ${row.mailboxAddress}: ${message}`) `` — a **customer mailbox address** in the message string | **YES.** `warn` clears the production threshold at `logger.service.ts:11-13` |
| 2 | `src/modules/notifications/providers/notification-email.provider.ts:55` | `` `SANDBOX EMAIL -> ${input.recipientAddress ?? "no-address"}: ${input.title}` `` — recipient address **and** notification title | No — `debug`, dropped in production |

I opened `crm-mailbox.service.ts:335-345` and confirmed #1 verbatim. Fix is one line: move
`row.mailboxAddress` out of the template and into the meta object under any key containing `email`,
`address` or `recipient`, and the redactor withholds it automatically. `src/modules/ingress/` and
`src/modules/notifications/` are not mine. **Routed.**

The other four template-literal hits are false alarms and I am recording them so nobody re-raises
them: `src/common/media/media-compression.service.ts:238,272` and
`src/common/security/{clamd,virustotal}-av-scanner.ts:75,63` interpolate only `String(err)` into the
message and pass `{ fileName }` / `{ filename }` in the meta object, which `redact.ts:46` withholds.

`orgId` is on the record and there are **0** sites logging a raw row, DTO or entity. Query strings are
excluded by construction — `all-exceptions.filter.ts:145-161` keeps the path and the parameter *names*
(`queryKeys`, `:156`) and discards every value, asserted at `failure-classification.spec.ts:111-116`:
`/crm/contacts?q=ada%40lovelace.example&stage=won` logs `stage` and neither the address nor `won`.

---

## 4. C147 / C078 — backpressure does not hold, and the arithmetic says so

This is the criterion I judge **not met**, and it is the same 45 handlers as report 18 §5.

From source:

| quantity | value | file:line |
|---|---|---|
| pool `max` | **10** direct Neon · **20** pooled · **5** dev | `src/db/pool.config.ts:177` |
| queue depth | `max × 4` = **40** | `src/db/pool-admission.ts:34,253` |
| acquire timeout | **5,000 ms** | `src/db/pool-admission.ts:33,254` |
| `idle_in_transaction_session_timeout` | **60,000 ms** | `src/db/pool.config.ts:122` |
| LLM per-attempt timeout | **30,000 ms** fast · **60,000 ms** standard, **plus retries** | `src/modules/ai/core/providers/llm.service.ts:100-101`, retry log `:202` |

`TenantContextInterceptor` wraps every request in one transaction, and 45 handlers make a provider
call inside it. So:

- **11 concurrent AI requests exhaust the entire pool** on a direct endpoint.
- Each holds its connection for the whole provider call — up to 30 s or 60 s, longer with retries.
- Requests 12–51 queue; each is killed after **5 s** by `acquireTimeoutMs`.
- **One slow LLM provider takes every unrelated route in the process down within five seconds.**
- A standard-tier call that runs its full 60 s timeout sits exactly on the 60 s idle-in-transaction
  kill line — the two limits are equal, so the outcome is a coin toss between a completed call and a
  killed connection.

`pool.config.ts:255-257` already names this failure mode in prose: "every request runs inside a tenant
transaction, so a handler stalled on an external call pins its connection indefinitely." The code
knows. Forty-five handlers still do it.

**Fixed in this run: 6.** `check:placement-bypass` moved `provider in tx` **55 → 45** (and
`@NoTenantTransaction` 35 → 45). It exits **1** both before and after — that non-zero status is a
pre-existing property of its allowlist, not a regression from this work.

- `src/modules/e-sign/sign-ai.controller.ts` + `sign-ai.service.ts` — the worst of the six:
  `summarizeDocument` held a pooled connection across an object-store `getFileStream` **and a full
  stream drain per document**, a CPU-bound `extractAttachmentText`, **and** the LLM call. Both DB
  reads now sit in one `runInTenantTransaction(…, { orgId })` that commits before any of it.
- `src/modules/timesheets/core/timesheets-ai.controller.ts` + `timesheets-ai.service.ts` — all five
  handlers; a `readEvidence()` helper puts the four evidence reads in their own committed transaction.

I verified rather than assumed that `AiGatewayService` is safe with no ambient context:
`AiUsageService.track` (`src/modules/ai/core/services/ai-usage.service.ts:82-97`),
`AiCreditsReservationService.{reserve,settle,release,ensureWalletForOrg}`
(`src/modules/billing/core/ai-credits-reservation.service.ts:46-83,110-113,167-182,192-274,283-332`)
and `AccessService` (`src/modules/access/access.service.ts:204,296,327,406,463`) each pass an explicit
`{ orgId }`, so each opens its own transaction. `src/modules/kb/help-centre/kb-article-ai.controller.ts`
is the in-repo reference for the pattern.

**Not fixed — support's 14, and why.** `support-ai.controller.ts:90,102,114,126,138,154,170,182,193,
207`, `support-automations.controller.ts:102`, `support-kb.controller.ts:258,282,294` are a
read → provider → **write** sandwich spread across `support-ai-triage.service.ts`,
`support-ai-triage-analysis.service.ts`, `support-ai-translation.service.ts` and
`support-ai-triage-data.service.ts` — **none of which contains a single `runInTenantTransaction`
today** (`grep -c` → 0, 0, 0, 0). Converting them needs explicit transactions on both sides of the
provider call in four services, and CLAUDE.md §8 is explicit that a swallowed `42501` passes every
static check. That needs a booted API and a real request, which I did not do. Landing it blind would
be the exact mistake this release keeps paying for. **Routed with the shape and the cost, not
attempted.**

Full owner-by-owner triage of all 45 is in `18-query-cache-contracts.md` §5. Two entries deserve
repeating here because they are not obvious from the file names:

- **`src/modules/feedbucket/feedbucket-public.controller.ts:335`** is **unauthenticated**. Anonymous
  traffic can pin a pooled connection for 30–60 s — denial-of-wallet *and* pool exhaustion in one
  route. Highest severity per-site in the set.
- **`leads.controller.ts:68,117`, `leads-detail.controller.ts:184`, `deals.controller.ts:199`,
  `payroll-ai-explain.controller.ts:43`, `automation.controller.ts:23`** reach the provider through
  `AutomationService.runAutomationsForEvent` → `AiNodeExecutorService`. An **ordinary CRM write**
  silently becomes a provider call inside the write's own transaction. Nothing at those call sites
  says "AI".

---

## 5. The remaining criteria — status and what I actually checked

**C082 (privileged operations check module/permission/tenant/record/DataScope at the right seam)** —
not re-derived; it is `check:route-classification`'s and ticket 05's territory and I did not run that
gate. What I can add from this run: `RouteClassifierGuard` enforcement is real and
`AccessService.scopeFor` is what `resolveEnvelopeViewScope` (`src/modules/e-sign/sign-envelope-scope.ts:38-43`)
uses, and I preserved that seam exactly when adding `@NoTenantTransaction()` — `AccessService` opens
its own tenant transaction with an explicit `orgId` at all five sites, so moving the handler out of the
request transaction does not weaken the check. **Not independently verified beyond that. Not run.**

**C083 (writes transactional, idempotent, safe under concurrent retry; after-commit/outbox; never a
dead request transaction)** — the mechanisms are in place and gated:
`check:outbox-consumers` builds a real module graph (216 modules from `AppModule`, 1,209 providers)
and every one of 24 emitted event types has a registered consumer; `check:transaction-callbacks`
covers 2,059 spec files and 473 transaction doubles, of which 266 invoke the callback — that is aimed
squarely at the "a bare `jest.fn()` voids every assertion" trap; `check:fire-and-forget` reports tier 1
clean and tier 2 at 255 against a ratchet of 279, plus 55 sanctioned `registerAfterCommit` sites.
**The idempotency half does not hold: 245 of 2,126 mutating handlers (11.5 %) carry `@Idempotent`, and
`check:idempotent-commands` enforces over 11 of them** — full measurement in
`18-query-cache-contracts.md` §1b②, including two general-ledger post/reverse routes that are unfenced
and out of scope because six branches of the gate's route regex can never match.

**C084 (minimal response projections, redaction, generic errors, resource limits, stable HTTP
semantics)** — the error half is solid (§1d: one envelope, generic body, 4xx silent, query values
discarded). The **resource-limit half is where I found and fixed something**: 131 array properties on
schemas bound to an HTTP body or query carried no `.max()`, and **0 of them were in
`check:bulk-id-limits`' scope** because it only inspects properties named `ids`/`*Ids`. I capped the
ten in my territory (`e-sign` ×4, `support` ×4, `tasks` ×1, `timesheets` ×1); 121 remain. The sharpest
illustration is `src/modules/support/core/dto/support-tickets.schemas.ts` — `conditions` on line 165
was uncapped while `candidateAgentIds` on line 169 of the same object carried `.max(50)`, because the
gate could see one name and not the other. Projection minimality is `check:query-projections`'
territory: it reports 1,378 unprojected reads against a **ceiling of 1,383** — five slots of headroom,
a ratchet, not a clean repository.

**C136 (current-head shared-adapter evidence: tenant-safe interfaces, bounded retries/timeouts/circuit
breakers, idempotency, backpressure, schema-validated provider responses, cache/credential isolation,
observability, failure-mode tests, no duplicated provider policy in product modules)** — partially
evidenced from this run. The shared adapter exists and is observable:
`src/common/outbound/call-provider.ts` opens a span **per attempt** (`:117-123`) and injects
`traceparent` + `x-correlation-id` outbound (`:93-100`); `src/common/outbound/safe-webhook-transport.ts:83`
and `src/common/http/outbound-request.ts:58` are traced the same way; SSRF has exactly one guard
(`src/common/security/ssrf-guard.ts`, and CLAUDE.md §4 forbids a second). **The backpressure limb
fails** — §4. I did **not** verify circuit-breaker behaviour, retry bounds per provider, schema
validation of provider responses, credential isolation, or the failure-mode tests. **Not run.**

**C146 (move CPU/IO-heavy work off request threads; return a durable job/status contract promptly)** —
three concrete violations surfaced by the same 45-site scan, all still open:
`src/modules/support/core/support-kb.controller.ts:294` `reindexAll` re-indexes a whole corpus on a
request thread; `src/modules/kb/wiki/kb-media.controller.ts:30` and `kb-sources.controller.ts:48`
`upload` do blob fetch + parse + LLM inline. The e-sign fix in §4 removed the connection-pinning half
of that shape but **not** the on-request-thread half: `summarizeDocument` still drains the stream and
extracts text on the request. That is a smaller problem than holding a connection while doing it, and
it is the right next step for that route. I did not survey C146 across the tree beyond these.

**C147** — §4. **Not met.**

---

## 6. Commands run and exit codes

```
pnpm check:log-secrets                                    EXIT 0   3,649 files; enforced population 0/690
pnpm check:fire-and-forget                                EXIT 0   3,662 files; tier1 0, tier2 255/279
pnpm check:outbox-consumers                               EXIT 0   3,646 files; 216 modules, 24 emitted / 29 registered
pnpm check:transaction-callbacks                          EXIT 0   2,059 spec files; 473 doubles, 266 invoking
pnpm check:idempotent-commands                            EXIT 0   526 files; 11 in scope, all excused
pnpm check:placement-bypass   (before this run)           EXIT 1   147 bypasses, 55 provider-in-tx
pnpm check:placement-bypass   (after this run)            EXIT 1   147 bypasses, 45 provider-in-tx
pnpm typecheck  (heavy.sh, 8 GB heap)                     EXIT 0   0 errors
jest --runInBand --testPathPattern="(e-sign-services-tenant-isolation|timesheets)"
                                                          EXIT 0   30 suites, 236 tests passed
node <scratch>/log-vocab.mjs                              EXIT 0   690 log sites, gate population 0, 6 PII interps
node <scratch>/array-caps-body.mjs  (before)              EXIT 0   289 arrays / 131 uncapped / 0 in gate scope
node <scratch>/array-caps-body.mjs  (after)               EXIT 0   289 arrays / 121 uncapped / 0 in my territory
grep console.* outside src/scripts, excl. specs           —        1 (src/modules/email/app-url.ts:12)
node -e "opentelemetry|pino|winston in package.json"      —        NONE
```

**Not run, and not claimed:** the seeded e2e suite · `pnpm check:route-classification` ·
`pnpm lint` · any booted-API request. The support 14 are unfixed **because** the booted-API exercise
they need was not run — that is the honest reason, not a scheduling one.
