# HRM-09 — Visual Hierarchy, Tokens, and Accessibility PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

HRMS screens have clear surface elevation: page canvas ≠ card ≠ sheet/dialog.
Customers can tell where they are and what is interactive. Color and density
follow the design-system tokens — no hard-coded white overlays that collapse
contrast in light mode.

## Ownership Boundary

Owns visual hierarchy, token usage, overlay contrast, responsive behavior, and
accessibility for HRMS-owned pages. Component reuse catalog is HRM-03.

## Current Source Findings

- Rich surface pattern is intentional for HR hubs (`features/hr/shared/hr-ui.tsx`
  → `components/shared/rich-surface.tsx`).
- Hard-coded translucency: `bg-white/90` (comp-off), `bg-white/25` /
  `bg-white/80` on pipeline/kanban (Recruitment BOUNDARY — fix in ATS program;
  do not ignore if HR hub copies the pattern).
- Sheets/dialogs sometimes share the same `bg-background` as the page, reducing
  perceived separation.
- Cards and page background can match when both use `bg-card` on a card-colored
  canvas.
- Uneven empty/loading skeletons across the 124-page tree.

## Surface Token Contract

| Surface | Token / treatment | Notes |
|---------|-------------------|-------|
| App shell / page canvas | `bg-background` | Never place naked `bg-card` full-bleed as page |
| Primary content panel | `bg-card` + `border` / `shadow-sm` only when it is a true panel | Prefer open layout on dense tables |
| Nested card inside panel | `bg-muted/40` or `bg-background` with border | Must differ from parent |
| Sheet | `bg-popover` or elevated `bg-card` + shadow + dimmed overlay `bg-black/40` | Overlay required |
| Dialog | Same as sheet; stronger shadow | |
| Dropdown / popover | `bg-popover` | |
| Destructive zone | `destructive` tokens only for irreversible | |
| Sticky toolbars | `bg-background/95` with blur **or** solid `bg-background` + border — pick one module-wide | |

Rules:

- If removing border/shadow/background does not hurt understanding, it should
  not be a card (align with product UI rules).
- Hub heroes may use rich-surface gradients; operational list pages stay calm.
- No purple-on-white theme drift; category violet tokens only for taxonomy
  badges where the system already allows.
- Ban raw `bg-white/…` in HRMS-owned files; use tokens with alpha.

- [ ] **HRM-09-001** replace hard-coded `bg-white/*` in HRMS-owned pages with
  tokens.
- [ ] **HRM-09-002** standardize sheet/dialog overlay + surface tokens for
  `HrSheet` and `EntityFormSheet`.
- [ ] **HRM-09-003** audit employees, leave, attendance, documents, cases,
  assets for page-vs-card sameness; fix.
- [ ] **HRM-09-004** filter toolbars use shared `FILTER_TOOLBAR_ROW` density.
- [ ] **HRM-09-005** tables use consistent header/background; zebra optional but
  module-consistent.
- [ ] **HRM-09-006** focus rings visible on all interactive card actions.

## States and Layout

- [ ] **HRM-09-007** every KEEP page has loading skeleton that matches layout
  (not a generic spinner only).
- [ ] **HRM-09-008** empty states name the next action and permission if denied
  create.
- [ ] **HRM-09-009** responsive: filters collapse into sheet on small screens;
  primary CTA remains reachable.
- [ ] **HRM-09-010** density: comfortable default; compact supported on
  employees and attendance.

## Accessibility

- [ ] **HRM-09-011** icon-only buttons have accessible names.
- [ ] **HRM-09-012** dialogs trap focus and return focus on close (HRM-01).
- [ ] **HRM-09-013** color is not the only leave/attendance status signal.
- [ ] **HRM-09-014** contrast meets WCAG AA for text on hub rich surfaces.

## Acceptance Checks

- [ ] **HRM-09-015** browser proof side-by-side: page, card, open sheet — three
  distinguishable surfaces on employees and cases.
- [ ] **HRM-09-016** keyboard path through approvals inbox and leave approve.
- [ ] **HRM-09-017** Evidence Log includes screenshots or recorded checklist.
