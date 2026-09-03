# 21b / 20 — The N+1 gate could not see half the loops in the repository

**Date:** 2026-09-03 · **Territory:** `BE/src/scripts/check-db-call-count.mjs` + its baseline,
`BE/src/scripts/check-query-projections.mjs` (new) + its baseline, and the service files named below.

## 1. The finding

`pnpm check:db-call-count` was **red at HEAD** (rc 1: 1 unclassified file, 5 stale verdicts against a
ratchet of 2). That was the visible problem. The invisible one was larger.

`detectLoopDbCalls` discarded any loop opener with no `{` on its line, via one `continue`, on the
reasoning "no brace, no body". That holds **only** when the opener's whole *statement* also ends on
that line.

**Measured at HEAD, over `src/modules`: 2,417 of 4,765 loop openers — 50.7%, spread over 753 files —
were discarded with no body inspection at all.**

Two shapes account for nearly all of it, and both are shapes this repository prefers:

1. The **braceless single-statement `for` body**, which `CLAUDE.md` §6 does not merely permit but
   *mandates* ("Single-statement `if`/`for` bodies omit braces"). The gate was blind by construction
   to the house style.
   ```ts
   for (const row of rows)
     await claimIdentifiers(db, orgId, row.partyId, claimsOf(row));   // never inspected
   ```
2. `await Promise.all(xs.map((x) => this.db...))` — the commonest hidden-N+1 idiom in a Nest/Drizzle
   service. Its opener line `xs.map((x) =>` leaves a paren **open**, and `loopParensBalanced` returns
   `parenBalance >= 0`, so an *unclosed* opener counted as "closed" and hit the same `continue`.

A third, smaller hole: `for await (` never matched `\bfor\s*\(` — 13 sites invisible for that alone.

### A correction to the brief

The routed defect said the detector "matches its DB-call patterns line by line", citing 397 vs 566
files. Window-joining already existed (`bodySoFar`) and that figure measures the **patterns
standalone, not the gate**. Re-measured here for completeness: line-scoped 964 files, file-scoped
1,160, delta 196. It is not the gate's coverage and should not be cited as such. The real defect is
the one above and it is bigger.

## 2. What was changed

- **`scanBracelessBody`** scans the following statement until every delimiter the opener left open
  closes again, capped at `LOOP_BODY_LOOKFORWARD`. An opener whose own statement already ended
  (`const ids = rows.map((r) => r.id);`) returns `null`, which is what stops it adopting the next
  statement — the regression this file has twice been broken by.
- **`for await (`** added as a loop opener.
- **Coverage is counted and ratcheted** (`MIN_INSPECTED_LOOPS = 2600`, measured 2,739). This is the
  load-bearing part: counting *detections* cannot catch a narrowing detector, because a narrower
  detector detects less and reads as cleaner. Counting *inspections* can.
- **`main()` runs only when invoked directly**, so the module is importable without running a
  full repository scan as an import side effect.
- Self-test **22 -> 37 checks**. Every new HIT fixture returned 0 before this change.

### The invisible set, named instead of ratcheted away

Three files carried a real residual N+1 whose per-row work is a **service call** (`applyOne`,
`approveSinglePeriod`) — unmatchable by any pattern detector. They were marked `ACTIONABLE`, which
asserts "the detector still matches me". It does not, so each read as a *stale verdict*, and the
recorded response had been to **raise `UNDETECTED_CLAIM_BASELINE`**. That ratchet was absorbing real
findings: it was the gate's own escape hatch for its own blindness.

New verdict **`ACTIONABLE-UNDETECTED`** — a human read the site, confirmed the N+1 is real, and
confirmed the patterns cannot see it. Inert to both directional checks, printed on every run,
ratcheted at 3, downward only. `UNDETECTED_CLAIM_BASELINE` is now **0**; both files it named were
obsolete FALSE-POSITIVE excuses and are deleted rather than carried forward.

### The five "regressions" were the fixes

The widened scanner re-matched five files marked `N+1-FIXED`. None regressed: each **is** the batched
fix — chunked `inArray` loops (`autonomy-hold`, `notification-digest`, `organization-purge-adapters`)
and `sql` fragment builders feeding one statement (`vendor-payments-allocations`,
`notification-preferences`). Re-verdicted `BATCHED`, which is exactly what that verdict is for and
why it was removed from `FIXED_VERDICTS`.

## 3. What the widening found

**14 files the gate had never seen once**, each classified by reading the site. Four are real
per-row or per-group writes:

| File | Shape | Disposition |
|---|---|---|
| `kb/wiki/kb-spaces.service.ts:224` | one outbox INSERT **per article and per page** in a deleted space | **FIXED** — one `OutboxWriter.emitMany` |
| `clients/client-accounts.service.ts:487` | one UPDATE per distinct assignee | ACTIONABLE — file held by another lane while this ran |
| `party/party-legacy-employer.ts:213` | one UPDATE, each with its own correlated subselect, per distinct legacy employer | ACTIONABLE — writes CRM's `contacts`, CRM is out of release scope |
| `party/party-legacy-writer.ts:252` | `claimIdentifiers` per moved row | ACTIONABLE — needs a bulk variant its owner must define |

Plus, in excluded CRM, `crm-rules.reorderAssignmentRules` and `crm-metadata.reorderStages`, both
`Promise.all(ids.map(() => db.update(...)))` — one UPDATE per id. Recorded so they are not lost.

The remaining eight are `sql`-fragment builders feeding a single statement, chunked bulk writes, or
fan-outs bounded by a compile-time constant (`PIPELINE_STAGES` is 6 elements;
`settings.getSectionProvenance` is capped by a Zod enum, not by caller input).

## 4. Bite proof — hermetic, both directions

`git archive HEAD src test` into a temp dir. **No defect was ever planted in the shared working tree**;
verified clean afterwards with `git status --porcelain`.

| # | Condition | Expected | Got |
|---|---|---|---|
| A | clean archive | 0 | **rc 0** |
| B1 | braceless per-row `db.update` planted in `goals/goal-links.service.ts` | 1 | **rc 1**, names the file |
| B1b | *same defect, pre-change detector (267af62e)* | invisible | **0 violations** (new detector: **1**) |
| B2 | defect removed | 0 | **rc 0** |
| C | old `continue` restored (detector re-narrowed) | 1 | **rc 1**, inspected 2,739 -> 2,135, coverage floor 2,600 |
| D | 4th `ACTIONABLE-UNDETECTED` entry added (ratchet 3) | 1 | **rc 1** |
| D2 | entry removed | 0 | **rc 0** |

B1b is the one that matters: the defect scores **0 on the detector as it stood and 1 on the detector
as it now stands**.

## 5. Ticket 20 — the projection box

New gate **`pnpm check:query-projections`**. Ticket 20's box has three clauses; two of them (count
paths, existence paths) need no product decision, because a count has no response DTO and narrowing
one changes no contract. They were closed by hand — the pass that closed them found
`survey_participants.accessTokenHash`, the hashed bearer token granting access to a survey response,
hydrated into the heap to answer a `.length` — and **nothing was left enforcing them**.

- **Hard fail** on any unprojected read whose *every* use is `.length`. Measured **0**, allowance **0**.
  A top-level `columns:` is told from one nested in `with:` by brace depth, not by regex.
  The rule is deliberately narrow: allowing a *bare* use as a truthiness test measured **211**
  findings against the hand-scan's 4, because `return rows;` is a bare use too. A gate that fires on
  211 sites of which 207 are wrong does not get fixed — it gets an allowance.
- **Ratchet** on the blocked clause. Independently measured (corroborating the ticket's recount,
  not copying it): `findMany` without `columns:` **295**, `findFirst` **547**, bare `.select()`
  **599** — total **1,441**. Ticket 20's own recount: 296 / 550 / 599.

Two ceiling defects found by running it, both recorded because they generalise to every ratchet in
this release:

1. The baseline was first measured on the shared **working tree** and read 294/547/600 against
   HEAD's 295/547/599, because two concurrent lanes held uncommitted edits in opposite directions.
   **A ceiling taken from a dirty shared tree is not the number the gate will see.** Taken from
   `git archive HEAD src` instead.
2. **Three independent per-shape ceilings are unusable in a shared tree.** One lane projecting
   `chat/chat-channel-list.service.ts` (findMany 295 -> 294) while another adds a bare `.select()` in
   a new file (599 -> 600) trips a per-shape gate — while the total is 1,441 either way, *and it is
   1,441 because nothing got worse*. Enforced on the **total**, reported per shape so composition is
   never hidden. A per-shape gate would have been raised by the next person to hit it, which is how a
   ratchet becomes a rubber stamp.

Bite-proved hermetically: clean archive rc 0 · planted unprojected count path rc 1 naming the site ·
adding `columns:` to that same read rc 0 · removing it rc 0 · planted bare `.select()` rc 1 on the
total ratchet. `--self-test` 10/10.

**This does not close ticket 20's box.** The residue is still "which list endpoints may return less
than they return today", and no gate can answer that. What changed: the two clauses needing no
decision can no longer silently regress, and the one that does is a measured number with a ceiling
instead of a paragraph.

## 6. Commands and exit codes

```
node src/scripts/check-db-call-count.mjs                 rc 1 -> rc 0   (was red at HEAD)
node src/scripts/check-db-call-count.mjs --self-test      rc 0   37 checks (was 22)
node src/scripts/check-query-projections.mjs              rc 0   1,441 / ceiling 1,441 · count paths 0 / 0
node src/scripts/check-query-projections.mjs --self-test  rc 0   10 checks
pnpm typecheck                                            rc 0
jest --runInBand --testPathPattern="kb-spaces|outbox"     rc 0   26 suites / 178 tests
```

Loop coverage after: **4,781 openers · 2,739 inspected · 2,042 skipped** because their statement
ended on the opener line. Before: 2,127 inspected, 2,638 discarded outright.

## 7. Not done — stated plainly

- **Three of the four real N+1s the widening found are recorded, not fixed.**
  `party-legacy-employer` writes CRM's `contacts` (out of release scope) and a wrong bulk write there
  mis-assigns employers silently; `client-accounts.service.ts` was being edited by another lane while
  this ran; `party-legacy-writer`'s `claimIdentifiers` needs a bulk variant whose per-party conflict
  semantics belong to its owner. Each carries the exact batched form in the baseline note so the
  owner does not re-derive it.
- **No database was measured in this pass.** No `psql`, no `EXPLAIN`, no buffer counts, no tenant-skew
  comparison. Everything here is static analysis and gate execution. The N+1 removed in
  `kb-spaces.service.ts` is proved by reading the call and by 26 green suites, **not** by a measured
  round-trip count against a seeded database.
- `check:query-projections` is **not wired into any composite `check:all`** — only into
  `package.json` as its own script. Whoever owns the gate manifest should add it.
- The `ACTIONABLE` tail is **40 files / 64 call sites**, up from 58 because the widening made more of
  the repo visible, not because anything regressed.
