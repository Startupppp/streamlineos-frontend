# Build Kill List

| Delete/refuse | User job replacement | Evidence/rationale |
|---|---|---|
| Standalone Drafts page | Recover drafts in Inbox | `/build/drafts` duplicates personal notification work |
| Sprint route/model | Plan timeboxed work through Cycles | Production sidebar currently points to broken `/sprints`; canonical page is `/cycles` |
| Separate QA Bug lifecycle | Track defects as `WorkItem.type=BUG` with QA evidence | Prevents two statuses, assignees, comments, and reports for one defect |
| Project Analytics page | Understand delivery through Reports Overview | `/analytics` rendered “Board” in production and duplicates report metrics |
| Project Timeline page | See issues by time through Issues `layout=timeline` | Same entities and filters; separate route fragments saved views |
| Project Saved Views page | Create/manage views inside Issues; administer in Settings | A view is configuration of Issues, not a destination |
| Project My Tickets page | Filter global My Work by project | Personal work has one cross-project owner |
| Authenticated Intake page | Configure Forms and process submissions in Triage | Avoids duplicate submission state and conversion logic |
| Standalone Bugs page | Issues filtered to BUG | Canonical work item owns lifecycle |
| Standalone AI page | Contextual assistant plus Command Center runs | A chat landing page without durable action ownership is noise |
| Operational Automations/Webhooks/Workflow pages | Configure under Project Settings | They are configuration, not daily navigation |
| Build-owned Library | Use Knowledge Library with project-filtered Wiki projection | `frontend/features/wiki/components/wiki-sidebar-nav.tsx` owns Library |
| Project Activity hub | Recent activity on Overview; full activity on each record | Avoids another unbounded feed |
| Governance hub | Direct Risks, Decisions, Approvals, Changes, Incidents | A hub adds navigation without a distinct user job |
| Project Calendar | Use global Calendar with Build source filters | Calendar owns events and scheduling |
| Build customer master | Link to CRM customers/deals | CRM owns identity and lifecycle |
| Build time-entry master | Link to Timesheets | Timesheets owns entries, rates, approval, payroll effects |
| Decorative AI summaries without citations/freshness | Durable cited proposal or no AI | Trust beats novelty |
| Unlimited custom statuses/fields/views | Bounded, archived, governed configuration | Prevents unusable filters and schema/query explosion |

## Acceptance criteria

- [ ] Every killed page has a migration target and caller census.
- [ ] Redirects are temporary, observable, and removed after deep-link migration.
- [ ] No removed surface retains a parallel schema, permission, cache key, or endpoint family.
- [ ] Product copy does not advertise removed or unimplemented capabilities.
