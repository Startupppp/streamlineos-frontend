# 40 — PRD reconciliation against current source

**Measured 2026-09-03.** Frontend committed head `feaad0402` (branch `main`), backend committed head
`47a68ba2` (branch `main`), **plus 18 modified and 2 untracked files in the shared frontend working
tree** — see §1, which is the single most important finding in this report.

Every number below was produced by a command this pass actually ran. Where a claim could not be
re-derived it is marked **NOT-VERIFIED** with what it would take. Gates that were not run are
recorded as not run.

---

## 1. The release cannot currently be verified at one commit

`frontend/hooks/api/meetings-ai.ts` is **uncommitted** in the shared working tree and it does not
compile against its two consumers.

```
$HEAVY 2 -- pnpm -C .../streamlineos-frontend/frontend type-check
  -> exit 2, 12 errors in 2 files
```

All 12 errors are in `features/calendar/meeting-prep-panel.tsx` and
`features/calendar/meeting-follow-up-panel.tsx`. Cause, established by diffing the working tree
against `HEAD`:

| | committed `HEAD:frontend/hooks/api/meetings-ai.ts` | working tree |
|---|---|---|
| `useMeetingPrep` | exported (line 80) | **removed** |
| `streamMeetingPrep` / `readMeetingPrepSources` | absent | added |
| `MeetingFollowUpResult` | carries `subject`/`body`/`actionItems` | reshaped; those fields moved to a new `FollowUpDraft` |

The two panels were last touched on 2026-08-25 (`06ed7a642`) and still import `useMeetingPrep` and
read `.subject` / `.body` / `.actionItems` off `MeetingFollowUpResult`. The in-flight edit is AI-
streaming work (tickets 11/13 territory); the consumers were never updated with it.

Consequences measured this pass:
- frontend `type-check` **exit 2, 12 errors** (the release's headline claim of `0` is true of
  committed `HEAD`, which still exports the symbol the consumers import — it is **not** true of the
  tree on disk);
- frontend `check:dead-code` **exit 1**, flagging exactly the two new exports
  (`streamMeetingPrep`, `readMeetingPrepSources`) as unclassified — they have no consumer yet.

**A clean-`HEAD` typecheck was NOT run.** Proving committed `HEAD` is green needs a worktree, and
`git worktree` is outside the git verbs this ticket is permitted. The attribution above rests on
`git show HEAD:<path>` and `git diff`, which is sufficient to locate the cause but not to certify
`HEAD`. This is ticket 41's blocker, and it is not mine to fix.

**Not my territory.** Recorded as NEW, routed to whoever owns the AI-streaming change.

---

## 2. Recomputed counts — from disk, not carried forward

### 2.1 Ticket box census

Counted with `grep -c '^- \[x\]' / '^- \[ \]' / '^- \[~\]'` over
`.scratch/code-release-10-10/issues/*.md`, separating **acceptance** boxes (before the first `##`
section heading) from checkboxes used inside session/findings logs.

| | closed `[x]` | open `[ ]` | partial `[~]` | total |
|---|---:|---:|---:|---:|
| **Acceptance boxes** | **229** | **58** | **3** | **290** |
| Findings-log boxes (tickets 29, 35) | 6 | 0 | 0 | 6 |
| Raw grep over the whole files | 235 | 58 | 3 | 296 |

**Recomputed release position: 229 of 290 acceptance boxes closed (79.0%); 22 of 42 tickets fully
closed.**

The figure carried into this ticket — *235 of 293 closed, 23 of 42 tickets* — is wrong in three
independent ways, all in the same direction (flattering):

1. It counts **6 findings-log checkboxes as acceptance criteria**. Ticket 35 uses `- [x]` for five
   entries in its "Session S9b" narrative (lines 65–99) and ticket 29 for one. They are notes, not
   acceptance boxes.
2. It **omits ticket 28's three `- [~]` boxes entirely**. A `[~]` matches neither `- [x]` nor
   `- [ ]`, so a two-pattern census silently drops them. Ticket 28's own status line ("5 of 8
   closed") is correct; the release census was not.
3. Consequently it counts **ticket 28 as fully closed**. It is not — it has three partial boxes. The
   true fully-closed ticket count is **22**, not 23.

### 2.2 Status lines that disagree with their own boxes

Nothing checks this, so it was re-derived per ticket. One disagreement survives:

- **`21-efficient-database-call-contract.md`** — status line says *"3 of 9 closed"*; the file carries
  **2** `- [x]` and 7 `- [ ]`. The boxes are authoritative: **2 of 9**.

Two others look wrong under a naive grep and are in fact correct, and are recorded here so they are
not "fixed" into being wrong:
- **28** — "5 of 8" is right (`5 [x]` + `3 [~]`).
- **35** — "7 of 8" is right; the acceptance list holds 8 boxes (7 ticked), the extra 5 ticks are the
  findings log.

---

## 3. Gate sweep — every gate in both repos, actually executed

Both repos' full `check:*` sets were run this pass (excluding `:self-test`, `:baseline`, `:emit`,
`:run` variants), each `nice`d under a 400 s alarm.

```
backend  : 75 gates -> 61 exit 0 · 9 exit 1 (real failures) · 5 exit 2 (needs infrastructure)
frontend : 26 gates -> 19 exit 0 · 7 exit 1
```

**A methodology note worth keeping.** The first sweep reported `RC=127` for all 101 gates. That was
not 101 failing gates — macOS has no `timeout(1)`, so the wrapper itself failed to exec and every
result was fabricated. Re-run with `perl -e 'alarm shift; exec @ARGV'`. A sweep that reports a
uniform failure across every target is measuring itself, not the tree.

### 3.1 Backend failures (exit 1) — real

| Gate | Result |
|---|---|
| `check:dead-code` | 2 unclassified: `ai/core/streaming/index.ts:AiTextStreamProduct`, `ai/core/services/crm-brief-loaders.ts:loadLeadProfile`. knip itself: **0 unused files**, ledger 34 verdicts (32 REMOVE debt) |
| `check:unbounded-reads` | offset pagination **0**, unbounded reads **0** — the substance passes; fails on 1 stale + 1 unclassified classification entry (`crm/custom-fields`) |
| `check:db-call-count` | **10 STALE VERDICTs** against a ratchet of 2 — the ledger asserts the detector still matches 10 files it no longer matches |
| `check:over-300` | **400 files / baseline 394 — 6 above** |
| `check:placement-bypass` | 2 of 76 bypass sites not allowlisted (`audit-log.controller.ts:36`, `contacts.controller.ts:93`) |
| `check:lifecycle-predicates` | **76 primary reads, 1 above the baseline of 75** |
| `check:tenant-relationships` | target **mid-bootstrap, ledger 573 of 666** — the gate itself says "this number is not release evidence" |
| `check:vulnerabilities` | HIGH advisories incl. `fast-uri` GHSA-jqff-g426-hqxp |
| `check:licenses` | 1 disallowed: `LGPL-3.0-or-later` in `@img/sharp-libvips-darwin-arm64@1.3.2` (a darwin-arm64 platform binary; would not resolve in Linux CI) |

### 3.2 Backend exit 2 — infrastructure absent, recorded as NOT-VERIFIED, never as passing

`check:audit-log-privileges`, `check:module-lifecycle`, `check:replay-ledger` need
`APP_DATABASE_URL` / `COLD_DATABASE_URL`. `check:set-null-column-lists` reports **INCONCLUSIVE** with
274 constraints unverified — the honest-reporting requirement of §9/ticket 35 visibly working.
`check:alert-ack` needs an operator webhook drill: **DEFERRED-OPERATOR**.

### 3.3 Frontend failures (exit 1)

| Gate | Result |
|---|---|
| `check:routes` | **1 business route handler: `api/media/image/route.ts`** — see §4.1 |
| `check:properties` | same finding (it re-runs the routes scan) |
| `check:import-direction` | `shared-imports-feature: 20 violations (baseline 19) — **REGRESSED**`; `cross-feature-import: 194/194` at baseline |
| `check:command-catalog` | 1503 hooks; **4 against a baseline of 0** — 1 UNCLASSIFIED (`ai.ts:169`), 3 WRONG-KEY (`git-integration.ts` declares `integrations:git:manage`, contract requires `settings:manage`) |
| `check:dead-code` | 2 unclassified exports — both are the uncommitted §1 change |
| `check:file-sizes` | 3 files over 500 (`hr/cases/cases-page-content.tsx` 501, `notifications-inbox.test.ts` 663, `notifications-inbox.ts` 534) |
| `check:web-vitals-budget` | **2** violations, both TTFB, both with a recorded owner exception |
| `check:route-bundle-budget` | **17 breaches** across 12 measured routes |

---

## 4. PRD claims contradicted by the artifacts

### 4.1 A ticked PRD box the repo's own gate calls false

PRD §3, ticked, evidence line:

> *"Verified 2026-09-02: only `app/api/auth/[...nextauth]/route.ts` exists, no `lib/services/`, zero
> drizzle/postgres/neon imports in frontend source."*

On disk there are **two** route handlers, and `pnpm check:routes` **exits 1** naming the second:

```
app/api/auth/[...nextauth]/route.ts
app/api/media/image/route.ts      <- check:routes: "1 business route handler(s)"
```

The other two thirds of the evidence line are true and were re-verified: `lib/services/` is absent,
and drizzle/postgres/neon imports in frontend source are **0**.

`app/api/media/image/route.ts` (72 lines) is an authenticated image proxy: it Zod-parses one `key`,
requires `session.backendJwt`, forwards to `GET /storage/image` and hardens the content type. It
holds no business rule and touches no database, so the *criterion* — business logic stays backend-
side — is arguably satisfied. But the **evidence sentence is factually wrong**, and the repo's own
fail-closed gate is red on it. Recorded as **REGRESSED**: either the route earns an allowlist entry
in `check:routes` with the proxy justification, or it moves. It cannot stay red under a ticked box.

### 4.2 Every migration number in the PRD is stale

| Cited in the PRD | On disk 2026-09-03 |
|---|---|
| "635/635 applied", "the current chain has 635 entries" | journal holds **666** entries, **666** `.sql` files, **0** journalled-but-missing |
| ticked §4 evidence "applied=633 skipped=1 failures=0" | covers a former head — see §6 |
| "637 … and holds 639 now" | superseded twice over |

`check:migration-discipline`, `check:migration-chain` and `check:migration-ledger` are all **exit 0**,
and the build-breaking "journal names migrations HEAD does not contain" defect is **cleared** —
0 missing files. But `check:migration-ledger` reports **635 applied rows against 666 journal
entries — 31 pending**, and `check:tenant-relationships` finds its target at **573 of 666**. No
database this pass could reach is at head, so current-head bootstrap parity is **STILL PENDING**,
exactly as the PRD blocker says — only the numbers have moved.

### 4.3 Claims the artifacts show as better than the PRD records

These are stale in the *pessimistic* direction and should stop being cited as blockers.

| PRD text | Measured this pass |
|---|---|
| "Cross-tenant isolation declaration coverage currently fails: **921/923**" | `check:tenant-isolation` **exit 0, 929/929 (100%)** — resolved |
| "over-300 … regression is `kb-rag.service.ts` at 367 lines" | `kb-rag.service.ts` is **253** lines — that specific regression is fixed (the gate is red for other files, at 400/394) |
| "one dependency-proven dead file, `features/build/inbox/index.ts`, still to remove" | **removed** — the file does not exist |
| "six Web Vitals budgets still breach: mobile INP/FCP/TTFB and desktop LCP/FCP/TTFB" | **2** breach, both TTFB, both owner-attributed to `GET /me/access` |
| "a fail-closed frontend hard-500 gate is still required" | `check:file-sizes` **exists** on the frontend and is fail-closed (it is red on 3 files, which is the gate working) |
| ticked §10.18 "`check:client-pages` passes at **220** of a 304 ceiling" | **141 of 600 (23.5%)**, 163 below the ceiling |
| ticked §10.18 "`check:route-thinness` ratchet lowered 114 → **58**" | **IN SCOPE thick: 0** (baseline 0); 67 out-of-scope CRM/Inventory |
| "Tenant indexes: 745/745" | **840/840** |
| "3,483 files scanned … 12 registered exceptions" (hard-size) | **3,571** files, **7** exceptions |
| "216 module classes, 215 reachable" | **218** declared, **217** reachable, 0 unreachable |
| "backend processed 5,330 files and frontend 5,044" (cycles) | **5,528** / **5,264**, both zero cycles |

### 4.4 A report claim the gate contradicts

Ticket 35 records: *"`check:lifecycle-predicates` (ticket 06) — **fixed at source in S10. 76 → 75,
rc=1 → rc=0**."* Measured this pass: **exit 1, 76 primary reads, 1 above the baseline of 75.**
Either it regressed after S10 or the fix never held. Recorded as **REGRESSED** against a ticked box.

### 4.5 Two PRD "passes" that are now red

- *"Unbounded-read gate passes across 2,186 service files with zero actionable offsets"* — the
  substantive counters are still **0 and 0**, but the gate is **exit 1** on classification hygiene.
- *"Database-call classification passes with 37 classified loop-internal candidates and zero
  actionable call sites"* — **exit 1**, 10 stale verdicts against a ratchet of 2.
- *"Route bundles pass for all five measured routes"* — the gate now measures **12** routes and
  reports **17 breaches**, ten of them on in-scope routes (`/mail`, `/inbox`, `/dashboard`, `/chat`,
  `/calendar`, `/notifications`, `/settings`, `/build/inbox`, `/build/my-work`, `/support/inbox`).
- *"Command catalog: 1,504 mutation hooks with zero unclassified commands"* — **exit 1**, 4 against
  a baseline of 0.

---

## 5. Gates exist but never execute in CI

Both repos now put their gates in a `gates` job with **no `needs:`** — verified by reading the job
graphs (`streamlineos-backend/.github/workflows/ci.yml:98`,
`streamlineos-frontend/.github/workflows/frontend.yml:172`). Neither workflow declares `needs:` on
any job, so the historical "every gate sat behind a red Lint" defect is **closed**. The frontend
workflow's `working-directory: frontend` is correct; it does not target a nonexistent `backend/`.

Diffing the gates each `package.json` defines against the gate names each workflow invokes:

```
backend  : 75 defined, 73 wired, 2 NOT wired -> check:alert-ack, check:benchmark-manifest
frontend : 26 defined, 25 wired, 1 NOT wired -> check:properties
```

`check:alert-ack` is DEFERRED-OPERATOR by design. `check:benchmark-manifest` (ticket 23) and
`check:properties` are **NEW** findings: they are green/red on a developer's machine and have never
run in CI. `check:properties` matters most — it is currently **red**, and it duplicates the
`check:routes` finding in §4.1, so wiring it would block the branch today.

---

## 6. Superseded evidence — marked so it cannot be cited as current

| Artifact / claim | Covers | Why it is not current |
|---|---|---|
| PRD ticked §4 evidence "applied=633 skipped=1 failures=0", parity `differences=0` | a **633/634-entry** chain | journal is at **666**; the estate no longer exists in that state |
| `final-refactor/evidence/s02-bootstrap-parity.md`, `s02-tenant-integrity.md` | **634-entry** chain | already banner-marked superseded; name-keyed comparator; blind tenant gates |
| `bootstrap-head-637/` bundle | **637-entry** chain | 29 entries behind head; its own four caveats still apply |
| `scratch_perf_seed_stale_20260902` | pre-rebuild seed | retained only because report 22c cites it — **do not drop** |
| PRD verification-snapshot counts (§4.3 table above) | the **2026-09-02** tree | every count re-measured higher or lower this pass |

---

## 7. Deferred and operator-owned — never folded into a code claim

The **34** deferred production-readiness criteria (PRD "Deployed security, provider and performance"
6, "Cloud, recovery and operations" 12, "Compliance and approvals" 10, "Production-ready final gate"
6) remain **DEFERRED**. So do the operator actions: R2 bucket privacy for `R2_BUCKET_NAME` /
`R2_KB_BUCKET_NAME`, the support-channel secret rotation owed after the hashing migration, and
`check:alert-ack`'s human webhook drill. None of these is claimed as code-level done.

---

## 8. Commands run this pass

| Command | Exit | Number |
|---|---:|---|
| `pnpm -C streamlineos-backend typecheck` (via `heavy.sh`) | **0** | 0 errors |
| `pnpm -C .../frontend type-check` (via `heavy.sh`) | **2** | **12 errors, 2 files** |
| `pnpm -C .../frontend lint` (via `heavy.sh`) | **1** | 972 problems: **15 errors**, 957 warnings |
| `pnpm check:spec-typecheck` (backend) | **0** | passed |
| 75 backend `check:*` gates | — | 61 × 0 · 9 × 1 · 5 × 2 |
| 26 frontend `check:*` gates | — | 19 × 0 · 7 × 1 |
| `next build` | **NOT RUN** | — |
| backend/frontend Jest suites | **NOT RUN** | — |
| disposable-database E2E | **NOT RUN** | — |

### The 15 frontend lint errors, characterised

The brief's honest figure was 14; this pass measures **15** (the tree has moved). More useful than
the count is where they are — **none is in in-scope production code**:

- **12** `react-hooks/rules-of-hooks` inside `*.test.ts` files, all the same harness pattern
  (`captureXOptions()` calling a query hook to capture its options). Test-harness idiom.
- **2** in CRM (`features/crm/leads/leads-funnel-view.tsx`, `leads-toolbar.tsx`) — **excluded scope**.
- **1** in `features/landing/components/included-apps-grid.tsx` — **frozen landing visuals**;
  recorded, not fixed.

Lint is reported here because it was executed. It is not claimed as passing: it **exits 1**.

---

## 9. Module checklist table — recomputed, and its provenance found

The table's **Proven** column cannot be re-derived from the current PRD, because the header records
that completed checkboxes were deleted from the file. It can be re-derived from git, and this pass
did so.

**Provenance, verified.** The table was added by `731d688ab` ("docs: collapse completed architecture
sessions", −1,187 lines from the PRD). Its 18 rows are a verbatim per-subsection count of §10 at the
pre-collapse commit **`10c06d01c`**, whose §10 holds **18 subsections and 124 boxes** — confirmed by
`git show 10c06d01c:architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`. Today's §10 holds **27**
boxes (26 open, 1 ticked). So the table is auditable *only* against that commit, and every citation
of it is a citation of a **2026-09-02-or-earlier former head**.

### 9.1 Rows re-derivable from disk

| Row | Carried P/O/Cov | Recomputed | Why |
|---|---|---|---|
| Authentication/identity/organization | 5 / 2 / 71% | **6 / 1 / 86%** | PRD:306 is closed by ticket 19 box 34 `[x]` |
| Organization and module RBAC | 3 / 2 / 60% | **4 / 1 / 80%** | PRD:311 closed by ticket 19 box 21 `[x]` |
| Settings | 3 / 2 / 60% | **3 / 2 / 60%** (unchanged) | PRD:315 genuinely open; PRD:316 has **no owning ticket box** |
| **Payroll** | **3 / 3 / 50%** | **6 / 0 / 100%** | ticket 24 is **8 of 8 `[x]`** and covers all three PRD lines |
| Calendar | 6 / 2 / 75% | 6 / 2 / 75% (unchanged) | PRD:326 open by product decision; PRD:327 **unowned** |
| Inbox/mail | 3 / 2 / 60% | **4 / 1 / 80%** | PRD:332 closed by ticket 29 box 65 `[x]` |
| **Notifications** | 7 / 1 / 88% | **8 / 0 / 100%** | see 9.3 — the open box is satisfied in source |
| Knowledge/Wiki/Chatbot | 5 / 3 / 62% | **6 / 2 / 75%** | PRD:340 closed by ticket 29 box 81 `[x]` |
| **Frontend system-wide** | **2 / 4 / 33%** | **3 / 3 / 50%** | arithmetically stale: §10.18's ceiling box flipped to `[x]` in `e5fed52a8` and the table was never updated |

### 9.2 Rows that cannot be re-derived from disk at all

**Home (9), Directory/Me (5), HRMS (6), Build/PM (7), Workflows (5), Billing/payments (7),
Accounting/finance (5), Chat (10), Shared adapters (6)** — 60 "Proven" boxes.

For each: no remaining §10.x subsection in the PRD, **no ticket** in `issues/`, and **no report** in
`reports/`. Module-matrix tickets exist only for 19 (auth/RBAC/settings), 24 (payroll) and 29
(calendar/inbox/knowledge). Their `Open = 0` is trivially consistent; their `Proven` count rests
entirely on text that was deleted.

**What it would take:** either restore the removed `[x]` blocks from
`git show 10c06d01c:...` (which reproduces every carried number exactly and is the only reason the
table is auditable at all), or write a per-module ticket carrying box-level acceptance state as
tickets 19/24/29 do. Until then these nine rows are **NOT-VERIFIED**, not proven.

### 9.3 A PRD box that source contradicts

PRD:336 (Notifications) asks to *"Give the notification lifecycle mutations an `onError` and a
rollback."* `frontend/hooks/api/notifications-inbox.ts` carries **11 `onMutate` and 11 `onError`**
occurrences — a rollback pair for every optimistic mutation. The two mutations without `onError`
(approve/reject) are non-optimistic and only invalidate in `onSettled`, so they have nothing to roll
back. Ticket 29 box 78 asserts the same. Classified **VERIFIED DONE**; the PRD box is stale.

### 9.4 Structural defects in the table itself

1. **Five open PRD boxes have no owning ticket box**: PRD:316 (Settings queries/cache), PRD:327
   (Calendar provider-sync), PRD:336 (Notifications), PRD:342 (Knowledge frontend), and the six
   §10-preamble boxes PRD:296–301, which belong to **no table row and are counted nowhere**.
2. **Four ticket `[x]` boxes have no PRD counterpart**, so closing them can never move a row:
   ticket 19 box 36, ticket 29 boxes 122, 127, 132.
3. **`[~]` has no representation.** Ticket 28's three partial boxes cannot be expressed in a
   Proven/Open row at all.
4. **Rounding is inconsistent** — Notifications 7/8 → 88% (half-up), Knowledge 5/8 → 62% (floor).
5. **One gate, four recorded values.** Tenant-isolation coverage appears as `921/923` (PRD:44),
   `924/924` (ticket 29:137), `926/926` (ticket 19:7) and `928/928` (`reports/43-last-open-boxes.md`).
   **Measured this pass: `929/929` (100%), exit 0.** All five are honest readings at different
   minutes; only the last was executed today.

---

## 10. Classification of every PRD criterion

**Method, stated so it can be checked.** The PRD holds **205** checkboxes: **171 immediate**
(sections 1–12.3 = 165, plus the 6-box "Immediate code-level final gate") and **34 deferred**. Each
immediate criterion is classified from (a) a gate this pass executed, (b) the acceptance-box state of
the owning ticket counted from disk, and (c) direct artifact inspection. **PRD boxes and ticket boxes
are not 1:1** — §9.4 shows five PRD boxes with no ticket and four ticket boxes with no PRD box — so
where one ticket covers several PRD lines the allocation is judgment, and it is recorded as such
rather than presented as measurement.

| Class | Count | Share of 171 |
|---|---:|---:|
| **VERIFIED DONE** | **73** | 42.7% |
| **REGRESSED** | **14** | 8.2% |
| **STILL PENDING** | **77** | 45.0% |
| **NOT-VERIFIED** | **6** | 3.5% |
| **DEFERRED-OPERATOR** | **1** | 0.6% |
| Deferred production-readiness (untouched) | 34 | — |

### 10.1 Per-section breakdown

| PRD section | Boxes | Owner ticket(s) | DONE | REGR | PEND | N-V | DEF |
|---|---:|---|---:|---:|---:|---:|---:|
| 1. One-commit release verification | 4 | 41 (0/8) | 0 | 0 | 4 | 0 | 0 |
| 2. Module and folder architecture | 5 | 25, 29, 39 | 2 | 2 | 1 | 0 | 0 |
| 2.1 Repository hygiene | 15 | 36 (7/11) | 3 | 2 | 10 | 0 | 0 |
| 2.2 File cohesion / 500-line | 6 | 37 (8/8) | 4 | 2 | 0 | 0 | 0 |
| 2.3 Handler responsibility | 3 | 38 (5/6) | 2 | 0 | 1 | 0 | 0 |
| 3. TypeScript, Zod, contracts | 5 | 34, 36 | 1 | 3 | 1 | 0 | 0 |
| 4. Schema and migration quality | 8 | 01–06 | 5 | 0 | 3 | 0 | 0 |
| 4.1 Schema/key minimization | 8 | 07 (6/6), 08 (6/7) | 6 | 0 | 1 | 1 | 0 |
| 5. Query/pagination/cache | 4 | 20 (6/7) | 3 | 0 | 1 | 0 | 0 |
| 5.1 Efficient DB-call contract | 12 | 21 (**2/9**) | 2 | 2 | 8 | 0 | 0 |
| 6. Organization and module RBAC | 1 | 15 (5/6) | 0 | 0 | 0 | 1 | 0 |
| 7. NestJS route and worker | 6 | 19, 31, 38 | 3 | 0 | 3 | 0 | 0 |
| 7.1 Optimized route/transport | 13 | 22 (4/6), 34 (7/7) | 7 | 0 | 6 | 0 | 0 |
| 8. TanStack and Next.js data layer | 9 | 28 (5×`[x]`, 3×`[~]`) | 4 | 1 | 4 | 0 | 0 |
| 9. Operability/upload/verification | 5 | 31,32,33,34,35 | 3 | 0 | 1 | 0 | 1 |
| 10. Module matrix preamble | 6 | **none** | 0 | 0 | 6 | 0 | 0 |
| 10.1 Auth/identity/sessions/org | 2 | 19 | 1 | 0 | 1 | 0 | 0 |
| 10.2 Organization/module RBAC | 2 | 19 | 1 | 0 | 1 | 0 | 0 |
| 10.4 Settings and module access | 2 | 19 (partial) | 0 | 0 | 1 | 1 | 0 |
| 10.7 Payroll | 3 | 24 (**8/8**) | 2 | 0 | 1 | 0 | 0 |
| 10.13 Calendar | 2 | 29 (partial) | 0 | 0 | 1 | 1 | 0 |
| 10.14 Inbox and mail | 2 | 29 | 1 | 0 | 1 | 0 | 0 |
| 10.15 Notifications, email, push | 1 | **none** | 1 | 0 | 0 | 0 | 0 |
| 10.16 Knowledge Base/Wiki/Chatbot | 3 | 29 | 1 | 0 | 1 | 1 | 0 |
| 10.18 Frontend system-wide | 4 | 26,27,28,30 | 1 | 0 | 3 | 0 | 0 |
| 11. Application security and privacy | 8 | 14,15,17,18 | 6 | 0 | 1 | 1 | 0 |
| 12.1 Backend/database/cache budgets | 9 | 22, 23 (**2/8**) | 3 | 0 | 6 | 0 | 0 |
| 12.2 Next.js and perceived speed | 7 | 26 (6/7), 27 (7/7) | 4 | 2 | 1 | 0 | 0 |
| 12.3 AI gateway, retrieval, streaming | 10 | 09,10,11,12,13 | 7 | 0 | 3 | 0 | 0 |
| Immediate code-level final gate | 6 | 41, 42 | 0 | 0 | 6 | 0 | 0 |
| **Total** | **171** | | **73** | **14** | **77** | **6** | **1** |

### 10.2 The 14 REGRESSED items, named

| # | PRD criterion | Evidence |
|---|---|---|
| 1 | §2 zero cycles / import direction (**ticked**) | frontend `check:import-direction` **exit 1** — `shared-imports-feature: 20 (baseline 19) REGRESSED`. Cycles themselves are clean in both repos |
| 2 | §2 every frontend route has one canonical owner (**ticked**) | frontend `check:routes` **exit 1** |
| 3 | §2.1 dead-code analysis, zero unclassified | backend `check:dead-code` exit 1 (2 unclassified) |
| 4 | §2.1 remove unused files/exports | frontend `check:dead-code` exit 1 (2 unclassified) |
| 5 | §2.2 300-line ratchet | backend `check:over-300` **400 / baseline 394** |
| 6 | §2.2 hard-500 gate | frontend `check:file-sizes` exit 1 (3 files) |
| 7 | §3 strict TypeScript, no new `any` | frontend `type-check` **exit 2, 12 errors** (working tree, §1) |
| 8 | §3 reconcile backend/frontend contracts | `check:command-catalog` exit 1 — 4 vs baseline 0 |
| 9 | §3 no frontend `app/api` business logic (**ticked**) | `check:routes` exit 1 on `api/media/image/route.ts` |
| 10 | §5.1 max DB-call count per route | `check:db-call-count` exit 1 — 10 stale verdicts vs ratchet 2 |
| 11 | §5.1 no unbounded reads | `check:unbounded-reads` exit 1 (counters still 0/0; classification stale) |
| 12 | §8 gate queries by effective access | `check:command-catalog` — 3 WRONG-KEY in `git-integration.ts` |
| 13 | §12.2 route-level JS/payload budgets | `check:route-bundle-budget` exit 1 — **17 breaches**, 10 in-scope |
| 14 | §12.2 Core Web Vitals targets | `check:web-vitals-budget` exit 1 — 2 TTFB breaches (down from 6) |

Also **REGRESSED but not a PRD box**: `check:lifecycle-predicates` is **76 / baseline 75, exit 1**,
against ticket 35's record that it was "fixed at source in S10, rc=1 → rc=0".

### 10.3 The 6 NOT-VERIFIED items, and what each needs

| PRD criterion | What it would take |
|---|---|
| §4.1 catalog-side key/constraint minimization proof | a database at head. `check:set-null-column-lists` reports **INCONCLUSIVE**, 274 constraints unverified; needs `SET_NULL_GATE_DATABASE` |
| §6 BOLA/IDOR executable proof | the declaration half is green (**929/929**); the executable half is `check:tenant-isolation:run` + a booted API — **not run** |
| §10.4 Settings queries/cache (PRD:316) | no owning ticket box exists; needs an owner before it can be measured |
| §10.13 Calendar provider-sync/drift (PRD:327) | a **product decision** (local wins / provider wins / user-visible resolution), then implementation |
| §10.16 Knowledge frontend/TanStack/tests (PRD:342) | no owning ticket box exists; needs an owner |
| §11 signing/encryption-key rotation behaviour | deployed-key evidence; code-level half only |

Plus the **nine module rows in §9.2** (60 carried "Proven" boxes) which are NOT-VERIFIED as a set.

### 10.4 NEW findings — recorded, not fixed (not my territory)

| # | Finding | Severity | Territory |
|---|---|---|---|
| N1 | `frontend/hooks/api/meetings-ai.ts` uncommitted and inconsistent with its two consumers; frontend `type-check` **exit 2, 12 errors** | **P1 — blocks ticket 41** | AI streaming (11/13) |
| N2 | `check:benchmark-manifest` (backend) is defined but **wired to no CI workflow** — has never run in CI | P2 | ticket 23 / CI |
| N3 | `check:properties` (frontend) is defined but **wired to no CI workflow**, and is currently **red** | P2 | CI |
| N4 | `check:lifecycle-predicates` 76/75 exit 1, contradicting ticket 35's closure record | P2 | ticket 06 |
| N5 | `check:placement-bypass` — 2 of 76 bypass sites unallowlisted (`audit-log.controller.ts:36`, `contacts.controller.ts:93`) | P2 | audit-log / contacts |
| N6 | `check:licenses` exit 1 on `LGPL-3.0-or-later` in `@img/sharp-libvips-darwin-arm64` — a darwin-arm64 binary that would not resolve in Linux CI, so CI and local disagree | P3 | dependencies |
| N7 | `check:vulnerabilities` exit 1 — HIGH advisories including `fast-uri` GHSA-jqff-g426-hqxp | P2 | dependencies |
| N8 | Six §10-preamble PRD boxes (296–301) belong to no table row and no ticket — counted nowhere | P3 | PRD ownership |
| N9 | The module table's nine 100% rows rest on deleted text (§9.2) | P2 | PRD ownership |
| N10 | Ticket 21's `**Status:**` line says "3 of 9 closed"; its boxes say **2** | P3 | ticket 21 |

---

## 11. Cross-check against the two findings registers

The registers (`findings-register.md`, `findings-register-20-43.md`) and `ORCHESTRATION.md` were used
as the candidate list, not as evidence. Where a register verdict was cheap to re-measure, it was
re-measured. Results:

### 11.1 Register claims this pass CONFIRMED

| Register item | Claim | Measured 2026-09-03 |
|---|---|---|
| #204 / C13 | `check:over-300` backend 400 vs baseline 394, unowned | **400 / 394, exit 1** — identical |
| #203 | frontend `check:file-sizes` red on three files | **exit 1**, 3 files (501 / 663 / 534) |
| #205 | `check:dead-code` unclassified in **both** repos | **exit 1 both**, 2 unclassified each |
| #206 | `check:command-catalog` red on a stale contract snapshot | **exit 1**, 4 vs baseline 0 |
| #207 | `check:import-direction` frontend, genuine violation + gate bug; 194 below baseline once test harnesses are excluded | **exit 1** — `cross-feature-import: 194/194 at baseline`, but `shared-imports-feature: 20 vs 19` **REGRESSED** |
| #209 | `db-gates.yml` has never run anywhere; jobs are dispatch-only | **confirmed** — see §11.4 |
| C7 | frontend lint ≈14 real errors, none a CI inflation | **15 errors**, and none in in-scope production code (§8) |
| #177 | route JS budget breaches across the board | **17 breaches / 12 measured routes** |
| #152 | both remaining TTFB breaches are `GET /me/access` | **2 breaches**, both TTFB, both carrying that owner exception |

### 11.2 Register claims this pass found RESOLVED — stop citing them as open

| Register item | Claim | Measured 2026-09-03 |
|---|---|---|
| C16 / #73 | `check:tenant-indexes` **declaration side RED at 821/828**, open | **exit 0 — 840 tenant tables, 840 leading tenant indexes** |
| C15 | tenant-isolation coverage 924 → 926 → 928 | **929/929 (100%), exit 0** — a fifth value, and the current one |
| ORCH:167–202 | **release blocker**: HEAD's journal names six migrations (`1020`–`1025`) HEAD does not contain | **cleared** — 666 journal entries, 666 `.sql` files, **0 journalled-but-missing** |
| #250 / C23 | `policies.ts` TS7022 ranked the 3rd unowned blocker in one place, FIXED in another | backend `typecheck` **exit 0, 0 errors** — FIXED is correct |

### 11.3 A register claim this pass found NOT to hold

**C14 / #199 — `check:lifecycle-predicates`.** The register records it *"Fixed at source, rc=0,
baseline not raised"*, attributing the single extra read to `kb-tags.service.ts:88`.

Measured: **exit 1, 76 primary reads against a baseline of 75.** Two further facts:
- the cited path is wrong — the file is `src/modules/kb/core/kb-tags.service.ts`, not
  `src/modules/kb/kb-tags.service.ts`;
- running the gate with `--list`, **`kb-tags` appears nowhere** in the 76 primary-read candidates.

So the named fix did land, and the gate is *still* one over. Whether a different read regressed in or
the original attribution was wrong cannot be settled from the gate output, **because the baseline is
a bare count with no named list**. A count-based ratchet cannot attribute its own regression — which
is precisely why ORCHESTRATION recorded this one as "unowned, needs a bisect", and it still is.
Recorded as **NEW (N4)**, and as a gate-design finding: this ratchet should carry a named inventory.

### 11.4 Gates that do not gate anything

§5 reported 73 of 75 backend gates "wired". Reading the workflow triggers sharpens that number
downward.

`db-gates.yml` runs on **`schedule` (daily 04:00) and `workflow_dispatch` only — never on push or
pull request**, and its own header states the position plainly:

> *"NOT ENABLED ON PUSH OR PULL REQUEST ON PURPOSE. These jobs have never executed in any repository,
> so their green is unproven; wiring an unproven job as a required check is how a pipeline gets
> muted."*

Five backend gates are named **only** there: `check:migration-ledger`, `check:replay-ledger`,
`check:retention-coverage`, `check:set-null-column-lists`, `check:tenant-relationships`.
`ci.yml`'s `tenant-isolation` and `live-evals` jobs are likewise `if: schedule || workflow_dispatch`,
so `check:tenant-isolation:run` — the **executable** half of the cross-tenant proof — does not run on
a pull request either.

**Corrected CI position:**

| | defined | run on push/PR | schedule/dispatch only | wired nowhere |
|---|---:|---:|---:|---:|
| backend | 75 | **68** | 5 | 2 |
| frontend | 26 | **25** | 0 | 1 |

That is honest and it is also **not a defect** — the header's reasoning is sound, and the pre-existing
"every gate sat behind a red Lint" defect is genuinely closed (no `needs:` anywhere in either
workflow). But **7 backend gates and 1 frontend gate do not block a pull request today**, and the
frontend one (`check:properties`) is currently red. Ticket 41 should not read "73 wired" as "73
enforced".

### 11.5 Deferred-operator items, consolidated

The registers name **more** operator actions than the two this ticket was briefed on. All stay
**DEFERRED-OPERATOR** and none may be folded into a code-level claim:

1. **R2 bucket privacy** — remove public access from `R2_BUCKET_NAME` and `R2_KB_BUCKET_NAME`; closing
   evidence is an unauthenticated `curl -I` returning 401/403.
2. **The owner-role public-URL backfill** paired with it — `backfill-public-object-urls.mjs`, dry →
   apply → confirming dry. Exit 2 means "not visible to this role", never "nothing found". **Not
   executed anywhere.**
3. **Support-channel inbound-secret rotation**, owed since migration `1008` hashed them.
4. **Ed25519 signing-key rotation** (recommendation, unowned).
5. **`PLATFORM_ADMIN_USER_IDS` absent from the live `.env`** — `/blog/admin/*` is reachable by nobody.
6. **`AUTH_SIGNING_KEYS` / `NEXTAUTH_SECRET`** environment configuration.
7. **Regenerating `openapi.json`** — requires booting the app against the shared Neon database.
8. **Running `db-gates.yml` once by dispatch** and promoting the jobs that pass.
9. **Merging `origin/main`** — 3 backend and 4 frontend commits are not on the release branch.
10. **The first real CI run.** Every gate in both repos previously sat behind a red Lint; the wiring
    is fixed, but no run has yet proved it. This is ticket 41's, and it has not happened.

### 11.6 One register conclusion this pass did not re-test

Report 22c's finding that a route budget can **re-measure green with nothing fixed** (the
`GET /calendar/events` figure is time-dependent on wall-clock since seed) was **not re-tested** — it
needs a seeded database at a controlled age. It is the strongest reason not to read any single
`check:route-budgets` run as proof, and `check:route-budgets` was **exit 0** this pass. That exit 0
is reported here as *what the command returned*, not as evidence the budgets are met.

---

## 12. Addendum — state at the end of this pass

**N1 re-checked and still standing.** At the close of this pass
`frontend/hooks/api/meetings-ai.ts` is **still modified and uncommitted**, `useMeetingPrep` is still
absent from it, and `features/calendar/meeting-prep-panel.tsx` still imports that symbol. The
frontend working tree does not typecheck. 21 files are dirty in the frontend repo.

**A constitution change landed mid-pass and settles one criterion's status.**
`streamlineos-frontend/CLAUDE.md` §6 gained a measured entry for unused-symbol enforcement while this
reconciliation was running: `noUnusedLocals`/`noUnusedParameters` are absent from both tsconfigs and
`@typescript-eslint/no-unused-vars` is `warn` with `^_` ignore patterns; at
`["error", {args:"all", caughtErrors:"all"}]` the two repos hold **4,186 violations across 1,896
files**, of which **2,912 (69.6%) name a `_`-prefixed identifier** — they exist only because the
escape does. It records that `--noUnusedParameters` exempts `_`-prefixed parameters *by construction
with no off switch*, so tsc cannot enforce the rule at all.

This bears directly on **PRD §2.1 box 3** ("Enable and enforce TypeScript/ESLint unused-symbol checks
… Remove unused symbols instead of renaming them to `_`"). It is classified **STILL PENDING** above,
and that classification is now backed by a deliberate, measured decision rather than by absence of
work: like `noUncheckedIndexedAccess`, it is a **NEW REQUIREMENT needing an owner**, explicitly left
off for this release because a half-enabled flag would report "on" over a set it cannot see. Ticket
42 should carry both as accepted, owned residual risk — not as pending cleanup, and not as passing.

**What a reader of this report should not conclude.** Nothing here says the release is close to or far
from done; it says what is true on disk at `feaad0402` / `47a68ba2` on 2026-09-03. Three limits are
worth restating: the 73 VERIFIED DONE rest on gate exit codes and ticket box state, and a gate can be
green because it cannot see (this release has found that four separate times); the nine module rows in
§9.2 are unproven rather than proven; and no build, unit suite or end-to-end run was executed this
pass, so the three most expensive forms of proof remain outstanding and are ticket 41's.
