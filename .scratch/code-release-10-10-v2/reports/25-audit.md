# Ticket 25 — Type integrity and assertion contraction — audit at head

- **Ticket:** `.scratch/code-release-10-10-v2/issues/25-backend-cleanup.md` (2 criteria: PRD-C030, PRD-C031)
- **Prior report:** none. Evidence below is reconstructed from scratch.
- **Date:** 2026-09-03. **Read-only audit — no repository file was edited. This report is my only write.**

### The head moved twice during this audit — both states are reported

Twenty-six agents share this tree and a repair lane is committing into it. I measured everything twice.

| | backend | frontend |
|---|---|---|
| head at audit start (T0, ~21:50) | `45f8a2e99` | `7469d2789` |
| head at audit end (T1, ~22:35) | **`66f09164f`** | **`26df21488`** |

Everything below is labelled T0 or T1. Where a T0 finding was repaired by another lane before T1 I say so and mark
it CLOSED — that is evidence the defect was real, not a reason to hide it. Where a T1 commit *introduced* a
violation I report it as live.

---

## Verdict: partially met

**Two gates that belong to this ticket are RED at T1:**

- `pnpm check:type-assertions` (backend) — **exit 1**. `src/common/workflow/workflow-store.ts` gained a plain
  assertion, 5 → 6. Commit `f61cb62e3`/`66f09164f` window **replaced a runtime narrowing with a cast** on a raw
  driver row. The zero-growth ratchet caught it, which is the ledger working exactly as C031 asks.
- `pnpm check:spec-typecheck` (backend) — **exit 2**, and it has been red the whole time with *different* errors at
  T0 and T1. At T1 the error was introduced by the T1 commit itself.

The hard-zero half of C030 is genuinely achieved and I verified it independently across both whole repositories.
C031's zero-growth named ledger is built well and is wired into CI in both repos. What is not met: the
`as unknown as T` clause (37 application sites + 3,081 in the untouchable spec suite), the "covered by a
negative/runtime contract test" clause (structurally unenforceable — **0** ledger entries name a test), 13 ledger
entries the ledger itself classes as debt rather than seams, and three whole assertion syntaxes that no rule counts.

---

## 1. What I read, with numbers

### Corpus enumerated

| | backend | frontend |
|---|---|---|
| `.ts`/`.tsx` under the repo (excl. `node_modules`) | 5,839 (`src/` 5,718, plus `test/`, `evals/`) | 5,392 (incl. `.next*` output) |
| spec/test files | 2,128 | 362 |
| gate's declared application corpus | **3,649** (T1; 3,648 at T0) | **5,017** (T1; 5,015 at T0) |
| my independent count of that same corpus | **3,649** (Δ 0) | **5,016** (Δ 1) |
| `.d.ts` files (excluded by both gates) | 1 (`src/@types/express.d.ts`) | 3 — all clean, checked |
| gate script | `src/scripts/check-type-assertions.mjs`, 825 lines | `frontend/scripts/check-type-assertions.mjs`, 775 lines |
| ceiling ledger | `assertion-ceiling-ledger.json`, 1,865 lines, 465 files, 1,188 assertions | 2,045 lines, 510 files, 999 assertions |

The Δ-0/Δ-1 is the number that matters most here. Given this project's nine documented cases of a gate reporting
clean over a corpus it could not see (`src/scripts/gate-corpus.mjs`), I reproduced each gate's exclusion list by hand
(`__tests__`, `__mocks__`, `node_modules` at any depth; `dist`/`coverage` — frontend also `build`/`public`/`out` — at
the package root **only**; `*.spec.*`, `*.test.*`, `*.d.ts`, `spec-fixtures.ts`) and walked both trees with the same
rules. **Neither gate is green over unread code.**

### Gates and suites run — every exit code captured

| gate / suite | repo | T0 | T1 | note |
|---|---|---|---|---|
| `check:type-assertions` | backend | 0 PASS | **1 FAIL** | ceiling 1188 → 1189; `workflow-store.ts` 5 → 6 |
| `check:type-assertions:self-test` | backend | 0 | 0 | 26 named classifier assertions |
| `check:type-assertions` | frontend | 0 PASS | 0 PASS | 5,017 files, numbers unchanged |
| `check:type-assertions:self-test` | frontend | 0 | 0 | 30 named assertions |
| `check:spec-typecheck` | backend | **2 FAIL** | **2 FAIL** | different errors — see F2 |
| `check:test-typecheck` | backend | 0 PASS | — | `test/` clean; explicitly disclaims `src/**` specs |
| `check:vacuous-assertions` | backend | 0 PASS | — | 1,997 spec files, 15,333 callbacks, 57,849 `expect()`, 7 registered |
| `check:test-suppressions` | backend | 0 PASS | — | 2,129 spec files, 20 suppression sites, ratchets 6 / 29 |
| `check:response-contracts` | frontend | 0 PASS | — | 2,581 / 2,665 (97.8%) of the fetch seam unparsed |
| `check:test-integrity` | frontend | 0 PASS | — | 363 files, 9,538 `expect()`, all seven ratchets 0 |
| `jest --runInBand` × **417** `*tenant-isolation*.spec.ts` | backend | **7 suites / 12 tests FAILED** (111 s) | **417 / 417, 1678 / 1678 PASS** (47 s) | repaired mid-audit — see F1 |
| `jest --runInBand` `list-query.schema.spec` | backend | — | PASS 164/164 | but `tsc` rejects it — see F2 |
| driver type probe vs `scratch_head_1010` | backend | — | run | proves `sql<number>` lies — see F5 |

`check:spec-typecheck`'s exit 2 is **not** the release convention's "prerequisite unmet" exit 2. Line 90 of
`src/scripts/check-spec-typecheck.mjs` is `process.exit(result.status ?? 1)` — it propagates `tsc`'s own status — and
both runs printed concrete named errors. It is a real violation.

### Forced-typing census — backend application code (3,649 files, T1)

| shape | count | under a rule? |
|---|---|---|
| `as any` | **0** — and 0 repo-wide, including all 2,128 spec files | rule 1, hard zero |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** — 0 repo-wide | rule 1, hard zero, matched in RAW source |
| `as unknown as` | 30 sites / 17 files — 22 `external`, **8 `narrow-me` debt** | rule 2, per-file ratchet + invariant |
| `db.execute<T>` raw-row generic | 28 sites / 20 files, **25 cross-checked against their SQL** | rules 3a + 3b |
| plain `as X` | **866** (was 865 at T0) | rule 4, count-only ceiling |
| non-null `!` | 323 | rule 4, count-only ceiling |
| `as const` | 801 | excluded by written decision |
| `Record<string, any>` / `[k: string]: any` / bare `: any` | **0 / 0 / 0** | — |
| `eslint-disable` of `no-explicit-any` / `no-non-null-assertion` / `ban-ts-comment` / `no-unsafe-*` | **0** | — |
| `as Record<string, unknown>` (index-signature widening) | 171 | rule 4 only |
| `satisfies` | 35 | — |
| **`sql<T>` type argument** | **947** (585 `sql<number>`, 296 `sql<string>`) | **NO RULE — F5** |
| `JSON.parse(...) as X` | 4 | rule 4 only |
| `.get(...)!` / `[0]!` | 12 / 31 | rule 4 only |
| `process.env.X!` | 1 (`src/scripts/backfill-chat-saved-messages-membership.ts:8`) | rule 4 only |

### Backend spec suite — outside every rule in this ticket

| shape | count |
|---|---|
| `as unknown as` in `src/**` specs | **2,949** |
| `as unknown as` in `test/` | 104 |
| `as unknown as` in `evals/` | 1 |
| spec files building a mock with `as unknown as Db` | **801** |
| `as any` / `@ts-*` in specs | **0** |

The gate names this hole in writing in its rule-4 header: *"this gate walks `src/` only, minus the spec suite …
ts-jest runs `isolatedModules`, so a spec is not typechecked by anything and can forge any shape it likes … That is
a real gap and it is deliberate, not overlooked."* F1 and F2 are both measured consequences of that decision.

### Forced-typing census — frontend application code (5,017 files, T1)

| shape | count | under a rule? |
|---|---|---|
| `as any` | **0** (a whole-tree grep returns 4 hits, all prose — "as anything", "the same shape as any …") | rule 1 |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** (1,945 whole-tree hits are **entirely** inside `.next/` and `.next-buildmart/` generated output — I checked every one) | rule 1 |
| `as unknown as` | 7 sites / 6 files — 2 `external`, **5 `narrow-me` debt** | rule 2 |
| raw `fetch` `.json() as T` | 13 sites / 8 files | rule 3a |
| `.json() as Promise<T>` | **0** | rule 3b, hard zero |
| plain `as X` / non-null `!` | 922 / 77 | rule 4 |
| `as const` | 2,310 | excluded by decision |
| `Record<string, any>` / `[k: string]: any` / bare `: any` / eslint-disables | **0 / 0 / 0 / 0** | — |
| `as Record<string, unknown>` / `satisfies` | 179 / 18 | rule 4 only / — |
| **`apiClient.<verb><T>` type argument** | **2,468** | **NO RULE — F7** |
| `serverGet<T>` / `publicGet<T>` | 17 | **NO RULE** |
| **realtime `msg.data as T`** | **5** | **NO RULE — F8** |
| `JSON.parse(...) as T` | 10 | rule 4 only |
| `as unknown as` in FE tests | 27 | outside every rule |

### Files read in depth (≈50)

Both gate scripts and both ceiling ledgers end to end; every one of the 17 backend and 6 frontend double-cast
ledger files at its cast site; `workflow-store.ts`, `list-query.schema.spec.ts`, `party-revert.service.ts`,
`party-merge.service.ts`, `inbound-ingress.{controller,service,workflow}.ts`, `inbound-event.ts`,
`dto/inbound-event.schemas.ts`, `mail-to-inbound-event.ts`, `razorpay.adapter.ts`,
`payment-webhook-receiver.service.ts`, `notification-dispatch.service.ts`, `common/tenant/org-membership.ts`,
`chat-channels.service.ts`, `chat-channel-member-preview.ts`, `projects-tickets-update.service.ts`,
`timesheets/core/billing.service.ts`, `sales-dashboard.service.ts`, `leave-ledger.service.ts`,
`payroll/insights/reports.service.ts`, `payout/lib/bank-return.ts`, `categorize-suggest.service.ts`,
`expenses.service.ts`, `task-analytics.service.ts`, `hr/time/leaves.service.ts`, `chat-assistant-context.ts`,
`finance/ar/reminders.service.ts`, `stock-engine-batch.service.ts`, `org-hierarchy-dependencies.service.ts`,
`common/pagination/pagination.ts`, `survey-participant.service.ts`, and the 7 failing tenant-isolation specs;
frontend `lib/auth.ts`, `types/next-auth.d.ts`, `hooks/api/{hr/global,payroll/reports,crm/deals,leads,
notifications-inbox,hr/employees}.ts`, `hooks/api/support/realtime.ts`.

---

## 2. Per-criterion assessment

### PRD-C030 — "Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing casts or broad index signatures used to bypass a contract. Narrow `unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter; use `satisfies` where only conformance is needed."

**Status: partially met.** Clause by clause:

| clause | verdict | evidence |
|---|---|---|
| no `as any` | **MET** | 0 in backend app code, 0 in all 2,128 backend specs, 0 in frontend source. Grepped both repos whole, not just the gate corpora. |
| no `@ts-ignore` / `@ts-nocheck` (and `@ts-expect-error`) | **MET** | 0 repo-wide in both. Both gates match these in **raw** source rather than comment-stripped — the structural blindness that made rule 1 incapable of ever firing is fixed and pinned by self-test in both directions. The circulating "661 `@ts-ignore`" figure is entirely `.next-buildmart/dev/types/validator.ts`; every whole-tree hit I found is generated output. |
| no `as unknown as T` | **NOT MET** | 30 backend + 7 frontend in application code, **plus 3,054 in the backend spec suite and 27 in frontend tests** that no rule reaches. 13 of the 37 application sites are classed by the ledger's own author as `narrow-me` — *"the value is ours and the shape is knowable … Debt."* |
| no unjustified non-null assertions | **PARTIALLY MET** | 323 backend + 77 frontend under a **count-only** ceiling that records no justification per site. I hand-traced the 43 highest-risk backend sites (`[0]!`, `.get(…)!`) and **every one is honestly guarded** (§4.5). But "unjustified" is not a property any gate measures, so the criterion's own qualifier is unenforced. |
| no error-suppressing casts | **PARTIALLY MET — one live regression** | 8 `as Error` and 4 `(err as X)` in backend app code, all benign. But at T1 `workflow-store.ts:311` **replaced a runtime narrowing with `record.correlation_id as string \| null`** on a raw driver row — F-LIVE-1. The Razorpay webhook, by contrast, is the model case: Zod-validated envelope, entity fields kept `unknown`. |
| no broad index signatures used to bypass a contract | **MOSTLY MET, two live counter-examples** | `Record<string, any>` = 0 and `[k: string]: any` = 0 in **both** repos. But `check:spec-typecheck` is red on exactly this shape at both T0 (TS7053 implicit-`any` index, ×2) and T1 (TS2339 on a hand-rolled `ParseableSchema` that 20+ Zod schemas are cast into) — F2. |
| narrow `unknown` with Zod / unions / guards / a tested adapter | **PARTIALLY MET** | Genuinely done at the highest-value seams: the ingress HTTP body (`@Validate({ body: inboundEventSchema })`), the Razorpay webhook envelope, the frontend public-form / intake / portal readers via `parseApiResponse` + contracts. Not done at 13 self-declared `narrow-me` sites, nor across the 2,581-site unparsed fetch seam, nor at the 5 realtime payload casts. |
| use `satisfies` where only conformance is needed | **BARELY STARTED** | 35 backend + 18 frontend `satisfies` against 1,788 plain `as X` — a ratio of about 1:34. Both gates explicitly do not count `satisfies`, so nothing measures the substitution the criterion asks for, and nothing would notice if it never happened. |

### PRD-C031 — "Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each exception must be local, narrow, documented with the invariant and covered by a negative/runtime contract test; maintain a zero-growth, named exception ledger."

**Status: partially met.** Five sub-requirements, in order:

| sub-requirement | verdict | evidence |
|---|---|---|
| **only at a proven external/framework seam** | **NOT MET for 13 sites** | The ledger's own `seam` field says so: backend 22 `external` / **8 `narrow-me`**; frontend 2 `external` / **5 `narrow-me`**. Both scripts define `narrow-me` as *"the value is ours and the shape is knowable. The cast stands in for a Zod parse that has not been written. **Debt.**"* Full list at F4. |
| **local** | **MET** | All 37 application double casts, 41 raw-row/raw-JSON entries and 2,188 rule-4 sites are expression-level. There is no file-level or block-level suppression anywhere in either repo (`@ts-nocheck` = 0). |
| **narrow** | **MET for rules 2/3, NOT for rule 4** | Rules 2 and 3 assert one value each with a named target type. Rule 4's population includes 350 `as Record<string, unknown>` widenings, which are the opposite of narrow. |
| **documented with the invariant** | **MET for 78 sites, NOT for 2,188** | Every rule-2 and rule-3 entry carries a written invariant, and the self-tests ((y)/(z) backend, (p)/(q)/(ab)/(ac)/(ad) frontend) assert each entry names a seam kind and carries one. Rule 4 explicitly declines: *"This rule does NOT ask for an invariant or a negative test per site."* That leaves 1,189 + 999 = **2,188 assertions with no recorded justification** — the large majority of the criterion's subject. |
| **covered by a negative/runtime contract test** | **NOT MET, and structurally unenforceable** | See **F3**. Entry shape is `{count, seam, invariant}`; there is **no `test:` field** in any of the six ledgers and no self-test asserts one. 8 of 17 backend double-cast files, 6 of 11 sampled raw-row files and **0 of 6** frontend double-cast files have any test at all. |
| **maintain a zero-growth, named exception ledger** | **MET, and it is the strongest thing in this ticket** | Per-**file** ratchets across three rules per repo, failing on *shrinkage* as well as growth so a stale number cannot sit unnoticed; `--update-ledger` refuses to raise a count; scan floors (`SCAN_FLOOR_FILES` 2,000/3,000, `CEILING_FLOOR_TOTAL` 1,000) fail a suddenly-empty scan rather than report clean; AST-based counting that correctly separates `as const`, `satisfies`, `let x!: T` and `a !== b` from real assertions. Wired into CI behind its own self-test in both repos (`ci.yml:291`, `frontend.yml:529`). **And it demonstrably works: it is what caught F-LIVE-1 at T1.** |

---

## 3. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| **F-LIVE-1** | **P1** | `src/common/workflow/workflow-store.ts:311` | **LIVE at T1.** A runtime narrowing on a raw driver row was replaced by `as string \| null`. `check:type-assertions` fails, exit 1. |
| **F2** | **P1** | `src/common/pagination/list-query.schema.spec.ts:219,293` | **LIVE at T1.** `check:spec-typecheck` red (exit 2) — a hand-rolled `ParseableSchema` cast over 20+ Zod schemas; the spec passes 164/164 at runtime while `tsc` rejects it. |
| **F3** | **P1** | `src/scripts/check-type-assertions.mjs:113` | C031's "covered by a negative/runtime contract test" has no field in any of the six ledgers and no self-test; 0/6 frontend and 8/17 backend ledger files have no test. |
| **F4** | **P1** | `src/modules/ingress/inbound-ingress.workflow.ts:391` | 13 ledger entries are self-declared debt, not seams. Worst: a stored jsonb payload cast to a domain type with no parse, on the CRM mail-privacy path. |
| **F1** | **P1 → CLOSED at T1** | `src/modules/surveys/survey-forms-tenant-isolation.spec.ts:40` (+6 suites) | At T0, 7 tenant-isolation suites / 12 tests were RED — 4 of them the cross-tenant DENY assertion — because `as unknown as Db` mocks drifted out of contract. Repaired by another lane; 417/417 pass at T1. |
| **F5** | **P2** | `src/modules/ai/core/services/chat-assistant-context.ts:136` | `sql<T>` is an uncounted type-argument assertion: 947 sites, 155 with no coercion. Proven against the live driver that `SUM`/`COUNT` return **strings**. |
| **F6** | **P2** | `src/modules/notifications/notification-dispatch.service.ts:252` | `memberIdByUser.get(userId)!` against a `NOT NULL` column, where the same map is read `?? null` 14 lines above and 16 below. |
| **F7** | **P2** | `frontend/scripts/check-type-assertions.mjs:150` | 2,468 `apiClient.<verb><T>` type arguments — the shape backend rule 3 exists for — are invisible to this gate and only frozen at 97.8% unparsed by another. |
| **F8** | **P2** | `frontend/hooks/api/support/realtime.ts:56` | The SSE/WebSocket seam has 5 unvalidated `msg.data as T` casts, covered by no rule in either repository. |
| **F9** | **P2** | `src/modules/ingress/inbound-ingress.controller.ts:31` | A Zod-validated DTO is re-cast to the domain interface; the cast survives any future drift between the two. |
| **F10** | **P2** | `frontend/lib/auth.ts:204` | `(token.isActive as boolean)` vs `(token.isActive as boolean \| undefined) ?? true` in the catch branch of the same callback. |

---

### F-LIVE-1 — P1 — `src/common/workflow/workflow-store.ts:311` — **the gate is red on this right now**

`pnpm check:type-assertions` at T1:

```
=== plain assertions under a zero-growth ceiling: 1189 (866 `as X` + 323 non-null `!`) in 465 file(s) ===
FAIL: 1 file(s) gained a plain assertion. The ceiling does not rise:
  src/common/workflow/workflow-store.ts: 5 -> 6
```

The diff that caused it **replaces a runtime narrowing with an assertion** — the exact inversion of C030's "Narrow
`unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter":

```diff
-        correlationId:
-          record.correlation_id === null || record.correlation_id === undefined
-            ? null
-            : String(record.correlation_id),
+        correlationId: record.correlation_id as string | null,
```

`record` is `row as Record<string, unknown>` (`workflow-store.ts:298`) — a **raw driver row from
`claimDueRuns`**, the durable-workflow relay's claim path. Shared CLAUDE.md §6 says raw rows are
`Record<string, unknown>` and are converted at the use site; the removed code did exactly that, and the two lines
directly beneath it still do (`attempt: Number(record.attempt ?? 0)`, `maxAttempts: Number(record.max_attempts ?? 5)`).
Only `correlationId` was demoted from a coercion to a cast.

**Failure scenario:** if `correlation_id` is absent from the projection, or the driver hands it back as anything but
a string (a `uuid` column, a numeric, `undefined` on a row shape change), `correlationId` is that value typed
`string | null` and the compiler will never say so. The comment three lines above the change states what is at
stake: *"Left out of the projection, every step of every workflow reports under whatever correlation id the cron
tick happened to carry."* This is the observability thread for the durable workflow relay — the subsystem this
project already knows breaks quietly under RLS on the cron tick.

**Proposed fix:** restore the coercion. `correlationId: record.correlation_id == null ? null : String(record.correlation_id)`
is one line, is what the neighbours do, and returns the ceiling to 1188. Do **not** re-baseline the ledger to 1189 —
the ratchet is right and the code is wrong.

### F2 — P1 — `src/common/pagination/list-query.schema.spec.ts:219,293` — **red right now, and red at T0 for different reasons**

`pnpm check:spec-typecheck` has been failing throughout this audit. Exit 2 both times, which here is `tsc`'s own
status propagated by `check-spec-typecheck.mjs:90` (`process.exit(result.status ?? 1)`), not the release
convention's "prerequisite unmet" — both runs printed concrete named errors.

**At T0** (`45f8a2e99`), two `TS7053` implicit-`any` index errors:

```
src/modules/surveys/survey-assessment-tenant-isolation.spec.ts(51,12): error TS7053: Element implicitly has an
'any' type because expression of type '0' can't be used to index type 'ListResponse<{...}>'.
src/modules/surveys/survey-participant-tenant-isolation.spec.ts(51,12): error TS7053: ...
```

`TS7053` is precisely C030's *"broad index signatures used to bypass a contract"* — the compiler refusing to let
`[0]` index a non-indexable type and fall to `any`. Both were repaired with F1.

**At T1** (`66f09164f`), a new error introduced by that very commit:

```
src/common/pagination/list-query.schema.spec.ts(293,33): error TS2339:
Property 'safeParse' does not exist on type 'ParseableSchema'.
```

The mechanism is a hand-rolled structural type asserted over real Zod schemas:

```ts
type ParseableSchema = { parse: (v: unknown) => Record<string, unknown> };            // :219
{ name: "listProjectsSchema", schema: listProjectsSchema as ParseableSchema, … },     // :231, ×20+
…
const parsed = schema.safeParse(probe);                                               // :293  <- TS2339
```

**And the spec passes at runtime — 164/164, 0.7 s.** ts-jest runs `isolatedModules`, so nothing typechecks a spec
during the test run. This is the clearest single demonstration in either repository of why C030's ban matters: a
green test suite standing over code the compiler rejects, because a cast (`as ParseableSchema`) removed the
compiler's ability to see that the shape being asserted is not the shape being used.

**Failure scenario:** `safeParse` happens to exist on every real Zod schema, so today the assertion holds by luck.
The next helper that assumes `ParseableSchema` is the truth — a shared test utility, a non-Zod schema added to the
20-schema table — gets a `TypeError: schema.safeParse is not a function` at runtime, in a suite that typechecks
"clean" because nobody runs `check:spec-typecheck` locally.

**Proposed fix:** widen the alias to what the code actually uses —
`type ParseableSchema = { parse: (v: unknown) => Record<string, unknown>; safeParse: (v: unknown) => { success: boolean; data?: unknown } }`
— or, better, drop the alias and the 20+ casts and type the table as `ZodTypeAny`, which is what these all are.
Then `pnpm check:spec-typecheck` returns to 0 and stays there.

### F3 — P1 — `src/scripts/check-type-assertions.mjs:113` (and `frontend/scripts/check-type-assertions.mjs:114`)

**C031's "covered by a negative/runtime contract test" is not enforced and largely not met.** The ledger entry shape
is:

```js
const DOUBLE_CAST_LEDGER = new Map([
  ["path/to/file.ts", { count: 4, seam: "external", invariant: "…" }],
```

`grep -cE '^\s*\["[^"]+", \{[^}]*test:'` over the backend gate returns **0**. There is no `test:` field in any of the
six ledgers. The self-tests assert only *"(y) every raw-row entry names a seam kind"* and *"(z) every raw-row entry
carries a written invariant"* — never that a test exists, never that it runs, never that it would fail if the
invariant broke.

Measured coverage, searching by basename across `src/` and `test/`, not just for siblings:

- **Backend double-cast ledger (17 files / 30 sites): 8 have no spec at all** — `benchmark-access-service.ts`,
  `check-declaration-column-drift.ts`, `check-set-null-column-lists.ts`, `verify-cell-degraded-control-plane.ts`,
  `verify-cell-admission.ts`, `seed-permissions.ts`, `src/test/sql-predicate.ts`, `crm-import-preview.service.ts`.
- **Backend raw-row ledger (20 files / 28 sites): 6 of 11 sampled have none** — `workspace-copilot-tools.ts`,
  `hr-effective-change-applier.service.ts`, `hr-interviews.service.ts`, `projects-tickets-update.service.ts`,
  `backfill-financial-actors.ts`, `backfill-workflow-secrets.ts`.
- **Frontend double-cast ledger (6 files / 7 sites): 0 of 6 have any test.** `instrumentation.ts`,
  `feedbucket-widget/src/network-capture.ts`, the three `features/party/**` files and `hooks/api/hr/employees.ts`
  are all untested by sibling name or basename search.
- **Frontend raw-JSON ledger (8 files / 13 sites):** `lib/auth-session.ts`, `lib/portal-api-client.ts`,
  `features/build/forms/public-form-api.ts`, `features/build/intake/public-intake-api.ts` and
  `features/landing/contact-form.tsx` have no test by name. The ledger's claim that
  `features/build/forms/public-form-envelope.test.ts` pins three fixed sites is true, and is the good case — it is
  just not a property the gate can check.

**Failure scenario:** `src/db/query-telemetry.ts` carries three casts whose written invariant is *"the proxy only
reaches this branch after checking for `.then`"*. If a Drizzle upgrade makes the builder genuinely `PromiseLike`, or
a refactor removes the check from that branch, the invariant becomes false and the gate still passes — it only
counts. The invariant is prose; nothing binds it to executable behaviour, which is the whole distinction C031 draws
between a documented seam and a cast with a nice comment.

**Proposed fix:** add a required `test: "<path>::<test name>"` field to every entry in all six ledgers, plus a
self-test that (a) every entry has one, (b) the named file exists, and (c) the named test title appears in it. Start
with the 22 backend and 2 frontend `external` entries — the only ones C031 actually permits — and treat "no test can
be written for this" as a reason to demote the entry to `narrow-me`, not as a reason to write a placeholder.

### F4 — P1 — `src/modules/ingress/inbound-ingress.workflow.ts:391`

```ts
return row.payload as unknown as InboundCommunicationEvent;
```

The read half of a jsonb round-trip written by `inbound-ingress.service.ts:68`
(`payload: event as unknown as Record<string, unknown>`). Nothing parses the stored value. The ledger's own text for
the sibling case says it: *"the read half … and the one that should be a Zod parse — the row may have been written
by a previous release."*

This is the CRM mail-privacy path, and the lesson was already learned one file away.
`src/modules/ingress/adapters/mail-to-inbound-event.ts:38-45`, on the field the privacy rule turns on: *"An optional
`labels?` reads as 'absent means none', every caller that forgets it compiles, and a message somebody marked private
is filed into the CRM with nobody the wiser — which is exactly what a `as unknown as` cast over a provider type that
has no labels at all used to do here."* That reasoning was applied to the adapter and not to the workflow's read of
the same pipeline's stored payload.

The full 13-site `narrow-me` set — the sites C031 does not permit, by the ledger's own classification:

| file:line | what it forges |
|---|---|
| `src/modules/party/party-revert.service.ts:59` | `record.snapshot as unknown as MergeSnapshot`, then reads `snapshot.survivorBefore.name` (`:64`) and `snapshot.movedContactIds.length` (`:87`) unguarded — while `movedIdentifierIds`, `movedLegacyIds` and `movedEmployeePartyIds` all get `?? []`. A snapshot missing a *required* key throws `TypeError` before any transaction guard → 500 on revert, merge unrecoverable through the API. `party-merge.spec.ts:222` covers the older *optional* shape; nothing covers a missing required key. |
| `src/modules/party/party-merge.service.ts:246,258` | the write half, plus the `audit.logCritical({ before: … })` payload |
| `src/modules/ingress/inbound-ingress.workflow.ts:391` | above |
| `src/modules/ingress/inbound-ingress.service.ts:68` | the write half |
| `src/modules/crm/import/crm-import-preview.service.ts:111` | stored column mappings (CRM — out of release scope, noted not counted) |
| `src/modules/notifications/notification-retention.service.ts:111` | raw `db.execute` probe rows cast wholesale |
| `src/modules/record-layouts/record-layouts.service.ts:211` | raw aggregate rows cast wholesale |
| `frontend/features/party/parties/parties-page.tsx:228,328` | `RecordValue` index-signature widening, both directions |
| `frontend/features/party/parties/party-detail-sheet.tsx:69` | same seam |
| `frontend/features/party/parties/party-form-dialog.tsx:116` | same seam |
| `frontend/hooks/api/hr/employees.ts:340` | `params as unknown as Record<string, string>` into a query-string builder |

**Proposed fix:** one shared `mergeSnapshotSchema` parsed on read at `party-revert.service.ts:59`, and reuse of the
already-existing `inboundEventSchema` from `dto/inbound-event.schemas.ts` at `inbound-ingress.workflow.ts:391` — it
describes exactly this shape and is already imported by the controller. Both entries then leave the ledger and the
ratchet drops. The five frontend sites want a generic type parameter on the layout-driven renderer, not a parse;
the ledger already says so.

### F1 — P1 at T0, **CLOSED at T1** — `src/modules/surveys/survey-forms-tenant-isolation.spec.ts:40`

Reported for the record because the defect was real and the mechanism is exactly what C030 bans.

**T0 measurement:** `NODE_OPTIONS=--max-old-space-size=3072 npx jest --runInBand --silent --testPathPattern="tenant-isolation"`
over **417 suites**, 111 s → `Test Suites: 7 failed, 410 passed, 417 total · Tests: 12 failed, 1666 passed`.

| suite | failing tests | cause |
|---|---|---|
| `survey-forms-tenant-isolation.spec.ts:40,56` | **"returns empty list for a different org (cross-tenant DENY)"** + control | `TypeError: this.db.select is not a function` at `survey-forms.service.ts:39` |
| `goals-tenant-isolation.spec.ts:73,99` | **"returns nothing for a different org (cross-tenant access denied)"** + control | `toHaveLength` on `{items,page,pageSize,total,totalPages}` |
| `survey-response-tenant-isolation.spec.ts:41,54` | **"returns empty sessions for a different org (deny: isolation)"** + control | `TypeError` at `survey-response.service.ts:280` |
| `fnf-hr-payroll-tenant-isolation.spec.ts:15,53` | **"listFnf returns only attacker-org records (empty) — orgId scoped"** + control | `TypeError` at `fnf.service.ts:61` |
| `survey-assessment-tenant-isolation.spec.ts:48` | control | `TypeError` at `survey-assessment.service.ts:36` |
| `survey-participant-tenant-isolation.spec.ts:48` | control | `TypeError` at `survey-participant.service.ts:36` |
| `hr-automations-tenant-isolation.spec.ts:79,104` | 2 controls | `Expected length: 1 · Received array: []` |

Mechanism, one line: `} as unknown as Db;`. The mocks supplied only `{ query: { … findMany } }`; the services were
later moved onto `buildListResponse(rows, total, filters)`, which issues a second `this.db.select({ total: count() })`.
`as unknown as` erased the structural check, and `isolatedModules` meant nothing typechecked the spec, so the forged
mock and the real `Db` diverged silently. Four cross-tenant DENY assertions had become permanently-failing *shape*
assertions — indistinguishable from a genuine isolation failure, so a real regression would have read as "the stale
spec again".

**T1 re-measurement:** `Test Suites: 417 passed, 417 total · Tests: 1678 passed, 1678 total`, 47 s. A concurrent
lane repaired all seven between 21:50 and 22:35. **Closed.**

**Residual risk, and it is not closed:** 417 files is one family. **801 backend spec files** build a mock with
`as unknown as Db`, and 2,949 `as unknown as` sites sit in `src/**` specs under no rule and no typecheck during the
test run. I did not run the full suite (see §5). The same drift almost certainly exists elsewhere; seven instances
were found by looking at 417 of 2,128 spec files.

### F5 — P2 — `src/modules/ai/core/services/chat-assistant-context.ts:136`

**`sql<T>` is a type assertion the backend gate does not count, and it is measurably false.** Rule 3 exists because
*"`db.execute<T>` is a type assertion that does not contain the word `as`"* — and `sql<T>` is the identical shape at
**947 sites** (585 `sql<number>`, 296 `sql<string>`) against rule 3's 28.

Proven against the project's own driver and the local head database
(`postgresql://tarunchintakunta@localhost:5432/scratch_head_1010`, `node_modules/postgres`):

```
sum_decimal    value="3.75"  typeof=string     -- COALESCE(SUM(CAST(v AS DECIMAL)), 0)
sum_float      value=3.75    typeof=number     -- the same, ::float
cnt            value="2"     typeof=string     -- COUNT(*)
cnt_int        value=2       typeof=number     -- COUNT(*)::int
sum_case_int   value="1"     typeof=string     -- SUM(CASE WHEN … THEN 1 ELSE 0 END)

sum_decimal + sum_decimal = "3.753.75"
cnt + 1                   = "21"
```

**155 `sql<number>` sites in 71 application files carry neither `.mapWith(Number)` nor an explicit `::int`/`::float`
cast**; 104 of those are over `SUM`/`COUNT`/`AVG` and therefore return a string typed `number`.

Live wrong value, `chat-assistant-context.ts:50,54,136-137`:

```ts
.select({ count: sql<number>`count(*)` })     // no .mapWith, no ::int
…
projectCount: projectCount[0]?.count || 0,    // "7" || 0  ->  "7"
```

`projectCount` and `ticketCount` are strings declared `number`.

**Honesty about severity.** I traced ~10 consumers of uncoerced `sql<number>` aggregates and **found no live
arithmetic defect**: `expenses.service.ts:148-151`, `task-analytics.service.ts:66-88`, `reminders.service.ts:110-111`,
`chat-channel-member-preview.ts:133`, `leaves.service.ts:254-256,316` and
`probation-review-reader.service.ts:161-162` all coerce with `Number(...)` or `.mapWith(Number)` at the use site,
exactly as shared CLAUDE.md §6 requires. The discipline holds today. What is missing is anything that keeps it
holding: the declaration is false and no gate sees it, so the first consumer that trusts it gets string
concatenation (`cnt + 1 = "21"` is the shape) or a `TypeError` from `.toFixed()`.

**Proposed fix:** extend backend rule 3 from `db.execute<T>` to `sql<T>`. Beyond the per-file ratchet, add the
mechanical rule: a `sql<number>` whose template contains `SUM(`, `COUNT(` or `AVG(` must carry either
`.mapWith(Number)` or an explicit `::int`/`::float`/`::numeric` cast. That would have caught all 155 at once. Seed
the ledger at 155 and ratchet down.

### F6 — P2 — `src/modules/notifications/notification-dispatch.service.ts:252`

```ts
membershipId: memberIdByUser.get(userId)!,
```

The same map is read defensively 14 lines above (`:238`, `memberIdByUser.get(userId) ?? null`) and 16 lines below
(`:268`, the same). Only the digest-enqueue path forces it. `memberIdByUser` (`:184`) and `targets` (`:177`, via
`filterOrgMemberIds`, `src/common/tenant/org-membership.ts:20-29`) run the *same* `status = "ACTIVE"` predicate in
**two separate queries**.

Verified against `scratch_head_1010`: `notification_digest_items.membership_id` is `integer` **NOT NULL**.

**Failure scenario:** a membership is deactivated between line 177 and line 184 — the window `PIPE-003` two
paragraphs earlier says widens under queue lag, *"exactly when the system is busiest"*. `.get(userId)!` yields
`undefined`, Drizzle drops the undefined key, and the insert violates `NOT NULL` inside a bounded dispatch wave. The
wave's `Promise.all` rejects and the remaining recipients in that batch go undelivered.

**Proposed fix:** `const membershipId = memberIdByUser.get(userId); if (membershipId == null) return;` before the
digest branch, matching lines 238 and 268 — or hoist to a single query and derive `targets` from `memberRows`,
which removes the race entirely.

### F7 — P2 — `frontend/scripts/check-type-assertions.mjs:150`

The frontend gate's rule 3 covers **raw `fetch`** only (13 sites) and defers `apiClient` to `check:response-contracts`.
That leaves **2,468 `apiClient.<verb><T>` type-argument sites plus 17 `serverGet<T>`/`publicGet<T>`** outside every
rule in this ticket. `check:response-contracts` passes and says so itself:

```
Seam calls scanned: 2665 · Carrying a contract: 84 (3.2%) · Unparsed: 2581 (baseline 2594)
NOTE: 97.8% of the seam is still an unchecked cast. This gate freezes that debt; it does not retire it.
```

This is the shape that already shipped twice — `apiClient.get<Channel>`, `get<Huddle>` — named in the backend gate's
own rule-3 header: *"the projection did not select what the declared type promised, both repositories typechecked
clean, and the field arrived `undefined`."*

**Failure scenario:** `hooks/api/crm/deals.ts:74` reads `(await apiClient.get<OffsetPage<Deal>>("/deals", …)).items`.
If `/deals` returns `{ data: [...] }`, or renames `items`, then `.items` is `undefined`, the list renders its empty
state, and no error surfaces — a 200-with-wrong-shape and a swallowed 500 look identical to the user.

**Proposed fix:** this belongs to the response-contracts lane rather than a second ledger, but C030 says
"eliminate" and 3.2% parsed is not elimination. The release should either state explicitly that the fetch-seam debt
is out of C030's scope, or set a per-wave retirement target against the 2,581, prioritised by that gate's own
risk-list (60 routes held) rather than alphabetically.

### F8 — P2 — `frontend/hooks/api/support/realtime.ts:56`

The SSE/WebSocket seam is a third external boundary that **no rule in either repository covers**. Five sites force an
unvalidated network payload into a typed shape:

- `hooks/api/support/realtime.ts:56` — `msg.data as TicketUpdatedPayload`
- `hooks/api/support/realtime.ts:63` — `msg.data as MessageCreatedPayload`
- `hooks/api/chat-notifications.ts:64` — `msg.data as NotificationPayload`
- `features/chat/huddle-chat-panel.tsx:60` — `msg.data as HuddleChatMessageData`
- `features/chat/webrtc-huddle.ts:257` — `msg.data as IncomingSignalData`

Rule 3 exists for exactly this — an external body forced into a type — but is scoped to `.json()`. Rule 4 counts
these as ordinary `as X` and asks nothing of them.

**Failure scenario:** a backend event-payload rename lands; `payload.ticketId` is `undefined`; the handler calls
`queryClient.setQueryData` under a key built from `undefined`, or writes a cache entry for a ticket that does not
exist. Nothing throws and nothing typechecks differently.

**Proposed fix:** add a fourth rule to the frontend gate covering realtime payload casts, ledgered like rule 3 with
the validation each site performs — or route all five through a small `parseEventPayload(msg, contract)` mirroring
`parseApiResponse`.

### F9 — P2 — `src/modules/ingress/inbound-ingress.controller.ts:31`

```ts
@Validate({ body: inboundEventSchema })
accept(@Body() body: InboundEventBody) {
  return this.ingress.accept(body as InboundCommunicationEvent);
}
```

The body **is** Zod-validated — that is the good half, and the reason this is P2 rather than P1. But the validated
DTO type is then re-asserted to the domain interface. I compared the two field by field
(`dto/inbound-event.schemas.ts` against `inbound-event.ts:55-75`) and they agree today: `nullish()` matches
`?: T | null`, `participants` is `.min(1)`, `identifierKind` is optional in both. The cast exists only to satisfy
`readonly`.

**Failure scenario:** the day someone loosens `channel: z.enum(INBOUND_CHANNELS)` to `z.string()`, or drops
`.min(1)` from `participants`, the cast keeps compiling and `senderOf(event)` at `inbound-event.ts:270` returns
`undefined` for a channel the domain has no branch for. The assertion is what removes the compiler's ability to
notice the drift.

**Proposed fix:** delete the cast and declare the service parameter `InboundEventBody`; or add a one-line
conformance check beside the schema —
`const _conforms = {} as InboundEventBody satisfies InboundCommunicationEvent;` — which is precisely the `satisfies`
use C030 asks for and which nothing in either repo currently does at a DTO boundary.

### F10 — P2 — `frontend/lib/auth.ts:204`

```ts
session.user.isActive = fresh?.isActive ?? (token.isActive as boolean);        // :204, success branch
session.user.isActive = (token.isActive as boolean | undefined) ?? true;       // :261, catch branch, same callback
```

`JWT.isActive` is `isActive?: boolean` (`types/next-auth.d.ts:51`) and `Session["user"].isActive` is
`isActive?: boolean` (`:22`), so line 204's `as boolean` is an **unnecessary** assertion — the target absorbs
`undefined` and nothing breaks today. It is C030's "unjustified assertion" in its purest form: two branches of one
function disagreeing about whether the same claim is optional, with an `as` papering over the disagreement.

`lib/auth.ts` is the single largest assertion site in the frontend — **32 of the 999** ceiling assertions, all of
them `token.X as Y` reads of unvalidated JWT claims.

**Failure scenario (latent, not live):** `session.user.isActive` is `undefined` for a token minted before the claim
existed; a consumer written `if (user.isActive === false)` treats that user as active. I searched and found **no**
consumer gating on `session.user.isActive` today.

**Separately, and outside this ticket:** the catch branch's `?? true` means a failure of `fetchSessionDataCached`
yields `isActive: true` — a fail-open default on an auth path. That belongs to ticket 22; I note it rather than
count it here.

**Proposed fix:** parse the JWT claims once with Zod at the top of the `session` callback and read the parsed object
— replacing all 32 assertions in the file with one narrowing, which is the C030 remedy verbatim.

---

## 4. What head already gets right

This repository is not in bad shape on this criterion, and the report would be dishonest without saying where.

1. **The hard-zero half of C030 is genuinely achieved, and I verified it independently rather than trusting the
   gate.** `as any` = **0** and `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` = **0** across *both whole
   repositories*, including all 2,128 backend spec files and 362 frontend test files — not just the 3,649/5,017-file
   gate corpora. `Record<string, any>` = 0, `[key: string]: any` = 0, bare `: any` = 0, and `eslint-disable` of
   `no-explicit-any`/`no-non-null-assertion`/`ban-ts-comment`/`no-unsafe-*` = 0 in both. There is no escape hatch
   sitting open anywhere.

2. **Both gates' reach is real.** Backend declares 3,649 application files and I counted 3,649; frontend declares
   5,017 and I counted 5,016. Given this project's nine documented cases of a gate reporting clean over a corpus it
   could not see, that is the single most important number in this report.

3. **Two structural blindnesses were found and closed, with self-tests pinning both directions.** Suppression
   directives are now matched in *raw* source rather than comment-stripped — the previous form could report zero on
   a file whose first line was `// @ts-ignore`, and only `as any` was genuinely enforced. And the depth-blind
   directory exclusion that silently dropped `features/build/` (456 files, the product's largest module) from every
   frontend rule is fixed, with backend self-tests (ak)/(al)/(am) asserting that nested `dist`/`coverage`/`build`/`public`
   are scanned while root-level ones are skipped.

4. **Backend rule 3b is a real static proof, not a count.** For 25 of 28 `db.execute<T>` sites the gate parses the
   type literal and the adjacent `sql` template with the TypeScript AST and asserts every declared key is actually
   selected — including a `CASEFOLD` rule catching a camelCase key aliased *unquoted*, which Postgres folds to lower
   case so every read of it is `undefined`. The 3 sites it cannot read (a named alias, composed SQL) are ledgered
   rather than skipped, and I checked both by hand: `stock-engine-batch.service.ts:125-136` declares every numeric as
   `string`, and `org-hierarchy-dependencies.service.ts:49` declares `count: number | string` — both the honest
   driver shape.

5. **The non-null assertions I sampled are honestly guarded.** I hand-traced all 12 `.get(...)!` and all 31 `[0]!`
   sites in backend application code and found the guard in every one I followed: `chat-channels.service.ts:185` is
   preceded by `if (allMembers.some((id) => !membershipByUser.has(id))) throw new NotFoundException(…)`;
   `billing.service.ts:170` by `currencyTotals.length === 1`; `sales-dashboard.service.ts:372` by an early return on
   `rows.length === 0`; `bank-return.ts:95` by `rawLines.length === 0`; `categorize-suggest.service.ts:62` by
   `rows.length === 0`; `payroll/insights/reports.service.ts:108,178` and `leave-ledger.service.ts:176` by a
   `has()`/`set()` pair; `projects-tickets-update.service.ts:441` by `actorMap.get(id)?.membershipId != null` on the
   line above. F6 is the one exception, and it is a race rather than a plain mistake.

6. **The money path is typed correctly at the provider boundary.** `razorpay.adapter.ts:187` Zod-validates the
   webhook envelope, then reads every entity field through `(entity as Record<string, unknown>)` — which yields
   `unknown`, not a forged number. There is no `as number` on an amount anywhere in `src/modules/billing/payments/`,
   the normalised event is re-validated by `normalizedPaymentWebhookEventSchema` downstream, and
   `toTenantCredentials` typeof-guards every field it reads.

7. **The frontend's rule 3b closed a real shipped defect and pinned it at hard zero.**
   `app/(public)/forms/[token]/page.tsx` shipped `return res.json() as Promise<PublicFormDefinition>`; the backend's
   `ResponseTransformInterceptor` meant the resolved value was the envelope, `form.name` was `undefined`, the header
   stayed on "Loading form…" and `form.fields.length` threw. All three sites now read through `parseApiResponse` with
   a Zod contract, pinned by `features/build/forms/public-form-envelope.test.ts`, and `.json() as Promise<T>` is a
   permanent hard zero with no ledger and no permitted count.

8. **The zero-growth ledger half of C031 is well built — and it demonstrably works.** Per-file ratchets across three
   rules per repo, failing on *shrinkage* as well as growth so a stale number cannot sit unnoticed; `--update-ledger`
   refuses to raise a count; scan floors fail an empty scan rather than report clean; AST counting that correctly
   separates `as const` (801 / 2,310, excluded by written decision), `satisfies`, `let x!: T` and `a !== b` from real
   assertions. Wired into CI behind its own self-test in both repos. **It caught F-LIVE-1 within an hour of the
   commit that introduced it** — that is the ledger doing exactly the job C031 specifies.

9. **The adjacent test-quality gates are green over a large corpus.** `check:vacuous-assertions` reads 1,997 spec
   files / 57,849 `expect()` calls with 7 registered exceptions; `check:test-suppressions` reads 2,129 spec files
   with ratchets at 6 and 29; frontend `check:test-integrity` reads 363 files / 9,538 `expect()` with **all seven
   ratchets at 0**. F1 was a mock-contract failure and F2 is a typecheck failure — a different axis from vacuity, and
   these gates were right about their own.

---

## 5. Blocked on infrastructure — what I did NOT measure

- **The full backend and frontend jest suites, `typecheck`, `type-check` and `next build` were NOT run.** Each wants
  8–12 GB and 26 agents share this laptop. I ran 417 targeted tenant-isolation suites twice (`--runInBand`, 111 s and
  47 s, 3 GB cap) plus three single-file runs. **F1's seven red suites were found in 417 of 2,128 spec files; 801
  spec files build an `as unknown as Db` mock and I looked at a fifth of the suite.** The command that would settle
  it: `NODE_OPTIONS=--max-old-space-size=8192 npx jest --runInBand --silent` in `streamlineos-backend`.
- **The frontend `tsc` half of C030 is NOT MEASURED.** `check:test-typecheck` (frontend) invokes `tsc` and is on the
  forbidden list, so whether frontend application code typechecks clean at head is unknown to me. The orchestrator's
  central run owns that.
- **Whether CI actually blocks on the two failing gates is NOT MEASURED.** Both are declared —
  `.github/workflows/ci.yml:291` (type-assertions) and `:688` (spec-typecheck) — but prior experience in this repo is
  that gate jobs have sat behind a red Lint job and never executed. I read the workflow lines, not the job graph or a
  run.
- **The `sql<T>` consumer trace is a sample, not a census.** I checked ~10 of the 155 uncoerced sites by hand and
  found the `Number()` discipline holding. A complete answer needs per-alias dataflow, which is what the rule
  extension proposed in F5 would automate.
- **No E2E, browser or Lighthouse evidence.** C030/C031 are static-analysis criteria; nothing in this ticket needs
  it and I gathered none.
- **`check:alert-ack` and any gate needing a live webhook** — outside this ticket, not attempted.
- **The tree was being written by other agents throughout.** At T1 the backend had 60+ modified files and the
  frontend 40+, from at least three concurrent lanes. Every number above carries its T0 or T1 label for that reason;
  anything unlabelled was measured once and not re-measured, and should be re-taken before it is quoted in a
  completion commit.

---

## 6. Numbers for the completion commit

| | backend | frontend |
|---|---|---|
| commit audited (start → end) | `45f8a2e99` → **`66f09164f`** | `7469d2789` → **`26df21488`** |
| `check:type-assertions` | T0 exit 0 → **T1 exit 1 (FAIL)** | exit 0 both times |
| `check:type-assertions:self-test` | exit 0 | exit 0 |
| `check:spec-typecheck` | **exit 2 (FAIL) at both T0 and T1**, different errors | n/a |
| tenant-isolation jest (417 suites) | T0 **7 failed / 12 tests** → T1 **417 / 1678 pass** | not run |
| application files scanned | 3,649 (verified 3,649) | 5,017 (verified 5,016) |
| ledgered exceptions carrying a written invariant | 58 (30 double-cast + 28 raw-row) | 20 (7 double-cast + 13 raw-JSON) |
| ledgered exceptions naming a **test** | **0** | **0** |
| ledger entries classed `narrow-me` (debt, not a proven seam) | 8 | 5 |
| assertions under a count-only ceiling (no invariant, no test) | **1,189** in 465 files | **999** in 510 files |
| assertion syntaxes under **no** rule | `sql<T>` — 947 | `apiClient.<verb><T>` — 2,468; realtime — 5; `JSON.parse as` — 10 |
| forced typing outside the gate corpus entirely | 3,054 `as unknown as` in specs / `test/` / `evals/` | 27 `as unknown as` in tests |
| `satisfies` adoption (C030's named remedy) | 35, against 866 plain `as X` | 18, against 922 |
