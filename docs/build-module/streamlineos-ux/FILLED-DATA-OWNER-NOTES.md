# Owner filled-data happy paths — Design notes

**Status:** VERIFIED (2026-09-30)  
**Account:** Designer Owner · `PXC-Design-A-20260930` · project `/build/47` (`PXC-Project-Alpha`)  
**Goal:** Non-empty Cycles / Epics / Releases + Issues filters/cards with real data; UX delta vs empty-state census.

## VERIFIED creates
| Artifact | Name | URL |
|----------|------|-----|
| Cycle | `PXC-Cycle-1` (Oct 1–14, 2026) | https://www.streamlineos.in/build/47/cycles |
| Epic | `PXC-Epic-1` | https://www.streamlineos.in/build/47/epics |
| Release | `PXC-Release-1` v1.0.0 (Draft) | https://www.streamlineos.in/build/47/releases |

Project overview confirms org/project: https://www.streamlineos.in/build/47

## Non-empty Issues / filters
- Board `?status=TODO` → non-empty `PXA-1` / `PXC-Issue-1`: https://www.streamlineos.in/build/47/issues?status=TODO
- List same filter: https://www.streamlineos.in/build/47/issues?status=TODO&view=list
- Other filters/views: **UNTESTED**

## UX notes (filled vs empty)
- Cycle create **requires start/end dates**; inline validation before success (empty-state census missed this gate).
- Creation toasts for cycle + release (good feedback).
- No OTP/sign-in wall on this pass (existing Owner session).

## Evidence
`/workspace/streamlineos-ux/evidence/filled-data/`
- `project-overview-org-project-confirmed.webp`
- `cycle-created-PXC-Cycle-1.webp`
- `epic-created-PXC-Epic-1.webp`
- `release-created-PXC-Release-1.webp`
- `issues-board-TODO-filter.webp`
- `issues-list-TODO-filter.webp`

## Next / BLOCKED
- Org Admin / Module Admin role UX — **next**
- More-tools happy-path depth beyond Cycle/Epic/Release — partial (these three done)
- Account B isolation UX — blocked on Aditya OTP
- Client-guest — blocked on BUG-005/006
