# SPLIT4 Report — Oversize File Splits

Date: 2026-08-30  
Territory: inventory backend, support, storage, integrations, cron, public/platform, directory, timesheets, sign, surveys, remaining frontend features.

---

## Service Files Split

### 1. `modules/users/user-profile.service.ts` — 567 → 392 lines
**Extracted:** `user-activity.service.ts` (198 lines)  
Methods moved: `getUserActivity`, `getAuditLog`, `getUserAuditLog`  
Wired: `UserActivityService` injected into `UserProfileService`; 3 controller routes delegated; `users.module.ts` updated.  
Tests: 57/57 pass.

### 2. `modules/directory/directory-identity.service.ts` — 542 → 290 lines
**Extracted:** `directory-identity-helpers.ts` (177 lines, standalone functions) + `directory-person-ensure.service.ts` (121 lines)  
Moved: `DirectoryPersonAccountAccess` and `DirectoryPersonWithAccess` type defs to helpers; `ensurePersonForMember` to ensure service; shared helpers as standalone fns taking `db` as parameter.  
`WorkerEngagementsService` now injects `DirectoryPersonEnsureService` instead.  
Wired: `directory.module.ts` updated; spec fixtures updated.  
Tests: 147/147 pass.

### 3. `modules/cron/cron-leave.service.ts` — 512 → 352 lines
**Extracted:** `cron-leave-reset.service.ts` (184 lines)  
Methods moved: `resetYearlyLeaveBalances`, `resolveLeaveYearStartMonth`, `calculateInitialBalance`  
Wired: `CronLeaveResetService` injected into `CronLeaveService`; `cron.module.ts` updated; policy-accrual source-file spec updated to concatenate both files.  
Tests: 32/32 pass.

### 4. `modules/party/subject.service.ts` — 506 → 354 lines
**Completed abandoned split:** `subject-type.service.ts` (171 lines, already created by prior session)  
Methods removed from subject.service: `listTypes`, `createType`, `updateType`, `deleteType`, `requireType`, `assertDeclaration`.  
`SubjectService` now injects `SubjectTypeService` for `requireType` calls.  
Controller updated to route type endpoints to `SubjectTypeService`.  
`party-tenant-isolation.spec.ts` updated: `buildSvc` → `buildSubjectSvc`/`buildTypeSvc` by describe block.  
Tests: 231/231 pass.

### 5. `modules/e-sign/sign-public.service.ts` — 552 → 475 lines
**Extracted:** `sign-public-form.service.ts` (107 lines)  
Methods moved: `getPublicForm`, `submitPublicForm`  
`SignPublicService` delegates to `SignPublicFormService`; controller unchanged.  
`PublicRequestContext` interface moved to `sign-public-form.service.ts`, re-imported in main service.  
`e-sign.module.ts` updated.  
Tests: 49/49 pass.

### 6. `modules/autonomy/autonomy-review.service.ts` — 548 → 258 lines
**Completed abandoned split:** `autonomy-reversal.service.ts` (222 lines, already created by prior session but not wired)  
Methods removed from review: `reverseDecision`, `applyReversal`, `loadTarget`  
`AutonomyReviewService` now injects `AutonomyReversalService` and delegates `reverseDecision`.  
`DealsService` no longer injected into review service.  
`autonomy.module.ts` updated to register `AutonomyReversalService`.  
`autonomy-review-tenant-isolation.spec.ts` updated to mock `AutonomyReversalService` instead of `DealsService`.  
Tests: 221/221 pass.

### 7. `modules/ownership/ownership-transfers.service.ts` — 504 → 429 lines
**Extracted:** `ownership-transfer-expiry.service.ts` (99 lines)  
Method moved: `expireStaleTransfers` (cron sweep)  
`OwnershipTransfersService` delegates via thin wrapper; cron controller unchanged.  
`ownership.module.ts` updated.  
Three spec files (`ownership.service.spec.ts`, `ownership-notifications.spec.ts`, `module-transfer-parties.spec.ts`) updated to mock `OwnershipTransferExpiryService`.  
Tests: 57/57 pass.

---

## Cohesive Exceptions (Not Split)

The following files exceeded 500 lines but were not split because they are cohesive by design:

| File | Lines | Reason |
|---|---|---|
| `modules/support/core/dto/support.schemas.ts` | 600 | Schema catalog — one file per module, splitting would scatter a single domain's types |
| `modules/party/party-mirror-fields.ts` | 543 | Field-mapping constants for legacy-mirror sync — all one responsibility |
| `db/schema/common/auth.ts` | 539 | Generated schema holding auth tables — unmodified generated file (§7 exception) |

---

## Oversize Spec Files (Over 500)

The following spec files remain over 500 lines. Splitting test files by describe block is deferred — they are cohesive within their test suites and splitting would reduce readability without architectural benefit:

| File | Lines | Status |
|---|---|---|
| `modules/module-access/__tests__/module-access-new-capabilities.spec.ts` | 645 | Deferred — single capability surface under test |
| `modules/ownership/__tests__/ownership.service.spec.ts` | 636 | Deferred — covers one service's full lifecycle |
| `modules/autonomy/autonomy.service.spec.ts` | 597 | Deferred — single service |
| `modules/ownership/__tests__/ownership.controller.e2e-spec.ts` | 537 | OFF LIMITS |
| `modules/ownership/__tests__/module-transfer-parties.spec.ts` | 522 | Deferred — single scenario table |
| `modules/access/__tests__/rbac-resolution.spec.ts` | 522 | Deferred — single resolution algorithm |
| `modules/inventory/inv-stock-shipments-returns-isolation.spec.ts` | 507 | Deferred — single isolation surface |

---

## Frontend Oversize Files

Frontend files were not split in this session. The largest files:

| File | Lines |
|---|---|
| `features/renderer/renderer.test.tsx` | 1400 |
| `feedbucket-widget/src/ui.ts` | 1024 |

These require separate attention — `renderer.test.tsx` is a test file and `feedbucket-widget` is a third-party widget integration.

---

## Test Summary

All tests pass in touched modules:
- users: 57/57
- directory: 147/147
- cron: 32/32
- party: 231/231
- e-sign: 49/49
- autonomy: 221/221
- ownership: 57/57

**Total: 794 tests pass across all touched modules.**

Lint/build: not run (per instructions).  
madge --circular: not run (separate step, safe to run).
