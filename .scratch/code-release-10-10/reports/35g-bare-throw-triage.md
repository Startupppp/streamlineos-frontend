# 35g — the `BARE_THROW` residue, triaged by execution

Ticket 35, box 5's named residue: *"`BARE_THROW` — 333 backend sites / 125 files, 132 of them on a
risk path, UN-TRIAGED and with NO OWNER."* (`reports/35e-vacuity-sweep-s13.md` §10.)

**Headline.** All of them are now triaged, and the triage was done by **running them**, not by
reading them. **Four were real**: three tests that were green over a crash, and one same-tenant
money control that asserted the opposite of its own title and never executed the write it claims to
cover. A fifth was found while tightening. Sixty more were tightened to name the refusal they mean,
which makes the house rule *a cross-tenant miss is 404, never 403* enforceable by the tests that
claim it. The rest are fine, **by two stated class rules rather than one by one**, and the class is
now held by a new gate, `check:bare-throw`, bite-proved nine ways.

---

## 1. The population, re-measured — and the 333 is not reproducible

The 35e scanner was ephemeral; nothing named `BARE_THROW` exists on disk. So the number was
re-derived rather than inherited, with an AST scan (TypeScript 5.9.3 compiler API) over a hermetic
`git archive HEAD src test` tree, **cross-checked against grep**, which agrees exactly:

```
AST : files=2058  expectCalls=57980  bareThrowSites=370  negated=150
grep: grep -rnE "\.toThrow(Error)?\(\s*\)" over the same tree = 370
```

**370 sites / 150 files, not 333 / 125.** The corpus grew between the two measurements, and 35e's
partition is not recoverable, so the two are simply not the same number. Stated so a reader
comparing them does not conclude one is stale.

| Partition | Sites | Files | Disposition |
|---|---|---|---|
| `.not.toThrow()` — **negated** | 150 | 76 | **Class rule NEGATED.** Fails on ANY throw, so it cannot be satisfied by a crash. It is the opposite shape. Excluded by construction. |
| positive `.toThrow()` | 220 | 87 | the actual population |
| — of those, excluded modules (CRM / leads / inventory) | 13 | — | out of release scope |
| — of those, **risk-titled** (security or money in the test's own title or its describe) | 94 | 45 | probed |
| — of those, off a risk path | 113 | 41 | probed |

---

## 2. Method — a recorder, not a rewrite

35e's discriminator was to rewrite `.toThrow()` to `.toThrow(TypeError)` and see what stayed green.
That answers one bit per site. This run answers the whole question in one pass, using the same
mechanism jest already uses:

`toThrow(X)` with a function argument does `thrown instanceof X`, and `instanceof` honours
`Symbol.hasInstance`. So every in-scope site was rewritten to

```ts
.toThrow((globalThis as any).__rec("<file>:<line>"))
```

where `__rec(id)` returns a class whose `Symbol.hasInstance` **appends the real error's constructor,
`getStatus()` and message to a JSONL file and then returns `true`**. Nothing goes red; the suite
simply reports what each site is actually catching.

```
risk set : 94 sites / 45 files rewritten -> jest --runInBand -> 93 recorded
other set: 113 sites / 41 files rewritten -> jest --runInBand -> 112 recorded
```

**205 of 207 in-scope sites produced a real, observed error class.** The 2 that did not are the
`APP_DATABASE_URL`-gated integration describes (`degradation/search-index.spec.ts`,
`degradation/realtime-adapter.spec.ts`), which do not execute without a live database and are already
registered conditional suppressions.

Two suite failures inside the probe were checked against HEAD before being believed:
`list-query.schema.spec.ts` (20 failed) fails identically at HEAD in the real repo — **pre-existing,
not mine, another territory**; `hr-export.spec.ts` failed only in the hermetic tree because the
archive carries `src` and `test` but not `migrations/`.

All mutation work was done in hermetic `git archive HEAD` trees. **No mutation was ever written to
the shared working tree.**

### What the recorder found

| Constructor | Risk set | Other set |
|---|---|---|
| `ZodError` | 24 | 89 |
| `NotFoundException` (404) | 32 | 1 |
| `Error` (base) | 15 | 22 |
| `ForbiddenException` (403) | 10 | 0 |
| `ModuleDisabledException` (402) | 4 | 0 |
| `BadRequestException` (400) | 3 | 0 |
| `InternalServerErrorException` (500) | 2 | 1 |
| `ConflictException` (409) | 2 | 0 |
| `AiProviderUnavailableException` / `ControlPlaneUnavailableError` / `ServiceUnavailableException` (503) | 5 | 1 |
| `ProjectsNotFoundException` / `ProjectsTicketNotFoundException` (404) | 2 | 1 |
| **`TypeError`** | **1** | 1 |
| `DOMException` | 0 | 2 |

---

## 3. What was real — 4 of 220, and here they are

### R1. `calendar/calendar-series-exception-scope.spec.ts:404` — a test named **BITE PROOF** that could not bite

```ts
it("BITE PROOF: with a non-invoking transaction mock, the outbox update is never executed", async () => {
  const updateFn = jest.fn();                                   // wired to NOTHING
  const db = { ...makeOwnerDb(...), transaction: jest.fn().mockResolvedValue(undefined) };
  await expect(svc.cancelOccurrence(...)).rejects.toThrow();     // passes on a TypeError
  expect(updateFn).not.toHaveBeenCalled();                       // a local variable nothing can call
});
```

Two defects in eleven lines. `cancelOccurrence` does `const [row] = await this.db.transaction(...)`;
a double resolving `undefined` makes that destructure throw
**`TypeError: (intermediate value) is not iterable`**, which the bare matcher accepts. And `updateFn`
is a `jest.fn()` that is never attached to the db, so the second assertion is a tautology on a local.
The test proved nothing at all, under a title claiming it was the proof that its siblings were
load-bearing.

**Fixed** — the double now carries the `insert`/`update` spies the service would reach, the
transaction resolves without invoking the callback, and the assertion is that the outbox update was
not executed.

**Bite proof** (hermetic tree, mutation = move the outbox kill out of the transaction to
`this.db.update`):

```
HEAD spec  vs mutation : rc=0   19 skipped, 1 passed
NEW  spec  vs mutation : rc=1   1 failed — "Received number of calls: 1" naming notification_outbox
```

### R2 / R3. `hr/directory/employee-onboarding-tenant-isolation.spec.ts:143` and `:204` — a 500 sold as an authorization decision

Both tests in `EmployeeOnboardingService — cross-tenant isolation` were satisfied by
**`InternalServerErrorException: Failed to link user record.`** — the 500 at
`employee-onboarding.service.ts:195`, reached because the double's `findFirst` returns `null` on its
second call, so the in-transaction re-read finds nothing. No authorization decision was ever
involved.

And `:204` is worse than weak. It is titled *"uses owner org for membership scoping (**control —
same-tenant access works**)"* and it asserts `.rejects.toThrow()`: the control for the allow path was
asserting that same-tenant onboarding **rejects**.

**Fixed** — both now drive the membership check to a named `ConflictException`, read the org
predicate off **that call alone** rather than off a flattening of every predicate in the method,
assert the other org is absent, and assert no transaction opened.

**Bite proof**, two mutations:

| Mutation | HEAD spec | New spec |
|---|---|---|
| the duplicate-membership refusal degrades to `InternalServerErrorException` | **rc=0, 4/4 passed** | **rc=1**, "Expected constructor: ConflictException / Received constructor: InternalServerErrorException" |
| the membership check loses `eq(organizationMembers.orgId, actor.orgId)` | rc=1 | rc=1 |

The first row is the finding in one line: **the old spec could not tell a refusal from a crash.**

### R4. `billing/payments/payment-test-transaction-tenant-isolation.spec.ts:45` — a money control that never reached the money

*"proceeds for the owning org when provider exists (control — same-tenant)"* asserted
`.rejects.toThrow()` over a provider facade whose `isReady()` returned `false`, so it passed on
`BadRequestException("Add test credentials before running a test payment")` and **stopped at the
credential check** — before the insert, before the provider order, before the status update. Nothing
after that line was covered by anything.

This is R4 of 35e (the invoices payment control) **reproduced at a second point**, in the same shape,
in the same release.

**Fixed** — the control now runs the write path to completion and asserts the org on the provider
lookup, the inserted row, the post-order status update and the audit entry. The deny case
additionally asserts the org on the lookup and that no row was inserted.

**Bite proof** (mutation = drop `eq(paymentTestTransactions.orgId, orgId)` from the post-order
update, which lets a provider order be stamped onto another org's row):

```
HEAD spec vs mutation : rc=0   2 passed, 2 total
NEW  spec vs mutation : rc=1   "Expected value: org-owner / Received array: ["", " = ", 77, ""]"
```

A live cross-tenant write defect on a payments table, invisible to the control that exists to catch
it.

### R5 — found while tightening, not by the probe

`scripts/hrms-partition-planner/partition-security.spec.ts:40` is an `it.each` over four different
security gates (public grants, app-role access, ACL drift, sequence ACL) whose four cases all
asserted a bare `.toThrow()`. Pinning the message revealed that **three of the four throw a different
message than the first**, so a drifted ACL or a drifted sequence ACL was being satisfied by the
public-grants error: the test could not tell which security gate had fired. Each case now carries its
own expected message.

---

## 4. What was tightened — 60 under the gate's own rule

Sixty risk-path sites now name the exception they accept. The class was chosen from the **recorded**
constructor, never guessed:

- cross-tenant refusals -> `NotFoundException` / `ProjectsNotFoundException` /
  `ProjectsTicketNotFoundException`, which is what makes **404-never-403** enforceable rather than
  merely described;
- authorization and grant-authority refusals -> `ForbiddenException`;
- module gating -> `ModuleDisabledException`; breakers -> `AiProviderUnavailableException` /
  `ControlPlaneUnavailableError` / `ServiceUnavailableException`; conflicts -> `ConflictException`;
- base-`Error` sites -> their distinguishing **message**, because `.toThrow(Error)` is not narrower
  than bare;
- the payroll period-lock trio -> the planted driver failure's **SQLSTATE**, read through
  `src/common/db/postgres-error.ts` (`getPostgresErrorDetails`), not off `{ code }`, which is a shape
  postgres-js never produces at the top level.

Measured by the gate itself, over the reverted batch in a hermetic tree:

```
batch reverted  : ACTIONABLE 62,  rc=1  ("62 actionable site(s), 60 above the ratchet of 2")
batch restored  : ACTIONABLE  2,  rc=0
```

### Bite proofs for the tightening class

Each row: a mutation planted in the **source**, run against the pre-fix spec and the tightened one.

| # | Mutation | Pre-fix spec | Tightened spec |
|---|---|---|---|
| M1 | payroll setup answers **403 instead of 404** on a cross-tenant template id | **rc=0**, 17/17 | **rc=1**, 2 failed |
| M2 | `ModuleGuard` throws `ForbiddenException` instead of `ModuleDisabledException` (4 specs) | **rc=0** ×4 | **rc=1** ×4 |
| M4 | payroll run lock answers 404 instead of 409 | **rc=0**, 11/11 | **rc=1**, 1 failed |
| M5 | the dashboard registry rewords its refusal | **rc=0**, 17/17 | **rc=1**, 3 failed |
| M7 | the period-lock transaction rethrows a generic 500, **losing the SQLSTATE** | **rc=0**, 4/4 | **rc=1**, naming `code 23514` / `hr_loan_repayments_status_check` lost |

**M1 is the house rule made enforceable**: downgrading a cross-tenant 404 to a 403 — the exact
existence-oracle backend/CLAUDE.md §4 forbids — passed every one of those tests before this change.

Two mutations were tried and are reported as **not discriminating**, because honesty about a proof
matters more than the size of the table: `M3` (owner-only refusal -> `Error`, then -> 401) and `M6`
(control-plane typed error -> `Error`) red the pre-fix spec too, since other assertions in those two
files already read `getStatus()`. They confirm the new assertion bites; they do not prove the old one
did not.

---

## 5. What is genuinely fine — stated by class, not one by one

**Class NEGATED — 150 sites.** `.not.toThrow()` fails on ANY throw. It is the inverse shape and
cannot be satisfied by a crash; a mis-shaped double makes it *red*, not green. Excluded by
construction, not by an allowlist.

**Class SCHEMA_PARSE — 21 risk-path sites (and the bulk of the 89 off-path `ZodError` ones).** The
asserted subject's call chain ends in `.parse(...)` / `.safeParse(...)`. The only reachable throw is
the schema's own, so naming it adds nothing an author could get wrong. Applied from the AST subject
expression, so it is a *rule* and not a file list. Execution recorded `ZodError` at every one of
them, so the rule is a measurement.

**Class OFF-RISK — 139 sites.** A bare throw in a formatting helper, a CLI parser or a registry
lookup is noise. All 113 in-scope ones were executed anyway, and **none was satisfied by a crash**.
The two that looked suspicious in the raw counts are both correct: `chat-channels-read-path.spec.ts`
asserts a db failure surfaces as an exception (its `InternalServerErrorException` **is** the subject),
and `fault-server.spec.ts` asserts a refused connection (`TypeError: fetch failed` is literally what
undici raises, and is the intended outcome). These are counted and printed as INFO and **never
ratcheted** — banking 139 of them as an accepted number would record noise as debt, which is the
mistake `check-transaction-callbacks` avoided by removing three false-positive classes *before*
baselining.

---

## 6. The new gate — `check:bare-throw`

Triaging 220 sites does not keep the class out. `src/scripts/check-bare-throw.mjs` gates it.

It fails **only** on a bare `.toThrow()` / `.toThrowError()` under a test or describe title that
claims a refusal. NEGATED, SCHEMA_PARSE and OFF-RISK are excluded by the rules above; suppressed
tests stay with `check:test-suppressions` so neither ratchet can absorb the other's.

```
pnpm check:bare-throw              EXIT=0
  Spec files 1946 · .toThrow() matchers 1473 · risk-titled tests 6801
  bare throws 146 · on a risk path 7 · exempt SCHEMA_PARSE 5 · ACTIONABLE 2 · off a risk path (INFO) 139
pnpm check:bare-throw:self-test    EXIT=0   16 passed, 0 failed
```

The self-test's 16 assertions include five **risky-direction** cases asserted *not* caught —
`.not.toThrow()`, a class argument, a message argument, a `.parse()` subject, and a suppressed test —
plus the two floor counters and the matcher-line reporting that a naive scanner gets wrong.

### Bite-proved nine ways, in a hermetic tree

| Mutation | Exit | What it said |
|---|---|---|
| unregistered bare throw planted under a cross-tenant title | **1** | names `planted-isolation.spec.ts:3` *and* "3 actionable site(s), 1 above the ratchet of 2" |
| the three pre-fix specs of §3 restored | **1** | names both employee-onboarding sites and the payment control by title |
| the whole 33-file tightening batch reverted | **1** | "62 actionable site(s), 60 above the ratchet of 2" |
| walker neutered | **2** | `INCONCLUSIVE — walked 0 spec files, below the floor of 1500` |
| `.toThrow` matcher reader neutered | **2** | `INCONCLUSIVE — saw 0 .toThrow() matchers, below the floor of 500` |
| risk classifier neutered | **2** | `INCONCLUSIVE — classified 0 risk-titled tests, below the floor of 50` |
| a stale registration | **1** | "registration no longer matches anything — remove it" |
| a reason under 40 characters | **1** | "registered entry has no usable reason" |
| a registration with no owner | **1** | "registered entry has no owner" |

Three floors, because a gate that measures nothing must not report a clean tree: the third one is
specific to this gate — the risk classifier is what keeps 139 sites out of the ratchet, so a
classifier that silently matched nothing would turn the gate green over the whole population.

Wired into `.github/workflows/ci.yml` beside `check:vacuous-assertions`, with `if: ${{ !cancelled() }}`.

### What the gate does not see, recorded in its own header

**Its classifier misses one of its own four findings.** The calendar `BITE PROOF` test carries no risk
word in either its title or its describe, so the gate reads it as noise and would not have caught it.
It was found by execution, not by a title. That classifier is exactly what keeps 139 sites out of the
ratchet, so the miss is the price of the scoping rather than a bug — but a reader has to be able to
see it in the header rather than infer it from a green, so it is written there.

Also unseen, and stated: `.toThrow(Error)`, which is barely narrower than bare but *is* an argument;
a specific class that is nonetheless the **wrong** one (a cross-tenant test asserting
`ForbiddenException` passes this gate while breaking the house rule); and a refusal asserted inside a
helper the test calls.

---

## 7. Residue — 2 sites, both with a named owner

`src/scripts/baselines/bare-throw.json`, ratchet **2**, which may only go down.

| Site | Owner | Blocker |
|---|---|---|
| `src/degradation/search-index.spec.ts:231` — *"fails closed when the tenant GUC is absent"* | degradation / platform DB | **The one site of 220 the execution triage could not reach.** It sits inside the `APP_DATABASE_URL`-gated integration describe. Naming a class would be a guess about what postgres raises when `current_org_id()` has no GUC, and a guessed class is the defect this gate exists to remove. Tightenable the moment the seeded integration lane runs in CI. |
| `src/modules/inventory/inv-engine-misc-isolation-stock.spec.ts:194` | CRM/inventory release owner | **SCOPE.** This is one of the two sites of 44 that stayed GREEN under 35e's `.toThrow(TypeError)` probe — i.e. **measured** to be satisfied by a crash. Its sibling (invoices payment) was repaired; inventory is excluded from this release (accepted residual R-9, review 2026-12-01). |

---

## 8. Gates run

| Gate | Command | Exit | Number |
|---|---|---|---|
| BE typecheck | `pnpm typecheck` | **0** | exit code, not a grep |
| BE spec typecheck | `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE bare throw | `pnpm check:bare-throw` | **0** | 1,946 spec files · ACTIONABLE 2 (ratchet 2) |
| BE bare throw self-test | `pnpm check:bare-throw:self-test` | **0** | 16/16 |
| BE vacuous assertions | `pnpm check:vacuous-assertions` | **0** | 1,945 files · 4 registered, ratchets held |
| BE vacuous self-test | `pnpm check:vacuous-assertions:self-test` | **0** | 16/16 |
| BE test suppressions | `pnpm check:test-suppressions` | **0** | 2,076 files · quarantine 6 (6) · conditional 28 (28) |
| focused jest, every suite touched | `jest --runInBand <38 files>` | **0** | **38 suites / 444 tests passed** |
| BE over-300 | `node src/scripts/check-over-300.mjs` | **1** | **406 files, 12 above baseline 394** — pre-existing, another territory, baseline deliberately NOT moved |

---

## 9. Verdict on box 5

**The `BARE_THROW` PARTIAL that held box 5 open is closed, and the box is not.**

The residue as 35e stated it — *"un-triaged and with no owner"* — no longer describes anything. All
370 sites are triaged: 150 by a stated rule that makes them the inverse shape, 220 by **execution**,
of which 205 produced an observed error class. Four were real and are fixed with two-directional bite
proofs; a fifth was found in the fixing. Sixty more name their refusal. Two remain, each registered
with a named owner and a stated blocker, behind a gate that is bite-proved nine ways and reports
INCONCLUSIVE rather than clean when it cannot measure.

Box 5's own bar — *zero tests that run, are green and cannot fail, outside registered sites with named
owners* — is met for this class under the same reading `check:vacuous-assertions` already carries.

**Box 5 stays OPEN, on the items that are not this one.** 35e names four others and none of them moved
here:

1. `check:over-300` is red at **406 vs baseline 394** (re-measured this session, not inherited; the
   baseline was deliberately not raised again). Release management.
2. The frontend has no equivalent gate, in any of these classes. It measures 0 today, so there is
   nothing to ratchet — and nothing stops the first one either. **Frontend territory; 18 bare-throw
   sites / 10 files were reported there and were NOT triaged in this run** (this session's scope was
   the backend), so that number is inherited, not measured.
3. The swallowed-failure escalations of 35e §8 / `35f` remain with their named owners.
4. A net baseline raise carried across an identifier rename is still invisible to per-identifier
   history.

## 10. Cross-territory findings, not fixed here

- **`src/common/pagination/list-query.schema.spec.ts` is RED at HEAD** — 20 failed of 170, reproduced
  in the real repo, unrelated to this work and unrelated to the probe. Not mine.
- **`PayrollRunLockService.acquire` answers a cross-tenant or missing run id with `ConflictException`
  (409) "Payroll run is already being generated or recalculated"**, conflating "not yours / does not
  exist" with "someone else holds the lock". It is not the 403 the house rule forbids, but it does
  assert to a caller in another org that a run exists. The spec now pins the 409 as the current
  behaviour; whether it should be a 404 is a payroll decision. Owner: payroll.
- **`employee-onboarding-tenant-isolation.spec.ts` asserts its org predicate by flattening every
  `where` and `findFirst` argument in the method and calling `toContain`.** The two tests repaired
  here now read the predicate off the single call they name, but the flattened shape is used widely
  across the isolation suite and, as 35e's R4 recorded, **one unbound predicate among bound siblings
  is invisible to it**. That is a broader spec-design issue than this ticket's box.
