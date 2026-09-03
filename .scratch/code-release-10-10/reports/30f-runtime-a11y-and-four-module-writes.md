# 30f — axe against the tree the product paints, and four modules that assert a write

Session S16. Continues `30-…` (S8), `30b-…` (S11), `30c-…` (S13), `30d-…` (S14), `30e-…` (S15).
FE = `streamlineos-frontend/frontend`. Two boxes were open: **box 2** (keyboard + screen-reader
semantics) and **box 5** (browser end-to-end journeys). Both were worked. **Box 5 is closed on its
own territory's remainder and stays open on CI; box 2 stays open, and the reason is now a list of
named defects rather than an absence of measurement.**

---

## 1 · The number first

```
node scripts/browser-journeys.mjs --base-url=http://localhost:3130 \
  --cookie-file=<minted> --widths=375,768,1280 --settle-ms=6000
```
→ exit 1 (85 findings) ·
**`63 of 63 planned steps run · 4 of 4 writes asserted · axe ran on 63 of 63 steps over 45,346 nodes`**

| | S15 | S16 |
|---|---|---|
| planned steps run | 63 of 63 | 63 of 63 |
| **writes asserted** | **1 of 1 — one module** | **4 of 4 — four modules** |
| **runtime a11y** | **not measured at all** | **63 of 63 steps, 45,346 nodes, 46 violations** |
| `scrollWidth − innerWidth` | 0 | 0 (max over the run: 0) |
| one `h1` / named `main` | 63 / 63 | 63 / 63 |
| `--allow-cross-origin-api` | **used** | **not used** |
| self-test | 48 | **66** |

`--self-test` → **exit 0, 66 passed** (was 48; 18 new, 9 of them bite proofs).

**The CORS bypass is gone.** S15 had to run with `--disable-web-security` because the backend's
`CORS_ORIGINS` named only ports another agent held. This session started **its own backend on
:1502** from the same `dist/main`, replicating the running process's env exactly and overriding only
`PORT`, `APP_URL` and `CORS_ORIGINS`, pointed at the same `scratch_t30_browser`. The results JSON
records `crossOriginApiAllowed: false`.

---

## 2 · Box 5 — four modules, four tables, four rows in Postgres

The remainder S15 wrote for itself was exact: *"One module has a write. Build. HR, accounting,
settings, calendar, workflows, knowledge and notifications are covered as routes at three widths,
not as flows with a mutation."*

Three more modules now drive a real mutation through the real UI and assert the row **survives a
reload** — away to `/dashboard`, back, look again, which is the only way a browser distinguishes a
server write from the optimistic cache entry the mutation wrote locally.

| journey | route | shape driven | table |
|---|---|---|---|
| `build-create-ticket` | `/build/{projectId}` | inline column composer, Enter to submit | `build.tickets` |
| `accounting-create-account` | `/accounting/coa` | modal form, two required fields | `public.ledger_accounts` |
| `workflows-create-workflow` | `/workflows` | modal form that **navigates away** on success | `public.workflows` |
| `hr-create-holiday` | `/hr/attendance` | inline form → **date picker** → **confirmation dialog** | `public.holidays` |

**Deliberately four different shapes.** A harness that only works one shape of dialog reports the
next one as a product defect. The HR journey is the useful one: its submit only *opens* a
confirmation, so a run that stopped at the first click would report a write it never made.

**Proved in the database, not in the DOM.** The final run's four subjects, looked up by name:

```
build.tickets    20578                                  journey-write-1788427166426-b08ae6
ledger_accounts  4                                      journey-write-1788427195138-20b828
workflows        0ee0878a-ad9d-4718-b54f-8ae0cc178ede   journey-write-1788427224355-ff635b
holidays         3                                      journey-write-1788427252329-1621d0
```

Real Chrome → real `next dev` → real Nest backend → real Postgres. Nothing in that path is mocked.

### 2.1 The run that refused, and why that is the point

The **first** three-width run with all four journeys reported
`3 of 4 writes asserted` and exited 1 with `write-step-failed` at *"confirm in the alert dialog"*.
It was not a harness bug: `manage-holidays-card.tsx` refuses a second holiday on a date that already
has one, and the date field defaults to today. The earlier smoke run had already taken 2026-09-03.

A journey that always takes the default date can write exactly **once per environment** and reports
every later run as a product failure. The date is now chosen by walking forward from the calendar's
selected cell by an offset derived from the run's own subject — relative to the selected cell rather
than by matching a bare day number, because the grid's leading cells belong to the previous month.
A collision still fails loudly. Verified: `holidays` rows now sit on 2026-09-03, 09-16 and one more.

### 2.2 New self-test properties, all bite-proved

- the writes span **four distinct modules** — a green run cannot be one create dialog four times
- no two write journeys write on the same route
- a controlled field is set through React's own value setter, and the step reports whether the value
  **stuck**, not whether it was attempted
- a calendar day is chosen relative to the selected cell, never by matching a bare number, and a
  calendar with no selected cell fails the step rather than clicking the first day it sees

---

## 3 · Box 2 — the blind spot the static census names in its own header

S15 built `aria-semantics.contract` and wrote its exclusions into the module header. Three of them
have the same cause — **the tree it judges is source, not a render**:

> *any PascalCase component* · *a name computed at runtime* · *an id threaded through a prop, which
> is honoured by NAME rather than by proof*

axe-core now runs on **every probed step, in the engine that painted the page**. `<Dialog>` is
expanded, `aria-label={label}` has resolved to a string or to nothing, and an `aria-labelledby`
either finds its id in the document or does not. WCAG 2 A/AA + 2.1 A/AA rule sets, with
`color-contrast` disabled because this harness already measures contrast against the colour actually
behind each text node — running both would count the same pixels twice under two methods and make
each look like corroboration of the other.

**A step axe never ran on is not a step with no violations.** `axeIncomplete()` is the third refusal
beside `stepsIncomplete()` and `writesIncomplete()`, a missing axe-core stops the run before the
browser is driven anywhere, and the self-test asserts axe-core resolves on disk — so the pass can
never quietly disappear on the next install and leave every page reading green.

### 3.1 What it found: 20 violations at one width, none visible to the static scan

First measured run (1280 only): 20 violations over 21 steps, several rated **critical**. Two classes
were systemic, in shared code, and are now fixed.

**(a) Every virtual list in the product had stopped being a list.**
react-window v2 puts `role="list"` on its own scroll container and hands each row an
`ariaAttributes` prop carrying `role="listitem"`. **Neither role appears anywhere in this
repository's source**, so the static census cannot see the relationship at all, and a rendered suite
only sees the rows a fixture happened to mount.

All six virtual lists dropped that spread on at least one early return — the "no item yet" row, the
load-more sentinel, the date header:
`notification-virtual-list.tsx` · `inbox-virtual-list.tsx` · `chat-user-virtual-list.tsx` ·
`mail-virtual-list.tsx` · `kanban-virtual-ticket-list.tsx` · `calendar-events-panel.tsx`.
Each put a non-listitem child inside a `role="list"` — `aria-required-children`, which axe rates
**critical**. The browser run found it live on `/notifications`, `/inbox` and `/build/{id}`.

**(b) The kanban row's drag handle was overwriting its listitem role.**
`{...provided.dragHandleProps}` was spread **after** `{...ariaAttributes}`, so dnd's `role="button"`
silently replaced `role="listitem"`. One spread order cost **three** axe violations at once on
`/build/{id}`: the list lost a required child (critical), `aria-posinset` became an attribute the
element's role does not allow (critical), and a button containing the card's own title and
inline-field buttons is `nested-interactive` (serious) — a screen-reader user cannot reach controls
inside a button. This was collateral from S14's own keyboard fix, which is exactly the kind of
regression a static scan cannot see.

Reordering restores `role="listitem"` and keeps every other prop dnd needs — `tabIndex`,
`aria-describedby`, the `data-rfd-drag-handle-*` attributes — so drag-anywhere and the keyboard lift
are untouched. **The contract now pins the ORDER, not just the presence**: a `{...spread}` that
follows `ariaAttributes` can carry its own role, so "spreads ariaAttributes" was never the property
worth asserting.

**(c) Every progress bar in the product was indeterminate.**
`aria-progressbar-name` was reported on 53 nodes across four routes. Reading the markup the finding
captured showed something the rule did not name: every bar rendered `data-state="indeterminate"`
with **no `aria-valuenow`**. `components/ui/progress.tsx` destructured `value` out and used it only
for the visual transform and `aria-valuetext`, so it never reached the Radix root; `max` was dropped
the same way. A screen reader was told "busy" over a figure the page was showing as a percentage,
and `aria-valuetext` cannot cover that — an indeterminate progressbar has no value for the text to
describe.

The accessible **name** stays the caller's, and the two call sites the run measures now give a real
one (`module-setup-banners.tsx`, `project-table-columns.tsx`). A default of `"Progress"` here would
satisfy axe and tell a screen-reader user nothing — the exact defect class this ticket's own census
says no automated check can catch.

### 3.2 The numbers moved

| axe rule | before (3 widths) | after | note |
|---|---|---|---|
| `aria-required-children` | 6 findings / `/build/20`, `/calendar`, and `/inbox`+`/notifications` at 1280 | **3, `/calendar` only** | react-big-calendar internals |
| `aria-allowed-attr` | 3 (`/build/20`) | **0** | |
| `nested-interactive` | 5 | **2** (`/crm/deals`, `/parties`) | `/build/20` cleared |
| `aria-progressbar-name` | 4 routes / 53 nodes at 1280 | **1 route** (`/crm/deals`) | CRM, out of scope |
| axe violations, whole run | 55 | **46** | |

### 3.3 What is still open, named file by file

**Nothing here was fixed, and each is stated so the next session does not have to re-find it.**

1. **`button-name` — 8 routes, 128 nodes. The largest remaining class, and it is a primitive.**
   Two shapes, both `role="…"` elements that **do not take their name from content**:
   - `<button role="combobox" data-slot="select-trigger">` — `components/ui/select.tsx`, on
     `/accounting/coa`, `/workflows`, `/hr/attendance`, `/parties`, `/inventory/products`,
     `/inventory/stock`. A `SelectTrigger` whose only child is a `SelectValue` has **no accessible
     name at all** unless a `FormLabel` or `aria-label` supplies one. **873 call sites in 522
     files**, so this is not a type-level change one session makes at the end of its budget.
   - `<button role="checkbox" data-slot="checkbox">` — `components/ui/checkbox.tsx`, **30 nodes on
     `/notifications`** alone: the row-selection checkboxes carry no label.
   - `/calendar` — a `DropdownMenuTrigger` with no name.
2. **`scrollable-region-focusable` — 5 routes, 20 nodes, and it is one shared primitive.**
   `StatCardGrid` (`components/ui/stat-card.tsx:152`) is `overflow-x-auto scrollbar-hide
   touch-pan-x` with no focusable content when its cards have no `href`, so a keyboard user cannot
   scroll the stats row at all (WCAG 2.1.1). The fix axe asks for is `tabIndex={0}` on the scroller.
   **Deliberately not made here**: it adds a tab stop to nearly every list page in the product, and
   adding one to every page and half-verifying it at the end of a session is worse than naming it.
   `components/ui/data-table.tsx`'s scroll body is the same shape on `/hr/attendance`.
3. **`aria-required-parent` / `aria-required-children` on `/calendar`** — `.rbc-header`,
   `.rbc-row-content`, `.rbc-allday-cell`. react-big-calendar's own markup; a third-party question.
4. **`nested-interactive` on `/crm/deals` and `/parties`** — `<div role="button" tabindex="0">`
   cards containing their own buttons. CRM is out of release scope; `/parties` shares the card.
5. **R-24 unchanged.** `keyboard-reachability.contract` → exit 0, 633 click targets, 9 unreachable,
   all CRM/inventory. Re-run this session and green.
6. **What neither instrument can still see**, and this is the honest ceiling: whether a name is the
   RIGHT name (`aria-label="Button"` on a delete control passes both); a dialog nobody opened, since
   axe judges only what a page rendered; reading order; and whether an `aria-live` region actually
   announces. **The two together are a floor.**

---

## 4 · Bite proofs — both directions, hermetically, never in the shared tree

Both trees were `git archive HEAD` + hard-linked `node_modules`, at
`/Users/…/streamline/.t30-s16-bite`. The shared working tree was `git status --short` clean for
every named file afterwards, checked each time.

| what | clean | planted | restored |
|---|---|---|---|
| `progress-semantics.a11y` + `virtual-row-listitem.contract` | exit 0, **15/15** | **exit 1, 5 failed** | exit 0, 15/15 |
| `browser-journeys --self-test` | exit 0, **66 passed** | **exit 1, 4 failed** | exit 0, 66 passed |

Planted in real product files, one per property:
`kanban-virtual-ticket-list.tsx` — `ariaAttributes` moved back before `dragHandleProps`;
`inbox-virtual-list.tsx` — the early-return spread removed;
`progress.tsx` — `value` withheld from the root.
The corpus assertion named the file and line it found, not a count:
`features/build/views/kanban-virtual-ticket-list.tsx:108 <div ref={provided.innerRef} {...provide…`.

Planted in the harness: `axeIncomplete` forced to `false`, `axeVerdict` forced to treat a missing
result as a clean pass, and the accounting write moved onto build's route. All four corresponding
self-tests failed, including both axe bite proofs.

The suites also carry in-test bite proofs on planted markup — an unnamed `<Progress>` must still
fail axe, so the name is load-bearing rather than decorative; a spread after `ariaAttributes` is
reported; a row that spreads something else is not mistaken for a listitem.

---

## 5 · Environment — probed, and not the one already running

| Port | What it is | Verdict |
|---|---|---|
| 1501 | backend `dist/main`, process env → local `scratch_t30_browser` | another agent's; **CORS names only :1000/:3000** |
| 1000 / 3000 | `next` from the shared tree, reading the repo `.env` | **secrets do not match the backend** — sha256 of their `NEXTAUTH_SECRET`/`INTERNAL_API_SECRET` differs, so `/api/auth/session` carries no `backendJwt` and the app signs itself out while `curl` still answers 200 |
| **1502** | **this session's backend**, same `dist/main`, env replicated from :1501's process with only `PORT`/`APP_URL`/`CORS_ORIGINS` overridden | used |
| **3130** | **this session's `next dev`**, a `git archive HEAD` tree at `/Users/…/streamline/.t30-s16` with `node_modules` hard-linked and secrets matched by sha256 | used |

Confirmed before every run: `/api/auth/session` → `backendJwt: true`, `enabledModules: 13`,
`orgId: aaaaaaaa-1111-0000-0000-000000000001`.

**The backend `.env` on disk points at the shared remote Neon instance; the running process's env
overrides it to local `scratch_t30_browser`.** Anyone starting a backend here from the `.env` alone
would write journey rows to shared Neon. Only `scratch_t30_browser` was written to, by the twelve
journey rows across three runs.

**A note for whoever runs next: the agent scratchpad is shared and was wiped mid-session.**
`…/scratchpad/t30-live` and `t30-env` — the live tree, the minted cookie and two results JSONs —
disappeared while a run was in flight and the directory came back holding another session's files.
Everything was rebuilt outside it at `/Users/…/streamline/.t30-s16`, which is outside both git repos.
Durable evidence should not live in the scratchpad.

---

## 6 · Gates run this session

| command | exit | number |
|---|---|---|
| `pnpm -C frontend type-check` (via `heavy.sh 2`) | **0** | — |
| `npx jest --runInBand --testPathPattern="(progress-semantics\|virtual-row-listitem)"` | **0** | **15/15** |
| `npx jest --runInBand --testPathPattern="(keyboard-reachability.contract\|aria-semantics.contract)"` | **0** | **51/51** |
| `npx jest --runInBand --testPathPattern="(overlay-focus\|menu-driven-sheet-focus\|use-route-focus\|shell-a11y\|shell-keyboard\|row-action-shield)"` | **0** | **59/59** |
| `node scripts/browser-journeys.mjs --self-test` | **0** | **66 passed** |
| the full three-width run | **1** (85 findings) | 63/63 steps · 4/4 writes · axe 63/63 over 45,346 nodes |

Lint: **not run.** A production `next build`: **not run** — `next dev` served every run.

---

## 7 · Files changed

```
frontend/scripts/browser-journeys.mjs
frontend/components/ui/progress.tsx
frontend/components/ui/__tests__/progress-semantics.a11y.test.tsx        (new)
frontend/features/__tests__/virtual-row-listitem.contract.test.ts        (new)
frontend/features/notifications/notification-virtual-list.tsx
frontend/features/inbox/inbox-virtual-list.tsx
frontend/features/chat/chat-user-virtual-list.tsx
frontend/features/mail/mail-virtual-list.tsx
frontend/features/calendar/calendar-events-panel.tsx
frontend/features/build/views/kanban-virtual-ticket-list.tsx
frontend/features/build/project-list/project-table-columns.tsx
frontend/features/dashboard/module-setup-banners.tsx
```

Nothing under `app/(public)/**` or `features/marketing/**` was touched.
