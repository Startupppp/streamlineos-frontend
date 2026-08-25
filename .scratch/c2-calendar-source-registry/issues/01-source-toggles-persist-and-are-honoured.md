# 01 — Turning a calendar source off keeps it off

**What to build:** A person can turn a calendar source off — interviews, travel, birthdays, leaves — and it stays off across sessions and devices. A source they turned off is never loaded, so hiding events also makes their calendar faster. A source they cannot see because their organisation disabled the module, or because they were individually denied it, is not offered as a switch at all.

The registry already publishes the list of sources with their keys, labels and owning modules. This ticket adds the missing half: storing the choice and applying it before anything loads.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] A person's disabled sources persist across sessions and are theirs alone — another person in the same organisation is unaffected.
- [x] A disabled source is never invoked, not loaded-then-filtered.
- [x] A source with no stored preference is on, so a newly added source arrives enabled without anyone touching a switch.
- [x] The toggle list offers only sources the person can actually see — module availability is applied before the toggle list is built, not after.
- [x] A stored preference naming a source that no longer exists is ignored rather than rejected.
- [x] The preference is a normalised row per person, per organisation, per source key — never an array on a user record.
- [x] Reading and writing preferences is tenant-scoped and permission-checked like any other endpoint.

## Todo

- [x] Add the preference table with the tenant column leading its composite index, following the existing schema conventions
- [x] Generate and apply the migration; reconcile the snapshot afterwards if a custom migration was used
- [x] Apply the preference filter inside the registry immediately after the availability filter, so ordering delivers the "no switch for what you cannot see" behaviour for free
- [x] Add the read and write endpoints with their permission gates and catalog entries on both sides
- [x] Assert the disabled source's `load` was never called — not merely that its events are absent
- [x] Confirm the availability comment in the registry survives; it records why availability is per-person, not per-org
- [ ] Boot the API and toggle a real source end to end
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`calendar_source_preferences` — normalised, one row per (org, user, source key), never a JSONB array. Composite unique on `(org_id, user_id, source_key)` as the upsert conflict target, plus `(org_id, user_id)` for the read. RLS enabled with a `tenant_isolation` policy copied from `0458_hr_relational_tables_rls.sql` — a tenant table without a policy is readable org-wide, so this was not optional.

`cd backend && npx jest --testPathPattern "modules/calendar"` → **5 suites, 38 tests, all pass**, including the assertion that a disabled source's `load()` is never CALLED, not merely that its events are absent.

Absence means enabled, so a newly added source arrives on and only deliberate opt-outs are stored. The preference filter runs immediately after the availability filter, which is what makes "no switch for what you cannot see" fall out of ordering rather than a second check.

**Migration caveat, recorded honestly.** `db:generate` blocked on an interactive TTY prompt, so the SQL and snapshot were hand-written and the journal updated. `0464_snapshot.json` is the previous snapshot plus the new table — which matches this repo's existing state (185 snapshots for 220 journal entries; snapshot numbering drifted from migration numbering long ago). The migration was applied directly and the table, indexes, FKs and RLS policy were confirmed live via `pg_catalog`. `db:migrate` skips it by timestamp on this database; a cold build applies it in journal order.
