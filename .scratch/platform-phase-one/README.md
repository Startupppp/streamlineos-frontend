# Platform phase one — ticket set

Fifteen tickets across four streams, derived from four PRDs in `docs/specs/`, every claim verified
against the running API, the live database catalog, or a module-graph tool.

**All fifteen are done and their files retired.** Each was ticked criterion by criterion and committed in that state *before* deletion, so the
finished ticket is durable in git rather than existing only between two commits. What each one
actually changed — including the premises that turned out to be wrong — is in `PAGES.md` and in the
commits that closed them.

## Carried forward — real gaps, not finished work

- **The transaction ceiling is a manual gate, not a regression test.** `pnpm db:check-request-txn`
  needs a running API and a seeded database, and nothing runs it automatically, so the ceiling
  *can* silently regress. Ticket 04's criterion said it could not. Wiring it into CI is the honest
  fix and is not done.
- **Migration snapshots are stale repo-wide** — 27 snapshots for 202 migrations, highest `0185`.
  The eight added here follow that existing state rather than breaking new ground, but a future
  `db:generate` diffs against `0185` and will re-propose everything since. That predates this work
  and needs its own ticket.

## Decisions taken during the work

- **Six standings, no custom roles.** Org owner · admin · member, and per module owner · admin ·
  member. Per-person grants (`user_permission_grants`, ticket 15) narrow capability without
  inventing a role, and fold into `AccessService` so every existing gate honours them unchanged.
- **Platform billing is never delegated.** Org owner and org admins only; `assertPermissionsGrantable`
  refuses the whole `billing:` namespace on every path including the owner's own. Billing must not
  join `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`. The org's own customer invoicing is accounting
  and is unaffected.
- **Chat, mail, calendar and notifications are Home.** One ladder, one access screen. Keys keep their
  namespaces; `namespacesForModule` maps Home to them.
- **Universal means ungated, not defaulted.** A member default is revocable; a §8 guarantee is not.

## Deliberately not ticketed

- **Measuring the guard chain.** Three traps, each of which produced a confidently wrong number
  first: measure as a **non-owner** (`authorize` short-circuits an owner before permission
  resolution, so the path under test never runs); count **in-process borrows**, not
  `pg_stat_database` (whose background rate is the same magnitude as the signal); and issue
  requests **concurrently** so background work cannot dominate the window.

## Deliberately not ticketed

- **Payroll schema-folder convergence** — 23 tables move from the HR folder to the payroll folder. A
  genuine wide refactor needing expand–contract across many batches, delivering no user-visible
  behaviour.
- **Any schema deletion** — nothing proved safe. All 95 empty HR tables are referenced by live
  services, and the 11 files a module-graph tool flags as unused are a deliberate SQL-managed
  arrangement guarded by a spec.
- **Build index changes on `tickets`** — three were created, measured and rejected; one was 7.3×
  worse in I/O while appearing faster on a warm cache.

## Test suite — fixed since, 2026-08-22

Both red baselines above are closed.

- **Unit: 520/520 suites, 4,313 tests, exit 0** (was 44 failing suites / 177 failing tests). Almost
  every failure was a mock predating `runInTenantTransaction`; the rest was ordinary drift. Two real
  defects fell out: a module owner could never remove themselves from their own module's group, and
  an ownership-transfer nomination was dropped whenever there was no ambient tenant context.
- **Controller e2e: 105/114 suites** (was 0 — the whole step crashed at import). For **Home, HRMS,
  Build and Payroll it is 35/35 suites, 976 tests, exit 0.** The nine that remain are CRM, e-sign,
  inventory and support cases that need seeded database rows.
- Three live bugs surfaced: `/leads/ingest` 401'd every API-key client because nothing opted it out
  of `JwtAuthGuard`; every 402 payload lost the fields the frontend reads, because
  `AllExceptionsFilter` forwards only `details`; and a **locked payroll run's figures were immutable
  in the service only** — `pg_trigger` had no entry for `payroll_run_employees` or
  `payroll_line_items`, so a direct write could rewrite an approved or paid snapshot (migration
  `0445`).

## Known-red, needing its own ticket

- `blog:ai:use` gates no route — a phantom key.
- **Workflows has no execution engine**: triggering inserts a `pending` row nothing consumes.
- `permissions.is_delegable` exists in the schema and is enforced nowhere.
