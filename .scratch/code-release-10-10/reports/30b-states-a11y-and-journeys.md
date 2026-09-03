# 30b — States closed, the a11y claim given a denominator, and the journeys taken to a board

Session S11. Continues `reports/30-ux-accessibility.md` (S8) rather than replacing it; the S8
findings that still hold are cited, not repeated. FE = `streamlineos-frontend/frontend`.

**The headline is that most of what S8 handed up as blocked is no longer blocked.** Five surfaces
were waiting on other territories for a read-error branch and four for an empty state; all nine have
them. `data-table.tsx`'s eternal paused skeleton, handed up as "Handoff, not done", is done. And the
"Syncing organization…" hang S8 recorded as an *environment* blocker turned out to be a product
defect in this ticket's own territory — a loading screen with no upper bound — and it is fixed.

---

## 1. Box 1 — states — CLOSED

Re-measured at head with the S8 analyzer, which resolves each route module through to its
feature-owned body rather than stopping at the thin shim:

| Signal | S7 | S8 | **Now** |
|---|---|---|---|
| authenticated surfaces / reading server state | — | 556 / 540 | **556 / 539** |
| no loading state | 2 | 0 | **0** |
| no read-error branch | 78 | 5 | **0** |
| no permission gate | 1 | 0 | **0** |
| no empty state | 56 | 10 | **7** |
| filter-empty conflated with data-empty | 101 | 56 | **55** |

`npx jest --runInBand --testPathPattern="authenticated-surface-states.contract"` → **exit 0, 22/22**.

### The ratchet was slack again, and a count alone was not enough

It still carried `missingEmpty: 8`, `missingError: 1`, `filterEmptyConflation: 56` against a tree
measuring 7 / 0 / 55. Pinned to the measured numbers.

More importantly, **a count on its own is not a ratchet for this signal.** One surface can lose its
empty state while another gains one and the number never moves. The seven are now pinned **by route**:

```
/crm/import · /hr/recruitment/sla · /inventory/operations · /inventory/products/new
/notifications/policy · /settings/organization/structure · /surveys/new
```

Adding a route to that list is the same weight as lowering a number, and it is asserted with
`toEqual`, so a swap fails immediately and names both sides.

### Why the seven are correct, not gaps

Two of the seven are in this session's territory and were read line by line:

- **`/hr/recruitment/sla`** — `features/hr/recruitment/sla/sla-config-page.tsx` renders
  `CANDIDATE_STAGES.map(...)`, a hardcoded six-element constant, and merges the server's SLA rows
  into those six by stage. The table has six rows whether the server returns 0 or 6. There is no
  collection that can be empty; the "not configured" case is already a per-row `Default` badge with a
  configure action, which is a better answer than an empty state would be.
- **`/notifications/policy`** — `features/notifications/admin/notification-policy-page.tsx` is a
  settings form over `NOTIFICATION_CATEGORIES` and a fixed channel list. Its one server read is the
  ORG-scoped policy row, and its absence is already handled: `buildInitialCategoryState({})` supplies
  defaults. Nothing on the page is a collection.

The other five carry S8's verdicts unchanged and were re-checked against current source.

### Offline — both halves now

S8 fixed `components/shared/loading-state.tsx` and handed up `components/ui/data-table.tsx`, which is
the loading state for most list pages, as blocked on the file being held. It has since had the same
treatment: it reads `useOnlineStatus()`, drops `aria-busy` when the browser is offline, and swaps
"Loading results…" for **"Paused — waiting for a connection"** plus the offline copy.

`components/__tests__/paused-reads-and-truncated-lists.test.tsx` → **12 cases**, three of them bite
proofs, including *an online table skeleton must not carry the offline copy* — which is what stops
the fix being a string that is always present.

### The environment blocker was a product defect in this territory

S8 recorded, under box 5: *"`AUTH_SIGNING_KEYS` and `NEXTAUTH_SECRET` are absent from the backend
`.env`, so `/auth/session-exchange` returns 503 and the frontend hangs on 'Syncing organization…'
forever with no error state."*

The missing secrets are a machine-configuration fact. **The absent error state was ours.**
`AppLoadingScreen` ran an infinite Framer loop with no upper bound, which is the same defect as a
skeleton on a paused query: nothing ever tells the reader the workspace is not coming. It now falls
to `AppLoadingStalled` after `DEFAULT_STALLED_AFTER_MS = 20_000`, pinned by three cases in
`components/ui/app-loading-screen.test.tsx`.

---

## 2. Box 2 — keyboard and screen-reader semantics — PARTIAL, with the fraction stated

This box is left open on purpose, and the reason is arithmetic rather than doubt.

**What is now measured across the whole corpus, with a denominator:**

| Measurement | Result |
|---|---|
| `keyboard-reachability.contract.test.ts` — lowercase-element click targets | **632 across 3,646 `.tsx` files** |
| …that a keyboard cannot reach | **24** → **608 of 632 reachable, 96.2%** |
| `pnpm -s check:icon-labels` — icon-only controls with no accessible name | **0 across 3,817 files**, exit 0 |
| `overlay-focus.a11y.test.tsx` — focus trapped, restored, and released | 12/12 |
| `components/layout/__tests__` — skip link, route focus, the named `<main>` | green |
| route error screen that replaces the shell keeps `main` + the only `h1` | bite-proofed |
| a11y and state suites overall | **13 suites / 212 tests**, exit 0 |

**Why it is not ticked.** 24 click targets remain unreachable, so "every interactive surface" is
false by 24. And reachability is only one axis: ARIA relationships and live-region correctness across
556 pages are still established only by the 13 rendered suites, not by any corpus-wide scan. 608/632
is a census rather than a sample, but it is not 632/632, and ticking it would be the exact move this
release exists to stop.

**The 24, by owner.** One is mine: `features/build/views/kanban-ticket-card.tsx:74`. Its outer `div`
takes a drag-aware mouse click while the card's real keyboard target is the nested title `<button>` —
so the card *is* operable, but the div itself is inert to a keyboard and the scan is right to say so.
It cannot take the stretched `CARD_ACTIVATOR_CLASS` treatment the other cards took, because a
stretched `::after` over a `cursor-grab` surface swallows the drag. Weakening the scan to absolve it
would be worse than the finding. The other 23: `features/crm` 7 (excluded from this release),
`app/(authenticated)/inventory` 2 (excluded), `features/users` 3, `features/accounting` 2,
`features/payroll` 2, `features/sign` 2, `features/settings` 1, `features/mail` 1,
`features/dashboard` 1, `components/ui/avatar-stack.tsx` 1, `components/editor/plate` 1.

---

## 3. What the harness gained, and why it now refuses two more things

S8 built the harness and ran it. Two structural gaps were left, and both are closed.

**It could not reach a board.** Every journey step was a static route, and the widest screens in this
product — kanban boards and per-record tables — live behind a record id. S8's clean overflow result
therefore covered list, empty, denied and detail surfaces and no board at all, which the report said
plainly. Steps may now carry a `{token}`, resolved before the run **from the running product**: read
an id out of a link if there is one, otherwise **click the first row of the listing and read where it
landed**. That is the click-through box 5 was missing, and it is deliberately not a command-line id,
because an id typed from outside can be stale or belong to another tenant and the run would then
measure a 404 under a route name that sounds right. (Proof it matters: the first attempt matched any
path segment and resolved `projectId = "command-center"` — a static sibling route — and would have
scored `/build/command-center/backlog`, a 404, as a genuine error state.)

**A skipped step must not shrink the denominator.** S8's refusal covered a run where most steps
errored. The mirror image was still open: a run that could not resolve an id would have reported
"0 findings over 19 steps" and read as *cleaner* than the 21-step run it failed to be. The harness now
records `step-not-reached`, reports `n of m planned`, and exits 1. Both refusals are intact; neither
was loosened to get a run to complete.

Self-tests **20 → 34**, six of them bite proofs.

## 4. Boxes 4 and 5 — the run

A real browser was driven over the authenticated product again, at all three reference widths, one
width per invocation with the dev server restarted between them.

```
node scripts/browser-journeys.mjs --base-url=http://localhost:3000 \
  --cookie-file=<minted authjs.session-token> --widths=<W> --settle-ms=6000
```

| Measure | S8 | **Now** |
|---|---|---|
| steps run | 57 of 57 | **57 of 63 planned** (19 of 21 per width) |
| reached a terminal product state | 46 | **45** — 21 empty · 21 content · 3 denied |
| rendered an error boundary | 11 | **12** — the same 4 routes at all 3 widths |
| never settled (stuck skeleton) | 7 | **0** |
| **horizontal overflow, `scrollWidth − innerWidth`** | 0 on 57 | **0 on all 57**, at 375, 768 and 1280 |
| `main` landmark with an accessible name | 57 of 57 | **57 of 57** |
| **exactly one `h1`** | **46 of 57** | **57 of 57** |
| unauthenticated steps | 0 | **0** |

**The `h1` result is the one that moved.** S8's 11 misses were all routes whose read threw to the
segment boundary, which replaces `PageWrapper` and took the page heading with it. That boundary now
keeps a heading, and the browser confirms it: the four routes that still error render an error screen
**with** its `h1`, so a reader who lands on a failure still has a document with a title and a
landmark. That is the box-2 defect measured from the product rather than from jsdom.

### Contrast, and 57 fabricated failures removed

The first sweep reported 5,545 painted text nodes and **429** AA failures across the three widths, in
four pairs. Three were the pairs S8 predicted from the token test. **The fourth was not real:**
`#ffffff` on `#f8fafc` at **1.05:1** — invisible text, which no shipped page has. It was
`text-white` on `bg-status-danger-fill`; Tailwind 4 serialises its palette as `oklch()`, the probe's
`rgb()` parser cannot read that, and `behind()` walked past it to the page ground.

This is the same class of fabrication S8 fixed for the `fg === bg` case, one step further out, so it
was fixed the same way: an unparseable background colour is **unmeasurable**, not absent, and the
sample is skipped rather than scored against the wrong ground. Re-run at 1280 on the same tree:

| | before | after |
|---|---|---|
| text nodes sampled | 1,995 | 1,688 |
| AA failures | **143** | **86** |
| the 1.05:1 pair | present | gone |
| `#cb7006`/`#64748b` real pairs | present | **unchanged** |

Box 3 is already closed and its verdict does not change: the real failures are the same
`--status-warning-ink` and `--muted-foreground` pairs, and they are a token-layer decision at 2,234
call sites.

### Box 4 — layout at 375 / 768 / 1280 — still PARTIAL, and the gap has moved

**`scrollWidth − innerWidth` was 0 on every one of the 57 steps at all three widths.** That is now a
stronger result than S8's, because 0 steps sat on a skeleton and every step that rendered was a
settled state.

**It still does not cover a kanban board**, and the reason is now precise rather than "the run
errored". The board steps were *planned*, the harness *tried* to reach them, and it recorded
`step-not-reached` ×2 per width rather than pretending the run was clean. The id could not be
resolved because **`/build/all` itself renders "Failed to load projects"** — see §5, finding 1. There
is no row to click, so there is no board to open. Fixing that one contract drift unblocks this box.

### Box 5 — representative journeys — still PARTIAL

The harness is stronger than S8 left it — a click-through, a planned-vs-reached denominator, 39
self-tests, and a probe that no longer fabricates. It is still not evidence of *flows*: the steps are
routes plus one click, nothing asserts a write, and the run needs a live app and a minted session, so
it cannot be a CI gate as it stands. Four of 19 routes reach an error boundary and are named below.

---

## 5. Cross-territory findings — verified, not mine to fix

**1 · P1 — the project list is broken by a contract drift, and it is what blocks box 4.**
`types/projects/projects.ts:344` declares `ProjectFilters { page?: number; limit?: number; … }` and
`features/build/project-list/projects-page.tsx:293` sends `page` on every load. The backend's
`listProjectsSchema` (`src/modules/build/core/dto/project-core.schemas.ts:47-53`) is cursor-based
(`afterId`, `limit`) and **`.strict()`**, so `GET /build?page=1&limit=25` is rejected with
`Unrecognized key: "page"` and `/build/all` renders "Failed to load projects". Both `/build` and
`/build/all` reached their error boundary at all three widths. This is exactly the failure mode
shared `CLAUDE.md` §9 describes — a strict boundary turning a drifted field into a rejection — and it
means **no board can be opened from the product at all**. Owners: `types/**`, `hooks/api/**` and the
backend schema. It is the single highest-value fix for this ticket.

**2 · P1 — `/calendar` renders its error state on load.** The one unified calendar asks the backend
for a date window wider than it allows: the client logs
`ApiError: "Date window must not exceed 62 days."` on `/calendar` on every visit, for the seeded org,
at every width. `GET /calendar` itself is 200; the failure is the client read. Owners:
`features/calendar/**` + `hooks/api/**`.

**3 · P2 — `/build/<projectId>` cannot server-render at all in this tree.**
`Cannot find module 'undici/lib/handler/wrap-handler.js'`, reached via
`project-board-page → create-ticket-dialog → components/ai → isomorphic-dompurify → jsdom`.
Verified: `frontend/node_modules/undici/lib/handler/wrap-handler.js` does not exist, and two jsdom
copies are installed (`jsdom@20.0.3` and `jsdom@29.1.1`). A dependency resolution problem, not a UI
one — but it means the board would still not render even with finding 1 fixed. Owner: whoever owns
the lockfile.

**4 · `/crm/leads` — recorded and moved past, per the brief.** Backend `GET /leads/board` and
`/leads/stats` both 500, six times each in this session's log, on a Postgres grouping error
(sqlstate 42803) in the `lead_party_map` / `business_parties` join. CRM is excluded from this release.

**5 · The one unreachable click target in my territory is argued, not fixed.**
`features/build/views/kanban-ticket-card.tsx:74` — see §2. Recorded rather than absolved by weakening
the scan.

**6 · Sixteen risky inline closures remain in six other territories.** Named in
`reports/38c-closure-residue.md` §5. Two of them can now import `lib/numeric-field.ts` instead of
retyping the rule.

**7 · `check:dead-code` is exit 1 on `hooks/api/meetings-ai.ts`** — `streamMeetingPrep` and
`readMeetingPrepSources` have no `EXPORT_VERDICTS` entry. (The brief attributed this red to
`lib/keyboard-activation.ts:nestedActivationProps`; that symbol no longer exists and that file is
clean. The red has moved.)

**8 · `check:file-sizes` is exit 1 on three files, none of them mine and one of them new:**
`features/hr/cases/cases-page-content.tsx` (501), `hooks/api/notifications-inbox.ts` (534) and
`hooks/api/notifications-inbox.test.ts` (663).

---

## 6. Gates — command, exit code, number

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **0** | **0 errors** (12 mid-session, all `features/calendar/**` against another lane's in-flight `hooks/api/meetings-ai.ts`; gone once they landed) |
| `jest --runInBand --testPathPattern="authenticated-surface-states.contract"` | **0** | **22/22**, 556 surfaces / 539 reading server state |
| `jest --runInBand` over the a11y + state suites | **0** | **13 suites / 212 tests** |
| `jest --runInBand --testPathPattern="(numeric-field\|keyboard-activation\|toggle-in-list)"` | **0** | 3 suites / **27 tests** |
| `node scripts/browser-journeys.mjs --self-test` | **0** | **39 passed** (was 20), six bite proofs |
| `node scripts/browser-journeys.mjs --widths=375` | 1 | 19 of 21 · 0 overflow · 0 h1 misses · 143 contrast |
| `node scripts/browser-journeys.mjs --widths=768` | 1 | 19 of 21 · 0 overflow · 0 h1 misses · 143 contrast |
| `node scripts/browser-journeys.mjs --widths=1280` | 1 | 19 of 21 · 0 overflow · 0 h1 misses · 143 contrast |
| …1280 again, after the probe fix | 1 | 19 of 21 · **0 overflow** · **86 contrast** |
| `pnpm -s check:empty-states` / `:self-test` | **0** / **0** | 0 violations, 3,817 files / 8 passed |
| `pnpm -s check:icon-labels` | **0** | 0 violations, 3,817 files |
| `pnpm -s check:over-300` | **0** | 519 of 5,251, baseline 519 |
| `pnpm -s check:route-thinness` · `check:client-pages` | **0** | within ratchet · 163 below limit |
| `pnpm -s check:effect-fetches` · `check:query-scope` | **0** | 0 violations, 5,266 files each |
| `pnpm -s check:type-assertions` · `check:import-direction` | **0** | no forced typing · 194/194 at baseline |
| `npx eslint` on the 13 files changed for ticket 38 | **0** | 0 errors, 1 pre-existing warning |
| `pnpm -s check:file-sizes` | **1** | 3 files over 500, none mine (§5.8) |
| `pnpm -s check:dead-code` | **1** | 2 unclassified exports, neither mine (§5.7) |

**Not run:** repo-wide `pnpm lint` (reported red at 14 errors before I started; I linted my own files
instead), `next build`, and every backend gate.

## 7. The environment, so this is repeatable

Frontend `next dev` on **:3000** (`:1000` was taken and only `:1000`/`:3000` are in the backend's
CORS allowlist), backend on **:1501**, both against **`scratch_t30_browser`** — a `pg_dump`/`pg_restore`
copy of `scratch_perf_seed` at journal head 665, made as a copy because `createdb -T` is refused while
another session holds connections to the template. `scratch_perf_seed` itself was never written to.
Org `aaaaaaaa-1111-0000-0000-000000000001`, owner `user-1@scratch-seed.test`, 20 projects.

Four things had to be supplied in the **process environment only**, never on disk: a 64-character
`NEXTAUTH_SECRET`, a matching `INTERNAL_API_SECRET`, an Ed25519 `AUTH_SIGNING_KEYS` keyring in the
shape `JwtKeyringService` parses, and `TZ=UTC`. Three things had to be inserted into the scratch
database: `organization_placement` rows (without which `withTenant` refuses every read),
`org_modules` rows for all 20 modules (without which every module route renders access-denied), and
`onboarding_completed_at` on the org and the owner (without which `resolveWizardGate` bounces every
request to `/org-setup`). Redis was disabled on this instance, because the shared Upstash in `.env`
has no key prefix and two instances on two databases would have shared cache entries.
