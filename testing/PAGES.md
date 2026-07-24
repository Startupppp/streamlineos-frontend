# PROJECTS MODULE — AUDIT TRACKER (2026-07-14)

> Rebuilt mechanically from repo scan (glob + grep + line counts) after the first inventory
> agent's report was found fabricated. Every row below corresponds to a real page.tsx.
> Endpoints are traced per-page during the audit (Phase 3) by the owning group agent.
> Status: ⬜ pending · 🔄 in-progress · ✅ done

| # | Route | Page file (under frontend/app/(authenticated)/) | Group | Status | Result |
|---|-------|--------------------------------------------------|-------|--------|--------|
| 1 | /projects | projects/page.tsx | G4 | ✅ | table Lead/Members inline assign + edit sheet full fields (2026-07-24) |
| 2 | /projects/all | projects/all/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 3 | /projects/all-work | projects/all-work/page.tsx | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 4 | /projects/my-work | projects/my-work/page.tsx | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 5 | /projects/approvals | projects/approvals/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 6 | /projects/command-center | projects/command-center/page.tsx | G3 | ✅ | fills; roadmap tabs chain re-fixed by orchestrator (Tabs root + tab bodies) |
| 7 | /projects/roadmap | projects/roadmap/page.tsx | G3 | ✅ | fills; roadmap tabs chain re-fixed by orchestrator (Tabs root + tab bodies) |
| 8 | /projects/templates | projects/templates/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 9 | /projects/goal | projects/goal/page.tsx (362L) | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 10 | /projects/goal/[goalId] | projects/goal/[goalId]/page.tsx (619L — over cap) | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 11 | /projects/portfolios | projects/portfolios/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 12 | /projects/portfolios/[portfolioId] | projects/portfolios/[portfolioId]/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 13 | /projects/portal | projects/portal/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 14 | /projects/portal/[projectId] | projects/portal/[projectId]/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 15 | /projects/settings/integrations | projects/settings/integrations/page.tsx | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 16 | /projects/[projectId] | projects/[projectId]/page.tsx (749L — over cap) | G1 | ✅ | fill chain + inline edit states wired |
| 17 | /projects/[projectId]/backlog | projects/[projectId]/backlog/page.tsx (259L) | G1 | ✅ | fill chain + inline edit states wired |
| 18 | /projects/[projectId]/views | projects/[projectId]/views/page.tsx | G1 | ✅ | fill chain + inline edit states wired |
| 19 | /projects/[projectId]/my-tickets | projects/[projectId]/my-tickets/page.tsx | G1 | ✅ | fill chain + inline edit states wired |
| 20 | /projects/[projectId]/workload | projects/[projectId]/workload/page.tsx | G1 | ✅ | fill chain + inline edit states wired |
| 21 | /projects/[projectId]/timeline | projects/[projectId]/timeline/page.tsx | G1 | ✅ | fill chain + inline edit states wired |
| 22 | /projects/[projectId]/cycles/[cycleId] | projects/[projectId]/cycles/[cycleId]/page.tsx | G1 | ✅ | fill chain + inline edit states wired |
| 23 | /projects/[projectId]/cycles | projects/[projectId]/cycles/page.tsx (364L) | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 24 | /projects/[projectId]/tickets/[ticketKey] | projects/[projectId]/tickets/[ticketKey]/page.tsx | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 25 | /projects/[projectId]/epics | projects/[projectId]/epics/page.tsx | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 26 | /projects/[projectId]/sprints | projects/[projectId]/sprints/page.tsx (292L) | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 27 | /projects/[projectId]/milestones | projects/[projectId]/milestones/page.tsx | G2 | ✅ | fills + states; planning panel split partially regressed (636L) |
| 28 | /projects/[projectId]/reports | projects/[projectId]/reports/page.tsx | G3 | ✅ | fills; roadmap tabs chain re-fixed by orchestrator (Tabs root + tab bodies) |
| 29 | /projects/[projectId]/analytics | projects/[projectId]/analytics/page.tsx | G3 | ✅ | fills; roadmap tabs chain re-fixed by orchestrator (Tabs root + tab bodies) |
| 30 | /projects/[projectId]/budget | projects/[projectId]/budget/page.tsx | G3 | ✅ | fills; roadmap tabs chain re-fixed by orchestrator (Tabs root + tab bodies) |
| 31 | /projects/[projectId]/qa | projects/[projectId]/qa/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 32 | /projects/[projectId]/qa/runs/[runId] | projects/[projectId]/qa/runs/[runId]/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 33 | /projects/[projectId]/bugs | projects/[projectId]/bugs/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 34 | /projects/[projectId]/incidents | projects/[projectId]/incidents/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 35 | /projects/[projectId]/incidents/[incidentId] | projects/[projectId]/incidents/[incidentId]/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 36 | /projects/[projectId]/releases | projects/[projectId]/releases/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 37 | /projects/[projectId]/change-requests | projects/[projectId]/change-requests/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 38 | /projects/[projectId]/risks | projects/[projectId]/risks/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 39 | /projects/[projectId]/decisions | projects/[projectId]/decisions/page.tsx | G5 | ✅ | dark chips, releases canManage guard, releases RBAC keys added |
| 40 | /projects/[projectId]/meetings | projects/[projectId]/meetings/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 41 | /projects/[projectId]/meetings/[meetingId] | projects/[projectId]/meetings/[meetingId]/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 42 | /projects/[projectId]/chat | projects/[projectId]/chat/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 43 | /projects/[projectId]/whiteboard | projects/[projectId]/whiteboard/page.tsx (496L) | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 44 | /projects/[projectId]/client-portal | projects/[projectId]/client-portal/page.tsx | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |
| 45 | /projects/[projectId]/approvals | projects/[projectId]/approvals/page.tsx | G4 | ✅ | animated icons + fills; portfolios 400 was backend route shadowing (fixed) |
| 46 | /projects/[projectId]/settings | projects/[projectId]/settings/page.tsx (345L) | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 47 | /projects/[projectId]/workflow | projects/[projectId]/workflow/page.tsx | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 48 | /projects/[projectId]/automations | projects/[projectId]/automations/page.tsx (463L) | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 49 | /projects/[projectId]/webhooks | projects/[projectId]/webhooks/page.tsx (454L) | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 50 | /projects/[projectId]/modules | projects/[projectId]/modules/page.tsx (391L) | G7 | ✅ | loading.tsx rebuilt on PmPageShell, workflow/git fills, module-card dark |
| 51 | /projects/[projectId]/forms | projects/[projectId]/forms/page.tsx | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 52 | /projects/[projectId]/forms/[formId] | projects/[projectId]/forms/[formId]/page.tsx | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 53 | /projects/[projectId]/intake | projects/[projectId]/intake/page.tsx (397L) | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 54 | /projects/[projectId]/feedbucket | projects/[projectId]/feedbucket/page.tsx | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 55 | /projects/[projectId]/feedbucket/[submissionId] | projects/[projectId]/feedbucket/[submissionId]/page.tsx | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 56 | /projects/[projectId]/pages | projects/[projectId]/pages/page.tsx (426L) | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 57 | /projects/[projectId]/ai | projects/[projectId]/ai/page.tsx | G8 | ✅ | forms/intake/feedbucket fills; builder canvas exempt |
| 58 | /projects/[projectId]/whiteboard hub redirect + any intercepted routes (verify no orphans) | — | G6 | ✅ | meetings split wired, dedup, dark badges, chat/whiteboard fills |

## Group ownership (feature folders — each folder belongs to exactly ONE group)

- **G1 Views engine + board:** `features/projects/views/**`, `features/projects/shared/**` (pm-chrome, ticket-filter-bar, filter-* menus, badges, types), `features/projects/project-detail/**`, `features/projects/backlog/**`
- **G2 Tickets & lifecycle:** `tickets/`, `ticket-details/`, `epics/`, `sprints/`, `milestones/`, `all-work/`, `my-work/`
- **G3 Analytics & insight:** `analytics/`, `reports/`, `command-center/`, `roadmap/`
- **G4 Workspace & portfolio:** `project-list/`, `project-create/`, `portfolios/`, `goals/`, `templates/`, `approvals/`
- **G5 Ops & governance:** `qa/`, `bugs/`, `incidents/`, `releases/`, `change-requests/`, `governance/`
- **G6 Comms & clients:** `meetings/`, `comments/`, `client-portal/`, `whiteboard/`, chat page
- **G7 Config & automation:** `settings/`, `workflow/`, `automations/`, `webhooks/`, `modules/`
- **G8 Intake & content:** `forms/`, `intake/`, `feedbucket/`, `ai/`, pages page
- Cross-group shared code (`components/ui/**`, `hooks/**`, `lib/**`, `sidebar/`) — orchestrator-owned; agents REPORT, never edit.

## Verified grep-level findings (2026-07-14)

**Files over the 500-line hard cap (re-measured 2026-07-15 — KNOWN DEBT, split deferred; cohesive view engines, splitting them at session tail was judged too risky):**
- `features/projects/views/list-view.tsx` — 862 (grew in inline-edit pass)
- `app/(authenticated)/projects/[projectId]/page.tsx` — 787
- `features/projects/views/kanban-board.tsx` — 670
- `features/projects/sprints/sprint-planning-panel.tsx` — 636
- `features/projects/meetings/meeting-form-sheet.tsx` — 540 (large multi-section form sheet)
- `features/projects/shared/filter-category-submenu.tsx` — 531
- FIXED: meetings-list-page 640→383, goal/[goalId] 619→378, whiteboard page 528→463

**Retired violet/purple/indigo classes:** FIXED 2026-07-15 — template-card-utils.ts recolored to blue family + dark triads. `MODULE_ACCENTS` in sidebar-nav-items.ts (projects→violet) left deliberately (cross-module wayfinding system) — awaiting product decision.

**Universal primitives (fix once, verify everywhere):** `shared/pm-chrome.tsx` (PmPageShell/PmPanel/PmSection/PM_TOOLBAR/PM_PANEL) used by all pages + loading.tsx files; `shared/ticket-filter-bar.tsx` + `filter-*` menus; views engine (`kanban-board`, `list-view`, `table-view`, `calendar-view`, `gantt-view`, `workload-view`, `view-switcher`, `display-options-panel`) shared by board/cycle-detail/timeline/views pages.
