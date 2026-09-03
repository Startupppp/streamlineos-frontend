# Ticket 28 — File cohesion and named handlers — audit at head

**Audited:** 2026-09-03
**Frontend head:** `886c19f2becf0ef50a71d342ea53bbc1eb3443a7` (`release/code-10-10-v2`)
**Backend head:** `87131fab5da1ea1bc1d6bd6fdb59cd4316f2f32b` (`release/code-10-10-v2`)
**Prior report:** none. This is a from-scratch reconstruction.
**Nature of this pass:** READ-ONLY. No source file was edited. This report is the only write.

**Verdict: PARTIALLY MET.** 3 of 11 criteria met, 3 partially met, 5 not met.
**Two of the four ticket-28 gates are RED at head** (`streamlineos-backend check:file-sizes`
exit 1, `check:over-300` exit 1) and neither appears on the shared-context list of six known
backend failures, so neither is covered by the concurrent repair wave.

---

## 1. What I actually read, with numbers

### Gates in scope for this ticket (4 gates + 4 self-tests, all run at head)

| Repo | Gate | Command | Exit | Result |
|---|---|---|---|---|
| frontend | `check:file-sizes` | `node scripts/check-file-sizes.mjs` | **0** | 5,357 files scanned, all ≤500, 0 exceptions registered; 2 CRM/Inventory files over 500 reported separately |
| frontend | `check:file-sizes:self-test` | `… --self-test` | 0 | 45 passed |
| frontend | `check:over-300` | `node scripts/check-over-300.mjs` | **0** | 515 of 5,352 over 300 (baseline 516) |
| frontend | `check:over-300:self-test` | `… --self-test` | 0 | 26 passed |
| frontend | `check:named-handlers` | `node scripts/check-named-handlers.mjs` | **0** | 3,858 files · 1,474 inline closures in JSX event props · 44 non-trivial excluded by scope · 0 in-scope violations |
| frontend | `check:named-handlers:self-test` | `… --self-test` | 0 | 33 passed |
| frontend | `check:route-thinness` | `node scripts/check-route-module-thinness.mjs` | 0 | 588 route modules, 0 in-scope thick, 67 out-of-scope thick |
| frontend | `check:route-thinness:self-test` | `… --self-test` | 0 | 9 fixtures passed |
| frontend | `check:gate-wiring` | `node scripts/check-gate-wiring.mjs` | 0 | 35 gates, 32 able to fail the job, all invoked by a reachable `run:` step |
| **backend** | **`check:file-sizes`** | `node src/scripts/check-file-sizes.mjs` | **1** | `src/scripts/check-referential-action-drift.ts: stale line count — registered 596, actual 606` |
| backend | `check:file-sizes:self-test` | `… --self-test` | 0 | 49 passed |
| **backend** | **`check:over-300`** | `node src/scripts/check-over-300.mjs` | **1** | `395 files exceed 300 lines — 3 above baseline of 392` |
| backend | `check:over-300:self-test` | `… --self-test` | 0 | 15 passed |

Both backend failures were re-run twice and confirmed. `git status --porcelain` for
`src/scripts/check-referential-action-drift.ts`, `src/scripts/check-over-300.mjs`,
`architecture-refactor/final-refactor/issues/file-size-exceptions.md` and
`frontend/scripts/file-size-exceptions.md` is **empty** — this is committed head state, not
another agent's uncommitted work in the shared tree.

CI wiring confirmed: `frontend.yml:454/478/498/631` and backend `ci.yml:843/861` all invoke
these gates with `run:` steps, so both backend failures would be red in CI.

### Corpus enumerated

**Backend (`streamlineos-backend`, `.claude/worktrees/**` excluded as stale worktrees):**

| Dimension | Count |
|---|---|
| `.ts/.tsx/.js/.mjs` files over 500 lines, whole repo | **112** |
| …of those, inside the gate's scan class (`src/**/*.ts`, not `.d.ts`/`.spec.ts`/`.e2e-spec.ts`) | **8** (all 8 registered) |
| …`.mjs`/`.js` over 500 — invisible to the gate | **49** |
| …`*.spec.ts`/`*.e2e-spec.ts` over 500 — invisible to the gate | **51** |
| …`.ts` outside `src/`, non-spec — invisible to the gate | **4** |
| Gate-scannable corpus (`src/**/*.ts` minus d.ts/spec) | 3,654 files |
| Files over 300 lines in that corpus | **395** (baseline 392) |
| Controllers (`*.controller.ts`, non-spec) | **550** |
| Route handlers (`@Get/@Post/@Put/@Patch/@Delete` methods) | **3,644** |
| Services (`*.service.ts`, non-spec) | 1,078 |
| Modules under `src/modules/` | 74 |
| `@OnEvent` / `@Processor` / `@Process(` consumers | **0** (outbox pattern used instead) |
| Numbered-fragment filenames (`*-1.ts`, `*part2.ts`, …) | **0** |
| Pure re-export files | 31 (25 are `index.ts`, 6 non-index) |

**Frontend (`streamlineos-frontend/frontend`):**

| Dimension | Count |
|---|---|
| Files scanned by `check:file-sizes` | 5,357 |
| In-scope authored files over 500 lines | **0** |
| CRM/Inventory files over 500 (reported separately, out of release scope) | **2** |
| `scripts/*.mjs` over 500 lines — excluded by a directory-wide exclusion | **12** of 44 |
| Files over 300 lines | 515 of 5,352 (baseline 516) |
| `.tsx`/`.jsx` files walked by `check:named-handlers` | 3,858 |
| Inline closures in `on*` JSX props | **1,474** total, **1,261 in release scope** |
| `on*` JSX props holding a call expression (bound rule) | 615 |
| Named `handle*` declarations in scope | **3,587** |
| `useCallback` declarations in scope | **3,847** |
| `form.handleSubmit(<inline closure>)` occurrences | **0** |
| `action={<inline closure>}` occurrences | **0** |
| Numbered-fragment filenames | **0** |
| Pure re-export files under `app/components/features/hooks/lib` | 53 (47 `index.*`, 6 non-index) |

Files read in full or in the relevant span (37 source files):
all 8 registered backend exception files; `check-file-sizes.mjs` ×2 repos;
`check-over-300.mjs` ×2; `check-named-handlers.mjs`; `check-route-module-thinness.mjs`;
`check-repo-paths.mjs`; both exception registries; `eslint.config.mjs`; both CI workflows;
`chat-assistant.controller.ts`, `hr-send-email.controller.ts`, `storage-kb.controller.ts`,
`storage-vault.controller.ts`, `storage-onboarding.controller.ts`,
`projects-tickets.service.ts`, `projects-tickets-update.service.ts`,
`projects-tickets-query.service.ts`, `ticket-core.ts`, `filter-command-menu.tsx`,
`persona-chip-strip.tsx`, `quick-create-button.tsx`, `use-kanban-drag.ts`, and the six
non-index re-export shells in each repo.

Four purpose-built AST scanners (TypeScript compiler API, not regex) were run over the two
corpora; they live in the session scratchpad, not in either repo.

---

## 2. Per-criterion assessment

### PRD-C013 — rollup: named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains
**PARTIALLY MET.** C044 is met; C042/C039/C108 are partially met; C038, C040, C041, C043 and
C046 are not met. Meaningless wrapper chains do exist and are measured below (24 handler→handler
chains, 219 provably-pointless `useCallback`s).

### PRD-C038 — repository-wide 500-line default for production, frontend, backend, shared-package, worker, **script and test** files (`.ts`, `.tsx`, `.js`, `.mjs`), scanning every applicable workspace with a vacuity floor
**NOT MET.** The criterion names four extensions and seven file classes. Neither gate covers them.

*Backend* — `src/scripts/check-file-sizes.mjs:135-143` selects only
`extname(entry) === ".ts"` under `src/`, excluding `.d.ts`, `*.spec.ts`, `*.e2e-spec.ts`.
Consequence, measured: of the **112** authored backend files over 500 lines, the gate can see
**8**. It cannot see 49 `.mjs`/`.js` files, 51 spec files, or 4 `.ts` files outside `src/`.
The largest unscanned file is `src/scripts/check-module-di.mjs` at **1,969 lines**, and
`src/scripts/check-file-sizes.mjs` — the enforcer itself — is **575 lines**, exempt from the
limit it enforces purely because of its own extension filter.

*Frontend* — `scripts/check-file-sizes.mjs:47` adds `EXTRA_EXCLUDED_DIRS = {"public",
"scripts", "contracts", "dist"}`. `scripts/` holds 44 authored `.mjs` gate scripts, **12 of
them over 500 lines** (up to `check-permission-route-binding.mjs` at 1,557). The frontend does
scan tests, and its header documents that decision honestly.

*Vacuity floor* — the backend floor is credible (`MIN_FILES = 2000` against 3,654 scanned =
55%, plus a `REQUIRED_SUBTREES = ["modules","common","db","scripts"]` backstop, and
`collectFiles` **throws** on an unreadable directory with a comment explaining why). The
frontend floor is not: `MIN_FILES = 200` against 5,357 scanned = **3.7%**, no required-subtree
backstop, and `collectFiles` at `scripts/check-file-sizes.mjs:65` reads
`try { entries = readdirSync(dir); } catch { return files; }` — it *swallows* the exact error
the backend deliberately raises. See finding **F3**.

*What head does get right here:* CRM/Inventory are reported separately and excluded from the
pass/fail decision (`isCrmOrInventory`, `check-file-sizes.mjs:53-60`); landing visuals are
untouched (no `features/landing`, `app/(public)` or `features/marketing` file exceeds 500).

### PRD-C039 — 300 as a review target, never mechanical fragmentation
**PARTIALLY MET.**
- Numbered fragments: **0 in both repos.** Verified by filename regex over the whole tree.
- Mutually dependent split files: none observed in the 8 registered files.
- Backend over-300 ratchet is **RED**: 395 vs baseline 392, exit 1.
- Frontend over-300 ratchet is green: 515 vs 516.
- **Re-export shells do exist**, though only three are mechanical. Classification of the 12
  non-index pure re-export files:

| Path | Lines | Importers | Class | Reason |
|---|---|---|---|---|
| `frontend/hooks/api/build.ts` | 2 | 90 | KEEP | stable module barrel, not a split artifact |
| `frontend/hooks/api/hr.ts` | — | 109 | KEEP | same |
| `frontend/hooks/api/build/tickets.ts` | 3 | 16 | KEEP | same |
| `frontend/hooks/api/inventory/stock.ts` | — | — | KEEP | out of release scope |
| `frontend/components/expenses/expense-export-dialog.tsx` | **1** | 2 | **REFACTOR** | one-line shell preserving a pre-split path; two call sites can point at the real file |
| `frontend/features/build/settings/project-members-section.tsx` | **3** | 2 | **REFACTOR** | three-line shell over three siblings; two call sites |
| `backend/src/modules/payroll/setup/payroll-template-seeds.ts` | **1** | 3 | **REFACTOR** | `export { PAYROLL_TEMPLATE_SEEDS } from "./template-seeds";` — a pass-through name |
| `backend/src/db/schema/build/tasks.ts` | 4 | many | KEEP | schema barrel, the documented import surface |
| `backend/src/db/schema/hr/recruitment.ts` | 8 | many | KEEP | same |
| `backend/src/db/schema/hrms-phase1-sql-managed.ts` | 13 | many | KEEP | same |
| `backend/src/modules/support/core/dto/support.schemas.ts` | 4 | many | KEEP | DTO barrel |
| `backend/src/modules/build/core/dto/projects.schemas.ts` | 6 | many | KEEP | DTO barrel |

### PRD-C040 — exception only for generated/vendor/declaration/immutable-migration/cohesive-catalog/documented-locality; nine recorded fields; directory-wide and wildcard exceptions prohibited
**NOT MET.**

The *registry* honours the clause: both parsers reject a path containing `*` or ending in `/`
as an **error** (not a skip), require all nine columns non-blank, and are self-tested for it
(45 / 49 assertions). Every one of the 8 backend rows carries all nine fields with real prose.

But the *effective* exception set is not the registry. It is the registry **plus** the code-level
exclusions, and those are directory-wide and extension-wide by construction:

- backend: "every `.mjs`", "every `.js`", "every `*.spec.ts`", "everything outside `src/`" —
  **104 files**, none of which records a path, a category, an owner, an interface, a cohesion
  argument, alternatives, a review date or a removal trigger;
- frontend: "everything under `scripts/`, `contracts/`, `public/`, `dist/`" — **12 files** over
  the limit, same absence.

The inconsistency is visible inside the registry itself: it contains a prose section titled
"CLI scripts: structural scope decision" which says `src/scripts/**` are one-off CLI utilities
and then insists "They are still listed individually below — the scope decision is a reason,
never a wildcard", and registers three of them (`relocate-org-data.ts` 767,
`seed-enterprise-workspace.ts` 551, `check-referential-action-drift.ts` 596/606). The other
**44 over-limit scripts in the same directory** are exempted with no row at all, solely because
they are written in `.mjs`. See finding **F2**.

### PRD-C041 — registry fails closed on missing/stale paths, line counts, owners, interfaces, reasons or review dates; ≤500 loses the exception automatically; generated/vendor/migration exclusions path-classified and never transitively exempting authored implementation
**NOT MET** — three of the six staleness axes are unenforced, and the transitive clause is violated.

What *is* enforced, and proved live:
- stale **line count** → the backend gate is red at head on exactly this
  (`check-referential-action-drift.ts` registered 596, measured 606);
- **missing path** → `registered path not found`;
- **≤500 loses the exception** → `exception no longer needed — file is at N lines`;
- **duplicate registration**, **wildcard**, **blank column**, **non-ISO review date**;
- malformed rows become errors, never silent skips.

What is **not** enforced. The parsers value-check only `lines` and `reviewDate`; the other seven
columns are checked for presence only (`check-file-sizes.mjs:96-100`). So a *stale* owner,
interface or reason passes. Three registry rows are stale on those axes at head:

1. `src/modules/ai/core/services/crm-scoring.service.ts` — recorded public interface
   "`CrmScoringService` (5 public methods)". **Measured: 6** — `scoreLead`, `batchScoreLeads`,
   `predictDeal`, `analyzeChurnRisk`, `nextBestAction`, `nextBestActionWithEvidence` (lines 70,
   150, 164, 250, 335, 403). The row's own **Removal trigger reads "or a sixth scoring method
   is added — at which point the prompt builders move out first."** The sixth method exists.
   The removal trigger has fired and the gate is green on the row. See finding **F4**.
2. `src/modules/party/party-mirror-fields.ts` — recorded interface "`PARTY_FIELD_MIRROR`
   (const array)". It is a `Record`, not an array (line 81), and the file also exports
   `LEGACY_OWNED_COLUMNS` (line 510) plus 8 types, and defines a `withKey()` helper (line 498),
   which contradicts the recorded cohesion argument "there is no logic to separate, only data".
3. `src/scripts/check-referential-action-drift.ts` — recorded interface "`main()` entry point
   plus the `--self-test` harness"; the file has **20 `export` statements**.
   (`src/modules/organization/core/invitation-acceptance.service.ts` is inaccurate in the safe
   direction: its cohesion argument claims "magic-link issuance, cache bust and notification
   dispatch" happen inside the transaction; I brace-matched all five transaction blocks and
   found **zero** provider, cache or notification calls inside any of them. The code is better
   than its record.)

**Review dates are never compared against today.** The check is
`/^\d{4}-\d{2}-\d{2}$/.test(...) && !Number.isNaN(Date.parse(...))`. A review date of `1999-01-01`
would pass. "Stale review dates fail" is therefore unimplemented; no row has expired yet
(earliest is 2026-11-01) so it has not yet bitten.

**Transitive exemption of authored implementation.** The `.mjs`/`.js`/spec/outside-`src`
exclusions and the frontend `scripts/` exclusion are not path-classified generated/vendor/
migration exclusions — they are extension and directory filters that exempt 116 ordinary
authored files. This is the precise clause the criterion closes.

### PRD-C042 — review functions/classes/components/hooks/forms/controllers/workers inside an allowed large file for mixed responsibilities, hidden state, duplicated validation/query logic and excessive public surface; the exception exempts nothing else
**PARTIALLY MET** — the review had never been performed or published; I performed it on all 8
registered files. Results, per file:

| File | Lines | Public surface | Mixed responsibility | Hidden state | Dup validation/query | Provider-in-tx | Verdict |
|---|---|---|---|---|---|---|---|
| `organization/core/membership-artifacts.ts` | 3,216 | 4 value exports + 4 types + 1 interface | no — one `as const` array + 4 derived views | none | none | none | **KEEP** — cohesion argument holds |
| `chat/chat-channel-members-implementation.ts` | 522 | **19 public methods** | no | none | no — verified all 19 carry the membership predicate *and* `orgId`; the 3 list methods carry a limit | none | **KEEP with a note** — largest surface of the eight; the registry's claim "every method re-asserts the same membership predicate" was checked method-by-method and **holds** |
| `organization/core/invitation-acceptance.service.ts` | 508 | 2 public (`accept`, `decline`) + 11 privates | no | none | none | **none** (5 tx blocks brace-matched, all clean) | **KEEP** |
| `ai/core/services/crm-scoring.service.ts` | 504 | **6** public methods (recorded as 5) | no | none | none | **none** (9 `runInTenantTransaction` blocks brace-matched, no AI call inside any) | **REFACTOR** — see F4 and F7 |
| `party/party-mirror-fields.ts` | 552 | 2 value exports + 8 types + 1 private fn | **two catalogs in one file** (`PARTY_FIELD_MIRROR` + `LEGACY_OWNED_COLUMNS`), both consumed by the same single consumer `party-legacy-mirror.ts` | none | none | none | **KEEP** — cohesive by consumer, but the registry record is wrong |
| `scripts/relocate-org-data.ts` | 767 | `main()` | no | none | none | n/a | **KEEP** — CLI |
| `scripts/seed-enterprise-workspace.ts` | 551 | `main()` | no | none | none | n/a | **KEEP** — CLI, 1 `TODO` |
| `scripts/check-referential-action-drift.ts` | **606** (registered 596) | 20 exports | no | none | none | n/a | **REFACTOR** — re-measure the row (this is the live gate failure) |

Dead / commented-out / debug code inside the eight: **zero** commented-out implementation lines
except one genuine prose comment; `console.*` appears only in the two CLI scripts and the gate
script, where it is the output channel. No `TODO`/`FIXME` outside one in the seed script.

Cycles: `check:cycles` was not re-run here (madge over 3,654 files is outside the laptop
budget with 26 agents live); the shared-context sweep records it green. **NOT MEASURED by me.**

### PRD-C043 — run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories, zero unexplained violations, and prove each extraction preserves behaviour, import direction, DI registration, route ownership, caching and authorization
**NOT MET**, on three of its four clauses.

- *Run the gates + self-tests at head:* done, table in §1. All four self-tests are bite-proven
  (they write real fixture trees to disk and assert on the scan, not on constants): 45 / 49 /
  26 / 15 / 33 / 9 assertions.
- *Zero unexplained violations:* **NO.** Two backend gates are red at head, and neither is on
  the shared-context list of six known backend failures.
- *Publish the inventories:* they were not published for v2. They are published in §4 below.
- *Prove each extraction preserves behaviour, import direction, DI registration, route
  ownership, caching and authorization:* the v1 report
  `.scratch/code-release-10-10/reports/37-file-cohesion.md` carries this proof for the v1-era
  extractions. **No such proof exists for any extraction since**, and no ticket-28 report
  existed before this one. **NOT MEASURED** — measuring it requires a per-extraction before/after
  spec run, which needs the central jest run the orchestrator owns.

### PRD-C044 — named, typed handler functions for non-trivial UI events and form actions; names express user intent; handlers delegate rules to domain-owned functions
**MET.** This is the strongest criterion in the ticket.

- **3,587** named `handle*` declarations in release-scope code; only **2** have an untyped
  parameter (`features/build/whiteboard/use-whiteboard-autosave.ts:128`,
  `features/chat/channel-info-panel-profile.tsx:77`).
- **0** occurrences of `form.handleSubmit(<inline closure>)` anywhere in the frontend — the
  react-hook-form pattern that normally hides an entire submit flow in an anonymous closure is
  absent. Every submit path goes through a named function.
- **0** occurrences of `action={<inline closure>}` — no server action is written inline in JSX.
- `check:named-handlers` enforces a **zero** threshold in release scope (not a ratchet) over
  3,858 `.tsx` files, and its self-test plants six known-bad closures (numeric coercion, case
  normalisation, a local declaration, three statements, an async body, inline `try`/`catch`)
  and asserts all six are caught.
- The domain-rule library the criterion asks for exists and is genuinely used:
  `lib/numeric-field.ts` (69 lines, **30** importers), `lib/keyboard-activation.ts` (69, **31**),
  `lib/toggle-in-list.ts` (18, **6**), `lib/case-field.ts` (28, **5**).

### PRD-C045 — NestJS controller handlers, consumers, cron entry points and server actions stay thin: validate and authorize at the correct seam, build the command context, invoke one cohesive implementation, map the typed result; do not duplicate business rules, database orchestration or response shaping
**NOT MET.**

Measured distribution over **3,644** route handlers in **550** controllers:

| Top-level statements | Handlers | Share |
|---|---|---|
| 0–2 | 3,246 | 89.1% |
| 3–4 | 318 | 8.7% |
| 5–7 | 55 | 1.5% |
| 8–12 | 19 | 0.5% |
| 13+ | **6** | 0.16% |

89% of the surface is genuinely thin. The failure is concentrated in **25 handlers with ≥8
statements** and, more seriously, **8 handlers that reach the database directly from the
controller**:

```
src/health/health.controller.ts:142                        workflows
src/health/health.controller.ts:195                        databasePool
src/modules/ai/core/controllers/chat-assistant.controller.ts:273  confirmAction
src/modules/email/controllers/hr-send-email.controller.ts:52      send
src/modules/feedbucket/feedbucket-public.controller.ts:160        submit
src/modules/storage/storage-kb.controller.ts:36                   listAttachments
src/modules/storage/storage-onboarding.controller.ts:55           upload
src/modules/storage/storage-vault.controller.ts:61                download
```

The two health handlers are legitimate (a health probe *is* the DB check). The rest duplicate
database orchestration and response shaping in a controller. Findings **F1**, **F5**, **F6**
and **F8** are the substantive ones. Note also that the codebase has **no `@Idempotent`
decorator at all** (0 occurrences repo-wide despite the pattern being referenced in project
memory), so no controller write on this list carries an idempotency key.

Queue/event consumers: **0** `@OnEvent`/`@Processor`/`@Process(` handlers exist — the system
uses an outbox instead — so the consumer half of C045 has no surface to violate. 59 cron files
exist; they were not individually reviewed (**NOT MEASURED**; measuring them needs the same
AST pass extended to `@Cron` methods, roughly 10 minutes of scan time).

### PRD-C046 — named event handlers only; no inline arrow/function in a JSX event prop; no meaningless handler-to-handler chains; `useCallback` only where referential identity matters, with every dependency verified
**NOT MET**, on all four clauses.

1. **"JSX event props must not contain inline arrow/function expressions."** Measured:
   **1,474** inline closures in `on*` JSX props, **1,261 of them in release scope**. The gate
   deliberately does not enforce the literal clause — its own header says so:
   *"Enforced literally that is 1,461 occurrences… This gate enforces the word the box itself
   uses, NON-TRIVIAL."* That is a documented, well-argued deviation, and I agree with the
   engineering judgement — but it is a deviation, and the criterion as written is not satisfied.
   Either the PRD text or the gate must move; the honest fix is to amend C046 to the
   non-trivial rule the gate implements.
2. **Meaningless handler-to-handler chains: 24 measured** (a named `handle*` whose entire body
   is a single call to another `handle*`/`on*` with identical arguments). Ten of them are in one
   file — `features/build/shared/filter-command-menu.tsx:265-274` — where ten consecutive
   `useCallback((v: string) => { onToggleX(v); }, [onToggleX])` wrappers add a second identity
   over a prop that is already a named callback. Finding **F9**.
3. **`useCallback` where identity cannot matter: 219 measured.** These are `useCallback`
   declarations whose *only* consumer is an `on*` prop on an **intrinsic (lowercase) JSX tag**
   in the same component, and which appear nowhere else in the file — no dependency array, no
   effect, no memoized child. React attaches DOM listeners regardless of identity, so the
   memoization provably buys nothing. Out of **3,847** in-scope `useCallback` declarations
   (**1,372** of them with `[]` deps). Finding **F10**.
4. **"verify every dependency": unenforced.** `eslint.config.mjs:19` sets
   `react-hooks/exhaustive-deps` to `"warn"`, and `package.json` defines `lint` as bare
   `eslint` with no `--max-warnings`. Measured on a 139-file slice
   (`features/build/shared`, `features/build/views`, `components/layout`):
   **18 warnings, 3 of them `react-hooks/exhaustive-deps`, eslint exit code 0.** All three are
   in `features/build/views/use-kanban-drag.ts` (lines 177, 183, 261). I read them: the missing
   deps are `useState` setters and refs, so they are *benign* — the defect is that nothing would
   have caught a non-benign one. Finding **F11**.

### PRD-C108 — one cohesive responsibility per file, within size policy or a documented exception, smallest useful interface, no pass-through/dead/commented/debug implementation
**PARTIALLY MET.**
- *One cohesive responsibility:* holds for 7 of the 8 registered backend files; verified
  method-by-method for the largest (`chat-channel-members-implementation.ts`, 19 methods, all
  carrying the membership predicate and `orgId`).
- *Within size policy or a documented exception:* **116 files** (104 backend + 12 frontend) are
  over 500 lines with neither. They are exempted by extension and directory filters that record
  none of the nine fields.
- *Smallest useful interface:* two registry rows understate the real interface
  (`crm-scoring` 5→6 methods; `party-mirror-fields` one catalog→two catalogs + a helper).
- *No pass-through implementation:* 3 mechanical re-export shells (§C039 table) and 24
  handler-to-handler chains.
- *No dead/commented/debug implementation:* clean in every file I read — 0 commented-out
  implementation lines, 0 stray `console.*` outside CLI scripts.

---

## 3. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P1** | `streamlineos-backend/src/modules/ai/core/controllers/chat-assistant.controller.ts:315` | AI-confirm path writes `tickets.status` directly, bypassing every rule the ticket-update service enforces |
| F2 | **P1** | `streamlineos-backend/src/scripts/check-file-sizes.mjs:135` | The 500-line gate scans only `src/**/*.ts`; 104 of the 112 authored backend files over 500 lines are invisible to it |
| F3 | **P1** | `streamlineos-frontend/frontend/scripts/check-file-sizes.mjs:65` | Frontend gate swallows `readdirSync` errors and floors at 200 of 5,357 files — a lost subtree reads as a clean pass |
| F4 | P2 | `…/file-size-exceptions.md` (crm-scoring row) | An exception row's own removal trigger has fired and the gate cannot see it; the registry validates only 2 of its 9 columns |
| F5 | P2 | `streamlineos-backend/src/modules/email/controllers/hr-send-email.controller.ts:68` | A missing or cross-org `templateId` silently falls back to caller-supplied content instead of denying |
| F6 | P2 | `streamlineos-backend/src/modules/storage/storage-onboarding.controller.ts:110` | Read-modify-write on `onboarding_steps` with no unique arbiter — concurrent uploads duplicate the step row |
| F7 | P2 | `streamlineos-backend/src/modules/ai/core/services/crm-scoring.service.ts:153` | `batchScoreLeads` loops 50 leads serially, each doing 2 queries + 1 LLM call inside an allowed large file |
| F8 | P2 | `streamlineos-frontend/frontend/scripts/check-file-sizes.mjs:47` | `scripts/` is a directory-wide exclusion covering 12 authored files over 500 lines — the shape C040 prohibits |
| F9 | P2 | `streamlineos-frontend/frontend/features/build/shared/filter-command-menu.tsx:265` | Ten consecutive `useCallback` wrappers that only re-call an already-named prop |
| F10 | P2 | `streamlineos-frontend/frontend/components/assistant/persona-chip-strip.tsx:34` | 219 `useCallback`s whose only consumer is an intrinsic DOM tag — memoization provably buys nothing |
| F11 | P2 | `streamlineos-frontend/frontend/eslint.config.mjs:19` | `react-hooks/exhaustive-deps` is a warning and `lint` has no `--max-warnings`, so C046's "verify every dependency" never fails a build |
| F12 | P2 | `streamlineos-backend/src/scripts/check-over-300.mjs:22` | `check:over-300` is red at head (395 vs baseline 392) and is not on the known-failure list |
| F13 | P2 | `streamlineos-frontend/frontend/components/expenses/expense-export-dialog.tsx:1` | Three one-to-three-line re-export shells left behind by splits (C039 names re-export shells explicitly) |

### F1 — P1 — `chat-assistant.controller.ts:315`

```ts
case "ticket.updateStatus": {
  const ticketId = Number(payload["ticketId"]);
  const status = String(payload["status"]);
  await this.db
    .update(tickets)
    .set({ status })
    .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, u.orgId)));
```

`confirmAction` (line 273, 161 lines, 13 top-level statements, 9 `switch` branches) dispatches
eight of its nine action types to a real service via `moduleRef.get(...)`. The ninth writes to
the `tickets` table itself. I read the canonical path
(`ProjectsTicketsService.updateTicket` → `ProjectsTicketsUpdateService.updateTicket`,
`projects-tickets-update.service.ts:118`) and diffed the two:

| Applied by `updateTicket` | Applied by the AI path |
|---|---|
| `isNull(tickets.deletedAt)` predicate (line 179, 279–280) | **no** |
| `checkProjectAccess(orgId, userId, projectId)` (line 209–218) | **no** |
| `validateTicketStatus` → `ProjectsInvalidTicketStatusException` (`projects-tickets-query.service.ts:46`) | **no** |
| `enforceWipLimitForStatus` (line 247) | **no** |
| `assertTransitionAllowed` (workflow + role policy) | **no** |
| optimistic `version` / `expectedUpdatedAt` check (line 202–207, 279) | **no** |
| `updatedAt` bump (line 126) | **no** |
| `OutboxWriter.emit` (line ~290) | **no** |
| activity-log row (line ~333) | **no** |
| `notifyNewAssignees` / `dispatch.emit` (line ~352, ~360) | **no** |
| `automationRunner.runForTicketEvent("ticket.status_changed")` (line 392) | **no** |
| `cache.del("projects:analytics:<org>:<project>")` (line 399) | **no** |

**Failure scenario.** A user asks the assistant to move ticket 4,231 to "In Review" and confirms
the proposal. The ticket is soft-deleted, or the user has no access to that project, or the
project's workflow forbids `TODO → In Review`, or the target column is at its WIP limit — the
write goes through anyway (the only backstop is the composite FK `fk_tickets_status` on
`(org_id, project_id, status)` at `ticket-core.ts:96`, which turns an unknown status into an
opaque 500 rather than a `ProjectsInvalidTicketStatusException`). `updated_at` is unchanged, so
the next optimistic-concurrency check on that ticket compares against a stale timestamp and lets
a conflicting edit through. No outbox row, no activity entry, no assignee notification, no
automation run. `projects:analytics:<org>:<project>` is never evicted, so the project analytics
panel keeps serving the pre-change status until the key expires — a stale read surviving a
write.

**Proposed fix.** Replace the branch body with the same service call the other eight branches
use:
`this.moduleRef.get(ProjectsTicketsService, { strict: false }).updateTicket(u, ticketId, { status })`,
and parse `payload` through the ticket-update schema rather than `String(...)`. That restores
every row of the table above in one line and removes the only direct `db` use in this
controller. Longer term, `confirmAction`'s nine-branch switch belongs in an
`AiConfirmedActionRunner` service so the controller is left validating the token, resolving the
permission and mapping the result.

### F2 — P1 — `src/scripts/check-file-sizes.mjs:135`

```js
extname(entry) === ".ts" &&
!entry.endsWith(".d.ts") &&
!entry.endsWith(".spec.ts") &&
!entry.endsWith(".e2e-spec.ts")
```

PRD-C038 names `.ts`, `.tsx`, `.js` **and `.mjs`**, and names **script and test files**
explicitly. This filter admits one of the four extensions and excludes both named classes.

**Failure scenario, measured rather than hypothesised.** 112 authored backend files exceed 500
lines. The gate reports on 8 of them. `src/scripts/check-module-di.mjs` is 1,969 lines,
`read-cost-budgets.mjs` 1,461, `check-placement-bypass.mjs` 1,391 — none has ever been reviewed
against the limit or carries any of the nine required fields. The gate that enforces the rule,
`check-file-sizes.mjs`, is itself **575 lines** and exempt from it. Any new 900-line `.mjs`
worker, seed or gate lands green. This is the exact "0 violations and nothing to check print
identically" shape that `gate-corpus.mjs` documents nine times over.

**Proposed fix.** Extend `collectFiles` to `.ts/.tsx/.js/.mjs`, drop the `*.spec.ts` /
`*.e2e-spec.ts` exclusions (the frontend twin already scans tests and documents why —
`check-file-sizes.mjs:14-21`), and raise the root from `src/` to the repo root with a
*path-classified* generated/vendor exclusion list (`node_modules`, `dist`, `coverage`,
`.claude/worktrees`, dot-directories) mirroring `check-repo-paths.mjs`. Expect ~104 new rows to
land: split them, or register each with its nine fields. Raise `MIN_FILES` to match the new
corpus and add the four new subtrees to `REQUIRED_SUBTREES`.

### F3 — P1 — `frontend/scripts/check-file-sizes.mjs:65`

```js
function collectFiles(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
```

with `const MIN_FILES = 200;` (line 41) against 5,357 files actually scanned — a **3.7%** floor,
and no `REQUIRED_SUBTREES` backstop. The backend twin does the opposite and says why:
*"Swallowing this returned a SHORT file list that then read as 'nothing over the limit'. An
unreadable directory is an unmeasured directory: fail loudly."*

**Failure scenario.** A permission change, a partial checkout, a broken symlink or a
sparse-checkout pattern makes `frontend/features/` unreadable. `collectFiles` returns silently
with roughly 3,000 files instead of 5,357 — still fifteen times the floor — and the gate prints
`5357 files scanned — all within 500 lines` with the entire feature tree, where every large
component lives, never opened. Exit 0. CI green.

**Proposed fix.** Throw on `readdirSync` failure exactly as the backend does, raise `MIN_FILES`
to ~4,000 (75% of the measured corpus) with the measurement recorded in the comment, and add a
`REQUIRED_SUBTREES = ["app", "components", "features", "hooks", "lib"]` backstop with a
self-test that removes one subtree and asserts the gate fails.

### F4 — P2 — `architecture-refactor/final-refactor/issues/file-size-exceptions.md` (crm-scoring row)

The row records **"`CrmScoringService` (5 public methods)"** and a removal trigger of
**"or a sixth scoring method is added — at which point the prompt builders move out first."**
`crm-scoring.service.ts` has six public methods (lines 70, 150, 164, 250, 335, 403). The
condition the author wrote to retire the exception has been satisfied and nothing noticed,
because the parser value-checks only `lines` and `reviewDate` (`check-file-sizes.mjs:96-100`)
and treats the other seven columns as present/absent.

**Failure scenario.** An exception outlives its own stated justification indefinitely. This is
the same failure the ticket-37 pass found seven times (five files kept exceptions after falling
below the limit, two grew 736 lines under an unread exemption) — closed for line counts, still
open for every other column. Two further rows are stale the same way (`party-mirror-fields`,
`check-referential-action-drift`, §C041).

**Proposed fix.** Extend the parser with three machine-checkable assertions: (a) if the
`Public interface` cell names a count ("N public methods", "N exports"), parse N and compare it
against the file's measured public surface; (b) fail when `reviewDate < today`; (c) fail when
the `Removal trigger` cell names a measurable condition and it holds. (a) and (b) are cheap and
would catch all three stale rows today.

### F5 — P2 — `hr-send-email.controller.ts:68`

```ts
if (body.templateId !== undefined) {
  const template = await this.db.query.emailTemplates.findFirst({ where: and(
    eq(emailTemplates.id, body.templateId), eq(emailTemplates.orgId, u.orgId)) });
  if (template) { subject = template.subject; emailBody = template.body; }
}
```

The tenant predicate is present and correct — this is not a leak. The defect is the missing
`else`. A `templateId` that does not exist, or belongs to another org, silently leaves the
caller-supplied `subject`/`body` in place and sends. The same shape follows for `candidateId`
(line 80): a bad id skips variable substitution, so `replaceVariables` never runs and the raw
`{{candidateName}}` placeholders go out.

**Failure scenario.** A recruiter's client sends `POST /hr/integrations/send-email` with
`templateId: 812` (a template that was deleted, or that belongs to a different tenant) and a
placeholder body. The candidate receives an email reading
`Hi {{candidateFirstName}}, regarding your application…`. There is also no idempotency key
(the repo has **zero** `@Idempotent` usages), so a retried request sends the message twice.

**Proposed fix.** `throw new NotFoundException("Template not found")` and
`throw new NotFoundException("Candidate not found")` on the miss branches; move template
resolution, variable substitution and the `replaceVariables` helper into `EmailService` (the
controller currently owns a domain function at module scope, line 35); add an idempotency key
to the route.

### F6 — P2 — `storage-onboarding.controller.ts:110`

`findFirst` on `onboarding_steps` by `(orgId, userId, stepName)` followed by an `insert` or an
`update`, inside `this.db.transaction`. I checked the live catalog on `scratch_head_1010`:

```
onboarding_steps_pkey          PRIMARY KEY (id)
uniq_onboarding_steps_org_id   UNIQUE (org_id, id)
idx_onboarding_steps_user      btree (user_id)
idx_onboarding_steps_org_status btree (org_id, status)
```

There is **no unique constraint on `(org_id, user_id, step_name)`**, so this cannot become an
`ON CONFLICT` upsert — the arbiter does not exist — and the read-modify-write is not serialised
against a concurrent transaction at the default isolation level.

**Failure scenario.** A user double-clicks the upload button (or a flaky network retries the
POST). Two transactions both `findFirst` and both miss, then both insert. The employee's
onboarding checklist shows `Upload passport` twice, both COMPLETED. No idempotency key on the
route to stop the second request.

**Proposed fix.** Add `UNIQUE (org_id, user_id, step_name)` in a migration, then replace the
branch with a single `insert … onDoUpdateSet({ status: "COMPLETED", completedAt })` naming that
constraint as the arbiter. Move the whole upload flow into `StorageService` — this handler is
22 statements of mime allowlist, magic-byte check, size cap, AV scan, capacity check, upsert
and transform enqueue, all in a controller.

*(This handler is otherwise the best-engineered of the eight: the AV scan runs before the
transaction, and the blob write is deferred to `registerAfterCommit` so no provider call is
held inside the transaction. That part is right and should be preserved by any refactor.)*

### F7 — P2 — `crm-scoring.service.ts:153`

```ts
const capped = leadIds.slice(0, 50);
for (const leadId of capped) {
  const result = await this.scoreLead(orgId, leadId, userId);
```

`scoreLead` (line 70) issues two DB queries and one AI gateway call per lead. `batchScoreLeads`
runs them strictly serially. Worst case per request: 100 queries and 50 LLM round-trips.

**Failure scenario.** A caller passes 50 lead ids; the request occupies a connection for 50
sequential model latencies. At a conservative 1.5 s per completion that is a 75-second request
that will hit any gateway or proxy timeout, and the partial results already computed are
discarded on the client side. Bounded at 50, so not unbounded — but the growth is linear in the
argument and entirely serial.

**Proposed fix.** Batch the two DB reads across all 50 ids up front (`inArray`), then run the
model calls through a bounded concurrency pool (4–8). This lives inside a registered
file-size exception, which C042 says exempts nothing: the exception covers the file's length,
not its query cost. *Scope note:* this is CRM scoring, and CRM is out of scope for this
release — recorded, not counted against it.

### F8 — P2 — `frontend/scripts/check-file-sizes.mjs:47`

`EXTRA_EXCLUDED_DIRS = new Set(["public", "scripts", "contracts", "dist"])`. `scripts/` holds
44 authored `.mjs` gate scripts; **12 exceed 500 lines** (1,557 / 1,494 / 1,419 / 971 / 956 /
775 / 766 / 745 / 721 / 579 / 562 / 540). C040 prohibits directory-wide exceptions and C041
says path-classified generated/vendor exclusions "must never exempt ordinary authored
implementation transitively". A hand-written 1,557-line gate script is ordinary authored
implementation.

**Failure scenario.** `check-permission-route-binding.mjs` grows to 2,500 lines and nothing
says so. Meanwhile the backend registry insists — in prose, in the same document — that CLI
scripts must be "listed individually below; the scope decision is a reason, never a wildcard".
The two repos disagree about the same class of file.

**Proposed fix.** Drop `"scripts"` from `EXTRA_EXCLUDED_DIRS` and register the 12 files
individually with the nine fields, or split them. Keep `public`, `contracts` and `dist`
(genuinely generated/vendor) and add a comment classifying each as such.

### F9 — P2 — `features/build/shared/filter-command-menu.tsx:265`

```tsx
const handleToggleStatus   = useCallback((v: string) => { onToggleStatus(v); },   [onToggleStatus]);
const handleTogglePriority = useCallback((v: string) => { onTogglePriority(v); }, [onTogglePriority]);
… eight more, lines 267-274
```

Each wrapper takes a prop that is already a named, typed callback and produces a second identity
for it that changes whenever the prop changes — the wrapper cannot be more stable than its own
dependency. This is C046's "meaningless handler-to-handler chain" verbatim: ten of the 24 found
repo-wide are in this one file.

**Failure scenario.** No runtime defect; a reader tracing `onToggleStatus` from the JSX hits a
handler that does nothing, and the ten wrappers must be kept in step with ten props by hand.
The other 14 (e.g. `components/layout/header/user-avatar-menu.tsx:291`
`handleSignOutClick -> handleSignOut()`, `features/dashboard/team-card.tsx:35`
`handleRetry -> onRetry()`) are one-liners of the same kind.

**Proposed fix.** Pass the props straight through (`onValueChange={onToggleStatus}`); delete
all ten wrappers. Repeat for the other 14 chains — the full list is reproducible with the
scanner described in §5.

### F10 — P2 — `components/assistant/persona-chip-strip.tsx:34` (and 218 more)

```tsx
const handleClick = useCallback(() => { onSelect(isSelected ? null : chip.id); },
                                [chip.id, isSelected, onSelect]);
return <button type="button" onClick={handleClick} … />
```

**219** `useCallback` declarations in release-scope code have exactly one consumer — an `on*`
prop on an **intrinsic** (lowercase) JSX tag in the same component — and appear nowhere else in
their file: no dependency array, no effect, no subscription, no memoized child. React does not
compare DOM event-prop identity in a way that saves work here, so the memoization is provably
inert. Out of **3,847** in-scope `useCallback`s, **1,372** of which use `[]` deps.

**Failure scenario.** No runtime defect; the cost is 219 dependency arrays that must be kept
correct for no benefit — and each one is a place where a *wrong* array can silently capture a
stale value once the callback stops being trivial. C046 asks for `useCallback` "only when
referential identity affects memoization, subscription or effect correctness"; in these 219
cases it demonstrably does not.

**Proposed fix.** Add a `check:named-handlers` sub-rule (or a new gate) that flags a
`useCallback` whose sole consumer is an intrinsic-tag event prop, with the same fixture-based
self-test shape the existing gates use, and unwrap the 219.

### F11 — P2 — `eslint.config.mjs:19`

`"react-hooks/exhaustive-deps": "warn"`, and `package.json`'s `lint` script is bare `eslint`
with no `--max-warnings`. `frontend.yml:55` runs `pnpm run lint`.

**Measured proof of inertness.** `npx eslint features/build/shared features/build/views
components/layout --format json` over 139 files: **0 errors, 18 warnings, exit code 0**,
including three `react-hooks/exhaustive-deps` missing-dependency findings at
`features/build/views/use-kanban-drag.ts:177,183,261`. I read all three; the missing deps are
`useState` setters and refs, so they are benign — which is precisely the point: nothing
distinguishes them from a non-benign one, and CI passes either way. C046's "verify every
dependency" has no enforcement behind it.

**Proposed fix.** Either raise `react-hooks/exhaustive-deps` to `"error"` (after fixing the
existing warnings), or keep it a warning and add `--max-warnings 0` to `lint` with the existing
warnings suppressed per-line with a reason. The first is cleaner given the 3,847 `useCallback`
sites at stake.

### F12 — P2 — `src/scripts/check-over-300.mjs:22`

`const BASELINE = 392;` against **395** measured — exit 1. The gate is red at head and is not on
the shared-context list of six known backend failures, so no one is repairing it.

**Failure scenario.** The backend CI job at `ci.yml:861` fails. Because the registry's own audit
trail records this ratchet moving 392 → 394 → back to 392, the three crossings are unattributed;
C039 requires each raise to name its crossings with before/after line counts.

**Proposed fix.** Identify the three files that crossed 300 since the baseline was set
(`git diff` the over-300 list against the baseline commit), split them at a cohesive seam as
ticket 35 did on the frontend, and leave the baseline at 392. Do **not** raise the baseline —
that is the move this release forbids.

### F13 — P2 — `components/expenses/expense-export-dialog.tsx:1`

Three pure pass-through shells left by earlier splits:
`frontend/components/expenses/expense-export-dialog.tsx` (1 line, 2 importers),
`frontend/features/build/settings/project-members-section.tsx` (3 lines, 2 importers),
`backend/src/modules/payroll/setup/payroll-template-seeds.ts` (1 line, 3 importers).
C039 names "re-export shells" among the forms a split must not take, and C108 forbids
pass-through implementation.

**Failure scenario.** No runtime defect; a reader following the import lands on a file whose
only content is another import path, and every rename now has two places to touch. Distinct from
the nine module barrels (`hooks/api/build.ts` with 90 importers, the `db/schema` barrels), which
are the documented public path of a package and should stay.

**Proposed fix.** Repoint the 2 / 2 / 3 call sites at the real modules and delete the shells.

---

## 4. Published inventories

### Over-500 — backend, complete (112 files, `.claude/worktrees/**` excluded)

**Inside the gate's scan class (8, all registered):**

```
3216  src/modules/organization/core/membership-artifacts.ts
 767  src/scripts/relocate-org-data.ts
 606  src/scripts/check-referential-action-drift.ts   <-- registered 596, STALE, gate red
 552  src/modules/party/party-mirror-fields.ts
 551  src/scripts/seed-enterprise-workspace.ts
 522  src/modules/chat/chat-channel-members-implementation.ts
 508  src/modules/organization/core/invitation-acceptance.service.ts
 504  src/modules/ai/core/services/crm-scoring.service.ts
```

**`.mjs`/`.js`, invisible to the gate (49):**

```
1969 src/scripts/check-module-di.mjs          1461 src/scripts/read-cost-budgets.mjs
1391 src/scripts/check-placement-bypass.mjs   1355 src/scripts/seed-scratch-e2e.mjs
1302 src/scripts/check-db-call-count.mjs      1301 src/scripts/check-envelope-consistency.mjs
1133 src/scripts/check-cache-invalidation.mjs 1121 src/scripts/check-benchmark-manifest.mjs
1047 src/scripts/seed-perf-scratch.mjs        1034 src/scripts/check-mock-surface.mjs
 948 src/scripts/check-authz-deny.mjs          923 src/scripts/check-migration-discipline.mjs
 852 src/scripts/check-relation-key-reach.mjs  837 src/scripts/check-route-budgets.mjs
 828 src/scripts/migration-proof.mjs           825 src/scripts/check-type-assertions.mjs
 791 src/scripts/check-gate-wiring.mjs         778 src/scripts/run-read-cost-budgets.mjs
 735 src/scripts/check-openapi-coverage.mjs    722 src/scripts/check-vacuous-assertions.mjs
 715 src/scripts/generate-api-contract-registry.mjs
 651 src/scripts/check-tenant-relationships.mjs 651 src/scripts/check-outbox-consumers.mjs
 650 test/perf/seed-heavy-query-load.mjs        612 src/scripts/check-n1-growing-loops.mjs
 611 src/scripts/check-unbounded-reads.mjs      610 src/scripts/check-dead-code.mjs
 603 src/scripts/route-classification-report.mjs 596 src/scripts/seed-perf1-budgets.mjs
 596 src/scripts/check-api-contract-registry.mjs 582 src/scripts/run-load-driver.mjs
 575 src/scripts/check-file-sizes.mjs   <-- the gate itself
 573 src/scripts/check-lifecycle-predicates.mjs 571 src/scripts/scan-legacy-org-actors.mjs
 566 scripts/backfill-public-object-urls.mjs    554 test/perf/measure-benchmark-manifest.mjs
 554 src/scripts/browser-driver-auth.mjs        550 src/scripts/check-query-projections.mjs
 548 src/scripts/browser-driver.mjs             541 src/scripts/benchmark-regression.mjs
 538 src/scripts/check-relation-hydration.mjs   535 src/scripts/db-verify-rls.mjs
 535 src/scripts/check-namespace-coverage.mjs   522 src/scripts/compliance-drill-e2e.mjs
 516 src/scripts/check-transaction-callbacks.mjs 512 scripts/functional/rbac-matrix.test.mjs
 507 src/scripts/check-bare-throw.mjs           505 test/perf/merge-http-route-budgets.mjs
 501 src/scripts/seed-build-load.mjs
```
*(`check-envelope-consistency.mjs` measured 1,213 then 1,301 during this audit — it is being
edited by the concurrent repair wave; `.mjs` counts in this table may drift by a few lines.)*

**Spec / e2e-spec, invisible to the gate (51) — top 20:**

```
843 src/modules/module-access/__tests__/module-access.controller.e2e-spec.ts
830 src/modules/billing/core/billing-webhook.spec.ts
829 src/modules/crm/import/crm-import.service.spec.ts
826 src/modules/ai/confirmation/ai-confirmation.service.spec.ts
763 src/modules/gdpr/gdpr-subject-erasure.spec.ts
745 src/modules/ai/core/gateway/ai-gateway.service.spec.ts
707 src/modules/billing/core/billing.service.spec.ts
707 src/modules/ai/core/services/chat-assistant.service.spec.ts
675 src/modules/workflows/__tests__/failure-injection.spec.ts
660 src/modules/hr/__tests__/sensitive-projection-exposure.spec.ts
647 src/modules/calendar/calendar-reminder-sweep-recurring.spec.ts
644 src/modules/module-access/__tests__/module-access-new-capabilities.spec.ts
641 src/modules/notifications/unified-inbox-contract.spec.ts
639 evals/whatsapp-extraction.eval.spec.ts
636 src/modules/ownership/__tests__/ownership.service.spec.ts
629 src/modules/payroll/__tests__/payroll-db-integration.e2e-spec.ts
622 src/modules/automation/automation.service.spec.ts
615 src/modules/organization/core/membership-revocation.spec.ts
607 src/modules/gdpr/gdpr-export-worker-tenant-isolation.spec.ts
603 src/modules/organization/core/organization-member-status.spec.ts
```

**`.ts` outside `src/`, non-spec, invisible to the gate (4):**

```
886 test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts
    test/perf/route-budget-http.seeded-e2e-spec.ts
    test/security/bola/body-id-binding.ts
    test/perf/route-budget-http-harness.ts
```

### Over-500 — frontend, complete

**In release scope: 0.**

**Out of release scope (reported by the gate, not counted): 2**
```
564 features/crm/settings/automations/builder/automation-builder.tsx
512 app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx
```

**Excluded by the `scripts/` directory exclusion: 12**
```
1557 scripts/check-permission-route-binding.mjs   1494 scripts/browser-journeys.mjs
1419 scripts/measure-web-vitals.mjs                971 scripts/check-gated-reads.mjs
 956 scripts/check-command-catalog.mjs             775 scripts/check-type-assertions.mjs
 766 scripts/check-gate-wiring.mjs                 745 scripts/check-web-vitals-budget.mjs
 721 scripts/check-test-integrity.mjs              579 scripts/check-response-contracts.mjs
 562 scripts/check-query-signal.mjs                540 scripts/check-dead-code.mjs
```

### Over-300 inventories

| Repo | Count | Corpus | Baseline | Status | Reproduce |
|---|---|---|---|---|---|
| backend | **395** | 3,654 (`src/**/*.ts`, minus `.d.ts`/spec) | 392 | **RED, +3** | `node src/scripts/check-over-300.mjs` |
| frontend | **515** | 5,352 | 516 | green, −1 | `node scripts/check-over-300.mjs` |

Both commands print the full path list on every run; the lists are 395 and 515 entries and are
reproduced verbatim by the two commands above rather than transcribed here. Backend head of the
list: `membership-artifacts.ts` 3216, `relocate-org-data.ts` 767, `check-referential-action-drift.ts`
606, `party-mirror-fields.ts` 552, `seed-enterprise-workspace.ts` 551,
`chat-channel-members-implementation.ts` 522, `invitation-acceptance.service.ts` 508,
`crm-scoring.service.ts` 504, then the 387 files in the 300–500 band down to
`notification-events.catalog.ts` at 301.

---

## 5. What head already gets right

This ticket's handler half is in genuinely good shape, and the evidence is worth recording so a
later wave does not re-litigate it.

- **Named handlers are real, not cosmetic.** 3,587 named `handle*` declarations; only 2 with an
  untyped parameter. **Zero** `form.handleSubmit(<inline closure>)` and **zero**
  `action={<inline closure>}` in the whole frontend — the two places where an entire submit flow
  normally hides in an anonymous closure are empty.
- **The shared domain-rule library exists and is used.** `lib/numeric-field.ts` (30 importers),
  `lib/keyboard-activation.ts` (31), `lib/toggle-in-list.ts` (6), `lib/case-field.ts` (5). C044's
  "handlers delegate validation/state-independent rules to domain-owned functions" is satisfied
  with real call counts, not a convention note.
- **`check:named-handlers` is a zero-threshold gate, not a ratchet**, parses with the TypeScript
  AST rather than regex, counts and prints its exclusions on every run so they cannot quietly
  grow, and its 33-assertion self-test plants six known-bad closures and asserts each is caught.
  Its header documents its one deviation from the PRD text openly instead of hiding it.
- **Controller thinness is 89% achieved.** 3,246 of 3,644 route handlers are ≤2 statements. The
  problem is 25 handlers, not a systemic pattern.
- **The exception registry genuinely fails closed on the axes it checks**, and it is failing
  right now for the right reason — that is the mechanism working, not the mechanism broken.
  Wildcards and directory paths are rejected as errors; malformed rows are errors, never skips;
  a file falling to ≤500 loses its exception automatically; duplicate registration fails.
- **Zero numbered fragments in either repo.** C039's primary prohibition holds completely.
- **The largest registered exception was verified method-by-method.**
  `chat-channel-members-implementation.ts` has 19 public methods, and I confirmed every one of
  them carries both the channel-membership predicate and an `orgId` scope, with the three list
  methods carrying a limit. The registry's cohesion argument for that file is accurate.
- **No provider call inside a database transaction** in any of the eight registered files
  (9 `runInTenantTransaction` blocks in `crm-scoring`, 5 transaction blocks in
  `invitation-acceptance` — all brace-matched and checked). `storage-onboarding.controller.ts`
  deliberately defers its blob write to `registerAfterCommit` and runs the AV scan before the
  transaction opens.
- **Backend `check-file-sizes.mjs` has an exemplary vacuity floor** — `MIN_FILES = 2000` (55% of
  its corpus) plus a `REQUIRED_SUBTREES` backstop plus a throwing `collectFiles`, with the
  reasoning measured and written down. The frontend twin should copy it, not the reverse.
- **All four gates are wired into CI** and `check:gate-wiring` confirms 32 of 35 frontend gates
  can actually fail the job.

---

## 6. Blocked on infrastructure

1. **C043's extraction-equivalence proof** — "prove each extraction preserves behaviour, import
   direction, DI registration, route ownership, caching and authorization" needs a before/after
   spec run per extraction. That requires the central jest run the orchestrator owns; a bare
   `jest` is forbidden under the 26-agent laptop budget. **NOT MEASURED.** What would measure
   it: for each extraction in the v2 window, `git stash` the split, run
   `jest --runInBand --testPathPattern="<the module's specs>"`, restore, re-run, diff — plus
   `check:module-di`, `check:cycles` and `check:route-classification` on both sides.
2. **`check:cycles` on the backend** — madge over 3,654 `.ts` files is outside the concurrent
   budget. **NOT MEASURED by me**; the shared-context sweep records it green.
3. **Cron entry-point thinness (C045)** — 59 cron files exist and were not individually
   reviewed. **NOT MEASURED.** What would measure it: extend the controller AST scan to
   `@Cron`-decorated methods and apply the same statement-count and direct-`db`-use tests.
4. **Full-repo `eslint`** — I measured `react-hooks/exhaustive-deps` on a 139-file slice only.
   The repo-wide warning count is unknown. **NOT MEASURED.** What would measure it:
   `eslint . --format json` over the whole frontend, roughly 6–8 GB and 10+ minutes, which
   belongs in the central run.
5. **`check:alert-ack`** — unrelated to this ticket; noted only because it is the one gate that
   cannot run at all.

---

## 7. Completion-evidence block (for the traceability update)

```
frontend SHA : 886c19f2becf0ef50a71d342ea53bbc1eb3443a7  (release/code-10-10-v2)
backend  SHA : 87131fab5da1ea1bc1d6bd6fdb59cd4316f2f32b  (release/code-10-10-v2)

frontend check:file-sizes                exit 0   5357 scanned, 0 over, 0 exceptions
frontend check:file-sizes:self-test      exit 0   45 passed
frontend check:over-300                  exit 0   515/5352 (baseline 516)
frontend check:over-300:self-test        exit 0   26 passed
frontend check:named-handlers            exit 0   3858 files, 1474 inline closures, 0 violations
frontend check:named-handlers:self-test  exit 0   33 passed
frontend check:route-thinness            exit 0   588 modules, 0 in-scope thick
frontend check:route-thinness:self-test  exit 0   9 fixtures
frontend check:gate-wiring               exit 0   35 gates, 32 blocking, all reachable
backend  check:file-sizes                exit 1   STALE ROW: check-referential-action-drift.ts 596 != 606
backend  check:file-sizes:self-test      exit 0   49 passed
backend  check:over-300                  exit 1   395 over 300, baseline 392, +3
backend  check:over-300:self-test        exit 0   15 passed

criteria met            : PRD-C044
criteria partially met  : PRD-C013, PRD-C039, PRD-C042, PRD-C108
criteria not met        : PRD-C038, PRD-C040, PRD-C041, PRD-C043, PRD-C045, PRD-C046
```

**Do not tick any PRD-C0xx checkbox for ticket 28 on this evidence.** Two gates are red and
five criteria are unmet.
