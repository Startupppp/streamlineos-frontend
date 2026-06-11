# Pass 3 — Cluster B: Form dialog dedup (candidate sheets)

## TL;DR

Migrated the candidate Add/Edit sheets from 188 LOC of inline form scaffolding in `candidates/page.tsx` to two reusable `EntityFormSheet`-backed components. The previously-dead `add-candidate-sheet.tsx` / `edit-candidate-sheet.tsx` files (336 LOC of unused refactor leftovers) are now alive and consumed. Net: `candidates/page.tsx` 609 → 421 LOC, +zod validation, fewer useState, single source of form scaffolding. Build is green for changed files. Nothing committed.

---

## Shipped

### 1. `add-candidate-sheet.tsx` rewritten

**File:** `features/hr/recruitment/candidates-list/add-candidate-sheet.tsx`

- Replaced 131 LOC of useState-driven form (which was dead code — not imported anywhere) with an `EntityFormSheet`-backed implementation
- zod schema validates firstName, lastName, email; phone/source optional
- `resetOnOpen` clears form after submit/close
- Props: `{ open, onOpenChange }`

### 2. `edit-candidate-sheet.tsx` rewritten

**File:** `features/hr/recruitment/candidates-list/edit-candidate-sheet.tsx`

- Replaced 205 LOC of dead code with `EntityFormSheet`-backed implementation
- Accepts `candidate: Candidate | null`; derives `defaultValues` via `useMemo`
- `resetOnOpen` re-syncs form when sheet opens with a new candidate
- Fields: firstName, lastName, email, phone, source, currentRole, currentCompany, linkedinUrl, notes

### 3. `candidates/page.tsx` consumes the new sheets

**File:** `app/(dashboard)/hr/recruitment/candidates/page.tsx`

Removed:
- 15 `useState` declarations (5 for add fields + 10 for edit fields)
- `handleCreate` callback (~17 LOC)
- `handleEdit` callback (~29 LOC)
- 9 field-mirroring lines in `openEditSheet`
- ~50 LOC inline Add Candidate `<Sheet>` block
- ~75 LOC inline Edit Candidate `<Sheet>` block
- Imports: `useCreateCandidate`, `useUpdateCandidate`, `Sheet*`, `Textarea`

Added:
- 2 lines importing `AddCandidateSheet`, `EditCandidateSheet`
- 1 simple `<Button onClick={() => setSheetOpen(true)}>` for the Add trigger
- 8 LOC rendering `<AddCandidateSheet>` + `<EditCandidateSheet>` near the bottom

**Page LOC: 609 → 421 (-188 LOC, -31%)**

---

## Build state

- `pnpm exec tsc --noEmit` — clean for all changed files
- Pre-existing tsc errors in `app/api/{ai/suggestions,chat,expenses/import,storage/upload}/route.ts` are unrelated to this work and predate this session
- Nothing committed (per rule)
- `.env` / `.env.example` untouched (per rule)
- Auth pages untouched (per rule)

---

## What the user gets

1. **Adding/editing candidates** now uses react-hook-form + zod — inline validation messages appear under each field instead of a single toast at the top
2. **Same UX** otherwise — sheet layout, fields, button labels preserved
3. **Page file is 188 LOC lighter** — easier to scan, easier to maintain
4. **No more dead code** — the two sheet files in `features/hr/recruitment/candidates-list/` are now wired up

---

## What I deliberately did NOT do (and why)

| Item | Status | Why deferred |
|---|---|---|
| Migrate `new-folder-dialog`, `link-parent-dialog`, `win-loss-dialog`, `declare-winner-dialog`, `assign-crm-dialog` | Skipped | All use parent-controlled state (string inputs passed in, change handlers passed in) — not react-hook-form-shaped. Migrating means refactoring both dialog AND parent, doubling work. Same for `field-sheet` (uses dynamic array of options — useFieldArray refactor) |
| Migrate `create-target-sheet` | Skipped | Embedded multi-select employee picker uses custom state mgmt that doesn't fit useForm cleanly. Also has `bg-gold` palette refs (separate cleanup pass) |
| Migrate `deals-create-sheet`, `create-lead-sheet` | Deferred | Larger; warrants its own pass. The candidate sheets prove the pattern works — these are the next candidates |
| Replace remaining `bg-gold` refs in form dialogs | Deferred | Found in `link-parent-dialog`, `create-target-sheet`, `event-create-dialog` and a few others. Better as one targeted palette-cleanup pass |
| Migrate confirmation-only dialogs (`new-dm-dialog`, `csv-upload-dialog`) | N/A | Not forms; they're confirmation/uploader UIs. Wrong abstraction for `EntityFormDialog` |

---

## Recommended Pass 4 (next session)

**Pick one:**

### Option A — Continue Cluster B sheet migrations
Target `deals-create-sheet` and `create-lead-sheet` next — both are inline forms in user-facing flows. ~3–4 hours per sheet. The candidate sheets are a proven template.

### Option B — Palette cleanup pass
Grep-driven sweep: replace remaining `bg-gold` / `text-gold` references in:
- `features/crm/targets/create-target-sheet.tsx` (4 refs)
- `features/crm/organizations/detail/link-parent-dialog.tsx` (2 refs)
- `features/calendar/event-create-dialog.tsx` (search)
- Other module pages found via `grep -r "\\bgold\\b" features/ components/`

~2 hours. Best for visible polish.

### Option C — Cluster C API hardening (still on offer)
Add zod to 351 unvalidated routes, caching to 597 routes, finer RBAC. ~30–50 hours.

### Option D — Cluster D Odoo Accounting feature
Largest value-per-customer item. 2–4 weeks.

---

## Files touched this pass

### Modified
- `app/(dashboard)/hr/recruitment/candidates/page.tsx` — removed inline forms, consumed shared sheets
- `features/hr/recruitment/candidates-list/add-candidate-sheet.tsx` — full rewrite with `EntityFormSheet`
- `features/hr/recruitment/candidates-list/edit-candidate-sheet.tsx` — full rewrite with `EntityFormSheet`

### Not touched (intentional)
- `app/(auth)/**` (per rule)
- `.env`, `.env.example` (per rule)
- Other unmigrated dialogs/sheets — explicitly deferred (see table above)

---

## Verification

```bash
pnpm exec tsc --noEmit   # clean for candidates path
grep -nE "useCreateCandidate|useUpdateCandidate" "app/(dashboard)/hr/recruitment/candidates/page.tsx"   # empty
grep -nE "<Sheet " "app/(dashboard)/hr/recruitment/candidates/page.tsx"                                  # empty
```
