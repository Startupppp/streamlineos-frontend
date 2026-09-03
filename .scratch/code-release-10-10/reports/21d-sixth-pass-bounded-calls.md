# 21d — Sixth pass on the efficient database-call contract

**Ticket:** `issues/21-efficient-database-call-contract.md`, the three boxes that were open at line 50
(batched lookups / no call in a growing loop), line 191 (existence and authorization probes) and line 265
(bulk writes).

**Outcome, stated first: NONE of the three boxes closed, and none of them honestly can.** 102 growing-loop
call sites remain, 36 of them per-row writes, and box 2's dominant shape is a 180-site candidate list this
pass did not adjudicate. What this pass did is fix six real defects with measured or executed proofs, lower
one ratchet, and replace two inherited numbers with numbers I measured myself.

---

## 0. The pre-state, measured rather than inherited

The ticket said `check:db-call-count` stood at **ACTIONABLE 40 -> 39 files / 64 call sites**. That was already
stale — other lanes had committed since. Rather than quote it, the pre-state was measured on a hermetic tree:

```
git archive 09c01de8 | tar -x -C /tmp/t21-bite-0kAu     # the commit before this pass's first
ln -s <repo>/node_modules /tmp/t21-bite-0kAu/node_modules
cd /tmp/t21-bite-0kAu && node src/scripts/check-db-call-count.mjs      # exit 0
cd /tmp/t21-bite-0kAu && node src/scripts/check-n1-growing-loops.mjs   # exit 0
```

| | pre-state (`09c01de8`, hermetic) | head after this pass |
|---|---|---|
| `check:n1-growing-loops` GROWING | **106 sites / 78 files** | **102 sites / 76 files** |
| `check:n1-growing-loops` ratchet | 106 | **102** (lowered in the same commit) |
| `check:db-call-count` ACTIONABLE | **35 files / 57 call sites** | **34 files / 54 call sites** |
| `check:db-call-count` ACTIONABLE-UNDETECTED | 3 (ratchet 3) | 3 (ratchet 3) |
| per-row write sites among the growing loops | 39 (fifth pass) | **36** |
| exit code, both gates | 0 | 0 |

Nothing was ever planted in the shared working tree. Every defect-injection ran inside `/tmp/t21-bite-0kAu`.

---

## 1. The dashboard lead — verified, and the interesting number is not the buffer count

**The claim I was handed:** `dashboard-personal.service.ts` has two blocking awaits before its `Promise.all`,
and `dashboard-project.service.ts:84` re-reads the identical membership row.

**Verified true, and slightly larger than described.** `organization_members WHERE (org_id, user_id)` is read
at `dashboard-personal.service.ts:55` and again at `dashboard-project.service.ts:84` inside `getMyIssues`,
which the personal dashboard delegates to — two identical reads per `/dashboard/personal` request. The same
row is read a third and fourth time by `getRecentProjects:57` and `getRecentActivity:199`, but those are
*separate routes*, so they are not a duplicate within one request; the intra-request duplication is the pair.
`resolvePersonalDashboardModules` at `:45` and the membership read at `:55` were awaited nose to tail with no
dependency between them.

**Why no test caught it.** `dashboard-section-isolation.spec.ts` has a case literally titled
*"CRITERION 6 — membership resolved once"* — and it constructs `projectService` as
`{ getMyIssues: jest.fn() }`. The second read happened inside a double. The criterion was true of the code the
spec could see and false of the code that runs.

**Measured**, on `scratch_perf_seed` (journal head 665/665) as `streamline_app` (`rolbypassrls = f`,
`rolsuper = f`) with `SET app.organization_id`, RLS live:

```
Limit  Buffers: shared hit=1 read=2
  ->  Index Scan using uniq_org_members_org_user on organization_members
        Filter: ((org_id = current_org_id_or_null()) OR (user_id = current_user_id_or_null()))
```

**3 shared buffers on every one of the four tenants** — 89.93% (500 members), 9.00% (60), 0.90% (8),
0.18% (5). The saving is one statement and 3 buffers per personal-dashboard load.

**The buffer number is small and I am not going to dress it up.** The number that is not small is the ratio:
cold **Planning Time 7.816 ms against Execution Time 0.584 ms**; warm, 0.043 ms against 0.012 ms. For a probe
of this shape the cost of a round trip is the plan and the network, not the pages — which is exactly the case
a block-count ceiling cannot see, and worth recording next to the brief's warning that a buffer ceiling misses
a sequential scan. It misses this too, from the other end.

**Fix.** The two awaits now share one `Promise.all`, and `getMyIssues` takes the already-resolved membership
id: `undefined` means "resolve it yourself" (so `GET /dashboard/my-issues` is byte-for-byte unchanged), `null`
means "resolved, and there is none", a number means use it. The criterion-6 case now asserts the resolved id
is what gets delegated, and three new cases on the *real* service assert a supplied id issues no membership
read, that `null` returns `[]` without touching `tickets`, and that omitting it still resolves.

Commit `c0f79cef`.

---

## 2. The webhooks lead — verified, and it was three defects, not one

`webhooks-dispatch.service.ts` `run()`:

1. `findMany` with **no projection and no bound** — every column of every active endpoint for the org,
   including `secret` and `description`.
2. `await Promise.allSettled(active.map((e) => this.deliver(...)))` — **unbounded concurrency**. Each
   `deliver` can hold a socket for `WEBHOOK_MAX_ATTEMPTS (5) x WEBHOOK_TIMEOUT_MS (10 s)` = 50 s, so an org
   with N endpoints opens N simultaneous sockets for up to 50 s each.
3. Each `deliver` wrote **its own `webhook_logs` INSERT** — one write per row, and invisible to
   `check:db-call-count` because the per-row work is a service call (the `ACTIONABLE-UNDETECTED` class).

**Fix.** Delivery walks the endpoints in waves of `WEBHOOK_DISPATCH_CHUNK = 8`. One wave is *both* the socket
cap and the insert payload, and it flushes one multi-row insert — flushing per wave rather than once at the
end keeps the crash window at one chunk instead of the whole fan-out. `deliver()` now returns its log row
rather than writing it, so `retryLog` writes its own single row and the batching lives at the fan-out. The
endpoint read is projected to `{id, url, secret, events}`.

Three cases pin it: 20 endpoints produce **3 inserts of 8/8/4** with all 20 rows present and in order; the
*measured* peak of concurrent outbound calls never exceeds the chunk (and is greater than 1, so the test
cannot pass by accident on a serial implementation); and the projection is exactly those four columns.

Commit `60a70e94`.

---

## 3. The other four fixes

**`sessions.service.ts` `tombstone()`** — two Redis commands per session id through an unbounded
`Promise.allSettled`. Revoking 500 sessions cost **1,000 round trips; it now costs 4** — one `MSET` plus one
variadic `ZADD` per `REVOCATION_WRITE_CHUNK = 256` ids. The chunk exists because the Upstash REST transport
puts the whole command in one request body, so an unbounded id list is an unbounded payload, and a failed
chunk loses only its own tombstones. A side effect worth naming: `MSET` **cannot** carry a TTL, so the
property the old code defended with a comment ("volatile-lru only evicts keys that have one, and an evicted
tombstone silently un-revokes a session") is now structural. Repeated ids are collapsed before writing.
Commit `96674525`.

**`payroll/setup/policy-mutation.service.ts`** — one INSERT per salary component inside the activation
transaction, over a **caller-controlled** array (`components` is a tenant-owned template's `defaultComponents`
JSON). Now one multi-row INSERT per `SALARY_COMPONENT_INSERT_CHUNK = 200`. Commit `874a8bec`.

**`organization/core/{org-lifecycle,org-purge}.service.ts`** — each carried a **byte-identical** private
`repairLastActiveOrgIds` issuing **two UPDATEs per member**; archiving a 500-member organisation cost 1,000
statements inside the transaction that also runs the purge. The two copies are now one shared helper: the
`users` half through `bulkUpdateFromValues` (the new value differs per row), the
`account_organization_index` half as one `inArray` UPDATE per 500. Commit `48821fe6`.

**`cron/cron-projects.service.ts`** — box 2. `spawnDueRecurringTickets` reads its due templates under
`eq(tickets.orgId, orgId)` and wrote back with `eq(tickets.id, template.id)` **alone, twice**. Both now carry
the organisation. Commit `448df0ac`.

---

## 4. Two things executed against a database rather than reasoned about

`tsc` cannot see inside a SQL string and cannot see Postgres' conflict semantics at all. Both of the
assumptions this pass depended on were run on `scratch_t21f` (a fresh scratch database created for this;
`scratch_perf_seed` was read-only throughout and `DATABASE_URL` was never touched).

**(a) Multi-row `ON CONFLICT ... DO NOTHING` with an intra-statement duplicate.** The per-row loop it replaces
skipped rows that conflicted with an existing row and, on a repeated `code`, kept the first. A multi-row
statement had to do the same or the payroll conversion changes behaviour:

```sql
-- pre-existing: ('o1','BASIC','pre-existing')
INSERT INTO sc (org_id, code, name) VALUES
  ('o1','BASIC','from-batch'),
  ('o1','HRA','hra-1'),
  ('o1','HRA','hra-2-duplicate-in-same-statement'),
  ('o1','DA','da-1')
ON CONFLICT (org_id, code) DO NOTHING;
-- INSERT 0 2
-- BASIC|pre-existing   DA|da-1   HRA|hra-1
```

Identical to the loop. (Only `DO UPDATE` raises *"cannot affect row a second time"* — which is precisely why
the fifth pass's survey-reorder conversion needed an explicit de-duplication step and this one does not.)

**(b) The `bulkUpdateFromValues` statement whose org column is not `org_id`.** `users` has no `org_id`. The
tenant correlation on that table is `last_active_org_id`, which is *also* the compare-and-set the per-row form
used to avoid stamping a member who had already moved on. Passing it as `orgColumn` makes one predicate carry
both meanings — a claim worth executing rather than believing. The statement was rendered through the real
helper and run verbatim:

```
UPDATE "users" SET "last_active_org_id" = v."last_active_org_id"
FROM (VALUES ($1::text,$2::text),($3::text,$4::text),($5::text,$6::text)) AS v("id","last_active_org_id")
WHERE "users"."id" = v."id" AND "users"."last_active_org_id" = $7
RETURNING "users"."id" AS "key"

params: u1, next-org-a, u2, NULL, u3, next-org-c, org-being-archived
-> u1, u2 ; UPDATE 2

u1|next-org-a          <- moved
u2|<NULL>              <- real NULL written, not the string
u3|org-somewhere-else  <- already pointed elsewhere: NOT stamped (the CAS held)
u4|org-being-archived  <- not in the replacement set: untouched
```

---

## 5. Bite proof — the specs fail on the pre-fix code

Every proof in this report is a spec that fails without the fix. Verified by copying the post-fix specs into
`/tmp/t21-bite-0kAu` (the `git archive 09c01de8` tree) **over the pre-fix services** and running jest there:

```
Test Suites: 4 failed, 4 total
Tests:       15 failed, 22 passed, 37 total
```

and separately, with the pre-fix per-row body planted as the org helper in the temp tree:

```
Tests: 3 failed, 1 passed, 4 total
```

The cases that pass on both trees are the unchanged paths — `getMyIssues` resolving the membership when the
argument is omitted, zero salary components producing no statement, an empty replacement map issuing nothing.
They should pass on both, and the fact that they do is what distinguishes these from a spec that merely
restates the implementation.

Four of the 15 failures are pre-existing `webhooks-dispatch-seam` cases: that spec's `db` double changed from
`query.webhookEndpoints.findMany` to `select().from().where()` because the service did, so on the pre-fix tree
those cases fail for the double, not for the assertion. Stated rather than counted as a win.

---

## 6. Box 2 — what I refused to claim

The dominant shape the ticket names is "an org-scoped read followed by a write keyed on the id alone". I
re-scanned it myself rather than inheriting the number: **178 single-predicate
`UPDATE <table> ... WHERE eq(<table>.id, x)` sites outside CRM and inventory** at head, with no second
predicate in the same `WHERE` (180 before the `cron-projects` fix in §3 removed two).

**That is a candidate list, not a defect list**, and reporting it as a finding would be the mistake this
release keeps making. A large share of it is legitimate:

- `users`, `organizations`, and platform tables have no `org_id` to add;
- **16 of the 178 are `notification-delivery-worker.service.ts` alone** — a deliberately cross-org queue
  worker claiming its own rows by id under a status compare-and-set — and 9 more are `email-outbox.service.ts`,
  a per-row send-state machine of the same kind;
- some sit inside `withIdentity` / `runInTenantTransaction` where the id *is* the whole key.

Adjudicating 178 sites one at a time is the work this box needs, and it is not done. One pair was read and
fixed (`cron-projects`, §3) because I had read its surrounding function for box 1 and could see the org-scoped
read three lines above.

I also could not reproduce the fifth pass's **"count-for-existence: 1"** cheaply: a text scan finds **571**
`count()` uses under `src/modules`, and only an AST pass that follows each result to its use site can say
which are presence-only. That number, and the fifth pass's 58 fetch-for-existence / 280 unlimited projected
reads / 216 org-less probes, stand **as the fifth pass measured them** — attributed to it, not re-asserted by
me.

---

## 7. Recorded rather than forced

**`e-sign/sign-envelope-sweeps.service.ts` `runExpirationSweep` — ACTIONABLE, with a hazard that makes the
obvious fix wrong.** It issues two *uniform* UPDATEs per expiring envelope (`sign_recipients` by `envelope_id`
with a `notInArray` status guard; `sign_envelopes` by `id`), and both are trivially `inArray`-able. But
`this.audit.record({ eventType: "envelope_expired" })` sits between them and the next envelope's writes.
Hoisting the two UPDATEs above the loop **widens an existing lost-audit window from one envelope to the whole
batch**: a crash after the batched status flip but part-way through the audits leaves every envelope
`expired`, so the retry's `findMany` no longer selects them and the missing audit rows are lost *permanently*.

The batched form is:

```ts
for (let i = 0; i < envelopeIds.length; i += EXPIRY_SWEEP_CHUNK) {
  const chunk = envelopeIds.slice(i, i + EXPIRY_SWEEP_CHUNK);
  await this.db.update(signRecipients).set({ status: "expired", tokenRevokedAt: now })
    .where(and(eq(signRecipients.orgId, orgId), inArray(signRecipients.envelopeId, chunk),
               notInArray(signRecipients.status, ["completed", "declined", "delegated"])));
  await this.db.update(signEnvelopes).set({ status: "expired" })
    .where(and(eq(signEnvelopes.orgId, orgId), inArray(signEnvelopes.id, chunk)));
}
```

…and it is only safe alongside a `SignAuditService.recordMany`, or by auditing *before* the flip and accepting
duplicate `envelope_expired` rows on a retry (a duplicate audit row beats a lost one). Choosing between those
is e-sign's call. **Owner: e-sign module owner.** Its `findMany` at `:181` is also unbounded and would want the
same keyset treatment.

**`settings/settings.service.ts` `getSectionProvenance` — NOT changed, and the reason is a measurement I could
not take.** It runs one `SELECT ... FROM audit_logs LEFT JOIN users WHERE action LIKE '<section>.%' ORDER BY
created_at DESC LIMIT 1` **per section** (six, enum-capped). Collapsing it to one statement is the obvious
move, and the obvious form is a `LATERAL` over the section list — but `LIKE s.section || '.%'` is neither a
`Const` nor a `Param`, so Postgres' prefix-range optimisation on `idx_audit_logs_org_action` **does not
apply**, and the batched form could plausibly be slower than the six it replaces. The alternative
(`DISTINCT ON (split_part(action,'.',1))` over a `BitmapOr` of six constant `LIKE`s) keeps the index ranges but
has to sort every matching row in the organisation. **`audit_logs` has 0 rows in `scratch_perf_seed`**, so
neither shape can be measured on the seed available, and shipping an unmeasured rewrite of a query against a
partitioned high-volume table is how a "batching" change becomes a regression. Left alone, with the reasoning
written down. It needs a seeded `audit_logs`.

---

## 8. Gates and commands, with real exit codes

| command | exit | number |
|---|---|---|
| `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` | **0** | 0 lines of output |
| `pnpm check:spec-typecheck` | **0** | — |
| `pnpm check:n1-growing-loops` | **0** | GROWING 102 / 76 files, ratchet 102 |
| `pnpm check:n1-growing-loops:self-test` | **0** | 13 checks |
| `pnpm check:db-call-count` | **0** | ACTIONABLE 34 files / 54 sites |
| `pnpm check:db-call-count:self-test` | **0** | 44 checks |
| `pnpm check:type-assertions` | **0** | 1210 under the zero-growth ceiling |
| `pnpm check:scope-application` | **0** | — |
| `pnpm check:transaction-callbacks` | **0** | — |
| `pnpm check:vacuous-assertions` | **0** | — |
| `pnpm check:mock-surface` | **0** | — |
| `pnpm check:kebab-case` | **0** | — |
| `pnpm check:import-direction` | **0** | — |
| `jest --maxWorkers=2 --testPathPattern="(dashboard\|webhooks\|sessions\|payroll/setup\|organization/core\|cron\|e-sign)"` | 1 | **1039 of 1040 pass**; see below |

The one failing test is `src/modules/inventory/webhooks/webhooks-tenant-isolation.spec.ts` — an **inventory**
suite (out of release scope) that fails on a 5,000 ms jest timeout under worker contention and **passes
`--runInBand`, exit 0**. It exercises `inventory/webhooks/webhooks.service.ts`, which this pass never touched.

**Four gates are RED at head and NONE of them is this pass's.** Each was run on the hermetic `09c01de8` tree
and was already failing there:

| gate | head | pre-state `09c01de8` | whose |
|---|---|---|---|
| `check:record-access` | 1 | **1** | `hr-automation-engine.service.ts:304`, `kb-indexing.service.ts:294`, `party-tenant.ts:7` — none mine |
| `check:cache-invalidation` | 1 | **1** | one MEDIUM in `access/entitlements.service.ts:setModuleEnabled` — not mine |
| `check:file-sizes` | 1 | 2 (INCONCLUSIVE — the §7 registry lives in the frontend repo and is unreachable from a temp tree) | 9 files over 500; **none of mine**, and every file this pass touched is under 500 (largest 413, and both org services got *smaller*) |
| `check:tenant-relationships` | 2 | 1 | head connects to `scratch_boot_a` via `.env` and reports *"TARGET IS MID-BOOTSTRAP — 573 of 672 journal entries"*; the temp tree has no `.env` so it took the schema-file path. Different modes, not a regression. This pass touched **zero** files under `src/db/schema/`. |

---

## 9. Commits (backend, `main`)

| sha | what |
|---|---|
| `c0f79cef` | `perf(dashboard)` — resolve the caller's membership once per personal dashboard |
| `60a70e94` | `perf(webhooks)` — bound the dispatch fan-out and batch its delivery logs |
| `96674525` | `perf(sessions)` — revocation tombstones one chunk at a time |
| `874a8bec` | `perf(payroll)` — one salary-component insert per chunk |
| `48821fe6` | `perf(organization)` — move every member off an archived org in two statements |
| `450978e8` | `chore(gates)` — ratchet 106 -> 102, three loops re-verdicted `BATCHED` |
| `448df0ac` | `fix(cron)` — keep the organisation on both recurrence advances |

## 10. Databases used

`scratch_perf_seed` — **read only**, at journal head 665/665, measured as `streamline_app`
(`rolbypassrls = f`) with the tenant GUC set, across all four application tenants.
`scratch_t21f` — created by this pass for the two write experiments in §4.
`DATABASE_URL` was never read or written. No existing `scratch_*` database was dropped.
