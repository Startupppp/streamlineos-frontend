# S7 · Ticket 28 — TanStack Query data-layer contract

## Headline: 291 invalidations were matching nothing

`queryKeys.<domain>.<list>()` — the no-argument call used at 291 sites to mean "the whole list" —
appended a literal `undefined` to the key, because 82 factories were written
`(params?: T) => [...base, "x", "list", params] as const`. Verified against
`partialMatchKey` in `@tanstack/query-core@5.90.12` (`Object.keys(b).every(...)`, so a filter
key ending in `undefined` matches only a query whose element at that index is *also* `undefined`).
Every reader keys on `list(filters)`, so the filter is an object and the match fails.

Concretely: `queryKeys.inventory.stockLevels()` is invalidated from **25** mutation sites —
adjustments, cycle counts, goods receipts, quality holds, recalls, sales orders, shipments,
transfers, reservations, purchase orders — and `useStockLevels(filters)` reads
`stockLevels(filters)`. Not one of those 25 could ever refresh a stock list.
`timesheets.entries` 11 sites, `timesheets.approvals` 10, `inventory.salesOrders` 9,
`inventory.purchaseOrders` 8, `users.invitations` 6, `hr.headcountRequests` 6.

The trap was already known and *frozen into a passing test*: `hooks/api/mail.test.ts` had
`it("messages() with no args finds ZERO — proves the trailing-undefined trap")`, asserting the
broken behaviour as correct and working around it with a hand-built prefix.

**Fix, at the factory rather than the 291 call sites:** a codemod made the optional tail
conditional in **211 factories** across 14 files, so `f()` is a true prefix of `f(x)` and
`f(x)` is byte-identical to before — zero behaviour change for correct call sites.
12 further cases were fixed by hand (sentinel defaults `?? "all"` / `?? null` that made `f()`
a *sibling* rather than a prefix; interior-optional identifiers). Re-scan: **291 → 0**.

## Guard so it cannot come back

`frontend/lib/query-keys/key-factory-contract.test.ts` (new) parses the registry with the TS
compiler API and asserts, for every factory and every partial call site in the repo, that
omitting the trailing optional argument yields (a) no literal `undefined` and (b) a real
`partialMatchKey` prefix of the full call. It found four classes I had not: the `?? "all"`
sentinels, interior-optional `projectId`s, `hr.importJobs` (3 more dead invalidations), and
the `hr.leaves*` identity params declared optional-with-default.

## Other defects found and fixed

- **20 mutations could have their invalidation deleted by a caller.** `hooks/api/build/{advanced,
  projects,sprints,ticket-related-links,time-entries}.ts` and `hr/attendance.ts` spread
  `...options` *after* their own `onSuccess`. CLAUDE.md §2 documents this for `enabled`; it is
  worse for `onSuccess`, which carries the invalidation. No caller passes one today (checked),
  so moving the spread ahead of the callbacks is a pure hardening. AST scan: 20 → 0.
- **An id-only cursor derived from page order.** `useInfiniteNotifications` used
  `page[page.length-1].id`, correct only if rows arrive in sort order. Backend is
  `orderBy(desc(id))` + `lt(id, cursor)`, so the safe continuation is the page *minimum*.
  Fixed; `hooks/api/cursor-pagination-contract.test.tsx` (new, 6 tests) proves it with
  disagreeing ids `[90,12,41]`, a falsy `id: 0` cursor round trip, and a filter change.
  Reverting the hook turns 2 of the 6 red — the test bites.
- **Two hooks whose page size drove the request but not the key** (`useKbResearchBriefs`,
  `useTimesheetPayrollExports`): two mounts with different limits shared one cache entry.
- **Two key objects outside the registry** (`hr/engagement.ts` 11 keys, `hr/succession.ts` 1),
  unprefixed and invisible to `queryKeys.hr.all`. One of them, `KEYS.leaderboard()`, had the
  same trailing-undefined bug, hidden from the registry scan because the factory was local.
  Folded into new `lib/query-keys/hr-engagement.ts`.
- **`useSuccessionPlans` had no `enabled` gate at all** — it fired for anyone. Gated on
  `hr:succession:view` + `useModuleEnabled("hr")`, matching the backend controller.
- **QA/bugs/incidents keys accepted `projectId?`**, putting `undefined` mid-key. Made required;
  the 7 call sites now pass `?? 0` behind their existing `enabled`.

## Not closed — with numbers

1. **Runtime response parsing does not exist.** `lib/api-envelope.ts::parseApiResponse<T>` casts
   the JSON body to `T` unchecked; **2 of 454** files under `hooks/api/` import Zod. A backend
   field rename is accepted silently everywhere. `check:contract-drift` passes but is *static*
   and scoped to `hooks/api/timesheets*` only (49 calls, 25 bodies unresolved). Closing this is
   a project (schema per response type, or a generated client), not a session.
2. **125 of 929 read hooks have no `enabled` gate.** e.g. `accounting.ts:74,280,340,429`,
   `blog.ts:22`, `git-integration.ts:52`, `api-tokens.ts:43`. `check:command-catalog` does not
   see them — it classifies `useGatedQuery` reads only (70 of them). Each needs its exact
   backend `@RequirePermission` key, so this is a per-hook audit, not a codemod.
3. **State coverage (loading/empty/offline/permission-denied/revoked)** is a per-page criterion
   in `app/**` + `features/**` — ticket 25's territory, actively being restructured.

## For the orchestrator

- **`pnpm -s check:query-scope` is red for a reason that is not a code defect.** All 16
  violations are inside `.next-buildmart/`, a stale build directory left by another session.
  `scripts/check-query-scope.mjs:6` excludes `.next` but not `.next-buildmart`, and
  `.next-buildmart` is not in `.gitignore` either. Zero violations in real source. Fix belongs
  to whoever owns `scripts/` + `.gitignore`.
- Transient `app/**` and `features/**` type errors appeared and cleared during the session
  (ticket 25 mid-edit). Final `tsc --noEmit`: 22 errors, all in the stale generated
  `.next/types/validator.ts`, **0 in source**.

## Gates run (all read, not assumed)

| Gate | Result |
|---|---|
| `tsc --noEmit` | 22 errors, all `.next/types/validator.ts`; 0 in source |
| `jest hooks/api lib/query-keys lib/query-keys-registry lib/query-scope-isolation lib/prefetch lib/hr-workforce-cache lib/optimistic-cache` | **58 suites / 547 tests, all pass** |
| `check:query-signal` | exit 0 |
| `check:command-catalog` | exit 0 (1504 mutations classified, 0 unclassified) |
| `check:effect-fetches` | exit 0 |
| `check:over-300` | exit 0 (510 of 5116, baseline 519) |
| `check:contract-drift` | exit 0 (static, timesheets only) |
| `check:query-scope` | exit 1 — 16/16 violations in `.next-buildmart`, 0 in source |
| `eslint` on all changed files | 0 errors, 11 pre-existing unused-import warnings |

## Files changed (all inside FE/hooks/**, FE/lib/query*/**)

**New**
- `frontend/lib/query-keys/key-factory-contract.test.ts`
- `frontend/lib/query-keys/hr-engagement.ts`
- `frontend/hooks/api/cursor-pagination-contract.test.tsx`

**Key registry** — `frontend/lib/query-keys.ts`, and under `frontend/lib/query-keys/`:
`access-and-crm.ts`, `accounting-and-support.ts`, `build-work.ts`, `collaboration.ts`,
`customer-work.ts`, `directory-and-ownership.ts`, `growth-and-sign.ts`, `human-resources.ts`,
`inventory.ts`, `knowledge-and-surveys.ts`, `payroll.ts`, `platform-core.ts`,
`platform-hierarchy.ts`, `support-and-workflows.ts`, `users-and-commerce.ts`

**Hooks** — under `frontend/hooks/api/`:
`build/advanced.ts`, `build/bugs.ts`, `build/incidents.ts`, `build/projects.ts`, `build/qa.ts`,
`build/sprints.ts`, `build/ticket-related-links.ts`, `build/time-entries.ts`,
`hr/attendance.ts`, `hr/engagement.ts`, `hr/succession.ts`, `kb/research-briefs.ts`,
`notifications-inbox.ts`, `timesheets/payroll.ts`, `mail.test.ts`

No file outside this session's territory was edited. No git command was run.

---

# S8 · Ticket 28 — runtime response validation (session 2)

## Headline: the seam validated nothing, and the types were already wrong

`parseApiResponse<T>` cast the JSON body to `T` unchecked at every one of 2490
call sites under `hooks/api/`. Adding validation to the seam and writing 15
contracts against the *backend* source found four live type lies the compiler
could never have caught:

- **`AiCreditTransaction.costUsd` was `number | null`.** It is a Postgres
  `numeric(12,6)` projected raw, so Drizzle hands back a **string**. The same
  field on `/billing/ai-credits/usage` really is a number, because that endpoint
  casts `::text` then `Number()` server-side. One name, two runtime types.
  Nothing consumed the transaction-level field, which is why nobody noticed.
- **`Entitlements.limits` was missing `hrCandidates` and `hrJobPostings`.** The
  backend sends 14 limits; the client's `LimitKey` union listed 12.
- **`AccessResponse` declared `enabledModules?` and `tier?`.** `/me/access` has
  never sent either — the `enabledModules` every consumer reads comes off the
  NextAuth session, a different object entirely. Removed.
- **`OrganizationPerson.accountAccess` was optional.** It is attached
  unconditionally to every row by `resolvePeopleAccess`, and it is what decides
  whether a person shows as a member, an open invitation, or no account at all.

## The design

**One seam, opt-in per call, and the un-validated path named.**
`parseApiResponse<T>(res, contract?, resource?)` is where every response already
converged — `apiClient`, `serverGet`, `publicGet`. It now takes an optional Zod
contract; the six `apiClient` verbs, `serverGet`, `publicGet` and
`publicGetNoStore` thread it through. Adding validation to a hook is one extra
argument, not a rewrite.

The cast did not disappear — it cannot, for a call with no contract — so it was
moved into a single named function instead of being spread through the file:

```ts
/**
 * The unchecked path. With no contract the body is *asserted* to be `T`, never
 * verified — the single cast in this module lives here, and it is the whole
 * reason a contract argument exists.
 */
function assertUnchecked<T>(payload: unknown): T { return payload as T; }
```

No `as any`, no `as unknown as T`, and the validated path is cast-free: `T` is
inferred from the contract.

**Failure mode: a typed error, not an exception and not a pass.** A violation
throws `ApiContractError extends ApiError` carrying `code:
"CONTRACT_VIOLATION"`, the `resource`, and up to 10 `{ path, message }` issues.
Because it is an `ApiError`, three things that already exist handle it with no
special case: `getErrorMessage` renders it as a sentence (never a Zod dump),
`readErrorReachesBoundary` sends it to the route `error.tsx` when the read
produced nothing and *keeps the working screen* when a background refresh
violates the contract, and a mutation's `onError` toasts it. A raw `ZodError`
never escapes. It is additionally `reportError`ed with the resource and issue
paths, so a drift that only ever hits an inline-error panel still surfaces.

**Not `.strict()`, deliberately.** Rule 9 of the brief is about *request*
bodies. For a response, strictness inverts the risk: an added backend field is a
backward-compatible deploy that would take every screen down, while a removed,
renamed or retyped field — the drift this exists for — is caught by a plain
object anyway. Documented at the top of each schema file.

**Schemas beside the feature, types from `z.infer`.** Nine new `*-schema.ts`
files; `types/access.ts`, `types/directory/people.ts` and `types/payroll/ess.ts`
now re-export the inferred types instead of holding parallel interfaces. Where
the type is genuinely owned elsewhere (`Permission` in the RBAC catalog,
`ModuleMyPermissions` in the module-access types, `MoneyDisplay` in the
formatter), the contract is *annotated* `ResponseContract<T>` rather than
re-declared, so the compiler enforces agreement without inverting the layering.

## Coverage — the honest number

**17 of 2490** seam call sites under `hooks/api/` carry a contract (15 of 1006
GETs), across **15 distinct routes**, plus the server seam in
`lib/rbac/get-server-access.ts`. The other ~2473 are still unchecked casts.

Prioritised by blast radius — permissions, tenancy, money, PII:

| Route | Why first |
|---|---|
| `/me/access` (client + server) | every `useCan` in the app |
| `/rbac/permissions`, `/rbac/discovery/{grantable,members}` | role editing |
| `/module-access/:key/{catalog,me/permissions}` | module owner/admin controls |
| `/billing/entitlements` | every paid boundary |
| `/billing/ai-credits{,/transactions,/usage}` | wallet, ledger, spend |
| `/directory/people`, `/directory/people/:id` | PII, universal surface |
| `/payroll/me/payslips`, `/payroll/me/bank` | pay and bank details |
| `/me/org-display` | the currency every money figure renders in |

This is per-route work rather than a codemod for one reason: a contract written
from the frontend's own type would encode the drift instead of catching it.
Every one of the 15 was checked against the backend controller, its service and
the Drizzle column types first — which is exactly how the four type lies above
turned up.

## Proof

- `lib/api-envelope-contract.test.ts` (new, 26) — a **malformed** response is
  rejected: renamed field, retyped field, removed nested field, `null` and an
  array where an object is contracted, a bare body that skipped the envelope, an
  empty 204, a bad element inside a list named by index (`1.balance`), and a
  permission scope outside its enum. It also asserts the same renamed body is
  accepted silently *without* a contract (`parsed.currency` is `undefined`) —
  the defect, pinned. Plus the failure-mode assertions: `instanceof ApiError`,
  `getErrorMessage` output, boundary behaviour with and without data,
  observability reporting, and the 10-issue cap.
- `hooks/api/response-contracts.test.ts` (new, 29) — the 15 shipped contracts
  against real backend payloads (accepts) and against their specific drift
  (rejects). The accepts half matters as much: a contract that rejects real
  traffic turns a working screen into an error page on deploy.
- `lib/api-contract-coverage.test.ts` (new, 7) — the visibility gate. Parses all
  2490 seam calls with the TS compiler API, fails if a listed critical route
  loses its contract or gains a second un-validated call site, and self-tests
  its own scanner. **Verified to bite:** removing the `/billing/entitlements`
  contract turned 2 of the 7 red.
- `hooks/api/read-state-contract.test.tsx` (new, 14) — box 1's data-layer half.

## Box 1 — data-layer half closed, page half named

All eight states are produced *and distinguishable* at the hook layer. The two
that collapse without help:

- **empty vs permission-denied.** A disabled v5 query reports `isPending: true,
  isFetching: false` — byte-identical to a finished empty read. Only
  `useGatedQuery`'s `access.denied` separates them, and the test asserts the
  query flags are equal while the gate differs.
- **denied vs not-yet-known.** `PermissionGate.pending` is not `!allowed`; a
  screen reading an unresolved gate as refusal tells a permitted user they lack
  access. The test asserts no request fires while pending and one fires the
  moment access resolves.

Offline is `fetchStatus === "paused"` and resumes on `onlineManager` reconnect;
revoked access stops the read and flips to `denied`; a failed background refresh
keeps the loaded rows; a contract violation reaches the boundary like any other
read that produced nothing.

**Left for ticket 30, precisely:** (1) **no surface anywhere reads
`fetchStatus === "paused"`**, so an offline read renders as an indefinite
skeleton on every screen — `useOnlineStatus` has only 3 consumers (shell banner,
notifications inbox, and a private duplicate at
`features/inventory/components/tools/barcode-client.tsx:26`); (2) which gated
reads render `NoPermissionState` rather than an empty state is an `app/**` count;
(3) filter-empty vs data-empty is a per-page distinction no hook can make.

## Cross-territory findings — verified, not fixed

1. **`/organization/members` is typed against pagination the server has never
   sent.** `hooks/api/organization.ts` declares
   `pagination: { page, limit, total, totalPages }`; the backend returns
   `buildCursorPage` → `{ limit, hasMore, nextCursor }`. `total` and
   `totalPages` are `undefined` at runtime, and
   `components/rbac/role-assignments-sheet.tsx:118` computes a page count from
   `pagination.totalPages`. `OrgMember.joinedAt` is typed `Date` but arrives as
   an ISO string. I wrote the corrected contract, and it failed typecheck at
   three call sites — `components/rbac/role-assignments-sheet.tsx:118,297` and
   `features/build/approvals/project-approvals-page.tsx:268` — so it was
   reverted. `features/**` is not mine. The exact contract is in this report's
   git history; re-landing it needs those three call sites moved to keyset
   pagination in the same change. Note the request also sends `page=`, which
   `listMembersSchema` silently strips (it is a plain `z.object`, so no 400).
2. **`features/inventory/components/tools/barcode-client.tsx:26` redefines
   `useOnlineStatus`**, duplicating `hooks/common/use-online-status.ts`.
3. **A contract violation is retried once for nothing.** `shouldRetryQuery` in
   `components/providers/query-provider.tsx` skips retries only for 4xx; a
   violation carries the real HTTP status (200), so it retries a deterministic
   failure. Faking a 4xx would corrupt `getErrorMessage` and
   `readErrorReachesBoundary`, so the fix belongs in `shouldRetryQuery`:
   `if (getApiErrorCode(error) === CONTRACT_VIOLATION_CODE) return false;`.
4. **`check:dead-code` has 2 unclassified exports that are not mine** —
   `features/build/analytics/project-charts.tsx:CHART_COLORS` and
   `app/api/media/image/media-image-schema.ts:MediaImageQuery`. Both need an
   `EXPORT_VERDICTS` entry in `scripts/check-dead-code.mjs`.
5. **Two tests in `hooks/api/read-error-reaches-boundary.test.tsx` fail and it is
   not this work.** Proved: restoring `lib/api-envelope.ts` and
   `hooks/api/access.ts` from HEAD leaves the same two red. They are the
   historical-narrative half (`clientWithoutPolicy` should render "0.0" / five
   zeroes) and an `ApiError` still reaches the boundary with `throwOnError`
   explicitly `false`. A third failure in that file *was* real and is fixed here:
   the harness lacked a `TooltipProvider`, which `PageWrapper` and `StatCard` now
   require.

## Gates run (all read, not assumed)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **exit 0, 0 errors** |
| `jest --maxWorkers=2` on `hooks/api|lib/{api,query,rbac,prefetch,home}` | 82 suites, **840 pass / 2 fail** — both the pre-existing failures in finding 5 |
| the four new suites (`--runInBand`) | **5 suites, 91 tests, all pass** |
| `check:query-scope` · `:self-test` | exit 0 · exit 0 |
| `check:query-signal` · `:self-test` | exit 0 (1053 queryFn blocks / 419 files) · exit 0 |
| `check:command-catalog` · `:self-test` | exit 0 (1504 mutations, 0 unclassified; 66/70 gated reads) · exit 0 |
| `check:over-300` · `:self-test` | exit 0 (519 of 5183, baseline 519) · exit 0 |
| `check:dead-code` · `:self-test` | exit 1 — 2 unclassified, **both outside this territory** (finding 4); 20 of the original 22 were mine and are resolved · exit 0 |
| `check:effect-fetches` | exit 0 |
| `check:cycles` (madge) | exit 0 — no circular dependency, 5180 files |
| `eslint` on all 29 changed files | **0 errors**, 3 pre-existing warnings |

`check:query-scope` was red last session only because of a stale
`.next-buildmart/`; that directory is gone and it is green.

## Files changed (session 2)

**Seam** — `frontend/lib/api-envelope.ts`, `frontend/lib/api-client.ts`,
`frontend/lib/server-fetch.ts`, `frontend/lib/public-fetch.ts`,
`frontend/lib/rbac/get-server-access.ts`

**New schemas** — `frontend/hooks/api/access-schema.ts`,
`entitlements-schema.ts`, `ai-credits-schema.ts`, `org-display-schema.ts`,
`directory/people-schema.ts`, `payroll/ess-schema.ts`,
`module-access/module-access-schema.ts`

**New tests** — `frontend/lib/api-envelope-contract.test.ts`,
`frontend/lib/api-contract-coverage.test.ts`,
`frontend/hooks/api/response-contracts.test.ts`,
`frontend/hooks/api/read-state-contract.test.tsx`,
`frontend/test-utils/response-contract-fixtures.ts`

**Hooks wired** — `frontend/hooks/api/access.ts`, `entitlements.ts`,
`ai-credits.ts`, `org-display.ts`, `directory/people.ts`,
`module-access/catalog.ts`, `payroll/ess.ts`

**Types de-duplicated** — `frontend/types/access.ts`,
`frontend/types/directory/people.ts`, `frontend/types/payroll/ess.ts`

**Test harnesses repaired** — `frontend/hooks/api/access/use-can.test.tsx`
(the contract argument), `frontend/hooks/api/read-error-reaches-boundary.test.tsx`
(missing `TooltipProvider`)

Nothing under `app/**` or `features/**` was touched.

---

# S8b · Four seam defects routed in mid-session

All four were "the seam quietly does something other than what the caller asked" —
the same class as a body that is cast rather than validated.

## 1 · Every cancel in the app was a no-op on an older browser (P1)

`makeRequestSignal` fell back to `return timeout;` when `AbortSignal.any` was
absent — **silently discarding the caller's signal**. `AbortSignal.any` is
Chrome 116 / Safari 17.4 / Firefox 124, so on anything older every Stop button
in the product did nothing: the request ran to completion, and on an AI surface
it kept spending credits. Nothing threw and nothing logged.

Second defect in the same call: `authedFetch` spread `init` and *then* wrote
`signal:`, so a caller passing `init.signal` had it overwritten. That is exactly
what made `useAskAI`'s `stop()` and unmount teardown no-ops.

Fixed by linking the signals by hand (`linkAbortSignals`, forwarding `reason` so
the `TimeoutError` branch still fires) and by destructuring `init.signal` out
rather than letting it be shadowed — `makeRequestSignal(signal ?? initSignal)`.

`lib/api-client-cancellation.test.ts` (new, 10 tests) mocks **`fetch` itself**,
not `authedFetch`, and hangs until the signal it was handed aborts. It asserts
the caller's abort surfaces as `ApiError { code: "ABORTED" }` for the signal
slot, the request config and `init`, with `AbortSignal.any` present and with it
deleted. **Verified to bite:** restoring both defects turns 3 of the 10 red, each
as a 5-second timeout — the request outliving Stop, exactly as reported.

## 2 · Mail send was idempotent on paper only (P1)

The `Idempotency-Key` was minted inside the transport, once per HTTP call. A key
that changes on retry is a request id. So compose's Retry after a timeout issued
a genuinely new send and the recipient got two real emails — the backend's
`@Idempotent` machinery was working, it was simply never handed the same key
twice.

The key now belongs to the operation. `lib/idempotency-key.ts` holds the
minting; `hooks/common/use-idempotent-operation.ts` keeps one key alive for as
long as the same input is being retried and releases it on `settle()`.
`useSendMail` and `useReplyMail` adopt it. The transport keeps minting a
last-resort key so an `@Idempotent` route never 400s on a missing header (that
error reads like a body validation failure).

`hooks/api/mail-send-idempotency.test.tsx` (new, 6 tests) proves both directions:
the same key across a timeout retry and across three consecutive failures, and a
**new** key once a send has completed or when the draft differs — so a second
genuine send is never silently replayed as the first one's result.

The call site in `features/mail/mail-compose-sheet.tsx` needs no change, which is
why the fix lives in the hook: `features/**` is not this session's territory.

## 3 · The unified inbox was not optimistic

`hooks/api/notifications-inbox.ts` patched only
`queryKeys.notifications.lists()`, so the identical archive click was optimistic
from `/notifications` and a wait-for-refetch from `/inbox`. Added
`snapshotAndPatchUnified` / `snapshotAndRemoveFromUnified` to
`notifications-inbox-cache.ts` (touching `kind: "notification"` items only — the
feed also carries mail, broadcasts and build approvals) and wired them into
mark-read, mark-all-read, archive, bulk-mark-read and bulk-archive. The
snapshots join the existing rollback context, so `onError` restores both caches.

## 4 · The unbounded channel drain, and a stale storage-URL spec

`drainChannelPages` was a `for(;;)` that followed the cursor to exhaustion, so
every mount paid for the tenant's entire channel set. It now stops at
`MAX_CHANNEL_PAGES` (20) and **reports hitting the ceiling** with the path and
row count — a cap nobody can see is the silent truncation the drain was written
to avoid. The cursor is still followed; it was not re-dropped.

**Not done, and it belongs to the chat owner:** the screen affordance ("showing
the first N — search for more") and the move to lazy fetching as the windowed
list scrolls. Returning a `{ channels, truncated }` shape breaks
`components/ui/chat-channel-combobox.tsx` and `features/chat/**`, which this
session does not own, so `data` stays the array those files already read.

`features/hr/expenses/components/receipt-manager.storage-key.test.tsx` was red
against `storageObjectUrl`. **The code was right and the spec was stale.**
`/api/media/image` is a real, deliberate route (`app/api/media/image/route.ts`):
a browser cannot put an `Authorization` header on an `<img src>`, so it attaches
the session's backend JWT server-side, re-checks authorization per request, and
downgrades anything that is not a known image type to an opaque download. The
spec expected the upstream `${API}/storage/image`, which would 401 from an image
tag. Spec updated to `MEDIA_IMAGE_ROUTE`; both its cases pass.

## Gates after these four

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0, 0 errors |
| `jest --maxWorkers=2` on `hooks/api|lib/{api,query,rbac,prefetch,home}|features/{chat,notifications,mail,hr/expenses}|components/layout` | 130 suites, **1158 pass / 2 fail** — the two pre-existing failures proved not mine |
| `check:query-scope` · `check:query-signal` · `check:command-catalog` · `check:effect-fetches` · `check:cycles` | all exit 0 |
| `check:over-300` | exit 1 at 520/519 — the single file over baseline is `app/(authenticated)/accounting/setup/page.tsx` (265 at HEAD), another session's uncommitted work; `hooks/api/mail.ts` was trimmed back under 300 |
| `check:dead-code` | exit 1 — 3 unclassified, all in `features/**` / `app/**` |
| `eslint` on all changed files | 0 errors, 2 pre-existing warnings |

## Files changed (S8b)

`frontend/lib/api-client.ts`, `frontend/lib/idempotency-key.ts` (new),
`frontend/lib/api-client-cancellation.test.ts` (new),
`frontend/hooks/common/use-idempotent-operation.ts` (new),
`frontend/hooks/api/mail.ts`,
`frontend/hooks/api/mail-send-idempotency.test.tsx` (new),
`frontend/hooks/api/notifications-inbox.ts`,
`frontend/hooks/api/notifications-inbox-cache.ts`,
`frontend/hooks/api/chat-core-read.ts`,
`frontend/features/hr/expenses/components/receipt-manager.storage-key.test.tsx`
(stale assertion only)
