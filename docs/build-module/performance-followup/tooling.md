# Build performance tooling

Two static analysers, added under `backend/src/scripts/build-performance/`. Neither is imported by application code, neither opens a database or a Redis connection, and neither writes a file. They cannot change runtime behaviour.

Run from `backend/`.

```bash
node src/scripts/build-performance/build-report-revision-integrity.mjs
node src/scripts/build-performance/build-cache-key-readers.mjs

node src/scripts/build-performance/build-report-revision-integrity.mjs --self-test
node src/scripts/build-performance/build-cache-key-readers.mjs --self-test

node --test src/scripts/build-performance/__tests__/build-performance-checks.test.mjs
```

They are deliberately **not** wired into `package.json`. That file is shared with every other lane; adding a script there is the coordinator's call, not an auditor's.

---

## `build-report-revision-integrity.mjs`

Finds the migration that defines `build.bump_report_revision()`, extracts the trigger target list from its `FOREACH … ARRAY[…]` loop, binds each SQL alias in the function body to its schema-qualified table, and reports any table or column the body reaches that a script in `migrations/sql/` drops.

Exits 1 on a finding. Today it reports the two references behind P0-1.

**Why it exists.** The function builds its statements as strings and runs them through `EXECUTE`. PostgreSQL records no dependency for a reference inside a string, so `DROP COLUMN` and `DROP TABLE` succeed and the breakage surfaces at runtime, in a trigger, aborting the caller's transaction. No existing gate reads inside a plpgsql body, and the detach migration's own guard is a data check that cannot see code.

**Accuracy.** References inside an `IF TG_TABLE_NAME = 'x' THEN` branch are charged only to table `x`. Without that, the unqualified `c` alias is charged to all five trigger targets and the tool reports a third, false row against `build.tickets.sprint_id`.

**What it cannot see.** Only `migrations/sql/` is treated as pending DDL; rollback scripts are excluded by filename. It reasons about the repository, not about any live database — it cannot tell you whether the trigger is installed, or whether a column was already dropped by hand.

---

## `build-cache-key-readers.mjs`

Scans `src/modules/build/**` for `CacheService` call sites, normalises each key literal to a shape by collapsing `${…}` to `*`, and pairs read shapes against invalidated shapes.

Reports three groups:

- **Invalidated with no reader** — the eviction reaches nothing. Always a defect. Today: `projects:analytics:*:*`, nine sites (P1-1).
- **Cached with no invalidator** — TTL-only staleness. A defect unless the key carries its own revision, which is how the Build reports are built.
- **Unresolved key arguments** — call sites whose key the tool could not resolve. Listed by file and line, never counted as absent.

**Why it exists.** `check:cache-invalidation` matches literal arguments only, so a key bound to a `const` and passed by name is invisible to it. That is what produces its three false `namespace-mismatch` findings against `timesheets.service.ts` (P2-3). This tool resolves single-assignment `const` and `let` bindings, and the false findings disappear.

**Why it reports unresolved sites loudly.** A name bound more than once in a file resolves to `null` rather than to whichever literal came first. That is the safe choice, but it means the five `cached(cacheKey, …)` sites in `projects-reports.service.ts` — one `cacheKey` per method, five rebinds in one file — are not analysed. Reporting them by name is the difference between a tool that is honest about its blind spot and a gate that quietly returns a smaller number. Resolving them properly needs block scoping, which needs a real parser.

**What it cannot see.** Keys built by a helper call, keys assembled across statements, and anything outside `src/modules/build/**`.

---

## Self-tests

Both analysers carry `--self-test`, which proves each detector bites on a constructed positive and stays silent on a constructed negative — including the two cases most likely to rot: a rebound name must not resolve to the wrong literal, and a branch-guarded column must not be charged to the other trigger targets.

`__tests__/build-performance-checks.test.mjs` runs both self-test suites and exercises the pure functions directly, 17 assertions under `node:test`. It is a `.mjs` file run by `node --test` rather than a jest spec, because the jest roots and transform config are shared across lanes.
