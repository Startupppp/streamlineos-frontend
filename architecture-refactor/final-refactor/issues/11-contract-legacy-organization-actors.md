# 11: Contract legacy organization-actor references

**What to build:** After all domains use OrganizationActor, obsolete global-user organizational references and compatibility paths are safely removed.

**Blocked by:** 07, 08, 09 and 10.

**Status:** blocked — the gate is built, live and measuring; criteria 2–4 have nothing safe to
contract until 09 lands. Verified 2026-08-29: the source ratchet reads **555**, the catalog contains
**645 distinct** `users.id` foreign-key columns, and the combined source/catalog burden is **663
distinct columns**. Evidence: `evidence/11-legacy-actors/CONTRACTION-GATE.md`.

- [ ] Telemetry and repository scans prove no legacy writer or required reader remains.

  **The mechanism now exists and reports an honest number; the number is not yet zero.**
  `pnpm scan:legacy-actors` classifies every `users.id` foreign key from the Drizzle schema source as
  organizational, bridge or authentication. Current measurement: **563 total, of which 555 are
  organizational**, by module — hr 219, payroll 55, crm 51, common 49, inventory 37, accounting 27,
  support 25, kb 24, billing 18, timesheets 15, chat 12, e-sign 7, ai 6, surveys 5, directory 2,
  calendar/mail/portal-access 1 each. 3 are bridge columns (`organization_members.user_id`,
  `hr_people.user_id`, `organization_people.user_id`) and 5 are authentication infrastructure.

  The scanner was tested against defects known in advance rather than trusted on its first run — it
  correctly classifies `hr_effective_dated_changes.approved_by`/`.created_by` and
  `hr_reporting_lines.created_by` as organizational, the three bridge columns as bridge, and
  `accounts.user_id`/`user_sessions.user_id` as authentication. It parses `pgTable(` with balanced
  parentheses over multiple lines and walks the filesystem rather than shelling out to a quoted glob,
  because both of those have produced vacuously-passing scans in this repository before.

  `pnpm scan:legacy-actors:check` is a **ratchet** wired into its own CI workflow: the count may fall but
  never rise. Runtime telemetry (`recordLegacyActorRead`/`recordLegacyActorWrite`,
  `snapshotLegacyActorTelemetry`) is in `common/observability/` so 07–10 can adopt it with one line per
  site. This criterion closes when the ratchet reads 0 and the runtime `writes` counter reads 0.

  > **555 is a floor, not the migration burden, and the ratchet is structurally blind to the
  > difference.** `pg_catalog` holds **645 distinct columns** referencing `users.id`; the source scan
  > sees **563**, and **100 of the catalog's are invisible to it**. The source has **18 declarations**
  > absent from the catalog, so the combined distinct burden is **663**. The invisible rows sit on tables
  > created by raw SQL with no
  > Drizzle declaration — the accounting `ap_*`/`ar_*`/`bank_*` family and the CRM commission set,
  > largely the 65 tables `0619_chain_creates_what_production_has` created from the catalogue. They are
  > organizational by name (`created_by`, `posted_by`, `approved_by`, `assignee_id`).
  >
  > The combined distinct burden is the exact count for this capture; it must be re-run after each
  > actor migration because the source and database can change independently.
  >
  > The ratchet stays source-based because CI has no database, but `pnpm scan:legacy-actors:catalog`
  > names every invisible column against `pg_catalog` so the gap is a known quantity rather than a
  > surprise found at contraction time. **Criterion 1 must be judged against the catalog figure, not
  > the ratchet figure.**

- [ ] Contract migrations remove obsolete columns/constraints without losing audit history.

  **Structurally blocked.** Nothing has been migrated off `users.id` yet, so there is no obsolete column
  to drop. Verified 2026-08-29 at session close: 06 done, 07 done, 08 done, 10 implemented, **09 still
  open** — so the blocker set has shrunk to one ticket while this session ran. Unblocks when 09 lands and
  the catalog figure reaches 0.

- [ ] Cold bootstrap, upgrade migration and representative domain tests pass.

  **Structurally blocked** on the same condition — there is no contract migration to bootstrap or
  upgrade. Note that cold bootstrap is *separately* broken; see ticket 42.

- [ ] Compatibility code and dead types are removed with module-graph proof.

  **Structurally blocked.** `legacyUserIdOf(actor)` in `common/organization/organization-actor.ts` is the
  published compatibility bridge and is what 07–10 are currently building against. Removing it while its
  callers are still being written would break them. Module-graph proof cannot be produced for a removal
  that must not happen yet.

## Why this ticket did not shrink to fit

Three of four criteria are impossible today and saying so is the correct result, not a shortfall. What
was buildable without entering 07–10's territory is the *evidence mechanism* those criteria will be
judged by — and building it first means the contraction, when it happens, is measured rather than
asserted. The distance left to travel is the ~655 catalog figure, of which 555 is tracked automatically
and 100 is named by `scan:legacy-actors:catalog` but cannot be ratcheted without a database in CI.
