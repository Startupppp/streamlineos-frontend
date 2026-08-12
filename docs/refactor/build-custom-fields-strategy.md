# Build — custom fields strategy

Closes the DoD item "custom-field strategy chosen, documented, typed, free of N+1 on lists".

## Decision: EAV with a typed definition table

`custom_field_definitions` (definitions) + `ticket_custom_field_values` /
`support_ticket_custom_field_values` / `hr_employment_custom_field_values` (values).

Rejected alternatives, with the reason:

- **Sparse columns** — fastest to read, but cannot express per-tenant configurability. A new field
  would be a migration per tenant, which is disqualifying for multi-tenant SaaS.
- **JSONB on the ticket** — fast reads, but types are unenforced, filtering and sorting need GIN
  indexes that RLS then cannot use (see CLAUDE.md §19 on non-leakproof operators), and multi-value
  fields recreate the array anti-pattern this refactor exists to remove.

EAV costs one join and needs care against N+1; both are addressed below.

## Rules

- **Definitions are a real table** with `field_type`, `options`, `is_required`, `is_active`,
  `display_order`, `is_sensitive` and `category` — not a JSON blob. Validation derives from
  `field_type`.
- **Values are fetched in one query per list page**, never per row: the list resolves its page of
  ticket ids first, then issues a single `WHERE ticket_id = ANY($ids)` for values. The board's
  query-count assertion (`board-query-count.spec.ts`) locks this in — the query count is identical
  for 3 cards and 500.
- **`value` is `text` with the definition carrying the type.** A typed-column-per-type table was
  considered and rejected as premature while the field set is small; the definition's `field_type`
  is the single source of truth for parsing, and it is enforced on write.
- **`is_sensitive` gates the field**, so rates, costs and internal notes are stripped server-side at
  the DTO boundary rather than hidden in the UI.

## Known state

`0352_custom_fields_consolidation` dropped the two ticket value tables and died before recreating
them; `0423` restored them from that migration's own DDL. Both now carry RLS with the standard
`tenant_isolation` policy.
