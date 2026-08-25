# c23 · A tenant extends the product without a deploy

**Status: solved correctly twice, not propagated.** Verified at source 2026-08-25. 415 distinct enum types exist, of which **306 are status, stage, priority or category taxonomy** — adding a value requires an `ALTER TYPE`, a migration and a deploy. But the Build module already does this right: ticket status is text under a composite foreign key into a per-project status table, with a transitions table carrying approval and required-field rules. CRM has the same shape with pipelines, stages and blueprints. **This is propagation of an existing pattern, not a redesign.** Alongside it sit two structural decisions: custom-field values are an unindexed sidecar, and one shared schema file has become a junk drawer.

## Problem Statement

**As a tenant administrator, I cannot add a status.** A custom candidate status, expense category, asset state or leave type requires the vendor to ship code. 306 taxonomies are frozen this way.

**As the business, every tenant taxonomy request is a migration and a release.** That is a permanent tax on sales and support, and it scales with customer count.

**As a tenant administrator, I cannot express my own workflow.** Which status follows which, whether a transition needs approval, which fields it requires — Build models all of this per project, and no other module can.

**As a user, searching by a custom field scans the table.** Custom-field values live in a per-entity sidecar that is not indexed, so filtering by one is a full scan of the value table.

**As a developer, extending custom fields to another entity means another table.** The value storage is wired to only a couple of entities, so each new one needs its own value table — the cost of extension grows rather than staying flat.

**As a developer, HR is over-decomposed and still growing.** HR carries 934 endpoints, 193 services and 73.3k lines — 27% of all endpoints and three times Build. The hiring surface alone defines around 36 tables for what an applicant tracking system usually models in 10–12, and offboarding adds 16 more for state that largely already lives on the employment lifecycle column.

**As a developer, one shared schema file holds seven unrelated domains** — notifications, broadcasts, push subscriptions, calendar events, attendees, webhooks and subscriptions — so every module importing any of it drags in all of it.

## Solution

**Propagate Build's shape.** Classify the 306 taxonomies: true system state machines stay enums, because a tenant adding a value to a state machine the code branches on is a defect, not a feature. Tenant-facing taxonomy moves to organisation-scoped lookup tables with the transitions model Build already uses. Do it per module, when that module is next touched — not as a sweep.

**Keep the custom-field registry, move the values.** The definition registry is right and stays: it is where validation and schema live. Values move to a JSONB column on the entity row with a path-ops index. Each entity carries tens of fields rather than millions of rows, which is JSONB's best case — no join, an indexed containment query, and adding a tenant field becomes a zero-migration operation.

**Freeze HR's table count** rather than refactoring 176 tables. No new HR table without deleting one; route new HR state onto existing lifecycle columns and the custom-field engine. Then consolidate the two payroll folders, which are **disjoint rather than duplicated** — a folder move, not a data migration.

**Split the junk drawer** along its seven domain lines.

## User Stories

1. As a tenant administrator, I want to add a status to a taxonomy myself, so that I do not wait on a release.
2. As a tenant administrator, I want to rename a status without breaking existing records, so that changing a label is safe.
3. As a tenant administrator, I want to retire a status without deleting history, so that past records stay readable.
4. As a tenant administrator, I want to define which status may follow which, so that my process is enforced.
5. As a tenant administrator, I want a transition to require approval, so that sensitive steps are controlled.
6. As a tenant administrator, I want a transition to require certain fields, so that data is captured at the right moment.
7. As a tenant administrator, I want taxonomies scoped to my organisation, so that my configuration is not visible to anyone else.
8. As a user, I want a status change violating a rule to be refused with a clear reason, so that I understand what is required.
9. As a user, I want to filter by a custom field quickly, so that a tenant field is as usable as a built-in one.
10. As a user, I want custom fields available on the entities I work with, so that extension is not limited to a couple of screens.
11. As a tenant administrator, I want to add a custom field without a deploy, so that extension is self-service.
12. As a tenant administrator, I want custom field values validated against their definition, so that the registry means something.
13. As a developer, I want one way to model a tenant taxonomy, so that the eighth module does not invent a ninth approach.
14. As a developer, I want system state machines to stay enums, so that code branching on a value cannot meet an unknown one.
15. As a developer, I want adding a custom field to a new entity to require no new table, so that extension cost stays flat.
16. As a developer, I want HR's table count frozen, so that over-decomposition stops growing.
17. As a developer, I want payroll in one place, so that the module boundary matches the domain.
18. As a developer, I want the shared schema file split by domain, so that importing one concept does not pull in six others.
19. As a developer, I want the import graph to stay acyclic through the split, so that reorganisation does not introduce a cycle.
20. As a security reviewer, I want taxonomy tables tenant-scoped and RLS-covered, so that configuration is isolated like every other row.
21. As a security reviewer, I want custom field values covered by the same row-level policy as their entity, so that moving storage does not move the security boundary.

## Implementation Decisions

**Already shipped — this is the pattern to propagate**

- **Build's status model is the reference**: status as text under a composite tenant-scoped foreign key into a per-project status table, plus a transitions table carrying approval and required-field rules. CRM's pipelines, stages and blueprints are the same shape. Neither needs redesigning; they need copying.
- **`custom_field_definitions` is correct and stays.** It is the schema and validation registry. Only value storage moves.
- **The two payroll folders are disjoint** — zero overlapping table names, 17 and 15 tables. This is a split, not a duplication, and consolidating is a folder move with no data migration.
- **Tenant isolation, RLS and composite tenant foreign keys** are already in place and every new table here inherits them.

**To build**

- **Classify the 306 taxonomies** into system state machines and tenant-facing taxonomy. This classification is the deliverable of the first ticket — the migration is mechanical once it exists, and doing it in the wrong direction is the one expensive mistake available here.
- **Tenant taxonomies move to organisation-scoped lookup tables** using Build's shape, including the transitions table. A module at a time, when touched. Not a sweep.
- **Existing enum values seed the lookup table** so no tenant loses a state, and existing rows keep their value as text.
- **Custom field values move to a JSONB column on the entity** with a path-ops index. The registry continues to define and validate.
- **Values are validated against the registry on write**, at the boundary. JSONB accepts anything, so the guarantee has to come from validation rather than the column type.
- **HR's table count is frozen** by policy: no new HR table without removing one. New HR state goes onto existing lifecycle columns or the custom-field engine.
- **Payroll consolidates into one folder.** Folder move, imports updated, no data migration.
- **The shared schema file splits into its seven domains**, with mutually-referencing tables co-located so the split does not create a cycle.
- **Zero circular dependencies must hold through the split**, asserted as it is today.

## Testing Decisions

**What makes a good test here.** Assert what a tenant can configure and what the system then enforces — never the storage shape. A test asserting a JSONB column exists locks in the decision; a test asserting "filtering by a custom field returns the right rows" survives a change of storage and is the thing users care about.

- **A tenant adds a status and uses it end to end** — create, assign to a record, filter by it, without a deploy. This is the capability under test.
- **Transition rules are enforced** — a disallowed transition is refused with a reason; one requiring approval cannot complete without it; one requiring fields refuses until they are present.
- **Retiring a status preserves history** — existing records keep their value and remain readable, while the status is no longer offered.
- **Taxonomy is tenant-scoped** — one organisation's statuses are invisible to another, asserted at the row level.
- **Custom field validation** — a value violating its definition is rejected at write. This is the assertion that replaces the type system, and without it the JSONB move is a loss.
- **Custom field filtering returns correct rows**, including absent-field and null cases, which is where containment queries usually go wrong.
- **Custom field values inherit the entity's row-level policy** — a user who cannot read the entity cannot read its custom fields. Story 21, and the security property of the storage move.
- **Migration preserves every existing value** — before and after the enum-to-table move, every row's status is unchanged. Run against production-shaped data.
- **The import graph stays acyclic** after the schema split, asserted in CI as it is now.
- **Prior art**: the existing Build status and workflow transition specs, which already test this exact model, and the CRM pipeline specs.

## Out of Scope

- Refactoring HR's 176 tables. The decision is to stop growth, not to reverse it.
- Converting system state machines to lookup tables.
- A general entity-attribute-value engine.
- Per-tenant schema or database separation.
- Tenant-authored code, formulas or scripting.
- Renaming modules or changing route ownership.

## Further Notes

This spec answers the extensibility requirement directly, and the strongest thing about it is that **the answer is already in the codebase, twice**. Build and CRM both model tenant-configurable taxonomy correctly, with per-tenant transitions and approval rules. Nothing needs inventing — which also means the risk is low and the pattern is already proven against real usage.

The custom-field decision is worth stating plainly because it inverts the usual advice. A sidecar value table is the textbook normalised answer and it is the wrong one here: each entity carries tens of custom fields, not millions of value rows, so JSONB with a containment index removes a join, removes a table per entity, and makes adding a field a zero-migration operation. The normalised form would be correct if the cardinality were reversed.

The HR item is the one place in the review where the recommendation is **restraint rather than work**. HRIS is genuinely broad, so some of that size is real. Freezing the table count costs nothing and stops the trend; refactoring 176 tables would be the single most expensive item in this entire programme for the least user-visible benefit.
