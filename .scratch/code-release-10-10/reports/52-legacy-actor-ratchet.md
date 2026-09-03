# 52 — The legacy-actor ratchet: 69 stale allowlist entries verified and removed, baseline tightened 20 → 1

**Repo:** `streamlineos-backend`.
**Commits:** `fe06f818` (allowlist + self-test), `3ed0a087` (baseline).
**Database measured:** `scratch_perf_seed`, local Postgres, at head. Nothing was applied to it; every
query was read-only against `pg_catalog` / `information_schema`. `DATABASE_URL` was never touched.

## 1. Starting state

`60aa3f2c` fixed the workflow's `working-directory: backend`, so the gate can execute for the first
time. Run at that head, **both** of its steps exit 1 on the same thing:

```
node src/scripts/scan-legacy-org-actors.mjs --check       EXIT=1   ALLOWLIST STALE (69 entries)
node src/scripts/scan-legacy-org-actors.mjs --self-test    EXIT=1   ALLOWLIST STALE (69 entries)
```

The staleness guard fires before either mode does any work, so **the self-test's own assertions had
never run either.** Everything in §3 below was latent behind that.

## 2. All 69 verified individually, three independent ways

The failure mode being guarded against is laundering: deleting entries the scanner merely stopped
*seeing*, which shrinks coverage while making the gate green. Sampling cannot distinguish that, and a
naive `grep created_by` matches the wrong file — `created_by` recurs across hundreds of tables. So
each entry was checked by locating the **actual** table declaration via its table-name **string**.

| check | method | result |
|---|---|---|
| A | depth-aware `pgTable(...)` body splitter; locate decl by table-name string across `src/` + `test/`; read the column's own source slice | 69/69 column present, **0 carry `.references()` of any kind** |
| B | independent line-state-machine parser sharing no code with A, over the same tree *including* `hrms-phase1-sql-managed.ts` and `index.ts` | 69/69 agree; 0 reference `users.id` |
| C | `pg_constraint` on `scratch_perf_seed` (at head): every FK whose `confrelid = 'users'::regclass` | 449 live users FKs; **0 of the 69 among them** |

Both parsers found **exactly one** declaration per table. The one apparent duplicate,
`vault_access_logs`, is a string literal inside `recruitment-candidate-vault.spec.ts`, not a second
table.

Two hypotheses that would have made deletion wrong were both closed:

- **Not the skipped barrel.** The walker skips only `hrms-phase1-sql-managed.ts`. All 69 live in
  `src/db/schema/hr/*.ts`, none of which is that file.
- **Not a composite FK the regex misses.** There is no
  `foreignKey({ foreignColumns: [users.id] })` anywhere in `src/db/schema`. The `users.` hits inside
  `foreignKey(` context are Drizzle `relations()` declarations, which create no constraint.

**The three findings handed to me were all correct.** `hr_insurance_claims.decided_by`,
`resignations.*` and `candidate_offers.*` are exactly as described, and so are the other 66.

Live-database state of all 69, from `information_schema.columns`:

- 69/69 exist, **all `text`**
- 69/69 carry **no foreign key at all**
- 69/69 have an **exactly-named `*_membership_id` sibling** (`<col>_membership_id`, or the `_id` /
  `_user_id` suffix swapped) present in the same table

## 3. What removing them exposed — two latent self-test defects

With the allowlist clean, `--self-test` ran for the first time and failed on two things that
pre-date this work:

1. `expectClass("hr_reporting_lines", "created_by", "organizational")` — **that column is itself one
   of the 69.** It was contracted, so the assertion could only ever fail. Replaced with
   `hr_automation_rules.created_by`, a live HR actor FK. Same for the matching
   `expectNotActionable`.
2. `if (entries.length < 400)` — a "scanner may be broken" tripwire calibrated when the scan found
   479. Contraction has taken the source scan to **374**, so 400 was **unreachable** and the
   self-test could never pass again.

**This is a loosening and is flagged as one.** The floor was lowered to 250 and, to more than offset
it, five named live examples were added so a parser regression that silently drops a whole schema
directory is caught **by name** rather than by an aggregate: `expenses.approver_id` (payroll),
`kb_page_reviews.reviewer_id` (kb), `app_installations.installed_by` (billing),
`support_routing_rules.created_by` (support), `survey_forms.owner_user_id` (surveys). A floor pinned
just under the current count is a treadmill every migration PR has to lower; the per-module
assertions are the real coverage guard.

## 4. Numbers at head after the cleanup

```
Organizational (legacy total):    366
  – CRM/Inventory (out of scope): 116
  – Allowlisted display-only:     249   (was 318)
  – ACTIONABLE (must migrate):      1
Bridge:  3    Authentication: 5    Unknown: 0
Total users.id FKs scanned:       374
```

The single remaining actionable legacy actor FK in the whole in-scope surface is
**`kb_page_attachments.uploaded_by_id`** (`src/db/schema/kb/attachments.ts`).

## 5. The baseline moved DOWN, 20 → 1

`data/legacy-actor-baseline.json` held `actionableCount: 20`, captured 2026-09-01 — before the gate
had ever run. Re-emitted: **1**. It was never raised.

**This is not cosmetic. A baseline of 20 is a ratchet that cannot bite**, and that was proved
directly (§6, test 3): with the identical planted defect in place, `--check` against the old
baseline of 20 exits **0**.

## 6. Bite proofs — hermetic, in a temp tree from `git archive HEAD src data`

No defect was ever planted in the shared working tree.

| # | scenario | `--check` exit | output |
|---|---|---:|---|
| 1 | clean tree | **0** | `Ratchet OK: 1/1 actionable remaining` |
| 2 | new `text("ratchet_bite_probe_by").references(() => users.id)` on `attendance` (module `hr`, in scope) | **1** | `RATCHET VIOLATION: ACTIONABLE legacy-actor count rose from 1 to 2.` |
| 3 | same defect, baseline restored to the old **20** | **0** | `Ratchet OK: 2/20 actionable remaining` — **the old baseline was blind to it** |
| 4 | defect removed, baseline 1 | **0** | `Ratchet OK: 1/1` |
| 5 | identical defect planted on `invoices` (module `crm`, excluded) | **0** | out-of-scope count 116 → 117, actionable unchanged — `EXCLUDED_MODULES_FROM_SCOPE` models what it claims |
| 6 | bogus allowlist entry `__probe_table__.__probe_col__` | **1** | `ALLOWLIST STALE` — and `--self-test` also 1 |

`--self-test` exits **0** on the clean tree and correctly stays 0 in test 2 (a *new* actionable FK is
not a scanner defect).

## 7. Secondary finding — the expanded actor state, and why the ratchet cannot see it

**All 69 are in the expanded state**: the legacy column survives as **bare `text` with no foreign key
at all**, beside an unpopulated-or-populated `*_membership_id` sibling. Nothing enforces that the id
in that column names a real user, let alone one in this tenant. 56 distinct tables.

Measured population, both sides:

| definition | count |
|---|---|
| declared (legacy, `*_membership_id`) pairs in `src/db/schema` | 259 across 199 tables |
| …where the legacy column still references `users.id` | 120 |
| …where the legacy column is **bare, no reference at all** | **138 across 114 tables** |
| live in `scratch_perf_seed`: same pairs | 326 across 229 tables |
| …live legacy column with **no FK at all** | **119 across 101 tables** |

My 69 are a subset: **69 of the 138 declared bare columns, 56 of the 114 tables.** The remaining
**50 bare columns across 45 tables** are in the same unenforced state and are **not** in the
allowlist — they are simply invisible to a scanner that only counts `.references(() => users.id)`.

Report `07b-declaration-drift.md` measures **72** tables "still in the expanded actor state" and
`15g` repeats it. That is a different definition (tables whose declaration would produce column drift
if trimmed), not a contradiction — but the two numbers should be reconciled by whoever owns the
programme, because 72 and 114 lead to different amounts of remaining work.

**The structural consequence, which is the important part:** the ratchet counts **foreign keys**, not
**actor columns**. Dropping the FK and leaving a bare `text` actor column *satisfies* the ratchet
while making the reference **less** safe than it was — the constraint that guaranteed the id resolved
to a real row is gone, and nothing replaced it. That is precisely how these 69 left the scan. The
gate is a correct guard against *new* legacy FKs; it is not, and cannot be, a measure of contraction
progress.

**Owner and finish line: there is none.** The only ownership statement in the release is
"**Owner: whoever finishes the actor contraction**", written twice (`07b:708`, `15g:258`). No ticket
in `issues/` covers it, no deadline exists, and
`architecture-refactor/ACTOR-CLASSIFICATION.md` — cited by the allowlist's own `_description` as the
per-relationship justification table backing all 249 remaining entries — **does not exist anywhere in
either repo.** The 249 "no service reads it in a WHERE predicate" claims have no companion evidence
document. **Needs an owner.** Not attempted here; contracting 119 live columns is a separate
programme.

## 8. Coverage hole in the scanner (not fixed, not my territory)

Comparing the 374 scanner keys against the 449 live users FKs in `scratch_perf_seed`:

- **101 live users.id FKs are invisible to the scanner.** Spot-checked `attendance.user_id`,
  `goals.user_id`, `documents.user_id`: the Drizzle source already declares them as bare
  `text("user_id")` beside `user_membership_id`, **but the live constraint was never dropped.** The
  source ran ahead of the migrations.
- **26 scanner keys have no live FK** (source declares a reference the database does not have).

So the source ratchet is a **floor** in one direction and an **over-count** in the other. `--catalog`
exists to name this gap but needs `DATABASE_URL`, which is out of bounds here; it was replicated
read-only against the scratch database instead.

## 9. Gates

| command | exit | number |
|---|---:|---|
| `node src/scripts/scan-legacy-org-actors.mjs --check` | **0** | `Ratchet OK: 1/1 actionable remaining` |
| `node src/scripts/scan-legacy-org-actors.mjs --self-test` | **0** | `374 total FKs found, 1 actionable` |
| `$HEAVY 2 -- pnpm -C streamlineos-backend typecheck` | **0** | 0 `error TS` lines |
| `$HEAVY 2 -- pnpm -C streamlineos-backend check:spec-typecheck` | **0** | `spec-inclusive typecheck passed` |

Exit codes captured with `$?` into a variable, never `${PIPESTATUS[0]}`.

**Not run:** lint, jest, e2e, `next build`. The gate is not wired into `ci.yml` and has still never
completed a run on GitHub — `60aa3f2c` makes it *able* to; only a real CI run proves it does.
