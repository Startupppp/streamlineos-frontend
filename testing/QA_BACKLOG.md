# StreamlineOS Core Module QA Backlog

> Spec: `docs/superpowers/specs/2026-07-24-core-module-qa-program-design.md`  
> Audit procedure: `testing/AUDIT_FRAMEWORK.md`  
> Defect template: `testing/tickets/DEFECT_TEMPLATE.md`  
> MCP sync plan: `docs/superpowers/plans/2026-07-24-core-module-qa-foundation.md`

Track progress by flipping each ticket `Status` from `todo` → `in-progress` → `done` (or `blocked` / `cancelled` / `deferred`).  
Page audits also require [tickets/PAGE_AUDIT_CHECKLIST.md](tickets/PAGE_AUDIT_CHECKLIST.md) including the mandatory **Mobile responsive** section (375 / 768 / 1280).  
Dedicated mobile track: [tickets/m-mobile-responsive.md](tickets/m-mobile-responsive.md) (one ticket per route + shell journeys).  
**Do not treat prior UI ✅ in `testing/PAGES.md` as QA-done** — those were visual conformance passes, not workflow/RBAC/API verification.

---

## Progress dashboard

| Milestone | File | Tickets | Est (sp) | Est (h) | Done | In progress | Blocked | % complete |
|-----------|------|--------:|---------:|--------:|-----:|------------:|--------:|-----------:|
| M0 Foundation | [tickets/m0-foundation.md](tickets/m0-foundation.md) | 12 | 43 | 62 | 2 | 0 | 0 | **17%** |
| M1 Projects — pages | [tickets/m1-projects-pages.md](tickets/m1-projects-pages.md) | 66 | 75 | 75 | 0 | 0 | 0 | **0%** |
| M1 Projects — workflows | [tickets/m1-projects-workflows.md](tickets/m1-projects-workflows.md) | 66 | 211 | 290 | 0 | 0 | 0 | **0%** |
| M2 Workspace admin | [tickets/m2-workspace-admin.md](tickets/m2-workspace-admin.md) | 77 | 174 | 222 | 0 | 0 | 0 | **0%** |
| M3 Chat / Inbox / Calendar | [tickets/m3-chat-inbox-calendar.md](tickets/m3-chat-inbox-calendar.md) | 38 | 100 | 133 | 0 | 0 | 0 | **0%** |
| M4 Release readiness | [tickets/m4-release-readiness.md](tickets/m4-release-readiness.md) | 11 | 39 | 56 | 0 | 0 | 0 | **0%** |
| Mobile responsive | [tickets/m-mobile-responsive.md](tickets/m-mobile-responsive.md) | 135 | 143 | 147 | 0 | 0 | 0 | **0%** |
| **TOTAL** | | **405** | **785** | **985** | **2** | **0** | **0** | **1%** |

**% complete** = `done / (tickets − cancelled − deferred) × 100` per milestone (cancelled/deferred stay listed but do not block %). Update Done/% when you close tickets.

**Estimate scale:** S=1sp/1h · M=2sp/2h · L=3sp/4h · XL=5sp/8h (column `Est` on each ticket).

**StreamlineOS mirror:** project `QA` (id 4) · full list: [tickets/STREAMLINEOS_TICKET_LIST.md](tickets/STREAMLINEOS_TICKET_LIST.md) · create API `POST /agent/v1/projects/:projectId/tickets` with agent bearer token.


### By type (after mobile track 2026-07-24c)

| Type | Count | Notes |
|------|------:|-------|
| page-audit | 122 | Checklist Mobile section now **mandatory** (not spot-check); inbox canonical = M3 |
| mobile-audit | 123 | Per-route mobile tickets in [m-mobile-responsive.md](tickets/m-mobile-responsive.md) (+ 2 redirect-smoke + 3 deferred invoice routes) |
| epic (mobile) | 3 | `QA-MOB-E-001..003` |
| journey (incl. mobile shell) | prior + 4 | `QA-MOB-J-001..004` shell / chat / projects / settings |
| journey / rbac / api / gap / automation / redirect-smoke / deferred (non-mobile) | ~148 | Prior gap-fill set |
| cancelled / deferred (still listed) | 7 | M1 inbox dup cancelled; M2+MMOB accounting invoices deferred (3+3) |
| **TOTAL** | **405** | Mobile milestone 135 · prior 270 |

### Spec coverage notes (verified)

| Spec topic | Coverage |
|------------|----------|
| Org Alpha / Org Beta | `QA-M0-003/004`, cross-tenant `QA-M1-R-010`, `QA-M1-X-002`, `QA-M2-J-002`, `QA-M2-R-*`, `QA-M4-004` |
| RBAC matrix | `QA-M0-005/007`, all `*-R-*`, scopes `QA-M1-R-011`, `QA-M2-J-007` |
| Client portal | pages + `QA-M1-J-011..013`, `J-038` file matrix, `QA-M1-R-005`, `QA-M1-A-003` + mobile `/intake` `/board` |
| Approval types | **`QA-M1-J-030..037`** (task→timesheet) + edges `J-026..029` hardened; map `G-006` |
| Billing subscription | upgrade/downgrade `J-017`, promo `J-018`, profile `J-019`; AI credits `J-009`; accounting invoices deferred |
| Chat search / calendar recurrence | `QA-M3-J-013`, `QA-M3-J-014` |
| API idempotency | `QA-M1-A-007/008`, `QA-M2-A-003` |
| Page-audit rigor | Shared [PAGE_AUDIT_CHECKLIST.md](tickets/PAGE_AUDIT_CHECKLIST.md) |
| **Mobile responsive** | Checklist M1–M9 + milestone [m-mobile-responsive.md](tickets/m-mobile-responsive.md) · **0% executed** |
| M4 | security pack `QA-M4-008`, perf smoke `QA-M4-009` + prior release gates |

Route inventory: Projects 66 page rows (1 cancelled dup), admin 48, chat/calendar/notifications/mail + inbox 13, public portal intake/board 2. Redirect-smoke: seats + settings/subscription. Mobile page tickets: **128** (zero missing vs repo inventory).

---

## Epics

| Epic | Milestone | Outcome |
|------|-----------|---------|
| E0 QA Foundation | M0 | Seeded orgs/roles, evidence rules, tracker sync |
| E1 Projects delivery | M1 | Page-by-page + approvals + client portal + first-slice journey |
| E2 Workspace control plane | M2 | Org / People / Access / Subscription / Platform / Security / Developer |
| E3 Collaboration surfaces | M3 | Chat realtime, Inbox deep links, unified Calendar |
| E4 Hardening / release | M4 + X-* | Automate P0/P1 once manually green; release gate evidence |
| E-MOB Projects | MOB `QA-MOB-E-001` | Every Projects route mobile-verified at 375/768/1280 |
| E-MOB Workspace | MOB `QA-MOB-E-002` | Org/People/Access/Billing/Owner/Security/Developer mobile-verified |
| E-MOB Collaboration | MOB `QA-MOB-E-003` | Chat/Inbox/Calendar/Mail + shell journeys mobile-verified |

---

## How to mark completion

1. Open the ticket row in the milestone file.
2. Set `Status` to `done` only when acceptance criteria are met **with evidence** (screenshot/HAR/API status as required by type).
3. Update the Progress dashboard counts above.
4. File bugs with `testing/tickets/DEFECT_TEMPLATE.md` (IDs `DEF-YYYYMMDD-NNN`).
5. Feature gaps stay `todo` until a PM validates competitor gap → then spawn a product ticket; mark the gap ticket `done` when the product ticket exists (or `done` if “no gap”).

### Role keys used in tickets

`platform-admin` · `owner` · `admin` · `PM` · `contributor` · `approver` · `client` · `denied` · `member` · `multi` · `n/a` (API-only)

---

## Route inventory source (repo-verified)

Inventories were generated from real `frontend/app/**/page.tsx` files (2026-07-24; re-verified for mobile 2026-07-24c):

- Projects: **66** routes under `(authenticated)/projects` (inbox mobile ticket lives with M3 collab set)
- Workspace admin: organization / users / settings / billing / `app/owner/**` (platform)
- Chat / Calendar / Notifications / Mail (+ `/projects/inbox`): **13** page-audit routes in M3
- Public portal (Projects-related): `/intake/[projectId]`, `/board/[shareToken]`

Newer Projects routes not in the old `testing/PAGES.md` (58) but included here:  
`/projects/inbox`, `/projects/members`, `/projects/teams`, `/projects/teams/[teamId]`, `/projects/drafts`, `/projects/customers`, `/projects/[projectId]/wiki`, `/projects/[projectId]/wiki/[pageId]`, `/projects/[projectId]/triage`

---

## StreamlineOS MCP status

Configured locally via `.cursor/mcp.json` (gitignored). API URL: `http://localhost:1500`.  
Project mirror: **QA** — see [tickets/STREAMLINEOS_TICKET_LIST.md](tickets/STREAMLINEOS_TICKET_LIST.md).

Create APIs used (agent token): `POST /agent/v1/projects`, `POST /agent/v1/projects/:projectId/tickets`.

Never commit `slos_` tokens.

---

## Suggested execution order

1. Close **M0** (`QA-M0-001`…`012`) — environment + seeds + roles.  
2. Run **QA-M1-J-025** first-slice journey (drives many defects early).  
3. Page-audit Projects P0 routes (approvals, portal, inbox, tickets, settings) — includes mandatory mobile checklist.  
4. Run **QA-MOB-J-001..004** (shell / chat / projects / settings) early to catch chrome defects.  
5. Execute **QA-MOB-P-*** per route (or in parallel with page-audits for the same route).  
6. M1 RBAC + API (`QA-M1-R-*`, `QA-M1-A-*`).  
7. M2 Access / Security / People (P0).  
8. M3 Chat + Inbox + Calendar P0 journeys.  
9. Automations `*-X-*` only after matching journeys are green.
