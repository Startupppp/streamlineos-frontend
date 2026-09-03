# 53 — SQLSTATE classification: what the driver actually throws, and how many checks read it

**Status:** DONE for backend release scope. CRM, Inventory and `src/scripts/` listed, not changed.
**Database measured:** `scratch_pgerr` (local Postgres, purpose-built for this probe) for the raw
shapes; `scratch_perf_seed` (head 665/665) read-only for constraint/index existence.
**Versions measured:** `postgres` 3.4.9, `drizzle-orm` 0.45.2, both from the repo's own
`node_modules`.

## 1. Ground truth — the raw shapes, verbatim

Provoked through `drizzle(postgres(url))`, the same wiring `src/db/drizzle.module.ts` builds.

**Raw postgres-js (`client\`…\``) — a bare `PostgresError`:**

```
ctor: PostgresError
ownKeys: stack, message, name, severity_local, severity, code, detail,
         schema_name, table_name, constraint_name, file, line, routine,
         query, parameters, args, types
code: "23505"
message: 'duplicate key value violates unique constraint "probe_child_pkey"'
message contains "23505": false
cause: null
```

**Through Drizzle — `.insert()`, `.update()`, `db.execute()`, and the same inside
`db.transaction()` all produce this identical shape:**

```
ctor: DrizzleQueryError
ownKeys: stack, message, query, params, cause
code: undefined                      <-- no code of its own
message: 'Failed query: insert into "probe_child" ("id", "parent_id", "qty")
          values ($1, $2, $3)\nparams: c1,p1,1'
message contains "23505": false      <-- SQLSTATE is not in the message
constraint: undefined
cause: {
  ctor: PostgresError
  code: "23505"
  constraint_name: "probe_child_pkey"    <-- NOT `constraint`
  table_name: "probe_child"              <-- NOT `table`
  column_name: "qty"   (23502 only)      <-- NOT `column`
  detail: "Key (id)=(c1) already exists."
  cause: undefined                       <-- chain is exactly one link deep
}
```

Identical wrapping measured for **23503** (FK), **23502** (not-null), **23514** (check),
**23P01** (exclusion) and **42P01** (undefined table). A bare unique **index** (not a
constraint) is reported under its index name in `constraint_name` — measured with
`uniq_probe_org_name`.

Two consequences, both load-bearing:

1. `err.code` is `undefined` for every error raised through Drizzle. **Idiom 1 is dead.**
2. `err.message` is `Failed query: <sql>\nparams: …`. It carries neither the SQLSTATE nor
   the driver's message, so it names neither `23505` nor the constraint.
   **Idiom 3 is dead too** — it does not "work by accident", as was possible in principle.
3. **New, previously unrecorded:** `constraint` / `table` / `column` are node-postgres
   spellings. postgres-js sets `constraint_name` / `table_name` / `column_name`. The
   pre-existing shared helper `getPostgresErrorDetails` walked the cause chain correctly
   for the code but looked for `constraint`, so **every constraint-name discrimination in
   the tree was `undefined`** — including the five that gate on
   `uniq_hr_people_org_person_link`. Its own spec faked `constraint` on the driver error,
   which is why this survived.

## 2. Census — every SQLSTATE evaluation in `src/`, excluding specs, `src/scripts/` and `src/db/schema/`

Counted at `755b45e3` (the commit before this work) with a classifier over every line
matching a SQLSTATE literal, bucketed by how the code is obtained. 83 evaluation sites plus
24 constant declarations.

| Idiom | Sites | Verdict | What a user saw |
|---|---:|---|---|
| `.code` / `["code"]` on the outer error | 53 | **DEAD** | 500 where a 409 was intended |
| `message.includes("23505")` / a constraint name | 11 | **DEAD** | 500; and in `journal-posting` the number-allocation retry never retried |
| local `code` var from `(err as {code?})` .code | 2 | **DEAD** | 500 on a duplicate invitation |
| `code` + `constraint` from the shared helper | 5 | **DEAD** (constraint always `undefined`) | 500 on a duplicate employment link |
| shared helper, code only | 10 | works | — |
| local `code` var, CRM (excluded) | 2 | DEAD | excluded from scope |
| **Total dead** | **71** | | of which 10 are in CRM/Inventory |

Two further affected sites carry no SQLSTATE on their line and are not in the 83:
`kb-members.service.ts:111` (wrong conflict message, not a 500) and
`org-member-departure.service.ts:53` (block reason rendered as `constraint: unknown`).

Eleven independent local copies of the predicate existed (`organization-saga`,
`ai-credits-reservation`, `billing-payment-activation`, `kb-articles`, `party/subject`,
`party/subject-type`, `autonomy-hold`, `pm-workspaces`, `pm-workspace-memberships`,
`offer-fulfillment`, plus `feedbucket`/`projects-provision`/`contact-roles`/
`batch-creator`/`principal-groups`/`accounting-mappings` under other names). Two of them
(`organization-saga`, `ai-credits-reservation`) walked the cause chain and worked; the rest
did not.

## 3. What changed

One helper, `src/common/db/postgres-error.ts` — it already existed and already had the right
idea, so it was fixed and extended rather than replaced:

- `getPostgresErrorDetails` now walks to the link carrying a SQLSTATE-shaped code and reads
  the constraint, relation and column **off that same object**, accepting both the
  postgres-js and node-postgres spellings.
- Named predicates: `isUniqueViolation`, `isForeignKeyViolation`, `isNotNullViolation`,
  `isCheckViolation`, `isExclusionViolation`, `isUndefinedTable`, `isUniqueViolationOn`.
- `getPostgresErrorCode` deleted — every caller migrated, and a caller that wants the code
  wants the constraint beside it.
- `sqlstateOf` stays in `common/observability/error-classification.ts` (its home, 3 callers:
  the exception filter, the log reporter, and this helper). It was briefly re-exported here;
  knip showed nothing imported the second path, so it was removed rather than left dead.

Sixty-one dead in-scope sites now route through it, and eleven local copies are gone.

## 4. Bite proofs (each measured in both directions)

| Proof | Pre-fix | Post-fix |
|---|---|---|
| `src/common/db/postgres-error.spec.ts` (measured shape) | 8 failed / 2 passed | 10 passed |
| `test/db/postgres-error-shape.seeded-e2e-spec.ts` (**real database**, real violations) | 5 failed / 2 passed | 7 passed |
| `ai-credits-balance-after-invariant.spec.ts` (real `DrizzleQueryError`) | 1 failed / 9 passed | 10 passed |

Defect-planting was hermetic: `git archive <sha> | tar -x -C <temp>` with `node_modules`
symlinked, never in the shared working tree.

The seeded spec is the anchor: it creates its own tables in a `scratch_` database and
provokes genuine 23505 / 23503 / 23502 / 23514 / 23P01 violations, asserting both that the
helper reads them and that `err.code`, `err.message.includes("23505")` and `err.constraint`
are all false against the same error.

## 5. Findings NOT fixed — owners needed

1. **`uniq_hr_people_org_person_link` does not exist in any applied migration.** It is
   declared at `src/db/schema/hr/core-people.ts:85` and created only in
   `migrations/pending/hrms-phase1/0000_hrms_profiles_workforce.sql`, which is not
   journalled. Measured on `scratch_perf_seed` at head 665: `hr_people` has **zero** indexes
   touching `organization_person_id`. Five call sites now read the constraint correctly and
   still cannot fire, because nothing raises. More seriously, **nothing prevents two
   `hr_people` rows for the same person** — `hr-people.service.ts:172`,
   `recruitment-handoff.service.ts:141/164/179`, `hr-import-commit.service.ts:142`.
   *Owner: HR + migrations.*
2. **CRM (7 dead sites) and Inventory (3 dead sites) left as-is**, per release scope:
   `crm-pricebooks.service.ts:64/96/165/325/355`, `crm-sequences.service.ts:38/62`,
   `inv-product-crud.service.ts:40`, `inv-product-catalog.service.ts:33`,
   `channels.service.ts:26`. All read `.code` off the wrapper and all 500 instead of 409.
   `inv-stock-adjustments.service.ts:126` already uses `sqlstateOf` and works.
   *Owner: whoever picks CRM/Inventory back up.*
3. **`src/scripts/` left as-is.** These use the raw postgres-js client, not Drizzle, so
   `err.code` genuinely works there — `migration-proof.mjs`, `apply-chain-cold.mjs`,
   `purge-user.mjs`, `drill-erasure.mjs` are all correct. The one exception is
   `backfill-chat-saved-messages-membership.ts:57`, which greps `err.message` for `"23505"`:
   dead even on the raw driver, because the `PostgresError` message is the server's message
   text and never contains the SQLSTATE. That backfill counts zero duplicates and rethrows
   instead. *Owner: chat/backfill.*
4. **`departureBlockMessage` constants vs predicates.** It needs the code itself to separate
   three classes, so it keeps the exported constants; `isRestrictViolation` was written and
   then deleted because knip showed no caller.
