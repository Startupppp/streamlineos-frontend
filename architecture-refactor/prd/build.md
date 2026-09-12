# Build and project management

## Later product/UX decision — after foundation recovery

The [recovery index](README.md) prioritizes identity, organization, people and billing
before Build redesign. This is deferred scoping, not permission to delete screens.
Inventory routes, users, API consumers and navigation; classify KEEP / REPAIR /
CONSOLIDATE / DEFER / REMOVE with evidence and compatibility. Review fonts/tokens,
list/board/detail actions, mobile states and request waterfalls with frontend-data.
A hypothesis for user review is My work → projects → list/board → ticket detail,
with necessary people/settings. Roadmap, portfolio, budgets, QA, incidents and
automation depend on the buyer's job and existing usage. Product and project remain
distinct. Completion: user-reviewed screen/action map and wireframes, API ownership/
cost matrix, retained requirements and explicit deletion decisions before implementation.

## Existing release evidence

Build cross-tab cache freshness is implemented. Browser acceptance and acceptance on
the performance-approved build remain pending.

Completed 2026-09-10: **BUILD-001 / PRD-C123**. The scoped
[cache subscription](../../frontend/lib/build-cache-sync.ts) propagates successful
authorized Build mutations using invalidation-only messages. Active peer-tab queries
refetch; inactive queries become stale. Session changes dispose the subscription.
Publication runs from the QueryClient's global mutation-success callback before
local callbacks, retaining the originating scope when a pending mutation finishes
after its provider unmounts or switches organization. Active sender channels are
reused to avoid self-invalidation; detached senders publish through a temporary channel.
[Two-QueryClient regression coverage](../../frontend/lib/build-cache-sync.test.tsx)
proves a peer refetch even without a corresponding sender cache entry, no echo,
tenant/user isolation, failure handling, cleanup, and storage fallback. Follow-up
regressions cover a local success callback throwing after the server commits,
sender unmount and scope switch during a pending mutation, and refused channel creation.
The final actual-hook regression exposed three locally defined query keys outside
the canonical Build prefix. Custom-field definitions, ticket custom-field values
and project automations now use the central key factory. The regression first
failed with three reads instead of six after a peer mutation, then passed with all
three active peer hooks refetching. The final cache/factory/mutation run passed
three suites / 27 tests, including all ten cross-tab cases.

Verification: `pnpm -C frontend exec jest --runInBand --runTestsByPath lib/build-cache-sync.test.tsx hooks/api/build/mutation-invalidation.test.ts lib/query-keys/key-factory-contract.test.ts lib/query-scope-isolation.test.tsx`
initially passed **4 suites / 30 tests**. After the timing fixes,
`pnpm -C frontend exec jest --runInBand --runTestsByPath lib/build-cache-sync.test.tsx`
passed **1 suite / 9 tests**, adding four cases to the original five in that suite.
`pnpm -C frontend check:query-scope` and
`pnpm -C backend check:cache-invalidation` exited 0. These results describe the
2026-09-10 working tree; final revision/build reconciliation belongs to the coordinator.

## BUILD-002 — Complete browser acceptance matrix
Status: READY
Maps to: PRD-C123, PRD-C149
Parallel group: 1
Depends on: none
Owner: build acceptance agent

Current state: browser evidence now exists; 3 of 5 states are not yet closed.

Scope: Verify loading, empty, error, retry, cross-tab freshness, keyboard/accessibility behavior, and responsive layouts at 375, 768, and 1280 pixels.

Completion: Current-head screenshots/recordings and an acceptance table cover every state and viewport. Blocking defects are fixed and rechecked; nonblocking residual issues need explicit coordinator acceptance and remain linked, not silently counted as passing.

Current evidence, 2026-09-10: ticket-key resolution and ticket-detail request failures
now render a retryable error instead of a false not-found result; genuine 404s retain
not-found behavior. Empty risk cells have contextual accessible names and selected
state. Saved-view controls and the reaction picker stay visible on touch devices;
reaction buttons expose pressed state; the parent-ticket search has an accessible name.
[Ticket failure/retry tests](../../frontend/features/build/ticket-details/ticket-detail-errors.test.tsx)
and [risk keyboard tests](../../frontend/features/build/governance/risk-matrix.test.tsx),
with the existing ticket-cache regression suite, passed **3 suites / 13 tests** using
`pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/ticket-details/ticket-detail-errors.test.tsx features/build/governance/risk-matrix.test.tsx hooks/api/build/ticket-cache-regression.test.ts`.

### The blocker was false — 2026-09-12

`No browser available` was not an environment limit. Chrome is installed at
`C:\Program Files\Google\Chrome\Application\chrome.exe`; `browser-journeys.mjs`
listed only macOS and Linux paths in `BROWSER_CANDIDATES`, so `findBrowser`
returned null on Windows. `measure-web-vitals.mjs` already had Windows paths, so
the two disagreed. All three drivers now share
[`scripts/lib/chrome-launcher.mjs`](../../frontend/scripts/lib/chrome-launcher.mjs).
Real headless Chrome launches, evaluates and screenshots at 375 px.

ARCH-002 carries the same false blocker and is unblocked by the same commit.

### Capture environment (disposable, rebuilt 2026-09-12)

`D:\localstack` had been deleted and `backend/.env` now points at **Aurora
production**, which is not a capture target. Rebuilt: PostgreSQL 18.6 +
pgvector 0.8.6 from `D:\pgtools`, schema restored from `D:\pgtools\neon-schema.sql`
with **0 errors** — 1040 tables / 1004 policies / 4930 indexes, matching production
exactly — plus Redis 6379 and the Upstash REST shim on 8079. Overrides live in
`backend/.env.localstack{,.cache}`; `backend/.env` was not edited.

Four ordering traps cost real time and will recur on any rebuild:

1. **Seed after the backend has booted once.** `modules_catalog` is populated by
   `PermissionCatalogSyncService` at boot, and the seed's `enableAllModules`
   selects *from* it. Seeding first enables **zero** modules and fails `roles`
   on `fk_roles_module`, so every Build page renders the module-denied state.
2. **A minted cookie needs a `user_sessions` row.** `session-exchange` falls back
   to a database revocation check whenever Redis is unavailable, and a random
   `sessionId` reads as `missing` → 401 → no `backendJwt` → the client signs
   itself out. The symptom is a `/signin` bounce that `curl` cannot reproduce.
3. **The harness origin must be in `CORS_ORIGINS`.** Serving on `127.0.0.1:1000`
   when the allowlist names `localhost:1000` 404s the preflight and every
   authenticated page renders "Something went wrong". Use `localhost:1000`;
   `--allow-cross-origin-api` would hide it rather than prove CORS.
4. **Members need `organization_members.onboarding_completed_at`.** The wizard
   gate reads the membership column, not `users`; the seed stamps only `users`
   and `organizations`, so a non-owner bounces to `/employee-onboarding`.

### Matrix — full coverage, current head

Owner session, production build (`BUILD_ID j09vTP3gcAq2O94XHqA60`, API URL verified
local: 0 chunks contain `api.streamlineos.in`, 100 contain `127.0.0.1:1500`),
`--base-url=http://localhost:1000`, 27 screenshots under
`D:\localstack\build-acceptance-final\`. **PASS 10 · FAIL 5 · NOT-RUN 0 of 15** —
every state is measured at every viewport.

| Acceptance state | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| Loading and empty | PASS | FAIL | FAIL |
| Error and retry | PASS | PASS | PASS |
| Cross-tab freshness | PASS | PASS | PASS |
| Keyboard and accessibility | FAIL | FAIL | FAIL |
| Responsive layout | PASS | PASS | PASS |

Error and retry now passes at every width: a CDP-injected 500 on the ticket read
renders `role="alert"` with a retry control that genuinely re-issues the request,
and `INVALID-99999` renders not-found with **no** retry — the 500-vs-404 split
the ticket-detail suite asserts, now proved in a browser.

**Two harness defects produced the earlier NOT-RUN cells**, not the product:
`peer.close()` closed the WebSocket but not the browser tab, so each width left an
orphaned page polling in the background and later states degraded progressively;
and axe was attributing the third-party Feedbucket widget
(`#feedbucket-root .launcher-logo`) to the Build surface. Both fixed.

**Cross-tab freshness is now browser-proved**, not merely jsdom-proved: two CDP
targets, a real UI mutation in tab 1, peer refetch in tab 2 without a reload.
That closes the one BUILD-001 claim component tests structurally could not make.

**Responsive layout passes at all three widths** — no horizontal overflow on
`/build/all`, the board, or backlog.

### Genuine accessibility defects (axe, product markup)

| Rule | Impact | Nodes | Example |
| --- | --- | --- | --- |
| `color-contrast` | serious | 92 | `text-muted-foreground/80` on the ticket key, `text-muted-foreground/50` on `pts` |
| `aria-required-children` | critical | 15 | `<div class="space-y-0.5" role="list">` whose children are not `listitem` |
| `scrollable-region-focusable` | serious | 7 | `overflow-y-auto` panes and `data-slot="table-container"` with no keyboard focus |
| `button-name` | critical | 3 | `<button role="combobox">` with no accessible name |

**Two earlier findings were withdrawn after verification.** `aria-prohibited-attr`
is the third-party Feedbucket widget, not product code — `axe.mjs` warns about
exactly this misattribution. `document-title` / `html-has-lang` on error-and-retry
were a harness artifact: the 500 interceptor matched `urlPattern: "*"` and the
ticket page URL contains "ticket", so it replaced the top-level **document** with
its JSON body and the product never rendered. Both are fixed; the three
error-and-retry FAILs are therefore **not yet real** and must be re-run.

### The four defect classes are REPAIRED — 2026-09-12. The matrix is not yet re-run.

All four are fixed at the shared owner rather than patched per screen, so they close
everywhere and not only on Build. The lane no longer needs an owner for them.

**One premise in the section above was wrong, and it matters.** The base
`--muted-foreground` token **passes AA** — 4.55:1 in light, 7.73:1 in dark. Only the
opacity modifiers failed: `/70` at 2.66:1, `/50` at 1.93:1, `/30` at 1.46:1. So this was
never a design-token defect and the token is untouched; the call sites lost their
modifier instead. Anyone re-reading the original finding should not go changing
`--muted-foreground`.

| Rule | Real cause | Repair |
| --- | --- | --- |
| `color-contrast` | opacity modifiers on an otherwise-compliant token | modifier dropped at the text call sites; token unchanged |
| `aria-required-children` | `cmdk` renders an empty `role="listbox"` | the empty state is now a live status region **outside** the listbox |
| `scrollable-region-focusable` | `cmdk` hard-codes `tabIndex={-1}` after the prop spread, so the prop could not win | the scroll container is now a focusable wrapper with an accessible name |
| `button-name` | three combobox triggers, which cannot take a name from their content | explicit accessible names |

A regression gate was added so `color-contrast` cannot come back: an opacity modifier on
a foreground text utility now fails `check-no-arbitrary-colors`, with a self-test proving
it bites. 25 colour self-tests, 23 icon-label self-tests, and new a11y suites for list
semantics, focusable scroll regions and combobox naming all pass.

**Also fixed, and it unblocks the route-model note below:** project rows carried
`tabindex` and a click handler but **no `href`**, so they were unreachable by keyboard
*and* invisible to the journey script's anchor scan. That was one defect presenting as
two problems.

**BUILD-002 still is not closed**, for one reason only: the acceptance matrix has not
been re-run against the repaired markup. The five FAIL cells stand as the last measured
result and must not be reported as passing until a capture says so. That re-run needs a
production build with the API forced local, which is queued behind the `.next` build
lock — see [BUILD-003](#build-003--re-run-build-acceptance-after-performance-closure).

### Route model — correction worth keeping

Both project route families work; `/build/<id>` 302s to
`/build/workspaces/<pmWorkspaceId>/<id>`. But **sub-routes exist only on the flat
family**: `/build/35/backlog` and `/build/35/risks` render, while
`/build/workspaces/<ws>/35/backlog` and `.../risks` are Page Not Found.

Project rows are `<tr tabindex="0">` with a click handler and **no `href`**, so
the `build` journey in
[`browser-journeys.mjs`](../../frontend/scripts/browser-journeys.mjs) — which
discovers by scanning `a[href^="/build/"]` for `/build/<digits>` — has never
reached a board; it records the two templated steps as not-reached. That gate is
committed and passing its 66 self-tests, so it was left unchanged here rather
than edited in passing. **Owner needed.**

## BUILD-003 — Re-run Build acceptance after performance closure
Status: FINAL-INTEGRATION
Maps to: PRD-C149, PRD-C190
Parallel group: 4
Depends on: BUILD-002, ARCH-002
Owner: release coordinator

Scope: Re-run the Build user journey on the accepted Web Vitals build.

Completion: Browser acceptance and performance evidence name the same frontend revision.

Still blocked, but the reason has changed. The browser half is no longer missing
— BUILD-002 now produces real captures. What is missing is the performance half.

`measure:web-vitals` was run against the local production build and **refused its
own capture**: 20 of 20 samples measured `/signin` rather than the requested route.
That refusal is correct — mid-run, a concurrent session **purged the seeded tenant
from `scratch_local`** (organization row deleted, `org_modules` emptied,
`user_sessions` cleared), and a re-seed then failed with 246 errors because that
session had also applied migrations dropping
`organization_members.onboarding_completed_at`. The capture cannot be trusted
until the scratch database has a single owner for the duration of a run.

Server-side TTFB was recorded before the refusal (p75 ≈ 46–51 ms local), but no
LCP/INP/CLS figure from this run is admissible, and none is claimed.

Before trusting any prior mobile-INP number, note the standing 728 ms / 1152 ms
readings were taken against a build that may have inlined
`https://api.streamlineos.in`; a capture pointed at the local API can differ
substantially. Rebuild with the API URL forced local, confirm
`grep -rl api.streamlineos.in .next/static` is empty, then capture alone on a
quiet host **with no other session writing to `scratch_local` or to `.next`**.

### Why the production API gets baked in, and how to stop it — 2026-09-12

`frontend/.env.production.local` sets `NEXT_PUBLIC_API_URL=https://api.streamlineos.in`,
and **both `next build` and `next start` load it automatically**. Nothing warns. That is
the mechanism behind the paragraph above: a local production build points the browser at
production unless something overrides it, which is why the standing INP readings cannot
be trusted and why `.env` alone does not save you — `.env.production.local` wins over it.

Do **not** move or edit that file; it is the real production configuration and two
sessions share this checkout. Override in the process environment instead, which Next
honours over any `.env` file because it never overwrites a variable already present:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:1500 NEXTAUTH_URL=http://localhost:1000 npx next build
```

Measured 2026-09-12 on a build made this way: `grep -rl "api.streamlineos.in" .next/static`
returned **0** files and `grep -rl "127.0.0.1:1500"` returned **6**. Use `127.0.0.1` rather
than `localhost` for the API — loopback over IPv6 stalls here — but serve the app on
`localhost:1000`, because that is the origin `CORS_ORIGINS` names.

**One session owns `.next` at a time.** A `next build` while another session's `next start`
is serving deletes `BUILD_ID` under it and throws
`InvariantError: The client reference manifest for route "..." does not exist`. That is a
lock to claim explicitly, not a race to win.

### Blocking defect found while unblocking this lane — owner: billing

`GET /billing` is called by the authenticated shell for anyone holding
`billing:subscription:view`, which includes every org owner. The backend response
schema declared `isConfigured` but **no `platformCheckout`**, while the frontend
`subscriptionResponseContract` requires both — so the response failed contract
validation and **every authenticated page rendered "Something went wrong"** for
owners. `plan-tab.tsx` reads `platformCheckout.unavailableReason` to decide
whether checkout is offered, so the same gap sits on the "owner cannot pay" path.

Fixed additively in `subscriptionResponseSchema` (the service and
`PlatformMerchantReadiness` already produced all six fields); `/billing` now
returns `isConfigured: true` and a complete `platformCheckout`. Note
`check:contract-drift` did **not** catch this — that gate covers Timesheets only,
so it passed vacuously.
