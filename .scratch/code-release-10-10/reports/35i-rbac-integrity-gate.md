# 35i — `verify:rbac-integrity`: the gate that passed for the wrong reason, fixed and wired

**Repo:** `streamlineos-backend` · **Commits:** `c187206d`, `926ef43a`
**Databases measured:** `scratch_perf_seed` (local, journal head 665 applied migrations, seeded:
8 orgs / 577 users / 138 role assignments) and `scratch_rbacgate` (local, built for this ticket by
`db:bootstrap`, **REACHED_HEAD 672/672**, 0 orgs / 0 users — i.e. exactly the fresh-bootstrap state
the old gate skipped on). Two disposable derivatives, `scratch_rbacgate_nocat` and
`scratch_rbacgate_bare`, were created for the precondition proofs. No existing `scratch_*` database
was dropped; `DATABASE_URL` in `.env` was never used — every run set it explicitly to a local
`scratch_*` database, and `node --env-file-if-exists` was measured to let the shell environment win
(`PROBE_VAR = from-shell`).

---

## 1. The recorded measurement was accurate — verified, with one correction

The `UNWIRED_BY_DESIGN` entry in `src/scripts/check-gate-wiring.mjs` claimed three things. All three
reproduce.

`pnpm`-free invocation, `DATABASE_URL` → `scratch_perf_seed`, old gate at `c187206d^`:

```
EXIT=1
  PASS  expect=REJECT got=REJECT  cross-tenant assigner on role_assignments [23505]   <-- passes on a UNIQUE violation
  FAIL  expect=ACCEPT got=REJECT  same-tenant assigner [control] [23505]
  FAIL  expect=ACCEPT got=REJECT  null assigner [control] [23505]
  ... 7 more
FAIL — 2 problem(s).
```

Same gate, `DATABASE_URL` → `scratch_rbacgate` (fresh bootstrap at head):

```
EXIT=0
SKIP — fewer than two organizations have BOTH a membership and a role; ...
OK — RBAC actor and module keys are referentially constrained, and the controls prove the
constraints are not over-strict.
```

- **Confirmed:** the first REJECT probe passed on **23505** — a unique violation on
  `uniq_role_assignments_org_membership_role` — not the cross-tenant FK it names. Because
  `classify()` only asked "did anything throw", the probe would have passed identically against a
  database with no RBAC foreign keys at all, so long as the row already existed.
- **Confirmed:** ACCEPT controls fail on 23505 for the same reason (the probe row is not unique
  per run).
- **Correction to the recorded text:** the entry says "**both** ACCEPT controls failed". There are
  **four** ACCEPT controls; the **two on `role_assignments`** fail on 23505, and the two on
  `user_permission_grants` happened to pass — only because the seeded org's membership did not
  already hold `chat:messages:read` or `hr:employees:view`. That is data-dependent luck, not an
  assertion. The substance of the finding is unchanged.
- **Confirmed:** on a fresh `db:bootstrap` the block prints SKIP and the script then prints its
  success line and **exits 0**. The success line it prints on a skip — "the controls prove the
  constraints are not over-strict" — is false: no control ran.
- **Worse than recorded:** the SKIP predicate is "fewer than two orgs hold both a membership and a
  role". A database whose entire permission catalog has been **deleted** also has no such org, so
  the old gate exits 0 there too. Measured on `scratch_rbacgate_nocat` (0 permissions,
  0 modules_catalog rows): `EXIT=0`, SKIP.

**Root cause is not the drizzle `.cause` trap.** This script uses raw `postgres-js`
(`sql.begin` / `tx\`…\``), which raises a bare `PostgresError` with `.code` populated, so
`error.code` did resolve here. The bug was that the *verdict* never compared it to anything: any
non-null code counted as REJECT.

---

## 2. What changed

`src/scripts/verify-rbac-referential-integrity.mjs` (rewritten) plus three new siblings:

| File | Holds |
|---|---|
| `src/scripts/verify-rbac-verdict.mjs` | `sqlErrorShape`, `describeError`, `verdict`, `REQUIRED_CONSTRAINTS`, `administeringModuleOf` — pure, no I/O |
| `src/scripts/verify-rbac-probes.mjs` | `PROBE_SPECS` — 19 probes, each naming what it asserts |
| `src/scripts/verify-rbac-self-test.mjs` | 33 hermetic checks |
| `src/scripts/verify-rbac-referential-integrity.mjs` | entry: constraint census, catalog preconditions, fixture, probe runner |

**(1) Each probe fails only for the reason it claims.** `verdict(spec, observed)` requires a REJECT
to carry the **exact SQLSTATE and the exact constraint name**. A unique violation (23505), a
not-null violation (23502), a check violation (23514), a missing table (42P01), a syntax error
(42601), a permission denial (42501), the *right* code on the *wrong* constraint, a rejection with
no constraint named, and a non-Postgres error (a dropped socket) are all **probe failures**. So is
a write that succeeds when a rejection was claimed.

`sqlErrorShape` reads three shapes, not one: bare postgres-js (`.code` / `.constraint_name`), the
`DrizzleQueryError` wrapper (no `.code` of its own, the driver error on `.cause`), and the
node-postgres spelling (`.constraint` / `.table`). The gate does not use Drizzle today; the wrapper
path is there so that moving it onto Drizzle cannot silently make every match fail, which is the
documented repo-wide trap (report 53).

**(2) The ACCEPT controls now genuinely accept.** Every probe builds its **own** fixture inside the
transaction it rolls back — two organizations, two users, two memberships and a role, all
`randomUUID()`-suffixed. Nothing pre-exists, so no probe can collide on a unique index. The two
controls that used to fail on 23505 now report `permitted`.

**(3) The SKIP is gone, in both directions.** Because the fixture is manufactured, the gate no
longer needs a seeded organization holding a role: it runs its full probe set on a database with
**zero organizations**. What remains a precondition is the *catalog* (`modules_catalog` /
`permissions`), which migrations populate. When that is unusable the gate prints
`MISSING PRECONDITION` lines naming exactly what is absent and **exits 1**. When the RBAC schema is
absent entirely it prints `UNREADABLE DATABASE` with the SQLSTATE and exits 1. There is no path
that exits 0 without having run and passed 19 probes.

**(4) Coverage widened from 5 of 9 constraints to 9 of 9.** `REQUIRED_CONSTRAINTS` lists nine, but
only five were ever bitten by a probe — `fk_permissions_administering_module`,
`fk_ownership_transfers_module`, `fk_user_module_access_module` and
`fk_user_permission_grants_module` were asserted only by their presence in `pg_constraint`. Each now
has a REJECT probe, and each REJECT is paired with an ACCEPT control on the same table proving the
constraint is not simply refusing everything. The self-test enforces the pairing:
`everyRequiredConstraintIsProbed` and `everyProbedConstraintIsRequired` fail if the two lists drift.

**(5) Wired.** `.github/workflows/db-gates.yml`, `bootstrapped` job (the only job in the repo with a
live database at journal head), and the `UNWIRED_BY_DESIGN` entry removed in the same commit.
`check:gate-wiring` → **exit 0**, `98 gates, all invoked by a run: step … 11 deliberate exceptions`
(was 12).

---

## 3. The four bite proofs — real exit codes

All run from a `git archive HEAD src | tar -x` temp tree. The shared working tree was never given a
planted defect.

### Proof 1 — constraints present → exits 0, having asserted something

```
DATABASE_URL=…/scratch_rbacgate  node <tmp>/src/scripts/verify-rbac-referential-integrity.mjs
EXIT=0
OK — 19 probes over 9 constraints: every rejection carried the exact SQLSTATE and constraint
claimed, and every control was permitted.
```

Same on `scratch_perf_seed`: **EXIT=0**, 19/19. Non-destructive — after the run
`scratch_perf_seed` still reports `orgs=8 users=577 members=577 roles=10 ra=138 upg=0 perms=704`
and `probe_leftovers=0`.

### Proof 2 — constraint dropped → exits non-zero, naming it

```
psql -d scratch_rbacgate -c "ALTER TABLE role_assignments DROP CONSTRAINT fk_role_assignments_assigner_membership"
EXIT=1
  MISSING  fk_role_assignments_assigner_membership
  FAIL  [23503/fk_role_assignments_assigner_membership]  role_assignments: assigner from another
        organization — expected 23503 on fk_role_assignments_assigner_membership; the write was PERMITTED
FAIL — 2 problem(s).
```

Restored the constraint → **EXIT=0**, 19/19 again. The gate names the loss twice: once from the
catalog census, once from a probe that now shows a cross-tenant assigner being accepted.

### Proof 3 — the probe row already exists (the 23505 condition) → FAILS, does not pass

Planted in the temp tree only: `buildFixture` reverted to the old behaviour of selecting
pre-existing seeded rows. Run against `scratch_perf_seed`, i.e. the exact condition under which the
old gate reported PASS:

```
EXIT=1
  FAIL  [23503/fk_role_assignments_assigner_membership]  role_assignments: assigner from another
        organization — expected 23503 on fk_role_assignments_assigner_membership;
        got SQLSTATE 23505 on uniq_role_assignments_org_membership_role
  FAIL  [ACCEPT]  role_assignments: assigner from the same organization [control] —
        expected the write to be permitted; it was rejected with SQLSTATE 23505 on …
  FAIL  [ACCEPT]  role_assignments: no assigner [control] — … 23505 …
FAIL — 3 problem(s).
```

Same SQL, same database, same collision — scored PASS by the old gate, scored FAIL by the new one,
with the wrong reason printed verbatim.

### Proof 4 — precondition missing → fails loudly, never skips

```
scratch_rbacgate_nocat  (schema at head, permissions and modules_catalog emptied)
EXIT=1
  MISSING PRECONDITION  modules_catalog is empty — no module key exists to grant anything under.
  MISSING PRECONDITION  no permission carries an administering_module_key — …
  MISSING PRECONDITION  modules_catalog holds fewer than two modules — …
  MISSING PRECONDITION  no permission has a NULL administering_module_key — …
FAIL — the database cannot support the probes, so this gate asserts nothing here. It never skips …

scratch_rbacgate_bare   (empty database, no RBAC schema)
EXIT=1
  MISSING  fk_permissions_administering_module   … (all nine)
  UNREADABLE DATABASE  SQLSTATE 42P01 on an unnamed constraint
FAIL — the gate could not read the RBAC schema, so it asserted nothing. …
```

**The contrast, same two databases, old gate:**

```
OLD gate on scratch_rbacgate:        EXIT=0  |  SKIP — fewer than two organizations …
OLD gate on scratch_rbacgate_nocat:  EXIT=0  |  SKIP — fewer than two organizations …
```

The old gate is green on a database whose entire permission catalog has been deleted.

---

## 4. What each probe now asserts

`catalog:` line names the keys chosen from the live catalog, so the output says what it probed.
On `scratch_rbacgate`: `blog:access:manage` / `blog`, drift target `accounting`, unadministered
`settings:record-layouts:manage`. On `scratch_perf_seed`: `accounting:access:manage` / `accounting`,
drift target `blog`, unadministered `ai:chat:use`.

| # | Probe | Claim |
|---|---|---|
| 1 | `role_assignments` assigner from another organization | 23503 / `fk_role_assignments_assigner_membership` |
| 2–3 | same-organization assigner · no assigner | ACCEPT |
| 4 | `module_ownerships` module `not_a_real_module` | 23503 / `fk_module_ownerships_module` |
| 5 | `module_ownerships` catalogued module | ACCEPT |
| 6 | `roles` module `not_a_real_module` | 23503 / `fk_roles_module` |
| 7 | `roles` catalogued module | ACCEPT |
| 8 | `user_module_access` module `not_a_real_module` | 23503 / `fk_user_module_access_module` |
| 9 | `user_module_access` catalogued module | ACCEPT |
| 10 | `ownership_transfers` module `not_a_real_module` | 23503 / `fk_ownership_transfers_module` |
| 11 | `ownership_transfers` catalogued module | ACCEPT |
| 12 | `permissions` administering module `not_a_real_module` | 23503 / `fk_permissions_administering_module` |
| 13 | `permissions` catalogued administering module | ACCEPT |
| 14 | grant under module `not_a_real_module` | 23503 / `fk_user_permission_grants_module` |
| 15 | grant of a permission under the **wrong catalogued** module | 23503 / `fk_user_permission_grants_permission_module` |
| 16 | grant of a permission under its administering module | ACCEPT |
| 17 | grant of a permission whose `administering_module_key` is NULL | 23503 / `fk_user_permission_grants_permission_module` |
| 18 | grant with a granter from another organization | 23503 / `fk_user_permission_grants_granter_membership` |
| 19 | grant with a same-organization granter | ACCEPT |

Probe 15 is the one that carries the §5 namespace-ownership rule into the database: a permission
cannot be stored under any module but its administering one, because the grant's
`(permission_key, module_key)` pair is a foreign key into `permissions (name, administering_module_key)`.
Probe 14 is separated from it deliberately — with an *uncatalogued* module both FKs are violated
and `fk_user_permission_grants_module` fires first (measured identically on the fresh bootstrap and
on the seeded database, since RI trigger order follows the migration chain, which is the same
chain); probe 15 uses a **catalogued** module so only the composite FK can fire and the assertion
is unambiguous.

The hardcoded `chat:messages:read` / `hr:employees:view` probes were replaced by catalog-derived
selection: those two keys do not exist on a fresh bootstrap (39 permissions, delivered by
migrations; the other 665 arrive from `PermissionCatalogSyncService` at app boot, which
`db-gates.yml` does not run). Hardcoding them would have made the gate red in the very job it is
now wired into. The `administeringModuleOf` namespace-folding rules (chat/mail/calendar/notifications
→ home, party → crm) are still asserted, in the self-test and in the drift scan over stored
`user_permission_grants` rows.

## 5. Self-test

`pnpm verify:rbac-integrity:self-test` → **exit 0**, 33 checks, hermetic (no database). It bite-proves
the classifier against eight wrong reasons, both drizzle-wrapped and bare error shapes, the
fixture-phase failure in both expectation directions, and the anti-vacuity floors linking
`REQUIRED_CONSTRAINTS` to `PROBE_SPECS` in both directions. It runs in `ci.yml`'s hermetic `gates`
job as before.

## 6. Role note — why this gate runs as the owner

The release brief cautions that a probe run as the schema owner can pass where production would
deny, because the owner has `BYPASSRLS`. That caution governs RLS-shaped probes; it does not change
this gate's verdicts. PostgreSQL enforces foreign keys through RI triggers that run with row
security off, for every role — an FK rejects the same way for `streamline_app` as for the owner.
What the gate does need owner rights for is the **fixture**: it inserts and rolls back rows in
`users`, `organizations` and `organization_members` across two tenants. Measured on
`scratch_rbacgate` under `SET LOCAL ROLE streamline_app`: `42501 permission denied for table users`.
That is scored at the `fixture` phase and `verdict` treats it as a probe **FAILURE**, never a pass
(bite-proved by `fixtureFailureFailsAReject` / `fixtureFailureFailsAnAccept`). So running it as the
wrong role produces a red gate, not a vacuous green one. **Not measured:** a full non-owner run with
table grants and the tenant GUC set — `scratch_perf_seed`'s `streamline_app` password is not
available to this session and a `SET ROLE` fixture cannot cross tenants under RLS by construction.

## 7. Commands run

| Command | Exit | Result |
|---|---|---|
| `node src/scripts/verify-rbac-referential-integrity.mjs --self-test` | 0 | 33 checks, 0 false |
| `DATABASE_URL=…/scratch_rbacgate node …verify-rbac-referential-integrity.mjs` | 0 | 19/19 PASS |
| `DATABASE_URL=…/scratch_perf_seed node …verify-rbac-referential-integrity.mjs` | 0 | 19/19 PASS |
| same, constraint dropped | 1 | 1 MISSING + 1 FAIL, restored → 0 |
| same, fixture reverted to pre-existing rows | 1 | 3 FAIL, first one on 23505 |
| `DATABASE_URL=…/scratch_rbacgate_nocat` | 1 | 4 MISSING PRECONDITION |
| `DATABASE_URL=…/scratch_rbacgate_bare` | 1 | 9 MISSING + UNREADABLE DATABASE |
| `pnpm check:gate-wiring` | 0 | 98 gates, 0 unwired, 0 stale, 11 exceptions |
| `npx eslint` on the five changed `.mjs` files | 0 | clean |
| `node src/scripts/db-bootstrap.mjs` → `scratch_rbacgate` | 0 | REACHED_HEAD 672/672 |

**Not run:** `pnpm typecheck`. Every changed file is `.mjs` and neither `tsconfig.json` nor
`tsconfig.build.json` sets `allowJs`, so `tsc` does not read them. **Not run:** jest — no spec
imports this module (grepped `src`, `test`, `scripts`).

## 8. Cross-territory findings — not fixed here

- `pnpm check:file-sizes` → **exit 1**, 9 files over 500 lines (`src/common/cache/cache.service.ts`
  578, `src/modules/chat/chat-huddles.service.ts` 571, `src/modules/clients/client-accounts.service.ts`
  505, …). No file of mine is named; the four new scripts are 73–174 lines.
- `pnpm check:dead-code` → **exit 1**, naming `src/common/tenant/tenant-context.ts:getTenantAbortSignal`
  among others. No file of mine is named.
- `check-gate-wiring.mjs`'s remaining exceptions for `check:declaration-column-drift` and
  `check:declaration-constraint-drift` both say they "run in `db-gates.yml` when a bootstrapped
  target exists". **They do not** — neither name appears anywhere in `db-gates.yml`. The reason text
  is aspirational; both are genuinely unwired. Owner: gate-wiring.
- `db-gates.yml` carries a file-level note that none of its jobs has ever executed in any
  repository. This gate is now wired into that job, so its green is **unproven in CI** — it is
  proven only against the two local databases above. Promoting the job to `ci.yml` is that ticket's
  call, not this one's.
