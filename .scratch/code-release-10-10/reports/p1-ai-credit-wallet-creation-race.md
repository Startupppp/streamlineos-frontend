# P1 — an organisation's first concurrent AI call returned 500, and the recovery could never fire

Territory: backend `src/modules/billing/core/ai-credits-reservation.service.ts`,
`src/modules/ai/core/gateway/ai-gateway-stream.helper.ts` and their specs.

Both halves handed to me were verified in source before any edit. Both were correct.
A third half was found while proving them, and it is the reason the recovery arm was
dead even on the one call path that could have reached it.

---

## The defect, verified

### Half 1 — the lock that locks nothing

`ai-credits-reservation.service.ts` (pre-fix, lines 48-72):

```ts
let [wallet] = await tx.select().from(orgAiCredits)
  .where(eq(orgAiCredits.orgId, orgId)).for("update");
if (!wallet) {
  [wallet] = await tx.insert(orgAiCredits).values({ orgId, ... }).returning();
  await tx.insert(aiCreditTransactions).values({ ... type: "PLAN_GRANT" ... });
}
```

`SELECT … FOR UPDATE` takes a row lock. There is no row on an organisation's first AI
call, so there is nothing to lock and nothing is serialised. Two concurrent callers both
see `!wallet`, both INSERT, and the loser hits
`org_ai_credits_org_id_unique UNIQUE (org_id)` (confirmed live in `pg_constraint`). The
insert carried no `onConflict` clause.

### Half 2 — the recovery arm can never fire

`catch (err) { if (isUniqueViolation(err) && idempotencyKey) … }`.

**No production call site passes an `idempotencyKey`.** All five, verified:

| Call site | passes a key? |
|---|---|
| `ai/core/gateway/ai-gateway-stream.helper.ts:116` | no |
| `ai/core/gateway/ai-gateway-credit.helper.ts:118` | no |
| `ai/core/gateway/ai-gateway-embed.helper.ts:110` | no |
| `ai/core/services/chat-assistant.service.ts:122` | no |
| `ai/core/services/kb-rag.service.ts:164` | no |

So the guard was false for every metered AI route and the raw 23505 escaped as a 500.

### Half 3 — found while proving it: `isUniqueViolation` is false for every real error

```ts
const code: unknown = Reflect.get(err, "code");   // pre-fix
return code === "23505";
```

**drizzle-orm 0.45.2 wraps every driver error in `DrizzleQueryError`** — verified at
`node_modules/drizzle-orm/errors.js:10-21` — which has `query`, `params` and `cause` and
**no `code` of its own**. The `PostgresError` carrying `code: "23505"` sits on `.cause`
(probed directly against Postgres: `name: PostgresError code: 23505`). The check was
therefore false for every error a real database can produce.

Consequence beyond the wallet: two concurrent reserves carrying the **same**
`idempotencyKey` both miss the `findByIdempotencyKey` pre-check, both insert, and the
loser hits `uq_ai_credit_res_org_idem_key` — a 500 the recovery was written to absorb.
Proved: test 5 below fails with the wallet fix in place but this one reverted.

---

## The fix

Dependence on `idempotencyKey` is gone. The race is on wallet **creation**, so creation is
now serialised by the database:

```ts
const [created] = await tx.insert(orgAiCredits)
  .values({ orgId, balance: TRIAL_GRANT_MILLI, lifetimeGranted: TRIAL_GRANT_MILLI })
  .onConflictDoNothing({ target: orgAiCredits.orgId })
  .returning();

if (created) { /* winner only */ await tx.insert(aiCreditTransactions).values({ … PLAN_GRANT … }); return created; }

const [existing] = await tx.select().from(orgAiCredits)
  .where(eq(orgAiCredits.orgId, orgId)).for("update");   // now there IS a row to lock
```

`onConflictDoNothing().returning()` returns the row only to the transaction that created
it and an empty array to every other, which is what makes **the trial grant land exactly
once** — a loser that also wrote a `PLAN_GRANT` would hand out the free credits twice,
the same money bug pointed the other way. Under READ COMMITTED (the default here;
`withTenant` sets no isolation level) `DO NOTHING` waits on the winner's speculative
insertion and the loser's re-read then sees the committed row.

`isUniqueViolation` now walks the `cause` chain, which restores the idempotency-key
recovery for the separate race it was actually written for. The PLAN_GRANT insert is left
**without** an `onConflict` clause deliberately: if exactly-once ever regresses, the
partial unique index `uq_ai_credit_txns_plan_grant_ref` must raise, not swallow.

---

## Audit of the other `FOR UPDATE` calls in this file

A `FOR UPDATE` is only meaningful on a row that already exists. All six, post-fix line
numbers:

| Line | What it locks | Verdict |
|---|---|---|
| 116 | wallet, `ensureWallet` first read | **Safe now.** It is a probe; a missing row is handled by the `ON CONFLICT` below it, not by this lock. |
| 146 | wallet, `ensureWallet` loser re-read | **Safe.** Only reached when the insert conflicted, which under READ COMMITTED means a committed row exists. |
| 195 | reservation, `settle` | **Safe.** The id comes from a `reserve()` that committed the row. Absence is answered with `NotFoundException`, which is correct, not a lost update. Concurrent settles serialise on the row and the second returns on `status === "SETTLED"`. |
| 215 | wallet, `settle` | **Safe against the creation race** — a reservation can only exist if `reserve()` committed the wallet in the same transaction, and no code path deletes a wallet row (grepped: zero `delete(orgAiCredits)` in `src/`). See the separate defect below. |
| 281 | reservation, `release` | **Safe**, same reasoning as 195. |
| 294 | wallet, `release` | **Safe against the creation race**, same reasoning as 215. See below. |

### A second, smaller defect the audit turned up (fixed)

Lines 215 and 294 both read `const currentBalance = wallet?.balance ?? 0;`. A missing
wallet was therefore treated as a **zero balance**: the following
`UPDATE … WHERE org_id = …` matched no rows and did nothing, the reservation was still
marked `SETTLED`, and a `USAGE` ledger row was written carrying a `balanceAfter` that no
wallet reflects. That is a money path no-opping in silence. Both now raise a
`ConflictException` instead. Two tests cover it and both fail when the guard is reverted.

---

## Should streaming callers pass an `idempotencyKey`?

**No — and a retried stream cannot double-charge.** Not asserted, tested:
`ai-gateway-stream.helper.spec.ts`, "a retried turn reserves again and the abandoned one
is refunded, so no turn is charged twice" — the abandoned turn is released
(`stream_aborted_no_settle`), the retry takes a fresh reservation, and `settle` debits the
**measured** tokens rather than the reserve ceiling, so the abandoned turn costs nothing.
Every failure path in `run()` releases: setup throw, `finishReason` rejection, abort. A
process death between reserve and release strands the reservation only until
`sweepExpiredReservations` (15 min expiry) refunds it — a transient hold, not a charge.

A key would also be *wrong* on the one case it might seem to help: a client retrying after
a stream that actually completed has caused two provider calls, and both cost real money.

**Residual, recorded rather than claimed** (second new test in that spec): a `settle` that
throws is logged and the reservation is left `RESERVED`, so the expiry sweep refunds a turn
that did consume tokens. That **under**-charges. Releasing there instead would be the same
leak sooner. Fixing it properly needs a durable settlement retry (outbox), which is larger
than this hotfix. Not done.

---

## Proof

A mocked transaction cannot exhibit this race, and the repo's existing mocked coverage is
exactly why the defect survived: every `reserve` test in
`src/modules/billing/core/ai-credits-ledger.spec.ts` returns `[{ balance, orgId }]` from the
first `.for("update")`, so **the wallet-creation branch was never executed by any test**.
And `ai-credits-balance-after-invariant.spec.ts:226` asserts a 23505 recovery by throwing a
bare `{ code: "23505" }` — a shape drizzle 0.45 never produces.

New spec: `test/billing/ai-credits-reserve-race.seeded-e2e-spec.ts`, 8 cases, against a real
Postgres. The barrier is a third session holding `LOCK TABLE org_ai_credits IN EXCLUSIVE
MODE`, which conflicts with the `ROW SHARE` that `FOR UPDATE` takes; the lock is confirmed
granted before the reservations start and `pg_locks` is polled until every caller is
actually blocked, so the interleaving is forced rather than hoped for.

### Database measured

`scratch_money_race` — created for this ticket, local, 96 MB. Built from
`pg_dump -s scratch_perf_seed` (which is at head, 665/665), so **945 tables at head with
the real constraints**, zero rows, plus one fixture organisation. `DATABASE_URL` and every
`cornerstone_*` database were untouched; the spec additionally refuses any database whose
name does not contain `scratch` via `assertDisposableDatabase`.

### Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `jest --config ./jest-e2e-seeded.json --runInBand --testPathPattern="ai-credits-reserve-race"` (before the fix) | 1 | **3 failed / 3 passed of 6** |
| same, after the fix | **0** | **8 passed / 8** |
| `$HEAVY 2 -- jest --runInBand --testPathPattern="(ai-credits\|ai-gateway\|billing)"` | 0 | **49 suites, 618 tests passed** |
| `$HEAVY 2 -- pnpm typecheck` | **0** | 0 errors |
| `$HEAVY 2 -- pnpm check:spec-typecheck` | **0** | passed |
| `tsc --noEmit` over the new spec under the full strict `tsconfig.json` | **0** | 0 errors |
| `eslint` over the three changed files | **0** | 0 problems |

### Bite proofs — the tests fail without each half of the fix

| Reverted | Result |
|---|---|
| **A** — whole service to `HEAD` | 3 fail: two-concurrent, eight-concurrent, idempotency-key |
| **B** — `ensureWallet` kept, `isUniqueViolation` reverted to reading `code` off the outer error | 1 fails: idempotency-key |
| **C** — `ensureWallet` + `isUniqueViolation` kept, the `wallet?.balance ?? 0` guards reverted | 2 fail: settle-into-missing-wallet, refund-into-missing-wallet |

Each revert was applied to the working file and the fixed version restored immediately
after, verified with `diff -q`.

---

## Cross-territory findings — NOT fixed, not my file

All three are in `src/modules/billing/core/ai-credits.service.ts` and its spec.

1. **`getWallet` (lines 28-61) has the identical race and the identical dead recovery.**
   Read-then-insert with no `onConflict`, and the catch reads
   `(err as { code?: string }).code === "23505"` — same wrapper problem as half 3, so the
   recovery is unreachable and the loser 500s. (It also uses an `as` cast, banned by
   CLAUDE.md §6.) Fix: `.onConflictDoNothing({ target: orgAiCredits.orgId })` plus the
   cause-walking check.
2. **`setAutoTopUp` (lines 271-279): read-then-insert with no conflict handling and no
   recovery at all.** Two concurrent calls 500. Lower traffic, same shape.
3. **`ai-credits-balance-after-invariant.spec.ts:226** asserts the 23505 recovery by mocking
   `transaction` to reject with a bare `{ code: "23505" }`. It passes today and will keep
   passing after finding 1 is fixed or broken — it cannot bite.

`creditWallet` (line 132) already uses `onConflictDoUpdate({ target: orgAiCredits.orgId })`
and is the pattern the other two should follow.

## Not done

- `test/**` is typechecked by **no** repo gate: `tsconfig.json` includes only `src/**/*` and
  `evals/**/*`, so `check:spec-typecheck` never sees an e2e or seeded spec. I typechecked my
  new spec with a temporary config (exit 0) and removed it. The gap itself is unowned.
- The new spec is not wired into any CI job; it needs a `scratch_*` `DATABASE_URL`.
- Full backend jest, `test:e2e` and `test:e2e:seeded` suites: **not run.** Frontend: untouched.
