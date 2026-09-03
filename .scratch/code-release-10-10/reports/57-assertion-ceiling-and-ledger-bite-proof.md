# 57 — The assertion ceiling, and bite-proving the ledger in both directions

**Ticket:** 36, box 7 (line 130). **Date:** 2026-09-03. **Verdict: the box still does not close.**
Clause 5 of six is now closed for the *whole* population; clauses 1–4 are not, and the gap is
arithmetic, not opinion.

## 1. What was actually wrong

The box reads: "Type assertions survive only at a proven external seam, each local, narrow,
documented with its invariant, covered by a negative test and listed in a **zero-growth exception
ledger**." Five separate requirements. The previous passes closed the ledger clause *for the
population the gate could see* — and that was the defect. Measured at head:

| | ledgered before | in application code | covered |
|---|---|---|---|
| backend `as unknown as` | 30 | 30 | 100% |
| backend `db.execute<T>` | 28 | 28 | 100% |
| frontend `as unknown as` | 7 | 7 | 100% |
| frontend raw-`fetch` `.json() as T` | 13 | 13 | 100% |
| **plain `as X`** | **0** | **1,804** | **0%** |
| **non-null `!`** | **0** | **407** | **0%** |

So the "zero-growth ledger" covered **78 of 2,289** application-code assertions — **3.4%** — and
reported PASS. A plain `as X` is a type assertion in the plain meaning of shared CLAUDE.md §6
("Never force types. No `as X` / `as unknown as X`"), and nothing in either repository could see one.

Two further holes, both of the "green over a set it cannot see" shape this release keeps finding:

- **The self-tests' headline assertion counts were string literals.** Backend printed
  `27 assertions`; its own printed list named **30**. Frontend printed `31`; its list named **33**.
  Both were already wrong, and neither would have changed if half the assertions were deleted.
- **The backend walker's `SKIP_DIRS` matched `dist` and `coverage` by name at any depth** — the
  identical latent form of the bug that excluded `features/build/` (456 files) from every frontend
  rule last pass. Nothing was hidden at head (files scanned stayed 3,584 after the fix), but the
  backend already holds `src/modules/build`, `src/modules/public` and `src/db/schema/build`.

## 2. What changed

**Rule 4, both repos:** a per-file **zero-growth ceiling** on plain `as X` and non-null `!`,
seeded at the head count, stored as `assertion-ceiling-ledger.json` beside each gate.

- Backend: **1,210** assertions (880 `as X` + 330 `!`) across **466** files.
- Frontend: **1,001** assertions (924 `as X` + 77 `!`) across **511** files.
- Counted with the TypeScript AST, never a regex — a regex cannot tell `as const` from `as Config`,
  cannot separate the two halves of `as unknown as`, and reads `x!` and `a !== b` alike.
- `--update-ledger` **refuses to raise a number**, so the ratchet only ratchets down. Without that
  refusal the escape hatch would be one command wide.

**Decisions recorded in the gate, each pinned by a self-test so it cannot rot into an accident:**

- **`as const` is excluded.** It is a *const assertion*: it narrows a literal to its own type and
  cannot force one value to be a different one. It is also the most common `as` in both trees —
  **793** backend, **2,309** frontend — so folding it in would bury the signal under a safe idiom.
  The gate prints the count every run, so the exclusion is visible rather than silent.
- **`satisfies` is excluded** (a check, not an assertion); the **angle-bracket `<T>x` form is
  included** (0 today, counted so it cannot become the escape hatch once `as` is ratcheted); a
  definite-assignment `let x!: T` is excluded (a declaration flag, not an expression assertion).
- **The `as unknown as` pair is not double-ledgered** — rule 2 owns it with a written invariant each.

**Self-test counts are now measured and floored** (backend 43, frontend 43), so deleting a check
fails the gate instead of quietly shrinking the proof.

**The backend walker is now depth-aware**, pinned in both directions by self-test (ak)/(al)/(am).

## 3. The bite proofs — hermetic, both directions

Every proof ran in a `git archive HEAD | tar -x -C <tmpdir>` tree with `node_modules` symlinked.
**Nothing was ever planted in the shared working tree** (verified: `git status --short` on my paths
is empty).

### Backend (`/scratchpad/bite-be`)

| # | planted defect | exit | gate said |
|---|---|---|---|
| 0 | control | **0** | 3,584 files, 1,210 ceiling assertions |
| 1a | new unledgered file with `as X` | **1** | `not in the ceiling ledger` |
| 1b | ledgered file gains one | **1** | `bounded-map.ts: 1 -> 2` |
| 2a | ledger names a file that does not exist | **1** | `no plain assertion left — delete the entry` |
| 2b | a real file **loses** its cast | **1** | same, with the file named |
| 2c | ledger JSON deleted | **1** | `missing or unreadable … must not pass` |
| 3 | one self-test check deleted | **1** | `only 39 distinct check(s) ran, below the floor of 40` |
| 4 | counter stubbed to return 0 | **1** | `counted only 0 … below the floor of 1000` |
| 5 | `--update-ledger` run on growth | **1** | `REFUSED: --update-ledger only ever LOWERS` |
| 6 | a new `as const` file | **0** | `as const` count 793 → **794** (seen, deliberately not charged) |

Each defect was reverted and the control re-run to **exit 0** before the next.

**Proof 4 is the anti-vacuity one that matters:** a scanner that suddenly matches nothing fails
loudly instead of reporting zero violations over a tree it never read.
**Proof 6 is the non-vacuity check on the `as const` decision:** the counter demonstrably *sees* the
new `as const` and routes it away from the ceiling on purpose.

### The depth-aware walker, proved against its own predecessor

Same cast planted at `src/modules/probe/dist/bite.ts`:

- **new walker:** exit **1**, named the file, files scanned 3,584 → **3,585**.
- **old depth-blind walker:** exit **0**, files scanned stayed **3,584** — completely invisible.

### Frontend (`/scratchpad/bite-fe`)

| # | planted defect | exit | gate said |
|---|---|---|---|
| 0 | control | **0** | 4,989 files, 1,001 ceiling assertions |
| 1a | new file **inside `features/build/`** | **1** | `features/build/probe/bite.ts (1 assertion(s))` |
| 1b | ledgered file gains one | **1** | `accounting/opening-balances/page.tsx: 1 -> 2` |
| 2a | stale ledger entry | **1** | `features/gone/never-existed.ts: … delete the entry` |
| 2c | ledger JSON deleted | **1** | `missing or unreadable … must not pass` |
| 3 | one self-test check deleted | **1** | `only 42 … below the floor of 43` |

1a doubles as a re-verification that last pass's `SKIP_DIRS` reach fix still holds.

## 4. Scanner reach, stated so nobody has to rediscover it

- **Backend: 3,584 files.** `src/` only, minus `*.spec.ts`, `*.e2e-spec.ts`, `*.db.spec.ts`,
  `*.test.ts`, `*spec-fixtures.ts`, `*.d.ts`, and minus `__tests__`/`__mocks__`/`node_modules` at any
  depth plus `dist`/`coverage` at the root of the walk. **`test/` and `evals/` are siblings of `src/`
  and are outside the gate entirely.**
- **Frontend: 4,989 files.** Package root, minus `*.spec.tsx?`, `*.test.tsx?`, `*.d.ts`, the skip
  dirs, and `dist`/`build`/`public`/`out` **at the root only**.
- Both counts were reproduced independently by a separate AST walk before I trusted either gate.

**The hole, named:** ~1,930 spec files are outside both gates. ts-jest runs `isolatedModules`, so a
spec is not typechecked by anything, and the **2,756 backend + 19 frontend spec-side `as unknown as`
are counted in the ticket and enforced nowhere.** A spec can still forge any shape it likes. That is
deliberate (it is a mocking-strategy migration with an owner, per box 6) and it is a real gap.

## 5. Why the box still does not close — the arithmetic

Of **2,289** application-code assertions:

| clause | satisfied for | share |
|---|---|---|
| 5. listed in an enforced zero-growth ledger | **2,289** | **100%** ✅ |
| 3. documented with its invariant | 78 | 3.4% |
| 1. at a *proven external seam* | 24 claimed external; 13 explicitly **not** (`narrow-me`); 2,211 unclassified | ~1% |
| 4. covered by a negative test | **5** (`tracing.ts` ×1, `operator-session.guard.ts` ×1, `query-telemetry.ts` ×3) | **0.2%** |

Clause 5 moved from 3.4% to 100% this pass. Clauses 1–4 did not move, and a per-site negative test
cannot be the bar for 2,211 sites — that is not a workload problem, it is a category error, and the
amendment R-8 already requests needs extending to say so.

**R-8** (13 `narrow-me`) and **R-8b** (19 of 24 `external`) are untouched, for the reasons already
recorded: the `narrow-me` remedy is *deletion*, so a negative test would certify a cast the ledger
says must not exist; and the remaining `external` sites are other lanes' harnesses, the Drizzle-
instantiation seam whose invariant is compile-time and unreachable from any runtime test, and one
vendored file.

## 6. Cross-territory, reported not touched

1. **`src/scripts/actor-classification-allowlist.json` — the parent brief's framing is now out of
   date, in a good way.** It was cited to me as still pointing at
   `architecture-refactor/ACTOR-CLASSIFICATION.md`, which **does not exist in either repository**
   (I re-verified with `find` across both trees). The file has since been corrected in place: its
   `_description` now states the document does not exist, that the **249** entries are "accepted
   exclusions with no recorded justification", and "Do not read an entry's presence here as evidence
   it was assessed." The stale *citation* is fixed; the **249 unjustified exclusions remain**, and
   `scan-legacy-org-actors.mjs` still honours all of them.
2. **The 2 raw-`db.execute` `narrow-me` casts are the cheapest real deletions left on this box** —
   `notification-retention.service.ts:111` and `record-layouts.service.ts:211` both cast a whole
   result set to `Array<Record<string, …>>` where §6 prescribes converting at the use site, and both
   already read every field through `Number(...)`/`?? fallback` guards immediately after. Left alone:
   notifications and record-layouts are other lanes'.

## 7. Gates run, with real exit codes

Backend: `pnpm check:type-assertions:self-test` **0** (43 checks, floor 43) ·
`pnpm check:type-assertions` **0** (3,584 files; 30 `as unknown as` in 17 files, 22 external /
8 narrow-me; 28 raw-row generics in 20 files, 25 cross-checked; **1,210 ceiling assertions in 466
files**; `as const` 793; escapes 0/0/0/0).

Frontend: `pnpm check:type-assertions:self-test` **0** (43 checks, floor 43) ·
`pnpm check:type-assertions` **0** (4,989 files; 7 `as unknown as` in 6 files; 13 raw JSON casts in
8 files; `.json() as Promise<T>` 0; **1,001 ceiling assertions in 511 files**; `as const` 2,309;
escapes 0/0/0/0).

Both gates were already wired into CI and remain so: backend `.github/workflows/ci.yml:193`,
frontend `.github/workflows/frontend.yml:407`, each running the self-test **and** the gate.

**NOT RUN:** no `typecheck`, no `nest build` / `next build`, no jest. This pass changed **two `.mjs`
gate scripts and added two JSON ledgers** — zero TypeScript source, zero module registration, zero
side-effect imports. A typecheck would have proved nothing about a change TypeScript never reads,
and claiming it would be the kind of green this release keeps catching.
