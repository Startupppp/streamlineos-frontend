# 28d — Runtime parsing: the ratchet, the SSR hole, and what a violation does

Session S16, 2026-09-03. Ticket 28, boxes 6 and 8 (and the phantom seventh checkbox).

## Summary

Three boxes were carrying `[~]`. One of them was never an open box — it is the audit-trail
predecessor of an already-closed box and its marker made it read as open in every scan since.
The other two remain `[~]`, both with residues that were **re-measured rather than transcribed**,
and both changed materially in the process.

Box 8 (runtime parsing) got the thing the residual-risk register asked for and S14/S15 did not
write: a ratchet that fails the next unparsed endpoint. Writing it found a live hole in the guard
box 8 rests on, and the hole was covering three routes on that guard's own risk list.

## The honest fraction

**59 of 2,662 seam calls carry a runtime contract — 2.2%.**

Scope: `apiClient.get|post|put|patch|delete|upload`, `serverGet`, `publicGet`, `publicGetNoStore`
under `hooks/ app/ features/ components/ lib/`, non-test. 1,963 distinct routes are reachable;
49 of them are parsed somewhere; 49 risk-list routes hold a contract.

The previously recorded **55 of 2,502** counted `hooks/` only. That tree excludes **161 seam calls**
— 121 in `features/`, 18 in `app/`, 17 in `lib/`, 5 in `components/` — of which exactly **one** was
parsed. The two numbers are the same measurement over different trees; the wider one is the honest
one and the gate prints it on every run.

**Why this cannot be finished by generation.** `contracts/openapi.json` carries **1 response schema
across 3,613 operations** (measured: `200`/`201` responses with a `content` block). The backend's own
contract cannot tell the client what any route returns. Every contract has to come from the Drizzle
column plus the service projection, because a contract written from the frontend's own type encodes
the drift instead of catching it. That is per-route work and it is not finishable in this release.
The defensible position is the ratchet, and it is stated as partial coverage with the real number.

## The live hole

`/payroll/runs`, `/roles` and `/directory/workers` are all on this ticket's money/permissions/PII
risk list. All three had a **second, uncontracted read** in `lib/prefetch/**`.

That is worse than an ordinary uncovered route. The SSR read wins on first paint: its snapshot is
dehydrated and hydrated into the app's cache, so the contracted client `queryFn` — and its contract
— never runs until something invalidates the key. The contract was bypassed for exactly the render
the user sees.

`lib/api-contract-coverage.test.ts` could not see it, twice over:

- it scanned `hooks/` only, and `lib/prefetch/` is not under `hooks/`;
- its leak rule filtered `call.method === "get"`, and these are `serverGet`.

Proven rather than argued: on the pre-fix tree (`9ba5373ad^`) that suite is **7/7 green** while the
new gate exits 1 naming all three files and lines.

`lib/prefetch/payroll.ts` carried a second defect on top. It typed its response from
`types/payroll/runs.ts`, which disagrees with `payrollRunsPageContract` on six fields. The column
decides: `payroll_runs.gross_total`, `net_total`, `employee_count` and `exception_count` are all
`.notNull()` (`src/db/schema/payroll/runs.ts:30-35`), so the hand-written `string | null` was never
reachable — and the backend service's own return annotation repeats the same over-permissive lie.

**No new contract was authored for the fix.** All three already existed and had already been
verified against the backend; they were simply not wired to this seam.

## What a parse failure does

The decision was implicit in a branch inside `applyContract`. It is now `rejectContractViolation`
in `lib/api-envelope.ts`, typed `never`, carrying the reasoning on the function.

**It throws. Reads and writes, dev and production, no severity dial, no environment switch.**

1. A contract cannot fail cosmetically. `ResponseContract` is deliberately not `.strict()`, so an
   **added** backend field passes — that is the backward-compatible deploy, and it is allowed. The
   only remaining failures are a field removed, renamed or retyped: one this client declared and
   reads, which no longer arrives as declared.
2. Wrong-but-plausible only beats an error state for whoever does not have to act on it. Both
   shipped defects rendered a normal-looking screen — an empty Favourites list, a huddle roster of
   "Unknown". Nobody files a bug against a page that looks fine, which is why both survived clean
   typechecks on both sides for as long as they did.
3. The blast radius is already one query. The throw lands in that read's `error`;
   `readErrorReachesBoundary` then decides boundary or inline, the same as any 500.

**The asymmetry that looks right and is not.** Fail reads, but let a drifted *write* response
through, because the mutation already committed and throwing invites a duplicate retry and rolls
back optimistic state the server accepted. Sound in general; wrong here. The
highest-consequence contracted write in the product is `POST /organization/switch`, whose response
is what the session's active org is set from. Failing that one open is a cross-tenant outcome, and
one such route is enough to kill the rule. A route that genuinely cannot afford to fail closed
should lose its contract instead, where the gate counts it as unparsed and prints it.

## The ratchet

`frontend/scripts/check-response-contracts.mjs` — `pnpm check:response-contracts` and
`:self-test`. Six rules:

| Rule | Baseline | What it stops |
|---|---|---|
| new unparsed seam call | 2603 | the next endpoint shipped as a cast |
| risk-list route loses its contract | 49 routes | silent removal |
| risk-list route read uncontracted through **any** read seam | 0 | the SSR hole above |
| new unresolvable route | 18 sites / 15 files | a call no route rule can see |
| stale exception entry | — | the list rotting into an allowlist |
| scan floor | 2400 | a broken scanner reading as green |

The unresolvable list is not cosmetic. `hooks/api/chat-core-read.ts` is `drainChannelPages(path)` —
the exact call site the `members[].membership.user` defect shipped through — and because the path is
a parameter, no route-based rule in this gate or in `check:gated-reads` can see it.

**One scanner, not two.** `lib/api-contract-coverage.test.ts` carried its own copy with the two
holes above; it now consumes the gate's `--json`. This release has already paid once for two
implementations of one definition disagreeing (a read count reported as 81, 84 and 86).

**What the gate does not claim.** It certifies that a call site *passes* a contract, not that the
contract is *true*. A contract copied from a wrong frontend type passes and catches nothing. Only
reading the backend column makes one true.

## Box 6 (states) — two recorded residues were wrong

Re-measured with the TS compiler API over `app features components`, non-test `.tsx`:

- **(1) confirmed.** `fetchStatus` has **0** non-test occurrences. No surface reads the query's own
  pause signal; three shared components read `useOnlineStatus()` instead. Which is canonical is
  still an open design choice. A-25 stands.
- **(2) corrected.** The register says "zero in-scope screens consume the gate". False:
  `components/ui/empty-state.tsx:108` takes an `access` prop and renders `NoPermissionState` from
  it. **706 `<EmptyState>` render sites in 585 files; 40 pass `access=`.** The mechanism exists and
  40 surfaces use it. Residue: 666 sites. `useGatedQuery` re-counted at **237 across 104 files**.
- **(3) corrected.** The same component takes `filtersActive` / `filteredTitle` / `onClearFilters`,
  so filter-empty vs data-empty is already drawn by the shared empty state. Adopted at **91 of 706**
  sites. Residue: 615 sites.

The disposition changes from three unbounded design questions to prop adoption at a counted number
of sites. It is still not closable from `hooks/api/**`, and **ticket 30's box 1 is `[x]` closed**, so
as written all three are addressed to nobody. The release owner has to re-route them.

## Box "(superseded)" — never an open box

The `- [~] (superseded)` line sits immediately under "PREVIOUS STATE, kept for the audit trail:" in
the closed gated-reads box. Its successor was verified live this session — `pnpm -s check:gated-reads`
exit 0, 720 read sites, permissioned residue 0, unresolvable 0 — so the checkbox marker was removed
and the text kept as the audit trail it is. Nothing needed re-implementing.

## Files changed

```
frontend/lib/prefetch/payroll.ts
frontend/lib/prefetch/roles.ts
frontend/lib/prefetch/directory.ts
frontend/lib/prefetch/prefetch-contract.test.ts        (new)
frontend/lib/api-envelope.ts
frontend/lib/api-envelope-policy.test.ts               (new)
frontend/lib/api-contract-coverage.test.ts
frontend/scripts/check-response-contracts.mjs          (new)
frontend/package.json
```

## Cross-territory findings, not fixed here

1. **`types/payroll/runs.ts:115-127` is wrong and still has two consumers** —
   `features/payroll/runs/runs-page-content.tsx` and its test. `grossTotal`, `netTotal`,
   `employeeCount` and `exceptionCount` are declared nullable against `.notNull()` columns, and
   `runType` / `statutoryRuleVersion` are declared optional against columns that always arrive.
   The prefetch no longer uses it. Owner: the payroll screen owner. One-line change plus whatever
   `?? 0` it currently makes dead.
2. **The backend's own annotation repeats the same lie.**
   `streamlineos-backend/src/modules/payroll/runs/runs.service.ts:179-183` annotates `listRuns` with
   `grossTotal: string | null`, `netTotal: string | null`, `employeeCount: number | null`,
   `exceptionCount: number | null` over `.notNull()` columns. Harmless on the backend, but it is
   where a frontend author would go to check the shape. Owner: the payroll backend owner.
3. **`hooks/api/chat-core-read.ts:47` (`drainChannelPages`) builds its path from a parameter**, so
   `/chat/channels` is invisible to every route rule in `check:response-contracts` and
   `check:gated-reads`. This is the call site the `members[].membership.user` defect shipped
   through. Making the route literal at each call site is a small change in the chat data layer,
   which another lane is holding this session. **Not edited** — reported, per the territory split.
4. **`/chat/channels` and `/chat/channels/{id}/huddle` still carry no contract.** They are the two
   confirmed user-visible drift routes of this release and they are the obvious first entries on any
   coverage quota. They were deliberately left alone: writing a contract for them means declaring
   the true shape, which is exactly what the backend-emission sweep is deciding right now, and a
   contract written against a shape in flight would encode the drift. Owner: whoever lands the chat
   emission sweep, immediately after it lands.
