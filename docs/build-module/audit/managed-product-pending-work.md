# Managed-product pending work

Status: **code complete, browser verification pending** (2026-10-11). This covers `/build/managed-products` and its Overview, Feedback, Insights, Roadmap, Goals, Linked Projects, and Settings pages. It does not replace the [product-discovery delivery checklist](../experience/screens/product-discovery.md#delivery-checklist), [requirement ledger](../implementation/REQUIREMENT-LEDGER.md), or [work claims](../implementation/WORK-CLAIMS.md).

Product decision: Overview is the concise product summary and Insights is the source-linked deep dive. They stay separate routes.

## Feature status

Code and tests are complete for every row (2026-10-11). Accept and decline return the full opportunity, and accept also returns the scored roadmap item, so the client patches its cache without a refetch. Backend: typecheck clean, managed-products, Feedbucket, and goals specs pass, contracts current. Frontend: type-check and spec type-check clean, 1,581 product-area tests pass, lint clean.

| Area | Feature | Code | Tests |
| --- | --- | --- | --- |
| Directory | Owner, lifecycle, health, team, segment, tag, linked-project, and archived filters in URL state, with chips and Clear all; segment and tag options from the facets endpoint | Done | Done |
| Directory | Create, edit (version conflict recovery), archive, restore, bulk actions, mobile cards | Done | Done |
| Overview | Period, team, segment, and initiative-state filters; evidence and outcome cards show "unknown" instead of zero | Done | Done |
| Overview | Bounded previews: themes, goals, decisions, roadmap, releases, opportunities, publication state | Done | Done |
| Feedback | Capture, classify, duplicate merge (raw text, consent, provenance kept), opportunity link, Intake routing | Done | Done |
| Feedback | Feedbucket intake: product-linked widgets file submissions with source `feedbucket` (migration `1980` applied), source filter and badge, Collect via Feedbucket snippet | Done | Done |
| Feedback | Type, status, source, theme, sentiment, consent, linked, opportunity, duplicate, assignee, segment, customer, and date filters; full-text search | Done | Done |
| Insights | Create opportunity, score with RICE (preview matches the stored score), decline with a required reason, audited score override | Done | Done |
| Insights | Evidence themes with cited AI suggestions, side-by-side comparison, outcome reviews scheduled through a form, delete confirmed | Done | Done |
| Insights | Segment, owner, confidence, evidence-age, and score filters | Done | Done |
| Insights | Trace from feedback through evidence, opportunity, roadmap, delivery, and outcome, with dependencies | Done | Done |
| Acceptance | Accept into the roadmap with decision and score snapshot, owner, horizon, goal, release, project, epic, visibility, and dependencies; migration `1979_roadmap_item_dependencies` applied to production | Done | Done |
| Roadmap | Project and epic pickers, epic link on the card | Done | Done |
| Roadmap | Horizon, status, team, goal, segment, confidence, and target-date filters | Done | Done |
| Roadmap | Board with Now, Next, and Later columns, per-column empty state and Add item, timeline view in the URL, reorder, move across horizons | Done | Done |
| Roadmap | Publish and unpublish with confirmation, public preview | Done | Done |
| Goals | Product-scoped goals: link, unlink, check-in against a chosen key result, freshness, parent goal, outcome drill-down | Done | Done |
| Linked Projects | Link, unlink (never deletes the project), move between products with a warning | Done | Done |
| Linked Projects | Health, status, owner, team, customer, contribution, and date filters; next milestone, next release, linked goals | Done | Done |
| Settings | Profile, lifecycle and health, members, releases, danger zone | Done | Done |
| Platform | Permission checks per action, tenant isolation (RLS), cache patched from responses, aggregates marked stale | Done | Done |

## Delivery checklist

Only browser verification remains. Each item needs an authenticated session against the current deployment at 375, 768, and 1280 px, plus keyboard checks.

- [ ] Directory: every filter and chip round-trips through the URL. Create, edit, archive, and restore persist. A version conflict shows recovery.
- [ ] Overview: aggregates match the selected period, team, segment, and initiative state. Preview links open the right record.
- [ ] Feedback: capture, classify, merge a duplicate (the original text is kept), link to an opportunity, and route to Intake persist. A product-linked Feedbucket widget submission lands with the Feedbucket badge. Filters narrow the server results.
- [ ] Insights: create an opportunity, score it, decline one with a reason, schedule an outcome review through the form, override with a reason (audit row written), accept into the roadmap with goal, epic, visibility, and dependencies, then complete an outcome review. The trace shows every step.
- [ ] Roadmap: create and edit with project and epic, filters, the board columns with per-column Add item, the timeline view, reorder, move, publish and unpublish, and the public preview matching the public roadmap page.
- [ ] Goals: link, unlink, check in against a chosen key result, and parent/outcome drill-down.
- [ ] Linked Projects: link, unlink, and move between products with the warning. Every filter, including health, owner, team, customer, and contribution.
- [ ] Denial: a user without the managed-products, roadmap, or feedback permission, and a user from another tenant, are refused on pages, selectors, mutations, and deep links.
- [ ] Cache: after each mutation the list, detail, and Overview update without a full refetch.
