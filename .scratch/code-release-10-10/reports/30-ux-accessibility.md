# Ticket 30 — UX, accessibility and state coverage across authenticated surfaces

Session S8. Supersedes the S7 report; the S7 findings that still hold are restated rather than
repeated. Every number below came out of a command whose output I read. FE =
`streamlineos-frontend/frontend`.

**Two things changed the shape of this ticket since S7:** the state gaps S7 measured have largely
been closed by other tickets, so the ratchet it installed had drifted into permitting 68 error-state
regressions; and this session got a **real browser onto the authenticated product**, which is what
boxes 4 and 5 have been blocked on for two sessions.

---

## 1. The `check:empty-states` failure was a checker bug, and the exception list was hiding it

`pnpm check:empty-states` exited 1 on `features/workflows/builder/workflow-builder-canvas.tsx:118`.
Ticket 13 was right that the file is untouched. The cause:

```
EMPTY_INDICATOR = /… |nothing\s+(here|yet)|empty|no-data/i
```

`empty` matched as a **substring**, and the string it matched at line 118 was **`Empty`** — from the
`<EmptyState>` on line 127, the canonical component the gate exists to promote. Line 118 is a
centring wrapper around `<ErrorState>`; **using the correct primitive created the violation.**

Fixed by tightening that one alternative to `\bempty\b`, which cannot match inside `EmptyState`,
`EmptyChatState` or `EmptyUploadIllustration`, and still matches the copy a real hand-rolled state
carries ("This list is empty."). Two self-tests were added and both bite:

- a centred wrapper around `ErrorState` with `<EmptyState>` spelled nearby is **not** a finding
- a centred block whose copy says the list is empty **is** still a finding

**Then the exception list collapsed from 9 entries to 2.** Seven of the nine existed only because of
this substring bug — including one whose own reason said so ("detected because
`EmptyUploadIllustration` contains the word 'empty'"). Each was re-evaluated under the tightened
pattern and produces no finding without its exception, so removing them **restores gate coverage on
seven files that were permanently unscanned**: `ask-os-chat-utils.tsx`, `ai-chat-panel.tsx`,
`kb-chat-parts.tsx`, `empty-chat-state.tsx`, `work-log-state-cards.tsx`, `sla-compliance-chart.tsx`,
`import-expense-sheet.tsx`. The two that still genuinely match are kept.

`pnpm -s check:empty-states` → **exit 0**, 3804 files. `check:empty-states:self-test` → exit 0,
**8 passed** (was 6).

## 2. The state ratchet had gone slack — 78 → 5, 56 → 10, 101 → 56

S7's baselines were measured against a tree that has since been repaired by other tickets. Measured
again at head with the same analyzer:

| Signal | S7 baseline | Measured now | New baseline |
|---|---|---|---|
| no loading state | 2 | **0** | 0 |
| no empty state | 56 | **10** | 10 |
| no read-error branch | 78 | **5** | 5 |
| no permission gate | 1 | **0** | 0 |
| filter-empty conflated with data-empty | 101 | **56** | 56 |

Left where it was, the ratchet would have accepted 73 error-state and 46 empty-state regressions in
silence. It is now pinned to the measured numbers, and **loading and permission gates are at zero**,
so any surface that loses either fails immediately rather than after a 73-surface slide.

Of the 15 surfaces still missing something, **five are in other agents' territory** and five are
documented below as correct.

### Surfaces fixed this session (unowned territory)

Read-error branch added: `/accounting/setup`, `/inventory/operations`, `/inventory/quality`,
`/surveys/live/[sessionId]/host`, `/surveys/new`.
Empty state added: `/accounting/opening-balances`, `/inventory/purchase-orders/[poId]`,
`/inventory/purchase-orders/new`, `/inventory/sales-orders/[soId]`, `/inventory/sales-orders/new`,
`/support/portal/[portalTicketId]`, `/support/reports/csat`, `/workflows/analytics`, plus the survey
live result bars. Loading state added: `/accounting/setup`.

### Surfaces where the missing state is CORRECT, not a gap

Adding an `EmptyState` to these would be gaming the metric, so they were left alone and are recorded
instead. All five remain in the count.

| Route | Why no data-empty state applies |
|---|---|
| `/inventory/operations` | Hub links plus six counters; a count of 0 is real data, and no collection can come back with zero rows |
| `/inventory/products/new` | Only collections are two picker option lists, which already render "No categories yet" inside the dropdown |
| `/crm/import` | Upload workflow; its one server collection already renders an explicit zero-rows alert inline |
| `/settings/organization/structure` | Navigation hub over a hardcoded six-row list; an EmptyState would hide the links needed to fix the empty state |
| `/surveys/new` | The custom-template list is optional garnish beside four always-present "start from scratch" cards |

### Still open, in other agents' territory

`/ai/executive-brief` (no error, no empty) · `/build/[projectId]/analytics` and `/timeline` (no
error) · `/hr/performance/analytics` and `/hr/recruitment/candidates/import` (no error) ·
`/chat`, `/hr/recruitment/jobs/[jobId]/edit`, `/hr/recruitment/sla`, `/notifications/policy` (no
empty).

## 3. The offline half of box 1 — a paused read was an eternal skeleton

Ticket 28 handed up that **no surface anywhere reads `fetchStatus === "paused"`**. TanStack pauses a
query when the browser goes offline: it neither resolves nor rejects, so every screen in the
application renders its skeleton forever. The shell's offline banner says the browser is offline; the
surface still claims to be loading.

Fixed once, in the shared primitive, so no call site changes: `components/shared/loading-state.tsx`
now reads `useOnlineStatus()` and, when offline, drops `aria-busy` to `false`, renames the region
from "Loading..." to **"Paused — waiting for a connection"**, and prints "You are offline. This will
load as soon as the connection returns." above the skeleton. Four tests, one of them a bite proof
that the online skeleton must not carry the offline copy.

**Not covered, and it is the bigger half:** `components/ui/data-table.tsx` renders its own loading
branch and is the loading state for most list pages. It is being edited by another agent right now —
its working tree has uncommitted changes and a new `data-table-header.tsx` — so touching it would
have swept their work into my commit. The same three-line treatment applied to `DataTable`'s loading
branch would close the rest of this. **Handoff, not done.**

## 4. The other three findings ticket 28 handed up

**`role-assignments-sheet.tsx` rendered a pager that could never appear.** `MembersResponse` declares
offset pagination (`page`, `total`, `totalPages`); `/organization/members` is built by
`buildCursorPage` in `src/common/pagination/cursor.ts` and returns `{ limit, hasMore, nextCursor }`.
`totalPages` was therefore always `undefined`, `?? 1` made it 1, and `orgMembersTotalPages > 1` was
never true — **the "add user" picker could only ever see the first 20 org members, with no pager and
nothing saying so.** 34 lines of dead pager, the dead `userPage` state and both dead handlers are
gone, replaced by a truthful notice when the page comes back full. The client type itself is in
`hooks/api/`, another agent's territory — and while I was working they began exactly that fix
(`hooks/api/organization-schema.ts` is new in the tree).

**`shouldRetryQuery` retried a contract violation.** `ApiContractError extends ApiError` and carries
the response's own status, so a well-formed 200 with a malformed body fell through to `return true`
and was retried once. The same endpoint returns the same malformed body; the retry only doubles the
latency before the error state appears. One line: `if (isContractViolation(error)) return false;`,
with three tests pinning it against a still-retried 500 and a still-refused 403.

**`chat-channel-combobox.tsx` truncated at 50 with no affordance.** Both this and the members picker
are the same defect — a capped list that lies about completeness — so they share one new primitive,
`components/ui/list-truncation-notice.tsx`, and `Combobox` gained a `footer` slot to host it.

## 5. Two shared screens had no `main` landmark — found in the browser, not in jsdom

The browser run (§6) reported `no-main-landmark` on **all 57 steps**, which turned out to be two
distinct screens, both of which replace the shell rather than render inside it:

- **`app/access-denied/page.tsx`** — the full-page permission denial. It has a good `h1` and sits
  outside the `(authenticated)` group, so it never inherits the shell's `<main>`.
- **`RouteErrorBoundary` with `layout="fullscreen"`**, which is what `app/error.tsx` renders. When a
  read in the authenticated *layout* fails (`/me/access`, say), the error propagates past the
  segment boundary and this replaces the entire shell — leaving a page with **no `main` landmark, no
  `h1`, and a dead skip-link target**, at precisely the moment the user most needs to navigate.

Both now render `<main aria-labelledby=…>`, and the fullscreen boundary promotes its heading from
`h2` to `h1` because in that layout it *is* the page. The inline and centred layouts are unchanged —
they sit inside the shell's `main` and must not claim a second one, which a bite proof asserts.
After the fix the same run reports **`mainName` set on 57 of 57 steps and exactly one `h1` on 57 of
57**.

This is the class of defect the ticket's box 2 is about and **jsdom could not have found it** — it
needs the real routing layer to decide which boundary catches the throw.

## 6. Box 5 — there is now a browser harness, and it has run

`frontend/scripts/browser-journeys.mjs` (new, `pnpm browser:journeys`, `pnpm
browser:journeys:self-test`). It launches a real headless Chrome over CDP — no Playwright or Cypress
dependency added, the same approach `scripts/measure-web-vitals.mjs` already uses here — sets a
minted NextAuth session cookie, and walks **eight journeys covering every product area** (home, crm,
inventory, hr, build, accounting, workspace, settings; 19 steps) at **375 / 768 / 1280**. Every step
is a read-only route; a self-test asserts no journey step is a write route.

Per step it measures, in a real layout engine:

- did it reach the authenticated shell or bounce to sign-in
- did it settle into a terminal state — content, empty, error or denied — or sit on a skeleton
- exactly one `h1`, and a `main` landmark with an accessible name
- `documentElement.scrollWidth <= innerWidth`, naming the widest offending element when not
- WCAG AA against the colour **actually painted behind** each text node, walking ancestors for the
  first opaque background, with the large-text threshold applied by computed font size and weight

**20 self-tests, exit 0.** Four of them are bite proofs: two pixels wider than the viewport is
overflow, and a still-busy page is never reported as content.

**The environment that had to be built to run it at all** (recorded because it is most of the cost of
repeating this):

1. A second backend on **:1501** against the local **`scratch_perf_seed`** database, and a `next dev`
   frontend on **:3000** — the only two origins in the backend's `CORS_ORIGINS` allowlist are
   `:1000` and `:3000`, and `:1000` was already taken by another session's server.
2. **`/auth/session-exchange` 503s without `NEXTAUTH_SECRET` and `AUTH_SIGNING_KEYS`**, and *neither
   is present in the backend `.env` on this machine*. The frontend renders this as a permanent
   "Syncing organization…" — no error, no timeout. Generating an Ed25519 pair for the local run was
   the only way past it.
3. Every seeded org had **no row in `organization_placement`**, so `withTenant` refused every read
   with "has no region. It must be placed before its data can be reached."
4. Every seeded org had **no rows in `org_modules`**, so every module route rendered the full-page
   access-denied screen. That is what surfaced §5's first landmark defect.

**Results — the authoritative run.** 57 steps at three widths, authenticated throughout (0
`unauthenticated` findings), against a scratch database re-bootstrapped to head
(`RESULT: REACHED_HEAD 658/658`) with every module enabled for the seeded org. **46 of 57 steps
reached a terminal product state** — 19 empty, 17 content, 3 permission-denied — so the run is
admitted rather than refused.

| Measure | Result |
|---|---|
| **horizontal overflow at 375 / 768 / 1280** | **0** — `scrollWidth - innerWidth` was **0 on every one of the 57 steps**, and on all four runs this session |
| `main` landmark with an accessible name | **57 of 57** (0 of 57 before §5) |
| exactly one `h1` | 46 of 57 — the 11 misses are the four routes below that threw to their error boundary |
| painted-text contrast | **4251 text nodes sampled · 17 unresolved and excluded · 90 genuine AA failures** |
| never settled (stuck skeleton) | 7 steps, at a 5 s settle window on a heavily loaded machine |
| still erroring | `/crm/leads`, `/build`, `/build/all`, `/calendar` — the four routes below |

**The 90 contrast failures are three token pairs, and they are exactly the pairs the jsdom token
test predicted.** This is the independent in-situ confirmation the box asked for:

| Painted pair | Ratio | Needs | Count | Token |
|---|---|---|---|---|
| `#cb7006` on `#f8fafc` | **3.43** | 4.5 | 18 | `--status-warning-ink` on `--status-neutral-surface` |
| `#cb7006` on `#ffffff` | **3.58** | 4.5 | 6 | `--status-warning-ink` on `--card` |
| `#64748b` on `#f1f5f9` | **4.34** | 4.5 | 9 | `--muted-foreground` on `--muted` |

Seen on `/dashboard`, `/inbox`, `/hr/attendance` and `/accounting/coa` — four unrelated modules, so
this is the shared token layer, not four page bugs.

**One probe defect found and fixed rather than reported.** An earlier run reported **17 failures of
`#ffffff` on `#ffffff`, ratio 1.0**. No shipped page renders invisible text: `getComputedStyle`
cannot see a background painted by a pseudo-element or an overlapping sibling, and the probe does not
parse `color(srgb …)` values, which is what the sidebar's own ink turned out to be. The driver now
classifies a sample whose ink equals its ground as **unresolved** and excludes it, with a bite proof
that a genuinely low-contrast pair is still counted. **17 fabricated WCAG failures became 17 honest
"could not measure".**

**What is still not proven, and why the box stays open.** Eleven of 57 steps rendered the segment
error boundary rather than the page: `/crm/leads` fails on a `PostgresError` inside
`select … "business_parties"."lifecycle_stage" … from "lead_party_map"` even at journal head, and
`/build`, `/build/all` and `/calendar` fail alongside it. Those four are also the entire `h1` miss
list — **when a page's read throws to the boundary, the page loses its `h1` altogether**, because the
boundary replaces `PageWrapper`. That is the same defect the state ratchet measures from the other
side: a surface with a read-error branch renders `ErrorState` *inside* `PageWrapper` and keeps its
heading; a surface without one throws and loses it. Boards and dense tables — where horizontal
overflow actually lives — are among the routes that did not render, so the clean overflow result
covers list, empty, denied and detail surfaces but not a kanban board.

## 7. Contrast — S7's measurement re-verified, plus the first in-situ check

`components/ui/__tests__/contrast-tokens.test.ts` → **41/41**, unchanged and re-run. The standard
checked is **WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text (≥24px, or ≥18.66px bold) and
for non-text UI boundaries (SC 1.4.11)**.

The token layer is already correct and the test already says so: `-ink-strong` clears 4.5:1 on every
light surface (success 5.21, warning 4.84, danger 5.91) and `-ink` clears the 3:1 non-text floor.
**`-ink` is the icon/rule ink and `-ink-strong` is the text ink** — the comment on
`--status-warning-ink` in `globals.css` says so explicitly.

**The defect is not in the tokens, it is that call sites hand `-ink` to text.** `text-status-*-ink`
(not `-ink-strong`) appears **2234 times across `components/`, `features/` and `lib/`**, much of it
badge and label copy at `text-[9px]`–`text-xs`, which is normal text owing 4.5:1. The failing pairs,
measured:

| Pair | Ratio | AA normal text |
|---|---|---|
| `--status-success-ink` on its surface | 3.58 | ✗ |
| `--status-warning-ink` on its surface | 3.07 | ✗ |
| `--status-danger-ink` on its surface | 4.41 | ✗ |
| `--muted-foreground` on `--muted` | 4.34 | ✗ |

`statusToneClasses` returns both `.ink` and `.inkStrong`, so the fix is per call site, and it lives
across two territories plus `lib/design-tokens`. **Not mine to make unilaterally at 2234 sites**; the
measurement is locked into the suite so it cannot drift.

**The browser then confirmed two of those four pairs on real screens**, independently of the token
test: 4251 painted text nodes sampled across four modules, 90 failures, every one of them
`--status-warning-ink` (3.43 and 3.58) or `--muted-foreground`-on-`--muted` (4.34). Predicted from
the tokens, observed in the product. That is what closes "verified rather than assumed"; what remains
is the fix, which is 2234 call sites across three territories.

## 8. Gates and proofs — every one run and read

| Command | Exit | Number |
|---|---|---|
| `pnpm -s check:empty-states` | 0 | 0 hand-rolled, 3804 files |
| `pnpm -s check:empty-states:self-test` | 0 | 8 passed (was 6) |
| `pnpm -s check:icon-labels` | 0 | 0 unlabelled, 3804 files |
| `pnpm -s check:icon-labels:self-test` | 0 | 20 passed |
| `pnpm -s check:colors` | 0 | 0 arbitrary hex, 5221 files |
| `pnpm -s check:colors:self-test` | 0 | 21 passed |
| `pnpm -s check:seo-metadata` | 0 | OK, 1222 route files |
| `pnpm -s check:seo-metadata:self-test` | 0 | all three failure modes bite |
| `pnpm -s check:route-thinness` | 0 | within ratchet (was **1 above**, see below) |
| `pnpm -s check:over-300` | 0 | 519/5211, baseline 519 (was **520**) |
| `pnpm -s check:effect-fetches` · `check:client-pages` | 0 | 0 · within ceiling |
| `node scripts/browser-journeys.mjs --self-test` | 0 | **20 passed** |
| `node scripts/browser-journeys.mjs --widths=375,768,1280` | 1 | 57 steps · 46 reached a product state · **0 overflow** · 90 contrast failures |
| `pnpm type-check` (re-run at the end) | **0** | **0 errors** — the 46 accounting/billing errors mid-session were another agent's in-flight contract work and are gone |
| `npx jest --runInBand` on the component suites | 0 | **13 suites / 229 tests** |
| `npx jest --runInBand --testPathPattern="…paused-reads-and-truncated-lists"` | 0 | 12/12 |
| `npx jest --runInBand --testPathPattern="…authenticated-surface-states.contract"` | 0 | 19/19 against the **tightened** baselines |
| `npx eslint` on all 12 files I changed | 0 | 0 problems |

**Two gates I broke and fixed.** Adding loading and error branches pushed
`app/(authenticated)/accounting/setup/page.tsx` to 305 lines, which put `check:route-thinness` **1
above its baseline of 0** and `check:over-300` **1 above 519**. The route module now delegates to
`features/accounting/settings/accounting-setup-page.tsx`, the pattern ticket 25 established; the
extraction also collapsed six near-identical `motion.div` step blocks into one and replaced a
hand-rolled "Insufficient permissions" `EmptyState` with `NoPermissionState`. Both gates are green.

**Typecheck.** Mid-session it exited 2 with 46 errors, every one in `features/accounting/**`,
`features/billing/**` or `hooks/api/accounting/**` and every one a variant of
`Property 'openingBalanceDate' is missing … CursorPage<BankAccount>` — another agent's in-flight
response-validation work, none of it in a file I or my worker touched. Per brief rule 4 I reported it
rather than debugging it. **Re-run after they landed: exit 0, 0 errors.**

## 9. For the orchestrator

- **P1 · backend, not mine — the admission counter leaks and the backend eventually 503s everything.**
  `AdmissionGuard.canActivate` increments in-flight and stores `_admissionOrgId`;
  `AdmissionInterceptor` decrements it in a `finalize`. Nest runs **guards before interceptors**, so
  any request rejected by a guard that runs *after* `AdmissionGuard` — `JwtAuthGuard`,
  `PermissionGuard`, a 403 — increments and **never releases**. On my local instance `inFlight`
  climbed until every request shed: **2278 "The service is temporarily overloaded"** responses, and
  it never recovered without a restart. It renders in the UI as an unexplained failure on every
  surface. `src/common/admission/admission.guard.ts` + `admission.interceptor.ts`.
- **P1 · `AUTH_SIGNING_KEYS` and `NEXTAUTH_SECRET` are absent from the backend `.env` on this
  machine**, so `/auth/session-exchange` returns 503 and the frontend hangs on "Syncing
  organization…" forever with no error state. Any future browser or e2e work hits this first.
- **P2 · `components/ui/data-table.tsx` still shows an eternal skeleton when a query is paused**
  (§3). Three lines, same shape as the `LoadingState` fix, blocked only on the file being held.
- **P2 · `MembersResponse` in `hooks/api/organization.ts` is fiction** (§4). The component no longer
  depends on it, but the type still says `page`/`total`/`totalPages` for a cursor endpoint.
- **P2 · status-ink contrast at 2234 call sites** (§7). A decision, not a session's work.
- **`app/(authenticated)/inventory/purchase-orders/page.tsx` links twice to `/inventory/vendors/new`,
  which does not exist** (lines 398 and 430) — vendor creation is a sheet on `/inventory/vendors`.
- **`features/organization/organization-structure-page.tsx`** has an inline arrow in a JSX event prop
  (`onRetry={() => void refetch()}`), against the repo rule.
- **`check:file-sizes` is red on two files, neither mine:** `features/hr/cases/cases-page-content.tsx`
  (501) and `hooks/api/notifications-inbox.ts` (534).

## 10. Files changed

**Gate and harness (3)**
- `frontend/scripts/check-no-handrolled-empty-states.mjs` — `\bempty\b`, 2 new self-tests, 9 → 2 exceptions
- `frontend/scripts/browser-journeys.mjs` (new) — the CDP journey driver
- `frontend/package.json` — `browser:journeys`, `browser:journeys:self-test`

**Shared components (7)**
- `frontend/components/shared/loading-state.tsx` — paused ≠ loading
- `frontend/components/ui/route-error-boundary.tsx` — `main` + `h1` when it is the whole page
- `frontend/app/access-denied/page.tsx` — `main` landmark
- `frontend/components/providers/query-provider.tsx` — no retry on a contract violation
- `frontend/components/ui/list-truncation-notice.tsx` (new)
- `frontend/components/ui/combobox.tsx` — `footer` slot
- `frontend/components/ui/chat-channel-combobox.tsx` — surfaces its own 50-item cap
- `frontend/components/rbac/role-assignments-sheet.tsx` — dead pager out, truthful notice in

**Route bodies and states (15)** — `app/(authenticated)/accounting/setup`, `inventory/operations`,
`inventory/quality`, `inventory/purchase-orders/[poId]` and `/new`, `inventory/sales-orders/[soId]`
and `/new`, `support/reports/csat`, `surveys/live/[sessionId]/host`, `surveys/new`,
`workflows/analytics`; `features/accounting/settings/accounting-setup-page.tsx` (new),
`features/accounting/core/opening-balances-editor.tsx`, `features/support/portal/portal-ticket-detail-page.tsx`,
`features/surveys/live/live-result-bars.tsx`.

**Tests (2)**
- `frontend/components/__tests__/authenticated-surface-states.contract.test.ts` — baselines tightened
- `frontend/components/__tests__/paused-reads-and-truncated-lists.test.tsx` (new) — 12 tests
