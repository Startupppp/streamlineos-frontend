# v2 ticket 01 — PRD traceability manifest (PRD-C017)

**Audit at current head, read-only.** No file in either repository was modified except this report.

| | |
|---|---|
| Frontend/root head | `7469d2789` on `release/code-10-10-v2` |
| Backend head | `2f37e1bb035006e5c03680497298ad62031e79d6` on `release/code-10-10-v2` |
| Date | 2026-09-03 |
| Prior report | none — evidence reconstructed from scratch |
| Verdict | **partially-met** — the mapping half is complete and measured; the *fail-closed* half has three demonstrated ways to go green over a real defect |

---

## 1. What I read, with numbers

| Corpus | Size | How measured |
|---|---:|---|
| Source PRD `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` | 664 lines, **232** checkbox lines | `grep -cE '^\s*- \[[ x]\] '` |
| — of those, id-bearing criteria `**[PRD-Cnnn]**` | **195** (all `[ ]`) | independent parser, `scratchpad/verify.mjs` |
| — of those, checkbox lines with **no** id | **37** (all `[x]`) | same |
| Traceability manifest `.scratch/code-release-10-10-v2/TRACEABILITY.md` | 247 lines, **195** table rows, **36** coverage rows summing to **195** | same |
| v2 ticket files `.scratch/code-release-10-10-v2/issues/` | **36** files, 36 distinct ticket numbers, **195** criterion lines, 195 distinct ids, **0** stray checkboxes | same |
| The gate `frontend/scripts/check-prd-traceability.mjs` | 269 lines, **17** distinct failure codes across **20** branches | read in full + `grep` |
| Its self-test `frontend/scripts/check-prd-traceability-self-test.mjs` | 198 lines, **10** cases (9 defects + 1 control), **9** distinct failure codes asserted | read in full |
| CI wiring `.github/workflows/frontend.yml` | 6 jobs, 48 `run:` steps, 1 workflow file | `check-gate-wiring` output |
| Superseded v1 ticket set `.scratch/code-release-10-10/issues/` | **43** files, 258 `[x]`, **38** `[ ]` still open | `grep -rc` |

**Executions taken (all real, all at this head):**

| Command | Result |
|---|---|
| `node frontend/scripts/check-prd-traceability.mjs` | **exit 0** — 195 criteria, 36 tickets, 195 manifest rows, 195 ticket criteria, 0 checked, 195 unchecked |
| `node frontend/scripts/check-prd-traceability-self-test.mjs` | **exit 0** — 10/10 cases |
| `node frontend/scripts/check-gate-wiring.mjs` | **exit 0** — 35 gates, 32 able to fail the job, all invoked by a `run:` step of a reachable job |
| Gate run from `/` and from `/tmp` | **exit 0** both — no absolute workstation path (PRD-C015 portability holds for this gate) |
| **21 planted-fixture runs** of my own (see §4) | 12 bite correctly, **4 go green over a real defect**, 5 confirm the control |

I did **not** trust the gate's own arithmetic. §3's mapping table is from an independent parser I wrote
(`scratchpad/verify.mjs`), reading the same three sources with its own regexes.

---

## 2. Per-criterion assessment

### PRD-C017 — *"PRD-to-ticket traceability: complete v2 ticket 01 and keep its manifest fail-closed so every PRD criterion has exactly one ticket owner, ticket-only criteria are rejected and the restored module evidence cannot disappear again."*

**Status: partially-met.** The criterion has four clauses. Three are met over the id-bearing corpus and
one is met only conditionally.

| Clause | Status | Evidence |
|---|---|---|
| "complete v2 ticket 01" | **met** | The manifest exists, is checked in, and is machine-enforced by `check:prd-traceability`, wired blocking at `.github/workflows/frontend.yml:517` in the `gates` job, which carries no `needs:`. `check-gate-wiring` confirms it is not `continue-on-error`. |
| "every PRD criterion has exactly one ticket owner" | **met over the id-bearing set, blind outside it** | Independently verified: 195 → 195 → 195, zero unowned, zero orphans, zero duplicates, zero owner disagreements, coverage totals exact. But the parser only *sees* lines matching `**[PRD-Cnnn]**` (gate line 62). 37 PRD checkbox lines carry no id. See F1. |
| "ticket-only criteria are rejected" | **met for the v2 tree** | `TICKET-ONLY` fires (self-test case 4, re-confirmed by me). Not enforced for the 38 open boxes in the superseded v1 tree, which no gate reads. See F7. |
| "the restored module evidence cannot disappear again" | **partially-met** | The ten ids are pinned by existence only, one of the ten is pinned by the self-test, and a two-line edit to the gate deletes any of the other nine with both self-test and gate green. See F2, F4. |

---

## 3. Dimension-by-dimension walk

**3.1 Is the mapping total?** Yes. Every one of the 195 id-bearing PRD criteria has a manifest row and a
ticket line. `in PRD not manifest: []`, `in PRD not ticket: []`.

**3.2 Is it injective?** Yes. 195 distinct ids across 195 ticket criterion lines; no id appears in two
ticket files; no id has two manifest rows.

**3.3 Is it surjective onto agreed scope?** Yes. `in ticket not PRD: []`, `in manifest not PRD: []`.
Every `PRD-C` id referenced anywhere else in either repository — 10 backend source files, 1 frontend test,
the workflow, and 14 sibling reports — falls inside `PRD-C001..PRD-C195`. The single out-of-range id
(`PRD-C999`) exists only as a deliberate self-test fixture.

**3.4 Are the ids stable and dense?** Yes. `PRD-C001..PRD-C195`, **no gaps, no duplicates**.

**3.5 Do the two sides say the same words?** Yes — `TEXT DRIFT` compares normalized text and finds none.

**3.6 Do the checkbox states move together?** Yes — 0 checked on both sides, `STATE DIVERGENCE` silent.

**3.7 Do the coverage totals match?** Yes. All 36 declared totals equal the ticket files' actual counts;
the 36 totals sum to 195.

**3.8 Are the ownership assignments substantively sane?** Spot-checked the 12 assignments that cross a
PRD section boundary (C053, C060, C064, C102, C103, C104, C136, C137, C138, C139, C144, C150). Every one
lands on a ticket whose subject genuinely covers it — e.g. C144 ("Home loads sections concurrently…")
sits in §12.1 *Backend budgets* but is owned by ticket 06 *Home*, which is correct. **No mis-assignment
found.** Note this is the one property the gate structurally cannot check: it only verifies the manifest
and the ticket file agree, and one author writes both.

**3.9 Is the gate reachable and blocking?** Yes. Blocking `run:` step, `if: ${{ !cancelled() }}`, in a
job with no `needs:`, in a workflow `check-gate-wiring` rules reachable. **But** the push trigger's
`paths:` filter excludes all three guarded files — F3.

**3.10 Is the gate bite-proven?** Partially. Its self-test asserts 9 of 17 failure codes. I exercised the
other 11 branches myself and **all 11 fire for the intended reason** — so they are unproven, not broken.
F6.

**3.11 Vacuity.** The gate carries explicit floors (`MIN_CRITERIA = 195`, `MIN_TICKETS = 36`, gate lines
45–46) and prints its corpus size on every run, which is the discipline `gate-corpus.mjs` documents. Both
floors bite (measured: 194 criteria → exit 1; 35 ticket files → exit 1). Their weakness is that nothing
outside the gate pins them — F2.

---

## 4. Planted-fixture measurements

Every run below used the gate's own `PRD_TRACEABILITY_ROOT` escape hatch against a temp-directory copy.
**No file in the repository was touched.**

### 4.1 Defects the gate catches (12 measured by me, beyond its 9 self-test cases)

| Planted defect | Result |
|---|---|
| `DUPLICATE PRD` — the same id declared twice | exit 1, correct reason |
| `ORPHAN` — `PRD-C777` referenced in prose, declared nowhere | exit 1, correct reason |
| `MANIFEST-ONLY` — a manifest row for a non-existent criterion | exit 1, correct reason |
| `MANIFEST ASSIGNS AN ABSENT CRITERION` | exit 1, correct reason |
| `RESTORED EVIDENCE UNOWNED` — C127 dropped from ticket 12 only | exit 1, correct reason |
| `COVERAGE ROW FOR A MISSING TICKET` — a `Ticket 37` row | exit 1, correct reason |
| `COVERAGE ROW MISSING` — ticket 12's total deleted | exit 1, correct reason |
| manifest file deleted (`readOrDie`) | exit 1, correct reason |
| `VACUITY FLOOR` on the **ticket** count (35 files) | exit 1, correct reason |
| `DUPLICATE OWNER` across two **ticket files** (the untested sibling branch) | exit 1, correct reason |
| `UNOWNED` — no ticket carries a criterion, manifest row intact (the untested sibling branch) | exit 1, correct reason |
| One criterion deleted from PRD + manifest + ticket together (the PRD header's own "remove completed items" flow) | exit 1, `VACUITY FLOOR` — **the floor is what stops this** |

### 4.2 Defects the gate passes — measured, reproducible

| # | Planted defect | Gate |
|---|---|---|
| **H1** | A completed id-less criterion **regresses**: PRD line 418 `- [x] Give the notification lifecycle mutations an onError and a rollback` flipped to `- [ ]` | **exit 0** |
| **H2** | A **brand-new** unchecked criterion added with no id and no owner: `- [ ] Ship the payroll bank-batch natural key before cutover.` | **exit 0** |
| **H3** | `PRD-C127` **repurposed** from "Chat evidence" to "Support evidence" in the PRD and ticket 12 in one edit | **exit 0** |
| **H4** | The manifest's own headline falsified from "Exactly **195** … **36** execution tickets" to "Exactly **42** … **7**", rows untouched | **exit 0** |

### 4.3 The disarm path — the sharpest result

Two lines edited **in the gate itself**: `MIN_CRITERIA` 195 → 194, and the map entry
`"PRD-C115": "Home",` deleted. Then `PRD-C115` (Home's restored module evidence) was deleted from the
PRD, the manifest and `06-home-self-service.md`.

```
disarmed SELF-TEST exit = 0        (10/10 cases still "PASS")
disarmed GATE      exit = 0        ("PASS — every criterion has exactly one owner")
criteria remaining in disarmed PRD: 194
PRD-C115 occurrences in PRD / manifest / ticket 06: 0 / 0 / 0
```

The self-test stays green because its only restored-evidence case targets `PRD-C127`, which is still
pinned. **Nine of the ten restored module-evidence criteria are removable this way** — Home,
Directory/Me, HRMS, Build/PM, Workflows, Billing/Payments, Accounting/Finance, Notifications and shared
adapters. That is the exact failure the criterion says must not recur: 60 carried "Proven" boxes once
rested on deleted text.

---

## 5. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P1** | `frontend/scripts/check-prd-traceability.mjs:62` | Ownership is enforced only over checkbox lines carrying a `**[PRD-Cnnn]**` id; 37 PRD checkboxes carry none, so an unchecked criterion can exist with no owner and a green gate |
| F2 | **P1** | `frontend/scripts/check-prd-traceability.mjs:45,49-60` | The vacuity floor and the restored-evidence pin are unpinned constants in the gate itself, and the self-test pins only 1 of the 10 restored ids |
| F3 | P2 | `.github/workflows/frontend.yml:9-15` | The push trigger's `paths:` filter excludes all three files the gate guards |
| F4 | P2 | `frontend/scripts/check-prd-traceability.mjs:225-235` | `RESTORED_MODULE_EVIDENCE`'s module names are used only in failure strings, never asserted against the criterion text |
| F5 | P2 | `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:15` | The PRD's own headline says "138 unchecked"; the file holds 195. Nothing checks either document's self-reported counts |
| F6 | P2 | `frontend/scripts/check-prd-traceability-self-test.mjs:59-160` | 8 of the gate's 17 failure codes are never bite-proven (all 8 verified working by hand here) |
| F7 | P2 | `.scratch/code-release-10-10/issues/` (43 files) | 38 unchecked acceptance boxes survive in the superseded v1 tree; no gate reads that directory |

### F1 — a criterion without an id is invisible to the gate (P1)

`frontend/scripts/check-prd-traceability.mjs:62`

```js
const PRD_LINE = /^\s*- \[([ x])\] \*\*\[(PRD-C\d{3})\]\*\* (.+?)\s*$/;
```

A PRD checkbox line that does not match this is not a criterion as far as the gate is concerned. It is
not counted toward `MIN_CRITERIA`, gets no `UNOWNED`, and cannot fail anything. Measured at head: **37 of
the PRD's 232 checkbox lines carry no id** — currently all `[x]`, which is why the mapping is clean today.

**Failure scenario (measured, H1).** PRD line 418 records `- [x] Give the notification lifecycle
mutations an onError and a rollback.` A later ticket finds the rollback regressed and flips it to `- [ ]`
— the honest edit. The PRD now holds an unchecked acceptance criterion with no id, no manifest row and no
owning ticket. `check:prd-traceability` exits **0** and prints "PASS — every criterion has exactly one
owner". The manifest's own line 8 — *"Every unchecked source criterion has one stable ID and exactly one
owner below"* — is now false while the gate certifies it true. Measured identically for H2, a
newly-authored id-less criterion.

This is precisely the defect class the gate's own docstring (lines 5–9) says it exists to close — *"five
PRD boxes ended with no owner"* — left open for the next one.

**Proposed fix.** After the two existing PRD passes, add a third: any line matching
`/^\s*- \[[ x]\] /` in the PRD that does not match `PRD_LINE` fails with a new `UNIDENTIFIED CRITERION`
code naming the line number. To land it without a 37-line diff on day one, allowlist the 37 current
`[x]` lines by line content in a frozen `LEGACY_UNIDENTIFIED` set and fail on any *unchecked* line that
lacks an id plus any new checked one — so the existing 37 are pinned as-is (they can be ticked, never
un-ticked or grown) and every future criterion must carry an id. Add a self-test case per branch.

### F2 — the floor and the restored-evidence pin can be disarmed in the same commit (P1)

`frontend/scripts/check-prd-traceability.mjs:45` and `:49-60`

```js
const MIN_CRITERIA = 195;
const MIN_TICKETS = 36;
...
const RESTORED_MODULE_EVIDENCE = { "PRD-C115": "Home", ... , "PRD-C136": "Shared adapters" };
```

Both are constants in the file being enforced, and nothing outside the file pins either. The self-test's
vacuity case drops 20 criteria, so it still passes at any floor ≥ 176; its restored-evidence case names
only `PRD-C127`, so the other nine map entries are unprotected.

**Failure scenario (measured, §4.3).** A commit lowers `MIN_CRITERIA` to 194, deletes
`"PRD-C115": "Home",` from the map, and deletes `PRD-C115` from the PRD, the manifest and
`06-home-self-service.md` — the tidy-up the PRD's own header invites ("completed checklist items … were
removed"). `check:prd-traceability:self-test` exits **0** with 10/10, `check:prd-traceability` exits
**0**, CI is green, and Home's restored module evidence is gone from the file for the second time.
Repeatable for Directory/Me, HRMS, Build/PM, Workflows, Billing/Payments, Accounting/Finance,
Notifications and shared adapters.

**Proposed fix.** Two changes, both in the self-test so the gate cannot silently shrink its own mandate:
(1) replace the single `PRD-C127` case with a loop over `RESTORED_MODULE_EVIDENCE`'s keys imported from
the gate, so removing *any* entry from the map removes a passing case and the count `10/10` changes —
and assert the map has exactly 10 entries; (2) parse `Exactly **N** unchecked PRD criteria are assigned
to **M** execution tickets` out of `TRACEABILITY.md` and assert `MIN_CRITERIA >= N` and
`MIN_TICKETS >= M`, so lowering a floor requires editing the manifest's headline in the same commit,
where a human reviewer sees it. (2) also closes F5's manifest half.

### F3 — the workflow does not trigger on the files the gate guards (P2)

`.github/workflows/frontend.yml:9-15`

```yaml
on:
  push:
    branches: [main]
    paths:
      - frontend/**
      - .github/workflows/frontend.yml
  pull_request:
    branches: [main]
```

The three guarded paths are `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`,
`.scratch/code-release-10-10-v2/TRACEABILITY.md` and `.scratch/code-release-10-10-v2/issues/**` — **none
is under `frontend/**`**.

**Failure scenario.** A push to `main` that edits only the PRD (say, deleting a criterion) starts no job
at all, so the traceability gate never runs on the change it exists to police. `check-gate-wiring` cannot
see this: it checks `branches:` reachability, not `paths:`.

Mitigating: `pull_request` carries no `paths:` filter, so any PR into `main` does run the gate. Whether
that closes the hole depends on branch protection — **NOT MEASURED**, it requires GitHub repository
settings I cannot read from here.

**Proposed fix.** Add `architecture-refactor/**` and `.scratch/code-release-10-10-v2/**` to the push
`paths:` list. Optionally extend `check-gate-wiring` to compare each gate's read paths against its
workflow's `paths:` filter, which would make this class of hole detectable rather than noticed.

### F4 — the restored-evidence pin checks existence, not identity (P2)

`frontend/scripts/check-prd-traceability.mjs:225-235`

```js
for (const [id, moduleName] of Object.entries(RESTORED_MODULE_EVIDENCE)) {
  if (!prd.has(id)) fail(`RESTORED EVIDENCE DELETED: ${id} (${moduleName}) ...`);
  if (!ticketCriteria.has(id)) fail(`RESTORED EVIDENCE UNOWNED: ${id} (${moduleName}) ...`);
}
```

`moduleName` is interpolated into two failure strings and never compared to anything. The ten criteria do
name their module in their text (`Reconstruct current-head Chat evidence …`), but nothing requires it.

**Failure scenario (measured, H3).** One commit rewrites `PRD-C127` from "Reconstruct current-head **Chat**
evidence …" to "Reconstruct current-head **Support** evidence …" in the PRD and in
`12-chat.md` together. `TEXT DRIFT` is silent because both sides changed. The id survives, so the pin is
satisfied. Chat's restored module evidence has been repurposed away and the gate exits **0**.

**Proposed fix.** Assert `normalize(prd.get(id).text).toLowerCase().includes(moduleName.toLowerCase())`
for each entry (with an explicit alias for `Directory/Me` and `Billing/Payments`, whose slashes will not
appear verbatim). That turns the map's values from documentation into the assertion the docstring already
claims they are.

### F5 — the PRD's own headline counts are wrong and unchecked (P2)

`architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:15`

> "The immediate PRD below now shows **37 checked and 138 unchecked aggregate criteria**."

Measured at head: **37 checked and 195 unchecked**. Line 16's "Deferred production/compliance criteria
remain **34 open**" does not reconcile the difference either — tickets 32–36 own 36 criteria, and no
subtraction of sections reaches 138 (195 − 17 = 178; 178 − 34 = 144; 195 − 17 − 36 = 142). Line 4's
"Last reconciled … against committed heads `4ade571fa` / `7ba91e37`" is also stale — `4ade571fa` is a
real ancestor, but head is `7469d2789`.

**Failure scenario.** A reader (or the next reconciliation pass) trusts line 15, sizes the remaining work
at 138 criteria, and under-scopes the release by 57. The manifest's own headline is checked by nobody
either: falsifying it to "Exactly **42** … **7** execution tickets" leaves the gate at exit **0**
(measured, H4).

**Proposed fix.** Parse both headline numbers — the PRD's `**N** checked and **M** unchecked` and the
manifest's `Exactly **N** unchecked … **M** execution tickets` — and fail on disagreement with the parsed
counts. Then correct line 15 to `37 checked and 195 unchecked` and line 4 to the release SHAs in the same
commit that closes this ticket.

### F6 — 8 of 17 failure codes are never bite-proven (P2)

`frontend/scripts/check-prd-traceability-self-test.mjs:59-160`

The gate emits 17 distinct failure codes across 20 branches. The self-test asserts 9:
`UNOWNED`, `DUPLICATE OWNER`, `TICKET-ONLY`, `TEXT DRIFT`, `STATE DIVERGENCE`, `OWNER DISAGREEMENT`,
`RESTORED EVIDENCE DELETED`, `COVERAGE MISMATCH`, `VACUITY FLOOR`. Never exercised:
`DUPLICATE PRD criterion`, `ORPHAN`, `MANIFEST-ONLY`, `MANIFEST ASSIGNS AN ABSENT CRITERION`,
`RESTORED EVIDENCE UNOWNED`, `COVERAGE ROW FOR A MISSING TICKET`, `COVERAGE ROW MISSING`, and the
`readOrDie` missing-file path. Three further branches share a code with a covered sibling and are
therefore also unproven: `DUPLICATE OWNER` across ticket files, `VACUITY FLOOR` on the ticket count, and
the second `UNOWNED` branch.

**This is unproven, not broken.** I exercised all 11 and **every one fires for the intended reason**
(§4.1). The finding is that nothing keeps it that way — this repo's own history (`check:over-300`'s
self-test that asserted only its own constants, the backend gates whose only mention was their
`:self-test`) is what makes an unexercised branch a liability rather than a nit.

**Proposed fix.** Add the 8 missing cases. Each is 4–6 lines and mirrors a mutation in §4.1.

### F7 — 38 open acceptance boxes survive in a tree no gate reads (P2)

`.scratch/code-release-10-10/issues/` — 43 files, 258 `[x]`, **38 `[ ]`**

The manifest's line 5 asserts *"Existing `.scratch/code-release-10-10/issues/` tickets remain historical
evidence and do not own unfinished work."* That is a declaration, not a check: the gate's `ISSUES_DIR`
(line 40) points at the v2 directory only.

**Failure scenario.** The 38 open boxes are literally ticket-only acceptance work — e.g.
`41-one-commit-release-verification.md:9` "Disposable-database end-to-end runs for Organization/RBAC,
Home, Settings, HRMS, Payroll…" and `15-bola-idor-sweep.md:57` "Every object-addressable route is probed
with an id belonging to another organization and returns 404." Each *appears* to be covered by a v2
ticket (31, 22), but no artifact records that mapping and no gate enforces it, so a v1 requirement with
no v2 counterpart would be indistinguishable from one that has been superseded. This is the same shape as
the historical defect the manifest cites: *"four ticket boxes without a PRD counterpart."*

**Proposed fix.** Cheapest honest option: add a `V1_SUPERSEDED` assertion to the gate that the v1 tree
contains no `- [ ]` line, and in the same commit either tick each of the 38 with a pointer to the v2
criterion that absorbed it, or add a one-line `SUPERSEDED BY PRD-Cnnn` annotation per box. Either makes
the "do not own unfinished work" claim checkable.

---

## 6. What head already gets right

Stated plainly, because the mapping half of this ticket is genuinely done and measured:

- **The mapping is total, injective and verbatim.** 195 → 195 → 195 with zero unowned, zero ticket-only,
  zero manifest-only, zero duplicate owners, zero owner disagreements, zero text drift, zero state
  divergence, and 36 coverage totals that are all exactly right. Verified with an independent parser, not
  by trusting the gate.
- **Ids are stable and dense** — `PRD-C001..PRD-C195`, no gaps, no reuse. Every `PRD-C` reference anywhere
  in either repository (10 backend source files, a frontend test, the workflow, 14 sibling reports) is
  in range.
- **The gate is real, blocking and reachable.** A `run:` step in a job with no `needs:` — deliberately
  moved out of the `frontend` job after it was measured that ten gate steps sequenced below a red Lint
  had never executed. It is not `continue-on-error`; `check-gate-wiring` confirms this independently.
- **The self-test carries a control case** (`control — the real tree passes`), without which a
  permanently-failing gate would score 10/10. This is the correct construction and most gates in this
  repo did not have it until recently.
- **The gate declares vacuity floors and prints its corpus size on every run** — 195 criteria, 36 tickets,
  195 manifest rows — so "0 violations" and "nothing to check" are distinguishable, which is the exact
  lesson `gate-corpus.mjs` records.
- **The floors bite.** Any *net* deletion of a criterion is caught: deleting one from all three files
  together drops the count to 194 and fails. The tidy-up flow the PRD's header invites cannot silently
  shrink the corpus without also editing the gate.
- **PRD-C015 portability holds for this gate.** It resolves everything from `fileURLToPath(import.meta.url)`,
  contains no absolute workstation path, and exits 0 identically from `/`, `/tmp` and the repo.
- **The escape hatch is honest.** `PRD_TRACEABILITY_ROOT` exists so the self-test can point the gate at a
  mutated fixture; it is never set in normal operation, and it is what let me audit this ticket without
  writing to the tree.
- **The assignments are substantively correct**, including all 12 that cross a PRD section boundary.

Minor, non-findings: `readdirSync(ISSUES_DIR)` at line 128 is not wrapped in `readOrDie`, so a missing
issues directory throws a stack trace rather than the gate's own message — it still fails closed. Two
ticket files sharing a two-digit prefix would reset `actualCoverage` at line 136 and lose the first
file's count — also fails closed, via `COVERAGE MISMATCH`.

---

## 7. Blocked on infrastructure

- **Branch protection on `main`** — not readable from this environment. It determines whether F3's
  push-`paths:` gap is actually reachable, or whether every change must arrive through a PR (where the
  gate does run). Measure with `gh api repos/:owner/:repo/branches/main/protection` and check that
  `Every PRD criterion has exactly one ticket owner` is a required status check.
- **GitHub Actions run history** — I verified the gate is wired and that it passes locally at this head.
  I did not observe a CI run at `7469d2789`. Measure with `gh run list --workflow frontend.yml --branch release/code-10-10-v2`.
- Nothing else. This ticket needs no database, no build, no test suite. All 21 fixture runs, the gate, the
  self-test and `check-gate-wiring` are pure file reads and cost under a second each.

---

## 8. Recommended close-out for this ticket

`PRD-C017` should stay `[ ]` in both the PRD and `01-prd-traceability-manifest.md` until F1 and F2 land —
those two are the "fail-closed" clause, and both are demonstrated, not theorised. F3–F7 are worth taking
in the same change because they are all small and all in the same three files.

When it does close, the ticket's own completion evidence asks for SHAs, commands, counts and artifact
locations. This report supplies them for the audit; the completion commit should additionally record the
new self-test case count (10 → 18 if F2 and F6 are taken in full) and correct PRD lines 4 and 15 in the
same commit, per the manifest's own rule that source and ticket state change together.
