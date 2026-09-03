# 28 — Complete the TanStack Query data-layer contract

**What to build:** The remaining §8 criteria: key factories carrying every correctness dimension, access-gated queries, complete invalidation, safe optimistic state, correct cursor behaviour and runtime parsing that cannot silently accept a contract change.

**Blocked by:** None — can start immediately.

**Status:** 6 of 8 closed; the 7th checkbox was an audit-trail artefact and is no longer one.
2026-09-03 S16: box "(superseded)" was never an open box — it is the predecessor of the closed
gated-reads box and its marker is removed (verified live, `check:gated-reads` exit 0). Boxes 6
(states) and 8 (runtime parsing) stay `[~]`, both with re-measured residues. Box 8 gained the
ratchet the register asked for (`pnpm check:response-contracts`), a named parse-failure policy,
and a fix for three risk-list routes that were read uncontracted through the SSR prefetch seam.
Report `reports/28d-runtime-parsing-ratchet.md`.
2026-09-03 S15: box 2 is CLOSED. The openapi-permission gate S14 left
unwritten now exists as `frontend/scripts/check-gated-reads.mjs` / `pnpm check:gated-reads`, is
bite-proven in 8 directions hermetically, and the permissioned residue is **0** — 79 reads converted,
12 CRM/Inventory reads held back by name. Report `reports/28c-the-gated-reads-gate.md`.
2026-09-03 S14: box 2's three named residues are resolved or correctly
recorded — the import cycle is broken and the 2 gateable rbac reads are gated, the 10 BASE-const routes
resolved to 16 gated reads, and the 12 CRM/inventory ones are named below and deliberately NOT converted.
Boxes 6 and 7 were re-audited against source: box 6's "this is stale" note was itself wrong and the honest
per-screen number is now measured; box 7 was not moved. Box 2's blocker is GONE — the per-route permission was resolvable after all, from `contracts/openapi.json`'s `x-permission`, and 105 of the 133 ungated reads are converted (S13). It stays `[~]` only because 11 are deliberately held back and 10 could not be resolved. Boxes 6 and 7 were NOT worked in S13 and carry S12's state unchanged.

**Residual-risk disposition (2026-09-03):** every open box below now carries an ASSIGNABLE-or-ACCEPTED verdict, a named owner and a date, recorded inline under the box and in `reports/residual-risk-register-19-30.md`. Blockers were re-verified against source, a live gate run or a committed artifact rather than transcribed; where a stated blocker did not survive, the correction is inline.

- [x] One hierarchical key factory per domain, carrying organization, subject, scope, filters, sort and cursor dimensions as applicable.
      Evidence: 16 domain modules behind the single `queryKeys` facade; org/user live in the hash (`scopedQueryKeyHashFn`). Folded the last two out-of-registry key objects in (`hooks/api/hr/engagement.ts` 11 keys, `hooks/api/hr/succession.ts` 1 key) into new `lib/query-keys/hr-engagement.ts`; added the missing page-size dimension to `kb.researchBriefs` and `timesheets.payroll.exports`. `pnpm -s check:query-signal` exit 0; `lib/query-keys/key-factory-contract.test.ts` indexes 1119 registry entries (933 callable factories) and passes 8/8.

- [x] Queries are gated by effective access and required identifiers; a disabled query sends no unauthorized or malformed request.
      **S15 — CLOSED. The gate is written, and the residue is gone.**
      `frontend/scripts/check-gated-reads.mjs`, wired as `pnpm check:gated-reads` and
      `check:gated-reads:self-test` (19 fixtures). It resolves every raw read call site under
      `hooks/api/**` against `contracts/openapi.json` and fails on any whose route is
      `x-exposure: permissioned`. Four ratchets, all bite-proven hermetically in a `git archive HEAD`
      tree (the live tree was never modified): above baseline, BELOW baseline, an unresolvable
      ungated read, and a stale exception entry.
      **Bite proof, 8 directions:** clean 0 · self-test 0 · ungated permissioned read **1** · the
      same read behind a nested generic **1** · the same route hidden in a spread `queryOptions()`
      factory **1** · a path that is a variable **1** · the same route via `useGatedQuery` **0** · an
      ungated read on a PUBLIC route **0** · on a UNIVERSAL route **0** · restored **0**.
      **The baseline was measured, never assumed.** S14 said 84; my first scan said 81 and I adopted
      neither. Two scanner defects were found and fixed and the number re-measured after each:
      81 -> 86 (hook attribution by brace match is wrong — a braced PARAMETER TYPE dropped six reads
      into module scope, where the gate scope is the whole FILE and one unrelated `useCan` launders
      them) -> 17 visible after the parser fixes -> **0** after conversion. The 81-vs-84 gap is two
      implementations of one definition disagreeing, not a regression; treat neither as a fact, treat
      the gate's printed number as the fact.
      **Scan definition:** the WIDER of the two used this release (it counts a hook whose only
      `enabled` is a non-permission guard), i.e. S14's 155/100 family, NOT the narrow 133. The two
      must never be added or differenced; the definition is in the script header.
      `sign/public.ts` is resolved through its module-local `publicGet`, scores `public`, and is
      correctly NOT gated — fixture (e) and bite direction B6 both lock that in.
      **79 reads converted.** 74 in the first pass, then 5 more that only became visible once three
      parser defects were fixed: `[^<>()]*` cannot cross `apiClient.get<CursorPage<Thing>>` or
      `get<{ enabled: boolean }>`, and `\$\{[^}]*\}` closes on the inner brace of
      `${qs ? `?${qs}` : ""}`. Those hid `/build/all-work`, `/hr/workflows/instances/acted`,
      `/hr/recruitment/interviews`, `/hr/recruitment/talent-pools/{poolId}/members` and
      `/timesheets/exceptions`. Calls now resolve against their real HTTP method, and a queryFn in a
      spread `queryOptions()` factory is followed.
      All 33 distinct keys exist verbatim in `lib/rbac/permissions/`, so `tsc` bites on drift; four
      spot-checked against the controller decorator rather than the snapshot.
      The two `useInfiniteQuery` reads take `useCan` + composed `enabled` rather than a new wrapper —
      26 of the 30 files with an infinite read already gate that way and `useInfiniteAllWork` sits
      beside its own `useQuery` twin doing exactly that. Cost recorded, not hidden: `useCan`
      suppresses the request but puts no reason on the result.
      **Held back, named, deliberately NOT converted (out of release scope):** 12 permissioned reads
      in `hooks/api/leads.ts:32,43,52,60,69,79,90,257,266,288,303` (`crm:leads:view`) and
      `hooks/api/inv-ai-explain.ts:97` (`inventory:reports:read`). They sit in the gate's `HELD_BACK`
      map with a reason, so they are counted, printed under `--list`, and the entry FAILS if the file
      is deleted or gated.
      **What this box does NOT claim.** The gate certifies request suppression only. It would pass a
      `useGatedQuery` read whose `access` gate no screen consumes — and 274 of 275 are exactly that.
      The gate MEASURES that on every run and never fails on it; owner is ticket 30 (see box 6).
      Evidence: `pnpm -s check:gated-reads` exit 0 — 720 read sites, 50 ungated (21 universal, 12
      permissioned all held back, 11 public, 6 in-service), **0 unresolvable**;
      `check:gated-reads:self-test` exit 0, 19 fixtures; `pnpm -C frontend type-check` exit 0 / 0
      errors; `npx jest --maxWorkers=2` whole frontend suite exit 0 — 330 suites / 3208 tests;
      `npx eslint` on all 44 changed files exit 0, 0 errors (24 warnings, all pre-existing — the same
      44 files at HEAD~2 produce the identical count in a hermetic tree).
      PREVIOUS STATE, kept for the audit trail:
      SUPERSEDED — NOT AN OPEN BOX. Re-verified 2026-09-03 S16 against a live run, not a
      transcript: `pnpm -s check:gated-reads` exit 0 — 720 read sites, 50 ungated (21 universal,
      11 public, 6 in-service, 12 permissioned and all 12 held back by name), permissioned
      residue 0, unresolvable 0. Everything below this line is the predecessor of the `[x]` box
      above and is kept only for the audit trail. It was left carrying a `- [~]` marker, which
      made a closed box read as an open one in every subsequent scan; the marker is removed.
      Nothing here needs re-implementing.
      (previous text follows) Queries are gated by effective access and required identifiers.
      **S13 — the blocker dissolved.** The note below said this was blocked on "per-route backend reading".
      It is not: `contracts/openapi.json` carries `x-exposure` and `x-permission` per operation, generated
      from the controllers' own `@RequirePermission`. Re-scanned at head with the TS compiler API:
      **133 ungated `useQuery`/`useInfiniteQuery`/`useSuspenseQuery` calls** under `hooks/api/**` (the earlier
      123 did not count `.tsx` or `useSuspenseQuery`). Resolved against that contract: **115 permissioned,
      6 universal, 1 public, 1 in-service, 10 unresolved** (they build their URL from a `BASE` constant).
      All **55 distinct permission keys already exist in the frontend catalog**, so the gate cannot drift
      from the guard without failing `tsc`.
      **105 converted to `useGatedQuery`**, `pnpm -C frontend type-check` exit 0 / 0 errors,
      `check:cycles` exit 0 (no circular dependency), 65 suites / 725 tests green under
      `--testPathPattern="(hooks/api|lib/query-keys|lib/api-)"`.
      New `hooks/api/gated-read-suppression.test.tsx` — 14 cases over four representative hooks — proves
      the request is not sent while denied, IS sent once allowed, asks for exactly the key the backend
      route enforces, and carries the gate on the result so a screen can tell denied from empty. Its bite
      proof is an ungated `useQuery` on the same route, which still fires while denied.
      Spot-verified against backend source rather than only the snapshot (the snapshot is known to be stale
      on `git-integration`): support:macros:view, support:reports:view, surveys:analytics:view,
      hr:travel:view, hr:travel:manage, sign:envelope:view, crm:leads:view, tasks:read and
      settings:api-tokens:read each match their controller's decorator.
      **S14 — (a) and (c) are CLOSED; (b) is recorded, not converted.**
      (a) **DONE.** The cycle was real: `gated-query.ts` imports `usePermissionGate` from `access.ts`.
      Broken by moving the *pure* `gated()` / `Gated<T>` wrapper down into the existing leaf
      `lib/rbac/permission-gate.ts` (which imports only `PermissionKey`), so `access.ts` composes the
      same gate itself without importing the hook module. `gated-query.ts` re-exports both, so all 88
      importers are unchanged. `check:cycles` exit 0. `usePermissionGate` deliberately stayed in
      `access.ts` — **71 test files** `jest.mock("@/hooks/api/access")` and moving it would silently
      un-mock `useGatedQuery` in every one of them.
      The three reads resolve to **two** gates, not three: `/rbac/permissions` and
      `/rbac/discovery/members` are both `settings:rbac:manage` (verified against
      `src/modules/rbac/rbac.controller.ts:36-38` and `:97-99`, not only the snapshot) and are now gated;
      `/rbac/discovery/grantable` is `@AuthorizedInService` (`rbac.controller.ts:82`) — the service narrows
      to what the caller may delegate — so it correctly carries no gate, and the file now says so. It was
      already counted in (d) below; the "x3" was a double count.
      (c) **DONE.** The 10 unresolved `BASE`-const sites were read and resolved. They are **16** reads,
      not 10, and every one is `permissioned`. All keys verified against the controller decorator, not
      only `openapi.json`: `hr:accommodations:view` x3 (accommodations.controller.ts:59,70,130),
      `hr:emergency:manage` x3 (emergency.controller.ts:46,57,127), `hr:eventstream:view` x3
      (event-stream.controller.ts:31,41,47), `hr:identity:view` x3 (identity.controller.ts:48,91,130),
      `hr:policies:manage` x2 (simulator.controller.ts:94,104) and `hr:employees:view` x1 on
      `/hr/interview-questions` (hr-interview-questions.controller.ts:43). All 6 keys exist verbatim in
      the frontend catalog. `sign/public.ts:46,54` were in that same unresolved list and must NOT be
      gated: `/public/sign/{token}/session` and `.../documents/{id}/preview` are `x-exposure: public`.
      Two of those `queryFn`s also destructured `signal` and never passed it
      (`enterprise-ops-emergency.ts` event status, `enterprise-ops-event-stream.ts` metric-definitions) —
      a 30-second poll that could not be cancelled. Fixed in the same pass.
      (b) **NAMED, NOT CONVERTED — out of release scope.** 12 permissioned ungated reads sit in CRM and
      Inventory and are deliberately left alone: `hooks/api/leads.ts:32,43,52,60,69,79,90,257,266,288,303`
      (11 reads, all `crm:leads:view`) and `hooks/api/inv-ai-explain.ts:97`
      (`/inventory/ai/supplier-delay`, `inventory:reports:read`). Each is a one-line change once CRM and
      Inventory re-enter scope. The earlier "leads.ts x7" undercounted by 4.
      **STILL PARTIAL — what actually remains, measured at head with a fresh TS-compiler-API scan:**
      the scan (`useQuery`/`useInfiniteQuery`/`useSuspenseQuery` under `hooks/api/**`, non-test, whose
      enclosing hook mentions no `useCan`/`usePermissionGate`/`useAccess`/`useModuleEnabled`/`useScope`)
      reports **155 ungated read call sites**, of which **100 resolve to `x-exposure: permissioned`** in
      `contracts/openapi.json`, 22 universal, 9 public, 2 in-service and 22 absent from the snapshot.
      That is a *wider* definition than S13's 133 — S13 did not count a hook whose only `enabled` is a
      non-permission guard — so the two numbers are not comparable and the S13 "105 converted / 28 left"
      arithmetic does not carry forward. After this pass the permissioned residue is **84**; the largest
      clusters are `support/**` 18, `hr/recruitment/**` 17, `accounting.ts` 12, `leads.ts` 11 (excluded),
      `timesheets-core/**` 7, `hr/hr-workflows.ts` 4. Every one has a resolved key already; this is
      mechanical volume, not a blocker.
      **The openapi-permission GATE was NOT written.** — SUPERSEDED BY S15: it is written, wired as
      `pnpm check:gated-reads`, bite-proven in 8 directions, and its baseline is 0 with 12 CRM/Inventory
      reads held back by name. The "recorded baseline of 84" in this note was S14's own measurement and
      S15 could not reproduce it (81 on a first independent scan, 86 after fixing hook attribution);
      do not carry 84 forward as a fact.
      (c) 10 unresolved, all building their path from a `BASE` const:
      `hr/enterprise-ops-accommodations.ts:64`, `hr/enterprise-ops-emergency.ts:52`,
      `hr/enterprise-ops-event-stream.ts:52,60,68`, `hr/enterprise-ops-identity.ts:66,74`,
      `hr/enterprise-ops-simulator.ts:30`, `hr/recruitment/interviews.ts:267`, `sign/public.ts:46`.
      Each needs its `BASE` read and its route looked up — mechanical, not blocked.
      (d) 6 universal / 1 public / 1 in-service correctly need no gate: `/me/login-history`,
      `/org/announcements`, `/sessions`, `/auth/mfa/status`, `/me/org-display`, `/billing/plans`,
      `/blog/feed`, `/rbac/discovery/grantable`.
      The **required-identifier** half of this box was NOT re-audited in S13.
      Evidence: `pnpm -s check:command-catalog` exit 0 — 1504 mutation hooks classified, 0 unclassified; 66/70 gated reads carry a backend-enforced key. Made `projectId` a required key dimension for QA/bugs/incidents and gated the 7 call sites (`?? 0` behind the existing `enabled`); added the missing `useCan("hr:succession:view") && useModuleEnabled("hr")` gate to `useSuccessionPlans`.
      Also closed this pass: `useExpenseByCategory` and `useTaxSummary` fired with `enabled: can` alone while `/accounting/reports/*` requires `from` AND `to` against a `.strict()` DTO — every read before a date was picked was a guaranteed 400 that rendered as a broken empty state. Both now wait for the identifiers.
      PARTIAL: an AST scan of `hooks/api/**` finds **123 of 929** `useQuery`/`useInfiniteQuery` calls with no `enabled` gate at all (e.g. `hooks/api/accounting.ts:74,280,340,429`, `hooks/api/blog.ts:22`, `hooks/api/git-integration.ts:52`). Each needs its exact backend `@RequirePermission` key; `check:command-catalog` does not cover them because it only classifies `useGatedQuery` reads. Blocked on per-route backend reading, not on another territory.

- [x] Every mutation invalidates or updates each affected list, detail, count and dashboard key, and rolls optimistic state back safely on failure.
      Evidence: **291 invalidation call sites across 82 key factories were matching nothing** (see the last box). Fixed at the factory. Separately, 20 mutation hooks spread `...options` *after* their own `onSuccess`, so a caller-supplied handler would silently delete the invalidation — spread moved ahead of the callbacks in 6 files; the AST scan now reports 0 unguarded. Rollback: all 26 `onMutate` hooks audited — every one that patches the cache has a matching `onError` restore.

- [x] Optimistic updates are used only where concurrency semantics are defined; otherwise the backend result is awaited and invalidation is deterministic.
      Evidence: 26 `onMutate` hooks in `hooks/api/**`; the three without `onError` (`organization.ts`, `crm/deals.ts:357`, `build/ticket-related-links.ts`) patch no cache — they only set a flag or `cancelQueries`. No unrolled-back optimistic write remains.

- [x] Cursor pagination neither duplicates nor skips records, and changing filter or sort resets pagination. Test with disagreeing ids — an id-only cursor against a compound sort silently duplicates and skips.
      Evidence: AST audit of all 33 `useInfiniteQuery` call sites. One derives its own cursor (`notifications-inbox.ts`) and took `page[page.length-1].id`, which is only correct if rows arrive in sort order — replaced with the page minimum, matching the backend's `orderBy(desc(id))` + `lt(id, cursor)`. New `hooks/api/cursor-pagination-contract.test.tsx` (6 tests) exercises disagreeing ids `[90,12,41]`, a falsy `id: 0` cursor round trip, and a filter change; reverting the hook fix turns 2 of the 6 red.

- [~] Loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states are each covered.
      **S16 — RE-MEASURED AT HEAD. The data-layer half is still closed; two of the three recorded
      residues were WRONG in the direction that made them look unbounded, and both are now a
      countable adoption number in `app/**` / `features/**`.**
      (1) CONFIRMED unchanged. `grep -rn fetchStatus app features components hooks lib`, non-test:
      **0** real occurrences (3 hits, all the variable `refetchStatus` in
      `features/hr/onboarding/onboarding-detail-page.tsx`). No surface reads the query's own
      pause signal; the three shared components read `useOnlineStatus()` instead. Which signal is
      canonical is still an open design choice. **A-25 stands.**
      (2) **CORRECTED — the register's "zero in-scope screens consume the gate" is false.**
      `components/ui/empty-state.tsx:108` takes an `access` prop and renders `NoPermissionState`
      from it, so the shared mechanism for consuming a read's own gate EXISTS. Measured with the
      TS compiler API over `app features components` (non-test .tsx): **706 `<EmptyState>` render
      sites in 585 files, of which 40 (in 40 files) pass `access=`.** So 40 surfaces take the
      refusal from the read; 666 do not. `useGatedQuery` call sites re-counted: **237 across 104
      files**, matching the register and superseding the older 180/83. The residue is adoption of
      an existing prop at 666 sites, not a component that needs building. **A-26 stands, resized.**
      (3) **CORRECTED — also already built.** The same component takes `filtersActive`,
      `filteredTitle` and `onClearFilters`, i.e. filter-empty vs data-empty is a distinction the
      shared empty state already draws. Adopted at **91 of 706** render sites (90 files).
      Residue: 615 sites. **A-27 stands, resized.**
      Still not closable from `hooks/api/**`: all three residues are per-screen prop adoption.
      **Owner: the release owner must re-route — ticket 30's box 1 is `[x]` CLOSED, so as written
      these three are addressed to nobody.** Deadline unchanged: 2026-09-17.
      **RESIDUAL-RISK REGISTER 2026-09-03 — THIS BOX IS ROUTED TO A BOX THAT IS ALREADY TICKED.**
      Its remainder is assigned to "ticket 30 (per-screen states) for (1) and (2); ticket 27 for (3)". **Ticket
      30's corresponding box is its box 1 — "Loading, empty, error, offline and permission-denied states are
      present on every authenticated surface" — and it is `[x]` CLOSED**, at 22/22 over 556 authenticated route
      modules with 0 missing loading states, 0 missing read-error branches and 0 missing permission gates. Ticket
      30's two open boxes are keyboard/screen-reader semantics and browser journeys; neither will pick this up.
      Three items of real per-screen work are therefore addressed to nobody. **The register's ask is that the
      release owner re-routes them, or re-opens ticket 30 box 1 for the per-screen half.**
      None of the three is blocked:
      **A-25 (ASSIGNABLE)** — item (1), which offline signal is canonical. The literal claim was re-verified: a
      non-test grep for `fetchStatus` across `app features components hooks lib` returns **zero** real occurrences
      at head (the only hits are a variable named `refetchStatus`). A design choice plus three shared files.
      **Owner: frontend shared-components owner. Deadline: 2026-09-17.**
      **A-26 (ASSIGNABLE)** — item (2), and it is **bigger than recorded**. Re-counted at head with a coarser grep
      than this ticket's scanner: **237 `useGatedQuery` call sites across 104 files** under `hooks/**` (recorded:
      180/83), and `access.denied` is read on **8 surfaces, every one of them under `crm/`**. This ticket says
      "exactly one, and that file is CRM"; the honest number is eight, and the conclusion is stronger than drawn —
      **zero in-scope screens consume the gate**, out of 237 gated reads. *My counts are coarse greps and should be
      re-derived by whoever picks this up; the direction is not in doubt.* **Owner: per-screen owners, after
      re-routing. Deadline: 2026-09-17.**
      **A-27 (ASSIGNABLE)** — item (3), filter-empty vs data-empty, per page. **Owner: ticket 27 owner. Deadline:
      2026-09-17.**
      **S14 — worked. The "this note is stale" note was itself wrong, and item (1) is now measured.**
      (1) **CORRECTED, and it cuts both ways.** Literally, "no surface reads `fetchStatus === paused`"
      is **still true**: `grep -rn fetchStatus app features components hooks lib` finds **zero**
      non-test occurrences. `components/shared/loading-state.tsx:121`, `components/ui/data-table.tsx:74`
      and `components/ui/data-table-skeleton.tsx:33` read **`useOnlineStatus()`** — the browser's
      `navigator.onLine` plus the window online/offline events — not the query's own `fetchStatus`.
      Substantively the S11 pass DID land: an offline read renders "paused" copy on those three surfaces
      instead of an indefinite skeleton. But the two signals are not the same thing. `useOnlineStatus`
      is global and cannot say *this* read is paused, so a read paused by TanStack's `onlineManager`
      while the browser believes it is online still renders as loading, and a screen using neither
      shared component gets nothing. Whoever closes this must decide which signal is canonical.
      `useOnlineStatus` now has 6 non-test consumers (shell banner, notifications inbox, inbox actions,
      mail compose, `DataTable`, `DataTableSkeleton`, `LoadingState`), plus the private duplicate at
      `features/inventory/components/tools/barcode-client.tsx:26`, still there and out of release scope.
      (2) **MEASURED, and worse than "66 of ~70".** There are now **180 `useGatedQuery` call sites across
      83 files** in `hooks/**`, so every one carries the `access` gate on its result. **Exactly one
      surface in the entire app reads it** — `features/crm/timeline/my-tasks-panel.tsx:59`
      (`tasks.access.denied`), and that file is CRM. 40 files render `NoPermissionState`, but they all
      derive the decision from a separate `useCan` rather than from the read's own gate, so
      denied-vs-empty is re-derived beside the read instead of taken from it. The data layer's half of
      this box is done; the 179 unread gates are an `app/**` / `features/**` change.
      (3) Unchanged: filter-empty vs data-empty is a per-page distinction the hook cannot make.
      **OWNER: ticket 30 (per-screen states) for (1) and (2); ticket 27 for (3).** Nothing in items
      (1)-(3) is in the data-layer territory, so this box cannot be closed from `hooks/api/**`.
      Evidence (data-layer half, CLOSED): `hooks/api/read-state-contract.test.tsx` (new, 14 tests, all pass) proves all eight states are produced and, crucially, *distinguishable* at the hook layer — a disabled v5 query reports `isPending: true, isFetching: false`, identical to a finished empty read, so empty-vs-denied is separated only by `useGatedQuery`'s `access` gate, and denied-vs-not-yet-known only by `PermissionGate.pending`. Offline is `fetchStatus === "paused"` (TanStack `onlineManager`), which the test shows resuming on reconnect; partial error is the explicit `INLINE_READ_ERROR` opt-out; full error is `readErrorReachesBoundary`, which a contract violation now reaches too.
      PARTIAL: the per-screen half stays open for ticket 30 — the data layer can only make a state renderable, it cannot make a page render it. What remains, precisely: (1) no surface reads `fetchStatus === "paused"`, so every screen renders an offline read as an indefinite skeleton (`useOnlineStatus` has 3 consumers: the shell banner, the notifications inbox, and a private copy inside `features/inventory/components/tools/barcode-client.tsx:26` that duplicates `hooks/common/use-online-status.ts`); (2) 66 of ~70 gated reads carry the `access` gate but the page-level audit of which ones render `NoPermissionState` vs an empty state is an `app/**`/`features/**` count; (3) filter-empty vs data-empty is a per-page distinction the hook cannot make.

- [~] Runtime parsing rejects a backend contract change rather than silently accepting it; client types mirror the backend schema exactly.
      **S16 — the ratchet the register asked for now exists, and the recorded fraction was
      measured over too small a tree. STILL PARTIAL, and the box still cannot be met as worded.**
      **The honest fraction is 59 of 2,662 seam calls — 2.2% — across `hooks/ app/ features/
      components/ lib/`.** The previously recorded 55/2,502 counted `hooks/` only and was blind
      to **161 seam calls elsewhere**, of which exactly 1 was parsed. 49 risk-list routes hold a
      contract; 1,963 distinct routes are reachable and 49 of them are parsed somewhere.
      **Why it cannot be finished by generation, measured not assumed:** `contracts/openapi.json`
      carries **1 response schema across 3,613 operations**. Every contract has to be derived from
      the backend's Drizzle columns and service projection, because one written from the
      frontend's own type encodes the drift instead of catching it. Per-route work; unchanged.
      **A live hole was found and fixed.** `/payroll/runs`, `/roles` and `/directory/workers` are
      all on this ticket's own money/permissions/PII risk list and all three had an UNCONTRACTED
      second read in `lib/prefetch/**`. The SSR read wins on first paint — its snapshot is
      hydrated into the app cache, so the contracted client `queryFn` never runs until something
      invalidates the key — so the contract was bypassed for the render that matters. The old
      guard could not see it twice over: it scanned `hooks/` only, and its leak rule matched
      `method === "get"`, never `serverGet`. Proven, not argued: on the pre-fix tree
      `lib/api-contract-coverage.test.ts` is **7/7 green** while `check:response-contracts` names
      all three. `lib/prefetch/payroll.ts` was additionally typed from `types/payroll/runs.ts`,
      which disagrees with `payrollRunsPageContract` on six fields — `gross_total`, `net_total`,
      `employee_count`, `exception_count` are `.notNull()` columns
      (`src/db/schema/payroll/runs.ts:30-35`), so the hand-written `| null` was never reachable.
      No new contract was authored: all three already existed and were already verified.
      **The parse-failure policy is now a decision in the code, not an implicit branch.**
      `rejectContractViolation` in `lib/api-envelope.ts`, typed `never`: a violation THROWS on
      reads and writes, in dev and production, with no severity dial and no environment switch.
      Justification and the rejected alternative are on the function. The alternative that looks
      right and is not: fail reads, let a drifted WRITE response through because the mutation
      already committed and throwing invites a duplicate retry — `POST /organization/switch`
      kills it, since its response is what the session's active org is set from.
      **THE RATCHET:** `frontend/scripts/check-response-contracts.mjs`, wired as
      `pnpm check:response-contracts` / `:self-test`. Six rules: a new unparsed seam call fails
      (baseline 2603), a risk-list route losing its contract fails, a risk-list route read
      uncontracted through ANY read seam fails, a new unresolvable route fails (18 sites in 15
      files are named and frozen — including `hooks/api/chat-core-read.ts`, the
      `drainChannelPages(path)` call site the `members[].membership.user` defect shipped
      through, which no route rule can see), a stale exception entry fails, and a scan that
      finds too little fails instead of reading green.
      **One scanner now, not two.** `lib/api-contract-coverage.test.ts` carried its own copy with
      the two holes above; it consumes the gate's `--json` instead. This release has already paid
      for two implementations of one definition disagreeing (81 / 84 / 86 on box 2).
      **What this does NOT claim:** the gate certifies that a call site PASSES a contract, not
      that the contract is true. A contract copied from a wrong frontend type passes and catches
      nothing. Only reading the backend column makes one true.
      **Recommendation unchanged and now costed:** amend the box to "every money / permissions /
      tenancy / PII route parses at runtime, enforced by a ratchet; the remainder is scheduled",
      and set a per-release quota against the 2,603 residue. **Owner: per-module frontend owners;
      release owner sets the quota and decides the amendment. Quota by 2026-09-17.**
      Evidence: `pnpm -s check:response-contracts` exit 0 — 2662 scanned / 59 parsed / 2603
      unparsed / 18 unresolvable / 49 risk-list routes held; `:self-test` exit 0, 12 assertions;
      `lib/prefetch/prefetch-contract.test.ts` 9 tests, 5 red against the pre-fix tree;
      `lib/api-envelope-policy.test.ts` 8 tests, 6 red when the policy is reversed to
      log-and-continue; `lib/api-contract-coverage.test.ts` 7 tests, 4 red on the pre-fix tree
      where its old self-contained copy was 7/7 green.
      **RESIDUAL-RISK REGISTER 2026-09-03 — R-20 (ACCEPTED RESIDUAL · SCALE), and this box CANNOT BE MET AS
      WORDED.** The honest fraction is this ticket's own: **55 of 2,502** seam call sites under `hooks/` carry a
      runtime contract (**52 of 1,012** GETs) across 49 routes — **2.2%**. Each conversion needs the backend
      response shape verified first, because a contract written from the frontend's own type would encode the drift
      instead of catching it, so it is per-route work and cannot finish in this release.
      What IS in place is a risk-weighted ratchet: `lib/api-contract-coverage.test.ts` fails if any
      money / permissions / tenancy / PII route loses its contract or gains a second un-validated call site, and it
      is bite-proved on `/billing/entitlements` and `POST /organization/switch`. That is the defensible position and
      it is not what the box asks for.
      **Recommendation: amend the box** to "every money/permissions/tenancy/PII route parses at runtime, enforced by
      a ratchet; the remainder is scheduled" — the same shape as R-8 in `reports/residual-risk-register.md`.
      Otherwise it fails for a reason nobody disagrees with. **Owner: per-module frontend owners, with the release
      owner setting a per-release quota and deciding the amendment. Quota by 2026-09-17; review 2027-03-03.**
      *Not independently recounted: the 55/2,502 and 52/1,012 figures are this ticket's.*
      **S14 — re-audited, NOT moved.** The "note for the next run" S13 filed here was a verbatim copy of
      box 6's note and says nothing about runtime parsing; ignore it. No new contracts were written this
      session — adding one requires verifying the backend response shape per route, and no route was
      verified — so the fraction below is unchanged and is NOT claimed as progress.
      Evidence: runtime validation now exists at the one seam. `parseApiResponse<T>(res, contract?, resource?)` takes an optional Zod contract; `apiClient.get/post/put/patch/delete/upload`, `serverGet`, `publicGet` and `publicGetNoStore` all thread it. A violation throws `ApiContractError extends ApiError` (`code: "CONTRACT_VIOLATION"`, `resource`, `issues[]`, capped at 10), so it renders through the existing `getErrorMessage` + `readErrorReachesBoundary` path as an error state — never a raw `ZodError`, never a silent pass. It is also `reportError`ed with the resource and the issue paths. The single remaining cast lives in one named function, `assertUnchecked`, which is the un-validated path made explicit.
      Proof: `lib/api-envelope-contract.test.ts` (new, 26 tests) rejects a renamed field, a retyped field, a removed nested field, null/array-for-object, a missing envelope, an empty 204, a bad list element (named by index) and an out-of-enum permission scope — and asserts the same body passes silently *without* a contract, which is the defect being removed. `hooks/api/response-contracts.test.ts` (new, 29 tests) runs the 15 shipped contracts against the payloads the backend services actually build (verified against their controllers and Drizzle column types) and then against the specific drift each exists to catch.
      Guard: `lib/api-contract-coverage.test.ts` (new, 7 tests) parses all 2490 seam calls under `hooks/api/` with the TS compiler API and fails if any route on the money/permissions/tenancy/PII list loses its contract, or gains a second un-validated call site. Verified to bite: removing the `/billing/entitlements` contract turns 2 of its 7 red.
      Drift found and fixed by doing this: `AiCreditTransaction.costUsd` was typed `number | null` but is a Postgres `numeric(12,6)` that arrives as a **string**; `Entitlements.limits` was missing `hrCandidates` and `hrJobPostings`; `AccessResponse` declared `enabledModules` and `tier`, neither of which `/me/access` has ever sent; `OrganizationPerson.accountAccess` was optional but is attached unconditionally.
      Second pass (S12) took it from 15 routes to **49**: platform billing and seats, customer invoicing, AR payments and credit notes, the COA tree and setup status, bank accounts, the tax and expense-by-category reports, the general ledger and its accounts, payroll runs / run employees / report summary, ESS salary structure / reimbursements / loans, roles and role simulation, org modules and per-user module access, directory workers, user stats, organization members, the org list and **`POST /organization/switch`**. Strictness is deliberate and documented on `ResponseContract` in `lib/api-envelope.ts`: NOT `.strict()`, because an added backend field is a backward-compatible deploy while a removed, renamed or retyped field is the drift this catches — and a plain object rejects all three. The backend request DTOs ARE `.strict()`, which is what made the `page` param on `/organization/members` a 400 rather than a silent strip.
      More drift found and fixed by writing them: `/organization/members` is keyset-paginated and the client declared `{ page, total, totalPages }`, a shape the server has never sent, while putting `page` on the wire against a strict DTO — the read 400s, and `joinedAt` was typed `Date` when it is an ISO string. `/accounting/general-ledger` disagrees with the client type on four field NAMES and emits every amount as a JSON number; `/accounting/general-ledger/accounts` is a bare array the client read as `.items`, so the ledger's account picker listed nothing and its date column was blank. `/finance/bank-accounts` is a page, not an array, and masks the account number. `accountType` is a pg enum on both the COA tree and the ledger accounts.
      `lib/api-contract-coverage.test.ts` now scans **all of `hooks/`**, not just `hooks/api/` — the org-switch seam, whose response is what the session's active org is set from, lives in `hooks/common` and the old anchor could never see it. Verified to bite: removing the `/organization/switch` contract turns the gate red naming that route.
      PARTIAL — the honest fraction: **55 of 2502** seam call sites under `hooks/` carry a contract (**52 of 1012** GETs) across **49 distinct routes**, plus the server seam at `lib/rbac/get-server-access.ts`. The other ~2447 remain unchecked casts. Each conversion needs its backend shape verified first — a contract written from the frontend's own type would encode the drift instead of catching it — so this is per-route work, not a codemod.

- [x] A key factory is never called with no arguments — a trailing undefined matches nothing and silently kills the invalidation it was written for.
      Evidence: AST scan found **291 under-supplied call sites over 82 factories** producing keys such as `["streamlineos","inventory","stockLevels",undefined]` while every reader keys on `stockLevels(filters)` — 25 mutation sites alone could never refresh a stock list. Verified against `partialMatchKey` in `@tanstack/query-core@5.90.12`. Fixed by making the optional tail conditional in **211 factories** across 14 files plus 12 hand-fixed sentinel/interior cases; re-scan reports 0. Guarded permanently by `lib/query-keys/key-factory-contract.test.ts`, which fails on any factory or call site that reintroduces the shape. `hooks/api/mail.test.ts` previously *asserted the broken behaviour* ("finds ZERO — proves the trailing-undefined trap") and is rewritten as a positive regression test.

## Verification run for this ticket

Session S16 (2026-09-03) — box 8's ratchet, the SSR prefetch hole, and the parse-failure policy.
Every number below was produced by a command run in this session and read, with the exit code
captured by `$?` (`${PIPESTATUS[0]}` does not work in this zsh).

- `pnpm -C frontend type-check` → **exit 0, 0 errors**. (An earlier run in the same session showed
  6 errors, all in `features/build/whiteboard/`, `features/org-setup/` and `features/sign/` —
  another lane's in-flight work, fixed by them before the final run. None were in these paths.)
- `npx eslint lib/prefetch/{payroll,roles,directory}.ts lib/prefetch/prefetch-contract.test.ts
  lib/api-envelope.ts lib/api-envelope-policy.test.ts lib/api-contract-coverage.test.ts
  scripts/check-response-contracts.mjs` → **exit 0, 0 errors, 0 warnings**.
- `npx jest --maxWorkers=2 --testPathPattern="(lib/api-|lib/prefetch|lib/query-|hooks/api/response-contracts|hooks/api/read-state|hooks/api/cursor-pagination|hooks/api/gated-read)"`
  → **exit 0, 29 suites / 292 tests**.
- `pnpm -s check:response-contracts` → **exit 0** — 2662 seam calls scanned, 59 parsed (2.2%),
  2603 unparsed (baseline 2603), 18 unresolvable sites in 15 files, 49 risk-list routes held.
- `pnpm -s check:response-contracts:self-test` → **exit 0, 12/12 assertions**.
- `pnpm -s check:gated-reads` → **exit 0** (720 read sites, permissioned residue 0).
- `check:query-signal` 0 · `check:query-scope` 0 · `check:over-300` 0 · `check:dead-code` 0 ·
  `check:cycles` 0 (no circular dependency).

Bite proofs — all planted in `git archive` temp trees; the shared working tree was never modified.

- New gate, 6 directions: clean **0** · self-test **0** · a new UNPARSED endpoint **1** · the same
  endpoint WITH a contract **0** · `/me/access` losing its contract **1** · restored **0**.
- The hole the old guard could not see: on the pre-fix tree (`9ba5373ad^`),
  `lib/api-contract-coverage.test.ts` is **7/7 green** while `check:response-contracts` exits **1**
  naming `lib/prefetch/directory.ts:18`, `payroll.ts:18` and `roles.ts:27`.
- `lib/prefetch/prefetch-contract.test.ts`: **9/9** against the fix, **5 of 9 red** against the
  pre-fix tree — every drift-rejection case, none of the happy paths.
- `lib/api-envelope-policy.test.ts`: **8/8** as written, **6 of 8 red** when
  `rejectContractViolation` is reversed to log-and-continue.
- Rewritten `lib/api-contract-coverage.test.ts`: **7/7** at head, **4 of 7 red** on the pre-fix tree.

Red gates that are **not** this ticket's, re-verified this session:

- `check:file-sizes` exit 1 — `hooks/api/notifications-inbox.ts` (534) and its test (663), both
  already that size at the S12 starting commit. `features/hr/cases/cases-page-content.tsx` has since
  been fixed by another lane and no longer appears. `scripts/check-response-contracts.mjs` (528) is
  not in the gate's scan set.


Session S12 (resumed after the watchdog killed S11 mid-sweep):

- `pnpm -C frontend type-check` → **exit 0, 0 errors**.
- `jest --maxWorkers=2 --testPathPattern="(hooks/api|lib/query-keys|lib/api-|lib/date-utils|features/calendar|features/accounting)"` → **79 suites, 817 tests, all pass**.
- `check:query-scope` 0 · `check:query-signal` 0 · `check:effect-fetches` 0 · `check:cycles` 0 · `check:contract-drift` 0 · `check:over-300` 0 (519/519, back at baseline after splitting the money contract suite) · `check:dead-code --self-test` 0 (18 assertions).
- `check:dead-code` → **exit 1, 1 unclassified** (was 41). The remaining one is `features/build/analytics/project-charts.tsx:CHART_COLORS`, another territory. The 36 data-layer types are answered by one structural rule and 23 hand-written KEEPs were deleted; the 3 unwired contracts it exposed are now wired. Bite-proven end to end: un-wiring `expenseByCategoryContract` turns the real run red naming that export.
- Gate bite proof: removing the `/organization/switch` contract turns `lib/api-contract-coverage.test.ts` red with `missing: ["/organization/switch"]`.

Red gates that are **not** this ticket's, verified pre-existing at the session's starting commit `2556ab503`:

- `check:command-catalog` exit 1 — 3 WRONG-KEY on `hooks/api/git-integration.ts`. The frontend is right and the snapshot is stale: `git-connections.controller.ts` moved to `integrations:git:manage` (uncommitted, another lane) while `contracts/openapi.json` was generated at 16:25 and still says `settings:manage`.
- `check:file-sizes` exit 1 — `hooks/api/notifications-inbox.ts` (534), `hooks/api/notifications-inbox.test.ts` (663), `features/hr/cases/cases-page-content.tsx` (501). All three were already that size at `2556ab503`.
- `check:routes` exit 1 — `app/api/media/image/route.ts`, the deliberate image-auth bridge documented in report 28.
- `check:import-direction` exit 1 — `shared-imports-feature: 20 (baseline 19)`. Every violation is `components/** -> features/**`; this session touched no file under `components/`.
