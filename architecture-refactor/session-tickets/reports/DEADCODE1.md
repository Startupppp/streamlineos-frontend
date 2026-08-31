# DEADCODE1 — Dead Code Sweep Report

## Summary

One file deleted. Known lead already resolved. Frontend gate passes at baseline. Backend has no knip tool; deletion proved by import-graph grep.

---

## Known Lead: `dashboard-hr.service.ts`

**Status: ALREADY DELETED — no action taken.**

File does not exist at `backend/src/modules/dashboard/dashboard-hr.service.ts`. The split services (`dashboard-stats.service.ts`, `dashboard-availability.service.ts`, `dashboard-birthdays.service.ts`, `dashboard-personal.service.ts`) are all present, registered in `dashboard.module.ts`, and injected in `dashboard.controller.ts`. The original was removed by a previous lane. Ticket note was stale.

---

## Deleted Files

### `backend/src/modules/payroll/hr-payroll/lib/encryption.ts`

**Proof of death:**

1. `grep -r "from.*lib/encryption|hr-payroll/lib/encryption" backend/src/ --include="*.ts"` — zero import statements found. Only two comments reference the path (in `common/security/secret-encryption.util.ts:5` and `db/schema/billing/payment-providers.ts:59`).
2. No spec file imports from it. No `encryption.spec.ts` exists alongside it.
3. `decryptBankDetails` and `BankDetails` are now exported from `modules/hr/onboarding/core/crypto.helpers.ts` and used by live services (`ess-self-service.service.ts`, `canonical-bank-details.ts`, `hr-sensitive.service.ts`). The `hr-payroll/lib` copy is a subset duplicate — same AES-256-GCM/`enc:v1:` format, fewer fields on `BankDetails`, no Zod validation.
4. `common/security/secret-encryption.util.ts` explicitly documents this file as a "pre-existing duplicate … new code should use this shared copy; those two are not touched here to avoid an unrelated refactor of working code." The payroll lane work is now done and the comment's deferral no longer applies.
5. This file was identified as a candidate in L52 and deferred pending payroll-lane confirmation. The lane is complete.

**Dynamic-import and side-effect check:** File exports only named functions and an interface — no module-level side effects. No `import "./encryption"` bare-import pattern exists anywhere.

---

## Other Candidates Investigated

### `dashboard-hr-events.spec.ts`

Not orphaned. It is a standalone schema-and-SQL-predicate spec that tests `calendarEvents` schema structure and visibility model. It has no dependency on `dashboard-hr.service.ts`; the calendar logic it verifies is live in the unified calendar module. Kept.

### `admission/index.ts` barrel

Barrel with no callers (callers import directly from sub-files). L52 verdict of "false positive — low risk to leave" stands. Kept.

### Retired permission keys (41 keys logged at boot with "cleanup is disabled")

These are DB records, not code files. `PermissionCatalogSyncService.sync()` can delete them when called with `{ cleanupRetired: true }`. The service calls `sync()` without that option on `onModuleInit`, so it only logs a warning. No code file to delete. Not actionable as a dead-code removal.

### Chat cohesive-exception files

`frontend/features/chat/channel-sidebar-cohesive-exception.ts` and `huddle-panel-cohesive-exception.ts` — already deleted from disk (per git status at session start). No remaining references confirmed by grep. Already handled by the S06 lane.

### Backend notification cohesive-exception

`src/modules/notifications/notification-catalog-cohesive-exception.ts` — no longer present. Already removed by a prior lane.

### `auth-google-oauth.service.ts`

Already deleted by L61 (abandoned split; controller never used it; never registered in `auth.module.ts`).

### Frontend portal projects feature

`features/portal/components/portal-project-card.tsx`, `portal-project-detail.tsx`, `portal-header.tsx`, `lib/portal-types.ts` — all imported by the new `app/(portal)/client-portal/page.tsx` and `[projectId]/page.tsx`. Alive.

### `features/payroll/me/`

Still imported by `app/(authenticated)/me/pay/page.tsx`. Alive.

### `features/wiki/components/knowledge-base-page.tsx`

Imported by `app/(authenticated)/knowledge/chat/page.tsx`. Alive.

---

## Gate Exits

| Gate | Result |
|---|---|
| Frontend `pnpm check:dead-code` (files=0 exports=0 baseline) | PASS — files=0 exports=0 |
| Backend knip | NOT AVAILABLE — no knip or check:dead-code in backend |
| Backend dead-code proof method | grep import-graph; zero importers confirmed |

**Backend note:** The backend has no knip binary or `check:dead-code` script. The single deletion was proved by grep import-graph with no hits on the file path or its exported symbols.

---

## Files Changed

- DELETED: `backend/src/modules/payroll/hr-payroll/lib/encryption.ts` (48 lines)
