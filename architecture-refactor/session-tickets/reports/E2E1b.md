# E2E1b — E2E Suite Audit

**Lead:** `pnpm test:e2e` proves nothing today: the entire suite collapses before running assertions, with two independent blockers preventing any spec from executing, and the one spec that does execute (schema-catalog-parity) finds active schema drift in the live database.

---

## Task 1 — What Actually Ran

### Run method

`node ./node_modules/jest/bin/jest.js --config ./jest-e2e.json --shard=1/6 --maxWorkers=2 --forceExit`

Shard 1/6 is the verified sample; the other shards were not attempted because the two blockers found here affect every spec in the suite.

### Results

| Metric | Value |
|---|---|
| Suites attempted | 25 |
| Suites failed to run | 25 |
| Tests run | 2 |
| Tests failed | 2 |
| Tests passed | 0 |
| Wall time | 1484 s (~25 min) for shard 1 alone |

**Exit code reported by Jest: 0.** This is not a passing result — `--forceExit` causes Jest to emit 0 after a timeout, masking the real failure. The caller must check `Tests: N failed` in stdout, not the process exit code.

### Blocker 1 — Stale ts-jest compile cache (ReferenceError)

`src/modules/chat/chat-messages.controller.ts` was recently refactored to rename three module-level constants. The jest transform cache at `%TEMP%\jest\jest-transform-cache-*` still holds the **old compiled output** referencing the removed names `messageIdParams` and `messageIdemojiParams`. When a worker loads any spec that transitively imports `AppModule → chat.module → chat-messages.controller`, it gets the stale cached bytes, hits a `ReferenceError` at module evaluation, and the entire suite file is reported as "Test suite failed to run" — all assertions inside it are silently suppressed.

Confirmed affected specs: `src/me/me.e2e-spec.ts`, `src/modules/hr/performance/hr-performance.controller.e2e-spec.ts`. Every spec using `createE2eApp()` from `test/helpers/e2e-app.ts` (which imports `AppModule`) is affected — that covers approximately 130 of 143 spec files.

**The stale cache is in `%LOCALAPPDATA%\Temp\jest\jest-transform-cache-*`. Clearing it or running with `--no-cache` will expose blocker 2.**

### Blocker 2 — AppModule OOM on this machine

Every worker that does not get a cache hit instead loads `AppModule` fresh via `ts-jest`. The full NestJS DI container for all 100+ modules compiles to a ~6 GB heap. Workers are killed with SIGTERM (OOM) after 100–250 seconds each. All 23 remaining suites in shard 1 died this way.

This OOM is machine-specific. CI should use `test:e2e:ci` (`--runInBand --max-old-space-size=6144`) which serialises compilation through one process. The local `pnpm test:e2e` command (`jest --config ./jest-e2e.json`) uses workers with no heap flag and cannot succeed on this machine without `NODE_OPTIONS=--max-old-space-size=6144`.

### The one spec that ran: schema-catalog-parity

`src/db/schema-catalog-parity.e2e-spec.ts` does not import `AppModule`. It connects directly to Postgres and compares the Drizzle schema against `information_schema.columns`. Both of its tests **failed** with real schema drift:

**Missing from the live database (columns declared in Drizzle schema, absent in Neon):**

| Table | Column |
|---|---|
| `public.calendar_source_preferences` | `membership_id` |
| `public.chat_user_presence` | `membership_id` |
| `public.fin_recurring_invoice_templates` | `archived_at` |
| `public.kb_article_versions` | `author_membership_id` |
| `public.kb_page_versions` | `author_membership_id` |
| `public.expense_export_jobs` | `requested_by_membership_id` |

Any service path that selects these columns will die `42703` at runtime for every organisation. This is an active correctness bug, not a test artefact.

---

## Task 2 — Rate Limit Repeatability

### `@UseRateLimit("key")` with no TIERS entry

All 30 keys used in `@UseRateLimit(...)` decorators were verified against the `TIERS` map in `rate-limit.service.ts`. **No missing entries found.** The SEC-004 fix (unknown tier now DENIES instead of silently allowing) is in place.

### DEV_LIMIT_MULTIPLIER

`const DEV_LIMIT_MULTIPLIER = process.env.NODE_ENV === "production" ? 1 : 10;` — every tier is multiplied by 10 outside production. Only `src/modules/auth/auth.controller.e2e-spec.ts` tests rate exhaustion (for `auth:register` and `auth:magic-link`), and it imports `effectiveRateLimit` from the service and loops exactly that count. This spec is correctly written.

### Is the suite repeatable?

`RateLimitService` stores in-memory counters per worker process when Redis is absent. `createE2eApp()` instantiates a new `RateLimitService` per spec file, so in-memory counts do not bleed across spec files in different workers. They **could** bleed within a single spec file if `createE2eApp()` is called once in `beforeAll()` and multiple rate-limit tests run against the same app instance — but the only spec that exercises this (auth) uses a unique IP per test.

**Conclusion:** rate-limit ordering hazard is not the actual problem; the OOM and stale cache kill the suite before any rate limit can be reached.

---

## Task 3 — Anti-Patterns in the Spec Corpus

Surveyed statically because no specs completed.

### Bare `jest.fn()` transaction mock

`src/modules/payroll/insights/payroll-insights.controller.e2e-spec.ts:132` — mock is:
```ts
transaction: jest.fn().mockImplementation(
  async (fn: (tx: { execute: jest.Mock }) => Promise<unknown>) =>
    fn({ execute: jest.fn().mockResolvedValue([]) }),
),
```
The callback IS invoked. **No bare (non-invoking) transaction mock found.**

### `clearAllMocks()` where `resetAllMocks()` was needed

Seven spec files call `jest.clearAllMocks()` in `beforeEach`:
- `src/modules/access/entitlements.controller.e2e-spec.ts:52`
- `src/modules/ai/core/projects-ai.controller.e2e-spec.ts:170`
- `src/modules/chat/chat-actions.controller.e2e-spec.ts:53`
- `src/modules/chat/chat-entity-actions.controller.e2e-spec.ts:50`
- `src/modules/chat/chat-entity-channel.controller.e2e-spec.ts:98`
- `src/modules/module-access/__tests__/module-access.controller.e2e-spec.ts:135`
- `src/modules/ownership/__tests__/ownership.controller.e2e-spec.ts:156`

`clearAllMocks()` resets `.calls`/`.instances` but leaves `mockResolvedValueOnce` queues intact. In `module-access.controller.e2e-spec.ts:684`:
```ts
mockModuleStandingRosterService.listStanding.mockResolvedValueOnce({ administrable: false, ... });
```
This is followed immediately by a request that consumes it. If that test fails before the HTTP call, the Once value persists into the next test and the `beforeEach` `clearAllMocks()` does not drain it. The five calls to `mockResolvedValue(...)` in `beforeEach` set the permanent fallback but do not clear the queue. Risk is low-probability but real.

### `JSON.stringify` on a Drizzle condition

Not found in any e2e spec. The pattern appears only in response-body assertions (`JSON.stringify(res.body)`) where serialisation is safe.

### Probe whose "threw" outcome a harness TypeError also satisfies

`src/modules/agent-access/agent-tokens.controller.e2e-spec.ts:95`:
```ts
it("cross-tenant: revoke with another org token id returns 404 not 403", async () => {
  // ...
  stubAgentTokens.revoke.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 }));
  // ...
  expect(res.status).not.toBe(403);
});
```
The test is named "returns 404" but asserts `not.toBe(403)`. A 500 from an unhandled TypeError in the stub chain satisfies the assertion just as well as a proper 404. The spec proves the route is not gating on a wrong permission; it does not prove the correct status code is returned.

`src/modules/e-sign/__tests__/e-sign-signing-flow.e2e-spec.ts:235,247,265`:
```ts
await expect(publicSvc.complete(token, {})).rejects.toThrow();
```
Used for "expired token blocks signing", "voided envelope blocks signing", and "declined state blocks signing". Generic `rejects.toThrow()` is satisfied by any rejection, including an unconfigured mock returning `undefined` and a downstream method throwing `TypeError: Cannot read properties of undefined`. These three use the seeded DB (not the harness stubs), so the risk is lower — but the assertion proves only "something threw", not "the right rejection was thrown".

---

## Task 4 — Coverage of What Matters

### Totals

- 143 spec files (140 under `src/`, 3 under `test/`)
- 132 / 143 have at least one 401/402/403 assertion (auth + RBAC tier)
- 10 / 143 have cross-tenant isolation probes
- 10 / 143 are gated on `RBAC_E2E_DATABASE_URL` and **skip silently** in standard CI (the env var is not set in `jest-e2e.json`)

### Module coverage

| Coverage level | Modules |
|---|---|
| Auth + RBAC + module-gate (402) + cross-tenant | `agent-access`, `api-tokens`, `billing/payments`, `build/core`, `feedbucket`, `finance`, `module-access`, `surveys`, `timesheets` |
| Auth + RBAC + module-gate (402), no cross-tenant probe | `accounting`, `ai`, `automation`, `branches`, `careers`, `chat`, `crm`, `cron`, `dashboard`, `directory`, `email`, `e-sign`, `expenses`, `goals`, `hr` (8 specs), `integrations`, `inventory` (7 specs), `invoices`, `kb` (14 specs), `leads`, `organization`, `payroll` (6 specs), `platform`, `portal`, `public`, `push`, `quotes`, `rbac`, `reports`, `sales`, `search`, `sessions`, `settings`, `storage`, `support`, `tasks`, `workflows` |
| Auth only (401) | `audit-log`, `authorization`, `blog`, `csat`, `customer-executive` |
| No e2e spec | `delegations`, `entity-reference`, `mail` (has 5 unit specs, no e2e), `offer-fulfillment`, `realtime`, `users` |

### Credit exhaustion

The CLAUDE.md §11 requirement is "credit exhaustion" (token-credit balance running to zero → 402). **This is not tested in any e2e spec.** The 402 assertions in the corpus are plan-gate (module disabled), not credit-balance exhaustion. Unit specs cover credit exhaustion for `chat-assistant.service`, `feedbucket-public-ai-assist`, and `support-ai.service`, but the controller layer and guard ordering are untested at the e2e level.

### Cross-tenant probe correctness

All 10 specs with cross-tenant tests use test names containing "404 not 403", which is correct. One assertion (agent-tokens, noted above) checks `not.toBe(403)` instead of `toBe(404)` — weaker than required. No spec asserts 403 for a cross-tenant miss (which would be wrong).

### DB-gated scope specs

Ten specs require `RBAC_E2E_DATABASE_URL` to run. Without it, `describe.skip` suppresses the entire block and the suite exits green with 0 tests. These are the highest-value specs (scope enforcement, project-member access, timesheet scoping, entitlements) and they are invisible in normal CI. Setting `RBAC_E2E_DATABASE_URL` = `DATABASE_URL` in the test environment would activate them.

---

## Summary of Actionable Findings

| Severity | Finding |
|---|---|
| P0 | 6 schema drift columns in live Neon DB (`calendar_source_preferences`, `chat_user_presence`, `fin_recurring_invoice_templates`, `kb_article_versions`, `kb_page_versions`, `expense_export_jobs`) |
| P0 | Stale ts-jest cache causes `ReferenceError` at module load for ~130 specs; clear `%LOCALAPPDATA%\Temp\jest\jest-transform-cache-*` |
| P0 | Local `pnpm test:e2e` OOMs without `NODE_OPTIONS=--max-old-space-size=6144`; use `pnpm test:e2e:ci` locally |
| P1 | `agent-tokens.controller.e2e-spec.ts:95` cross-tenant assertion is `not.toBe(403)`, not `toBe(404)` |
| P1 | `e-sign-signing-flow.e2e-spec.ts:235,247,265` uses `rejects.toThrow()` — satisfied by any error including harness TypeError |
| P1 | AI credit-balance exhaustion (INSUFFICIENT_CREDITS 402) has no e2e coverage in any module |
| P1 | `RBAC_E2E_DATABASE_URL` is not set in `jest-e2e.json`, silently skipping 10 scope-enforcement specs in CI |
| P2 | `module-access.controller.e2e-spec.ts:684` uses `clearAllMocks()` + `mockResolvedValueOnce` — stale once-queue hazard if test fails pre-call |
| P2 | `delegations`, `mail`, `offer-fulfillment`, `realtime`, `users` modules have zero e2e coverage |
| INFO | All `@UseRateLimit` tier keys have TIERS entries; no silent disables |
| INFO | Exit code 0 from `pnpm test:e2e` does not mean passing; check "Tests: N failed" in stdout |
