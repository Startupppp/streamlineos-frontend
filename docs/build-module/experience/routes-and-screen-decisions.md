# Route and screen decisions

Status: Planned

This table is the target UI contract. The current application manifest remains unchanged by this documentation revision. Existing routes were checked against 75 page files on 2026-10-02. A screen hidden from the sidebar remains reachable by authorized deep link. No underlying data is deleted as part of screen consolidation.

## Existing routes — 75 decisions

| Existing route | Decision | Target/destination | Screen contract | Opening |
|---|---|---|---|---|
| `/build` | Personalized redirect | `saved allowed landing; default /build/command-center` | [Build entry](./screens/projects.md) | temporary server redirect after access resolution |
| `/build/[projectId]` | Keep | `/build/[projectId]` | [Project overview](./screens/projects.md) | ticket pane; milestone pane; cycle detail full page; client context opens owning module |
| `/build/[projectId]/approvals` | Keep | `/build/[projectId]/approvals` | [Project approvals](./screens/client-delivery.md) | decision sheet; file preview; ticket pane |
| `/build/[projectId]/backlog` | Keep | `/build/[projectId]/backlog` | [Backlog](./screens/planning.md) | ticket pane; target cycle/release planning sheet |
| `/build/[projectId]/budget` | Keep | `/build/[projectId]/budget` | [Time and Budget](./screens/reporting.md) | time sheet; Accounting page; change-request pane |
| `/build/[projectId]/change-requests` | Keep | `/build/[projectId]/change-requests` | [Change requests](./screens/client-delivery.md) | change pane; approval sheet; Accounting contextual page |
| `/build/[projectId]/chat` | Keep | `/build/[projectId]/chat` | [Project chat](./screens/collaboration.md) | thread pane; ticket pane; important decision full record |
| `/build/[projectId]/client-portal` | Keep | `/build/[projectId]/client-portal` | [Portal administration and preview](./screens/client-delivery.md) | preview full portal context; grant sheet; artifact pane |
| `/build/[projectId]/cycles` | Keep | `/build/[projectId]/cycles` | [Cycles](./screens/planning.md) | cycle full page; linked ticket pane |
| `/build/[projectId]/cycles/[cycleId]` | Keep | `/build/[projectId]/cycles/[cycleId]` | [Cycle detail](./screens/planning.md) | ticket pane; completion impact sheet |
| `/build/[projectId]/decisions` | Keep | `/build/[projectId]/decisions` | [Decisions register](./screens/client-delivery.md) | decision pane; source record nested/full according to type |
| `/build/[projectId]/epics` | Keep | `/build/[projectId]/epics` | [Epics](./screens/planning.md) | epic pane; linked issue nested pane; full-page promotion |
| `/build/[projectId]/feedbucket` | Consolidate | `/build/[projectId]/intake?view=bug-reports` | [Legacy bug-feedback list](./screens/client-delivery.md) | temporary redirect after project access |
| `/build/[projectId]/feedbucket/[submissionId]` | Consolidate | `/build/[projectId]/intake/[requestId]` | [Legacy bug-feedback detail](./screens/client-delivery.md) | explicit legacy mapping then temporary redirect |
| `/build/[projectId]/files` | Keep | `/build/[projectId]/files` | [Project files](./screens/collaboration.md) | file preview sheet; linked ticket pane |
| `/build/[projectId]/forms` | Keep | `/build/[projectId]/forms` | [Forms list](./screens/collaboration.md) | form full builder; submissions Intake filtered |
| `/build/[projectId]/forms/[formId]` | Keep | `/build/[projectId]/forms/[formId]` | [Form builder](./screens/collaboration.md) | full builder; submissions pane; public preview |
| `/build/[projectId]/incidents` | Keep | `/build/[projectId]/incidents` | [Incidents list](./screens/quality.md) | incident full command page; release pane |
| `/build/[projectId]/incidents/[incidentId]` | Keep | `/build/[projectId]/incidents/[incidentId]` | [Incident command and postmortem](./screens/quality.md) | full page; action ticket pane; external publish confirmation |
| `/build/[projectId]/intake` | Keep | `/build/[projectId]/intake` | [Project intake](./screens/client-delivery.md) | request pane; created ticket pane; bug attachments preview |
| `/build/[projectId]/issues` | Keep | `/build/[projectId]/issues` | [Project work views](./screens/daily-work.md) | ticket pane; calendar drag previews date impact; timeline dependency review |
| `/build/[projectId]/meetings` | Keep | `/build/[projectId]/meetings` | [Meetings list](./screens/collaboration.md) | meeting full page; action ticket pane |
| `/build/[projectId]/meetings/[meetingId]` | Keep | `/build/[projectId]/meetings/[meetingId]` | [Meeting detail](./screens/collaboration.md) | ticket pane; Calendar owning module page |
| `/build/[projectId]/milestones` | Keep | `/build/[projectId]/milestones` | [Milestones](./screens/planning.md) | milestone pane; artifact approval sheet |
| `/build/[projectId]/modules` | Rename UI: Workstreams | `/build/[projectId]/modules` | [Workstreams](./screens/planning.md) | workstream pane; ticket nested pane |
| `/build/[projectId]/qa` | Keep | `/build/[projectId]/qa` | [QA catalog](./screens/quality.md) | case pane; run full execution page |
| `/build/[projectId]/qa/runs/[runId]` | Keep | `/build/[projectId]/qa/runs/[runId]` | [QA run execution](./screens/quality.md) | full page; defect ticket pane; file preview |
| `/build/[projectId]/releases` | Keep | `/build/[projectId]/releases` | [Releases](./screens/quality.md) | release pane; ticket nested; deployment provider full page |
| `/build/[projectId]/reports` | Keep | `/build/[projectId]/reports` | [Project reports](./screens/reporting.md) | metric opens exact filtered work collection; builder full page |
| `/build/[projectId]/risks` | Keep | `/build/[projectId]/risks` | [Risk register](./screens/client-delivery.md) | risk pane; mitigation ticket nested pane |
| `/build/[projectId]/settings` | Keep | `/build/[projectId]/settings` | [Project settings](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/access` | Keep | `/build/[projectId]/settings/access` | [Project access](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/agents` | Keep | `/build/[projectId]/settings/agents` | [AI policy and history](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/agents/credentials` | Keep | `/build/[projectId]/settings/agents/credentials` | [Agent credentials](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/automations` | Keep | `/build/[projectId]/settings/automations` | [Automation rules and runs](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/fields` | Keep | `/build/[projectId]/settings/fields` | [Custom fields](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/integrations` | Keep | `/build/[projectId]/settings/integrations` | [Project integration mappings](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/integrations/webhooks` | Keep | `/build/[projectId]/settings/integrations/webhooks` | [Webhooks and attempts](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/iterations` | Keep | `/build/[projectId]/settings/iterations` | [Cycle settings](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/portal` | Keep | `/build/[projectId]/settings/portal` | [Portal settings](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/retention` | Keep | `/build/[projectId]/settings/retention` | [Retention and recovery](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/views` | Keep | `/build/[projectId]/settings/views` | [Saved views](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/settings/workflow` | Keep | `/build/[projectId]/settings/workflow` | [Workflow designer](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/[projectId]/tickets/[ticketKey]` | Keep | `/build/[projectId]/tickets/[ticketKey]` | [Ticket detail](./screens/daily-work.md) | direct link full page; collection intercepted pane; related ticket replaces pane with back stack |
| `/build/[projectId]/triage` | Keep | `/build/[projectId]/triage` | [Triage mode](./screens/client-delivery.md) | request/ticket pane; next item remains queue context |
| `/build/[projectId]/updates` | Keep | `/build/[projectId]/updates` | [Project updates](./screens/collaboration.md) | update pane; editor sheet; linked work pane |
| `/build/[projectId]/whiteboard` | Keep | `/build/[projectId]/whiteboard` | [Whiteboard](./screens/collaboration.md) | full canvas; linked ticket pane |
| `/build/[projectId]/wiki` | Keep | `/build/[projectId]/wiki` | [Project knowledge index](./screens/collaboration.md) | wiki full editor; backlink ticket pane |
| `/build/[projectId]/wiki/[pageId]` | Keep | `/build/[projectId]/wiki/[pageId]` | [Knowledge page](./screens/collaboration.md) | full editor; ticket pane; history page |
| `/build/[projectId]/wiki/[pageId]/history` | Keep | `/build/[projectId]/wiki/[pageId]/history` | [Knowledge history](./screens/collaboration.md) | full history; back to page at selected version |
| `/build/[projectId]/workload` | Keep | `/build/[projectId]/workload` | [Workload](./screens/reporting.md) | ticket pane; person capacity sheet; HR availability contextual action |
| `/build/all-work` | Keep | `/build/all-work` | [All Work](./screens/daily-work.md) | ticket pane; metric/source link uses same predicate |
| `/build/approvals` | Keep | `/build/approvals` | [Organization approval queue](./screens/client-delivery.md) | decision sheet with immutable artifact; artifact deep link |
| `/build/command-center` | Keep | `/build/command-center` | [Command Center](./screens/projects.md) | widget record pane; metric opens exact filtered collection; complex editor full page |
| `/build/goals` | Keep | `/build/goals` | [Goals list](./screens/planning.md) | goal full page; quick check-in sheet |
| `/build/goals/[goalId]` | Keep | `/build/goals/[goalId]` | [Goal detail](./screens/planning.md) | ticket pane; initiative pane; product full page |
| `/build/inbox` | Keep | `/build/inbox` | [Build inbox](./screens/daily-work.md) | notification target pane; document/editor full page; approval sheet |
| `/build/managed-products` | Keep | `/build/managed-products` | [Products list](./screens/product-discovery.md) | product full page; quick status inline |
| `/build/managed-products/[managedProductId]` | Keep | `/build/managed-products/[managedProductId]` | [Product overview](./screens/product-discovery.md) | evidence/opportunity pane; project/release full detail |
| `/build/managed-products/[managedProductId]/feedback` | Keep | `/build/managed-products/[managedProductId]/feedback` | [Product feedback](./screens/product-discovery.md) | feedback pane; related ticket nested pane |
| `/build/managed-products/[managedProductId]/goals` | Keep | `/build/managed-products/[managedProductId]/goals` | [Product goals](./screens/product-discovery.md) | goal full page; source evidence pane |
| `/build/managed-products/[managedProductId]/insights` | Keep | `/build/managed-products/[managedProductId]/insights` | [Product insights](./screens/product-discovery.md) | opportunity pane; source feedback pane; outcome review sheet |
| `/build/managed-products/[managedProductId]/projects` | Keep | `/build/managed-products/[managedProductId]/projects` | [Product projects](./screens/product-discovery.md) | project full page; link sheet |
| `/build/managed-products/[managedProductId]/roadmap` | Keep | `/build/managed-products/[managedProductId]/roadmap` | [Product roadmap](./screens/product-discovery.md) | initiative pane; evidence/ticket nested pane |
| `/build/my-work` | Keep | `/build/my-work` | [My Work](./screens/daily-work.md) | ticket pane; draft editor sheet; approved time opens Timesheets |
| `/build/portfolios` | Keep | `/build/portfolios` | [Portfolios](./screens/planning.md) | portfolio full page; risk pane |
| `/build/portfolios/[portfolioId]` | Keep | `/build/portfolios/[portfolioId]` | [Portfolio detail](./screens/planning.md) | project full page; risk/decision pane; scenario preview |
| `/build/programs` | Keep | `/build/programs` | [Programs](./screens/planning.md) | program pane/full-page promotion; project full page |
| `/build/roadmap` | Keep | `/build/roadmap` | [Organization roadmap](./screens/planning.md) | initiative pane; ticket pane; external projection preview |
| `/build/settings/access` | Keep | `/build/settings/access` | [Build access](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/settings/client-access` | Keep | `/build/settings/client-access` | [Client grants](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/settings/integrations` | Keep | `/build/settings/integrations` | [Organization Build integrations](./screens/settings.md) | short edit sheet; complex workflow/rule builder full page; privileged impact confirmation |
| `/build/teams` | Keep | `/build/teams` | [Teams list](./screens/projects.md) | team full page; person limited profile pane |
| `/build/teams/[teamId]` | Keep | `/build/teams/[teamId]` | [Team detail](./screens/projects.md) | ticket pane; cycle full page; role change review sheet |
| `/build/templates` | Keep | `/build/templates` | [Templates](./screens/projects.md) | preview sheet → destination/mapping → impact review → durable job → project |

## Proposed destinations and persona aliases

| Destination | Decision | Owner / behavior |
|---|---|---|
| /build/projects | Add | Membership-scoped Projects list; reserved static route before dynamic project ID |
| /build/programs/[programId] | Add | Stable Program detail page; list selection may intercept into a pane, direct link/refresh opens full page |
| /build/reports | Add compatibility destination | Resolve to `/build/all-work?view=reports` until a dedicated organization report owner is justified; preserve authorized query and saved-view ID |
| /build/clients | Add | Build delivery index; CRM remains customer/contact/deal owner |
| /build/[projectId]/intake/[requestId] | Add | Stable intake detail, including mapped legacy bug report |
| /build/budget | Add compatibility destination | Organization budget overview resolves to governed Reports budget view; explicit route prevents the historical 404 and retains filtered scope |
| Assigned navigation | Consolidate | /build/my-work?section=assigned; current sidebar item need not imply a separate page |
| Drafts navigation | Consolidate | /build/my-work?section=drafts; private revisioned drafts |
| Briefs | Persona alias | /build/[projectId]/issues?view=briefs; content work type |
| Content Pipeline | Persona alias | /build/[projectId]/issues?view=content-pipeline; configured board |
| Content Calendar | Persona alias | /build/[projectId]/issues?view=content-calendar; calendar display |
| Assets | Persona alias | /build/[projectId]/files; authorized files projection |
| Current Cycle | Context link | Resolve team/project current cycle; no current cycle opens scoped cycle list |
| Organization Intake | Scoped collection | /build/all-work?view=intake; query includes intake record type and source-specific capabilities |
| Organization Forms | Scoped collection | /build/all-work?view=forms; form records, not fabricated tickets |
| Organization Releases | Scoped collection | /build/all-work?view=releases; release records with source project |
| Organization Workload | Scoped view | /build/all-work?view=workload; capacity query over authorized projects |
| Organization Reports | Scoped view | /build/all-work?view=reports; governed reports and report job results |
| Organization Automations | Scoped collection | /build/all-work?view=automations; permitted project rules and run state |
| Calendar shortcut | Owning-module handoff | /calendar in Home for meetings/provider events; work dates remain inside Build views |
| Integration shortcut | Keep | /build/settings/integrations |
| Access/settings shortcut | Keep | /build/settings/access; project settings use project context |
| Files without selected project | Scoped view | /build/all-work?view=files; Files projection, permission checked |
| /client-portal | External audience, Current unverified route | Grant-authenticated project list; [external portal screen](./screens/external-client-portal.md); never internal /build chrome |
| /client-portal/[projectId] | External audience, Current unverified route | Grant-authenticated project overview and conditional client-safe tabs; [external portal screen](./screens/external-client-portal.md) |

All Work uses a typed recordKind chosen by the registered view: ticket, intake, form, release, automation, file, report, or capacity. Each kind retains its own projection, filterable fields and command owner. Mixed universal results use only common name/source/type/time fields and never coerce all kinds into ticket schema.

## Redirect compatibility

- Personalized entry and migration redirects use 302 for GET navigation; JSON endpoints return canonical destination metadata. Never replay an old POST through a navigation redirect.
- Preserve only allowlisted view/filter query values; reject arbitrary return URLs. Authorization occurs before redirect or existence lookup.
- Feedbucket mapping is unique by organization/project/provider/legacySubmissionId and stores canonicalRequestId. Missing mappings show recoverable neutral state; migration reconciles attachments, annotations, source identities, and linked ticket without assuming equal IDs.
- Deployment adds new static destinations before dynamic project routing. Refresh and direct URLs resolve server-side with same policy as client navigation.
- Portal token URLs never appear in internal history/return state. Remove exchange token after obtaining portal session.

## Sidebar destinations

Four stable core items: Command Center, My Work, Inbox, Projects. All Work and persona-specific items are pins; maximum eight visible destinations plus More. More is searchable/grouped and includes every permitted advanced destination. Persona templates rename configured views, not record models. Admin defaults cannot expose denied records.

## Removed and deferred screen decisions

Remove separate Assigned and Drafts navigation pages, standalone Briefs/Assets/Content Pipeline data silos, duplicate Feedbucket workflow navigation, and duplicate Projects content at /build. Preserve links and data through the table above.

Advanced whiteboard/collaborative canvas, deep QA/incident tooling, scenario simulation, retainer automation and self-hosting are Deferred beyond dependable activation/client delivery. Their existing routes stay authorized and honest about availability; never remove a working tool without migration/retention plan.

## Acceptance

Every manifest route appears exactly once above. Every sidebar destination resolves to an existing or explicitly Planned route/view. Test deep link, old link, query preservation, access denial, browser Back, refresh, mobile and source-record mapping. No route implementation changes are included in this documentation commit.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Re-run the route census and reconcile every one of the 75 existing Build page routes to an explicit keep, redirect, merge, or deferred destination in this table.
- [ ] Implement `/build` as authorized personalized entry and dedicated Projects destination; wire sidebar/More links only to accessible targets.
- [ ] Implement recorded compatibility redirects and record-ID mappings for Assigned→My Work, Drafts→My Work, bug feedback→Intake, project Modules→Workstreams label, and persona aliases without breaking deep links.
- [ ] Remove duplicate standalone navigation entries only after their configured canonical views and saved links resolve with the same authorized data.
- [ ] Verify full-page and intercepted-pane refresh, modifier-click, Back/Forward, close-to-origin, mobile full-screen detail, and direct URL access for every record type.
- [ ] Run cold-load and role/tenant/client matrices over the route manifest and physical pages; update route snapshot and log any missing or unexplained screen before checking this section.
