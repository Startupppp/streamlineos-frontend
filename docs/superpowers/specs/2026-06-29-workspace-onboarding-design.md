# Workspace Onboarding Wizard — Design Spec
Date: 2026-06-29

## Overview
Rebuild `/setup` as the full 10-step customer workspace onboarding wizard per PRD (`tasks/onboarding/`). The employee HR onboarding at `/onboarding` is untouched.

---

## Key Decision: No New DB Table
The `organizations` table already carries all needed fields:
- `industry` (text)
- `companySize` (text)
- `country` (text)
- `onboardingCompletedAt` (timestamp) — marks completion
- `enabledModules` (text[]) — tracks installed modules
- `settings` (jsonb) — stores `{ onboarding: { goals: string[] } }`

**No migration required.**

---

## Wizard Steps (10)

| # | Step | Persist |
|---|---|---|
| 1 | Welcome | None — UI only |
| 2 | Business Goals | `settings.onboarding.goals` via `PATCH /organization/settings` |
| 3 | Industry | `industry` via `PATCH /organization/settings` |
| 4 | Company Profile | `name`, `companySize`, `country`, `timezone`, `currency` via `PATCH /organization/settings` |
| 5 | AI Workspace Generation | Calls `POST /workspace-onboarding/generate` — creates BU + Branch + Dept + Team from industry template |
| 6 | Module Recommendations | Enables modules via `PATCH /organization/settings` (`enabledModules`) |
| 7 | Invite Team | Calls `POST /organization/members` (existing) |
| 8 | Connect Integrations | UI only — links to `/settings/integrations`. No OAuth built here. |
| 9 | Import Data | CSV upload UI — calls existing import endpoints per data type |
| 10 | Workspace Ready | Calls `POST /workspace-onboarding/complete` — sets `onboardingCompletedAt` |

Plus: **First Success Checklist** — persistent floating widget on dashboard. Shown until dismissed or 100% complete. Reads `onboardingCompletedAt` from org settings.

---

## Backend: New `workspace-onboarding` Module

### Files
```
backend/src/modules/workspace-onboarding/
  workspace-onboarding.module.ts
  workspace-onboarding.controller.ts
  workspace-onboarding.service.ts
  dto/workspace-onboarding.schemas.ts
```

### Endpoints

#### `POST /workspace-onboarding/generate`
Auth: JwtAuthGuard. Org-owner or `settings:organization:manage` permission.

Request body: `{ industry: string }`

Action: Creates default hierarchy from industry template (idempotent — skips if already exists):
- 1 Business Unit
- 1 Branch
- 2–3 Departments
- 1 Team per department

Returns: `{ created: { businessUnits, branches, departments, teams } }`

#### `POST /workspace-onboarding/complete`
Auth: JwtAuthGuard. Org-owner or `settings:organization:manage`.

Action: Sets `organizations.onboardingCompletedAt = now()`.

Returns: `{ completedAt: string }`

### Industry Templates (hardcoded in service)

```ts
const INDUSTRY_TEMPLATES = {
  "it-services":   { departments: ["Engineering", "Product", "Operations", "HR"] },
  "agency":        { departments: ["Creative", "Strategy", "Client Services", "HR"] },
  "retail":        { departments: ["Sales", "Inventory", "Customer Service", "HR"] },
  "manufacturing": { departments: ["Production", "Quality", "Supply Chain", "HR"] },
  "healthcare":    { departments: ["Clinical", "Administration", "Compliance", "HR"] },
  "education":     { departments: ["Academic", "Administration", "IT", "HR"] },
  "construction":  { departments: ["Projects", "Engineering", "Safety", "HR"] },
  "real-estate":   { departments: ["Sales", "Leasing", "Operations", "HR"] },
  "restaurant":    { departments: ["Kitchen", "Service", "Management", "HR"] },
  "logistics":     { departments: ["Operations", "Fleet", "Warehouse", "HR"] },
}
```

### Module Recommendations (hardcoded in frontend)

```ts
const MODULE_RECOMMENDATIONS: Record<string, string[]> = {
  "grow-sales":        ["crm", "sales", "quotes"],
  "manage-employees":  ["hr", "payroll", "calendar"],
  "manage-inventory":  ["inventory", "procurement"],
  "finance":           ["accounting", "invoices", "expenses"],
  "customer-support":  ["support", "kb", "chat"],
  "projects":          ["projects", "tasks"],
  "ai-automation":     ["ai", "automation"],
}
```

---

## Frontend Architecture

### File structure (new/changed)
```
frontend/
  app/(authenticated)/setup/
    page.tsx                          ← full wizard (rebuilt)
    loading.tsx                       ← skeleton
    error.tsx                         ← error boundary
  features/workspace-onboarding/
    steps/
      welcome-step.tsx
      goals-step.tsx
      industry-step.tsx
      company-profile-step.tsx
      generation-step.tsx
      recommendations-step.tsx
      invite-step.tsx
      integrations-step.tsx
      import-step.tsx
      success-step.tsx
    checklist-widget.tsx              ← dashboard floating widget
  hooks/api/workspace-onboarding.ts  ← TanStack Query hooks
```

### Wizard shell (`setup/page.tsx`)
- Full-screen layout (no sidebar) — same as current `/setup`
- Step indicator at top (icons, labels, connector lines)
- `AnimatePresence` + `motion.div` for slide transitions (existing framer-motion pattern)
- Each step is a separate component in `features/workspace-onboarding/steps/`
- Progress % shown in header

### Generation Step (Step 5)
- Animated list of tasks fading in one by one with checkmarks
- Each task calls the backend in sequence: BU → Branch → Departments → Teams
- Uses existing `useCreateBusinessUnit`, `useCreateOrgBranch`, `useCreateOrgDepartment`, `useCreateOrgTeam` hooks (or the new generate endpoint)
- Auto-advances to Step 6 when complete

### First Success Checklist Widget
- Fixed bottom-right card, collapsible
- Items: Invite teammate · Create first record · Connect email · Complete profile · Try AI Assistant
- Progress ring showing % complete
- Disappears once dismissed or 100% done
- Hidden if `onboardingCompletedAt` is null (wizard not yet complete)

---

## RBAC
- `POST /workspace-onboarding/generate` — requires `settings:organization:manage` (org owner bypass applies)
- `POST /workspace-onboarding/complete` — same
- Add both to `permissions.constants.ts`

---

## Acceptance Criteria
- [ ] All 10 steps render and function correctly
- [ ] Step data persists to org settings on advance
- [ ] Generation step creates real hierarchy objects in DB
- [ ] Module recommendations install/skip correctly
- [ ] Team invite step sends real invitations
- [ ] Integration step links to /settings/integrations
- [ ] Import step accepts CSV and maps columns
- [ ] Success screen shows what was set up
- [ ] First Success Checklist appears on dashboard post-completion
- [ ] Skip/Resume works (wizard detects current state from org data on load)
- [ ] TypeScript strict — no any, no ts-ignore
- [ ] Build + lint clean
