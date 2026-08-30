# SECFIX1 — Security Fix Report

Generated: 2026-08-30

---

## SSRF-1 — CRM automation `call_webhook` action (HIGH)

### Confirmed against source

`backend/src/modules/crm/automation-studio/crm-automation-runner.service.ts` line 231 (pre-fix).  
`case "call_webhook"` fetched `url = String(config["url"] ?? "")` directly with no SSRF check.  
Tenant-supplied URL from automation rule config reached `fetch()` unguarded.

### Fix

File: `backend/src/modules/crm/automation-studio/crm-automation-runner.service.ts`

- Added `import { checkWebhookUrl } from "../../../common/security/ssrf-guard";`
- Before `fetch(url, ...)`: calls `await checkWebhookUrl(url)` and throws `Error("SSRF: webhook URL blocked (<reason>)")` when `!check.allowed`.
- Error is caught by the existing outer `try/catch` in `executeAction` and returned as `{ status: "error", message: "SSRF: ..." }` in the run log — no silent suppression.

### Test

`backend/src/modules/crm/automation-studio/__tests__/webhook-ssrf.spec.ts` — 4 tests.

**Proof it bites:** test "proof — neutering the guard allows fetch to be called for an internal URL" mocks `checkWebhookUrl` to return `{ allowed: true }`, asserts `globalThis.fetch` IS called and step status is "ok". Without the guard, an internal URL reaches `fetch()`. With the guard returning blocked, status is "error" and fetch is never called.

### Test output

```
PASS src/modules/crm/automation-studio/__tests__/webhook-ssrf.spec.ts (10.4 s)
  CrmAutomationRunnerService — call_webhook SSRF guard
    ✓ blocks a request to an internal IP and returns status error (94 ms)
    ✓ proof — neutering the guard allows fetch to be called for an internal URL (2 ms)
    ✓ allows a legitimate external URL to proceed (1 ms)
    ✓ does not call checkWebhookUrl when url is empty (1 ms)
Tests: 4 passed, 4 total
```

---

## SSRF-2 — HR webhooks local `assertSsrfSafe` (MEDIUM)

### Confirmed against source

`backend/src/modules/hr/automations/hr-webhooks.service.ts` lines 23 and 407–417 (pre-fix).  
A module-local `assertSsrfSafe` used `PRIVATE_IP_PATTERN` regex on `parsed.hostname` only. Two holes confirmed:
1. The regex did not cover `::ffff:7f00:1` (IPv4-mapped IPv6 packed form that `new URL()` produces).
2. No DNS resolution — a hostname resolving to 127.0.0.1 passed the check.

### Fix

File: `backend/src/modules/hr/automations/hr-webhooks.service.ts`

- Added `import { checkWebhookUrl } from "../../../common/security/ssrf-guard";`
- Added `BadRequestException` to `@nestjs/common` imports.
- Removed `PRIVATE_IP_PATTERN` constant and the entire `assertSsrfSafe` private method (12 lines deleted).
- `createSubscription`: replaced `this.assertSsrfSafe(input.url)` with `await checkWebhookUrl(input.url)` + throws `BadRequestException` if blocked. Check is BEFORE the DB insert's try block.
- `updateSubscription`: replaced `if (input.url) this.assertSsrfSafe(input.url)` with an async block using `checkWebhookUrl`. Check is BEFORE the DB update's try block.

### Test

`backend/src/modules/hr/automations/__tests__/hr-webhooks-ssrf.spec.ts` — 6 tests.

**Proof it bites:** test "proof — neutering the guard allows insert to proceed for an internal URL" mocks `checkWebhookUrl` to return `{ allowed: true }`, then asserts `mockDb.insert` WAS called — proving the guard is the sole gatekeeper. The blocked-URL test verifies `mockDb.insert` is NOT called.

### Test output

```
PASS src/modules/hr/automations/__tests__/hr-webhooks-ssrf.spec.ts (8.7 s)
  HrWebhooksService — SSRF guard (shared checkWebhookUrl)
    createSubscription
      ✓ throws BadRequestException for an internal URL (44 ms)
      ✓ proof — neutering the guard allows insert to proceed for an internal URL (2 ms)
      ✓ allows a legitimate external URL to proceed (1 ms)
    updateSubscription
      ✓ throws BadRequestException when the new URL is internal (1 ms)
      ✓ proof — neutering the guard allows DB update for an internal URL (2 ms)
      ✓ skips the SSRF check when url is absent in the update input (1 ms)
Tests: 6 passed, 6 total
```

---

## ORACLE-1 — AI confirmation proposal existence oracle (MEDIUM)

### Confirmed against source

`backend/src/modules/ai/confirmation/ai-confirmation.service.ts` line 166 (pre-fix).  
The `confirm` method queried `aiActionProposals` by `id` only (no `orgId` predicate), relying solely on RLS for tenant scope. When no row was returned, it threw `ForbiddenException("Proposal not found")`.

This created an existence oracle: a cross-tenant attacker probing `id` values received `ForbiddenException("Proposal not found")` for non-existent IDs and `ForbiddenException("Actor mismatch")` for IDs that existed in another tenant — two distinguishable 403 responses that confirm record existence.

### Fix

File: `backend/src/modules/ai/confirmation/ai-confirmation.service.ts`

- Added `NotFoundException` to `@nestjs/common` imports.
- WHERE clause changed from `eq(aiActionProposals.id, proposalId)` to `and(eq(aiActionProposals.id, proposalId), eq(aiActionProposals.orgId, input.actor.orgId))` — explicit tenant scope, defense in depth beyond RLS.
- Missing-row branch changed from `throw new ForbiddenException("Proposal not found")` to `throw new NotFoundException("Proposal not found")` — cross-tenant probes and genuine misses both return 404; no oracle.

### Test

`backend/src/modules/ai/confirmation/ai-confirmation.service.spec.ts` — 3 new tests added to existing suite (existing 9 tests preserved, all pass).

**Proof it bites (two-sided):**
1. "proof — bypassing the orgId filter exposes the oracle" uses `buildConfirmDb` (ignores WHERE, always returns row) with `actor.orgId = "org-ATTACKER"`. The service then hits the `row.orgId !== input.actor.orgId` check at line 187 and throws `ForbiddenException` — proving the pre-fix code disclosed existence.
2. "cross-tenant probe with filtered db returns NotFoundException" uses `buildEmptySelectConfirmDb` (respects filter, returns empty) with the same attacker actor. With the fix, the missing-row branch throws `NotFoundException` — no oracle.

The message `"Proposal not found"` does not disclose whether the record exists in another tenant.

### Test output

```
PASS src/modules/ai/confirmation/ai-confirmation.service.spec.ts (9.8 s)
  AiConfirmationService — isolated unit tests
    ✓ propose returns a well-formed token (69 ms)
    ✓ propose -> confirm happy path resolves payload (9 ms)
    ✓ tampered hmac throws ForbiddenException (5 ms)
    ✓ expired proposal throws BadRequestException and sets status EXPIRED (4 ms)
    ✓ wrong actor orgId throws ForbiddenException (19 ms)
    ✓ wrong actor userId throws ForbiddenException (3 ms)
    ✓ double confirm throws ConflictException on second call (6 ms)
    ✓ markExecuted is idempotent — second call returns without error (6 ms)
    ✓ sweepExpired returns count of rows marked EXPIRED (4 ms)
  AiConfirmationService — ORACLE-1 existence oracle fix
    ✓ absent row returns NotFoundException (not ForbiddenException) (3 ms)
    ✓ proof — bypassing the orgId filter exposes the oracle: a cross-tenant hit returns ForbiddenException (actor mismatch) (3 ms)
    ✓ cross-tenant probe with filtered db returns NotFoundException (no oracle) (3 ms)
Tests: 12 passed, 12 total
```

---

## Other call sites — SSRF survey

All production `fetch()` calls with user-supplied or DB-stored URLs were surveyed.

| File | Guard | Status |
|---|---|---|
| `common/http/outbound-request.ts` | `checkWebhookUrl` | ✓ Guarded |
| `modules/webhooks/webhooks-dispatch.service.ts` | `checkWebhookUrl` | ✓ Guarded |
| `modules/inventory/webhooks/webhooks.service.ts` | `checkWebhookUrl` | ✓ Guarded |
| `modules/inventory/webhooks/webhook-emitter.service.ts` | `checkWebhookUrl` | ✓ Guarded |
| `modules/build/core/projects-webhooks-dispatch.service.ts` | `checkWebhookUrl` (via re-export) | ✓ Guarded |
| `modules/chat/chat-link-preview.controller.ts` | `checkWebhookUrl` | ✓ Guarded |
| `modules/feedbucket/feedbucket-ai.service.ts` | hostname allowlist (`allowedHost`) | ✓ Guarded (allowlist) |
| `modules/crm/automation-studio/crm-automation-runner.service.ts` | `checkWebhookUrl` | ✓ Fixed (SSRF-1) |
| `modules/hr/automations/hr-webhooks.service.ts` | `checkWebhookUrl` | ✓ Fixed (SSRF-2) |
| `modules/hr/automations/hr-automation-actions.service.ts` | `assertSafeWebhookUrl` (sync) | ⚠ Weaker guard — no DNS resolution |

**Residual finding (outside this session's scope):** `hr-automation-actions.service.ts:125` uses the synchronous `assertSafeWebhookUrl` (also from `ssrf-guard.ts`), which lacks DNS resolution. A hostname that resolves to an internal IP passes this check. This should be migrated to `checkWebhookUrl` in a follow-up. No second guard was written — this is a migration task within the same shared guard file.

Scripts (`src/scripts/**`) fetch only from `process.env.API` (the configured backend URL) and are not in scope.

---

## Files changed

- `backend/src/modules/crm/automation-studio/crm-automation-runner.service.ts` — SSRF-1 fix
- `backend/src/modules/hr/automations/hr-webhooks.service.ts` — SSRF-2 fix (local guard deleted)
- `backend/src/modules/ai/confirmation/ai-confirmation.service.ts` — ORACLE-1 fix
- `backend/src/modules/crm/automation-studio/__tests__/webhook-ssrf.spec.ts` — new spec (SSRF-1)
- `backend/src/modules/hr/automations/__tests__/hr-webhooks-ssrf.spec.ts` — new spec (SSRF-2)
- `backend/src/modules/ai/confirmation/ai-confirmation.service.spec.ts` — 3 tests added + `NotFoundException` import (ORACLE-1)
