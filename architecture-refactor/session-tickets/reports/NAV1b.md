# NAV1b — Universal Route Gating Report

## Task 1: Three Admin Route Gating

### Icon prop (pre-condition check)

FIXFE1 already removed the invalid `icon` prop from all three pages before this lane ran. No action taken; the pages are correct.

### Catalog key correction

The brief names `home:org-chat-settings:manage` as the required key. That key does not exist in the backend catalog. The correct catalog key is `chat:org-settings:manage` (`backend/src/modules/rbac/permissions/chat.ts:53`). The existing implementation already uses the correct key.

### Frontend gating — all three pages present and correct

Each page calls `enforceRouteAccess(pathname)` which reads the actual request path from headers and resolves through `route-access-extensions.ts`. No route inheritance from the universal parent is possible because the extension registry overrides the match.

| Page | Extension entry | Permission resolved |
|---|---|---|
| `frontend/app/(authenticated)/chat/settings/page.tsx` | `route-access-extensions.ts:134` | `chat:org-settings:manage` |
| `frontend/app/(authenticated)/chat/moderation/page.tsx` | `route-access-extensions.ts:140` | `chat:huddles:moderate` |
| `frontend/app/(authenticated)/calendar/settings/page.tsx` | `route-access-extensions.ts:148` | `calendar:admin:manage` |

All three routes are also captured in `universal-route-matrix.test.ts:129-131` under "no admin descendant of a universal root inherits universal access."

### Backend gating

**`/chat/settings` — `chat-org-settings.controller.ts`**

Class-level: `@UseGuards(JwtAuthGuard, PermissionGuard)`. Two handlers:
- `GET` gated on `chat:channels:read` — intentional; the effective settings (retention, channel defaults) are read-level, not secret. Administrative concern is the write.
- `PATCH` gated on `chat:org-settings:manage` — correct; only org owners/admins hold this key.

`chat:org-settings:manage` exists in `backend/src/modules/rbac/permissions/chat.ts:53` and is outside EMPLOYEE_SELF_SERVICE_GRANTS, confirmed by `home-surfaces-universal.spec.ts` line 111: "keeps chat:org-settings:manage out of the universal set AND out of every grant path, so only the org owner and org admins hold it."

**`/chat/moderation` — `chat-huddles.controller.ts`**

Class-level: `@UseGuards(JwtAuthGuard, PermissionGuard)`. Kick handler at `POST huddles/:huddleId/kick` gated on `chat:huddles:moderate` (`chat.ts:35`). This key is outside EMPLOYEE_SELF_SERVICE_GRANTS, confirmed by `home-surfaces-universal.spec.ts` line 108: "keeps chat:huddles:moderate out of the universal set."

**`/calendar/settings` — no backend handler yet**

`calendar.controller.ts` has no `/calendar/settings` route; the frontend page is a placeholder (EmptyState). Frontend gating via `enforceRouteAccess` is the only layer at present. When the settings API is built it must carry `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermission("calendar:admin:manage")`.

`calendar:admin:manage` exists at `backend/src/modules/rbac/permissions/calendar.ts:29`.

### Route classification check

```
pnpm -C backend check:route-classification
  Total handlers : 3534
  public         : 208
  universal      : 95
  permissioned   : 3184
  in-service     : 47
  UNDECLARED     : 0
RESULT: ALL ROUTES CLASSIFIED
Exit: 0
```

---

## Task 2: Sweep — Universal/Admin Alignment

### Admin routes that are NOT universal (correct)

All entries verified via `universal-route-matrix.test.ts` (10/10 pass):

| Route | Gate | Catalog key exists |
|---|---|---|
| `/chat/settings` | `chat:org-settings:manage` | yes |
| `/chat/moderation` | `chat:huddles:moderate` | yes |
| `/calendar/settings` | `calendar:admin:manage` | yes |
| `/notifications/providers` | `notifications:providers:view` | yes |
| `/notifications/templates` | `notifications:templates:view` | yes |
| `/notifications/events` | `notifications:events:view` | yes |
| `/notifications/policy` | `notifications:policy:view` | yes |
| `/notifications/broadcasts` | `notifications:broadcasts:view` | yes |
| `/knowledge/wiki/settings` | `kb:settings:manage` | yes |
| `/knowledge/wiki/import` | `kb:pages:import` | yes |
| `/knowledge/wiki/analytics` | `kb:analytics:view` | yes |
| `/knowledge/wiki/reviews` | `kb:reviews:view` | yes |
| `/knowledge/wiki/spaces` | `kb:spaces:view` | yes |
| `/knowledge/wiki/templates` | `kb:templates:manage` | yes |
| `/knowledge/wiki/trash` | `kb:pages:purge` | yes |
| `/directory/workers` | `directory:workers:view` | yes |

### Inverse defect found and fixed: `/me/pay` had a gate on a universal surface

**File:** `frontend/components/layout/sidebar/sidebar-nav-groups-payroll.ts`

`/me/pay (My Payroll)` carried `requiredPermission: ["self:payroll", "self:payslips"]`. `/me/pay` is inside the `/me/*` universal subtree (root §8: "every active member keeps... their own pay"). Both `self:payroll` and `self:payslips` are in `EMPLOYEE_SELF_SERVICE` (the MEMBER role defaults), so the gate was vacuous — every member already holds these keys — but it still violated the invariant that universal surfaces carry no `requiredPermission`.

**Fix:** removed `requiredPermission: ["self:payroll", "self:payslips"]` from the nav entry. The route group's own gate (`requiredPermission: ["payroll:runs:view", "payroll:salaries:view", "self:payroll"]` at the group level) is unaffected.

**Sidebar permission coverage test (after fix): 3/3 pass** (was 1 failure before).

```
PASS components/layout/sidebar/sidebar-permission-coverage.test.ts
  sidebar navigation is permission-driven
    √ collects the whole navigation tree
    √ gates every non-universal route on a permission
    √ never gates a universal surface, which every active member keeps
```

No other inverse violations found. Home self-service routes (`/me/attendance`, `/me/time-off`, `/me/expenses`, `/me/documents`, `/me/pay`), communication surfaces (`/mail`, `/chat/channels`, `/calendar`), announcements, referrals, jobs, knowledge reading, notifications inbox, and `/settings` (personal account landing) are all correctly ungated universals.

---

## Task 3: Workers link — product decision required

**Location:** `frontend/components/layout/sidebar/sidebar-home-nav.ts:111-117`

The `/directory/workers` link in Home nav is gated on `directory:workers:view`. This key lives in the HR_ADMIN and BRANCH_HR role templates (not in EMPLOYEE_SELF_SERVICE). The route-access-extension at line 127-130 also gates it at the page level.

### Rule text

Root CLAUDE.md §8 contains two statements that pull in opposite directions:

**Statement 1 (universality claim):**
> "every active member keeps Home, mail, chat, notifications, dashboard, their own time off/attendance/expenses/pay/employment documents, announcements, referrals + internal job openings... **people directory** and KB reading"

**Statement 2 (route ownership claim):**
> "Route ownership is a product contract... **workforce lives at `/directory/workers`**, employee pay is self-service, payroll administration stays under `/payroll/*`"

### Two readings

**Reading A — universal:** "people directory" in statement 1 encompasses the workers list; every member should see their coworkers regardless of whether they are HR admins.

**Reading B — gated (current):** `/directory/workers` surfaces payability and engagement administration data (`is_payee`, engagement type, pay grade, worker record status). The universal "people directory" is the people/contact view at `/directory`; `/directory/workers` is the workforce-governance surface statement 2 explicitly names as non-universal. The route-access-extension reason: "Workforce administration records are not the people directory."

### What the current implementation encodes

Reading B. `directory:workers:view` is held by HR_ADMIN and BRANCH_HR. An ordinary MEMBER cannot access `/directory/workers`.

### Decision needed

Is `/directory/workers` workforce administration (keep gated — reading B) or the canonical coworker directory surfaced under a different URL (make universal — reading A)?

If reading A wins: remove `requiredPermission: "directory:workers:view"` from the nav entry, remove the route-access-extension entry for `/directory/workers`, and remove the backend `@RequirePermission("directory:workers:view")` guards on the list and detail handlers in `directory.controller.ts`.

If reading B stands: no change needed; current state is correct.

---

## Files changed

| File | Change |
|---|---|
| `frontend/components/layout/sidebar/sidebar-nav-groups-payroll.ts` | Removed `requiredPermission: ["self:payroll", "self:payslips"]` from `/me/pay` nav entry |

No backend files changed. Route classification remains at 0 undeclared.

---

## Test results

| Test | Result |
|---|---|
| `pnpm -C backend check:route-classification` | 0 undeclared, exit 0 |
| `backend jest home-surfaces-universal` | 17/17 pass |
| `frontend jest universal-route-matrix` | 10/10 pass |
| `frontend jest sidebar-permission-coverage` | 3/3 pass (was 1 failure before fix) |
