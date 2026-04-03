# Task 11: Code Quality & Cleanup

## Priority: 🟡 MEDIUM (Execute after tRPC removal)

---

### 11.1 Files to DELETE

| File | Reason |
|------|--------|
| `task` (root) | Prompt file, not code |
| `test-drizzle.ts` (root) | Debug file at root |
| `audit/REPORT.md` | Old audit, replaced by `/tasks/` |
| `lib/email-templates.ts` | Empty (just `export {}`) — real templates in `lib/email-templates/` dir |
| `lib/hooks/` (entire directory) | Deleted during tRPC removal — all hooks were tRPC-dependent |

---

### 11.2 Update `drizzle.config.ts` After Schema Split

**Current**: `schema: "./lib/db/schema.ts"`

**After split**: `schema: "./lib/db/schema/index.ts"` or `schema: "./lib/db/schema/*.ts"`

---

### 11.3 Remove ALL `eslint-disable` Comments

**Found in 12 files**:
- `server/api/routers/leads.ts` (will be deleted in tRPC removal)
- `components/crm/lead-export-dialog.tsx`
- `app/(dashboard)/settings/branches/page.tsx`
- `app/(dashboard)/hr/incentives/page.tsx`
- `app/(dashboard)/digital-marketing/social/page.tsx`
- `app/(dashboard)/digital-marketing/leads/page.tsx`
- `app/(dashboard)/digital-marketing/campaigns/page.tsx`
- `app/(dashboard)/crm/leads/distribute/page.tsx`
- `app/(dashboard)/crm/clients/page.tsx`
- `app/(dashboard)/crm/clients/[id]/page.tsx`
- `app/(dashboard)/chat/page.tsx`

**Action**: Fix the underlying lint issues instead of suppressing them.

---

### 11.4 Refactor `components/illustrations/index.tsx` (50KB)

This 50KB file IS used (imported across many pages for empty states). It's too large for a single file.

**Action**:
- Split into individual illustration components
- Each illustration in its own file: `components/illustrations/no-data.tsx`, `no-leads.tsx`, etc.
- Re-export from `index.ts`

---

### 11.5 Remove Comments and TODOs from Production Code

**TODOs found in 8 server files**:
- `server/api/routers/reports.ts`
- `server/api/routers/project/ticket.ts`
- `server/api/routers/project/custom-states.ts`
- `server/api/routers/project/core.ts`
- `server/api/routers/leads.ts`
- `server/api/routers/hr/helpdesk.ts`
- `server/api/routers/dashboard.ts`
- `server/actions/project-actions.ts`

Most of these will be deleted with tRPC removal, but `project-actions.ts` needs review.

---

### 11.6 Replace Anonymous Inline Handlers

Scan all `"use client"` components for:
```diff
- onClick={() => handleDelete(id)}
+ onClick={handleDeleteClick}
```

---

### 11.7 Remove Unused Imports

Run: `pnpm lint --fix`

---

### 11.8 Type Safety Audit

Find and fix:
- `Record<string, unknown>` → create specific interfaces
- Loose `string` type for roles → use `Role` union type (Task 04)
- Missing return types on exported functions
- `jsonb().$type<...>()` types should have dedicated interfaces

---

### 11.9 Verify Zod Schemas Match DB Schema

Cross-reference:
- `lib/validations/hr.ts` ↔ HR schema tables
- `lib/validations/project.ts` ↔ Project schema tables
- `lib/validations/leave.ts` ↔ Leave schema tables
- `lib/validations/attendance.ts` ↔ Attendance schema

Ensure: field optionality, string lengths, enum values all match.

---

### 11.10 Clean Up Unused Routes

**Check if these are dead code**:
- `app/qr/[slug]/` — QR code redirect page (verify if used)
- `app/(dashboard)/ceo/` — Should be merged into role-specific dashboard
- `app/(dashboard)/onboarding/` — Keep (first-time user flow)

---

### 11.11 Duplicate Component Audit

Check for duplicate components across directories:
- `components/ui/` vs `components/shared/` — any overlap?
- `components/crm/` vs `app/(dashboard)/crm/*` — inline components vs shared?

---

### 11.12 Missing `key` Props in Lists

Scan for list renders missing unique `key` props — this is a common React anti-pattern in large codebases.

---

**Acceptance Criteria**:
- Zero dead code files
- Zero `eslint-disable` comments
- Zero TODO comments in production code
- Zero anonymous inline handlers
- All Zod schemas match DB schema
- Build passes with zero warnings
- `pnpm lint` passes with zero errors
