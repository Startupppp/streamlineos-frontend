# 03 — Custom field values are indexed

**What to build:** Filtering by a custom field is fast, and adding custom fields to a new entity needs no new table. Today values live in an unindexed per-entity sidecar, so filtering scans the value table and each new entity needs its own.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** All criteria genuinely open — no JSONB column migration found on entity tables; custom field values still live in sidecar tables. No containment indexes found. Implementation not started.

## Acceptance criteria

- [ ] The definition registry is unchanged — it stays the schema and validation source.
- [ ] Values move to a JSON column on the entity row with a containment index.
- [ ] Filtering by a custom field returns correct rows, including absent-field and null cases.
- [ ] A value violating its definition is rejected at write — this replaces the type system and without it the move is a loss.
- [ ] Values inherit the entity's row-level policy: a user who cannot read the entity cannot read its custom fields.
- [ ] Adding a custom field to a new entity requires no new table.
- [ ] No existing value is lost in the migration.

## Todo

- [ ] Keep the registry; move only storage
- [ ] Validate on write at the boundary — the column type guarantees nothing
- [ ] Test absent and null cases; this is where containment queries go wrong
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
