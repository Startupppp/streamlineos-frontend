# Platform phase one — ticket set

Fifteen tickets across four streams, derived from four PRDs in `docs/specs/`, every claim verified
against the running API, the live database catalog, or a module-graph tool.

**Fourteen are done and their files retired** — 01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14
and 15. Each was ticked criterion by criterion and committed in that state *before* deletion, so the
finished ticket is durable in git rather than existing only between two commits. What each one
actually changed — including the premises that turned out to be wrong — is in `PAGES.md` and in the
commits that closed them.

## Still open

| # | Ticket | Why it is not done |
|---|---|---|
| 04 | One database transaction per request | **Cannot be accepted until the Upstash quota is restored.** The code change exists and typechecks, but with the cache down the same endpoints measure 4–9× worse, so no number is trustworthy. Measure as `streamline_app` with the tenant GUC, in buffers, not milliseconds. |

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

- **Payroll schema-folder convergence** — 23 tables move from the HR folder to the payroll folder. A
  genuine wide refactor needing expand–contract across many batches, delivering no user-visible
  behaviour.
- **Any schema deletion** — nothing proved safe. All 95 empty HR tables are referenced by live
  services, and the 11 files a module-graph tool flags as unused are a deliberate SQL-managed
  arrangement guarded by a spec.
- **Build index changes on `tickets`** — three were created, measured and rejected; one was 7.3×
  worse in I/O while appearing faster on a warm cache.

## Known-red, needing its own ticket

- The backend unit suite has ~46 failing suites that predate this work. Proven pre-existing by
  reverting a changed file to `HEAD` and re-running. Distinct causes seen: an ESM parse failure in
  `@openrouter/ai-sdk-provider` and `@composio/core` (which also blocks **every** `pnpm test:e2e`
  run, so no e2e assertion in this programme is executed coverage), db mocks lacking `transaction`
  or `tx.execute`, and value-equality specs that predate a catalog expansion.
- `blog:ai:use` gates no route — a phantom key.
- **Workflows has no execution engine**: triggering inserts a `pending` row nothing consumes.
- `permissions.is_delegable` exists in the schema and is enforced nowhere.
