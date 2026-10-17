# StreamlineOS Reports UX capture

**Status: VERIFIED / BLOCKED**

- **VERIFIED — discovery:** In project scope, `More tools` exposed **Agile reports** linking to `https://www.streamlineos.in/build/47/reports`.
- **VERIFIED — rendered project:** `/build/47` rendered project name **PXC-Project-Alpha** in the sidebar; organization header rendered **PXC-Design-A-20260930**.
- **VERIFIED — org scope check:** In `Organization All of Build`, `More tools` search for `Reports` returned **No matching tools**. The project-scope route above was available.
- **VERIFIED — empty state:** Agile Reports tab loaded with no cycle/flow data (details in evidence/01-empty-agile.md).
- **VERIFIED — filled/default state:** Overview tab loaded a default metrics dashboard with 2 total/open tickets and charts (details in evidence/02-overview-filled.md).
- **BLOCKED — report creation/run:** No report builder, `Create report`, or `Run report` CTA was present. The only actionable control in the empty Agile view was `Capture today's snapshot` (plus `Capture today`), which is a data-history capture rather than creating/running a named report. I did not create `PXC-Report-1` or mutate report history.

## Exact URLs

- Project Reports (Agile Reports): `https://www.streamlineos.in/build/47/reports`
- Project Reports (Overview): `https://www.streamlineos.in/build/47/reports?tab=overview`
- Project landing used for scope: `https://www.streamlineos.in/build/47`

## UX notes (UI-observed only)

- Page title: **Reports**; subtitle: **Agile metrics and project analytics**.
- Tabs: **Agile Reports** (selected by default) and **Overview**.
- Empty Agile modules: **Velocity**, **Burnup · latest 100 cycles**, **Cumulative Flow**, **Cycle Time**, **Lead Time**, **Critical Path**.
- Empty copy explains prerequisites: cycles with estimated work; completed work/scope over a cycle date range; daily flow-history capture; completed tickets; and `blocks` relations.
- Export affordance: **Export velocity CSV** was disabled in the empty state.
- Cumulative Flow filter: **30 days** (combobox); controls **Capture today** and **Capture today's snapshot**.
- Overview defaults showed cards for Total tickets, Open, Completed, Completion rate, On-time rate, Avg velocity, plus State Distribution, Priority Breakdown, Volume Over Time, Completion by Assignee, Cycle Velocity, Estimate vs Actual.

No sign-out, membership/role, Client Access, or deletion actions were used.

## Design IDs
- **UX-030** — Named report create/run missing (snapshot ≠ report builder) — Completeness Next
- Overview defaults = good filled craft; Agile empty states explain prerequisites well
