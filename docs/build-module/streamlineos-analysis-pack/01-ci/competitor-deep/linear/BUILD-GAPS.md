# Build gaps vs Linear — filter walk (evidence-backed)

**Walk:** 2026-10-01 IST, signed-in Tarunchintakunta / team TAR.  
**Constraint:** Free-only UI inspection; no paid feature or mutation.

## Filters — VERIFIED competitor behavior

| ID | Linear UI-VERIFIED | Build comparison status |
| --- | --- | --- |
| F-01 | Searchable Add filter menu with 18 visible entries, including Status, Assignee, Labels, Relations, Dates, Project, Content, and Template | **Needs parity check** against current Build filter field inventory |
| F-02 | Status, Assignee, Agent, Agent Session, Creator, Priority, Labels, Suggested label, Subscribers, and Template use multi-value checklist/value pickers | **Needs parity check** for multi-select semantics and empty/default values |
| F-03 | Relations includes Parent, Sub-issues, Blocked, Blocking, Recurring, Issues with relations, and Duplicates | **Needs parity check** for relation predicates |
| F-04 | Dates has eight date subfields; Due date has relative presets and custom timeframes | **Needs parity check** for relative date grammar and custom picker |
| F-05 | Advanced filter supports `and` / `or` toggling and nested groups, each with its own operator and delete control | **Needs parity check**; this is a high-value parity target |
| F-06 | Content has a dedicated text-search input; Links showed an empty state; Auto-closed is a direct leaf predicate | **Needs parity check** for search/empty-state behavior |
| F-07 | Active filters expose add-another-filter and clear-all controls | **Needs parity check** for chip lifecycle and clear behavior |

## Views — VERIFIED competitor behavior

| ID | Linear UI-VERIFIED | Build comparison status |
| --- | --- | --- |
| V-01 | Team Views page is reachable; empty state offers Create new view and Documentation | **Needs parity check** |
| V-02 | New view builder supports name, optional description, destination workspace/team, Cancel, and Create view | **Needs parity check** |
| V-03 | The task required no mutation, so save/share/favorite behavior was not exercised; do not infer it from this walk | **Not scored** |

## Evidence paths

- `evidence/filters-field-menu.png`
- `evidence/filters-status-options.png`
- `evidence/filters-relations-options.png`
- `evidence/filters-date-custom.png`
- `evidence/filters-advanced-empty.png`
- `evidence/filters-advanced-and.png`
- `evidence/filters-advanced-nested.png`
- `evidence/custom-views-empty.png`
- `evidence/custom-view-builder.png`

## Beyond Filters — sellable gap framing vs Build

**Status convention:** **BEHIND** means the current Build evidence set does not yet show an equivalent surface and is a validation/build target; it is not a claim that the Build implementation is absent. **BUILD ADVANTAGE** means Linear visibly gates the capability or does not expose it in this free workspace, so a free equivalent can be a sellable differentiator.

| ID | Linear UI evidence | Build framing | Status |
| --- | --- | --- | --- |
| BG-08 | Inbox with unread notification state and list/detail split | Provide a first-class notification inbox with unread/read state and deep links to work | **BEHIND — validate parity** |
| BG-09 | My Issues has Assigned / Created / Subscribed / Activity tabs and empty-state CTA | Provide personal work views beyond a single assigned list, with safe empty states | **BEHIND — validate parity** |
| BG-10 | Projects has workspace-level empty state, documentation, and create affordances | Provide project shell, project list, and project documentation entry points | **BEHIND — validate parity** |
| BG-11 | Workspace Views supports Issues / Projects custom-view types and New view | Provide reusable issue/project views with name, description, scope, and sharing lifecycle | **BEHIND — validate parity** |
| BG-12 | Team Cycles route exists even with no cycles | Provide cycle navigation and a clear no-cycles state before adding creation/edit flows | **BEHIND — validate parity** |
| BG-13 | Team Documents supports team docs and Overview resources/sections | Provide lightweight team docs, links, and resource organization | **BEHIND — validate parity** |
| BG-14 | Agent chat is available; Linear Agent is Enabled | Provide a safe, auditable AI workspace assistant with skills and suggested starters | **BEHIND — validate parity** |
| BG-15 | GitHub integration detail and broad integration catalog are visible | Provide GitHub issue/PR linking plus a small, discoverable integration catalog | **BEHIND — validate parity** |
| BG-16 | Issue templates page is available but empty | Provide reusable issue templates with no paid prerequisite | **BEHIND — validate parity** |
| BG-17 | Initiatives feature exists but is disabled; Roadmap route is Not found in this workspace | Provide a coherent free strategy layer (initiatives/roadmap) or explicitly defer it | **BEHIND / product decision** |
| BG-18 | Native Insights route is Not found; catalog points to analytics add-ons | A native free dashboard/insights view can differentiate from add-on-dependent analytics | **BUILD ADVANTAGE opportunity** |
| BG-19 | Asks explicitly requires Business or Enterprise | Offer structured request intake from email/chat on the free tier | **BUILD ADVANTAGE opportunity** |
| BG-20 | SLAs and SLA automation rules explicitly require Business or Enterprise | Offer basic deadline/SLA rules in the free tier, with transparent limits | **BUILD ADVANTAGE opportunity** |
| BG-21 | Integrations catalog exposes Automations category, including pre-installed email issue creation | Offer a small set of free, safe automations with clear triggers and audit trail | **BEHIND — validate parity** |
| BG-22 | AI settings show Code Intelligence is Business-only; Coding sessions are marked Available on Basic | Keep basic agent workflows free while reserving advanced code intelligence for a deliberate paid boundary | **BUILD ADVANTAGE / packaging** |

### Not a gap claim

- Triage was probed but redirected to All issues; this is an availability observation, not proof that either product lacks triage semantics.
- Roadmap and Insights were Not found in this workspace; do not market their absence as a universal Linear limitation without checking workspace plan/configuration.
- Paid CTAs (Start free trial / Enable) were observed only; no upgrade, enablement, invitation, connection, or purchase was performed.

Evidence: see the beyond-Filters inventory and the referenced files under `evidence/`.
