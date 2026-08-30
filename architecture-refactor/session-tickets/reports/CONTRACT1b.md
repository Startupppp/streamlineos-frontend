# CONTRACT1b — OpenAPI Contract Coverage

**Date:** 2026-08-30  
**Session type:** Implementation  
**Gate:** `pnpm check:route-classification` → 0 undeclared throughout

---

## Coverage progression

| State | Contracts applied | Operations | Coverage (input-surface) |
|---|---|---|---|
| L69 baseline (session start) | 2,843 | 3,546 | 2,843/2,896 = **98.1%** |
| After CONTRACT1b batch | 2,894 | 3,549 | 2,894/~2,899 = **~99.8%** |

---

## Task 1 — Inline safeParse migration

### crm-ai.controller.ts — `scoreLead`
- Added `scoreLeadBodySchema = z.union([scoreLeadBatchSchema, scoreLeadSingleSchema])` at module scope.
- Added `@Validate({ body: scoreLeadBodySchema })` to `scoreLead`.
- Handler still dispatches to the branch-specific schema internally (double-parse is safe; body is already validated).
- **Response shape: no change.** Both paths previously threw `ZodError` caught by `AllExceptionsFilter` → 400. `@Validate` follows the same path.

### storage-onboarding.controller.ts — `upload`
- Added `uploadBodySchema = z.object({ type: onboardingDocTypeSchema })` at module scope.
- Added `@Validate({ body: uploadBodySchema })` to `upload`.
- **Response shape CHANGES.** Previously: `throw new BadRequestException("Invalid document type")` → `{ statusCode: 400, message: "Invalid document type" }`. After: ZodError via `AllExceptionsFilter` → `{ statusCode: 400, message: [...ZodIssues] }`. Callers relying on the string message must be updated.

### kb-page-ai.controller.ts — `ask`
- Moved from inline `kbAiAskBodySchema.safeParse(body)` + manual throw to `@Validate({ body: kbAiAskBodySchema, params: pageIdParams })`.
- **Response shape CHANGES.** Previously: `throw new BadRequestException("Invalid request body")`. After: ZodError format.
- Handler body simplified: `body` is already typed as `{ question: string }` post-validation.

### kb-article-ai.controller.ts — `ask`
- Same pattern as `kb-page-ai.controller.ts:ask` above.
- **Response shape CHANGES** — same details.

### engagement.controller.ts — `createOrSubmitAssessment` + `createOrRespondSurvey`
- These handlers dispatch on the `x-action` HTTP header. The validation schema varies dynamically (create vs submit path) and is applied inside the service, not the controller.
- **Deferred.** Adding a union body schema for OpenAPI visibility would require importing both schema variants into the controller and building a discriminated union — feasible but out of scope for this batch; the runtime validation is already correct.

---

## Task 2 — Class-level path param blind spots

### Fixed in this session (non-fork scope)

| Controller | Class-level param | Handlers updated |
|---|---|---|
| `deals/deals-stakeholders.controller.ts` | `dealId` | 4 handlers |
| `finance/banking/reconciliation.controller.ts` | `bankAccountId` | 7 handlers |
| `module-access/user-permission-grants.controller.ts` | `moduleKey` + `membershipId` | 3 handlers |
| `storage/storage-vault.controller.ts` | `candidateId` | 1 handler |
| `e-sign/sign-ai.controller.ts` | `envelopeId` | 1 handler |
| `chat/chat-summarize.controller.ts` | `channelId` | 1 handler |
| `chat/chat-pins.controller.ts` | `channelId` | 3 handlers |
| `chat/chat-messages.controller.ts` | `channelId` | 9 handlers |
| `kb/wiki/kb-page-ai.controller.ts` | `pageId` | 4 handlers |
| `kb/help-centre/kb-article-ai.controller.ts` | `articleId` | 4 handlers |
| `hr/recruitment/recruitment-candidate-records.controller.ts` | `candidateId` | 17 handlers |
| `hr/recruitment/recruitment-job-boards.controller.ts` | `jobId` | 4 handlers |
| `hr/recruitment/recruitment-offers.controller.ts` | `candidateId` | 10 handlers |

### Fixed by concurrent fork agent (build module + payroll)

Build module controllers: `bugs`, `test-suites`, `test-cases`, `test-runs`, `risks`, `decisions`, `incidents`, `workflow`, `forms`, `submissions`, `approvals`, `change-requests`, `iterations`, `whiteboard-sharing`, `workspace`, `meetings`, `action-items`, `client-visibility` + payroll payout controllers (`locking`, others).

### Already correct (verified — no changes needed)

- `survey-participants.controller.ts` — all handlers had `surveyIdParams` ✓
- `survey-collectors.controller.ts` — all handlers had composite params ✓
- `survey-assessment.controller.ts` — all handlers had `surveyIdParams` ✓
- `survey-analytics.controller.ts` — all handlers had correct params ✓
- `survey-builder.controller.ts` — all handlers had correct params ✓
- `survey-automation.controller.ts` — all handlers had correct params ✓
- `billing/core/razorpay-webhook.controller.ts` — had `orgIdParams` ✓
- `payroll/runs/inputs.controller.ts`, `exceptions.controller.ts`, `loan-adjustments.controller.ts` — all had correct params ✓
- `payroll/payout/approvals.controller.ts`, `payout-batches.controller.ts`, `locking.controller.ts` — all correct ✓

---

## Task 3 — `GET /accounting/reports/profit-loss` and `GET /accounting/reports/cash-flow`

Root cause confirmed: `profitLossQuerySchema` already applied via `@Query(new ZodValidationPipe(profitLossQuerySchema))` in `accounting-statements.controller.ts`. The empty `{}` schemas in `openapi.json` were stale — the file was last generated before the pipe was added.

Fix: running `pnpm openapi:generate` resolved both operations automatically. No schema changes required.

**Also fixed pre-existing bugs blocking generation:**
- `module-access/dto/module-access.schemas.ts:65` — `z.coerce.number().int().nonneg()` → `.nonnegative()` (Zod 4 renamed)
- `db/schema/build/sprint-events.ts:1` — missing `foreignKey` import from `drizzle-orm/pg-core` + missing `organizationMembers` import

---

## Task 4 — Re-vendor `frontend/contracts/openapi.json`

`pnpm openapi:generate` writes `backend/openapi.json` directly; `frontend/contracts/openapi.json` is updated in the same run.

```
✔  frontend/contracts/openapi.json matches backend/openapi.json
   sha256: 4cc6a251010a889d...
```

Gate passes. SHA changed from `fafbe215` (pre-session baseline) to `4cc6a251`.

---

## Files changed

**Contracts added:**
- `backend/src/modules/ai/core/controllers/crm-ai.controller.ts`
- `backend/src/modules/storage/storage-onboarding.controller.ts`
- `backend/src/modules/kb/wiki/kb-page-ai.controller.ts`
- `backend/src/modules/kb/help-centre/kb-article-ai.controller.ts`
- `backend/src/modules/deals/deals-stakeholders.controller.ts`
- `backend/src/modules/finance/banking/reconciliation.controller.ts`
- `backend/src/modules/module-access/user-permission-grants.controller.ts`
- `backend/src/modules/storage/storage-vault.controller.ts`
- `backend/src/modules/e-sign/sign-ai.controller.ts`
- `backend/src/modules/chat/chat-summarize.controller.ts`
- `backend/src/modules/chat/chat-pins.controller.ts`
- `backend/src/modules/chat/chat-messages.controller.ts`
- `backend/src/modules/hr/recruitment/recruitment-candidate-records.controller.ts`
- `backend/src/modules/hr/recruitment/recruitment-job-boards.controller.ts`
- `backend/src/modules/hr/recruitment/recruitment-offers.controller.ts`

**Pre-existing bugs fixed:**
- `backend/src/modules/module-access/dto/module-access.schemas.ts` (`.nonneg()` → `.nonnegative()`)
- `backend/src/db/schema/build/sprint-events.ts` (missing imports)

**Generated (not hand-edited):**
- `backend/openapi.json`
- `frontend/contracts/openapi.json`

---

## Validation

- `pnpm check:route-classification` → **0 undeclared** (verified before and after every edit batch)
- `pnpm openapi:generate` → succeeds, **2,894 contracts applied**
- `pnpm check:contract-vendor` (from `frontend/`) → **PASSES** (sha256 `4cc6a251`)
- Lint: not run (per session constraint)
- Tests: not run (per session constraint)
