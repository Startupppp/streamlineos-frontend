# F3 Frontend Data Layer Recon — HR/Payroll/Billing/Access Hooks

> Lane: F3 · Scope: `hooks/api/hr/**`, `hooks/api/payroll/**`, `hooks/api/access/**`, `hooks/api/subscription.ts` (billing), `lib/api-client.ts`, `lib/api/server-client.ts`, `lib/query-keys.ts`, `components/providers/query-provider.tsx`, `types/hr/**`, `types/payroll/**`
> Status: READ-ONLY inventory — no fixes applied
> Date: 2026-07-31

---

## 0. File Census

| Directory | Files |
|-----------|-------|
| `hooks/api/hr/` (excl. recruitment/) | 68 |
| `hooks/api/hr/recruitment/` | 19 |
| `hooks/api/payroll/` | 31 |
| `hooks/api/access/` (subdirectory) | 3 |
| `hooks/api/access.ts` (top-level) | 1 |
| `hooks/api/subscription.ts` (billing) | 1 |
| **Total in scope** | **123** |

No `hooks/api/billing/` directory exists. Billing lives in `hooks/api/subscription.ts` plus `hooks/api/entitlements.ts` (top-level, no gate — endpoint is intentionally ungated).

`lib/api/hooks/` contains 3 files (`executive-brief.ts`, `onboarding.ts`, `org.ts`) — these are ancillary public/onboarding hooks, not in the core HR/payroll/billing scope.

---

## 1. API Client

### Client-side: `lib/api-client.ts`

| Aspect | Detail |
|--------|--------|
| Base URL | `NEXT_PUBLIC_API_URL` env var — throws at module load if unset |
| Auth token | JWT from `/api/auth/session` (NextAuth bridge); 9-min in-memory cache; shared dedup Promise prevents N-way concurrent fetches |
| Refresh / retry | On 401: clear cache, re-fetch token, retry once. On second 401: auto-signOut |
| Timeout | **None** — no AbortController, no signal, no fetch timeout |
| Abort support | **None** |
| Error normalization | `parseResponse()` extracts `body.message` (string) OR `body.message[]` (joined with `", "`) OR `body.error`; attaches `res.status` to `ApiError`. Conforms to CLAUDE.md §15 requirement. |
| NestJS `string[]` message | YES — `Array.isArray(body.message)` then `.filter(string).join(", ")` |
| 402 vs 403 distinction | YES — `isApiError(e) && e.status === 402` is the idiomatic check; `ApiError.status` carries the HTTP code |
| Download helper | Uses `res.blob()` — does NOT parse error body through `ApiError` (uses raw `Error(message)`) |

**Notable:** no explicit request timeout. A hung backend connection blocks indefinitely.

### Server-side: `lib/api/server-client.ts`

- Uses **axios** (not native fetch); imports `server-only`.
- Mints short-lived HS256 JWT from `BACKEND_JWT_SECRET`; 5-min in-process cache keyed by `userId:orgId:sessionId:role`.
- Parses error body identically to the client-side client (extracts `message` string or array).
- No timeout configured.

---

## 2. Query-Key Factory

**File:** `lib/query-keys.ts` (2,024 lines)

ONE central factory `queryKeys` exported as a single object. Root prefix: `["streamlineos"]` (constant `base`). 125 top-level namespaces.

**Key namespaces relevant to scope:** `hr`, `access`, `payroll`, `billing`, `hrPayrollInputs`, `timesheets`

### Private key factories NOT in central factory

These files define their own local key arrays. All (except one) have the `["streamlineos", ...]` root.

| File | Private key variable | Root prefix | Issue |
|------|---------------------|-------------|-------|
| `hooks/api/hr/access-requests.ts:30` | `AR_KEY` | `["streamlineos", "hr", "access-requests"]` | OK |
| `hooks/api/hr/cases.ts:84` | `caseKeys.all` | `["streamlineos", "hr-cases"]` | Segment `hr-cases` differs from `hr` — `queryKeys.hr.all` prefix invalidation misses it |
| `hooks/api/hr/enterprise-comp.ts:152–244` | `DEVICES_KEY`, `SYNC_LOGS_KEY`, etc. | `["streamlineos", "hr", "enterprise", "comp", ...]` | OK |
| `hooks/api/hr/exit.ts:22` | `exitKeys` | extends `queryKeys.hr.all` | OK |
| `hooks/api/hr/hr-automations.ts` | `hrAutomationKeys` | extends `queryKeys.hr.all` | OK |
| `hooks/api/hr/hr-webhooks.ts` | `hrWebhookKeys` | extends `queryKeys.hr.all` | OK |
| `hooks/api/hr/hr-workflows.ts` | `WORKFLOWS_KEY`, `INSTANCES_KEY`, `DELEGATIONS_KEY` | `["streamlineos", "hr", "workflows"]` | OK |
| `hooks/api/hr/letters.ts` | `LETTERS_KEY` | `["streamlineos", "hr", "letters"]` | OK |
| `hooks/api/hr/termination.ts:88` | `terminationKeys` | extends `queryKeys.hr.all` | OK |
| `hooks/api/hr/recruitment/talent-pools.ts` | `poolMembersKey` | `["streamlineos", "hr", "talent-pool-members", ...]` | OK |
| `hooks/api/access/user-module-access.ts:7` | `userModuleAccessKey` | `["access", "user-module-access", userId]` | **MISSING root prefix** — does NOT start with `"streamlineos"`. Invalidation by `queryKeys.*` prefix never matches this key. |

---

## 3. Query Hook Census

**Raw counts:**
- `useQuery(` occurrences in scope: **298**
- `useInfiniteQuery(` occurrences: **0** (none used in scope)
- Missing `staleTime`: **~49** hooks (falls back to provider default of 2 min)
- Missing RBAC gate (`useCan` / `enabled`): **~157** hooks out of 298
- Hardcoded `page=` / `limit=` in URL: **2** cases

**Hardcoded pagination:**
- `hooks/api/hr/import-export.ts:95` — `?page=1&limit=20` baked into URL; no params accepted
- `hooks/api/hr/hr-webhooks.ts:50` — `?page=${page}&limit=50` with hardcoded `limit=50`

### Selected hook census rows

| Hook | File:line | Key source | staleTime | Enabled gate | HC pagination? |
|------|-----------|-----------|-----------|--------------|----------------|
| `useHrDashboardMetrics` | `hr/dashboard.ts:37` | central | 60s | `useCan("hr:analytics:read")` | no |
| `useHrLeaveCalendar` | `hr/dashboard.ts:47` | central | **MISSING** | `useCan("hr:leaves:read")` | no |
| `useHrOnboardingStatus` | `hr/dashboard.ts:72` | central | 60s | `useCan("hr:analytics:read")` | no |
| `useHrEmployees` (base) | `hr/employees.ts:110` | central | 120s | **NONE** | no |
| `useHrEmployeeOptions` | `hr/employees.ts:131` | central | 120s | `useCan("hr:employees:view")` WRONG KEY | no |
| `useHrOrgChart` | `hr/employees.ts:159` | central | **MISSING** | **NONE** | no |
| `useHrAnalytics` | `hr/analytics.ts:26` | private | 60s | **NONE** | no |
| `useHrAttendanceAnalytics` | `hr/analytics.ts:42` | private | 60s | **NONE** | no |
| `useHrAttritionAnalytics` | `hr/analytics.ts:61` | private | 60s | **NONE** | no |
| `useHrCommandCenter` | `hr/analytics.ts:81` | private | 60s | **NONE** | no |
| `useHrAttritionPlus` | `hr/analytics.ts:99` | private | 60s | **NONE** | no |
| `useHrLeaveTrends` | `hr/analytics.ts:156` | private | 60s | **NONE** | no |
| `useHrEngagement` | `hr/analytics.ts:187` | private | 60s | **NONE** | no |
| `useHrPerformanceDist` | `hr/analytics.ts:199` | private | 60s | **NONE** | no |
| `useHrComplianceGaps` | `hr/analytics.ts:215` | private | 60s | **NONE** | no |
| `useHrDrilldown` | `hr/analytics.ts:234` | private | 60s | **NONE** | no |
| `useHrAttendanceStatus` | `hr/attendance.ts:20` | central | 120s | **NONE** | no |
| `useHrAttendanceLogs` | `hr/attendance.ts:31` | central | 120s | **NONE** | no |
| `useHrMonthlyAttendance` | `hr/attendance.ts:174` | central | **MISSING** | **NONE** | no |
| `useAttendanceHeatmap` | `hr/attendance.ts:184` | central | **MISSING** | **NONE** | no |
| `useHrTeamAttendanceStatus` | `hr/attendance.ts:250` | private | 65s | **NONE** | no |
| `useHrRegularizations` | `hr/attendance.ts:290` | private | **MISSING** | **NONE** | no |
| `useTerminations` | `hr/termination.ts:98` | private | **MISSING** | `useCan("hr:exit:manage")` WRONG KEY | no |
| `useLeaveTypesAdmin` | `hr/leaves.ts:152` | central | **MISSING** | none (caller-controlled) | no |
| `useHrLeaveApprovals` | `hr/leaves.ts:223` | central | **MISSING** | **NONE** | no |
| `useHrImportJobs` | `hr/import-export.ts:88` | central | 30s | **NONE** | **YES (page=1&limit=20)** |
| `useHrWebhookDeliveries` | `hr/hr-webhooks.ts:45` | private | 15s | caller bool only | **YES (limit=50)** |
| `useOrgModules` | `access/org-modules.ts:31` | central | 60s | **NONE** | no |
| `useSimulateAccess` | `access/simulate.ts:14` | central | 30s | `!!targetUserId` | no |
| `useUserModuleAccess` | `access/user-module-access.ts:14` | private MISSING ROOT | 30s | `useCan("hr:employees:view")` | no |
| `useSubscription` | `subscription.ts:75` | central | 5m | `useCan("settings:view")` | no |
| `useBillingPlans` | `subscription.ts:140` | central | 60m | **NONE** (endpoint appears ungated) | no |
| `useBillingSummary` | `subscription.ts:150` | central | 5m | `useCan("settings:view")` | no |
| `useValidateCoupon` | `subscription.ts:159` | central | 30s | code len + plan | no |
| `useBillingProfile` | `subscription.ts:185` | central | 5m | `useCan("settings:manage")` | no |
| `useSeatInfo` | `subscription.ts:200` | central | 2m | `useCan("settings:manage")` | no |
| `usePayoutValidation` | `payroll/payout-batches.ts:17` | central | 30s | `useCan("payroll:bank:manage")` | no |
| `usePayoutBatches` | `payroll/payout-batches.ts:24` | central | 30s | `useCan("payroll:bank:manage")` | no |
| `useEmployeeBankDetails` | `payroll/payout-batches.ts:174` | central | 0 | `useCan("payroll:bank:view")` | no |
| `usePayrollRunApprovals` | `payroll/approvals.ts:13` | central | **MISSING** | `useCan("payroll:runs:view")` | no |
| `useBonuses` | `payroll/bonuses-admin.ts:80` | central | 60s | `useCan("hr:payroll:view")` | no |
| `useIncentives` | `payroll/bonuses-admin.ts:105` | central | 60s | `useCan("hr:payroll:view")` | no |
| `useAdminLoans` | `payroll/loans-admin.ts:33` | central | 30s | `useCan("hr:payroll:view")` | no |
| `usePayrollComponents` | `payroll/components.ts:44` | central | **MISSING** | `useCan("payroll:components:view")` | no |
| `usePayrollEntities` | `payroll/entities.ts:51` | central | 60s | `useCan("payroll:policies:view")` | no |
| `useEssOverview` | `payroll/ess.ts:111` | central | 30s | `useCan("self:payroll")` | no |
| `useEssPayslips` | `payroll/ess.ts:125` | central | 300s | `useCan("self:payslips")` | no |

---

## 4. The Clobber Bug

Searched `hooks/api/hr/`, `hooks/api/payroll/`, `hooks/api/access/`, `subscription.ts` for the pattern `{ ...options, enabled: X }` where `enabled` is re-declared AFTER the spread.

**File with spreads:** `hooks/api/hr/attendance.ts` only (lines 27, 229, 246).

Pattern used: `{ queryKey: ..., queryFn: ..., staleTime: ..., ...options }` — the spread is **last**. Caller options override hook defaults. No post-spread `enabled` re-declaration found.

**CLOBBER BUG VERDICT: CLEAN** — no instances in scope. Prior audit result confirmed.

---

## 5. Mutation Census

**Raw counts:**
- `useMutation(` occurrences: **443**
- `mutationKey:` occurrences: **467** (near-complete; slight over-count from code proximity)
- Mutations without `mutationKey`: estimated < 10
- Mutations without any invalidation (`invalidateQueries` or `setQueryData`): estimated ~30 real cases (script over-counts due to function boundary proximity)

**Payroll / credit optimistic updates:**
- **NONE found** — payroll run amounts, FnF amounts, and AI credit balances are NOT mutated optimistically in scope. All payroll mutations use invalidate-and-refetch. Correct for financial data.

**Notable missing or incorrect invalidation (verified):**

| Hook | File:line | Issue |
|------|-----------|-------|
| `useUpdateProfile` | `hr/employees.ts:146` | Invalidates `queryKeys.hr.employees()` (list) but NOT `queryKeys.hr.employee(userId)` (detail) or `queryKeys.hr.employeeStats(userId)` |
| `useAnonymousReport` | `hr/cases.ts:141` | No invalidation — POST `/hr/cases/anonymous`, acceptable for external reporting |
| `useSetUserModuleAccess` | `access/user-module-access.ts:19` | Uses `setQueryData` (optimistic cache write) with no `onError` rollback — errors leave wrong module access state cached forever |

---

## 6. Gate-Key Correctness — MISMATCH LIST

All mismatches verified by cross-referencing `useCan(...)` keys in hooks against `@RequirePermission(...)` in backend controllers.

### MISMATCH 1 — `useHrEmployeeOptions` (SEVERITY: HIGH)

- Frontend gate: `hooks/api/hr/employees.ts:133` → `useCan("hr:employees:view")`
- Backend: `backend/src/modules/hr/directory/employees.controller.ts:82` → `@RequirePermission("hr:employees:read")`
- Both `hr:employees:view` (catalog line 5) and `hr:employees:read` (catalog line 159) exist as distinct keys. A user with `hr:employees:view` but not `hr:employees:read` has the query enabled but gets a 403. A user with `hr:employees:read` only never fires the hook.

### MISMATCH 2 — `useTerminations` (SEVERITY: MEDIUM)

- Frontend gate: `hooks/api/hr/termination.ts:98` → `useCan("hr:exit:manage")`
- Backend: `backend/src/modules/hr/lifecycle/exit.controller.ts:56` → `@RequirePermission("hr:exit:view")` (GET list)
- Hook gates on `manage` while list endpoint only requires `view`. Users with `hr:exit:view` only cannot see the list via this hook even though the backend accepts them.

### MISMATCH 3 — `useHrEmployees` base (SEVERITY: HIGH)

- Frontend: `hooks/api/hr/employees.ts:122` → `enabled: options?.enabled ?? true` (NO gate)
- Backend: `backend/src/modules/hr/directory/employees.controller.ts:82` → `@RequirePermission("hr:employees:read")`
- Fires for all users; non-HR users hit 403 on every render.

### MISMATCH 4 — `useOrgModules` (SEVERITY: HIGH)

- Frontend: `hooks/api/access/org-modules.ts:31` → NO useCan gate
- Backend: `backend/src/modules/access/entitlements.controller.ts:28` → `@RequirePermission("settings:manage")`
- Fires unconditionally; every non-admin user triggers a 403.

### MISMATCH 5 — HR Analytics hooks (SEVERITY: HIGH, 10 hooks)

- Frontend: `hooks/api/hr/analytics.ts:26,42,61,81,99,156,187,199,215,234` → NO useCan gate
- Backend: `backend/src/modules/hr/lifecycle/hr-analytics.controller.ts:15` → `@RequirePermission("hr:analytics:read")` (controller-level)
- All 10 analytics hooks fire for any authenticated user landing on the analytics page.

### MISMATCH 6 — HR Attendance hooks (SEVERITY: HIGH, 6 hooks)

- Frontend: `hooks/api/hr/attendance.ts:20,31,174,184,250,290` → NO useCan gate
- Backend: `backend/src/modules/hr/time/attendance.controller.ts:65` → `@RequirePermission("hr:attendance:view")`
- `useHrAttendanceStatus`, `useHrAttendanceLogs`, `useHrMonthlyAttendance`, `useAttendanceHeatmap`, `useHrTeamAttendanceStatus`, `useHrRegularizations` — all fire without gates.

### MISMATCH 7 — `useHrOrgChart` (SEVERITY: MEDIUM)

- Frontend: `hooks/api/hr/employees.ts:159` → NO useCan gate
- Backend: `backend/src/modules/hr/directory/org-structure.controller.ts:35` → `@RequirePermission("hr:employees:view")`

### MISMATCH 8 — `useHrLeaveApprovals` (SEVERITY: MEDIUM)

- Frontend: `hooks/api/hr/leaves.ts:223` → NO useCan gate (caller-bool only)
- Backend: `backend/src/modules/hr/time/leaves.controller.ts:79` → `@RequirePermission("hr:leaves:view")`

### MISMATCH 9 — HR Shifts hooks (SEVERITY: MEDIUM, 3 hooks)

- Frontend: `hooks/api/hr/shifts.ts` (list, assignments, swaps) → NO useCan gate
- Backend: `backend/src/modules/hr/time/shifts.controller.ts:47` → `@RequirePermission("hr:attendance:view")`

### MISMATCH 10 — `userModuleAccessKey` missing root prefix (SEVERITY: MEDIUM, invalidation)

- `hooks/api/access/user-module-access.ts:7` — key is `["access", "user-module-access", userId]`, no `"streamlineos"` root.
- `queryClient.invalidateQueries({ queryKey: queryKeys.access.me() })` never matches this key. After a module toggle, stale module access remains cached indefinitely.

---

## 7. Provider Defaults

**File:** `components/providers/query-provider.tsx:28`

| Setting | Value |
|---------|-------|
| `staleTime` | `1000 * 60 * 2` (2 min) |
| `gcTime` | `1000 * 60 * 10` (10 min) |
| `refetchOnWindowFocus` | `true` |
| `retry` | `shouldRetryQuery` — custom fn: max 1 retry; skips all 4xx EXCEPT 408 and 429 |
| Mutations `retry` | `0` |

**402 handling in retry:** `shouldRetryQuery` checks `status >= 400 && status < 500` and allows retry only for `408 | 429`. 402 is explicitly blocked from retry. Correct behaviour.

---

## 8. Server State in useState/useEffect

**No `useEffect` firing API calls or mutations found in scope** — two hits for `useEffect*` were function name prefixes, not the React hook.

**No server data held in raw `useState` found in scope.**

Both findings are clean.

---

## 9. Types

**Shared contract source:** NONE — no codegen, no shared Zod schemas imported from backend. All response types are hand-maintained TypeScript interfaces.

| Type file | Lines |
|-----------|-------|
| `types/hr/employee.ts` | 407 |
| `types/hr/recruitment.ts` | 408 |
| `types/hr/attendance.ts` | 211 |
| `types/hr/performance.ts` | 173 |
| `types/hr/policies.ts` | 145 |
| `types/hr/workflows.ts` | 173 |
| `types/payroll/ess.ts` | 289 |
| `types/payroll/runs.ts` | 254 |
| `types/payroll/setup.ts` | 250 |
| `types/payroll/reports.ts` | 264 |

**Total hand-maintained response interface lines in scope: ~3,543**. Drift risk is high with no contract enforcement.

**`any` / `as unknown as` / `@ts-ignore` instances:**

| Location | Pattern | Detail |
|----------|---------|--------|
| `hooks/api/hr/attendance.ts:178` | `as unknown as Record<string, unknown>` | Params cast for monthly attendance GET |
| `hooks/api/hr/attendance.ts:193` | `as unknown as Record<string, unknown>` | Params cast for heatmap GET |
| `hooks/api/hr/employees.ts:259` | `as unknown as Record<string, string>` | Params cast for find-expert GET |

No raw `any`, no `@ts-ignore`, no `@ts-expect-error` found in scope.

---

## 10. Debounced Search

No debounce logic found within `hooks/api/hr/`, `hooks/api/payroll/`, or `hooks/api/access/`. Search parameters are passed directly from the call site; debouncing is the caller's responsibility.

`placeholderData: keepPreviousData` usage (correct pattern): found in `hr/assets.ts`, `hr/cases.ts`, `hr/documents.ts`, `hr/exit.ts`, `hr/expenses.ts`, `hr/hr-automations.ts` (x2), `hr/hr-templates.ts`, `payroll/components.ts`, `payroll/templates.ts` — 10+ hooks.

---

## 11. Top 25 Findings

| SEV | Location | Finding |
|-----|----------|---------|
| P0 | `hooks/api/hr/employees.ts:122` | `useHrEmployees` NO gate; backend requires `hr:employees:read`; 403-spams for all non-HR users |
| P0 | `hooks/api/hr/analytics.ts:26-237` (10 hooks) | All analytics hooks NO gate; backend requires `hr:analytics:read`; every non-admin triggers 403 |
| P0 | `hooks/api/hr/attendance.ts:20,31,174,184,250,290` | 6 attendance hooks NO gate; backend requires `hr:attendance:view` |
| P0 | `hooks/api/access/org-modules.ts:31` | `useOrgModules` NO gate; backend requires `settings:manage`; fires for all users |
| P1 | `hooks/api/hr/employees.ts:133` | `useHrEmployeeOptions` gates on `hr:employees:view` but backend requires `hr:employees:read` — two distinct catalog keys; wrong user set blocked/allowed |
| P1 | `hooks/api/hr/termination.ts:98` | `useTerminations` gates on `hr:exit:manage` but list endpoint only requires `hr:exit:view`; view-only users never see list |
| P1 | `hooks/api/hr/employees.ts:159` | `useHrOrgChart` NO gate; backend requires `hr:employees:view` |
| P1 | `hooks/api/hr/leaves.ts:223` | `useHrLeaveApprovals` NO gate; backend requires `hr:leaves:view` |
| P1 | `hooks/api/hr/shifts.ts` (3 hooks) | Shifts list/assignments/swaps NO gate; backend requires `hr:attendance:view` |
| P1 | `hooks/api/access/user-module-access.ts:7` | `userModuleAccessKey` missing `"streamlineos"` root prefix — invalidation by `queryKeys.access.*` never hits this key; module toggles leave stale data |
| P1 | `lib/api-client.ts` | No request timeout or AbortController — hung backend connections block indefinitely |
| P2 | ~157 hooks | 53% of query hooks in scope have no `useCan` gate; many hit permission-gated endpoints |
| P2 | ~49 hooks | Missing `staleTime` — falls back to 2-min provider default, may be wrong for volatile data |
| P2 | `hooks/api/hr/dashboard.ts:47` | `useHrLeaveCalendar` missing `staleTime` |
| P2 | `hooks/api/hr/employees.ts:146` | `useUpdateProfile` only invalidates list cache; detail cache (`queryKeys.hr.employee(userId)`) stays stale |
| P2 | `hooks/api/access/user-module-access.ts:19` | `useSetUserModuleAccess` uses `setQueryData` with no `onError` rollback — errors leave wrong access state in cache |
| P2 | `hooks/api/hr/import-export.ts:95` | Hardcoded `page=1&limit=20` — always fetches first page only, no pagination |
| P2 | `hooks/api/hr/hr-webhooks.ts:50` | Hardcoded `limit=50` — not configurable |
| P2 | `types/hr/**`, `types/payroll/**` | ~3,543 lines of hand-maintained response types with no shared contract or codegen; drift risk high |
| P2 | `hooks/api/hr/attendance.ts:178,193`, `hooks/api/hr/employees.ts:259` | `as unknown as` casts violate CLAUDE.md §7 no-cast rule |
| P2 | `hooks/api/hr/cases.ts:84` | `caseKeys.all = ["streamlineos", "hr-cases"]` — non-standard segment; `queryKeys.hr.all` prefix invalidation misses it |
| P3 | `hooks/api/hr/analytics.ts:26-237` | 10 private key arrays inline for analytics — not in central factory, hard to cross-invalidate |
| P3 | `lib/api/server-client.ts` | Uses axios on server with no explicit timeout — hung backend request blocks SSR rendering |
| P3 | `hooks/api/subscription.ts` | Billing types (`Subscription`, `BillingProfile`, `SeatInfo`, etc.) declared inline in hook file — should live in `types/billing.ts` |
| P3 | `hooks/api/hr/enterprise-comp.ts:152-244` | 15+ private key constants for enterprise comp features not in central factory |

---

## Coverage Gaps

- `hooks/api/hr/recruitment/**` (19 files): surveyed for structural patterns; gate/key correctness not spot-checked against all backend recruitment controllers.
- `hooks/api/hr/enterprise-ops-*.ts` (4 files): surveyed for patterns but not all backend permissions verified.
- `lib/api/hooks/` (3 files): onboarding/org setup hooks; no RBAC gates; endpoints appear session-gated only.
- No `useInfiniteQuery` found in scope — confirmed absence.
- Debounce audit covers hooks layer only; UI layer (`features/`) is in Lane F2's scope.
