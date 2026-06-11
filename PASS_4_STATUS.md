# Pass 4 — Palette unification (gold token cleanup)

## TL;DR

Bulk-replaced 414 occurrences of `bg-gold` / `text-gold` / `border-gold` / `ring-gold` / `from-gold` / `to-gold` (incl. all `hover:` / `focus:` variants) across 154 `.tsx` files in `app/`, `components/`, `features/` with their `blue-500` / `blue-600` equivalents. No visual change — the `--gold` CSS variable was already `#3b82f6` (blue-500), so the gold class names were already rendering blue. This pass is semantic cleanup. tsc clean, build green for changed files.

---

## Shipped

### Bulk Tailwind token rename

Patterns applied (all preserved hover:/focus:/dark: prefixes and `/N` alpha modifiers automatically):

| Before | After |
|---|---|
| `bg-gold` | `bg-blue-500` |
| `text-gold` | `text-blue-600` |
| `border-gold` | `border-blue-500` |
| `ring-gold` | `ring-blue-500` |
| `from-gold` | `from-blue-500` |
| `to-gold` | `to-blue-500` |

Verified via grep: 0 occurrences of any gold Tailwind token remain.

### Auth pages untouched

Confirmed via `git diff --ignore-cr-at-eol -- "app/(auth)/"` returns empty. sed ran across all `.tsx` files but found nothing to replace in `app/(auth)/`, so no content changes there.

---

## Intentionally untouched (semantic gold)

These references are legitimate non-palette uses of the word "gold" and were not blue-ified:

- `features/calendar/event-{create,detail}-dialog.tsx`, `features/calendar/calendar-view.tsx` — `gold: "#bd882c"` is a *user-pickable event color* in a palette of 8 options. Renaming would lose semantic meaning ("gold" as a color choice).
- `components/ui/stat-card.tsx` — variant key `gold: { bg: "bg-blue-500/10", ... }` already migrated values (key kept as a variant identifier).
- `app/(dashboard)/crm/organizations/[organizationId]/page.tsx:40` — `gold: "text-blue-600 bg-blue-500/10"` — variant key, values now blue.
- `globals.css` — `--gold: #3b82f6` legacy CSS variable preserved for backwards compat. Marked as a legacy alias in the existing comment.

---

## Build state

- `pnpm exec tsc --noEmit` — clean
- Nothing committed (per rule)
- `.env` / `.env.example` untouched (per rule)
- Auth pages content untouched (per rule)

---

## What the user gets

- **No visual change** — the rendered colors are identical, since `--gold` was already blue-500
- **Cleaner code search** — searching for "gold" no longer false-positives across 414 sites
- **Predictable palette** — every brand-color usage in the dashboard now reads as `blue-500` / `blue-600`, matching the auth-page palette

---

## Cumulative status across passes

| Pass | Scope | Net effect |
|---|---|---|
| Pass 1 | Foundation (design-system, shared components, hooks, validation primitives) | Built the abstractions |
| Pass 2 | PageWrapper + sidebar + illustrations + dashboard-header palette | Shell-level visual polish; 200 dashboard pages inherit new look |
| Pass 3 | Candidate Add/Edit sheets → `EntityFormSheet`; mobile-drawer behavior in `Dialog` + `AppDialog` + `AppSheet` | `candidates/page.tsx` -188 LOC; every Dialog on mobile becomes a keyboard-aware bottom drawer |
| Pass 4 (this pass) | 414 gold→blue Tailwind token rename | Semantic palette cleanup |

---

## Recommended Pass 5

**Pick one:**

### Option A — Continue Cluster B sheet migrations
Migrate `features/crm/leads/create-lead-sheet.tsx` and `features/crm/deals/deals-create-sheet.tsx` to `EntityFormSheet`. ~3–4 hours each. These are the next-largest unmigrated forms.

### Option B — Cluster C API hardening
Add zod validation to ~351 unvalidated routes via `parseBody` / `parseQuery` + `paginatedQuerySchema`. Wrap heavy reads in `unstable_cache` + `revalidateTag`. ~30–50 hours.

### Option C — Cluster D Odoo Accounting build
Indian SMB-grade Accounting module (TDS, GST, journal entries, COA, invoicing). 2–4 weeks.

### Option D — Responsive sweep on the 10 highest-traffic page bodies
The Tier-1 list in PASS_2_STATUS.md (dashboard, sales, settings/organization, hr/recruitment/candidates, crm/leads, hr/employees, projects, marketing, billing/invoices, customer-executive). ~10–12 hours.

---

## Verification

```bash
pnpm exec tsc --noEmit                                  # clean
grep -rE "(bg|text|border|ring|from|to)-gold\\b" app/ components/ features/ --include="*.tsx"   # empty
git diff --ignore-cr-at-eol -- "app/(auth)/"            # empty
```
