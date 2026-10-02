# Completeness Wave Owner depth — Account A

Org: PXC-Design-A-20260930  
Project: PXC-Project-Alpha (`https://www.streamlineos.in/build/47`)

## VERIFIED — Issues filters

| Filter / URL | Result |
|---|---|
| Priority = Medium (`/build/47/issues?priority=MEDIUM`) | **Non-empty** — PXA-1 / PXC-Issue-1 visible. |
| Priority = High (`/build/47/issues?priority=HIGH`) | **Empty** — global “No tickets match your filters”. |
| Assignee = Unassigned (`/build/47/issues?assigneeId=__unassigned__`) | **Non-empty** — PXA-1 / PXC-Issue-1 visible. |
| Cycle = PXC-Cycle-1 (`/build/47/issues?cycle=55`) | **Non-empty** — PXA-1 / PXC-Issue-1 visible. |
| Type = Task (`/build/47/issues?type=TASK`) | **Non-empty** — PXA-1 / PXC-Issue-1 visible. |

The Add filter chooser was exercised beyond status: Priority, Type, Assignee, Cycle, and Due Dates are available. Due Dates exposes From/To range controls.

## VERIFIED — Portfolios / Programs

- `/build/portfolios` — created **PXC-Portfolio-1** (Active; Owner Unassigned; Projects 0).
- `/build/programs` — created **PXC-Program-1** (Active; linked to PXC-Portfolio-1; Owner Unassigned; Projects 0).

## UX notes / coverage gaps

- Filter chooser currently exposes Status, Priority, Type, Assignee, Cycle, Due Dates.
- Searching the chooser for **labels** returned “No matching filters”; no Labels filter is exposed.
- Searching for **epic** surfaced only Type > Epic (issue type), not an Epic relationship filter. No Epic relation filter is exposed.
- Empty states are clear: per-column “No matches here” and global “No tickets match your filters”; active filters are shown as removable chips and reflected in the URL.

## Evidence screenshots

- `issues-priority-medium.webp`
- `issues-priority-high-empty.webp`
- `issues-assignee-unassigned.webp`
- `issues-cycle-pxc-cycle-1.webp`
- `issues-labels-missing.webp`
- `portfolios-pxc-portfolio-1.webp`
- `programs-pxc-program-1.webp`

No member/role changes, deletes, Client Access submission, or sign-out were performed.

## Proposed Design IDs
- **UX-026** — Labels filter missing from Issues FilterBar (Completeness Next)
- **UX-027** — Epic *relation* filter missing (only Epic issue type) despite issue↔epic link VERIFIED
