# 21c — Re-deriving the box-1/2/3 denominators with an AST scan, and the four gate gaps that hid them

**Date:** 2026-09-03 · **Repo:** `streamlineos-backend` · **Ticket:** 21 (boxes 1, 2, 3)

Every number below was produced by a scanner I wrote and bite-proved in this pass.
None of it is inherited from `check:db-call-count`, whose green I was told not to
trust — and which turned out to have four more blind spots than the one I was warned about.

---

## 1. Method — how "growing" is distinguished from "fixed"

The clause is *"no database or cache call inside a **growing** loop"*. A line
scanner cannot answer that, because these are the same shape to a regex:

```ts
for (const adapter of PURGE_ADAPTERS)   // 9 adapters. Forever 9 queries.
for (const row of rows)                 // one query per tenant row.
```

So the measurement is an AST pass (`typescript` parser, `ts.createSourceFile`).
A loop is a real loop node; a loop body is the body node, not "the next 30 lines";
a DB call is a call expression whose callee chain roots at a db handle. Every loop
containing a db/cache call is sorted into exactly one bucket:

| bucket | meaning | violation? |
|---|---|---|
| **GROWING** | iteration count comes from data — a parameter, a query result, an `await`, a property, or a `filter`/`map` over any of those | **yes** |
| **FIXED** | count pinned by a literal reachable from the site: an array/object literal, an in-file **or imported** const array, an enum, `i < <number>` | no |
| **PAGING** | no iteration source (`for(;;)`, `while`, `do`), or a chunked stride `i += CHUNK` — one **page** per pass | no |

Three refinements are load-bearing, and each was written *after* the measurement
without it came out wrong. I am listing them because each one moved the number:

- **`const rows = []` then `rows.push(x)` is GROWING**, not "an array literal of
  length 0". Without this, ten real per-row loops — `org-lifecycle`'s per-member
  `withIdentity` transaction among them — read as fixed-size-**zero**.
- **A `...Cache` receiver that is a `new Map()` is not a round trip.**
  `this.versionCache.delete(key)` is `Map.prototype.delete`. Without this, five
  in-process TTL sweeps were reported as N+1s.
- **`i += CHUNK` is the chunked bulk write box 3 *asks for*.** Its bound is
  `rows.length`, so a bound-only test scores the correct form as the defect it
  replaced.

**Bite-proof of the scanner itself** (fixture, both directions): 5 planted
defects detected, 4 known-good shapes clean, and the two conflation traps landing
in their own buckets rather than in the violation count. Two real bugs in my own
scanner were caught this way before any number was reported — it unwound past
`this.db` to the bare `this` keyword (so all 1,039 `this.db.select()...` chains
returned null), and it skipped concise arrow bodies (so `ids.map((id) => this.db.update(...))`,
the commonest hidden-N+1 idiom here, was invisible).

---

## 2. Box 1 — the honest number

**Measured before fixing anything:** 5,058 loop nodes across 2,109 service files;
251 loops contain a db/cache call; 37 of those are in excluded CRM/inventory.

| | in release scope |
|---|---|
| **GROWING — violation candidates** | **124 sites across 89 files** |
| FIXED (literal-bounded) | 16 |
| PAGING (page/chunk per pass) | 40→68 |

All 158 candidates from the wider pre-refinement scan were then **read one by one**
(four parallel readers, each opening the enclosing method). Consolidated verdict:

**70 REAL-N1 · 88 not** (BOUNDED-PAGING / FIXED-SET / PER-TENANT-TX / FALSE-POSITIVE).

Their false-positive verdicts independently converged on the same two refinements
I had just added — in-process Maps and chunked strides — which is the closest
thing to corroboration available here.

**After this pass: 106 growing sites across 78 files** (18 removed).

### What the shipped gate said instead

`check:db-call-count` was **green (exit 0)** over all of it, reporting 39
ACTIONABLE files. Its number is not comparable to mine and should not be treated
as the same measurement.

---

## 3. The gate's detector had FOUR gaps, not one

I was warned the gate had skipped 2,417 of 4,765 loop openers. That was repaired
by an earlier pass. What remained is different and, for one of them, total.

| # | gap | scale |
|---|---|---|
| 1 | **Every `this.cache.*` call was invisible.** The pattern requires the literal identifier `cacheService`; this repo injects `private readonly cache: CacheService` and writes `this.cache.…`. | **188 call sites. The entire cache half of the clause had never been enforced at all.** |
| 2 | `db.selectDistinct(` never matched — the alternation matches `select`, then demands `\s*\(`, and the next character is `D`. | 1 site |
| 3 | A helper receiving the handle with **no directly preceding `await`** never matched — i.e. `ids.map((id) => helper(this.db, id))`, where the callback returns the promise and `Promise.all` awaits it later. | 56 sites / 42 files |
| 4 | **Found while proving 1–3:** a **one-line** loop whose body is on the opener line was never inspected by *any* path, because all of them start at line `i+1`. | `assignees.map((a) => this.cache.invalidate(k))` and `for (const r of rows) await this.db.insert(t).values(r);` both scored 0 |

Gap 4's fix isolates the body from the header first (`openerLineBody`), or
`.where(inArray(t.id, ids.map((i) => i.id)))` would report the `this.db.select(`
that opened the *enclosing statement* as a call inside the `.map`.

**Bite-proved hermetically** (`git archive HEAD src` into a temp dir; nothing
planted in the shared tree, which ~10 agents were editing): 5 planted defects
score **old=0, new=1**; 3 known-good shapes score 0 on both. End to end, a cache
N+1 planted into a file marked `N+1-FIXED` reds the new gate with a REGRESSION and
draws **0 regressions** from the pre-change detector.

Cost of gap 1's fix, stated plainly: **two false positives** — `access.service.ts`
and `denied-modules.resolver.ts`, where the identifier `cache` names an in-process
`Map`. A regex cannot tell. Both are classified `FALSE-POSITIVE` with the reason.

---

## 4. New gate: `check:n1-growing-loops` — **RATCHET AT 106**

The regex gate is kept (it catches shapes the parser's handle-detection does not),
but it structurally cannot answer the clause. So the AST detector ships as its own
gate.

**This is a ratchet, not a pass. 106 real growing-loop call sites exist today.**
A green run means *no new N+1 was added*, not that there are none.

Two ratchets, and the second is the important one:

- `MAX_GROWING_SITES = 106` — findings, may only go down.
- `MIN_LOOP_NODES = 4800` — **loop nodes actually parsed.** Counting *findings*
  cannot catch a detector that quietly stops looking, because a narrower detector
  finds less and reads as cleaner. **Proved:** restricting the iteration methods to
  `forEach` alone drops growing sites to **94** — comfortably under the ratchet, so
  it would pass as an improvement — and reds on coverage, 1,460 nodes against 4,800.

Bite-proof also caught a real bug in this gate *before it shipped*: `ROOT` was an
absolute path, so it scanned the developer's checkout no matter which tree it ran
from, and the first planted defect was invisible. It now resolves from
`import.meta.url` like its sibling.

---

## 5. Box 2 — existence and authorization probes

AST-measured over 2,109 files: **4,759 select/find chains, 2,148 probes**
(`limit(1)` or `findFirst`).

| population | count | files |
|---|---|---|
| `count()` used only for existence | **1** | 1 |
| fetch-for-existence (`findFirst`, no `columns:` projection, result only presence-tested) | **58** | 44 |
| projected read, **no `limit(1)`**, result only presence-tested | **280** | 178 |
| probe whose `where` names no org column | **216** | 131 |

Two honesty notes. The 216 is a **candidate list, not a defect list** — platform
tables, `@Public()` e-sign routes and user-level probes legitimately have no org
column, and RLS is live (899 relations), so a missing explicit predicate is
defence-in-depth rather than automatically a hole. And the ticket's prior "10
count-for-existence sites" does not reproduce: I measure **1**.

### Closed this pass

Four sites that were simultaneously a box-1 N+1 **and** a box-2 missing tenant
predicate — an update keyed on a surrogate id alone, discarding the authorization
the preceding read performed:

- `e-sign/sign-public.ts` `adopt()` and `complete()` — `UPDATE sign_fields WHERE id = ?`,
  once per row, **on an unauthenticated public route**. Both now collapse to ONE
  UPDATE whose WHERE carries `org_id + recipient_id + field_type + completed_at IS NULL`,
  which also deletes the `findMany` that existed only to drive the loop.
  (`sign_fields.org_id` is NOT NULL and `(org_id, id)` is unique, so the composite
  FKs there are genuinely enforced — checked, not assumed.)
- `cron/cron-hr.ts` certifications and documents — gained `org_id`. The third
  sweep writes `users`, which has **no** `org_id` column, so that one stays keyed
  on id and says so.

---

## 6. Box 3 — bulk write

Of the 106 remaining growing sites, **39 are per-row writes** (`insert`/`update`/`delete`).

Converted this pass: `surveys/survey-builder.reorder` (one UPDATE per section and
per question → two `bulkUpdateFromValues`), plus the uniform-SET loops in
`cron-hr` (→ one `inArray` UPDATE) and two outbox fan-outs (→ `OutboxWriter.emitMany`).

**Not converted, deliberately:** `workflows/engine/workflow-runner` dead-lettering.
Its per-row `duration_ms` is computed from the **target** row
(`EXTRACT(EPOCH FROM (now() - started_at))`), which `bulkUpdateFromValues` cannot
express, and it fires at most 50 times per sweep. Recorded rather than forced.

---

## 7. The composite-FK-NULL trap — checked, and it found something

A composite FK is not enforced when any of its columns is NULL (Postgres
MATCH SIMPLE). Scanned every composite FK in `src/db/schema`, **scoped per table**
(a first version keyed nullability on the bare column name per *file*, so
`hr/documents.ts`'s eight tables collapsed onto one — that version's numbers were
wrong and are discarded):

- **827 composite FKs; 452 have at least one nullable referencing column**, so
  they are unenforced whenever that column is NULL.
- **14 have a nullable `org_id`** — the sharp case, because the tenant half of the
  key then buys nothing.

**But the declaration has drifted from the database.** Checked read-only against
`scratch_perf_seed` (at head, RLS live): all ten sampled tables have `org_id`
**NOT NULL** in the live schema. So the FKs *are* enforced in production today, and
what exists is a **declared-vs-live drift**: the Drizzle type is `string | null`,
application code is written against a nullable org, and any fresh bootstrap from
the declaration would create a nullable column and silently unenforce 14 composite
FKs at once.

`audit_logs` is the one deliberate case — its `org_id` is genuinely nullable for
platform events, and it already defends the trap with two CHECK constraints,
including `actor_membership_id IS NULL OR org_id IS NOT NULL`. That is the pattern
the other 13 lack.

**ROUTED, not fixed** — this is schema/migration territory. Adding `.notNull()` to
match the live database is a pure declaration alignment with no migration, but it
narrows `string | null → string` across the codebase and could surface typecheck
errors in another lane's in-flight files mid-release.

---

## 8. Gates

| command | exit | number |
|---|---|---|
| `pnpm typecheck` | **0** | 0 errors |
| `pnpm check:spec-typecheck` | **0** | passed (it caught an `as` cast I had written; removed, not widened) |
| `pnpm check:db-call-count` | **0** | 146 detected, ACTIONABLE 39 → **35 files / 57 sites** |
| `pnpm check:db-call-count:self-test` | **0** | 44 checks (was 37) |
| `pnpm check:n1-growing-loops` | **0** | **106 growing / ratchet 106**, 5,064 loop nodes |
| `pnpm check:n1-growing-loops:self-test` | **0** | 13 checks |
| focused jest (18 modules touched) | **0** | 388 suites, **3,387 passed**, 0 failed |

**`pnpm check:mock-surface` is RED — and it is not mine.** One phantom
`delByPrefix()` in `organization-custom-domains-404.spec.ts`, from another lane's
commit `142db50b` today. Proved pre-existing: it fails identically on a clean
`git archive HEAD` tree.

---

## 9. Nine specs moved onto the batched mechanism, not weakened

Batching changed the mechanism, so specs pinning the per-row shape failed. Seven
needed only the new methods on hand-rolled `CacheService` stubs — which are
`as unknown as CacheService` casts, so adding a method to the real class compiles
and *then* explodes at runtime. Four assertions genuinely described per-row
behaviour and were rewritten to describe batched behaviour **while keeping the
property they existed for** — e.g. `kb-page-tree`'s empty case now asserts the
event *list* is empty rather than that no call happened, which is the property;
and `entitlements` derives its expected keys from the fixture instead of
hardcoding names that were wrong.

---

## 10. Left open, with owners

| id | what | blocker | owner |
|---|---|---|---|
| **B1-106** | 106 growing-loop sites remain, ratcheted. 70 were read and have a named batched form. | effort, per-module | per-module owners |
| **B2-280** | 280 projected reads with no `limit(1)` used only for presence; 58 `findFirst` with no projection; 216 untenanted probes (candidate list, not defect list) | per-module territory | per-module owners |
| **B3-39** | 39 per-row writes inside growing loops | effort | per-module owners |
| **FK-NULL** | 13 tables declare a nullable `org_id` the live DB has as NOT NULL; 452 composite FKs unenforced-when-NULL | **schema/migration territory**; declaration↔DB drift | migration owner |
| **MOCK** | `check:mock-surface` red on a phantom `delByPrefix()` | another lane's commit `142db50b` | organization module owner |
| **WF-DLQ** | `workflow-runner` dead-letter stays per-row | `duration_ms` is computed from the target row; ≤50/sweep | workflows owner |

## 11. Where I am relying on inference rather than proof

- **No performance measurement.** The machine was loaded with concurrent agent
  builds, so buffer/statement counts would have been worthless. Every claim here
  is about **statement counts derived from the code**, not measured latency. The
  cache fan-out numbers (500 / 10,000) are the `.limit()` values in the driving
  reads, not observed traffic.
- **The 216 untenanted probes are not individually adjudicated.** I read the
  shape, not all 216 sites.
- **The 70 REAL-N1 verdicts** come from four parallel readers opening each
  enclosing method. I spot-checked and personally fixed 18 of them; I did not
  personally re-read the other 52.
