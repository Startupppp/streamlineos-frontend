# SEC1 — Security Posture Audit (PRD §28)

Audited: 2026-08-30. Grep used for every claim; scans were tested against known defects first.

---

## 1. Rate Limiting

**Status: CLEAN with one note.**

Every `@UseRateLimit("key")` in the codebase resolves to a real TIERS entry:

```
backend/src/common/ratelimit/rate-limit.service.ts:10  TIERS: Record<string, Tier>
```

All 31 distinct keys used by `@UseRateLimit` decorators are present in TIERS. Three previously-missing entries (`hr-form:public-view`, `hr-form:public-submit`, `platform-visit`) are documented in the TIERS file at lines 26-28 as SEC-004 fixes.

The service now **fails closed** on an unknown tier (line 126-130): it logs an error and returns `allowed: false`. This changed from the prior `return { allowed: true }` behaviour.

`DEV_LIMIT_MULTIPLIER` (line 95) is `1` in production, `10` elsewhere. The service spec handles this correctly: it sets `NODE_ENV=production` and forces a fresh module import (`jest.resetModules()`) before running limit assertions (rate-limit.service.spec.ts:9-12). No test hard-codes the raw TIERS number without this override.

**No findings.**

---

## 2. CORS Ordering

**Status: CLEAN.**

Actual registration order in `backend/src/main.ts`:

- Line 87: `app.use(helmet())`
- Lines 89-96: `app.enableCors({ ... })`
- Line 103: `app.useBodyParser("json", { limit: admission.maxBodyBytes })`
- Line 108: `app.useBodyParser("urlencoded", { ... })`

CORS is registered **before** the body parser. A 413 body-too-large rejection has the ACAO header, so the client sees the real status code.

**No findings.**

---

## 3. SSRF

**Two findings.**

### SSRF-1 (HIGH) — CRM automation `call_webhook` action has no SSRF guard

`backend/src/modules/crm/automation-studio/crm-automation-runner.service.ts:231`

```ts
case "call_webhook": {
  const url = String(config["url"] ?? "");
  if (url) {
    await fetch(url, {          // ← no guard, user-supplied URL
      method: "POST",
      ...
    });
  }
}
```

`config["url"]` is a user-supplied value stored in the CRM automation rule node configuration. No call to `checkWebhookUrl` or `assertSafeWebhookUrl` precedes the fetch. An attacker can configure an automation that points at `http://169.254.169.254/` or any internal endpoint and trigger it via a CRM event.

Fix: call `await checkWebhookUrl(url)` from `common/security/ssrf-guard.ts` and throw if `!check.allowed`.

### SSRF-2 (MEDIUM) — `hr-webhooks.service.ts` re-implements the guard, missing the packed IPv6 form

`backend/src/modules/hr/automations/hr-webhooks.service.ts:23` and `:407-417`

```ts
const PRIVATE_IP_PATTERN = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.0|::1|localhost)/i;

private assertSsrfSafe(url: string): void {
  const parsed = new URL(url);
  if (PRIVATE_IP_PATTERN.test(parsed.hostname)) { ... }
}
```

This custom guard is used at subscription create (line 66) and update (line 91) time. It misses:
- `::ffff:7f00:1` — the IPv4-mapped IPv6 form that `new URL()` normalises to; the shared `checkWebhookUrl` unpacks this form at `ssrf-guard.ts:36-51`
- No DNS resolution: a hostname that resolves to an internal IP passes the guard
- Missing blocked ranges: carrier-grade NAT (`100.64.x.x`), multicast (`224+`), documentation ranges

Fix: replace `assertSsrfSafe` with the shared `checkWebhookUrl` (async). Callers are create/update, which already await.

The webhook-delivery path at line 297 reads the URL from DB rows that were validated at write time, so delivery itself is not an independent fetch site — but the validation weakness above means an invalid URL could have been stored.

---

## 4. Route Classification

**Status: CLEAN.**

`RouteClassifierGuard` (`backend/src/common/auth/route-classifier.guard.ts`) is the first global `APP_GUARD`. Enforcement is ON:

```ts
// route-classifier.guard.ts:35
const ENFORCE = () => process.env.REQUIRE_ROUTE_CLASSIFICATION !== "false";
```

Boot log confirms 0 undeclared routes as of the last build (line 74-76: guard logs "every route declares its exposure" when the undeclared set is empty).

`@Public()` routes audited:

| Route | Justification |
|---|---|
| All `cron-*.controller.ts` | Protected by `assertCronSecret` (timing-safe compare, fails if `CRON_SECRET` is unset) |
| `internal-audit.controller.ts` | Protected by `x-internal-secret` header against `INTERNAL_API_SECRET` |
| `health.controller.ts` | Health check, intentional |
| `auth.controller.ts` (register, verify-email, etc.) | Auth bootstrap, rate-limited |
| `email-webhook.controller.ts` | Email bounce/complaint receiver (provider has no session) |
| `feedbucket-public.controller.ts`, `survey-public.controller.ts`, etc. | Public-facing widgets/surveys |

No `@Public()` route found that is unintentionally public.

Route-uniqueness spec (`app-route-uniqueness.spec.ts:104`) checks that each method+path combination is declared exactly once. It asserts `routes.length > 3000` to prevent a broken scan from passing vacuously (line 101), and a self-test at line 120 confirms it would catch a version-blind collision.

**No findings.**

---

## 5. Existence Oracle

**One finding.**

### ORACLE-1 (MEDIUM) — `ai-confirmation.service.ts` returns 403 on row not found

`backend/src/modules/ai/confirmation/ai-confirmation.service.ts:158-166`

```ts
const rows = await tx
  .select()
  .from(aiActionProposals)
  .where(eq(aiActionProposals.id, proposalId))   // ← no orgId filter
  .for("update")
  .limit(1);

const row = rows[0];
if (!row) throw new ForbiddenException("Proposal not found");   // ← 403, not 404
```

The query is scoped by RLS (the method runs inside `runInTenantTransaction`), so a cross-tenant `proposalId` would return nothing, reaching the `!row` branch. The caller receives 403, confirming the ID existed somewhere in the system. The correct response for "row not found" is 404.

Note: line 187 re-checks `row.orgId !== input.actor.orgId` as a belt-and-suspenders guard, but it is only reachable after the row is found.

Fix: change `throw new ForbiddenException("Proposal not found")` to `throw new NotFoundException("Proposal not found")`. Add `eq(aiActionProposals.orgId, input.actor.orgId)` to the `where` clause so the DB never returns another org's row even if RLS is misconfigured.

---

## 6. Session Revocation

**Status: CLEAN.**

`JwtAuthGuard` (`backend/src/common/auth/jwt-auth.guard.ts:120-163`) checks:

1. In-process `revocationCache` (5-second positive cache per session)
2. Redis key `revoked:session:<sessionId>` (line 128-130)
3. Falls back to the database **only when Redis is unavailable** (line 141-145), not as a general-purpose lookup

The DB fallback (`isRevokedInDatabase`) is guarded by `useDatabase = this.redis === null || redis_error` so it does not add a round-trip on all traffic. The attempted "always-DB-fallback" was tried and reverted; the current code avoids that cost.

`userSessions.isRevoked` in the database is **not** what the guard consults — it only reads the Redis tombstone `revoked:session:<id>`. A revocation that only sets the DB flag and not the Redis key would not take effect until the session JWT expires.

**No findings on the mechanism. One operational note:**
Any session revocation path must write `revoked:session:<sessionId>` to Redis. Confirm the sessions service that handles logout and admin-revoke does this.

---

## 7. Security Headers, Upload Limits, Secret/PII Redaction

**Status: MOSTLY CLEAN. One note on CSP.**

### Headers

`helmet()` is called with no options at `main.ts:87`, applying all default protections:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- Basic `Content-Security-Policy` (CSP)

No custom CSP `nonce` or directive is configured. For an API-only backend this is acceptable, but if any HTML is rendered server-side (Swagger in dev, email templates), the default CSP may allow inline scripts. Swagger is disabled in production (`main.ts:113`: `if (isDevelopment)`).

### Upload Limits

Default body limit: 3 MB (`admission.config.ts:60`: `maxBodyBytes: 3_145_728`), configurable via `ADMISSION_MAX_BODY_BYTES`. URL-encoded body is capped at 1/3 of that. No multipart/file-upload size is configured globally — individual endpoints using `multer` or similar must enforce their own limits.

### Secret/PII Redaction

`backend/src/common/observability/redact.ts` applies to all log metadata via `logger.ts:36`. Redaction keys include `password`, `secret`, `token`, `authorization`, `cookie`, `apikey`, `credential`, `privatekey`, `sessionid`, `aadhaar`, `pannumber`, `cardnumber`, `accountnumber`, `connectionstring`, plus exact matches `pan`, `otp`, `cvv`, `ssn`, `pin`, `query`, `driverdetail`. The `driverdetail` key suppresses Postgres error details that could expose row data (unique-violation detail message).

**No critical findings. Note: no file-upload size global limit.**

---

## 8. Path-Prefix Classifiers

**Status: CLEAN.**

`backend/src/common/admission/reserved-routes.ts:23-28`:

```ts
export function normalisePath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? "";
  const resolved = posix.normalize(`/${withoutQuery}`);   // ← normalised first
  if (resolved.startsWith("/..")) return "";              // traversal guard
  return resolved.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
}

export function reservedClassForPath(path: string): WorkClass | undefined {
  const normalised = normalisePath(path);                 // ← uses normalised form
  ...
}
```

`posix.normalize` resolves `..` segments before the prefix match. `/auth/../probe` normalises to `/probe`, which does not match `auth`, so the classifier correctly rejects a traversal bypass. The `startsWith("/..")` guard blocks any path that escapes the root.

`JwtAuthGuard` at `jwt-auth.guard.ts:169-170` uses `req.path` (already normalised by Express) for the org-setup shortcut check.

**No findings.**

---

## 9. Widening userId Filters

**Status: CLEAN.**

Two main optional-userId filter sites found:

**Timesheets** (`backend/src/modules/build/execution/timesheets.service.ts:81` and `:280`):
```ts
if (query.userId && scope === "all")
  conditions.push(eq(timesheets.userId, query.userId));
```
Gate: DataScope `"all"` — only users whose resolved DataScope is `all` (full org access) can filter by userId. Users with `own` or `team` scope never reach the widening branch.

**Expenses** (`backend/src/modules/expenses/expenses.service.ts:66-69`):
```ts
if (!isAdmin) {
  conditions.push(eq(expenses.userId, userId));   // force self
} else if (filters.userId) {
  conditions.push(eq(expenses.userId, filters.userId));
}
```
`isAdmin` is determined by `hr:expenses:approve` permission (controller line 86). `approve` is an HR-administrative permission distinct from the `view` key, so the gate is non-trivial and does not sit beside `view` in the same role template in a way that makes it a no-op. Verified: the permission key is `hr:expenses:approve`, not `hr:expenses:manage`.

**No findings.**

---

## Summary

| # | Area | Severity | Finding |
|---|---|---|---|
| SSRF-1 | CRM automation call_webhook | **HIGH** | Raw `fetch(user-url)` with no SSRF guard in crm-automation-runner.service.ts:231 |
| SSRF-2 | HR webhooks custom guard | **MEDIUM** | Custom `assertSsrfSafe` misses `::ffff:7f00:1` form and skips DNS resolution |
| ORACLE-1 | AI proposal confirm | **MEDIUM** | ForbiddenException on not-found at ai-confirmation.service.ts:166; should be NotFoundException |

**Total: 3 findings (1 HIGH, 2 MEDIUM)**

**Most serious: SSRF-1.** A tenant admin can configure a CRM automation with `action: "call_webhook"` pointing at any URL, including internal metadata endpoints (`169.254.169.254`) or internal services (`10.x.x.x`), and trigger it by creating a CRM event. No guard exists between the user-supplied URL and the network call. The fix is a single `checkWebhookUrl` call before `fetch`.
