# ICP UX lenses — freelancers · product managers · project managers

**Status:** Design working draft (2026-10-01) — refine as CI walks land  
**Product:** StreamlineOS Build

## Shared bar (all three ICPs)

| Lens | Good looks like | Build today (Owner craft) | Gap class |
|------|-----------------|---------------------------|-----------|
| Activation honesty | Invite → land in workspace with clear role power | Cold invite OTP roulette; Build access not automatic | Freeze PM-011/002 |
| Empty vs deny | Empty = no data; deny = no permission (never look alike) | Member empty Projects while on `/build/47` (UX-022) | Role honesty |
| Progressive density | Primary path visible; power tools discoverable without drowning | 20+ More-tools; search/disclosure still soft | System (UX-010) |
| Link depth | Create shell + membership + filters that use the object | Cycle/Epic OK-ish; Release/Program shallow | Delivery depth |
| Client/guest wedge | Publish + grant + guest entry atomic | BUG-005/006; publish no-confirm (UX-031) | Client wedge |

## Freelancer lens

**Jobs:** one–few projects, client visibility, invoices/time optional, fast setup, low ceremony.

| Moment | Competitor pattern to study | Build ask |
|--------|----------------------------|-----------|
| First project in <5 min | Template gallery + sample data (ClickUp/Asana) | Gallery / Quick Start packs (reason #13) |
| Client sees only their work | Guest portal / share link with confirm | Atomic grant→guest (PM-001) |
| Solo clarity | My work / due dates / simple board | Due Dates + Board strong; Triage soft |
| Trust | Role names match power | Viewer vs Member honesty (CW-001/002) |

## Product manager lens

**Jobs:** backlog health, cycle/roadmap signal, epic/release narrative, stakeholder reports.

| Moment | Competitor pattern to study | Build ask |
|--------|----------------------------|-----------|
| Cycle focus | Linear Cycles chrome (active cycle, burn, scope) | UX-024 active-cycle depth |
| Epic/release story | Jira epic panel + release membership | Epic link OK; Release membership UX-025 |
| Triage | Linear Triage inbox + rules | UX-029 empty→usable |
| Insights | Named reports / dashboards | UX-030 snapshot-only → Create/Run |
| Filters | Label + epic relation on issues | UX-026/027 missing |

## Project manager lens

**Jobs:** plan hierarchy (portfolio/program), milestones, workload, risks/decisions, status to stakeholders.

| Moment | Competitor pattern to study | Build ask |
|--------|----------------------------|-----------|
| Hierarchy | Jira Plans / monday portfolios with live membership | Program↔project UX-028; Portfolio depth |
| Milestone ↔ work | ClickUp/Zoho milestone links | Milestone↔issue BEHIND |
| Capacity | Workload / timeline views | Workload shell present; filled depth TBD vs Directs |
| Risk/decision log | Decision records with owners/dates | Surfaces exist; CI will score craft vs Directs |
| Ops adjacent | JSM/Xray only if ICP needs ITSM | Ops pack = niche BEHIND; Not Now for eng |

## Design scoring rubric (per surface)

For each CI walk page, score Build vs Direct on:

1. **Comprehension** — can ICP name what this page is for in 5s?  
2. **Speed** — primary action ≤2 clicks from entry  
3. **Density** — useful info without clutter; progressive disclosure  
4. **Honesty** — empty / loading / deny / error distinguishable  
5. **Depth** — object is usable (link, filter, membership), not shell-only  

Scale: LEAD / PARITY / BEHIND / N/A (category mismatch).
