# SPLIT5 — Oversize File Splits

All files that were split are confirmed to have shrunk. `pnpm run check:cycles` passes at zero.

---

## Splits completed

### 1. CRM support/CE dashboard split (abandoned-split repair)

`backend/src/modules/crm/core/crm-support-dashboard.service.ts`
- Before: 549 lines (contained BOTH support and CE dashboard code — the previous lane created `crm-ce-dashboard.service.ts` but never trimmed the original)
- After: 312 lines — `getCustomerExecutiveDashboard`, `buildCe`, and associated imports removed; only `getSupportDashboard`, `buildSupport`, `computeTrend` remain
- `crm-ce-dashboard.service.ts`: 261 lines (unchanged, already correct)
- `crm-dashboards.controller.ts`: fixed routing bug where `GET /crm/customer-executive` called `this.supportDashboard.getCustomerExecutiveDashboard()` — corrected to `this.ceDashboard.getCustomerExecutiveDashboard()`

### 2. Cron platform controller split

`backend/src/modules/cron/cron-platform.controller.ts`
- Before: 584 lines
- After: 345 lines — 7 notification-related cron groups extracted

`backend/src/modules/cron/cron-notifications.controller.ts` (NEW)
- 250 lines — holds: notification-time-sweeps, notification-digest-flush, notification-outbox-flush, notifications-retention-sweep, notifications-retention-detach, chat-reply-reminders, notification-delivery-flush
- Registered in `cron.module.ts` controllers array

### 3. Timesheets reports service split

`backend/src/modules/timesheets/core/reports.service.ts`
- Before: 578 lines
- After: 177 lines — keeps `getOverview` + `getUtilization` (also called by `timesheets-ai.service.ts`)

`backend/src/modules/timesheets/core/timesheet-analytics.service.ts` (NEW)
- 358 lines — holds `getClientProfitability`, `getCompliance`, `getApprovalSla`, `getBillingLeakage`
- Registered as provider in `timesheets-core.module.ts`

`backend/src/modules/timesheets/core/reports.controller.ts`
- Before: 77 lines
- After: 81 lines — injects both `ReportsService` and `TimesheetAnalyticsService`; routes the 4 analytics endpoints to the new service

### 4. Inventory products page split

`frontend/app/(authenticated)/inventory/products/page.tsx`
- Before: 634 lines
- After: 423 lines — `formatPrice`, `StatusBadge`, `StockBadge`, `TrackingBadge`, `ProductRowActions` extracted

`frontend/features/inventory/components/product-row-actions.tsx` (NEW)
- 227 lines — the 5 extracted components/helpers; all exports named

### 5. Stock movements page split

`frontend/app/(authenticated)/inventory/stock/movements/page.tsx`
- Before: 551 lines
- After: 360 lines — static constants, cell renderers, and `MOVEMENTS_COLUMNS` extracted

`frontend/features/inventory/components/stock-movements-columns.tsx` (NEW)
- 211 lines — `TXN_TYPE_CONFIG`, `ALL_TXN_TYPES`, `DatePreset`, `getDateRange`, `isDatePreset`, `isTransactionTypeOrAll`, `isDirectionOrAll`, `MOVEMENTS_COLUMNS`; all exports named

---

## Cohesive catalog exceptions (NOT split — recorded only)

| File | Lines | Reason |
|---|---|---|
| `backend/src/modules/notifications/notification-events.catalog.ts` | 1054 | Every entry uses the `notificationEvent(...)` factory; sub-imports CHAT and BUILD catalogs — genuine cohesive catalog |
| `frontend/components/automations/automation-trigger-data.ts` | 605 | Flat `TriggerMeta[]` where every entry has identical structure — genuine cohesive catalog |
| `backend/src/modules/rbac/role-templates.constants.ts` | 584 | Role template registry — all entries same shape, splitting would serve no purpose |

---

## Skipped (tightly coupled, safe split not achievable without net size increase)

- `backend/src/modules/timesheets/core/approvals.service.ts` (590 lines): extracting `listApprovals` alone only gets to ~503 lines; the remaining write operations share private helpers that cannot be moved without a cross-service call
- `backend/src/modules/organization/core/org-lifecycle.service.ts` (653 lines): all public methods share the same private lifecycle helpers
- `backend/src/modules/organization/core/invitations.service.ts` (634 lines): `inviteAuthorized` private helper is called by both `invite` and `bulkInvite`; cohesive invitation lifecycle
- `backend/src/modules/crm/import/crm-import.service.ts` (1234 lines): verbose JSDoc comments account for ~40% of the file; even a clean split leaves both halves above 500 lines

---

## Verification

- `pnpm run check:cycles` in `backend/`: **✔ No circular dependency found** (4666 files, 0 cycles)
- All new Nest services registered as module providers before confirming done
- No `import type` used on injected Nest services
- No `forwardRef` introduced
- Each original file confirmed to have shrunk (grep verified removed symbols absent)
- Lint/tests: not run per instructions
