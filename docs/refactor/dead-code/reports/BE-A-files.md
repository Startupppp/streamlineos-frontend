# BE-A-files dead-code report

Agent: **BE-A-files** | Repo: `backend/` | Date: 2026-08-01

All five proof steps were applied to both repos (`frontend/` and `backend/`):
symbol grep · path grep · bare side-effect import grep · string reference grep · re-export chain.

---

| candidate | verdict | evidence |
|---|---|---|
| `src/modules/auth/totp.util.ts` | DELETED | `decryptTotpSecret` and `verifyTotpCode` — 0 symbol refs in backend or frontend. 0 path refs to `totp.util` (excluding knip/candidates files). No side-effect import. Auth module does not register it. `auth.controller.e2e-spec.ts` does not reference it. |
| `src/modules/cron/cron-leave-policy.ts` | DELETED | `LEAVE_POLICY`, `DEFAULT_LEAVE_TYPES`, `calculateProratedCasualLeaves`, `resolveInitialBalance` — 0 code refs anywhere. Not in `cron.module.ts` providers. `cron-leave-policy-accrual.spec.ts` does NOT import this file; it reads `cron-leave.service.ts` via `readFileSync` and asserts the service does NOT use hardcoded constants. `cron-leave.service.ts` confirmed: no import from this file. |
| `src/modules/automation/ai-workflow-nodes/index.ts` | DELETED | Barrel re-exporting `AiNodeExecutorService`, `WorkflowAiNodeHandler`, Zod schemas, and types from `ai-node-types.ts`. All live callers (`automation.service.ts`, `automation.module.ts`, `automation.service.spec.ts`, `ai-node-executor.service.spec.ts`) import via deep paths (`./ai-workflow-nodes/ai-node-executor.service`, `./ai-workflow-nodes/ai-job-handlers/workflow-ai-node.handler`), never via `./ai-workflow-nodes` (the barrel). 0 directory-path imports. 0 side-effect imports. The barrel file is dead; the files it re-exports are live. |
| `src/modules/expenses/dto/expense-lifecycle.schemas.ts` | DELETED | `submitExpenseSchema`, `extendedStatusSchema`, `ALL_EXPENSE_STATUSES`, `AllExpenseStatus`, `SubmitExpenseInput`, `ExtendedStatusInput` — 0 refs anywhere. `expenses.controller.ts` imports from `dto/expense.schemas` (not this file). `expense-lifecycle.service.ts` does not import from this file. No path ref to `expense-lifecycle.schemas`. |
| `src/modules/hr/lifecycle/crypto.helpers.ts` | DELETED | `decrypt` — 0 imports anywhere in the codebase. `hr/core/hr-sensitive.service.ts` imports `decrypt` from `../onboarding/core/crypto.helpers` (not this file). This file is a decrypt-only, fail-open duplicate: same `aes-256-gcm`, `IV_LENGTH=12`, `TAG_LENGTH=16`, `PREFIX="enc:v1:"` as the live `hr/onboarding/core/crypto.helpers.ts`, but with a weaker key-missing guard (returns plaintext instead of throwing). Protocol permits deletion: proven duplicate of a live helper. Note: the "encryption-fails-open P0" in memory refers to the LIVE `onboarding/core/crypto.helpers.ts`'s `encrypt()` function — not this dead file. |
| `src/modules/hr/performance/ability.helpers.ts` | DELETED | `canManagePerformance` and `canManageDocuments` — 0 imports from this file. `performance.controller.ts:311` defines its own `private async canManagePerformance()` method (not an import). `documents.controller.ts` does not reference `canManageDocuments`. The only `ability.helpers` import in the codebase is `hr/directory/employee-mutations.service.ts:23: import { userCan } from "./ability.helpers"` which resolves to the DIFFERENT file `hr/directory/ability.helpers.ts`. |
| `src/modules/hr/config/dto/competencies.schemas.ts` | DELETED | `skillListQuerySchema`, `createSkillSchema`, `certificationListQuerySchema`, `createCertificationSchema` and derived types — 0 refs anywhere in backend or frontend. No `hr-competencies.controller.ts` exists in `hr/config/`. The `hr/performance/kpis.controller.ts` handles competency framework endpoints but via schemas in `hr/performance/dto/kpis.schemas.ts`, not this file. |
| `src/modules/hr/time/dto/biometric.schemas.ts` | DELETED | `createBiometricDeviceSchema`, `updateBiometricDeviceSchema`, `CreateBiometricDeviceInput`, `UpdateBiometricDeviceInput` — 0 refs anywhere. `biometric.controller.ts` defines its own inline schemas (`createDeviceSchema`, `updateDeviceSchema`) and does not import from this file. |
| `src/modules/hr/time/dto/geofencing.schemas.ts` | DELETED | `createGeofenceSchema`, `updateGeofenceSchema`, `CreateGeofenceInput`, `UpdateGeofenceInput` — 0 refs anywhere. `geofencing.controller.ts` defines its own inline schemas (`createZoneSchema`, `updateZoneSchema`) and does not import from this file. |
| `src/modules/hr/time/dto/rosters.schemas.ts` | DELETED | `createRosterSchema`, `upsertRosterEntrySchema`, `CreateRosterInput`, `UpsertRosterEntryInput` — 0 refs anywhere. `rosters.controller.ts` defines its own inline schemas (`createRosterSchema`, `upsertRosterEntrySchema`) and does not import from this file. |

---

## Summary

| verdict | count |
|---|---|
| DELETED | 10 |
| KEPT | 0 |
| REPORT | 0 |

**Total: 10 deleted, 0 kept, 0 report.**

### Notable findings

- **Three hr/time dto files** (`biometric`, `geofencing`, `rosters`) were superseded by inline schemas defined directly in their controllers, violating CLAUDE.md §7 ("Zod schemas live in dedicated `*-schema.ts` files") but making the schema files dead.
- **`ai-workflow-nodes/index.ts`** is a barrel whose underlying files are all live — only the barrel itself is dead (all callers use deep paths). Deleting the barrel does not affect the individual files.
- **`hr/lifecycle/crypto.helpers.ts`** was flagged as a potential encryption-fix pending security code per zone warning. Verified: it is a decrypt-only inferior duplicate of `hr/onboarding/core/crypto.helpers.ts`'s `decrypt` function, wired nowhere.
- **`cron-leave-policy.ts`**: the spec `cron-leave-policy-accrual.spec.ts` actively asserts the cron service does NOT use this file's hardcoded constants — confirming the file is intentionally retired.
