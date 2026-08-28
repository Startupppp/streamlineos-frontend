# 19 — Every module is registered through one versioned manifest

**What to build:** A module declares itself once. Its id, product route, standing ladder, permission namespaces, entitlement, schema owner, data classification, events, cache namespaces, retention, search ACL strategy, SLO and budget, migrations, navigation and public exposure live in one record — and a new module cannot ship until tenant isolation, permission catalog, route classification, navigation visibility, cold migration, restore and removal all pass against it.

**Blocked by:** None — can start immediately

**Status:** done · all 4 gates green (gate 3 was red on its first real run against the live database; migration `0616` closed it and the pasted run below is post-fix)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** ⚠️ **A module registry already exists and this ticket deepens it rather than building one.** `common/rbac/module-registry.ts:27` exports `MODULE_REGISTRY`, a typed array of `ModuleDefinition` covering all 20 modules with `id`, `displayName`, `planGated`, `administrable`, `ladder` and `administersNamespaces`; `ModuleId` is derived from it at `:73`; `planGatedModuleIds` / `delegableModuleIds` / `administrableModuleIds` / `coreModuleIds` / `storedModuleKey` / `moduleIdFromStored` all live beside it, and three specs assert invariants against it. `common/rbac/module-vocabulary.ts:11` derives `MODULE_CATALOG` from it. **The two-vocabularies defect is already half-fixed too:** `organizations.enabled_modules` was dropped in migration `0335_org_arrays_and_invites.sql:22` and replaced by the `org_modules` table, and the case conversion is centralised in `storedModuleKey` (`:134`) / `moduleIdFromStored` (`:138`). The remaining work is the manifest's *other* fields — route, entitlement, schema owner, data classification, events, cache namespaces, retention, search ACL strategy, SLO, budget, migrations, navigation, public exposure — and repointing the checks at it.

Permission catalogs are folders on both sides (`backend/src/modules/rbac/permissions/`, `frontend/lib/rbac/permissions/`) and must not drift; the frontend subset is intentional and tested, and is **not** a defect to re-raise. Route classification reached 0 undeclared of 3,518 handlers and navigation-permission coverage is enforced by `sidebar-permission-coverage.test.ts` — those are working checks the manifest should read from, not replace. The PRD is explicit that this is *"a deep manifest [that] replaces parallel registries; it does not become a generic runtime framework."*

---

## The parallel-registry inventory (done first, as the Todo requires)

The manifest's field set is this list, not a wishlist:

| Parallel registry | Where | What it held that `MODULE_REGISTRY` did not |
|---|---|---|
| `PRODUCT_DEFINITIONS` | `frontend/components/layout/sidebar/sidebar-products.ts` | product `key`, `label`, `href` |
| `CANONICAL_MODULE_KEY` / `ORG_MODULE_NAME` / `MODULE_ALIASES` | `frontend/lib/module-vocabulary.ts` | a **third** vocabulary: `hrms`, `finance`, `helpdesk`, `documents` |
| `ProductKey` union | `frontend/components/layout/sidebar/sidebar-nav-types.ts` | the sidebar's own module names |
| module code folders | `backend/src/modules/<folder>/` | which folder owns a module |
| schema folders | `backend/src/db/schema/<folder>/` | which tables a module owns |
| `@Public()` distribution | every controller | which modules expose unauthenticated surface |
| `CACHE_KEYS` namespaces | `backend/src/common/cache/**` | which Redis namespaces a module owns |

`MODULE_CATALOG`, `ADMINISTRABLE_MODULES`, `ACCESS_MANAGED_MODULES` and `MODULE_ADMIN_MODULES` are **derived** from `MODULE_REGISTRY` already and were left alone — they are views, not parallel registries.

**Fields deliberately NOT added** (user ruling, 2026-08-28, and the ticket's own *"a manifest field with no consumer is deleted rather than kept for symmetry"*): data classification, events, retention, search ACL strategy, SLO, budget, migrations. None has a consumer today, and a field with no consumer is how the generic runtime framework the PRD forbids gets started.

**Pilot module: `timesheets`** (user choice). The other 19 modules carry the new fields, but only `timesheets` has the manifest-derived rules *enforced*, so no check failed on everything on its first run.

## Acceptance criteria

- [x] One manifest per module, versioned, holding every field the PRD lists — with the module key expressed once, so the two vocabularies can no longer disagree.

  `ModuleDefinition` gained `route`, `productKey`, `moduleFolder`, `schemaFolder`, `publicExposure`, `cacheNamespaces`, alongside `MODULE_MANIFEST_VERSION = 1`. Every consumer asserts the version it was written against, so a field-set change cannot land silently. The key is expressed once: `productKey` is the field that collapses the third vocabulary — `support`/`helpdesk`, `hr`/`hrms`, `accounting`/`finance`, `kb`/`documents` now agree by construction rather than by two hand-maintained lists.

  Scoped to the field set above rather than the PRD's full list — that is the ticket's own rule applied, not a shortfall.

- [x] The existing checks read the manifest instead of their own list: route classification, permission-catalog agreement, navigation coverage, module enablement and entitlement.

  All four repointed, each printing its manifest-derived pilot assertion:

  ```
  $ node src/scripts/route-classification-report.mjs
    universal      : 94
    permissioned   : 3178
    in-service     : 47
    UNDECLARED     : 0
  RESULT: ALL ROUTES CLASSIFIED
  Manifest pilot (timesheets): publicExposure=false — OK

  $ node src/scripts/check-permission-keys.mjs
  Scanned  3089 @RequirePermission usages  (621 unique keys)
  Backend catalog   690 keys
  Frontend PermissionKey union  692 keys
  OK — every @RequirePermission key resolves and exists in the backend catalog and the frontend PermissionKey union.
  Manifest pilot (timesheets): all @RequirePermission keys in its folder use declared namespaces — OK

  $ node src/scripts/check-navigation-permissions.mjs
  OK — every navigation gate names a key that some route enforces.
  Manifest pilot (timesheets): all nav routes are under "/timesheets" — OK

  $ node src/scripts/check-module-entitlement.mjs
  OK — timesheets: planGated=true, storedKey="TIMESHEETS" round-trips correctly.
  ```

  Route classification still reports **0 undeclared** — the repointing did not regress it.

- [x] A module missing a required field fails the build; a manifest field with no consumer is deleted rather than kept for symmetry.

  `src/common/rbac/module-registry-fields.spec.ts` asserts at runtime (not only via `satisfies`, which a widened type would hide) that every entry carries every field with the right type, that every non-null `moduleFolder` and `schemaFolder` exists on disk, that every non-null `productKey` is a member of the frontend's `ProductKey` union, and that `productKey` and `route` are unique. Part of the 378-test rbac run below.

- [x] Adding a module is a manifest plus its code — there is no second place to register it, and a check proves no second place exists.

  Backend: the spec asserts no module-id literal array exists outside `MODULE_REGISTRY` anywhere in `src/common/rbac/`.
  Frontend: `scripts/check-module-manifest.mjs` fails when the vendored manifest disagrees with the backend registry, when a `PRODUCT_DEFINITIONS` key is not a manifest `productKey`, when an href disagrees with the manifest `route`, or when the vendored manifest's version is not the version the loader was written against. The two repos cannot see each other in CI — the root repo `.gitignore`s `/backend/` — so the manifest is vendored as `frontend/lib/module-manifest.json`, generated by `pnpm modules:export-manifest`, and rule 1 **skips loudly** rather than silently passing when `backend/` is absent.

  Two named exceptions, both chrome rather than modules: `administration` (`/settings`, no owning module) and `documents` (the `kb` module's route is `/knowledge`; the sidebar lands on the deeper `/knowledge/chat`). No product, label, description, icon or accent was removed to make a rule pass.

  ```
  $ node scripts/check-module-manifest.mjs
  ✔  Module manifest is consistent.

  $ node scripts/check-module-manifest.mjs --self-test
    PASS  rule-1 fires on version mismatch
    PASS  rule-1 fires when registry has module not in manifest
    PASS  rule-1 fires when manifest has module not in registry
    PASS  rule-1 fires on productKey drift
    PASS  rule-1 fires on route drift
    PASS  rule-2 fires on unknown product key
    PASS  rule-2 does not fire for PRODUCT_KEY_EXCEPTIONS entries
    PASS  rule-4 fires on EXPECTED_MANIFEST_VERSION mismatch
    PASS  rule-4 does not fire when versions agree
  Self-test complete: 9 passed, 0 failed.
  ```

- [x] The gate a new module must pass is executable: tenant isolation, permission catalog, route classification, navigation visibility, cold migration, restore and removal each have a check that fails on a deliberately broken module.

  All seven exist, plus module entitlement — four static, four database-backed in `src/scripts/check-module-lifecycle.mjs`. **Every one proves it bites** by running its detection over a deliberately-broken in-memory fixture; no real source file or database object was sabotaged, because a concurrent session would have staged the sabotage.

  ```
  $ node src/scripts/check-module-lifecycle.mjs --self-test
  { "selfTest": true, "pass": true, "checks": {
      "singleTableFound": true, "indexExtracted": true, "multilineTableNameFound": true,
      "twoTablesInFile": true, "nonTableCallNotCaptured": true, "emptySourceReturnsEmpty": true,
      "uniqueIndexExtracted": true,
      "tenantIsolationPassesWhenPolicyExists": true, "tenantIsolationFailsOnMissingPolicy": true,
      "coldMigrationPassesWhenBothPresent": true, "coldMigrationFailsWhenNotInCatalog": true,
      "coldMigrationFailsWhenNoJournaledMigration": true,
      "restorePassesWhenAllPresent": true, "restoreFailsWhenNoPk": true,
      "restoreFailsWhenNoOrgFk": true, "restoreFailsWhenIndexMissing": true,
      "removalPassesWhenNonNullableWithFk": true, "removalFailsWhenOrgIdNullable": true,
      "removalFailsWhenNoFk": true } }
  ```

  The self-tests for the four static gates each carry the same shape, including their pilot mismatch cases — `pilotPublicExposureMismatchDetected`, `pilotNamespaceMismatchDetected`, `pilotNavRouteMismatchDetected`, `planGatedMismatchDetected`, `storedKeyLowercaseDetected`, `storedKeyWrongValueDetected` — so each manifest-derived rule is proved to fire, not merely to pass.

  **Against the live database, gate 3 was RED on its first real run and is now green.** 11 tables discovered; gate 3 (restore) reported 11 indexes declared in the Drizzle schema files that did not exist in `pg_catalog` — added to the schema after the original migration and never materialised. Each name was re-probed individually against both `pg_indexes` and `pg_constraint`, and against every same-columns index under a different name, before being accepted as genuinely absent. Migration `0616_timesheets_declared_indexes_exist.sql` (journal idx 337) creates all 11; applied and verified:

  ```
  $ node src/scripts/check-module-lifecycle.mjs
  Gate 1: Tenant isolation (RLS policies in pg_policies)
  PASS  All 11 tables have tenant-predicated RLS policies
  Gate 2: Cold migration (tables in pg_catalog + journaled migration)
  PASS  All 11 tables exist in pg_catalog with journaled migrations
  Gate 3: Restore (declared PK, org_id FK, named indexes present in pg_catalog)
  PASS  All 11 tables pass restore check
  Gate 4: Removal (org_id NOT NULL with FK whose ON DELETE is defined)
  PASS  All 11 tables have non-nullable org_id with FK

  RESULT: ALL GATES PASSED  (timesheets, 11 tables)
  exit=0
  ```

- [x] The manifest does not acquire runtime behaviour. It is data the checks read, not a framework modules run inside.

  Every addition is a `readonly` field on a `const` array plus derived pure helpers. No decorator, no lifecycle hook, no DI token, no module runs inside anything.

## Todo

- [x] Inventory the parallel registries first and write the list down; the manifest's field set is that list, and inventing fields ahead of it produces the generic framework the PRD forbids. — the table above.
- [x] Migrate one module end to end before all of them, and keep the old registries authoritative until it passes. — `timesheets`; the other 19 carry the fields but are not yet enforced.
- [x] Do not re-raise the frontend permission-key subset — it is a recorded, tested decision. — not raised; `check-permission-keys.mjs`'s self-test asserts `intentionalSubsetDoesNotFire`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Validation

```
$ node ./node_modules/jest/bin/jest.js src/common/rbac
Test Suites: 15 passed, 15 total
Tests:       378 passed, 378 total

$ node ./node_modules/jest/bin/jest.js lib/module-manifest components/layout/sidebar   (frontend)
Test Suites: 9 passed, 9 total
Tests:       123 passed, 123 total
```

`tsc` and build commands were not run — the user withheld them for this session.

## Findings for another session

**`uniq_timesheets_work_log` is stricter than the index it supersedes.** Creating the declared indexes closed the gap, but one of them narrows what the database accepts. The schema declares

```ts
uniqueIndex("uniq_timesheets_work_log").on(table.orgId, table.userId, table.date).where(sql`ticket_id IS NULL`)
```

while the index the database already carried, `uniq_timesheets_day_blank`, predicates on `ticket_id IS NULL AND project_id IS NULL AND voided_at IS NULL`. So the declared form also forbids a second same-day entry when the first carries a project, and when the first has been soft-voided — and `voided_at` is a live soft-delete column that every read in `core/approvals.service.ts` and `core/billing.service.ts` filters on with `isNull`.

Evidence it is safe today: across **150,150** rows, `SELECT org_id, user_id, date FROM timesheets WHERE ticket_id IS NULL GROUP BY 1,2,3 HAVING count(*) > 1` returns **0 groups**, so the strict rule already holds in the data. The exposure is future writes: void an entry, re-log the same day, and the insert now fails.

Whoever owns the timesheets schema should decide which predicate is intended. If the answer is the looser one, the fix is the schema line, not the migration: `.where(sql\`ticket_id IS NULL AND voided_at IS NULL\`)`.

**Three undeclared indexes survive on `timesheets`** — `idx_timesheets_user_date`, `uniq_timesheets_day_blank`, `uniq_timesheets_day_project`. No schema file declares them; they are the pre-rename forms. They were left in place rather than dropped: gate 3 only asserts that declared indexes exist, dropping is not reversible from a migration alone, and `uniq_timesheets_day_blank` is the very predicate the finding above may restore.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
