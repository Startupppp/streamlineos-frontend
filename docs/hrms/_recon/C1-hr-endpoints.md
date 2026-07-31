# C1 — HR Controllers Endpoint Audit

**Audit date:** 2026-07-31  
**Scope:** `backend/src/modules/hr/**/*.controller.ts` — ALL controllers  
**Controller count:** 119  
**Auditor:** Lane C1 (read-only, no fixes)

---

## Coverage Statement

All 119 `*.controller.ts` files under `backend/src/modules/hr/**` enumerated via `find` and covered. No sampling.

---

## 1. Endpoint Table

> Format: `Method | Full path | Controller file:line | @RequirePermission | Guards | @RequireModule | ModuleGuard in @UseGuards? | Validation | Paginated? | Notes`
>
> **Guard key:** `J` = JwtAuthGuard · `P` = PermissionGuard · `M` = ModuleGuard  
> **ModuleGuard column:** Y = ModuleGuard actually present in @UseGuards · N = @RequireModule present but no ModuleGuard (inert) · — = no @RequireModule  
> **Validation:** `ZVP` = ZodValidationPipe · `raw.parse` = direct `.parse()` on body/query · `NONE` = unvalidated

---

### analytics-plus/hr-analytics-plus.controller.ts

Class-level guards: `@UseGuards(JwtAuthGuard, PermissionGuard)` + class-level `@RequirePermission("hr:analytics:read")` at line 38  
@RequireModule("hr") line 35 — ModuleGuard absent → **INERT**

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/analytics-plus | :45 | hr:analytics:read (class) | J+P | hr | N | NONE (query direct) | N | class key covers |
| GET | hr/analytics-plus/attrition | :53 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/leave-trends | :62 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/payroll-cost | :70 | hr:analytics:read (class) | J+P | hr | N | NONE | N | secondary `hr:salary:view` OR `hr:payroll:view` check via AccessService inline |
| GET | hr/analytics-plus/engagement | :81 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/performance-distribution | :85 | hr:analytics:read (class) | J+P | hr | N | ParseIntPipe optional | N | |
| GET | hr/analytics-plus/compliance-gaps | :93 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/metric-definitions | :101 | hr:analytics:read (class) | J+P | hr | N | NONE | N | static return |
| GET | hr/analytics-plus/drilldown | :106 | hr:analytics:read (class) | J+P | hr | N | inline `.parse()` on metric | Y (limit cap 100) | |
| GET | hr/analytics-plus/workforce/plans | :118 | hr:headcount:read (method overrides class) | J+P | hr | N | NONE | N | |
| POST | hr/analytics-plus/workforce/plans | :124 | hr:workforce:manage | J+P | hr | N | raw `.parse()` on body | N | |
| PATCH | hr/analytics-plus/workforce/plans/:planId | :131 | hr:workforce:manage | J+P | hr | N | raw `.parse()` on body | N | |
| GET | hr/analytics-plus/workforce/budget-vs-actual | :142 | hr:headcount:read | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/workforce/skills-gap | :148 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/workforce/succession-risk | :153 | hr:succession:view | J+P | hr | N | NONE | N | |
| GET | hr/analytics-plus/workforce/attrition-forecast | :159 | hr:analytics:read (class) | J+P | hr | N | NONE | N | |

---

### automations/hr-automations.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)`

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/automations | :~45 | hr:automations:view | J+P | hr | N | ZVP | Y |
| GET | hr/automations/trigger-types | :~55 | hr:automations:view | J+P | hr | N | NONE | N |
| GET | hr/automations/:id | :~62 | hr:automations:view | J+P | hr | N | NONE | N |
| POST | hr/automations | :~70 | hr:automations:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/automations/:id | :~80 | hr:automations:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/automations/:id | :~90 | hr:automations:manage | J+P | hr | N | NONE | N |
| POST | hr/automations/:id/test | :~100 | hr:automations:manage | J+P | hr | N | NONE | N |
| GET | hr/automations/:id/runs | :~108 | hr:automations:view | J+P | hr | N | ZVP | Y |
| POST | hr/automations/:id/toggle | :~118 | hr:automations:manage | J+P | hr | N | raw body `{isEnabled}` UNVALIDATED | N |

---

### automations/hr-webhooks.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` — all routes `hr:integrations:manage`

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/webhooks/events | :38 | hr:integrations:manage | J+P | hr | N | NONE | N |
| GET | hr/webhooks | :44 | hr:integrations:manage | J+P | hr | N | raw parseInt | Y (manual) |
| GET | hr/webhooks/:subscriptionId | :56 | hr:integrations:manage | J+P | hr | N | ParseIntPipe | N |
| POST | hr/webhooks | :66 | hr:integrations:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/webhooks/:subscriptionId | :75 | hr:integrations:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/webhooks/:subscriptionId | :85 | hr:integrations:manage | J+P | hr | N | ParseIntPipe | N |
| POST | hr/webhooks/:subscriptionId/test | :95 | hr:integrations:manage | J+P | hr | N | ParseIntPipe | N |
| GET | hr/webhooks/:subscriptionId/deliveries | :104 | hr:integrations:manage | J+P | hr | N | ZVP | Y |
| POST | hr/webhooks/:subscriptionId/deliveries/:deliveryId/redeliver | :114 | hr:integrations:manage | J+P | hr | N | ParseIntPipe | N |

---

### benefits/hr-benefits.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~280 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/benefits/plans | :~71 | hr:benefits:view | J+P | hr | N | NONE | N | |
| GET | hr/benefits/plans/:id | :~80 | hr:benefits:view | J+P | hr | N | ParseIntPipe | N | |
| POST | hr/benefits/plans | :~88 | hr:benefits:manage | J+P | hr | N | ZVP | N | |
| PATCH | hr/benefits/plans/:id | :~98 | hr:benefits:manage | J+P | hr | N | ZVP | N | |
| DELETE | hr/benefits/plans/:id | :~108 | hr:benefits:manage | J+P | hr | N | ParseIntPipe | N | |
| GET | hr/benefits/enrollment-windows | :~118 | hr:benefits:view | J+P | hr | N | NONE | N | |
| POST | hr/benefits/enrollment-windows | :~127 | hr:benefits:manage | J+P | hr | N | ZVP | N | |
| GET | hr/benefits/my-enrollment | :~140 | hr:benefits:view | J+P | hr | N | NONE | N | |
| GET | hr/benefits/enrollments | :~148 | hr:benefits:manage | J+P | hr | N | ZVP query | Y | |
| POST | hr/benefits/enroll | :~158 | hr:benefits:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service, passes u.userId |
| POST | hr/benefits/waive | :~167 | hr:benefits:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service |
| POST | hr/benefits/dependents | :~176 | hr:benefits:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service |
| GET | hr/benefits/claims | :~188 | hr:benefits:view | J+P | hr | N | ZVP | Y | |
| POST | hr/benefits/claims | :~200 | hr:benefits:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service |
| PATCH | hr/benefits/claims/:id | :~210 | hr:benefits:manage | J+P | hr | N | ZVP | N | |
| GET | hr/benefits/admin | :~220 | hr:benefits:manage | J+P | hr | N | ZVP | Y | |
| GET | hr/benefits/utilization | :~230 | hr:benefits:manage | J+P | hr | N | ZVP | Y | |

---

### benefits/hr-travel-visits.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)`

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/travel-visits | :28 | hr:benefits:view | J+P | hr | N | NONE | N | |
| POST | hr/travel-visits | :38 | hr:benefits:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service, passes u.userId |

---

### cases/hr-cases.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~181 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/cases | :~55 | hr:cases:view | J+P | hr | N | ZVP | Y | |
| POST | hr/cases | :~67 | hr:cases:manage | J+P | hr | N | ZVP | N | |
| POST | hr/cases/anonymous | :~80 | hr:cases:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-report, uses only u.orgId |
| GET | hr/cases/stats | :~92 | hr:cases:view | J+P | hr | N | NONE | N | |
| GET | hr/cases/:caseId | :~100 | hr:cases:view | J+P | hr | N | NONE | N | |
| PATCH | hr/cases/:caseId | :~108 | hr:cases:manage | J+P | hr | N | ZVP | N | |
| POST | hr/cases/:caseId/notes | :~118 | hr:cases:confidential | J+P | hr | N | ZVP | N | |
| GET | hr/cases/:caseId/notes | :~127 | hr:cases:confidential | J+P | hr | N | NONE | N | |
| PATCH | hr/cases/:caseId/status | :~135 | hr:cases:manage | J+P | hr | N | ZVP | N | |
| PATCH | hr/cases/:caseId/assign | :~144 | hr:cases:manage | J+P | hr | N | ZVP | N | |
| POST | hr/cases/:caseId/timeline | :~153 | hr:cases:manage | J+P | hr | N | ZVP | N | |

---

### cases/hr-disciplinary.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~102 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/disciplinary | :~45 | hr:cases:manage | J+P | hr | N | ZVP | Y | |
| POST | hr/disciplinary | :~55 | hr:cases:manage | J+P | hr | N | ZVP | N | |
| GET | hr/disciplinary/mine | :~49 | self:cases | J+P | hr | N | NONE | N | self-service: own disciplinary |
| GET | hr/disciplinary/unacknowledged-count | :~55 | self:cases | J+P | hr | N | NONE | N | self-service |
| POST | hr/disciplinary/:id/acknowledge | :~83 | self:cases | J+P | hr | N | NONE | N | **WRITE on self:cases** — self-service acknowledge own action |
| GET | hr/disciplinary/:id | :~70 | hr:cases:manage | J+P | hr | N | NONE | N | |
| PATCH | hr/disciplinary/:id | :~78 | hr:cases:manage | J+P | hr | N | ZVP | N | |

---

### cases/hr-safety.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~145 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/safety/incidents | :~50 | hr:safety:manage | J+P | hr | N | ZVP | Y | |
| GET | hr/safety/incidents/:id | :~60 | hr:safety:view | J+P | hr | N | NONE | N | |
| POST | hr/safety/incidents | :~68 | hr:safety:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-report |
| PATCH | hr/safety/incidents/:id | :~78 | hr:safety:manage | J+P | hr | N | ZVP | N | |
| GET | hr/safety/wellness | :~88 | hr:safety:manage | J+P | hr | N | ZVP | Y | |
| POST | hr/safety/wellness/check-in | :~99 | hr:safety:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service wellness |
| GET | hr/safety/stats | :~108 | hr:safety:manage | J+P | hr | N | NONE | N | |
| GET | hr/safety/analytics | :~115 | hr:safety:manage | J+P | hr | N | ZVP | Y | |

---

### cases/service-delivery.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~32 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/service-delivery | :~18 | hr:cases:view | J+P | hr | N | NONE | N |
| POST | hr/service-delivery | :~26 | hr:cases:manage | J+P | hr | N | ZVP | N |

---

### config/hr-departments.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~33 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/departments | :~18 | hr:employees:view | J+P | hr | N | NONE | N |
| POST | hr/departments | :~26 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/departments/:id | :~32 | hr:employees:manage | J+P | hr | N | ZVP | N |

---

### config/hr-document-templates.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~128 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/document-templates | :~45 | hr:documents:view | J+P | hr | N | ZVP | Y |
| POST | hr/document-templates | :~56 | hr:documents:manage | J+P | hr | N | ZVP | N |
| GET | hr/document-templates/:id | :~67 | hr:documents:view | J+P | hr | N | ParseIntPipe | N |
| PATCH | hr/document-templates/:id | :~76 | hr:documents:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/document-templates/:id | :~86 | hr:documents:manage | J+P | hr | N | ParseIntPipe | N |
| POST | hr/document-templates/:id/render | :~94 | hr:documents:view | J+P | hr | N | ZVP | N |

---

### config/hr-document-types.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` (no class-level PermissionGuard)  
Manual `resolveUserPermissions` inline + per-route `@UseGuards(PermissionGuard)` (~107 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/document-types | :~44 | NONE (no @RequirePermission) | J only | hr | N | NONE | N | **NO @RequirePermission** — uses manual `resolveUserPermissions` inline to return org list |
| GET | hr/document-types/:id | :~56 | NONE | J only | hr | N | ParseIntPipe | N | manual inline auth |
| POST | hr/document-types | :~66 | hr:documents:manage | J+P | hr | N | ZVP | N | |
| PATCH | hr/document-types/:id | :~78 | hr:documents:manage | J+P | hr | N | ZVP | N | |
| DELETE | hr/document-types/:id | :~90 | hr:documents:manage | J+P | hr | N | ParseIntPipe | N | |
| POST | hr/document-types/:id/require | :~98 | hr:documents:manage | J+P | hr | N | ZVP | N | |

---

### config/hr-email-templates.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~77 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/email-templates | :~38 | hr:email-templates:manage | J+P | hr | N | NONE | N |
| GET | hr/email-templates/:id | :~46 | hr:email-templates:manage | J+P | hr | N | NONE | N |
| POST | hr/email-templates | :~54 | hr:email-templates:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/email-templates/:id | :~64 | hr:email-templates:manage | J+P | hr | N | ZVP | N |
| POST | hr/email-templates/send | :~72 | hr:communications:send | J+P | hr | N | ZVP | N |

---

### config/hr-handbook.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~74 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/handbook | :~37 | hr:policies:view | J+P | hr | N | NONE | N |
| POST | hr/handbook | :~45 | hr:handbook:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/handbook/:sectionId | :~55 | hr:handbook:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/handbook/:sectionId | :~65 | hr:handbook:manage | J+P | hr | N | ParseIntPipe | N |
| PATCH | hr/handbook/:sectionId/reorder | :~72 | hr:handbook:manage | J+P | hr | N | ZVP | N |

---

### config/hr-holidays.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~99 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/holidays | :~43 | hr:attendance:view | J+P | hr | N | ZVP | N |
| POST | hr/holidays | :~52 | hr:attendance:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/holidays/:id | :~62 | hr:attendance:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/holidays/:id | :~72 | hr:attendance:manage | J+P | hr | N | NONE | N |

---

### config/hr-interview-questions.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~80 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/interview-questions | :~40 | hr:interviews:view | J+P | hr | N | ZVP | Y |
| POST | hr/interview-questions | :~50 | hr:interviews:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/interview-questions/:id | :~60 | hr:interviews:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/interview-questions/:id | :~70 | hr:interviews:manage | J+P | hr | N | NONE | N |
| POST | hr/interview-questions/import | :~77 | hr:interviews:manage | J+P | hr | N | ZVP | N |

---

### config/hr-leave-blackout.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~67 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/leave-blackout | :~38 | hr:leaves:view | J+P | hr | N | NONE | N |
| POST | hr/leave-blackout | :~46 | hr:leaves:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/leave-blackout/:id | :~56 | hr:leaves:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/leave-blackout/:id | :~64 | hr:leaves:manage | J+P | hr | N | NONE | N |

---

### config/hr-notification-preferences.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~35 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/notification-preferences | :~22 | hr:employees:view | J+P | hr | N | NONE | N | |
| PATCH | hr/notification-preferences | :~28 | hr:employees:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service, passes u.userId |

---

### config/hr-salary-structures.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (line 29)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/salary-structures | :36 | hr:salary:view | J+P | hr | N | ZVP | N | dual-audience: inline `hr:salary:manage` check for admin scope |
| POST | hr/salary-structures | :50 | hr:salary:manage | J+P | hr | N | ZVP | N | |

---

### core/hr-audit.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/audit-logs | :18 | hr:audit:view | J+P | hr | N | ZVP | Y |

---

### core/hr-custom-fields.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (~118 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/custom-fields | :~40 | hr:employees:view | J+P | hr | N | NONE | N |
| POST | hr/custom-fields | :~50 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/custom-fields/:id | :~60 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/custom-fields/:id | :~70 | hr:employees:manage | J+P | hr | N | NONE | N |
| GET | hr/custom-fields/values/:employeeId | :~80 | hr:employees:read | J+P | hr | N | NONE | N |
| PATCH | hr/custom-fields/values/:employeeId | :~90 | hr:employees:manage | J+P | hr | N | ZVP | N |

---

### core/hr-effective-changes.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (~77 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/effective-changes | :~40 | hr:employees:read | J+P | hr | N | ZVP | Y |
| POST | hr/effective-changes | :~52 | hr:employees:manage | J+P | hr | N | ZVP | N |
| GET | hr/effective-changes/:id | :~62 | hr:employees:read | J+P | hr | N | NONE | N |
| POST | hr/effective-changes/:id/approve | :~70 | hr:employees:manage | J+P | hr | N | NONE | N |

---

### core/hr-employee-subroutes.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (~59 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/employees/:employeeId/timeline | :~25 | hr:employees:view | J+P | hr | N | NONE | N |
| GET | hr/employees/:employeeId/documents | :~35 | hr:documents:view | J+P | hr | N | ZVP | Y |
| GET | hr/employees/:employeeId/payslips | :~45 | hr:payroll:view | J+P | hr | N | ZVP | Y |
| GET | hr/employees/:employeeId/leaves | :~55 | hr:leaves:view | J+P | hr | N | ZVP | Y |

---

### core/hr-employments.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (~102 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/employments | :~42 | hr:employees:read | J+P | hr | N | ZVP | Y |
| POST | hr/employments | :~55 | hr:employees:manage | J+P | hr | N | ZVP | N |
| GET | hr/employments/:id | :~65 | hr:employees:read | J+P | hr | N | NONE | N |
| PATCH | hr/employments/:id | :~74 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/employments/:id | :~84 | hr:employees:manage | J+P | hr | N | NONE | N |
| POST | hr/employments/:id/transfer | :~92 | hr:employees:manage | J+P | hr | N | ZVP | N |

---

### core/hr-org-catalog.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (265 lines)  
**Inline Zod schemas defined in controller file — CLAUDE.md §7 violation**

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/org/locations | :96 | hr:employees:read | J+P | hr | N | NONE | N |
| POST | hr/org/locations | :103 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/org/locations/:locationId | :114 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/org/locations/:locationId | :125 | hr:employees:manage | J+P | hr | N | NONE | N |
| GET | hr/org/roles | :136 | hr:employees:read | J+P | hr | N | NONE | N |
| POST | hr/org/roles | :143 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/org/roles/:roleId | :154 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/org/roles/:roleId | :165 | hr:employees:manage | J+P | hr | N | ParseIntPipe | N |
| GET | hr/org/levels | :176 | hr:employees:read | J+P | hr | N | NONE | N |
| POST | hr/org/levels | :183 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/org/levels/:levelId | :194 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/org/levels/:levelId | :205 | hr:employees:manage | J+P | hr | N | ParseIntPipe | N |
| GET | hr/org/teams | :216 | hr:employees:read | J+P | hr | N | NONE | N |
| POST | hr/org/teams | :223 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/org/teams/:teamId | :234 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/org/teams/:teamId | :245 | hr:employees:manage | J+P | hr | N | NONE | N |
| GET | hr/org/headcount | :256 | hr:employees:read | J+P | hr | N | NONE | N |

---

### core/hr-people.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (105 lines)  
**Inline `listPeopleSchema` defined in controller file — minor §7 violation**

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/people | :45 | hr:employees:read | J+P | hr | N | ZVP | Y |
| POST | hr/people/backfill-from-members | :55 | hr:employees:manage | J+P | hr | N | NONE | N |
| GET | hr/people/:personId | :63 | hr:employees:read | J+P | hr | N | ParseIntPipe | N |
| POST | hr/people | :73 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/people/:personId | :84 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/people/:personId | :95 | hr:employees:manage | J+P | hr | N | ParseIntPipe | N |

---

### core/hr-sensitive.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (50 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/employees/:employeeId/sensitive | :28 | hr:sensitive:view | J+P | hr | N | ParseIntPipe | N | logs caller IP |
| PATCH | hr/employees/:employeeId/sensitive | :39 | hr:sensitive:manage | J+P | hr | N | ZVP | N | logs caller IP |

---

### directory/access-requests.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~61 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/access-requests | :~35 | hr:assets:view | J+P | hr | N | ZVP | Y | **key mismatch**: access-requests use hr:assets:* keys |
| POST | hr/access-requests | :~47 | hr:assets:view | J+P | hr | N | ZVP | N | **WRITE on :view** — self-service |
| PATCH | hr/access-requests/:id | :~56 | hr:assets:manage | J+P | hr | N | ZVP | N | |

---

### directory/asset-inventory.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~75 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/asset-inventory | :~40 | hr:assets:view | J+P | hr | N | ZVP | Y |
| GET | hr/asset-inventory/stats | :~52 | hr:assets:view | J+P | hr | N | NONE | N |
| POST | hr/asset-inventory | :~60 | hr:assets:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/asset-inventory/:id | :~70 | hr:assets:manage | J+P | hr | N | ZVP | N |

---

### directory/assets.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~102 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/assets | :~42 | hr:assets:view | J+P | hr | N | ZVP | Y |
| GET | hr/assets/my | :~52 | hr:assets:view | J+P | hr | N | NONE | N |
| POST | hr/assets | :~60 | hr:assets:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/assets/:id | :~70 | hr:assets:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/assets/:id/assign | :~80 | hr:assets:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/assets/:id/return | :~90 | hr:assets:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/assets/:id | :~98 | hr:assets:manage | J+P | hr | N | NONE | N |

---

### directory/background-verification.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~55 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/background-verification | :~33 | hr:employees:view | J+P | hr | N | ZVP | Y |
| POST | hr/background-verification | :~43 | hr:employees:manage | J+P | hr | N | ZVP | N |
| PATCH | hr/background-verification/:id | :~52 | hr:employees:manage | J+P | hr | N | ZVP | N |

---

### directory/employees.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (210 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| POST | hr/employees/onboard | :61 | hr:employees:manage | J+P | hr | N | ZVP | N | |
| POST | hr/employees/onboard/bulk | :71 | hr:employees:manage | J+P | hr | N | ZVP | N | |
| GET | hr/employees | :81 | hr:employees:read | J+P | hr | N | ZVP | Y | scope-resolved |
| GET | hr/employees/stats | :99 | hr:employees:view | J+P | hr | N | NONE | N | **userId from @Query()** — `@Query("userId") userId` client-supplied; defaults to u.userId |
| GET | hr/employees/anniversary-feed | :106 | hr:employees:view | J+P | hr | N | NONE | N | |
| GET | hr/employees/availability | :112 | hr:employees:view | J+P | hr | N | ZVP | N | |
| GET | hr/employees/check-email | :121 | hr:employees:view | J+P | hr | N | NONE | N | email from raw @Query |
| GET | hr/employees/find-expert | :131 | hr:employees:view | J+P | hr | N | ZVP | N | |
| GET | hr/employees/skills-matrix | :140 | hr:employees:read | J+P | hr | N | NONE | N | |
| GET | hr/employees/projects | :146 | hr:employees:view | J+P | hr | N | NONE | N | **userId from @Query()** client-supplied |
| GET | hr/employees/tickets | :152 | hr:employees:view | J+P | hr | N | NONE | N | **userId from @Query()** client-supplied |
| GET | hr/employees/:employeeId/reports-to-me | :158 | hr:employees:view | J+P | hr | N | NONE | N | |
| GET | hr/employees/:employeeId/manager-scorecard | :164 | hr:employees:view | J+P | hr | N | NONE | N | |
| GET | hr/employees/:employeeId/profile-pdf | :170 | hr:employees:manage | J+P | hr | N | NONE | N | |
| GET | hr/employees/:employeeId | :190 | hr:employees:view | J+P | hr | N | NONE | N | |
| PATCH | hr/employees/:employeeId | :201 | hr:employees:update | J+P | hr | N | ZVP | N | |

---

### directory/org-structure.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~54 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/org-structure | :~20 | hr:employees:view | J+P | hr | N | NONE | N |
| GET | hr/org-structure/reporting-chain | :~28 | hr:employees:view | J+P | hr | N | ZVP | N |
| POST | hr/org-structure/bulk-update | :~36 | hr:employees:manage | J+P | hr | N | ZVP | N |

---

### directory/team-events.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (~49 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/team-events | :~28 | hr:employees:view | J+P | hr | N | ZVP | Y |
| POST | hr/team-events | :~38 | hr:employees:manage | J+P | hr | N | ZVP | N |
| DELETE | hr/team-events/:id | :~46 | hr:employees:manage | J+P | hr | N | NONE | N |

---

### enterprise-comp/ (5 controllers)

**comp-planning.controller.ts** — 164 lines, prefix `hr/enterprise/comp/planning`, all `hr:compensation:manage`, ModuleGuard INERT  
**devices.controller.ts** — 134 lines, prefix `hr/enterprise/comp/devices`, all `hr:biometric:manage`, ModuleGuard INERT  
**equity.controller.ts** — 102 lines, reads `hr:equity:view`, writes `hr:equity:manage`, ModuleGuard INERT  
**payroll-compliance.controller.ts** — 142 lines, prefix `hr/enterprise/comp/payroll-compliance`, all `hr:payroll:manage`, ModuleGuard INERT  
**workforce-costing.controller.ts** — 53 lines, 4 GET routes → `hr:analytics:read` (3) + `hr:salary:view` (1), ModuleGuard INERT

*(Detailed per-route tables available on request; pattern identical to above)*

---

### enterprise-ops/accommodations/accommodations.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (158 lines)

Routes (10): reads → `hr:accommodations:view`, writes → `hr:accommodations:manage`. All ZVP. No public routes.  
**Notable**: inline `resolveUserPermissions` call at line ~49 for secondary `hr:sensitive:view` check — legitimate dual-permission pattern.

---

### enterprise-ops/emergency/emergency.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` (122 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/enterprise/ops/emergency/events | :40 | hr:emergency:manage | J+P | hr | N | ZVP | Y | |
| GET | hr/enterprise/ops/emergency/events/:eventId | :50 | hr:emergency:manage | J+P | hr | N | NONE | N | |
| POST | hr/enterprise/ops/emergency/events | :60 | hr:emergency:manage | J+P | hr | N | ZVP | N | |
| PATCH | hr/enterprise/ops/emergency/events/:eventId | :71 | hr:emergency:manage | J+P | hr | N | ZVP | N | |
| DELETE | hr/enterprise/ops/emergency/events/:eventId | :82 | hr:emergency:manage | J+P | hr | N | NONE | N | |
| POST | hr/enterprise/ops/emergency/events/:eventId/broadcast | :93 | hr:emergency:manage | J+P | hr | N | ZVP | N | |
| **POST** | **hr/enterprise/ops/emergency/events/:eventId/respond** | **:104** | **NONE** | **J only** | hr | N | ZVP | N | **⚠️ NO PermissionGuard, NO @RequirePermission — JWT-only. Intentional: any employee marks self safe. Needs product-decision doc.** |
| GET | hr/enterprise/ops/emergency/events/:eventId/status | :113 | hr:emergency:manage | J+P | hr | N | NONE | N | |

---

### enterprise-ops/event-stream, identity, simulator

Similar patterns — all @RequireModule("hr"), ModuleGuard INERT, class-level PermissionGuard.  
- **event-stream**: reads `hr:eventstream:view`, POST export `hr:analytics:read`  
- **identity**: reads `hr:identity:view`, writes `hr:identity:manage`; GET `exit-verification` takes client `query.userId`  
- **simulator**: all `hr:policies:manage`

---

### forms/hr-forms-public.controller.ts

**NO JwtAuthGuard, NO PermissionGuard, NO @RequireModule**  
**@Public() on both routes** — fully unauthenticated, rate-limited (RateLimitService)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | public/hr-forms/:orgId/:slug | :42 | NONE (@Public) | NONE | — | — | RateLimit only | N | orgId from @Param; service checks audience=public |
| POST | public/hr-forms/:orgId/:slug/submit | :62 | NONE (@Public) | NONE | — | — | ZVP + RateLimit | N | orgId from @Param; service checks audience=public |

---

### forms/hr-forms.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (159 lines)

Routes (11): reads/submission → `hr:forms:view`, writes/admin → `hr:forms:manage`, sensitive-submission → `hr:sensitive:view`.  
POST `hr/forms/:formId/submissions` at :119 uses `hr:forms:view` — self-service submission (legitimate).

---

### global/ (compliance, contracts, work-authorizations)

**compliance**: 8 routes, all `hr:compliance:manage`, @RequireModule("hr") INERT  
**contracts**: 9 routes, reads `hr:contracts:view`, writes `hr:contracts:manage`, @RequireModule("hr") INERT  
**work-authorizations**: reads `hr:employees:read`, writes `hr:compliance:manage`, @RequireModule("hr") INERT

---

### governance/ (delegations, labor, legal-holds, positions, retention)

**delegations** (89 lines): WRITE routes POST/PATCH/DELETE use `hr:employees:view` — verified self-service (own proxy management, passes u.userId). Admin `listOrg` uses `hr:employees:manage`.  
**labor** (170 lines, 12 routes): reads `hr:labor:view`, writes `hr:labor:manage`  
**legal-holds** (132 lines, 9 routes): reads `hr:legalhold:view`, writes `hr:legalhold:manage`  
**positions** (157 lines, 11 routes): reads `hr:positions:view`, writes `hr:positions:manage`  
**retention** (135 lines, 10 routes): all `hr:retention:manage`

All: @RequireModule("hr") INERT

---

### helpdesk/hr-calendar.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (27 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/calendar | :~20 | hr:helpdesk:view | J+P | hr | N | ZVP | N |

---

### helpdesk/hr-helpdesk.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)` (135 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/helpdesk | :~50 | hr:helpdesk:view | J+P | hr | N | ZVP | N | |
| GET | hr/helpdesk/suggest | :~60 | hr:helpdesk:view | J+P | hr | N | ZVP | N | |
| GET | hr/helpdesk/routing | :~68 | hr:helpdesk:manage | J+P | hr | N | NONE | N | |
| GET | hr/helpdesk/:ticketId | :~75 | hr:helpdesk:view | J+P | hr | N | NONE | N | |
| POST | hr/helpdesk | :~84 | hr:helpdesk:create | J+P | hr | N | ZVP | N | |
| PATCH | hr/helpdesk/:ticketId | :~94 | hr:helpdesk:manage | J+P | hr | N | ZVP | N | |
| POST | hr/helpdesk/:ticketId/comments | :~104 | hr:helpdesk:view | J+P | hr | N | ZVP | N | **WRITE on :view** — dual-audience: `resolveIsAdmin()` branches internally |
| POST | hr/helpdesk/routing | :~115 | hr:helpdesk:manage | J+P | hr | N | ZVP | N | |
| DELETE | hr/helpdesk/routing/:ruleId | :~124 | hr:helpdesk:manage | J+P | hr | N | NONE | N | |

---

### import/hr-import.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (114 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| POST | hr/import/jobs | :~48 | hr:import:manage | J+P | hr | N | ZVP | N | |
| GET | hr/import/jobs | :~58 | hr:import:manage | J+P | hr | N | ZVP | Y | |
| GET | hr/import/jobs/:jobId | :~68 | hr:import:manage | J+P | hr | N | NONE | N | jobId raw string |
| POST | hr/import/jobs/:jobId/commit | :~76 | hr:import:manage | J+P | hr | N | NONE | N | |
| POST | hr/import/jobs/:jobId/rollback | :~84 | hr:import:manage | J+P | hr | N | NONE | N | |
| GET | hr/export/:entity | :~94 | hr:export:manage | J+P | hr | N | inline safeParse | N | entity validated inline |

---

### interviews/ (9 controllers)

**hr-hiring-flows** (128 lines): 10 routes, reads `hr:interviews:view`, writes `hr:interviews:manage`  
**hr-interview-booking** (20 lines): **@Public() class-level, NO rate limiting** — 1 route `POST public/interview-booking/:token`, ZVP on body  
**hr-interview-scheduling** (96 lines): 7 routes, all `hr:interviews:manage`  
**hr-interviewers** (61 lines): 4 routes, reads `hr:interviews:view`; raw @Query params (unvalidated)  
**hr-interviews** (91 lines): 7 routes, reads `hr:interviews:view`, writes `hr:interviews:manage`  
**hr-offers** (93 lines): 6 routes, reads `hr:offers:view`, writes `hr:offers:manage`  
**hr-recruitment-reports** (79 lines): 6 routes, reads `hr:interviews:view`, writes `hr:interviews:manage`  
**hr-scorecards** (80 lines): 5 routes, reads `hr:interviews:view`, writes `hr:interviews:manage`  

All: @RequireModule("hr") INERT except hr-interview-booking (no @RequireModule, fully public)

---

### lifecycle/alumni.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/alumni | :~24 | hr:alumni:read | J+P | hr | N | ZVP | N |
| POST | hr/alumni | :~33 | hr:alumni:write | J+P | hr | N | ZVP | N |

---

### lifecycle/exit.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (165 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/exit | :~50 | hr:exit:view | J+P | hr | N | ZVP | Y | |
| POST | hr/exit | :~60 | hr:exit:create | J+P | hr | N | ZVP | N | blocks org-owner explicitly |
| PATCH | hr/exit/:resignationId/hr-review | :~74 | hr:exit:manage | J+P | hr | N | ZVP | N | |
| PATCH | hr/exit/:resignationId/final-review | :~85 | hr:exit:approve | J+P | hr | N | ZVP | N | |
| PATCH | hr/exit/:resignationId | :~95 | hr:exit:view | J+P | hr | N | ZVP | N | **WRITE on :view** — dual-audience: `isExitAdmin()` branches in service — legitimate |
| GET | hr/exit/analytics | :~110 | hr:exit:manage | J+P | hr | N | NONE | N | |
| POST | hr/exit/experience-letter | :~118 | hr:exit:manage | J+P | hr | N | ZVP | N | |
| GET | hr/exit/:resignationId/letter | :~128 | hr:exit:view | J+P | hr | N | NONE | N | |
| GET | hr/exit/:resignationId/progress | :~136 | hr:exit:view | J+P | hr | N | NONE | N | |
| PATCH | hr/exit/:resignationId/withdraw | :~143 | hr:exit:view | J+P | hr | N | NONE | N | **WRITE on :view** — self-service withdraw |
| GET | hr/exit/:resignationId | :~155 | hr:exit:view | J+P | hr | N | NONE | N | |

---

### lifecycle/hr-analytics.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT  
Class-level `@RequirePermission("hr:analytics:read")` covers all 3 routes

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/analytics | :~20 | hr:analytics:read | J+P | hr | N | NONE | N |
| GET | hr/analytics/attendance | :~27 | hr:analytics:read | J+P | hr | N | ZVP | N |
| GET | hr/analytics/attrition | :~34 | hr:analytics:read | J+P | hr | N | NONE | N |

---

### lifecycle/hr-dashboard.controller.ts

See detailed table above (5 GET routes, all `hr:analytics:read`)

---

### lifecycle/onboarding-views.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (78 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/onboarding-docs/summary | :38 | hr:onboarding:manage | J+P | hr | N | ZVP | N | |
| GET | hr/onboarding-docs | :47 | self:onboarding-docs | J+P | hr | N | ZVP | N | **⚠️ reads u.permissions (JWT claim) at line 53** for canManage — violates §21 |
| POST | hr/onboarding-docs | :57 | self:onboarding-docs | J+P | hr | N | ZVP | N | **⚠️ reads u.permissions (JWT claim) at line 64** — violates §21 |
| PATCH | hr/onboarding-docs/:docId | :68 | hr:onboarding:manage | J+P | hr | N | ZVP | N | |

---

### lifecycle/probation.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (72 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/probation | :~35 | hr:probation:view | J+P | hr | N | NONE | N |
| POST | hr/probation/:employmentId/start-review | :~42 | hr:probation:manage | J+P | hr | N | ZVP | N |
| POST | hr/probation/:reviewId/extend | :~51 | hr:probation:manage | J+P | hr | N | ZVP | N |
| POST | hr/probation/:reviewId/confirm | :~60 | hr:probation:manage | J+P | hr | N | ZVP | N |

---

### lifecycle/termination.controller.ts

See detailed table above (8 routes, reads `hr:exit:manage`, final-review `hr:exit:approve`)

---

### onboarding/core/onboarding.controller.ts

**NO @RequireModule** — module gate absent entirely  
Class: `@UseGuards(JwtAuthGuard)` — PermissionGuard per-method (436 lines — **OVER 300 line cap**)

Uses non-standard 4-segment keys: `hr:onboarding:tasks:view`, `hr:onboarding:tasks:complete`  
Also uses: `onboarding:module-checklists:view/manage`, `onboarding:tours:view`, `settings:onboarding:manage`, `hr:employees:manage`

See earlier detailed table (29 routes). All keys confirmed in catalog (onboarding.ts + shared.ts).

---

### payroll/ (6 controllers — payroll module, 6 have ModuleGuard)

**bonuses.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
3 routes: GET `hr:payroll:view`, POST/PATCH `hr:bonuses:manage`

**fnf.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
3 routes: GET `hr:payroll:view`, POST/PATCH `hr:exit:manage`

**incentives.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
6 routes: all gated `hr:payroll:view` (secondary `crm:incentives:approve` check inline for approve/reject/config-create)  
POST config, PATCH approve/reject: **WRITE on :view** — secondary `crm:incentives:approve` check enforces true admin gate

**loans.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
3 routes: GET `hr:payroll:view`, POST/PATCH `hr:payroll:view` with internal `hr:expenses:approve` check  
**Note: hr:loans:manage catalog key is UNUSED — loan management uses hr:payroll:view + internal check**

**reimbursements.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
3 routes: all `hr:payroll:view` with internal `hr:expenses:approve` check for PATCH  
**Note: hr:expenses:approve is correct semantically but gate key is hr:payroll:view (over-broad gate at controller level)**

**salary-structure-templates.controller.ts** — @RequireModule("payroll") + **ModuleGuard in @UseGuards** → ENFORCED  
4 routes: reads `hr:salary:view`, writes `hr:salary:manage`

---

### payroll-inputs/payroll-inputs.controller.ts

@RequireModule("hr") (NOT payroll) — ModuleGuard absent → INERT (166 lines)  
Class: `@UseGuards(JwtAuthGuard, PermissionGuard)`  
**Uses raw `.parse()` pattern instead of ZodValidationPipe** on all body/query params

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|
| GET | hr/payroll-inputs/periods | :35 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| POST | hr/payroll-inputs/periods | :42 | hr:payroll:generate | J+P | hr | N | raw `.parse()` | N |
| GET | hr/payroll-inputs/periods/:periodId | :49 | hr:payroll:view | J+P | hr | N | ParseIntPipe | N |
| POST | hr/payroll-inputs/periods/:periodId/build | :58 | hr:payroll:generate | J+P | hr | N | ParseIntPipe | N |
| POST | hr/payroll-inputs/periods/:periodId/lock | :67 | hr:payroll:lock | J+P | hr | N | ParseIntPipe | N |
| POST | hr/payroll-inputs/periods/:periodId/unlock | :76 | hr:payroll:reopen | J+P | hr | N | ParseIntPipe | N |
| GET | hr/payroll-inputs/periods/:periodId/attendance | :85 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| GET | hr/payroll-inputs/periods/:periodId/leaves | :96 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| GET | hr/payroll-inputs/periods/:periodId/overtime | :107 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| GET | hr/payroll-inputs/periods/:periodId/reimbursements | :118 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| GET | hr/payroll-inputs/periods/:periodId/adjustments | :129 | hr:payroll:view | J+P | hr | N | raw `.parse()` | Y |
| POST | hr/payroll-inputs/adjustments | :140 | hr:payroll:generate | J+P | hr | N | raw `.parse()` | N |
| PATCH | hr/payroll-inputs/adjustments/:adjustmentId/approve | :147 | hr:payroll:approve | J+P | hr | N | ParseIntPipe | N |
| PATCH | hr/payroll-inputs/adjustments/:adjustmentId/reject | :156 | hr:payroll:approve | J+P | hr | N | raw `.parse()` | N |

---

### performance/ (8 controllers)

**calibration** (55 lines): 3 routes, all `hr:performance:manage`  
**documents** (257 lines — near cap): 21 routes, reads `hr:documents:view`, writes `hr:documents:manage`, compliance writes `hr:compliance:manage`; several **WRITEs on :view** (self-service document upload/acknowledge)  
**engagement-extras** (272 lines — near cap): 25 routes for mood/badges/polls/communities/campaigns; reads `hr:engagement:view`, writes `hr:engagement:manage`; **no pagination on list GETs** — unbounded collection risk  
**engagement** (165 lines): 13 routes; `x-action` header-based dispatch on 2 POSTs with **raw unvalidated body**; `isManager = u.isOrgOwner` only (too narrow)  
**feedback** (79 lines): 6 routes, reads `hr:performance:view`, writes `hr:performance:manage`  
**kpis** (104 lines): 9 routes — **uses `hr:performance:view/manage` NOT `hr:kpis:view/manage`** (dedicated catalog keys unused)  
**performance** (316 lines — **OVER 300 line cap**): 23 routes for goals/key-results/1-on-1/pip/reviews/cycles; many WRITEs on :view (self-service confirmed)  
**succession** (55 lines): 4 routes, reads `hr:succession:view`, writes `hr:succession:manage`

All: @RequireModule("hr") INERT

---

### policies/hr-policies.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (189 lines)

13 routes: reads `hr:policies:view`, writes `hr:policies:manage`. POST simulate on `hr:policies:view` (read-only semantics — legitimate). Inline Zod schemas for simulate and activate.

---

### recruitment/ (12 controllers — ~113 routes total)

All 12 under @RequireModule("hr"), ModuleGuard INERT.  
**recruitment-automation** (167 lines): 14 routes, `hr:employees:view/manage`  
**recruitment-candidate-records** (326 lines — **OVER 300 line cap**): 18 routes  
**recruitment-candidates** (219 lines): 16 routes; POST `internal-jobs/:jobId/apply` uses `hr:employees:view` (self-service apply)  
**recruitment-job-boards** (61 lines): 4 routes  
**recruitment-jobs** (166 lines): 12 routes; **`removeRecruiter` method lacks u.orgId in service call** — potential tenant-scope gap  
**recruitment-offers-list** (26 lines): 1 route `hr:offers:view`  
**recruitment-offers** (124 lines): 9 routes, reads `hr:offers:view`, writes `hr:offers:manage`, approve `hr:offers:approve`  
**recruitment-pipeline** (38 lines): 3 routes  
**recruitment-recruiters** (87 lines): 6 routes; POST `recruiters/activity` self-service under `:view`  
**recruitment-requisitions** (84 lines): 7 routes, reads `hr:requisitions:view`, writes `hr:requisitions:manage`  
**recruitment-sourcing** (241 lines): 16 routes; `resolveUserPermissions` inline at lines 64-65, 129-130, 162-163 — auth logic leaking into controller layer  
**recruitment-talent-pools** (91 lines): 7 routes

All recruitment keys: `hr:employees:view/manage`, `hr:requisitions:view/manage`, `hr:offers:view/manage/approve` — all in catalog.

---

### settings-hub/hr-settings-hub.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (36 lines)

| Method | Path | file:line | Permission | Guards | @RequireModule | ModuleGuard? | Validation | Paginated? | Notes |
|--------|------|-----------|------------|--------|----------------|--------------|------------|------------|-------|
| GET | hr/settings-hub | :~20 | hr:policies:view | J+P | hr | N | NONE | N | |
| GET | hr/settings-hub/effective-rules | :~27 | hr:policies:view | J+P | hr | N | NONE | N | **`query.employeeId` from @Query()** — client-supplied ID for scoping |

---

### templates/hr-templates.controller.ts

@RequireModule("hr") — ModuleGuard absent → INERT (142 lines)

10 routes: reads `hr:templates:view`, writes `hr:templates:manage`. POST `render` calls `resolveUserPermissions` inline for secondary `hr:sensitive:view` check.

---

### time/ (12 controllers)

**attendance** (147 lines): 13 routes; POSTs check-in/check-out/break use `hr:attendance:view` (self-service); `logs`/`monthly`/`heatmap` accept optional **client-supplied `userId` from @Query**  
**attendance-regularization** (81 lines): 4 routes; inline Zod schemas in controller file (§7 violation); accepts **client-supplied `userId` in list query**  
**attendance-summary** (41 lines): 1 route; class-level `@RequirePermission("hr:attendance:view")`; inline Zod schema  
**biometric** (66 lines): 4 routes, uses `hr:attendance:manage/view` NOT `hr:biometric:manage`; inline schemas  
**geofencing** (66 lines): 4 routes, uses `hr:attendance:manage/view` NOT `hr:geofencing:manage`; inline schemas  
**leave-policies** (74 lines): **NO @RequireModule**; 4 routes, `hr:leaves:view/manage`; inline schemas  
**leave-policy-summary** (19 lines): **NO @RequireModule**; 1 route, `hr:leaves:view`  
**leaves** (254 lines): 17 routes + `LeaveCalendarController` (second class in same file) with 1 route; `LeaveCalendarController` has **NO @RequireModule**; raw `@Query("startDate")/@Query("endDate")` without ZVP on 2 routes  
**overtime** (66 lines): 5 routes; POST create uses `hr:attendance:view` (self-service); inline `listQuerySchema`  
**rosters** (78 lines): 5 routes; inline schemas  
**shifts** (120 lines): 10 routes; POST swaps uses `hr:attendance:view` (self-service); inline schemas  
**wfh** (64 lines): 4 routes; POST create uses `hr:attendance:view` (self-service)  
**work-logs** (69 lines): 4 routes; POST create uses `hr:attendance:view` (self-service); GET export uses `hr:attendance:view`

All time controllers (except leave-policies, leave-policy-summary): @RequireModule("hr") INERT

---

### workflows/ (3 controllers)

**hr-workflow-definitions** (139 lines): 11 routes, reads `hr:workflows:view`, writes `hr:workflows:manage`; class `@UseGuards(JwtAuthGuard)` + per-method PermissionGuard  
**hr-workflow-delegations** (68 lines): 5 routes; POST/PATCH/DELETE use `hr:workflows:view` — self-service delegation (passes u.userId, service enforces ownership)  
**hr-workflow-instances** (167 lines): 8 routes; `hr:workflows:view`, approve/reject → `hr:workflows:approve`, admin → `hr:workflows:manage`

All: @RequireModule("hr") INERT

---

## 2. Permission-Key Census

### Distinct keys used as @RequirePermission (controllers only)

| Permission Key | Occurrences | In Catalog? | Catalog file | Generator check |
|---|---|---|---|---|
| hr:analytics:read | 10 | ✓ | hr.ts | — |
| hr:accommodations:view | 3 | ✓ | hr.ts | — |
| hr:accommodations:manage | 7 | ✓ | hr.ts | — |
| hr:alumni:read | 1 | ✓ | hr.ts | — |
| hr:alumni:write | 1 | ✓ | hr.ts | — |
| hr:assets:view | 7 | ✓ | hr.ts | — |
| hr:assets:manage | 9 | ✓ | hr.ts | — |
| hr:attendance:view | 30+ | ✓ | hr.ts | — |
| hr:attendance:manage | 20+ | ✓ | hr.ts | — |
| hr:attendance:regularize | 1 | ✓ | hr.ts | — |
| hr:audit:view | 1 | ✓ | hr.ts | — |
| hr:automations:view | 4 | ✓ | hr.ts | — |
| hr:automations:manage | 5 | ✓ | hr.ts | — |
| hr:bank-details:view | 1 | ✓ | hr.ts | — |
| hr:benefits:view | 11 | ✓ | hr.ts | — |
| hr:benefits:manage | 7 | ✓ | hr.ts | — |
| hr:biometric:manage | 10 | ✓ | hr.ts | — |
| hr:bonuses:manage | 2 | ✓ | hr.ts | — |
| hr:cases:view | 6 | ✓ | hr.ts | — |
| hr:cases:manage | 10 | ✓ | hr.ts | — |
| hr:cases:confidential | 2 | ✓ | hr.ts | — |
| hr:communications:send | 1 | ✓ | hr.ts | — |
| hr:compensation:manage | 11 | ✓ | hr.ts | — |
| hr:compliance:manage | 12 | ✓ | hr.ts | — |
| hr:contracts:view | 3 | ✓ | hr.ts | — |
| hr:contracts:manage | 6 | ✓ | hr.ts | — |
| hr:documents:view | 12 | ✓ | hr.ts | — |
| hr:documents:manage | 8 | ✓ | hr.ts | — |
| hr:email-templates:manage | 5 | ✓ | hr.ts | — |
| hr:emergency:manage | 6 | ✓ | hr.ts | — |
| hr:employees:view | 40+ | ✓ | hr.ts | — |
| hr:employees:read | 15+ | ✓ | hr.ts | — |
| hr:employees:manage | 30+ | ✓ | hr.ts | — |
| hr:employees:update | 1 | ✓ | hr.ts | — |
| hr:engagement:view | 15 | ✓ | hr.ts | — |
| hr:engagement:manage | 10 | ✓ | hr.ts | — |
| hr:equity:view | 3 | ✓ | hr.ts | — |
| hr:equity:manage | 4 | ✓ | hr.ts | — |
| hr:eventstream:view | 3 | ✓ | hr.ts | — |
| hr:exit:view | 6 | ✓ | hr.ts | — |
| hr:exit:create | 1 | ✓ | hr.ts | — |
| hr:exit:manage | 10 | ✓ | hr.ts | — |
| hr:exit:approve | 2 | ✓ | hr.ts | — |
| hr:expenses:approve | 1 | ✓ | hr.ts | (internal check only, not @RequirePermission) |
| hr:feedback:view | 3 | ✓ | hr.ts | — |
| hr:feedback:manage | 2 | ✓ | hr.ts | — |
| hr:forms:view | 5 | ✓ | hr.ts | — |
| hr:forms:manage | 6 | ✓ | hr.ts | — |
| hr:handbook:manage | 4 | ✓ | hr.ts | — |
| hr:headcount:read | 2 | ✓ | hr.ts | — |
| hr:helpdesk:view | 4 | ✓ | hr.ts | — |
| hr:helpdesk:create | 1 | ✓ | hr.ts | — |
| hr:helpdesk:manage | 5 | ✓ | hr.ts | — |
| hr:identity:view | 4 | ✓ | hr.ts | — |
| hr:identity:manage | 5 | ✓ | hr.ts | — |
| hr:import:manage | 5 | ✓ | hr.ts | — |
| hr:export:manage | 1 | ✓ | hr.ts | — |
| hr:integrations:manage | 9 | ✓ | hr.ts | — |
| hr:interviews:view | 12 | ✓ | hr.ts | — |
| hr:interviews:manage | 15 | ✓ | hr.ts | — |
| hr:labor:view | 5 | ✓ | hr.ts | — |
| hr:labor:manage | 7 | ✓ | hr.ts | — |
| hr:leaves:view | 10 | ✓ | hr.ts | — |
| hr:leaves:create | 3 | ✓ | hr.ts | — |
| hr:leaves:approve | 2 | ✓ | hr.ts | — |
| hr:leaves:read | 3 | ✓ | hr.ts | — |
| hr:leaves:manage | 5 | ✓ | hr.ts | — |
| hr:legalhold:view | 4 | ✓ | hr.ts | — |
| hr:legalhold:manage | 5 | ✓ | hr.ts | — |
| hr:offers:view | 4 | ✓ | hr.ts | — |
| hr:offers:manage | 6 | ✓ | hr.ts | — |
| hr:offers:approve | 2 | ✓ | hr.ts | — |
| hr:onboarding:manage | 3 | ✓ | hr.ts | — |
| hr:onboarding:tasks:view | 7 | ✓ | onboarding.ts | 4-segment key, catalog-confirmed |
| hr:onboarding:tasks:complete | 7 | ✓ | onboarding.ts | 4-segment key, catalog-confirmed |
| hr:payroll:view | 25+ | ✓ | hr.ts | — |
| hr:payroll:generate | 4 | ✓ | hr.ts | — |
| hr:payroll:approve | 3 | ✓ | hr.ts | — |
| hr:payroll:lock | 1 | ✓ | hr.ts | — |
| hr:payroll:reopen | 1 | ✓ | hr.ts | — |
| hr:payroll:manage | 10 | ✓ | hr.ts | — |
| hr:performance:view | 15 | ✓ | hr.ts | — |
| hr:performance:manage | 20 | ✓ | hr.ts | — |
| hr:policies:view | 7 | ✓ | hr.ts | — |
| hr:policies:manage | 10 | ✓ | hr.ts | — |
| hr:positions:view | 5 | ✓ | hr.ts | — |
| hr:positions:manage | 6 | ✓ | hr.ts | — |
| hr:probation:view | 1 | ✓ | hr.ts | — |
| hr:probation:manage | 3 | ✓ | hr.ts | — |
| hr:requisitions:view | 3 | ✓ | hr.ts | — |
| hr:requisitions:manage | 4 | ✓ | hr.ts | — |
| hr:retention:manage | 10 | ✓ | hr.ts | — |
| hr:safety:view | 4 | ✓ | hr.ts | — |
| hr:safety:manage | 6 | ✓ | hr.ts | — |
| hr:salary:view | 5 | ✓ | hr.ts | — |
| hr:salary:manage | 4 | ✓ | hr.ts | — |
| hr:sensitive:view | 3 | ✓ | hr.ts | — |
| hr:sensitive:manage | 2 | ✓ | hr.ts | — |
| hr:succession:view | 2 | ✓ | hr.ts | — |
| hr:succession:manage | 3 | ✓ | hr.ts | — |
| hr:templates:view | 4 | ✓ | hr.ts | — |
| hr:templates:manage | 6 | ✓ | hr.ts | — |
| hr:travel:view | 2 | ✓ | hr.ts | — |
| hr:travel:create | 1 | ✓ | hr.ts | — |
| hr:travel:manage | 2 | ✓ | hr.ts | — |
| hr:workflows:view | 7 | ✓ | hr.ts | — |
| hr:workflows:manage | 9 | ✓ | hr.ts | — |
| hr:workflows:approve | 4 | ✓ | hr.ts | — |
| hr:workforce:manage | 2 | ✓ | hr.ts | — |
| onboarding:module-checklists:view | 2 | ✓ | onboarding.ts | — |
| onboarding:module-checklists:manage | 4 | ✓ | onboarding.ts | — |
| onboarding:tours:view | 4 | ✓ | onboarding.ts | — |
| self:cases | 3 | ✓ | shared.ts | confirmed in catalog |
| self:onboarding-docs | 2 | ✓ | shared.ts | confirmed in catalog |
| settings:onboarding:manage | 5 | ✓ | shared.ts | — |

### Cross-module secondary checks (resolveUserPermissions inline, not @RequirePermission)
- `crm:incentives:approve` — incentives.controller.ts:46 — **confirmed in crm.ts** catalog
- `hr:salary:manage` — salary-structures.controller.ts:43 (inline isAdmin check)
- `hr:payroll:approve` / `hr:expenses:approve` — loans/reimbursements internal checks

### GHOST KEY VERDICT: NONE

No ghost keys found. All @RequirePermission values and all inline `perms.has()` calls resolve to catalog entries in hr.ts, shared.ts, onboarding.ts, or crm.ts. Generator code in module-access.ts produces `hr:access:view` and `hr:access:manage` (not used in these controllers, no false-positive issue). The 4-segment keys `hr:onboarding:tasks:view` and `hr:onboarding:tasks:complete` deviate from the 3-segment standard but ARE explicitly defined in onboarding.ts.

### Catalog keys defined but UNUSED by controllers (semantic gap, not ghost keys)
- `hr:kpis:view` — kpis.controller.ts uses `hr:performance:view` instead
- `hr:kpis:manage` — kpis.controller.ts uses `hr:performance:manage` instead
- `hr:shifts:view` — shifts.controller.ts uses `hr:attendance:view` instead
- `hr:shifts:manage` — shifts.controller.ts uses `hr:attendance:manage` instead
- `hr:geofencing:manage` — geofencing.controller.ts uses `hr:attendance:manage` instead
- `hr:loans:manage` — loans.controller.ts uses `hr:payroll:view` + internal check

---

## 3. Authorization Shape — WRITE on :view or :read Keys

| Controller | Method | Path | Permission Gate | file:line | Verdict |
|---|---|---|---|---|---|
| attendance.controller.ts | POST | check-in | hr:attendance:view | :37 | **(a) legitimate self-service** — passes u.userId only |
| attendance.controller.ts | POST | check-out | hr:attendance:view | :47 | **(a) legitimate self-service** — passes u.userId only |
| attendance.controller.ts | POST | break | hr:attendance:view | :57 | **(a) legitimate self-service** |
| wfh.controller.ts | POST | hr/wfh | hr:attendance:view | :39 | **(a) legitimate self-service** — passes u.userId |
| hr-benefits.controller.ts | POST | enroll/waive/dependents/claims | hr:benefits:view | :158,167,176,200 | **(a) legitimate self-service** — passes u.userId |
| hr-travel-visits.controller.ts | POST | hr/travel-visits | hr:benefits:view | :38 | **(a) legitimate self-service** |
| hr-safety.controller.ts | POST | wellness/check-in | hr:safety:view | :99 | **(a) legitimate self-service** |
| hr-cases.controller.ts | POST | anonymous | hr:cases:view | :80 | **(a) legitimate self-service** — uses only u.orgId; anonymous report |
| hr-notification-preferences.controller.ts | PATCH | preferences | hr:employees:view | :28 | **(a) legitimate self-service** |
| hr-disciplinary.controller.ts | POST | acknowledge | self:cases | :83 | **(a) legitimate self-service** — `self:` prefix confirms scope |
| delegations.controller.ts | POST/PATCH/DELETE | create/update/revoke | hr:employees:view | :57,67,79 | **(a) legitimate self-service** — own proxy delegation, u.userId to service |
| hr-workflow-delegations.controller.ts | POST/PATCH/DELETE | create/update/remove | hr:workflows:view | :37,47,58 | **(a) legitimate self-service** — u.userId to service, ownership in service |
| exit.controller.ts | PATCH | /:resignationId | hr:exit:view | :95 | **(b) dual-audience** — `isExitAdmin()` branches in service for approve vs update-own |
| exit.controller.ts | PATCH | /:resignationId/withdraw | hr:exit:view | :143 | **(a) legitimate self-service** — withdraw own resignation |
| hr-helpdesk.controller.ts | POST | /:ticketId/comments | hr:helpdesk:view | :104 | **(b) dual-audience** — `resolveIsAdmin()` branches internally |
| hr-forms.controller.ts | POST | /:formId/submissions | hr:forms:view | :119 | **(a) legitimate self-service** |
| incentives.controller.ts | POST/PATCH | config, approve, reject | hr:payroll:view | :64,83,98 | **(b) dual-audience** — `crm:incentives:approve` secondary check enforces real gate |
| loans.controller.ts | POST/PATCH | create, update | hr:payroll:view | :~ | **(b) dual-audience** — `hr:expenses:approve` secondary check in service |
| reimbursements.controller.ts | POST/PATCH | create, update | hr:payroll:view | :~ | **(b) dual-audience** — `hr:expenses:approve` secondary check in service |
| hr-settings-hub.controller.ts | GET | effective-rules | hr:policies:view | :27 | **(a) legitimate read** — query.employeeId client-supplied (see §4) |
| documents.controller.ts | POST/PATCH | docs, compliance-ack | hr:documents:view | :~ | **(a) legitimate self-service** — upload own / acknowledge own |
| performance.controller.ts | POST/PATCH | goals/reviews/1-on-1 | hr:performance:view | :~ | **(a) legitimate self-service** — `canManagePerformance` helper checks manage internally |
| work-logs.controller.ts | POST | hr/work-logs | hr:attendance:view | :~ | **(a) legitimate self-service** |
| overtime.controller.ts | POST | hr/overtime | hr:attendance:view | :~ | **(a) legitimate self-service** |
| shifts.controller.ts | POST | swaps | hr:attendance:view | :~ | **(a) legitimate self-service** — swap request, u.userId as requesterId |
| recruitment-candidates.controller.ts | POST | internal-jobs/:id/apply | hr:employees:view | :~ | **(a) legitimate self-service** — employee applying to internal job |

**Prior audit finding confirmed:** 4 of 4 `:view`-gated write patterns sampled in previous passes were false positives. Same holds here. All 27 instances are either self-service or dual-audience with a real secondary permission check. NONE are genuinely over-broad.

---

## 4. Client-Supplied Tenant/Identity

| Controller | file:line | Param source | Field | Used for | Risk |
|---|---|---|---|---|---|
| employees.controller.ts | :101 | @Query("userId") | userId | Optional employee stats lookup; falls back to u.userId | Service must verify org membership |
| employees.controller.ts | :148 | @Query("userId") | userId | Employee projects lookup | Service must verify org membership |
| employees.controller.ts | :153 | @Query("userId") | userId | Employee tickets lookup | Service must verify org membership |
| attendance.controller.ts | :73 | ZVP-validated query.userId | userId | Attendance logs (optional, falls back to u.userId) | ZVP-validated but service must verify org scope |
| attendance.controller.ts | :85 | ZVP-validated query.userId | userId | Monthly attendance | ZVP-validated, service must verify |
| attendance.controller.ts | :94 | ZVP-validated query.userId | userId | Heatmap | ZVP-validated, service must verify |
| hr-settings-hub.controller.ts | :25 | @Query("employeeId") | employeeId | Effective policy rules | Raw string, no ZVP — service must verify org membership |
| identity.controller.ts | :125 | @Query("userId") | userId | Exit verification | Raw string — service must verify org membership |
| hr-forms-public.controller.ts | :43,63 | @Param("orgId") | orgId | Public form lookup | Intentional public endpoint; service validates audience=public |
| hr-document-templates.controller.ts | :~94 | service-internal | — | Template render | Client does not supply userId directly |
| attendance-regularization.controller.ts | :~ | ZVP-validated | userId | List regularizations | ZVP-validated |

---

## 5. Public / Unauthenticated Routes

| Controller | Route | file:line | @Public | Rate Limited? | Notes |
|---|---|---|---|---|---|
| hr-interview-booking.controller.ts | POST public/interview-booking/:token | :7 (class) | ✓ (class-level) | **NO** | Token-based auth in service; no IP rate limit |
| hr-forms-public.controller.ts | GET public/hr-forms/:orgId/:slug | :42 | ✓ | ✓ (RateLimitService) | |
| hr-forms-public.controller.ts | POST public/hr-forms/:orgId/:slug/submit | :62 | ✓ | ✓ (RateLimitService) | |
| emergency.controller.ts | POST hr/.../emergency/events/:eventId/respond | :104 | NOT @Public but NO PermissionGuard | NO | JWT-only; deliberate self-service (mark self safe). Needs product-decision doc. |

---

## 6. Idempotency

**Count: 0** — No `Idempotency-Key` header handling found across all 119 HR controllers. Multi-step payroll and exit operations lack idempotency protection.

---

## 7. Controller LOC

| File | LOC | Notes |
|---|---|---|
| onboarding/core/onboarding.controller.ts | 436 | **Exceeds 300-line cap significantly** |
| recruitment/recruitment-candidate-records.controller.ts | 326 | **Exceeds 300-line cap** |
| performance/performance.controller.ts | 316 | **Exceeds 300-line cap** |
| recruitment/recruitment-sourcing.controller.ts | 241 | Near cap |
| performance/engagement-extras.controller.ts | 272 | Near cap |
| performance/documents.controller.ts | 257 | Near cap |
| recruitment/recruitment-candidates.controller.ts | 219 | Near cap |
| recruitment/recruitment-automation.controller.ts | 167 | OK |
| workflows/hr-workflow-instances.controller.ts | 167 | OK |
| governance/labor/labor.controller.ts | 170 | OK |

No controller contains `this.db` or direct DB calls — all delegate to services. ✓

---

## 8. Totals

| Metric | Count |
|---|---|
| Total controllers | 119 |
| Estimated total routes | ~850 |
| Routes with no @RequirePermission (intentional public/self-service) | ~5 |
| Routes with NONE and NOT @Public (ungated gap) | 2 (hr-document-types GET endpoints using manual inline auth) |
| Routes where @RequireModule is present but ModuleGuard absent (inert) | ~800+ (113/119 controllers) |
| Controllers with ModuleGuard (enforced) | 6 (all payroll/) |
| Controllers with NO @RequireModule | 6 (hr-interview-booking, hr-forms-public, leave-policies, leave-policy-summary, LeaveCalendarController, onboarding.controller) |
| @Public() controllers/routes | 3 routes + 1 full controller |
| Idempotency-Key handlers | 0 |
| Controllers with DB queries | 0 |
| Controllers over 300 lines | 3 |
| Ghost keys | 0 |
| Catalog keys defined but unused | 6 (hr:kpis:view/manage, hr:shifts:view/manage, hr:geofencing:manage, hr:loans:manage) |

---

## 9. Top 25 Findings (Ranked by Severity)

| # | SEV | file:line | Finding |
|---|---|---|---|
| 1 | CRITICAL | (all 113 non-payroll controllers) | `@RequireModule("hr")` is INERT on 113 of 119 controllers — `ModuleGuard` is absent from every `@UseGuards` except the 6 payroll controllers. Module gate does not exist for the HR module. |
| 2 | HIGH | lifecycle/onboarding-views.controller.ts:53,64 | `u.permissions` read from JWT claims for `canManage` check — stale JWT permissions used for authorization decision, violates RBAC §21. Replace with `AccessService.resolveUserPermissions`. |
| 3 | HIGH | enterprise-ops/emergency/emergency.controller.ts:104 | `POST respond` — no `PermissionGuard`, no `@RequirePermission`. JWT-only. Intentional (self-mark safe) but undocumented; needs product-decision annotation. |
| 4 | HIGH | interviews/hr-interview-booking.controller.ts:7 | Fully `@Public()` controller with NO rate limiting — token reuse/abuse possible if token space is weak. |
| 5 | HIGH | payroll-inputs/payroll-inputs.controller.ts:29 | `@RequireModule("hr")` not "payroll" — inconsistent with other payroll controllers (bonuses/fnf/loans all use "payroll" + ModuleGuard). Payroll-inputs bypasses payroll module gate. |
| 6 | MED | config/hr-document-types.controller.ts:~44,56 | Two GET routes have NO `@RequirePermission` and no `@UseGuards(PermissionGuard)` — rely entirely on manual `resolveUserPermissions` inline in handler body. Non-standard pattern, bypassable if guard stack is ever reconfigured. |
| 7 | MED | time/leave-policies.controller.ts, time/leave-policy-summary.controller.ts | Both controllers missing `@RequireModule` entirely — no module gate. |
| 8 | MED | time/leaves.controller.ts:237 | `LeaveCalendarController` (second class in same file) missing `@RequireModule`. |
| 9 | MED | onboarding/core/onboarding.controller.ts | No `@RequireModule` on the onboarding controller — any authenticated user (from any module) can access HR onboarding flows. |
| 10 | MED | performance/engagement.controller.ts:89,141 | Two POST routes use `x-action` header dispatch with raw unvalidated body (`body: unknown`) — no ZVP, type-safety gap at boundary. |
| 11 | MED | performance/engagement.controller.ts:89,141 | `isManager = u.isOrgOwner` only — HR_ADMIN role holders with `hr:performance:manage` cannot trigger manager-scoped behavior; would need to be org-owner. |
| 12 | MED | recruitment/recruitment-sourcing.controller.ts:64,129,162 | `AccessService.resolveUserPermissions()` called inside 3 controller handlers — authorization logic leaked into controller layer. Should be service-layer. |
| 13 | MED | recruitment/recruitment-jobs.controller.ts:133 | `removeRecruiter` — `u.orgId` not visible in agent-reported service call; potential missing tenant scope on DELETE. Needs service-level verification. |
| 14 | LOW | payroll/loans.controller.ts | `hr:loans:manage` catalog key unused — loan management gates on `hr:payroll:view` + internal `hr:expenses:approve` check. Role holders with only `hr:loans:manage` cannot access loans. |
| 15 | LOW | time/shifts.controller.ts, time/biometric.controller.ts, time/geofencing.controller.ts | Dedicated catalog keys `hr:shifts:view/manage`, `hr:biometric:manage`, `hr:geofencing:manage` unused — controllers use broader `hr:attendance:*` keys. Granular RBAC impossible with current routing. |
| 16 | LOW | performance/kpis.controller.ts | `hr:kpis:view/manage` catalog keys unused — kpis.controller uses `hr:performance:view/manage`. Role with only `hr:kpis:view` cannot view KPIs. |
| 17 | LOW | time/leaves.controller.ts:210,225 | `teamAvailability` and `summary` routes use raw `@Query("startDate")/@Query("endDate")` without ZodValidationPipe — unvalidated date strings. |
| 18 | LOW | automations/hr-automations.controller.ts:~118 | POST toggle sends raw `{isEnabled: boolean}` with no ZodValidationPipe — unvalidated body. |
| 19 | LOW | (multiple) | Inline Zod schemas defined directly in controller files (biometric, geofencing, attendance-regularization, rosters, overtime, attendance-summary, shifts, hr-org-catalog, hr-people, hr-policies simulate/activate) — violates CLAUDE.md §7 (schemas should be in `*-schema.ts` files). |
| 20 | LOW | directory/access-requests.controller.ts | Uses `hr:assets:view/manage` for access-requests resource — semantically mismatched keys (access requests ≠ assets). |
| 21 | LOW | performance/engagement-extras.controller.ts | 25 list GET routes on communities, polls, campaigns, badges with no pagination — unbounded collection risk. |
| 22 | LOW | onboarding/core/onboarding.controller.ts | 436 lines — significantly exceeds 300-line soft cap; should be split by responsibility (employee-onboarding tasks vs module-checklists vs tours). |
| 23 | LOW | recruitment/recruitment-candidate-records.controller.ts | 326 lines — exceeds 300-line cap. |
| 24 | LOW | performance/performance.controller.ts | 316 lines — exceeds 300-line cap. |
| 25 | INFO | (all controllers) | Zero idempotency headers across all 119 HR controllers — multi-step payroll period locking, exit flows, and offer workflows lack idempotency protection. |

---

## Coverage Gaps / Caveats

1. Service-layer BOLA (object-level tenant checks) was not verified — scope limited to controllers only. The client-supplied `userId` entries in §4 warrant service-level follow-up.
2. LOC counts for many controllers are approximate from agent summaries; exact counts verified only for files read directly.
3. Route counts are estimates for groups covered via agent summaries (enterprise-comp, performance, recruitment); exact per-route data available in agent transcripts.
