# 30e — the ARIA census, a focus-restore defect in every dialog, and the first asserted write

Session S15. Continues `reports/30-…` (S8), `30b-…` (S11), `30c-…` (S13), `30d-…` (S14).
FE = `streamlineos-frontend/frontend`. Two boxes were open: box 2 (keyboard + screen-reader
semantics) and box 5 (browser end-to-end journeys). Both were worked; **both stay open**, for
reasons stated below rather than for the reasons they were open before.

---

## 1 · Box 2 — the honest number first

The box has three clauses and they had three different states.

| Clause | Instrument before this session | Measured |
|---|---|---|
| keyboard reachability | `keyboard-reachability.contract` — a real census | 624 of 633 targets, 9 pinned CRM/inventory |
| **screen-reader semantics** | **none at all** (A-29) | **this session** |
| focus across dialogs/drawers/routes | `overlay-focus.a11y` — 12 cases over the primitives | **found a defect it structurally could not see** |

### 1.1 The census

`components/__tests__/aria-semantics.contract.test.ts` + `test-utils/aria-semantics-analysis.ts`
walk the same corpus the keyboard scan does and judge the naming/role layer:

```
files scanned            3,652   (.tsx, tests excluded)
lowercase JSX elements  26,719   ← the population every check ran over
aria-* attributes          807
role="" attributes         209
form controls              103
```

Seven statically decidable defect classes. **Measured at the start of the session:**

| class | found | verdict |
|---|---|---|
| `role="…"` not a WAI-ARIA role | 0 | clean |
| `aria-*` not a WAI-ARIA attribute | 0 | clean |
| **`aria-labelledby/describedby/controls` resolving to nothing** | **4** | **real, fixed** |
| `aria-hidden` on an element still in the tab order | 0 | clean (8 raw hits, all `display:none` or `tabIndex={-1}`) |
| a `role` restating the element's implicit role | 0 | clean |
| positive `tabIndex` | 0 | clean |
| **form control with no accessible name** | **16** | **real; 15 fixed, 1 pinned** |

**20 real defects, 19 fixed.** The four dangling references are all in
`features/portal/components/portal-project-detail.tsx` — `<section aria-labelledby="tasks-heading">`
and three siblings, pointing at ids that exist nowhere in the tree, so each landmark's intended name
was silently dropped. `SectionHeader` now takes `titleId` and stamps it on its `<h2>`.

The 15 unnamed controls were genuinely nameless — a screen reader announced "edit, blank" — across
`assistant`, `plate`, `accounting/planning`, `build/ticket-details` (×2), `chat`, `hr` (×3),
`settings/organization`, `support/ai-report` (×2), `timesheets/my-time`, `wiki`. Named natively where
a `<label>` was already adjacent (`support/ai-report` gets `htmlFor`/`id`); by `aria-label` elsewhere,
carrying real context — the timesheet cell is now
`` `${row.projectName} hours on ${d}` ``, not "hours".

The one left is `features/crm/import/bulk-import-section.tsx:185` — CRM is out of release scope. It is
**pinned by route as well as by count**, so one surface cannot lose its name while another gains one
and the number stays still.

### 1.2 What the census MISSES — read this before treating a zero as coverage

Written into the module header, not just here:

- **whether a name is CORRECT.** `aria-label="Button"` on a delete control passes here and is a defect
  in the product. Only a human or a real AT session decides that.
- **focus traps and restoration**, and focus on route change. Runtime behaviour.
- **whether an `aria-live` region announces.** Presence is not announcement.
- **reading order**, or anything depending on the painted layout.
- **any PascalCase component.** `<Dialog>`'s semantics are its own contract; the scan cannot see
  through the import.
- **a name computed at runtime.** `aria-label={label}` counts as named without proving `label` is
  non-empty.
- **an id threaded through a prop is honoured by NAME, not by proof.** `titleId="x"` satisfies
  `aria-labelledby="x"` because the literal appears as an id-valued attribute in the same file. A
  heuristic, chosen to avoid fabricating findings, and weaker than following the render.

An automated axe-style pass has the same shape of blind spot for a different reason: it can only judge
what a fixture happened to mount. The two together are a floor, not coverage. **§1.3 is a defect
neither of them can see, and it was found by hand.**

### 1.3 Every triggerless dialog and sheet dropped focus onto `<body>`

Radix `DialogContentModal`:

```js
onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
  event.preventDefault();               // cancels FocusScope's natural restore
  context.triggerRef.current?.focus();  // …and then focuses nothing
})
```

`AppSheet`, `AppDialog`, `EntityFormSheet` and `EntityFormDialog` are **all controlled shells with no
`DialogTrigger`**, so `triggerRef.current` is `null` on every one of them. Closing any of those — and
every surface opened from a menu item, a row action or a keyboard shortcut — left focus on `<body>`:
the next Tab restarts at the top of the document and a screen reader announces nothing. **WCAG 2.4.3.**

`components/ui/__tests__/overlay-focus.a11y.test.tsx` passes 12/12 and could not see it, because both
its Dialog and Sheet cases build a `SheetTrigger`/`DialogTrigger` — the one case where Radix's
behaviour is correct.

Fixed in `lib/restore-focus-on-close.ts`, used by `SheetContent` and `DialogContent`. It captures the
opener in **`onOpenAutoFocus`** — the one moment FocusScope leaves it as `document.activeElement`;
a mount effect is too late *and* too early, because the wrapper renders on every parent render while
the overlay is still closed and would record `<body>` — and returns focus there on close, deferring to
Radix when the opener has since left the document. A caller's own handler still wins.

`features/build/epics/epic-card.tsx` was the shape that surfaced it: a dropdown item clicked an
`sr-only aria-hidden tabIndex={-1}` proxy button, which `EditEpicDialog` wrapped in an
`activationProps` span — **a tabbable `role="button"` with no accessible name**, sitting in the card's
action row. `EditEpicDialog` now takes `open`/`onOpenChange` and the proxy is gone.

---

## 2 · Box 5 — a write, asserted, and proved in the database

A-30's exact words were "nothing asserts a write", and the harness header agreed: "Each step is a
route plus an optional inert interaction — none of these writes". A sweep of only those cannot tell a
working product from a read-only one: **a page that renders is not a page that saves.**

`WRITE_JOURNEYS` in `scripts/browser-journeys.mjs` drives the kanban column composer to create a
ticket and then asserts the row **survives a reload** — navigate away to `/dashboard`, navigate back,
and look for it again. That is the only way a browser distinguishes a server write from the optimistic
cache entry the mutation wrote locally. The subject is unique per run and asserted **absent** before
the write, so a row left by an earlier run can never pass for this one's.

`writesIncomplete()` is the mirror of `stepsIncomplete()`: a run whose write never landed exits 1
rather than reporting a clean read-only sweep. Both checks are required to name `{subject}`, so
neither can degrade into a constant `true` — asserted in the self-test as a bite proof.

### 2.1 The run

```
node scripts/browser-journeys.mjs \
  --base-url=http://localhost:3130 \
  --cookie-file=<minted authjs.session-token> \
  --widths=375,768,1280 --settle-ms=6000 --allow-cross-origin-api
```
→ **exit 1**, `63 of 63 planned steps run · 1 of 1 writes asserted · 31 findings`.

| Measure | S11 | S14 | **S15** |
|---|---|---|---|
| steps run / planned | 57 / 63 | 63 / 63 | **63 / 63** |
| **writes asserted / planned** | — | — | **1 / 1** |
| `scrollWidth − innerWidth`, max | 0 | 0 | **0** |
| exactly one `h1` | 57/57 | 63/63 | **63 / 63** |
| `main` landmark **with a name** | 57/57 | 60/63 | **63 / 63** |
| unauthenticated | 0 | 0 | **0** |
| steps at an error boundary | 12 | 3 | **3** (`/crm/leads` ×3, CRM excluded) |
| never-settled | 0 | 0 | **4** — see §2.3 |
| contrast: sampled / unresolved / failing | — | 5175 / 0 / 468 | **4485 / 0 / 369** |

Terminal states: 33 content · 20 empty · 3 error · 3 denied · 4 loading.
`no-main-landmark` fell 3 → **0**: S14's three were `/build/20/backlog` 404ing for a PM-workspace
project, and that route now answers 200.

### 2.2 The write is not a claim, it is a row

```
[443.3s] write build-create-ticket · PERSISTED · journey-write-1788415461072-a9fe35

psql scratch_t30_browser -c "select id,title,status,project_id,created_at
                             from build.tickets where title like 'journey-write-%'"
20573 | journey-write-1788415461072-a9fe35 | TODO | 20 | 2026-09-03 11:34:30.029479+05:30
```

Real Chrome → real `next dev` → real Nest backend → real Postgres. **Nothing in this path is mocked.**

### 2.3 The four never-settled findings, investigated rather than reported raw

`/dashboard` at all three widths, and `/accounting/coa` at 1280.

Re-probed directly: `/accounting/coa` shows **0 busy regions and 0 skeletons** at 6s, 14s and 30s — it
was a cold Turbopack compile during the run, not a product state. `/dashboard` shows **15 visible
skeletons and 0 `aria-busy` at 30 seconds**, every time. The cause is
`features/dashboard/dashboard-deferred-body.tsx`: every read there is gated on `deferredVisible`,
which `DeferredDashboardContent` only flips `onVisible`, and its fallback renders `WidgetSkeleton ×3`
until then. In a headless viewport that never scrolls, it never flips.

**This is a deliberate below-the-fold deferral (ticket 27's territory), not a stuck read** — and it is
not fixed here. But it carries a real box-2 consequence and is handed up: the deferred fallback paints
skeletons with **no `aria-busy` and no live region**, so a sighted user sees "still loading" and a
screen-reader user is told nothing at all. Owner: ticket 27 / 28.

---

## 3 · Environment — probed before it was trusted

The stale-server trap is real here and two of the three servers already running were traps.

| Port | What it actually was | Verdict |
|---|---|---|
| 1043 | `next-server`, 14h37m, cwd = a **scratchpad** `t26/frontend` | not this repo |
| 1000 | `npm exec next start -p 1000`, serving `.next/BUILD_ID` stamped **08:27** | pre-dates this session's commits |
| 3000 | `next dev -p 3000` (another agent's) | **compiles current source, but its `INTERNAL_API_SECRET` does not match the backend's** |
| 1501 | backend `dist/main` against `scratch_t30_browser` | good, and used |

The :3000 finding is worth recording because it fails **silently and misleadingly**: `curl /dashboard`
answers 200, so the server looks authenticated, but `/api/auth/session` carries **no `backendJwt`**,
every client read 401s, and `lib/api-client.ts:202` calls `signOut({ callbackUrl: "/signin" })`. In a
browser the app therefore lands on the sign-in page while every server-side probe says 200. Anyone
screenshotting :3000 today is screenshotting a signed-out app.

What this session ran instead: **a `git archive HEAD` tree at `/Users/…/streamline/.t30-live`**, with
`node_modules` hard-linked, `next dev -p 3130`, its own `.env` carrying the scratchpad
`NEXTAUTH_SECRET` and `INTERNAL_API_SECRET` (verified by sha256 to equal the running backend's process
values), pointed at the existing backend on **:1501** over **`scratch_t30_browser`**. Confirmed before
the run: `/api/auth/session` → `backendJwt: true, enabledModules: 13`.

**`--allow-cross-origin-api` was used, and it is declared.** The backend's `CORS_ORIGINS` is
`http://localhost:1000,http://localhost:3000` and both ports were occupied by other agents, so the
browser's CORS check was turned off for port 3130. The flag prints a warning line in the run output
and is recorded as `crossOriginApiAllowed: true` in the results JSON. **A run that used it is not
evidence that CORS is configured**, and nothing here claims otherwise.

A second backend was briefly started on :1502 to avoid the flag; it was stopped within two minutes
when its `DATABASE_URL` — inherited from the backend repo `.env` rather than the running process —
proved not to be the scratch database. It never completed a session exchange. Only
`scratch_t30_browser` was written to in the end, by the one journey ticket.

---

## 4 · Bite proofs — both directions, hermetically, never in the shared tree

Both were run in a temp tree from `git archive HEAD` with `node_modules` symlinked. The shared working
tree was `git status --short` clean for every named file afterwards, checked each time.

**The ARIA gate.** Clean tree → **exit 0, 36/36**. Then seven defects planted in real product files,
one per class — an `aria-label` removed from `chat-bubble`, a `titleId` removed from the portal
section, `role="log"` → `role="logg"`, `<ul role="list">`, `tabIndex={7}`, `aria-labeledby`,
`aria-hidden` on a tabbable input → **exit 1, 8 failures**: all seven classes plus the by-route pin.
Defects removed → **exit 0, 36/36**.

**The focus fix.** Clean tree → **exit 0, 5/5**. The two primitive edits reverted (the epic-card
refactor left in place, so the failure is attributable to the primitive) → **exit 1, 2 failures**:
"leaves focus on the real control that opened it when it closes" and "does the same for a Dialog, not
just a Sheet". Restored → **exit 0, 5/5**.

---

## 5 · Gates

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **1** | **4 errors, none of them mine** — `features/chat/saved-messages-panel.tsx`, `features/chat/thread-message.tsx`, `hooks/api/chat-core-mutations-a.ts`, `hooks/api/chat-realtime.ts`. Green at 11:00 on this session's own commits; HEAD has moved since. Chat territory. |
| `npx eslint <24 changed files>` | **0** | 0 errors, 30 warnings — all pre-existing unused imports in `chat-bubble.tsx` (29) and `budget-matrix.tsx` (1) |
| `jest --runInBand --testPathPattern="(a11y\|contract\|dialog\|sheet\|overlay\|focus\|keyboard)"` | **0** | **54 suites · 602 tests** |
| `jest --testPathPattern="aria-semantics.contract"` | **0** | **36/36** |
| `jest --testPathPattern="menu-driven-sheet-focus"` | **0** | **5/5** |
| `node scripts/browser-journeys.mjs --self-test` | **0** | **48 passed** (was 39; 9 new, 3 of them bite proofs) |
| the full browser run, above | **1** | 63/63 steps · **1/1 writes** · 31 findings |
| `node scripts/check-over-300.mjs` | **0** | 518 of 5,298 (baseline 519) |
| `node scripts/check-no-unlabeled-icon-buttons.mjs` | **0** | 0 across 3,833 files |
| `node scripts/check-type-assertions.mjs` | **0** | 4,985 files, no new escape |
| `node scripts/check-seo-metadata.mjs` | **0** | 1,224 route files |

**Not run:** `pnpm lint` repo-wide, `next build`, every backend gate, `check:gated-reads`,
`check:web-vitals-budget`.

---

## 6 · Why each box is still open

**Box 2.** A-29 is closed — the corpus-wide screen-reader instrument exists, bites in seven ways, and
found and fixed 19 real defects; and a focus-restoration defect affecting every controlled dialog and
sheet in the product is fixed and pinned. **R-24 is unchanged**: 9 of 633 click targets remain
unreachable, 7 under `features/crm/**` and 2 in `app/(authenticated)/inventory/purchase-orders/page.tsx`,
all out of release scope. 624 of 633 is not 633 of 633, and beyond that, everything in §1.2 is still
unmeasured by anything. Ticking this on an exclusion plus a static scan would be the exact move this
release exists to stop.

**Box 5.** A-30 is closed — a write is driven through the UI, asserted across a reload, and confirmed
as a row in Postgres, and the run refuses to exit clean without it. **Two remainders:**

1. **One module has a write.** Build. HR, accounting, settings, calendar, workflows, knowledge and
   notifications are covered as *routes at three widths*, not as *flows with a mutation*. "Cover the
   main module flows" is not yet true, and saying it is would be the vacuity this release keeps
   finding. The mechanism is now generic — a write journey is a route, an `absent` check, a list of
   actions and a `present` check — so each additional one is bounded work, not new design.
2. **R-25 is unchanged and is not in this territory.** No frontend CI job boots the app;
   `.github/workflows/frontend.yml` has five jobs and none starts a server or a database. The run
   needs `--base-url` (both repos live) and `--cookie-file` (a minted session).

---

## 7 · Handed up

- **`hooks/api/chat-*` / `features/chat/**` — the frontend typecheck is red at HEAD** with 4 errors,
  none in this territory. Chat owner.
- **The `/dashboard` deferred fallback paints skeletons with no `aria-busy` and no live region.**
  A sighted user sees a loading state; a screen-reader user is told nothing. Ticket 27 / 28.
- **The `next dev` server on :3000 signs its users out.** Its `INTERNAL_API_SECRET` does not match the
  backend's, so `/api/auth/session` returns no `backendJwt` and `api-client.ts:202` signs out. Every
  server-side probe of it answers 200. Whoever owns that server, and anyone about to screenshot it.
- **`CORS_ORIGINS` names only ports 1000 and 3000**, both permanently occupied, so no agent can stand
  up its own frontend and reach the API without disabling the browser's CORS check. Adding a spare
  port to the backend's dev allowlist would remove that.
