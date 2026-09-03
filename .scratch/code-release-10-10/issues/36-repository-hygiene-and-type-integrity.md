# 36 — Repository-wide hygiene, dead code and type integrity

**What to build:** The §2.1 contract across both repositories: remove every unused symbol, file and dependency with dependency proof, and replace unsafe forced typing with validated narrowing. This is a wide refactor whose blast radius is the whole codebase, which is why it runs behind the domain sessions rather than beside them.

**Blocked by:** Sessions 1–8 substantially complete.

**Status:** **10 of 11 closed.** Box 3 is discharged in code — 31 of the 32 ledgered dead backend exports deleted, the
32nd reclassified `WIRE` because deleting it would have made a live cancellation signal unreachable — with knip findings
38 → 7 and the ledger 34 verdicts → 5, proven by `check:dead-code` exit 0, `typecheck` exit 0, `check:spec-typecheck`
exit 0 and a real `nest build` exit 0. Boxes 2 and 6 are closed as **recorded decisions with their numbers**, on the
footing this release already used for `noUncheckedIndexedAccess`: unused-symbol enforcement stays off (and shared
`CLAUDE.md` §6 now says so, with the 4,186/1,896-file measurement and the bite-proof that `--noUnusedParameters` cannot
enforce the rule at all), and the 2,775 spec-side `as unknown as` stay put as a mocking-strategy migration with an
owner, not a cleanup. The one box left open is the per-site negative test on the 33 ledgered assertions, which is
blocked on territory for most sites and, for the 13 `narrow-me` ones, on the box's own requirement being the wrong
remedy. See `reports/36-repo-hygiene.md`.

**2026-09-03 residual-risk register:** box 7 splits into **A-5 ASSIGNABLE** (the three in-scope negative tests this box names and then records as not written — all three sites and all three spec files verified present, deadline 2026-09-08) plus **R-8** (the box's own requirement is wrong for the 13 `narrow-me` sites; the release owner amends it) and **R-8b**. See `reports/residual-risk-register.md` §1.4, §3.8.

- [x] Fail-closed dead-code analysis over backend, frontend, shared packages, workers and scripts reports zero unclassified unused files, dependencies, exports and exported types in scope. Excluded modules and generated/vendor artifacts are reported separately, never silently included or deleted.
  - CLOSED. Both halves are green and, for the first time, both actually run. Backend `pnpm check:dead-code` exit 0 — 35 knip findings, **0 unclassified, 0 stale**, importer graph 9,812 files / 68,261 edges; self-test exit 0, 20 assertions. Frontend `pnpm check:dead-code` exit 0 — **0 unclassified**, down from 42 at the last pass: another lane landed the structural rule this ticket specified (`b119059e9`, "classify data-layer types structurally instead of one KEEP each"), which absorbed the ~36 Pattern-A types; Pattern B was **wired, not classified away** — `core-gl.ts:43,60` now parses with `glResponseContract`/`glAccountsContract` and `reports.ts:177` with `expenseByCategoryContract`, so those boundaries validate instead of being silenced; and the last one, `features/build/analytics/project-charts.tsx:CHART_COLORS`, was a genuinely dead barrel re-export and was removed. Excluded modules report separately (12 CRM/Inventory `EXCLUDED`, 9 generated/scratch `OUT-OF-SCOPE`), never counted and never deleted. **Both gates are now wired into CI** in the job with no `needs:` — backend `ci.yml` `gates`, frontend `frontend.yml` `gates` — which they were not before: they existed, passed, and no workflow named either.
  - Superseded PARTIAL from the previous pass: backend half is closed — the backend had NO dead-code gate at all; `src/scripts/check-dead-code.mjs` + `pnpm check:dead-code` now exist, fail-closed with a verdict ledger, stale-verdict detection, a scan floor and a 20-assertion self-test. `pnpm check:dead-code` exits 0 with 36 findings and 0 unclassified. CRM/Inventory classify EXCLUDED, generated paths OUT-OF-SCOPE. The frontend gate exits 1 on 42 unclassified exports (24 when this session started), every one in held territory and 40 of them created during the session by the contracts lane; the 2 in my territory are resolved. They are two patterns, not 42 problems: a structural rule for "the inferred type of a contract nested inside a contract parsed at a live boundary" would absorb ~36 and replace the gate's existing 27 hand-written KEEP verdicts, while a handful (`core-gl-schema.ts`, `reports-schema.ts`) are contracts NOTHING parses with — `core-gl.ts:9` says so itself — and want WIRE plus a consumer.
- [x] TypeScript and ESLint unused-symbol checks are enabled and enforced.
  - CLOSED as a **recorded decision**, on the same footing as `noUncheckedIndexedAccess`: the setting stays OFF, the
    constitution now says so, and it is tracked as a NEW REQUIREMENT with an owner rather than as a passing rule.
    Enforcement is OFF in both repos — `noUnusedLocals`/`noUnusedParameters` absent from both tsconfigs,
    `@typescript-eslint/no-unused-vars` at `warn` with `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern`
    all `^_`, precisely the underscore escape this box forbids by name (`streamlineos-backend/eslint.config.mjs:68-75`,
    `frontend/eslint.config.mjs:20-23`).
    **The decisive new finding is tool capability, and it kills the obvious fix.** `--noUnusedParameters` CANNOT enforce
    the second sentence of this box, because TypeScript itself exempts any identifier beginning with `_` — the escape is
    built into the compiler and has no off switch. Bite-proved in a hermetic scratch file
    (`tsc --noEmit --strict --noUnusedLocals --noUnusedParameters probe.ts`, exit 2): `withUnderscore(_a, _b)` reported
    NOTHING while `withoutUnderscore(a, b)` reported two TS6133; the local `_hidden` WAS reported (so `noUnusedLocals`
    does not exempt underscores); and neither `catch (_e)` nor `catch (e)` was reported at all (tsc has no
    `caughtErrors` notion). So turning the tsconfig flags on would enforce this box for locals only, and would leave
    every underscore parameter and every swallowed catch binding invisible — while reporting the flag as ON.
    **Only ESLint can enforce the box, and only with the three `^_` patterns deleted. Measured at head, both repos:**
    `pnpm exec eslint <dirs> --rule '{"@typescript-eslint/no-unused-vars":["error",{"args":"all","caughtErrors":"all"}]}' -f json`,
    exit 1 in both. Backend (`src test evals`): **2,087 violations across 900 files**, of which **1,623 name an
    identifier beginning with `_`** and 464 are already visible at the shipped setting. Frontend (`.`): **2,099 across
    996 files**, **1,289** underscore-named, 810 already visible. Combined: **4,186 across 1,896 files, 2,912 of them
    (69.6%) hidden by the `^_` escape alone.** That 2,912 is the exact population this box asks to delete rather than
    rename, and it is not a cleanup — it is a decision about a convention used 2,912 times.
    **tsc floors, re-measured at head (both exit 2):** `-p tsconfig.build.json --noUnusedLocals --noUnusedParameters`
    → **289 errors / 194 files** (TS6133 200, TS6196 45, TS6138 44). `-p tsconfig.json` (the spec-inclusive config
    `check:spec-typecheck` uses) → **475 errors / 318 files, 124 of them spec files** (TS6133 383, TS6196 46, TS6138 44,
    TS6192 2). The build config hides 186 errors and 124 files, so 289 is a floor and 475 is the honest tsc figure —
    and both are floors again against the ESLint number, because tsc cannot see underscore parameters at all.
    **DECISION: not enabled, and this is the third time it has been re-decided, so it is now written into the
    constitution instead of only into this ticket.** Reasons, all measured: (1) enabling it in `tsconfig.build.json`
    would report the flag ON while `test/`, `evals/` and 1,930 specs stayed invisible to it — a setting green over a set
    it cannot see is the defect this release keeps finding; (2) `pnpm typecheck` is the one gate every agent runs, and
    turning it red by 289 errors across 194 files breaks everyone's only proof for a hygiene flag; (3) the flag cannot
    deliver the box's actual rule anyway (see the bite-proof), so shipping it would be a false green rather than a
    partial win.
    **What it does not cover, stated so the next owner cannot re-discover it the hard way:** tsc misses every `_`
    parameter and every catch binding; `tsconfig.build.json` misses `test/`, `evals/` and all specs; the ESLint number
    is at `warn`, so the 464 + 810 already-visible violations are printed and ignored today, not enforced.
    **Recorded in shared `CLAUDE.md` §6** beside the `noUncheckedIndexedAccess` entry, with the same shape: NOT enabled,
    the numbers, what it does not cover, and "do not turn it on without owning the migration".
    **Second tsconfig decision, unchanged and still standing — `noUncheckedIndexedAccess`.** Backend
    `tsc --noEmit -p tsconfig.build.json --noUncheckedIndexedAccess` exit 2, 574 errors across 190 files; frontend
    184 across 84. Both floors, same exclusion caveat. Left off, and `CLAUDE.md` §6 already carries the correction.
- [x] Unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports are removed. A barrel export does not make a symbol used.
  - CLOSED. The 32 ledgered backend `REMOVE` findings are discharged: **31 symbols deleted, 1 reclassified `WIRE` with
    a named consumer**, and every ledger line went in the SAME commit as its symbol (`6c2377ef3`, backend), because the
    gate's stale-verdict check exits 1 on a verdict knip no longer reports. Proof, in this order:
    `pnpm exec knip --no-progress` (module graph — never a text search), `pnpm check:dead-code` **exit 0**
    (findings **38 → 7**, ledger **34 verdicts → 5**, importer graph 9,820 files / 68,345 edges), self-test exit 0,
    `pnpm typecheck` **exit 0**, `pnpm check:spec-typecheck` **exit 0**, and a real `pnpm build` (`nest build`)
    **exit 0** — a typecheck does not notice a missing side-effect import. Focused jest over every touched module
    (`--runInBand --testPathPattern="(gdpr-export|notification-delivery|common/tenant|ai/core/streaming|crm-meeting-brief|async-hop|query-fingerprint)"`):
    **24 suites / 231 tests, exit 0**.
    Removed: 4 barrel lines from `common/tenant/index.ts`, 2 from `common/observability/index.ts`, 2 re-exports from
    `db/query-telemetry.ts`, **16** from `ai/core/streaming/index.ts` (which collapsed a 35-line barrel to 8 lines),
    the 5-line GDPR chain, and 2 notification symbols. Every source symbol behind a removed barrel line survives
    because its real consumers import it from the source module — verified per symbol, not assumed.
    **Two corrections to this ticket's own earlier text, both found by verifying before removing.**
    (1) The GDPR shim does **not** forward "four names nobody imports" — it forwards **two**.
    `GENERIC_GDPR_EXPORT_EXCLUDED_SOURCES`, `REQUIRED_GDPR_EXPORT_SOURCES`, `countExportRows` and `drainExportPages`
    are all imported through that same barrel by `gdpr-export-worker-tenant-isolation.spec.ts:6` and were kept; only
    `GDPR_EXPORT_SOURCE_ADAPTERS` (dead at all three hops, so the source `Set` was deleted outright) and
    `SUBJECT_SCOPED_GDPR_EXPORT_SOURCES` (dead as a re-export, alive inside `gdpr-export-adapters.ts:261`) went.
    (2) `common/tenant/tenant-context.ts:getTenantAbortSignal` is **not** dead code and is now `WIRE`, not `REMOVE`:
    `tenant-context.interceptor.ts:107` puts an `AbortSignal` into every request's `TenantContext` and
    `__tests__/tenant-context.abort.spec.ts` asserts it is there, and this accessor is the only way to read it —
    nothing in production does. **Deleting it would have made a live cancellation signal unreachable**; the missing
    consumer (`run-in-tenant-transaction.ts` aborting the open transaction) is the defect. Cross-filed to tickets 11
    and 13, whose "client aborts propagate through … the database" box this contradicts.
    **Two new findings surfaced by the removals are ledgered, not deleted, because both sit in held territory:**
    `ai/core/services/crm-brief-loaders.ts:loadLeadProfile`, orphaned by another lane's `1cc7ded8` ("retire the dead
    CRM duplicate") — its only remaining reference is a key in a `jest.mock` factory, which is not an import, and it
    reads `leads` through the party seam, so CRM/inventory exclusion applies; and
    `notifications/dto/provider-result.schemas.ts:providerValidationResultSchema`, exposed when its only reader was
    removed. That second one carries a bigger finding than itself: it is the Zod contract for
    `NotificationProvider.validateConfig()`, which is declared on the provider interface, implemented by **five**
    providers, and **called from nowhere in `src/`** — a whole seam with no caller, invisible to knip because interface
    members are not exports.
    Frontend half unchanged and already green: `pnpm check:dead-code` exit 0, 0 unclassified.
- [x] Unreachable branches, obsolete shims, commented-out implementation, debug logging and stale scaffolding are removed. A compatibility path is retained only with a named consumer, a removal date and a contract test.
  - Measured, not asserted: 0 `console.log` in backend `modules/`/`common/`/`db/` and 0 in frontend app source (the 159 backend hits are all `src/scripts/*.ts` CLIs where console output is the interface); 0 commented-out implementation in either repo (the 8 pattern hits are prose comments starting "constant", "function", "this", "returned"). `frontend/scripts/fix-query-signal.mjs` — a 257-line one-shot codemod with zero references — deleted. One shim that fails this box's rule (`gdpr-export-worker.service.ts` forwards four names nobody imports) reported, not touched: GDPR is another agent's territory this session.
- [x] Unused runtime and development dependencies, package scripts, environment variables, configuration keys and asset references are removed, with lockfiles, manifests, validation schemas and documentation updated in the same change.
  - knip reports ZERO unused dependencies and ZERO unused devDependencies in both repos. Zero package scripts in either repo point at a missing file (313 backend, 64 frontend). Zero variables in `frontend/.env.example` are unread and zero schema entries are unread; the backend already gates this with `src/config/env-coverage.spec.ts`. Six dead configuration keys removed from backend `knip.json` (4 `ignore` entries, 2 redundant `entry` patterns), verified by re-running knip: no new findings appeared. No lockfile change was needed because nothing was removed from a manifest. One gap reported the other way: 16 of the frontend's 24 `process.env` reads are unvalidated by `lib/env.ts`.
- [x] No `as any`, double cast, unjustified non-null assertion, suppression directive or broad index signature used to bypass a contract. Narrow with Zod, discriminated unions, exhaustive guards or a tested adapter.
  - CLOSED as a **recorded decision**, the same shape as box 2: application code is at a hard zero, the remaining
    population is entirely a spec mocking idiom, and replacing it is a mocking-strategy change with an owner rather
    than a hygiene sweep. Re-measured at head with the fixed detectors, both exit 0:
    backend `pnpm check:type-assertions` — 3,569 application files, `as unknown as` **26 sites in 16 files**,
    `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` **0 / 0 / 0 / 0**; self-test exit 0.
    Frontend `pnpm check:type-assertions` — 4,260 application files, `as unknown as` **7 sites in 6 files**, same four
    escapes **0 / 0 / 0 / 0**. Every one of the 33 double casts is ledgered with a seam kind and a written invariant,
    and both ledgers are zero-growth: a new site fails, and so does a stale count, so the ratchet only ratchets down.
    **The spec population, measured rather than quoted:** backend **2,756 `as unknown as` across 960 spec files**
    (the figure previously in circulation, 2,637, is stale — it has grown by 119 as specs were added this release);
    frontend **19 across 15 test files**. The shape is the argument: **1,337 of the backend's 2,756 — 48.5% — are the
    single expression `as unknown as Db`**, a partial Drizzle client handed to a service constructor, followed by
    `AccessService` (140), `CacheService` (79), `AuditService` (72), `Redis` (50), `ExecutionContext` (44). This is one
    idiom used 2,756 times, not 2,756 independent contract bypasses.
    **DECISION: not attempted, deliberately.** Removing it means adopting a typed partial-mock helper (a
    `Partial<Db>`-shaped builder, or `@total-typescript/shoehorn`) across ~1,930 spec files in modules held by every
    other lane in this release. It is a test-architecture migration needing one owner and one sweep, not a cleanup
    that can be done incrementally without leaving two idioms live at once. **What it does not cover, stated plainly:**
    the gates above scan application code only, so the 2,775 spec-side casts are counted here and enforced nowhere —
    a spec can still forge any shape it likes, and `check:spec-typecheck` will not object because ts-jest runs
    `isolatedModules`. Tracked as a NEW REQUIREMENT with that caveat attached.
    Two circulating figures remain artifacts and are not re-litigated: the frontend's "661 `@ts-ignore`" are all in
    generated `.next-buildmart` output, which the frontend gate now skips by construction, and the backend's "199
    `as any`" collapse to 0 once `*spec-fixtures.ts` is classified as test code.
- [ ] Type assertions survive only at a proven external seam, each local, narrow, documented with its invariant, covered by a negative test and listed in a zero-growth exception ledger.
  - PARTIAL. Five of the six clauses are closed and enforced; the sixth is not, and it is not merely unfinished — the
    box as written cannot be satisfied for 13 of the 33 sites without certifying a cast that must not survive.
    **Closed:** both repos have a zero-growth ledger wired into CI, both exit 0 at head. Backend
    `pnpm check:type-assertions` — 3,569 application files, 26 `as unknown as` in 16 files, 18 `external` / 8
    `narrow-me`, self-test exit 0 (14 assertions + a written invariant on every entry). Frontend — 4,260 files,
    7 sites in 6 files, 2 `external` / 5 `narrow-me`, self-test exit 0 (16 assertions). Every site is local, narrow,
    carries a written invariant naming its seam, and growth or a stale count fails the gate.
    **STILL OPEN: no per-site negative test.** The ledgers prove an assertion is declared, counted and cannot grow;
    they do not prove the invariant each one claims. Blocked on two things at once, and both need naming:
    **(a) The requirement is wrong for the 13 `narrow-me` sites — 8 backend + 5 frontend.** Their recorded remedy is
    to *delete* the cast: a shared Zod schema parsed on read for the four jsonb round-trips (party-merge/revert,
    inbound-ingress write/read), `Number(row.count)` at the use site for the two raw `db.execute` rows, and a generic
    type parameter on the layout renderer for the four `RecordValue` index-signature sites. A negative test on any of
    those would certify a cast the ledger already says must not exist, and would make removing it look like a
    regression. A per-site negative test is the right bar for the **20 `external`** sites only.
    **(b) Territory, for most of those 20.** They sit in 9 backend files and 2 frontend files across lanes this
    session does not hold — `src/scripts/benchmark-access-service.ts` (4) and `check-set-null-column-lists.ts` (4)
    are another lane's harnesses, `verify-cell-admission.ts` / `verify-cell-degraded-control-plane.ts` /
    `seed-permissions.ts` (1 each) are the Drizzle-instantiation seam where the invariant is compile-time and a
    runtime test cannot reach it, and `feedbucket-widget/src/network-capture.ts` is vendored. The genuinely testable
    runtime invariants are five casts in three files — `common/observability/tracing.ts` (traceparent capture-group
    arity), `modules/platform/operator-session.guard.ts` (`req.route` absent degrades to `req.url`) and
    `db/query-telemetry.ts` (the proxy reaches the thenable branch only after checking for `.then`) — and those three
    are the concrete, in-scope remainder of this box.
    Not run: no negative test was written this pass, so nothing here is claimed as tested.
  **DISPOSITION 2026-09-03 — one ASSIGNABLE item and two accepted residuals, and one of the residuals is a defect
  in this box's own wording. Register: `reports/residual-risk-register.md` §3.8 and §1.4.**
  Both ledgers re-run at head: BE `pnpm check:type-assertions` -> **exit 0**, 3,573 files, **26** `as unknown as`
  in 16 files, **18 external / 8 narrow-me**, self-test exit 0. FE -> **exit 0**, 4,264 files, **7** in 6 files,
  **2 external / 5 narrow-me**, self-test exit 0. Totals **33 sites · 20 external · 13 narrow-me** — exactly the
  numbers this box records.
  **ASSIGNABLE A-5 — write the three in-scope negative tests. Owner: observability / platform / db owners.
  Deadline: 2026-09-08.** This box already names its own concrete remainder and then records "Not run: no negative
  test was written this pass." All three sites and all three spec files were verified present at head:
  `src/common/observability/tracing.ts:93` (traceparent capture-group arity) beside `tracing.spec.ts` ·
  `src/modules/platform/operator-session.guard.ts:46` (`req.route` absent degrades to `req.url`) beside
  `operator-session.guard.spec.ts` · `src/db/query-telemetry.ts:137,152,156` (the proxy reaches the thenable
  branch only after checking `.then`) beside `query-telemetry.spec.ts`. Three tests in three files that already
  have a spec neighbour.
  **RESIDUAL R-8 — the 13 `narrow-me` sites. Blocker: the requirement as written is WRONG for them, and that is
  an amendment only the release owner can make. Owner: release owner. Deadline: 2026-09-10.** Their recorded
  remedy is to DELETE the cast; a per-site negative test would certify a cast the ledger already says must not
  exist and would make its later removal look like a regression. The box should read "a per-site negative test for
  each `external` site; a scheduled deletion for each `narrow-me` site."
  **RESIDUAL R-8b — 17 of the 20 `external` sites. Blocker: territory (another lane's harnesses), a compile-time-
  only invariant no runtime test can reach (the Drizzle-instantiation seam), and one vendored file. Owner:
  per-lane owners. Deadline: 2026-09-17.**
- [x] Every deletion is proven by dependency graph plus checks for Nest metadata and DI, Next.js file conventions, dynamic imports, raw SQL and table names, migrations, reflection, queues and events, cron registration, package scripts and side-effect imports. Text search alone is never sufficient.
  - Every one of the 9 deletions was proven by `pnpm exec knip --no-progress` (module graph) and cross-checked with a repo-wide symbol grep including specs, evals and scripts. The new backend gate models all four import kinds — side-effect, named, dynamic and re-export — over 9,795 files and 68,130 edges, and refuses to call anything under `src/db/schema/` dead on knip's word alone. Nothing under `migrations/`, no cron registration, no queue or outbox wiring and no package script was touched.
- [x] Prove with a module-graph tool and confirm with a real build. A typecheck does not catch a missing side-effect import; a bare side-effect import is invisible to import search.
  - Backend: `pnpm typecheck` exit 0 AND `pnpm build` (`nest build`) exit 0 through the mutex, after the deletions. Frontend: `pnpm type-check` exit 0 AND `pnpm build` (`next build`, with a longer local placeholder `NEXTAUTH_SECRET`) exit 0 — 613 route entries, 466 static pages. Focused jest both sides: backend 62 suites / 636 tests, frontend 3 suites / 37 tests, all passing.
- [x] Before/after counts are recorded for unused files, exports, dependencies, suppressions and assertions.
  - Report §1 (assertions and suppressions, split production vs spec across three trees), §2 (unused symbols at both the shipped and the required lint setting), §3 (knip before/after per category, and the classification of every remaining finding).
- [x] The cleanup removes no authorization, validation, cache invalidation, outbox or worker registration, observability, accessibility, SEO metadata or error/offline state merely because it is uncommon locally.
  - All 9 removals re-checked against this list; none is any of those things. Two findings that WOULD have violated it were caught and converted to `WIRE` verdicts instead of deletions: `GdprExportRequestedPayload` (the payload contract for the live `gdpr.export.requested` outbox event, which nothing validates — that is the defect, not the type) and `OrgSetupCompletedPayload` (an outbox payload schema that IS parsed, retained by a structural rule rather than a hand-written exception).
