# 51 — Assertion census across both repos, and the envelope cast it found

**Ticket:** 36, box 7 (type assertions at a proven external seam).
**Date:** 2026-09-03.
**Scope:** both repositories. CRM and Inventory are outside the release scope but are still
application code for the gates, and are counted as such. Backend chat emission shapes and
`frontend/types/chat.ts` were deliberately **not edited** — another lane holds them; findings
there are reported in §6 instead.

---

## 1. The measurement, and what it misses

Everything below is AST-derived. Two independent passes, because they miss different things:

| Pass | Tool | What it sees | What it misses |
|---|---|---|---|
| A | `ts.createSourceFile` over a directory walk | every file on disk, including `test/`, `evals/`, scripts | nothing on disk; but it cannot resolve *types*, so it cannot say what a cast is casting **from** |
| B | `ts.createProgram` + `TypeChecker` from each repo's tsconfig | resolved source types on both sides of every assertion | anything the tsconfig excludes — backend `tsconfig.build.json` excludes the whole spec suite |

A regex was not used for any of it. The reason is concrete: a type argument spans lines, nests
braces and contains commas (`db.execute<{\n id: number;\n ...}>`), and the value being asserted
sits behind an arbitrary receiver expression. Pass A's self-tests pin this — `(q)` in the backend
gate asserts a multi-line type literal yields all its keys.

**What this method still misses, stated so nobody has to rediscover it:**

- **Assertions that are not syntactically assertions.** A generic type parameter on a fetch or
  driver helper is an unchecked cast with no `as` in it. These are counted separately below; they
  are the largest population in either repo and neither pre-existing gate saw one.
- **Assertion-equivalents in the type declarations themselves.** A hand-written `interface` that
  disagrees with the wire is the same defect with no cast at all. Out of reach of any syntactic
  method; that is the parallel emission-shape sweep's job.
- **`satisfies`**, deliberately: it checks rather than asserts.
- **`as const`**, deliberately: it narrows rather than widens.
- **Pass A counts `test/` and `evals/`; pass B (backend) does not.** So the two disagree on spec
  totals by construction, and both are quoted with their scope attached.
- **One scanner bug found in my own throwaway pass A and fixed mid-audit**, worth recording because
  the same bug was live in a shipped gate (§4): a `SKIP_DIRS` set containing `"build"` matched by
  **name at any depth** and silently excluded `features/build/` — 456 files, the product's largest
  module. Every frontend number in the first half of this audit was low until that was corrected.

### 1.1 Application code (pass B, the type checker)

| | backend (`tsconfig.build.json`, 3,580 files) | frontend (`tsconfig.json`, 4,978 files) |
|---|---|---|
| `as X` (single cast) | **910** app + 11 script | **909** app |
| `as unknown as X` | 15 app + 11 script = **26** | **6** app (+1 vendored) |
| non-null `!` | 325 app + 5 script = **330** | **77** app |
| `<X>expr` angle cast | 0 | 0 |
| `as any` | 0 | 0 |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | 0 / 0 / 0 | 0 / 0 / 0 |

**Only the second row was under a gate before this pass.** The 910 + 909 single casts, the 330 + 77
non-null assertions, and every generic-parameter cast below were uncounted and unledgered.

### 1.2 Classified by what the cast is casting **from** (pass B, app + script)

The dangerous subset is a cast whose *source* type is `any`, `unknown`, `{}` / `object` or
`Record<string, unknown>` — those are the only ones TypeScript allows to become anything.

| source type | backend | frontend |
|---|---|---|
| a real typed value (narrowing within a related type) | 527 | 718 |
| `{}` / `object` | 147 | 37 |
| `unknown` | 87 | 45 |
| `Record<string, unknown>` | 51 | 23 |
| **`any`** | **23** | **42** |
| contains `unknown` / `any` inside a larger type | 112 | 50 |

Both repos report "`as any`: 0" and that is literally true — nobody writes `x as any`. But `any` is
still flowing: 23 backend and 42 frontend casts take an `any` *input*, almost all of it arriving
from an untyped third-party surface (`res.json()`, `JSON.parse`, Ably `msg.data`, Plate/Slate
element nodes, `useWatch`). The zero is a statement about one syntax, not about `any`.

### 1.3 The generic-parameter casts — the largest population, previously invisible

| seam | count | validated |
|---|---|---|
| frontend `apiClient.{get,post,put,patch,delete,upload}` / `serverGet` / `publicGet` | **2,662 call sites** | **59 (2.2%)** |
| frontend raw `fetch(...).json() as T` (bypasses `apiClient` entirely) | **13 sites in 8 files** | n/a — see §4 |
| backend `db.execute<T>` / `tx.execute<T>` raw-SQL rows | **28 sites in 20 files** | 0 validated; 25 now cross-checked statically |

The 2,662/59 figure is `pnpm check:response-contracts`, a gate the response-contracts lane landed
during this session; my own independent count agreed to within the scan-directory definition, and I
did not duplicate it. **2,603 of those 2,662 are unchecked casts wearing a `<T>` that makes them
look typed.** That is the population both shipped defects came from.

### 1.4 Spec suites (pass A, so `test/` and `evals/` are included)

Backend **2,889** `as unknown as` and **164** `as any` across the spec tree; frontend **25** and 0.
Unchanged in kind from the ticket's recorded decision — one mocking idiom, `as unknown as Db`
dominant — and not re-litigated here.

---

## 2. Classification, and the one that was a real defect

### (a) Genuine external seam — assertion unavoidable

26 backend `as unknown as` (ledgered, invariants written), 7 frontend, the 28 backend raw-SQL
generics, and the 13 frontend raw-`fetch` JSON reads. All now carry a written invariant naming the
seam. Detail in each gate's ledger.

### (b) The asserted type disagrees with runtime — **1 confirmed, user-visible; fixed**

**`app/(public)/forms/[token]/page.tsx` ended `fetchPublicForm` with
`return res.json() as Promise<PublicFormDefinition>`.**

- **What the value really is at runtime.** `src/common/interceptors/response-transform.interceptor.ts`
  is installed globally at `main.ts:118` and wraps *every* handler return as
  `{ success: true, data }` unless the payload already carries a `success` key.
  `PublicFormsService.getFormByToken` returns a bare Drizzle row
  (`{ id, name, description, type, fields }`). So the wire body is the envelope, and the resolved
  value of that cast is `{ success, data }` — not `PublicFormDefinition`.
- **What the user sees.** `form?.name ?? "Loading form…"` → the header of a public form link is
  permanently **"Loading form…"**. `form?.description` never renders. `formQuery.isSuccess && form`
  is truthy (the envelope is an object), so the form body renders and hits
  `form.fields.length` → **`TypeError: Cannot read properties of undefined (reading 'length')`**,
  into the error boundary. A stranger opening a shared public form link gets a broken page.
- **Why nothing caught it.** Both repos typechecked clean. `lib/api-contract-coverage.test.ts`
  scanned `hooks/` only. `check:response-contracts` scans `apiClient` seams, and this is a raw
  `fetch`. `check:type-assertions` counted `as unknown as` only. Four gates, none of them able to
  see it.
- **Two sibling sites carried the same cast**: `/public/forms/:token/submit` and
  `/public/intake/:projectId`. Both returned the envelope; their consumers only read
  `mutation.isSuccess`, so neither was visible.

**Fixed** (commit `9e01f3d5`, frontend). All three now read through `parseApiResponse`, which
unwraps the envelope, with a real Zod contract so the *next* shape change is an error state rather
than a blank page. The three fetch functions moved out of the two page files into
`features/build/{forms,intake}/*-api.ts` so the negative test drives the real call sites.

### (b) checked and cleared — recorded so nobody re-checks them

| site | asserted | actual | verdict |
|---|---|---|---|
| `hooks/api/support/realtime.ts:56,63` `msg.data as TicketUpdatedPayload` / `MessageCreatedPayload` | `{ticketId, updatedAt}` / `{ticketId, messageId}` | `support-realtime.service.ts:68,75` publishes exactly those | **match** |
| `features/chat/use-huddle-events.ts:45,51` `msg.data as { userId: string }` | `userId` | `chat-huddles.service.ts:423,493` publishes `{huddleId, userId, channelId}` | **match** |
| backend `db.execute<T>` — 25 of 28 sites | declared column keys | cross-checked against the SQL beside each call | **all 25 supported** |
| backend cursor decoders (`probation-list-cursor`, `employee-list-cursor`, `org-hierarchy-list-filters`) | `{v?, field?}` probes | guard-then-cast; every field typeof-checked and range-checked before use | **sound** — category (c), not (b) |
| `razorpay.adapter.ts` (15 casts) | webhook entity fields | `webhookEnvelopeSchema.safeParse` runs first; the 12 entity reads are `Record<string, unknown>` index reads with `undefined` filtered | **sound** — category (c) |
| `drizzle columns: {}` empty projections (the huddles-bug signature) | — | 1 site repo-wide, `chat-reply-reminders.service.ts:212`, and it reads only `.user` | **correct use** |

### (c) Unnecessary — replaceable with a real narrowing

The bulk of the 910 + 909 single casts. The dominant backend idiom is *guard-then-cast*:

```ts
typeof (parsed as { effectiveEndDate?: unknown }).effectiveEndDate !== "string" || ...
```

Sound but verbose — a `zod` parse or a user-defined type guard would remove the cast entirely. This
is a large, low-risk, low-value refactor and I did **not** attempt it; it is recorded, not fixed.
One (c) worth naming because it is one step from (b): `features/timesheets/my-time/week-grid.tsx:144,158`
does `JSON.parse(e.currentTarget.dataset.row ?? "{}") as GridRow` — the `"{}"` fallback is by
construction *not* a `GridRow`, and if it ever fires a manual timesheet entry is created with
`projectId`/`ticketId` undefined, i.e. unattached to any project. `data-row` is always written at
line 280 so it does not fire today. Left alone (timesheets is another lane).

---

## 3. What was FIXED versus what was LEDGERED

**FIXED — 3 sites, 1 of them a live user-visible defect.** The public form read, the public form
submit, and the public intake submit now validate instead of asserting. `check:type-assertions`
rule 3b makes the defect shape a hard zero, so it cannot come back silently.

**LEDGERED — accepted risk, not a fix.**
- 28 backend `db.execute<T>` sites: 25 are now *statically cross-checked* against their SQL, which
  is stronger than a ledger entry; 3 (composed SQL or a named type alias) are ledgered only.
- 13 frontend raw-`fetch` JSON casts in 8 files, each invariant required to state how that site
  handles the envelope.
- The 26 backend + 7 frontend `as unknown as`, unchanged from the previous pass.
- **Not ledgered and not fixed:** the 910 + 909 single casts, the 330 + 77 non-null assertions, and
  the 2,603 unparsed `apiClient` sites (the last of which is `check:response-contracts`' ratchet,
  not mine). These are counted here and enforced only by that one gate.

---

## 4. The gates, and a blind spot in one of them

### 4.1 Backend `check:type-assertions` — new rule 3 (commit `1dfc844a`)

`db.execute<T>(sql\`…\`)` is a type assertion with no `as` in it: Drizzle declares
`execute<T extends Record<string, unknown>>` and hands driver rows straight back. Neither existing
rule could ever see one. Rule 3 adds:

- **3a** a per-file zero-growth ledger, 20 files / 28 sites, each with a seam kind and a written
  invariant;
- **3b** a static cross-check that bites: every property a type literal declares must actually be
  selected by the `sql` template beside it, and a camelCase property may not rely on an **unquoted**
  alias — Postgres folds unquoted identifiers to lower case, so `AS relationAvailable` returns
  `relationavailable` and every read of the declared key is `undefined`. 25 of 28 sites are
  checkable this way; **all 25 pass**.

Self-test 14 → **27 assertions**.

### 4.2 Frontend `check:type-assertions` — new rule 3 **and a blind spot fixed** (commit `16941905`)

- **Rule 3a**: a per-file ledger of `x.json() as T` — the raw-`fetch` seam that
  `check:response-contracts` structurally cannot see. Every invariant is *required by the self-test*
  to mention the envelope (assertion `ad`), because that is the whole defect.
- **Rule 3b**: HARD ZERO on `.json() as Promise<T>`. Casting the promise rather than the awaited
  body can only be a success-payload read that skips both `unwrapEnvelope` and any contract. It was
  3 before §2's fix; it is 0 now.
- **The blind spot.** `SKIP_DIRS` contained `"build"` and matched by **name at any depth**, so
  `features/build/` (456 files), `app/(authenticated)/build/`, `hooks/api/build/` and `lib/build/`
  were excluded from *every rule in the file*. The gate reported "4,260 application files, 0
  escapes" over a tree whose largest module it never opened. `public`, `dist` and `out` had the same
  latent bug. Skipping is now depth-aware. **Files scanned 4,279 → 4,982 (+703, +16.4%).** The
  verdicts survive — the hidden tree holds 0 further `as unknown as` and 0 further escapes — but the
  scope claim did not. `check-file-sizes.mjs` and `check-repo-paths.mjs` already assert `build` is
  *not* excluded; this gate was the only one with the bug.

Self-test 16 → **31 assertions**.

### 4.3 Bite-proofs — hermetic, both directions, nothing planted in the shared tree

Every proof ran in a `git archive HEAD` temp tree with `node_modules` symlinked. **No defect was
ever written into the shared working tree.**

**Backend gate** (control: gate exit 0, self-test exit 0)

| planted defect | exit | message |
|---|---|---|
| off-ledger `db.execute<T>` in a new file | **1** | `not in RAW_ROW_LEDGER` |
| a declared key the SQL does not select | **1** | `MISSING: the type declares "nonexistentColumn"…` |
| unquote a camelCase alias (`AS "relationAvailable"` → `AS relationAvailable`) | **1** | `CASEFOLD: … Postgres returns "relationavailable"` |
| off-ledger `as unknown as` in a new file | **1** | `not in DOUBLE_CAST_LEDGER` |
| each defect removed | **0** each | — |

**Frontend gate** (control: gate exit 0, self-test exit 0, 4,982 files)

| planted defect | exit | evidence |
|---|---|---|
| `res.json() as Promise<PublicFormDefinition>` restored | **1** | named at `public-form-api.ts:46` |
| off-ledger raw JSON cast in a new file | **1** | `not in RAW_JSON_LEDGER` |
| `as unknown as` inside `features/build/` | **1** | named; count 7 → 8 |
| the same, with the **old** name-based skip | **1**, but the planted file is **not named** and the count stays **7**; files scanned drops 4,982 → 4,279 | this is the blind spot, proved directly |
| each defect removed | **0** each | — |

**The negative test** — `features/build/forms/public-form-envelope.test.ts`, 16 tests. It is not
decorative: it first proves the wire body really is a different shape from the declared type (so the
rest cannot pass vacuously), reproduces the exact `TypeError` the page threw, then drives all three
*real* functions through a stubbed `fetch`.

| planted defect (hermetic tree) | result |
|---|---|
| control | 16/16 pass |
| revert `fetchPublicForm` to the cast | **2 red** |
| revert both submit seams to the cast | **2 red** |
| delete `unwrapEnvelope`'s envelope branch | **6 red** |
| make `applyContract` skip the parse | **5 red** |
| all restored | 16/16 pass |

---

## 5. Gate results at head

| command | repo | exit | number |
|---|---|---|---|
| `pnpm typecheck` | backend | **0** | — |
| `pnpm check:spec-typecheck` | backend | **0** | spec-inclusive typecheck passed |
| `pnpm check:type-assertions` | backend | **0** | 3,577 files · 30 `as unknown as` in 17 files (22 external / 8 narrow-me) · 28 raw-row generics in 20 files, 25 cross-checked · escapes 0/0/0/0 |
| `pnpm check:type-assertions:self-test` | backend | **0** | 27 assertions + 35 ledgered invariants |
| `pnpm exec eslint src/scripts/check-type-assertions.mjs` | backend | **0** | 0 problems |
| `pnpm type-check` | frontend | **0** | — |
| `pnpm check:type-assertions` | frontend | **0** | 4,982 files · 7 `as unknown as` in 6 files · 13 raw JSON casts in 8 files · `.json() as Promise<T>` 0 · escapes 0/0/0/0 |
| `pnpm check:type-assertions:self-test` | frontend | **0** | 31 assertions + 14 ledgered invariants |
| `pnpm check:response-contracts` | frontend | **0** | 2,662 seam calls, 59 parsed (2.2%), 2,603 unparsed at baseline |
| `pnpm check:dead-code` | frontend | **0** | 0 unclassified |
| `pnpm exec eslint <7 changed files>` | frontend | **0** | 0 errors (1 warning, since removed) |
| `pnpm exec jest --runInBand --testPathPattern="(public-form-envelope\|api-envelope\|api-contract-coverage\|api-client-cancellation)"` | frontend | **0** | 6 suites / **82 tests** |

**Not run:** no backend jest. No backend *source* changed this pass — the only backend edit is the
gate script — so a focused suite would have proved nothing. Said plainly rather than padded.
**Not run:** `next build` and `nest build`. Nothing here can break a side-effect import (no file was
deleted, no module registration touched); the two gates plus both typechecks are the proof used.

---

## 6. Cross-territory findings — reported, not touched

1. **`src/scripts/check-declaration-column-drift.ts` arrived UNTRACKED** in the backend working tree
   during this session, carrying 4 `as unknown as`, which made `check:type-assertions` **exit 1 for
   every agent** until I ledgered it. Its invariant says so. If that lane drops the file, the entry
   goes stale and the gate will say `no casts left — delete the entry`, which is the intended
   behaviour.
2. **`contracts/openapi.json` describes no response bodies** — 3,613 operations, **1** with a 2xx
   JSON schema, 6 component schemas. That is why response contracts cannot be generated and why
   `check:contract-drift` had to be hand-scoped to two timesheets hook directories. Anyone planning
   to "generate the contracts" should read this first.
3. **`lib/api-contract-coverage.test.ts` scans `hooks/` only** and is blind to the 157 seam calls
   elsewhere. `check:response-contracts` (landed this session by the response-contracts lane) now
   covers the wider tree; the jest test is the narrower, older instrument and the two should not be
   quoted as if they measured the same thing.
4. **Chat / support realtime `msg.data as T` casts were verified and are correct** — see the table
   in §2. Nothing to route to the emission-shape lane from the assertion side.
5. **`NotificationProvider.validateConfig()`** and the `getTenantAbortSignal` finding from the
   previous pass are unchanged and still unowned.

---

## 7. Honest position on ticket 36 box 7

The box asks for six things. Five were already closed. The sixth — "covered by a negative test" —
moves this pass but does **not** close.

- **What moved.** The assertion population the box governs was 33 sites; it is measurably larger
  than that, and this pass brought two previously invisible seams under a ledger (28 backend raw-SQL
  generics, 13 frontend raw-`fetch` JSON reads) and gave 25 of the 28 something better than a
  ledger — a static cross-check that fails on drift. One of the newly visible casts was a live
  user-visible defect, now fixed with a negative test that bites in four planted directions.
- **What did not move.** R-8 (13 `narrow-me` sites whose recorded remedy is deletion, not a test)
  and R-8b (17 of 20 `external` sites in other lanes' harnesses, one vendored file, and the
  Drizzle-instantiation seam whose invariant is compile-time and unreachable from any runtime test)
  are untouched, for the reasons already recorded. The 910 + 909 single casts and the 330 + 77
  non-null assertions are now **counted** but still **unledgered**.

The box stays open, and the honest reason is now sharper than before: the ledger's denominator was
wrong. It counted 33 assertions in a codebase whose actual forced-typing population, once generic
parameters are admitted as the casts they are, is **2,603 unparsed response reads + 28 raw-SQL row
generics + 13 raw-fetch JSON reads + 1,819 single casts + 407 non-null assertions**. "Zero-growth
ledger" is true of the 33 and of the two new seams; it is not yet true of the rest.
