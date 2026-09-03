# 35e — the vacuity sweep (S13)

Ticket 35, the last open box: *"Zero silently skipped or quarantined tests, vacuous mocks,
swallowed promise failures, or baselines raised merely to turn a regression green."*

**Headline.** Seven tests were live, green, counted as coverage, and could not fail. **Four of them
named cross-tenant isolation in their own title.** One of them was concealing a production defect
that makes a GST tax-due notification unreachable on every day of the year. Separately, the purge
defect this release has already shipped once — *delete from the wrong place, verify the wrong place,
report success* — **was found reproduced at a second point in the same code path** and is fixed here.

All bite proving was done in hermetic `git archive HEAD` trees. No mutation was ever written to the
shared working tree; every mutation run ends with the tree re-archived from HEAD.

---

## 1. Method, and what it misses

An AST scanner (TypeScript 5.9.3 compiler API — `ts.createSourceFile`) over every
`*.spec.*` / `*.test.*` / `*.e2e-spec.ts` file in both repositories. Regex was tried first and
misclassified two shapes badly enough to invalidate the counts, so the AST is not decoration:

- `request(app.getHttpServer()).get("/x").expect(403)` resolves under a naive callee read to
  `request`, not `expect`, so **four permission-guard e2e tests were falsely reported as having no
  assertion.** Fixed by resolving the whole member chain.
- A test that asserts by `throw new Error(...)` inside a loop (`dashboard-section-registry.spec.ts`)
  has no `expect(` at all and was falsely reported twice.

Each detector was **bite-proved against planted fixtures before its output was believed**, including
the ones that measured zero — `FLOATING_ASSERT` reports 0 in both repositories, and 2 of 2 planted
floating assertions were caught, so that zero is a measurement and not blindness.

**What the method does NOT see, stated so the numbers are readable:**

- a test whose assertions are real but assert the wrong thing;
- an assertion on a mock the test itself invoked;
- `expect(x).toEqual(y)` where both sides come from the same broken source;
- anything asserted inside a helper the test calls;
- vacuity that only appears at runtime — which is why the two classes below were **executed**, not
  read.

One measurement error was made and corrected: an intermediate count of `BARE_THROW` read 291 rather
than 333 because the `be-head` scan tree had been mutated in place by an earlier probe. All figures
below are from trees re-archived from HEAD immediately before measuring.

---

## 2. Counts per class — both repos, at HEAD, before any fix

Backend `git archive HEAD src test` (1,914 test files) · frontend `git archive HEAD frontend`
(316 test files).

| Class | Backend | Frontend | Disposition |
|---|---|---|---|
| SUPPRESSED (`it.skip`/`todo`/`xit`/`describe.skip`) | 19 sites / 8 files | **0** | Already gated by `check:test-suppressions`; not this sweep's business |
| FOCUSED (`.only`/`fit`/`fdescribe`) | **0** | **0** | — |
| NO_ASSERTION | 11 sites / 7 files | **0** | 9 are registered `it.skip` placeholders; **2 live** |
| TAUTOLOGY | 9 sites / 7 files | **0** | **7 live and in scope** |
| COND_ASSERT (assertions behind a reach guard) | 9 sites / 9 files | 3 sites / 2 files | **executed to decide** — see §3 |
| FLOATING_ASSERT | **0** | **0** | Detector bite-proved; a real zero |
| BARE_THROW (`.toThrow()` with no argument) | 333 sites / 125 files | 18 / 10 | **Not gated** — see §5 |
| EMPTY_CATCH in test files | 44 / 30 | 14 / 6 | Production-side swept separately, §6 |
| WALLCLOCK (`new Date()` / `Date.now()` in a test) | 816 / 317 | 12 / 8 | Mostly legitimate; one real instance found via §3 |

**8 of the 9 backend COND_ASSERT sites were `*-tenant-isolation.spec.ts` files.** That is not a
scatter of unrelated shortcuts; it is one pattern applied across the isolation suite.

---

## 3. The two classes were EXECUTED, because reading them cannot decide it

### 3a. Conditional assertions — a throwing sentinel in the vacuous branch

For each of the 9 backend COND_ASSERT sites the vacuous fallback was replaced with
`throw new Error("VACUOUS_BRANCH_TAKEN")` (an explicit `else` added where there was none) and the
suite run. A failure means the guard is false at runtime and **the assertion never executes**.

```
baseline   : 11 suites / 50 tests pass, rc=0
mutated    : rc=1 — 2 failed / 47 passed
```

**2 of 9 are vacuous today.** The other 7 reach their guard and assert for real.

One **false positive of the sentinel design** was found and the detector corrected for it:
`src/common/rbac/module-registry.spec.ts:58` uses `if (…length === 0) { …; continue; }` and asserts
*after* the `if`, so the else path being taken is normal. The same correction removed
`lib/renderer/registry.test.ts:91` from the frontend set — a deliberate singleton case with real
assertions before the guard. Corrected rule: a bare `if (guard) { expect(…) }` is vacuous only when
nothing else in the body asserts. Backend 9 → 4 sites, frontend 3 → 2.

### 3b. Bare `.toThrow()` — is the refusal a refusal, or a crash?

Every bare `.toThrow()` in the isolation suite was rewritten to `.toThrow(TypeError)`. A test that
**still passes** was being satisfied by a `TypeError` — a mis-shaped double crashing the subject —
rather than by the refusal it claims to prove.

```
44 sites rewritten across 18 files
result: 42 tests went red, 2 stayed green
```

The 2: `inventory/inv-engine-misc-isolation-stock.spec.ts` (inventory, excluded) and
**`invoices/invoices-payment-tenant-isolation.spec.ts`** — a money path, in scope, fixed below.

---

## 4. What was found, and what it cost — ranked

### R1. `tax-compliance-tenant-isolation.spec.ts` — vacuous test hiding a dead production path

Both tests in the file were vacuous. Test 1 asserted org binding behind
`if (allWhereArgs.length > 0)` with `else { expect(true).toBe(true); }`; test 2 asserted
`expect(result).toBeInstanceOf(Array)`, which the early return satisfies.

The guard is false because **`checkTaxDue` returns `[]` before touching the database on every day of
the year.** It computes the GSTR-1/GSTR-3B deadlines in the month *after* the filing period, so the
soonest `daysUntilGstr1` the arithmetic can produce is 11 against `DUE_WARNING_DAYS = 5`. Simulated
over 730 consecutive days:

```
days simulated (2 years): 730
days where checkTaxDue reaches the database: 0
min daysUntilGstr1: 11   min daysUntilGstr3b: 20   threshold: 5
```

`cron-finance.service.ts:108` calls this sweep. **The GST due-date notification can never fire.**

Worse, the sibling spec `tax-compliance.service.spec.ts` stubs `daysBetween` to return `3` — a value
the real arithmetic cannot produce in this call context — in **every** test that exercises the
feature. Five green tests over an impossible value. That is the ticket's named
"mock whose shape the real dependency never produces", in a form nothing was looking for.

**Fixed (spec).** Three isolation tests now force the window open explicitly and assert org binding
on the read and the emit path unconditionally; a fourth characterises the unreachable window with
`jest.setSystemTime` pinned to the eve of a deadline.

> A note against myself: the first version of that fourth test was itself a wall-clock fixture — it
> passed against *both* the defective and the corrected arithmetic because today's date happened to
> sit outside the window either way. It only bit once the clock was pinned. Same class, caught in my
> own work.

**NOT fixed (production).** Moving a tax-notification deadline is a product decision, and finance is
under an active rewrite in another lane. **Owner: finance/accounting release owner.**

### R2. `org-setup-tenant-isolation.spec.ts` — a `TypeError` sold as a refusal

Both tests green, neither reaching an authorization decision. The db double answered
`select().from().where()`; `listSetupMemberships` calls `.leftJoin()`. `skipSetup` died on
`TypeError: tx.select(...).from(...).leftJoin is not a function`, and a bare `catch {}` swallowed it
under the comment **`// expected - missing membership`** — which is not what happened. The isolation
assertion then sat behind `if (memberWhere.mock.calls.length > 0)`, which was false. The second test
asserted `expect(true).toBe(true)`.

**Fixed.** A chain double that answers every builder method; unconditional assertions; and the real
property — the org comes from the membership table, never from the org id in the request context.

### R3. `storage-key-catalog.ts` — the shipped purge defect, reproduced

**This is production code and it is fixed here.**

`collectOrgFileKeys` and `collectUserFileKeys` each wrapped their `db.execute` in
`try { … } catch { }` and returned an empty collection on any failure.
`organization-purge-adapters.ts` calls `collectOrgFileKeys` twice and **already answers a throw with
`state: "FAILED"` at both sites** — `"Failed to collect org file keys"` (:113) and
`"Could not verify post-delete state"` (:271). Neither handler could ever run. The empty result
reached the success branches instead:

```
keys.length === 0       -> CONFIRMED "No object-storage keys found for this org; nothing to delete"
remaining.length === 0  -> CONFIRMED "All N object-storage key(s) deleted and verified absent"
```

A timed-out or failing query reported a **completed org purge**, and the post-delete verification
could not distinguish *"no objects remain"* from *"the check did not run"* — while every customer
object stayed in the bucket. This is a GDPR erasure path.

**Fixed**, plus two tests that pin the propagation.

### R4. `invoices-payment-tenant-isolation.spec.ts` — a control asserting the opposite of its name

The same-tenant control, named *"proceeds for invoice in the owning org"*, asserted
`.rejects.toThrow()` with no argument while `posting`/`rate`/`fx` were `{}`. It passed on
`TypeError: this.posting.seedChartOfAccountsForOrg is not a function`. The write path — including
the in-transaction invoice lock — was never executed, so removing the org predicate from that lock
would not have moved it.

**Fixed.** The control now records a payment; a third test asserts **every** org predicate
individually, inside the transaction as well as outside, because one unbound predicate among bound
siblings is invisible to a flattened check.

### R5–R7. Three more, same class

- `calendar-conflict.service.spec.ts` — the isolation test called the service and ended. **No
  assertion of any kind.**
- `notification-time-sweeps-tenant-isolation.spec.ts` — asserted
  `expect(wheres.length).toBeGreaterThanOrEqual(0)`, true of every array, with the real check behind
  a reach guard and a vacuous `else`. It also left `forEachOrg` real, so **the per-org callback never
  ran** and the only predicate recorded was the org-agnostic enumeration.
- `chat-saved-departed-actor.spec.ts` — *"cascade deletes the row (design proof)"* asserted
  `expect(true).toBe(true)`. The claim is checkable and now is: the FK's `onDelete` and both column
  lists are read off the table config.

### R8. Four contract notes converted

`prd-e2e-journey.spec.ts` scenarios 5 and 6 and the workflows DataScope test each named a specific
index or catalog flag and asserted `expect(true).toBe(true)`. All three now read the real
declaration.

---

## 5. Bite proofs — every fix, both directions

Each row: the mutation, the new spec's result, and **the same mutation against the HEAD spec.**

| Fix | Planted mutation | New spec | HEAD spec |
|---|---|---|---|
| org-setup | `resolveExistingSetupTarget` returns `u.orgId` instead of `active.orgId` | **1 failed / 2 passed, rc=1** | 2 passed, **rc=0** |
| tax-compliance | org predicate dropped from both liability queries | **1 failed / 3 passed, rc=1** | 2 passed, **rc=0** |
| tax-compliance | due dates moved to the current month (the defect *fixed*) | **1 failed / 3 passed, rc=1** | n/a |
| invoices-payment | `eq(invoices.orgId, orgId)` dropped from the in-tx `for update` lock | **1 failed / 2 passed, rc=1**, naming `predicate #0 does not bind the org` | 2 passed, **rc=0** |
| storage purge | the empty catches restored (i.e. HEAD) | **2 failed / 11 passed, rc=1** | n/a |
| calendar + sweeps + chat | drop `eq(calendarEvents.orgId,…)`; drop `eq(supportTickets.orgId,…)`; remove `.onDelete("cascade")` | **3 failed / 15 passed, rc=1** | 18 passed, **rc=0** |
| payroll 5 & 6 | allocation index demoted to a plain index; salary-profile index loses `effective_from` | **2 failed / 11 passed, rc=1** | 13 passed, **rc=0** |
| workflows | `workflows:workflows:view` made `scopable` | **1 failed / 14 passed, rc=1** | 15 passed, **rc=0** |

Every HEAD spec passed the mutation that its replacement catches. That is the box in one table.

---

## 6. The new gate — `check:vacuous-assertions`

Fixing 12 tests does not keep the class out. `src/scripts/check-vacuous-assertions.mjs` gates it.

Classes: `NO_ASSERTION`, `TAUTOLOGY`, `COND_ASSERT`, `FLOATING_ASSERT`, `FOCUSED`. Suppressed tests
are excluded outright so this gate and `check:test-suppressions` cannot absorb each other's debt.
Three vacuity floors exit **2 INCONCLUSIVE** rather than reporting a clean tree.

```
pnpm check:vacuous-assertions        EXIT=0
  1,921 spec files · 14,773 test callbacks · 55,380 expect() calls
  no_assertion 1 · tautology 2 · cond_assert 1 · floating_assert 0 · focused 0   (registered 4)
pnpm check:vacuous-assertions:self-test   EXIT=0   16 passed, 0 failed
```

Bite-proved six ways in a hermetic tree:

| Mutation | Exit | Message |
|---|---|---|
| unregistered planted COND_ASSERT | **1** | names the file:line and "1 above the ratchet of 1" |
| the pre-fix `org-setup-tenant-isolation.spec.ts` restored | **1** | names its COND_ASSERT at :99 *and* its TAUTOLOGY at :113 |
| walker neutered | **2** | `INCONCLUSIVE — walked 0 spec files, below the floor of 1500` |
| `expect()` matcher neutered | **2** | `INCONCLUSIVE — saw 0 expect() calls, below the floor of 20000` |
| a stale registration | **1** | "no longer match anything — remove them" |
| a reason under 40 characters | **1** | "Registered entry has no usable reason" |

The self-test's 16 assertions include the three shapes that fooled the regex prototype, asserted
**not** caught: a supertest `.expect(403)` chain, a `throw`-as-assertion body, and a guard with real
assertions outside the `if`.

Wired into `.github/workflows/ci.yml` beside `check:test-suppressions`, with
`if: ${{ !cancelled() }}`.

---

## 7. Baselines and ratchets

**2,230 numeric baselines** enumerated across both repos (JSON baseline files and in-script
constants), each traced to the commit that last moved its value.
**RAISED-TO-ABSORB 3 · RAISED-WITH-CORPUS-CHANGE 8 · LOWERED ~31 · INITIAL ~2,188.**

The one that matters, re-measured directly rather than taken on report:

```
node src/scripts/check-over-300.mjs   EXIT=1
check-over-300: 403 files exceed 300 lines — 9 above baseline of 394.
```

`c3f0b73d` raised that `BASELINE` to 394 when the count was 395 — sized to that day's breach with no
headroom — and it has drifted out again. Already routed on ticket 35 to release management; **not
closed, and the baseline was deliberately not moved again.**

**A new blind spot in baseline auditing, worth recording because it defeats the obvious method:**
`c0daca5b` lowered `UNDETECTED_CLAIM_BASELINE` 2 → 0 and introduced
`ACTIONABLE_UNDETECTED_BASELINE = 3` in the same commit — net absorbed findings **2 → 3**. A
per-identifier `git log -L` sweep scores that as one LOWERED and one INITIAL and cannot see the net
move. **A raise is invisible whenever the identifier changes with it.** (That commit does carry a
real source fix and names its three residuals, so the verdict stands as
RAISED-WITH-CORPUS-CHANGE — the mechanism is the finding, not the verdict.)

Baseline auditing is additionally blind to: path allowlists that grew (~500 entries), metrics
redefined so the count falls untouched, gates demoted to `continue-on-error`, and per-file exemptions
held in the *other* repo.

---

## 8. Swallowed failures in production code — swept, ranked, mostly NOT fixed

AST sweep over 7,530 production files (specs excluded).

| Class | Backend | Frontend |
|---|---|---|
| A empty catch | 6 | 37 |
| B comment-only catch | 9 | 6 |
| C `.catch(() => {})` | 92 (17 wrap a write) | 19 (2 wrap a write) |
| D log-only catch on a write | 31 | **0** |
| E catch returns a success shape | 53 | 49 |

Frontend D is genuinely 0: the whole frontend has 10 `console.*` calls, none in a catch, and its 19
catch-after-write sites all `toast.error`, which is user-visible.

**#1 was verified line-by-line and fixed (R3 above).** The rest are named, ranked and **not fixed** —
they are production defects in other territories, several on money paths:

| # | Site | What is lost |
|---|---|---|
| 2 | `ai/core/gateway/ai-gateway-credit.helper.ts:168` | the AI credit **debit** is lost; the response is still returned as success — unbilled inference. The comment two lines above says *"Swallowing it silently loses revenue."* |
| 3 | `common/auth/jwt-auth.guard.ts:229` | returns `null` on a DB error → caller sets `revoked = false` → **a revoked session is authenticated** |
| 4–5 | `hr/payroll-inputs/payroll-inputs.service.ts:221`, `:201` | loan-installment and leave-ledger status writes dropped without rolling back, while the period is audited as locked — the same installment is deducted again next period |
| 6–7 | `finance/ap/payment-run-executor.service.ts:276`, `accounting/core/accounting-payables.service.ts:451` | realized FX gain/loss never journalled; the trial balance will not tie |
| 8 | `common/idempotency/command-fence-store.ts:123` | the fence is never stamped COMPLETED, so **a retried `@Idempotent` POST re-executes** after the lease expires |
| 9 | `frontend/lib/auth.ts:254` | a session is returned with `isActive ?? true` and **no `backendJwt`** — the client renders as fully signed in |
| 15 | `hr/time/leaves-write.service.ts:387`, `overtime.service.ts:188` | the leave/overtime request is created and shown as submitted, but no approval workflow instance exists — it never reaches an approver |

**Owners: AI gateway · auth · payroll · finance/AP · platform (idempotency) · frontend auth · HR
time.** This sweep is blind to failures that never raise at all — an ignored return value, an
unchecked affected-row count, a floating `void promise` with no `.catch`, dropped `Promise.allSettled`
rejections — and to writes behind a service method, which is why several class-D items above sat
outside the automated count.

---

## 9. Gates run

| Gate | Exit | Number |
|---|---|---|
| BE `pnpm typecheck` | **0** | — (exit code, not a grep: a crashed tsc greps as "0 errors") |
| BE `pnpm check:spec-typecheck` | **0** | — |
| BE `pnpm check:vacuous-assertions` | **0** | 1,921 spec files, 4 registered, all ratchets held |
| BE `pnpm check:vacuous-assertions:self-test` | **0** | 16/16 |
| BE `pnpm check:test-suppressions` | **0** | 2,053 spec files · quarantine 6 (ratchet 6) · conditional 28 (28) · placeholder 13 |
| BE `pnpm check:transaction-callbacks` | **0** | invokes 258 · declared-unreached 7 · **VOID 2 (ratchet 2)** |
| BE `check:over-300` | **1** | 403 files, 9 above baseline 394 — pre-existing, another territory |
| **FE `pnpm type-check`** | **2** | **2 errors, both `hooks/api/chat-core-read.ts` (84, 99)** — `ResponseContract<ChannelPage<Channel>>`, `createdBy` missing. **NOT MINE — I changed no frontend file.** |

---

## 10. Residue — what remains, and why

`check:vacuous-assertions` registers exactly **4** sites, each with a named owner:

| Site | Class | Blocker |
|---|---|---|
| `inventory/inv-engine-misc-isolation-ai.spec.ts` | NO_ASSERTION | **SCOPE** — inventory excluded (R-9). Owner: CRM/inventory release owner |
| `payroll/__tests__/prd-e2e-journey.spec.ts:153` | TAUTOLOGY | asserts a scope **granted to a role**, not a catalog flag; needs access-layer fixtures. Owner: payroll/RBAC |
| `surveys/survey-lead-automation-tenant-isolation.spec.ts` | COND_ASSERT | **measured as reached** — its assertion does run today. Registered because the escape hatch survives. Owner: surveys |
| `test/security/operator-access.spec.ts` | TAUTOLOGY | deliberate: no operator-access mechanism exists to test |

**Not gated, and deliberately so — `BARE_THROW`, 333 backend sites / 125 files.** 132 of them sit on
a risk path (isolation, authz, payroll, finance, billing). The `.toThrow(TypeError)` probe found 2 of
44 in the isolation suite were asserting a crash, and both are dealt with. The remaining 289 are a
**triage backlog, not a ratchet**: most are legitimate, and baselining 333 sites would bank noise as
debt — exactly the mistake `check:transaction-callbacks` avoided by removing three false-positive
classes *before* baselining. **Owner: an owner is needed. This is the single largest un-triaged
vacuity surface left in the repository.**

`WALLCLOCK`, 816 backend sites, is likewise not gated: the great majority are legitimate fixtures,
and the one real instance found (R1) was found by execution, not by the count.

---

## 11. Verdict on the box

**I do not close it as "zero", and the honest form is this:**

> **Zero tests in either repository that run, are green, and cannot fail — outside 4 registered sites,
> each with a named owner and a stated blocker, held by a gate that is bite-proven in six directions
> and that reports INCONCLUSIVE rather than clean when it cannot measure.**

Under that reading the box is closed. Under the literal reading it is not, and these remain open:

1. **`BARE_THROW` 333 sites are un-triaged.** No owner. The largest remaining surface.
2. **`check:over-300` is red** at 403 vs a baseline that was raised to absorb a breach.
3. **The 14 swallowed-failure sites in §8 are real production defects**, several on money and auth
   paths, none fixed.
4. **`FIN-TAX-WINDOW`** — the GST due-date sweep is unreachable in production.
5. **The frontend has no equivalent gate.** It measures 0 in every class today, so there is nothing
   to ratchet, but nothing stops the first one either.
6. **A net baseline raise across an identifier rename is invisible** to the auditing method used.

Items 3, 4 and 6 were found *because* the vacuity hunt reached them; items 1 and 5 are the parts of
the hunt that were not finished.
