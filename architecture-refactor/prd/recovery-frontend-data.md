# Shared reads, cache correctness, frontend cost and UI consistency

Required acceptance and independent implementation review: [full-stack completion contract](README.md#mandatory-full-stack-completion-contract).

Status: READY for measurement and bounded implementation, not a whole-app rewrite.
Source audit: 2026-09-12. Read root/frontend/backend `CLAUDE.md`,
`architecture-refactor/AGENTS.md` and this directory's index before starting.

Own query/provider/prefetch integration only when reserved by the coordinator.
Begin FD1 read-only immediately. Before shared-file implementation, the coordinator
records exclusive file ownership in the PRD index; this is coordination, not a new
request for user approval of already-authorized work.
Domain agents own their hooks and screens; send shared contract changes to them.
Identity owns backend-token caching and refresh semantics, access owns authority
versions, organization setup owns wizard state, communications own their streams.
Do not run concurrent builds or regenerate shared contracts while another lane edits.
FD4/FD5 measure and propose domain SQL/cache repairs; domain owners implement them.
Reserve shared server/cache edits separately; this is not a backend-wide lane.

## What already exists

`frontend/components/providers/query-provider.tsx` provides a QueryClient per
authenticated org/user scope, remounts on scope change, clears via the registered
cache clearer, and already has 2-minute default staleTime, bounded query retries,
no mutation retries and AI-wallet invalidation. `frontend/lib/query-scope.ts`
canonicalizes keys with the same hash used by
`frontend/lib/prefetch/server-query-client.ts`. Server auth is request-cached.
`frontend/hooks/api/chat-core-read.ts`, `calendar.ts`, `inbox.ts` and
`notifications-inbox.ts` already use query caching. Repeated use of one hook does
not itself prove repeated HTTP requests. Preserve these mechanisms.
QueryProvider also wires existing `build-cache-sync.ts` through mutation success
and subscription cleanup, including scoped BroadcastChannel/storage fallback.
Preserve it; other domains need writer verification, not a second whole-app bus.

Source-backed starting points:

- `frontend/next.config.ts` sets `typescript.ignoreBuildErrors: true`; an emitted
  build alone is not type-safety proof. A prior independent application typecheck
  passed, but frontend test files are excluded from that application check.
- Chat channel reads drain up to 20 pages per query even where a consumer only
  needs a small list. Chat lane owns the bounded paging repair; measure shell impact.
- Calendar member search omits `limit` from the key while varying request limit.
  Calendar lane owns key normalization. Existing org/user scope should not be removed.
- Identity lane found backend bearer-token cache missing session identity. That is
  a different cache from the correctly org/user-scoped React Query provider.

## Ownership model to implement only where evidence requires

```mermaid
flowchart TD
  S[Auth-scoped QueryClient / canonical keys] --> A[Shell: active org, effective access, lightweight badges]
  S --> B[Route: range/list/filter/pagination data]
  S --> C[Opened detail/dialog: entity and options]
  L[Local UI state] --> D[Drafts, selected row, focus and expansion]
  M[Successful domain mutation] --> I[Targeted list/detail/count/access invalidation]
  I --> S
```

| Data | Appropriate owner | Scope and freshness decision |
| --- | --- | --- |
| Session / active org / effective permissions | Existing auth/access seam; shell reads | User, org, membership/session as applicable, permission version; revocation authoritative |
| Unread badge | Shared scoped hook and stream owner | Recipient + org; realtime with bounded fallback; no full message-list prefetch |
| Filtered list/calendar range | Route hook, reusable through query cache | Canonical filters, sort, cursor, dates/timezone and projection; freshness from writers |
| Detail/editor options | Open detail or editor | Entity and dependent input; cancel on close/change where safe |
| Input draft / hover / modal | Local component or feature context | No server cache/global store for transient editing state |
| Shared immutable catalog | Catalog/query owner | Version and locale; isolate personalized prices/availability |

## Ordered checklist

- [x] **FD1 — Build a scoped request inventory.** For signup→setup→dashboard,
  invitations→employee admission, billing, inbox, calendar and chat, record each
  mounted consumer, canonical key, API route, trigger, cache policy and response
  size. Capture cold navigation, warm return, focus, reconnect, route change and
  mutation. Mark KEEP / REPAIR / CONSOLIDATE / REMOVE only with consumer evidence.
  Completion: duplicate HTTP, repeated SQL and duplicate React subscriptions are
  separately counted; no global prefetch just to reduce visible hook count.
- [x] **FD2 — Correct ownership and deduplication.** Reuse canonical hook/query
  options for identical reads; preserve AbortSignal forwarding and hydration hash.
  Normalize equivalent defaults/filters; include every response-shaping input.
  Gate unopened dialogs, inaccessible modules and off-screen expensive reads.
  Completion: simultaneous identical consumers coalesce, server hydration avoids
  duplicate initial reads, changed filter gets new data, and route-unrelated lists
  are absent from the initial shell waterfall.
- [x] **FD3 — Write the invalidation matrix before adding caching.** For every
  changed read list its writers, org/actor/record dimensions, version, TTL, expiry,
  invalidation timing, stale failure policy and cross-tab effect. Test logout,
  org A→B, same user/different session, grant revoke, employee removal, module
  disable and subscription change. Completion: never render prior-scope private
  rows; revoked access is denied by server even if the client cache is stale.
  Query scope follows the session; it does not itself fence in-flight switches or
  late session updates. Identity I6 owns that contract before switch safety can pass.
- [ ] **FD4 — Server cost.** Follow selected API through guard, tenant transaction,
  service, DB and external provider. Reuse AuthContext and ScopedRead rather than
  repeat authority reads per helper. Measure rows/queries, N+1, projections, query
  plans and connection/transaction time. Add indexes against measured predicates
  through journaled migration, not speculative indexes on every field. Completion:
  bounded query/page cost on agreed dataset and warm/cold evidence, not cache-hit
  claims inferred from a decorator.
- [ ] **FD5 — Cache failure and concurrency.** Verify TTL/cardinality bounds,
  stampede behavior where measured, stale key cleanup, Redis unavailable, racing
  writer/read, transaction rollback and post-commit invalidation. Separate harmless
  catalog fallback from authority/payment correctness. Never cache one-time proof,
  seat allocation or payment fulfillment as a substitute for an atomic transition.
  Completion: fault-injection checks cannot widen tenant/record access or replay money.
- [ ] **FD6 — Rendering/build budget.** Measure production clean and incremental
  build separately, route JS, server response, first usable UI and request waterfall.
  Inspect actual build cache configuration before changing it. Repair type errors
  then remove the ignoreBuildErrors bypass; coordinate one full build at integration.
  Keep existing lazy contracts and route-level code splitting. Completion: strict
  application typecheck, affected test typecheck where configured, focused tests and
  production build at one revision pair; report failures rather than relax checks.
- [ ] **FD7 — UI consistency in the selected flows.** Inventory existing typography,
  spacing, controls, loading/empty/denied/error states and mobile shell primitives.
  Use existing semantic tokens and PageWrapper/form patterns. Verify keyboard focus,
  validation association, pending actions, recovery, 360px viewport and 200% zoom.
  Completion: before/after screenshots of actual flows with readable content and
  no clipped actions; broader brand redesign and Build screen deletion remain deferred.
- [x] **FD8 — Dead code and folder seams.** Trace imports, dynamic routes, registry
  entries, jobs, tests, generated consumers and both repos before deleting a symbol.
  Merge duplicate type/function only when meanings and invariants match. Keep schema
  boundary validation even if TS shapes resemble each other. Prefer one tested deep
  module interface over wrappers that just pass arguments. Completion: list each
  removed file/symbol with replacement and reference/build proof; no mass rename or
  arbitrary file-size refactor.
- [ ] **FD9 — Maintenance handoff.** Existing architecture/production lanes own
  pooling limits, migration rollback, backup restore, readiness, worker heartbeat,
  dead-letter recovery, monitoring and alerts. Link exact evidence gaps there rather
  than create a second operations backlog. Prove one failed external provider does
  not keep unrelated transactions/connections open indefinitely.

## Outcome — 2026-09-12 (frontend `pnpm type-check` clean at start; see limits)

Evidence files: `evidence/frontend-data/fd1-onboarding-people.md`,
`fd1-billing-inbox.md`, `fd1-calendar-chat.md`, `fd4-fd5-server-cost-cache.md`,
`fd6-fd8-build-deadcode.md`, `fd7-ui-consistency.md`.

**Two brief premises were wrong and are corrected here.**

1. "Calendar member search omits `limit` from the key while varying request limit."
   `limit` did not appear anywhere in `hooks/api/calendar.ts`. Nothing varied it,
   so there was no key/param mismatch. The real defect was the inverse:
   `GET /org/members` accepts `limit` (`contracts/openapi.json`: integer 1..100)
   and the frontend never sent one, so the roster and every search keystroke were
   unbounded from the client. Repaired as an explicit bounded limit, keyed.
1b. **My own correction:** the calendar repair above was first described as fixing an
   *unbounded* read. It was not. `OrgMembersService.listMembers` does
   `Math.min(options.limit ?? MAX_MEMBER_RESULTS, MAX_MEMBER_RESULTS)` with
   `MAX_MEMBER_RESULTS = 100`, so the server always capped at 100 and sending no
   limit meant taking that 100. The repair's real value is narrower and still
   worth having: search now asks for 25 instead of inheriting 100 — 4× fewer rows
   per keystroke against a 5-way leading-wildcard ILIKE — and the key now carries
   the limit so a future consumer varying it cannot collide on one cache entry.
   It is not a fix for an unbounded read.
2. FD1's proposal to gate `useArchivedChannels` on `showArchived` is a
   **capability regression**, not a repair. `features/chat/channel-sidebar.tsx:354`
   uses the archived list to decide whether to show the archived entry point at
   all, and `:165` derives its unread badge from it. Gating on the view being open
   removes the user's only route to their archived chats. See FD2 below.

| Item | State | Evidence |
| --- | --- | --- |
| FD1 | DONE | 6 journeys inventoried. Duplicate HTTP **0** on every journey — repeated use of one hook coalesces and was counted separately, as required. Duplicate React subscriptions **0**: `useNotificationEvents` is a module-level ref-counted SSE singleton. Repeated SQL named per endpoint, deferred to FD4 |
| FD2 | **DONE** | All four criteria met with evidence (table below). Repaired: inbox key normalization; `useBillingPlans` session gate; onboarding bank-step gate; calendar bounded+keyed limit. Every chat read verified already confined or gated |
| FD3 | BLOCKED | Calendar writer invalidation added with `orgMembersAll`/`memberSearchAll` prefixes + test. Scope isolation 8/8 and the dehydrate→hydrate contract still pass. **Cannot close: this brief states query scope "does not itself fence in-flight switches or late session updates. Identity I6 owns that contract before switch safety can pass."** |
| FD4 | BLOCKED on DATASET, not environment | No unbounded server reads; all list endpoints cap server-side. 3 MEDIUM findings. `scratch_local` **was reached** and probed as the RLS-bound role — but the tenant holds **1 active member**, so a plan proves nothing |
| FD5 | DONE (measure/propose) | **No fail-open cache.** No cache authorizes money or widens access — `assertWithinLimit` reads the DB on miss. 2 MEDIUM post-commit/stampede findings |
| FD6 | PARTIAL | **`ignoreBuildErrors` REMOVED and the production build passes** (`BUILD_EXIT=0`). Test gate live and green at 0/338. Route JS measured: **6 real budget breaches on 3 routes**. Server response / first usable UI / request waterfall remain BLOCKED on the browser harness |
| FD7 | PARTIAL | Icon-label gate extended to any button size + 7 real fixes. Remaining findings listed in the evidence file. **No screenshots or browser interaction** — contract gate 8 is BLOCKED |
| FD8 | DONE (audit) | knip: 221 findings, **0 confirmed dead**; every one KEEP-BY-DESIGN or boundary-validation. Nothing deleted |
| FD9 | DONE | Pointers only; no second operations backlog created |

### FD6 — two gate mechanisms were reporting untrue results

- **`check:test-typecheck` was wired into CI as blocking and crashing.**
  `tsconfig.test.json` did not exist, so tsc exited TS5058 with no parseable
  diagnostics. The script's own crash-detection correctly refused to call that a
  pass, so the gate failed instead of lying — but **no test file had any type
  coverage**. Recreated the project (`extends` + the four test globs dropped from
  `exclude` + `files: ["jest.setup.js"]` for the jest-dom global augmentation).
  `--self-test` now proves all 5 bites. The run measured **0 errors over 338 files**
  at that revision, so `BASELINE` stays 0 as a hard gate.

  **It has since gone red on one tracked file that is not this lane's, and the
  baseline was deliberately NOT raised to absorb it:**
  `features/billing/billing-mutation-gates.test.tsx:202` — commit `cb55134fd`
  added a required `annualTotalPaise` to `PlanConfig` (`plan-card.tsx:11`) without
  updating this fixture. The correct value is a pricing-semantics call, and that
  same commit was fixing a 12× pricing bug, so guessing a multiplier here would be
  worse than leaving it red. **Billing lane owns it.**
  `hooks/api/calendar-external-contract.test.ts` also reports 3 errors but is
  **untracked** working-tree WIP from a concurrent session, so CI never sees it.

  Fixing the gate immediately paid for itself twice: it caught
  `lib/__tests__/auth-claims.test.ts` **actually failing** in HEAD (1 failed / 38
  passed — `resolveSessionClaims` defaults `isPlatformAdmin` to `false` and the
  fixture omitted it, so `toEqual` compared `false` against absent), and it caught
  a spec left behind asserting a `maxPages` argument from the reverted chat
  rewrite. Both repaired in `8db75c917`.
- **`pnpm type-check` false-passes from a stale incremental cache — measured.**
  `tsconfig.json` sets `incremental: true`. With the committed `tsconfig.tsbuildinfo`
  in place the app check reported **0 errors, exit 0**. With it deleted and
  `--incremental false`, the same tree reports **2 errors, exit 2**, and both are in
  files **unmodified vs HEAD** — so they were in HEAD all along and every recent
  "typecheck passed" claim over this tree was reading a cache:

  | Error | Reading |
  | --- | --- |
  | `features/billing/components/plan-tab.tsx:353` TS2367 `"failed"` vs `"loading"` have no overlap | Inside the `scriptState === "failed"` branch the Retry button sets `isPending={scriptState === "loading"}`, which is unreachable — the retry button can never show a pending state |
  | `hooks/api/users/invitations.ts:107` TS2345 contract not assignable | `invitationsResponseContract` infers `status: string` where `InvitationsResponse` expects a narrower type. The repo's most common contract defect: a `z.string()` standing over an enum |

  **These two are the only blockers to deleting `ignoreBuildErrors`.** They belong to
  the access/billing and people lanes respectively, and the second is a real
  contract-narrowing decision, not a mechanical fix — so neither was changed here.
  Nothing in this lane's changes adds a type error: the same two, and only those two,
  are present before and after.

  Verify with `rm tsconfig.tsbuildinfo && node --max-old-space-size=6144
  ./node_modules/typescript/bin/tsc --noEmit --incremental false`.
- **`ignoreBuildErrors` is now REMOVED** and the production build passes at
  `BUILD_EXIT=0`: `✓ Compiled successfully in 8.4min`, then
  `Finished TypeScript in 6.3min` clean against freshly generated `.next/types`.
  The two blockers above were repaired first (`plan-tab.tsx` dropped an
  unreachable `isPending`; `invitationsResponseContract` is now pinned
  `: ResponseContract<InvitationsResponse>`, which is where enum drift will now
  fail). Non-incremental app typecheck: **0 errors**. Note the build ran offline —
  `getaddrinfo ENOTFOUND fonts.googleapis.com`, retried and continued.
- **Clean vs incremental production build are the same thing here.** `config.cache`
  is `false` for non-dev, so there is no incremental production build to measure
  separately — every one is cold, ~15 min total on this machine.
- **`check:route-bundle-budget` could never have passed, and now it can.** The gate
  refuses a manifest whose `buildId` does not match `.next/BUILD_ID` and tells you
  to "re-run the bundle measurement, which stamps" it — but `measure-route-bundles
  --write` **never wrote a `buildId`**, so no number of re-runs could satisfy it.
  The writer now stamps `buildId` + `measuredAt` and refuses to record a
  measurement with no `.next/BUILD_ID` to attribute it to. Both self-tests still
  pass (5 measurement fixtures; provenance current/stale/absent/no-disk).
- **The "~50% of chunks not found on disk" warning was a false alarm**, and it
  mattered because it read as a systematic undercount. `entry.chunks` alternates
  webpack chunk ID and emitted path; the script added the IDs as paths, so half of
  every route's "chunks" resolved to nothing. An ID contributes 0 bytes, so the
  byte totals were always correct — proven by re-measuring after the fix and
  getting **byte-identical** totals (401773, 586706, …) with the counts halved.
- **Route JS, measured against build `YCNyHJhXqdWz3ZLAVi2r_` — 6 real breaches on 3
  routes.** No budget was raised to absorb them:

  | Route | First-load JS | Page chunk |
  | --- | --- | --- |
  | `/build/inbox` | 586,706 over 524,288 by **62,418** | 269,538 over 204,800 by **64,738** |
  | `/support/inbox` | 562,134 over 524,288 by **37,846** | 205,078 over 204,800 by 278 |
  | `/build/my-work` | 581,584 over 524,288 by **57,296** | 258,573 over 204,800 by **53,773** |

  All 13 measured routes are also far above their recorded values (+58KB to
  +304KB), so the recorded budgets were set against a much smaller build. The
  three breaching routes are the two heaviest Build surfaces and Support inbox;
  they own the repair.
- `verify:server-data-seam` passes but reads `.next/BUILD_ID`, so it certifies the
  last build, not current source.
- `next.config.ts:54` disables the webpack cache for non-dev builds. **Recommend
  KEEP** — it was set for memory management alongside `webpackBuildWorker`, and
  this machine OOM-killed a typecheck during this session.

### FD3 — writer matrix for the four reads this lane changed

Identity **I6 is REPAIRED** (`recovery-user-identity.md:137`), which was FD3's stated
blocker, and its contract is test-proven: `hooks/common/auth-hooks-switch-org.test.tsx`
**6/6**, including *"cancels in-flight tenant reads before the switch request leaves"* and
*"ignores a late A refresh completion when switch B has already started"* — the in-flight
and late-update fencing this brief said query scope does not provide by itself.

| Changed read | Key inputs | Writers → invalidation | TTL | Cross-tab |
| --- | --- | --- | --- | --- |
| `GET /me/inbox/unified` | limit (defaulted), kinds (sorted), unreadOnly (defaulted false), infinite | inbox read/snooze/delete mutations in `hooks/api/inbox*`; SSE stream pushes | 30s | ref-counted SSE singleton, one stream per org |
| `GET /org/members` roster | limit (100) | `hooks/api/users/cache.ts` via `calendar.orgMembersAll` prefix | 5min | `build-cache-sync` BroadcastChannel |
| `GET /org/members` search | search term, limit (25) | same, via `calendar.memberSearchAll` prefix | 30s, `keepPreviousData` | same |
| `GET /billing/plans` | none (catalogue) | plan/subscription mutations invalidate `billing.subscription/summary/entitlements/seats` (`subscription.ts:118-123`) | 60min | same |
| `GET /onboarding/bank-details` | none; gated on bank step reached | `useBankDetailsMutation` | 30s | same |

Every read is additionally scoped by `scopedQueryKeyHashFn(authenticated:orgId:userId)`, so
none of the above can be read under another org or person.

**The seven required scenarios, each with its actual evidence:**

| Scenario | Verdict | Evidence |
| --- | --- | --- |
| logout | PASS (test) | `auth-hooks-sign-out.test.tsx` **5/5** — *"clears the local query cache on every sign-out path"*; `lib/api-client.ts:220` also clears on the 401 path |
| org A→B | PASS (test) | `lib/query-scope-isolation.test.tsx` **8/8** with a bite proof that a plain `QueryClient` leaks; plus I6's 6/6 fencing |
| same user / different session | **BY DESIGN, not fenced** | Scope is `authenticated:org:user` — it does not distinguish sessions, and two sessions of one person in one org share authority. Per-session divergence is the backend's `backendJwt` cache, which the identity lane owns and already recorded |
| grant revoke | PASS (source) | No fail-open cache; authz keys match `AUTHZ_KEY_MARKERS` and bypass the outage memo (`cache-fill.ts:36`), so a stale client cache cannot grant access — the server re-reads |
| employee removal | PASS (source) | Same server path; client staleness cannot authorize |
| module disable | PASS (source) | `useModuleEnabled` gates the read client-side and `@RequireModule` denies server-side; a stale nav entry yields 403, not data |
| subscription change | PASS (source) | `subscription.ts:118-123` invalidates subscription/summary/entitlements/seats; the `MutationCache` in `query-provider.tsx:62-67` additionally invalidates the AI wallet off the `aiUsage` envelope |

Completion criteria: *"never render prior-scope private rows"* — test-proven above.
*"revoked access is denied by server even if the client cache is stale"* — source-proven, no
fail-open cache. The one honest gap is the same-user/different-session row, which is the
identity lane's cache and is recorded rather than claimed.

### FD4 — the environment exists; the DATASET is what blocks the plan

This lane first reported FD4/FD5 as blocked for want of a disposable environment.
**That was wrong** — the access/billing lane's `9f11e3ffc` records `scratch_local`
on `127.0.0.1:5432`, and it was reached from here and probed read-only:

| Probe | Result |
| --- | --- |
| connection | `current_user = streamline_app` (the RLS-bound role, **not** a superuser — a superuser plan would bypass RLS and mislead), PostgreSQL **18.6** |
| RLS on `organization_members` | **enabled**, policy `tenant_isolation`: `(org_id = app.current_org_id_or_null()) OR (user_id = app.current_user_id_or_null())` |
| RLS on `users` / `organizations` | **disabled** — `users` is not row-isolated (503 rows visible); membership is the tenant boundary, not the user row |
| tenant GUC | `app.organization_id`, set via `set_config(..., true)` inside the transaction |
| `organizations` | 2 rows, readable without the GUC |
| `organization_members` with GUC set | **1 ACTIVE member, 1 row total** |

The first count without the GUC returned **zero** and would have read as "the table
is empty". It is not: a tenant policy returns no rows when the GUC is unset, silently.
Any scan of this schema that reports nothing has probably just forgotten the GUC.

**So FD4 stays open for a precise reason: the fixture holds one member.** An
`EXPLAIN (ANALYZE, BUFFERS)` over one row shows a trivial plan whichever index
exists, so it cannot support a `bounded query/page cost on agreed dataset` claim,
and it cannot tell whether the 5-way leading-wildcard ILIKE on `users` needs the
proposed trigram index. `idx_org_members_org_status` on `(org_id, status)` exists
and drives the join; `users` carries no trigram index. What FD4 needs is a **seeded
tenant with realistic membership**, not an environment. Note also that a trigram
index may not help here anyway — RLS defeats GIN/trigram unless the predicate is
LEAKPROOF, which is the constraint recorded for this schema.

### Gate state at handoff — HEAD is not green, and it was not this lane

Measured with each gate's own exit code (**not** through a pipe — piping to `tail`
captures `tail`'s status and reports every gate as passing; that mistake was made and
corrected during this session, and it is the same trap as reading a shell exit code for
a tool's):

| Gate | Exit | Attribution |
| --- | --- | --- |
| `check:query-scope`, `check:query-signal`, `check:response-contracts`, `check:gated-reads`, `check:colors`, `check:empty-states`, `check:icon-labels` | 0 | — |
| `check:test-typecheck` | 0 | fixed this session (was a crash) |
| `check:request-params` | 1 | `hooks/api/org-hierarchy.ts:161` sends undeclared `mode` — **clean vs HEAD** |
| `check:named-handlers` | 1 | `features/billing/components/plan-card.tsx:87` — **clean vs HEAD** |
| `check:dead-code` | 1 | `features/calendar/event-recurrence-schema.ts:BYSETPOS_LABELS` unclassified — the symbol is **already in HEAD** |
| `check:file-sizes` | 1 | `app/(auth)/verify-email/page.tsx` 505 — clean vs HEAD; plus an untracked 508-line org-setup test from a concurrent session |
| `check:over-300` | 1 | inventory + `hooks/api/leads-schema.ts`, both clean vs HEAD |
| `check:route-bundle-budget` | 1 | manifest has no `buildId` |

Every failing file is **unmodified relative to HEAD**, so none of these is a regression
from this lane. They are pre-existing and belong to the lanes that own those files.
No baseline was raised to absorb any of them.

**A concurrent session is editing this same working tree** (`features/org-setup/**` changed
under measurement mid-session, and the file count moved 4016 → 4020). Re-measure before
attributing anything here.

### FD2 — closed. Every chat read is already confined or gated; the FD1 proposals were unreachable

`hooks/api/chat-core-read.ts:93` does cap `drainChannelPages` at `MAX_CHANNEL_PAGES = 20`
serial requests of 50 rows. That much is real. **Every proposed repair against it was
wrong on reachability** — checked one consumer at a time:

| Consumer | FD1 said | Actually |
| --- | --- | --- |
| `chat-ably-suite.tsx:21` `GlobalNotifications` | drains on every route | `ChatAblySuite` is a **`dynamic()` import mounted only at `features/chat/chat-home-page.tsx:219`**. Never in the shell. On the chat route the channel list is the route's own data |
| `components/ui/chat-channel-combobox.tsx:29` | "fires on Support/Build with no guard" | Mounted inside `{open && …}` in `features/support/inbox/ticket-external-links-section.tsx` **and** behind a `case "chat_channel"` switch. Nothing fetches until the person opens the section and picks that link type |
| same | needs a truncation affordance | It **already has one** — `MAX_CHANNEL_OPTIONS = 50` plus `ListTruncationNotice` (lines 7, 9) |
| `usePublicChannels` | drains on discovery mount | Only mounted by `features/chat/channels-discovery-page.tsx` — that is the discovery surface |
| `forward-message-dialog.tsx:39` | needs gating | Already `useChatChannels(open)` |
| `useArchivedChannels` | gate on `showArchived` | **Capability regression** — see the premise correction above |

So there is no safe frontend-only repair left, and none is needed for FD2. The one
irreducible cost is the drain on the chat route itself, which is that route's own data;
reducing it needs a server archived-count/unread endpoint and belongs to the chat lane.
Note for whoever does it: `drainChannelPages` and `MAX_CHANNEL_PAGES` are referenced by
`scripts/check-response-contracts.mjs` with config `drainChannelPages: 2` pinning the
contract argument's position, so **deleting them blinds that gate**. One agent did delete
them, updated no consumer, and was reverted. A 4th `maxPages` argument is gate-safe.

**FD2's four completion criteria, each with its evidence:**

| Criterion | Evidence |
| --- | --- |
| simultaneous identical consumers coalesce | Verified per journey; duplicate HTTP **0**. Multi-consumer of one key was counted separately from duplicate HTTP, as FD1 requires |
| server hydration avoids duplicate initial reads | `lib/prefetch/hydration-contract.test.ts` runs the **real** factories and hydrates into the app's own scoped client, with a bite proof that a plain `QueryClient` produces an unreachable entry |
| changed filter gets new data | **This was the actual break and is repaired.** `inbox.ts` keyed raw `params?.limit` while sending `?? 25`, and calendar member lookup sent no limit at all. Both keys now carry every response-shaping input; `kinds` order and `unreadOnly` undefined/false are normalized |
| route-unrelated lists absent from the initial shell waterfall | Verified: chat suite is dynamically imported on its own route; archived/public/combobox/forward-dialog all gated; `SeatsBlock` coalesces. The only shell reads are identity/access/badges plus `TrialBanner`, which is permission-gated (`billing:subscription:view`) at a 5-minute staleTime — a lightweight shell badge, which this brief's ownership table allows |

Not done, and not required by FD2: `SeatsBlock` taking `planName` as a prop (pure ownership
tidy — it coalesces today, zero extra HTTP) and folding `TrialBanner` into the entitlements
read (needs the entitlements contract; handed to the access/billing lane).

## Completion evidence

Discover current focused commands from each package's scripts; inspect whether a
test starts infrastructure before executing. Do not read/print `.env` secrets,
boot unknown configured services, mutate production or install dependencies as an
audit shortcut. Existing source comments with benchmark numbers are historical
evidence until the dataset/command/revision is checked.

Reuse `frontend/lib/query-scope-isolation.test.tsx` and
`frontend/scripts/check-query-scope.mjs` when touching provider/hash/prefetch scope;
add behavioral hydration and switch cases rather than replacing these checks.

Record before/after per journey: HTTP count, SQL count, response bytes, p50/p95,
cache hits/misses, render/bundle/build cost and environment. Agree a budget before
optimizing; do not invent a universal request-count target. Handoff includes changed
and removed paths, exact commands/exit codes, cache writer matrix and residual
runtime risk. Mock tests and this source audit do not certify deployed performance.
