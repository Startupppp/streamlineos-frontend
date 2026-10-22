# HRM-14 — Exhaustive Page Catalog (Recheck)

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Purpose

Rechecked **2026-09-20** against **162 authenticated** HRMS-accounted
`page.tsx` files plus the unauthenticated `/employee-onboarding` gate, for
**163 total accounted page files**:

| Area | Count |
|------|------:|
| `/hr/**` | 124 |
| `/directory/**` | 6 |
| HR `/me/**` | 9 |
| `/payroll/**` | 23 |
| `/employee-onboarding` | 1 |

Earlier PRDs (HRM-01–13) define program rules. **This catalog is the
page-level source of truth** for filters, views, components, sheets/dialogs/
confirmations, APIs, tables, cache, pagination, and scalability notes.

A page is not “done” until its catalog row is implemented and evidence is
logged in HRM-11.

## Catalog Files

| File | Scope |
|------|--------|
| [14a — Core people & self-service](./14a-catalog-core-people.md) | Directory, `/me/*`, employees, org, onboarding, hub, approvals, announcements |
| [14b — Time, leave, WFH/WFO](./14b-catalog-time-leave.md) | Attendance, shifts, leave, WFH, holidays, OT, devices |
| [14c — Comp, docs, assets, performance](./14c-catalog-experience.md) | Benefits, expenses, travel, documents, assets, goals, KPIs, feedback |
| [14d — Ops, exit, governance, analytics](./14d-catalog-ops-governance.md) | Cases, helpdesk, workforce, exit, compliance, settings ops pages |
| [14e — HR settings](./14e-catalog-hr-settings.md) | `/hr/settings/**` |
| [14f — Payroll](./14f-catalog-payroll.md) | `/payroll/**` + `/me/pay` |
| [14g — Recruitment boundary](./14g-catalog-recruitment-boundary.md) | `/hr/recruitment/**` + `/me/recruitment` — thin boundary rows only |

## Row Schema (every in-scope page)

Each row must fill:

1. **Route / disposition / customer job**
2. **Permission / entitlement**
3. **Primary CTA**
4. **States** — loading, empty, error, denied, populated
5. **Views** — table | list | cards | calendar | org | analytics | none
6. **Filters + search** — fields, debounce, URL keys, server vs client
7. **Pagination** — cursor/none/cap; when forbidden
8. **Components** — required shared + feature-local
9. **Sheets / dialogs / confirmations** — create, edit, destroy, approve
10. **Bulk actions** — none or list
11. **Backend** — primary endpoints, Zod DTOs, tables, indexes, cache keys +
    invalidation writers
12. **Scalability / maintainability** — N+1 risks, split points, dual-model notes

## Global Defaults (apply unless row overrides)

| Concern | Default |
|---------|---------|
| Search debounce | 300ms `useDebouncedValue` |
| List max page | 100 cursor keyset |
| Overlay | `EntityFormSheet` / `HrSheet` + confirm dialog for destructive |
| Query keys | include `orgId` + filter hash + cursor |
| Cache | register in `CACHE_KEYS`; invalidate via shared HR/Payroll helpers |
| Auth | data-layer scope; tenant not-found parity |
| Visual | page `bg-background` ≠ card ≠ sheet (HRM-09) |
| WFO/WFH | attendance lists expose `workLocation` (HRM-13) |

## Recheck Findings — Gaps Closed by This Catalog

| Gap in HRM-01–13 | Resolution |
|------------------|------------|
| Disposition tables without per-page filters/views/overlays | 14a–14f rows |
| Many governance/ops pages only named KEEP | Full anatomy in 14d |
| `/hr/settings/company` is a **redirect** to `/settings/organization` | Documented; not a real page |
| Inline pages (`service-delivery`, performance analytics) | Called out for feature extraction |
| Payroll pages lacked filter/overlay detail | 14f |
| Recruitment still BOUNDARY | 14g thin rows + ATS program handoff |
| Backend cache/schema per page missing | Each row §Backend |
| Missing ADD pages (`/me/team`, etc.) | Listed in 14a with full target anatomy |

## Completion Checkboxes

- [ ] **HRM-14-001** every in-scope KEEP/ADD route has a catalog row in 14a–14f.
- [ ] **HRM-14-002** every BOUNDARY recruitment route appears in 14g (no silent
  omission).
- [ ] **HRM-14-003** generated cross-check: 162 authenticated page files plus
  `/employee-onboarding` are accounted (KEEP + BOUNDARY + REMOVE + redirect);
  the generated census, not a permanently hard-coded count, is authoritative
  after approved route changes.
- [ ] **HRM-14-004** implementers mark row-level done only with Evidence Log.
- [ ] **HRM-14-005** after implementation, delete catalog contradictions vs
  `PAGES.md`.

## Page Count Ledger

| Bucket | How counted |
|--------|-------------|
| In-scope HRMS+Directory+me+onboarding (excl. recruitment) | ~95 routes → 14a–14e |
| Payroll | 23 + `/me/pay` already in me → 14f |
| Recruitment BOUNDARY | ~40 → 14g |
| Redirect-only | `/hr/settings/company` |

Exact per-file checkboxes live in child catalogs.
