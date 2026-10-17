# Surface Ledger — Completeness Wave · Owner (`D-`)
Org: `PXC-Design-A-20260930` · Role: Owner · Date: 2026-09-30 · Desktop 1280×800  
Truth: VERIFIED unless noted. Empty states dominate (new org).

## A. Build chrome

| ID | Route | Purpose / controls | State |
|----|-------|--------------------|-------|
| D-100 | `/build/command-center` | Overview; CTAs My issues/Inbox/Projects/Roadmap/Approvals/Teams/Wiki/Meetings/Chat/AI; filters issue scope, project owner, health; widgets Projects/Open issues/Overdue/My issues/Pending approvals/Agent signal/Open risks/Releases | VERIFIED (1 project) |
| D-101 | `/build` Projects | New Project; search; Filters Status/Lead/Health/Start/Target; Display; Grid/List; grouping | VERIFIED · Alpha listed |
| D-102 | `/build/managed-products` | New product; search; Status; Sort | Empty VERIFIED |
| D-103 | `/build/portfolios` | New portfolio; search; Status/Health/Owner/Filters | Empty VERIFIED |
| D-104 | `/build/programs` | New program; search; Status/Health/Owner/Filters | Empty VERIFIED |
| D-105 | `/build/teams` | New team; search | Empty VERIFIED |
| D-106 | `/build/inbox` | Unread/All/Mentions; search; category; select-all | Empty detail VERIFIED |
| D-107 | `/build/inbox?view=drafts` | Comment Drafts | Empty VERIFIED |
| D-108 | `/build/my-work` | Assigned/Created/Subscribed/Overdue/Due Soon/Activity; filters Status/Priority/Type/Due; sort; List; Display | Empty VERIFIED |
| D-109 | `/build/all-work` | Browse all; Views; group by Project; my tickets; search; filters | 1 ticket VERIFIED |
| D-110 | `/build/settings/integrations` | Connections + Agent access; Add connection; search | VERIFIED empty connections |

## B. Org More tools

| ID | Route | Controls | State |
|----|-------|----------|-------|
| D-120 | `/build/roadmap` | New Item; Roadmap/Feedback/Changelog; search; Status/Sort/Owner/Horizon | Empty VERIFIED |
| D-121 | `/build/goals` | New Goal; Level/Status/Owner/Filters; widgets Total/On Track/At Risk/Avg Progress | Empty VERIFIED |
| D-122 | `/build/approvals` | search; Status/Type/date-range; table | Empty VERIFIED |
| D-123 | `/build/templates` | Templates region | Empty VERIFIED |
| D-124 | `/build/settings/client-access` | Invite Client; Grant Access; search | Empty grants (BUG-005/006) |
| D-125 | `/build/settings/access` | Members + Access control Roles/Members/Ownership; Audit; New group | VERIFIED |

## C. Project `/build/47`

| ID | Route | Controls | State |
|----|-------|----------|-------|
| D-200 | `/build/47` | Status cards; Issues by status; Recent activity | VERIFIED · Health At risk |
| D-201 | `/build/47/issues?view=board` | Create/Summarize/Import-Export/Log time; filters Status/Priority/Type/Assignee/Due; Hide done; Board columns | VERIFIED · 1 Todo |
| D-202 | `?view=list` | Inline status/type/priority/labels/estimate/due/assignee | VERIFIED |
| D-203 | `?view=table` | Table | VERIFIED |
| D-204 | Calendar | Redirect `/calendar?source=build&projectId=47`; week nav; sources; Calendar/List/History | VERIFIED |
| D-205 | `?view=timeline` | Timeline controls | VERIFIED |
| D-206 | `?view=workload` | Workload + about metrics | VERIFIED |
| D-207 | `/build/47/backlog` | Create; search; filters; table cols | Settled empty VERIFIED |
| D-208 | `/build/47/cycles` | Cycles region | Empty VERIFIED |
| D-209 | `/build/47/releases` | New Release; search; Status/date; widgets | Empty VERIFIED |
| D-210 | `/build/47/updates` | Post Update | Empty VERIFIED |
| D-211 | `/build/47/files` | Upload | Empty VERIFIED |
| D-212 | `/build/47/client-portal` | Publish switch; Grants/Visibility/Preview; Manage grants | Unpublished · no grants |

### Project settings

| ID | Route | Notes |
|----|-------|-------|
| D-220 | `settings?section=general` | Name/desc/status/members/Save |
| D-221 | `?section=labels` | Add Label · empty |
| D-222 | `?section=statuses` | TODO/IN_PROGRESS/IN_REVIEW/DONE |
| D-223 | `?section=custom-fields` | Add · empty |
| D-224 | `?section=teams` | Teams & roster region |
| D-225 | `?section=danger` | Delete Project (not clicked) |

### Project More tools

| ID | Route | Notes |
|----|-------|-------|
| D-230 | `/triage` | Search · empty |
| D-231 | `/epics` | Empty |
| D-232 | `/milestones` | New Milestone; Status/Owner/date · empty |
| D-233 | `/workload` | Heading only |
| D-234 | `/meetings` | New Meeting; Type/Status/Date · loading/table |
| D-235 | `/approvals` | Request approval; filters · empty |
| D-236 | `/qa` | New Test Case; Cases/Runs · loading |
| D-237 | `/incidents` | New Incident; Status/Severity; widgets · empty |
| D-238 | `/change-requests` | New CR; Status/Visibility · empty |
| D-239 | `/intake` | Empty |
| D-240 | `/chat` | No channel · Create chat channel |
| D-241 | `/wiki` | New page; tree; search · empty |
| D-242 | `/whiteboard` | New Board · empty CTA |
| D-243 | `/reports` | Velocity/Burnup/CFD/Cycle/Lead/Critical Path; Export CSV disabled · loading |
| D-244 | `/budget` | Set Budget; Planned/Actual/Remaining ₹0 |
| D-245 | `/risks` | New Risk; Status/Probability/Impact · empty |
| D-246 | `/decisions` | New Decision · empty |
| D-247 | `/forms` | New form · empty |
| D-248 | `/settings/workflow` | Statuses/WIP/transitions/approvals/roles · loading |
| D-249 | `/modules` | Empty |
| D-250 | `/settings/automations` | New Automation · empty |
| D-251 | `/settings/integrations/webhooks` | Add Webhook; filters · empty |

## D. Errors
- No 404/deny/OTP/pay in this pass.
- Settings section nav: console errors but UI rendered.
- Many lists: brief loading → empty (perceived performance note).

## UX themes for Completeness (Owner)
1. **Empty-state consistency** strong across New-* CTAs — preserve EmptyState contract.
2. **More-tools sprawl** confirmed (~20 project tools) — UX-010 still valid.
3. **Filter grammar** shared (Status/Owner/Health/search) — candidate FilterBar system component.
4. **Client portal** unpublished + broken grant path — Freeze PM-001.
5. **Calendar leave-Build** redirect to `/calendar` — IA seam to suite.

## Still Owner-depth optional
Global `/settings/roles|billing|api-tokens|organization` (partially covered earlier Freeze) · happy-path create on each empty tool · mobile.
