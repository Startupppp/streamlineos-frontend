# SECFIX2b — Security Fix Report

Generated: 2026-08-30

---

## Task 1 — SSRF-3 residual: `hr-automation-actions.service.ts`

### Finding

`callWebhook` at line 125 used the synchronous `assertSafeWebhookUrl`, which
performs no DNS resolution. A hostname resolving to 127.0.0.1 or to the cloud
metadata endpoint (169.254.169.254) passes the check. The method is already
`async` — there is no context that prevents awaiting.

### Decision on `assertSafeWebhookUrl`

`assertSafeWebhookUrl` is retained in `ssrf-guard.ts`. One caller cannot be
migrated: `webhook.schemas.ts` uses it inside a synchronous Zod `.refine()`.
Zod refinements are synchronous by design; swapping to `checkWebhookUrl` there
would require switching the whole validation to `z.superRefine` with async
semantics, touching the schema pipeline globally. The Zod-level check is an
early schema filter; the full DNS-resolving check at dispatch time
(`webhooks-dispatch.service.ts` is already guarded) provides the real
protection. The sync guard is therefore deliberate for that call site, not a
defect.

### Fix

File: `backend/src/modules/hr/automations/hr-automation-actions.service.ts`

- Import changed from `assertSafeWebhookUrl` to `checkWebhookUrl`.
- `callWebhook` now awaits `checkWebhookUrl(url)` and returns an error result
  when `!check.allowed`, with the rejection reason in the error string.
- The old try/catch around the sync call is gone.

### Test

`backend/src/modules/hr/automations/__tests__/hr-automation-actions-ssrf.spec.ts` — 5 tests.

**Proof it bites:** "neutering the guard (always allowed) allows fetch to reach
an internal URL" — mocks `checkWebhookUrl` to return `{ allowed: true }`,
asserts `globalThis.fetch` is called with the internal URL. With the guard
returning blocked, fetch is never reached.

```
PASS src/modules/hr/automations/__tests__/hr-automation-actions-ssrf.spec.ts
  HrAutomationActionsService — call_webhook SSRF guard (async checkWebhookUrl)
    ✓ blocks an internal URL and returns status error without calling fetch (16 ms)
    ✓ blocks an unresolvable hostname and returns status error (1 ms)
    ✓ allows a legitimate external URL to proceed and calls fetch (3 ms)
    ✓ proof — neutering the guard (always allowed) allows fetch to reach an internal URL (2 ms)
    ✓ calls checkWebhookUrl with the configured URL before any fetch (1 ms)
Tests: 5 passed, 5 total
```

---

## Task 2 — Full outbound egress sweep

### Methodology

Searched all `.ts` files for `fetch(`, `axios`, HTTP client imports, and all
files already touching `checkWebhookUrl` / `assertSafeWebhookUrl` /
`outbound-request`. Classified every outbound call.

### Full egress table

| File | Destination type | Guard | Classification |
|---|---|---|---|
| `common/http/outbound-request.ts` | user-controlled or external | `checkWebhookUrl` (before fetch) | (c) guarded |
| `common/security/turnstile.service.ts` | `https://challenges.cloudflare.com/…` | hardcoded constant | (a) constant |
| `modules/billing/payments/adapters/razorpay.adapter.ts` | `https://api.razorpay.com/v1/orders` | `outboundRequest` (which calls `checkWebhookUrl`) | (a) constant via guarded helper |
| `modules/webhooks/webhooks-dispatch.service.ts` | user-stored webhook URLs | `checkWebhookUrl` | (c) guarded |
| `modules/inventory/webhooks/webhooks.service.ts` | user-stored webhook URLs | `checkWebhookUrl` | (c) guarded |
| `modules/inventory/webhooks/webhook-emitter.service.ts` | user-stored webhook URLs | `checkWebhookUrl` | (c) guarded |
| `modules/build/core/projects-webhooks-dispatch.service.ts` | user-stored webhook URLs | `checkWebhookUrl` (re-export from `webhook-url-guard.ts`) | (c) guarded |
| `modules/chat/chat-link-preview.controller.ts` | user-supplied URL | `checkWebhookUrl` | (c) guarded |
| `modules/feedbucket/feedbucket-ai.service.ts` `resolveScreenshotForVision` | screenshot URL from DB | hostname allowlist (`NEXT_PUBLIC_R2_PUBLIC_URL`) | (b) allowlisted |
| `modules/crm/automation-studio/crm-automation-runner.service.ts` | user-configured webhook URL | `checkWebhookUrl` (SSRF-1, fixed in SECFIX1) | (c) guarded |
| `modules/hr/automations/hr-webhooks.service.ts` | user-stored webhook URL | `checkWebhookUrl` (SSRF-2, fixed in SECFIX1) | (c) guarded |
| `modules/hr/automations/hr-automation-actions.service.ts` | user-configured webhook URL | `checkWebhookUrl` (SSRF-3, fixed this session) | (c) guarded |
| **`modules/automation/automation.service.ts` `deliverWebhook`** | **user-stored webhook URL** | **none (SSRF-4, fixed this session)** | **(d) → now (c)** |
| `modules/email/dispatch/twilio.gateway.ts` | `outboundRequest` | `checkWebhookUrl` via helper | (c) guarded |
| `modules/ingress/adapters/crm-mailbox.service.ts` | Gmail/Outlook via provider services | routes through Composio (no direct fetch) | (a) constant via Composio |
| `modules/ingress/adapters/telephony-call-log.service.ts` | carrier via ComposioGateway | routes through Composio | (a) constant via Composio |
| `modules/ingress/adapters/attachment-store.ts` | provider attachment bytes | fetch callback provided by caller (provider-SDK, not user URL) | (a) constant |
| `modules/support/core/support-reports.service.ts` | no outbound HTTP | — | not applicable |

**Composio gateway note:** third-party connectivity correctly routes through
the backend `integrations` module via `ComposioGateway`. No direct provider
OAuth, no provider tokens stored; `user_integration_connections` mirrors only
the connected-account reference. Platform rule satisfied.

### SSRF-4 fix: `automation.service.ts` `deliverWebhook`

#### Confirmed against source

`deliverWebhook` at line 138 (pre-fix) called `fetch(endpoint.url, ...)` with
no SSRF guard. URLs come from `webhookEndpoints` (user-stored). The
`webhook.schemas.ts` Zod validation uses the sync `assertSafeWebhookUrl` at
creation time (which has no DNS resolution), but there was no runtime guard at
dispatch time.

#### Fix

File: `backend/src/modules/automation/automation.service.ts`

- Added `import { checkWebhookUrl } from "../../common/security/ssrf-guard"`.
- `deliverWebhook` now calls `await checkWebhookUrl(endpoint.url)` before
  building the request body. If blocked, it writes a failed `webhookLogs`
  entry and throws; the outer `Promise.allSettled` catches this as a rejected
  delivery and increments the failure count.

#### Test

`backend/src/modules/automation/__tests__/automation-ssrf.spec.ts` — 5 tests.

**Proof it bites:** "neutering the guard (always allowed) lets fetch reach any
endpoint URL" — mocks `checkWebhookUrl` to `{ allowed: true }`, asserts
`globalThis.fetch` is called with the internal URL. With the guard blocked,
fetch is never reached and a failed log entry is written.

```
PASS src/modules/automation/__tests__/automation-ssrf.spec.ts
  AutomationService — deliverWebhook SSRF guard
    ✓ blocks an internal endpoint URL and does not call fetch
    ✓ writes a failed log entry when SSRF guard blocks the endpoint
    ✓ allows a legitimate external endpoint and calls fetch
    ✓ proof — neutering the guard (always allowed) lets fetch reach any endpoint URL
    ✓ skips dispatch when no active endpoints match
Tests: 5 passed, 5 total
```

---

## Task 3 — Denial-of-wallet audit

Two public/anonymous AI surfaces exist.

### `GET /public/kb/ask` (`KbRagController`)

Decorated `@Public()`. Calls `KbRagService.answerQuestion`.

`answerQuestion` first calls `hasPublishedPublicArticles`. If the org has no
published public articles, it returns a no-context response WITHOUT calling
the LLM gateway. The provider call only fires when there is eligible content.
This satisfies the "short-circuit BEFORE any provider call when there is no
eligible content" requirement.

Rate-limited via `UseRateLimit("ai:public-kb-ask")`.

**No defect.** Credits charged to the org; gateway enforces `quota_exceeded`.

### `POST /public/feedbucket/:publicKey/ai-assist` (`FeedbucketPublicController`)

Decorated `@Public()`. Calls `FeedbucketAiService.analyzePublic`.

- Rate-limited per IP (`feedbucket:ai-assist`) AND per widget daily
  (`feedbucket:ai-assist-daily`).
- Widget must have `aiAssistEnabled: true` (else 404).
- Spends the widget org's own AI credits, not a shared platform budget.
- The gateway enforces `quota_exceeded`, which propagates as
  `InsufficientAiCreditsException` (409) — handled at the controller level.
- The content is always the user's submitted message, so there is no
  "no eligible content" short-circuit needed.

**Soft gap noted:** `analyzePublic` does not call
`planLimits.assertFeature(orgId, "ai.feedbucket")` — the authenticated
`analyze()` path does. An org whose plan no longer includes the feature retains
AI assist on existing widgets until credits run out. This is enforced by the
credit limit, not the feature gate. Leaving as a low-priority hardening item;
it is not a shared-budget DoW exploit.

**No anonymous-to-platform DoW path found.** Both surfaces spend per-org
credits, are rate-limited, and do not reach the provider on absent content.

---

## Task 4 — 403-versus-404 sweep

### Methodology

Searched for `throw new ForbiddenException` in all service files. For each
hit, traced the preceding query to verify whether it included an explicit
`orgId` predicate.

### Findings

**ORACLE-2 — `WorkflowsExecutionService.handleApproval`** (HIGH)

Pre-fix query:
```typescript
const approval = await this.db.query.workflowApprovals.findFirst({
  where: and(
    eq(workflowApprovals.id, approvalId),
    eq(workflowApprovals.approverId, userId),
    eq(workflowApprovals.status, "pending"),
  ),
  with: { execution: { columns: { orgId: true, workflowId: true } } },
});
if (!approval) throw new NotFoundException("Approval not found or already actioned");
if (approval.execution.orgId !== orgId) throw new ForbiddenException("Access denied");
```

The `workflowApprovals` table has no `orgId` column. `approverId` is a global
user id — a user who is a member of two organisations could be the designated
approver in both. The pre-fix query would find the approval regardless of which
org the caller claimed, then distinguish "wrong org" via `ForbiddenException`,
confirming the record's existence to an attacker.

**Safe patterns confirmed (no fix needed):**

- `hr-helpdesk.service.ts` `getById`: WHERE includes `orgId`; not-found → 404;
  confidential-access-denied → 403 (within-tenant permission, not oracle).
- `hr-cases.service.ts` `getById`: WHERE includes `orgId`; same pattern.
- `payroll-ai-explain.service.ts`: WHERE includes `orgId`; 403 is for wrong
  user (self-service, within-tenant).
- `timesheets-ai.service.ts`: delegates to `getPeriodWithUser` which includes
  `orgId`; the secondary ForbiddenException cannot fire for a cross-tenant row.
- All other checked hits: ForbiddenException follows a query already scoped by
  `orgId`, so it is a legitimate within-tenant permission denial.

### Fix — ORACLE-2

File: `backend/src/modules/workflows/workflows-execution.service.ts`

Replaced the `query.findFirst` with an explicit `SELECT … INNER JOIN
workflowExecutions ON (id = executionId AND orgId = ?)`. The INNER JOIN
enforces tenant scope at query time; a cross-tenant probe fails the JOIN,
returns an empty result, and falls into the existing `NotFoundException` branch.
The post-query `ForbiddenException("Access denied")` is removed entirely.
`approval.workflowId` is now projected directly from the join instead of via
`approval.execution.workflowId`.

### Test

`backend/src/modules/workflows/__tests__/workflow-approval-oracle.spec.ts` — 4 tests.

**Proof it bites:** "neutering the orgId JOIN (mock returns cross-tenant row)
exposes absence of ForbiddenException oracle" — mocks the DB to return a
cross-tenant row (bypassing the filter), then asserts that NO
`ForbiddenException` is thrown. With the old code a ForbiddenException would
have been thrown, confirming existence. With the new code, no forbidden path
exists regardless of what the DB returns.

```
PASS src/modules/workflows/__tests__/workflow-approval-oracle.spec.ts
  WorkflowsExecutionService — handleApproval ORACLE-2 existence oracle fix
    ✓ throws NotFoundException for a cross-tenant probe (not ForbiddenException) (29 ms)
    ✓ throws NotFoundException (not ForbiddenException) when approval is not found (2 ms)
    ✓ proof — neutering the orgId JOIN (mock returns cross-tenant row) exposes absence of ForbiddenException oracle (2 ms)
    ✓ processes the approval for the owning org and returns the updated row (5 ms)
Tests: 4 passed, 4 total
```

---

## Combined test run

```
PASS src/modules/automation/__tests__/automation-ssrf.spec.ts (7.7 s)
PASS src/modules/workflows/__tests__/workflow-approval-oracle.spec.ts
PASS src/modules/hr/automations/__tests__/hr-automation-actions-ssrf.spec.ts
Test Suites: 3 passed, 3 total
Tests:       14 passed, 14 total
```

---

## Files changed

### Source

- `backend/src/modules/hr/automations/hr-automation-actions.service.ts` — SSRF-3 fix
- `backend/src/modules/automation/automation.service.ts` — SSRF-4 fix
- `backend/src/modules/workflows/workflows-execution.service.ts` — ORACLE-2 fix

### Tests

- `backend/src/modules/hr/automations/__tests__/hr-automation-actions-ssrf.spec.ts` — new spec (SSRF-3)
- `backend/src/modules/automation/__tests__/automation-ssrf.spec.ts` — new spec (SSRF-4)
- `backend/src/modules/workflows/__tests__/workflow-approval-oracle.spec.ts` — new spec (ORACLE-2)

### Retained unchanged

- `backend/src/common/security/ssrf-guard.ts` — `assertSafeWebhookUrl` kept for Zod sync context in `webhook.schemas.ts`; `checkWebhookUrl` (async, DNS-resolving) is now the canonical guard at all dispatch sites.
