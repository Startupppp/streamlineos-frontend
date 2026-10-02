# CW-004 — Issue↔cycle linking / active-cycle UX (VERIFIED 2026-09-30)

**Owner Account A** · `/build/47` · Cycle `PXC-Cycle-1` (`/build/47/cycles/55`) · Issue `PXA-1`

## VERIFIED linking
- Path: Issue detail → “No cycle” → “Change cycle” → `PXC-Cycle-1`
- Issue Cycle field = `PXC-Cycle-1`; cycle detail lists `PXC-Issue-1`
- Empty cycle: “No tickets in this cycle,” dates 1–14 Oct 2026, Draft
- Filled: Todo 1 · `PXC-Issue-1` · 0/1 done
- Board filter: Cycle → `PXC-Cycle-1` works

## Gaps vs Linear-class (Design)
- Project overview still **Active cycle: None** after linking
- No Active/Current cycle banner or Board chrome
- **Membership = PARITY-seeking**; **active-cycle discoverability = BEHIND**

## Evidence
`/workspace/streamlineos-ux/evidence/cycle-depth/`

## Proposed Design ID
- **UX-024** — Active cycle chrome (overview + Board) when issues are cycled (Not Now unless Aditya elevates; softens CI Cycles BEHIND)
