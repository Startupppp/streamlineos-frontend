# Cross-cutting gaps

Gaps that block the same acceptance criterion on many pages at once. Recorded here **once** so the
per-page specs do not carry 74 copies of the same BLOCKED line.

A gap listed here is scoped **out** of the per-page criterion it would otherwise block. C3 may be
ticked on a page that satisfies every other C3 requirement. Do not re-open a page's box for a gap
recorded here — fix the gap, then delete its entry.

---

## CCG-1 — No optimistic concurrency anywhere in the backend

**Blocks:** the `Conflict` state in the **States** section, and the `If-Match` clause in the **API
and data contract** section, on **74 of the 83** page specs.

**Measured 2026-09-26.** `grep -riE "if-match|ifmatch|etag"` over `backend/src` returns **0 hits** —
not just in `modules/build`, but in the entire backend. No table carries a `version` column used as
an optimistic lock. Every `ConflictException` in `modules/build` is a *business* conflict (duplicate
state, a race on a uniqueness rule), not a version conflict.

So the spec text

> Conflict: show field-level server/current comparison for version conflicts.

has no backend fact to render. A frontend cannot display a version comparison when no endpoint
returns a version, and a test asserting the conflict state would have to fabricate the 409 — which
proves the mock, not the product.

**Scoped out per the product owner's decision (2026-09-26).** C3 closes on pages that satisfy every
other requirement. This entry is the single tracked record of the gap.

**What closing CCG-1 requires:**

1. A migration adding a version column to each versioned build table.
2. `If-Match` parsed and enforced on every versioned mutation, returning 409 with both the caller's
   and the server's field values.
3. A conflict surface that shows the field-level comparison, per the States section.
4. Contract tests on both halves — and the negative must be paired with a positive (FE-122), or the
   409 assertion passes because the control could never fire.

Until then, treat a 409 from a build endpoint as a **business** conflict. Handling one is not
evidence of conflict-state support.

---

## CCG-2 — C7 needs a production browser, and two of its six states are unreachable read-only

**Blocks:** C7 on all 83 specs.

C7 asks for "Production browser evidence ... **without modifying real data**". Production is the
intended target, not a workaround — an earlier framing of this as "no non-prod browser available"
was wrong and should not be reintroduced.

`ready`, `empty`, `filtered-empty` and `error` are measurable read-only. Two are not:

- **`denied`** — the operator's own account is an org admin and passes every gate. Stubbing
  `/me/access` to fake a denial makes the test prove the stub
  (see `control-gate-test-passes-because-the-control-cannot-render`).
- **`conflict`** — needs a rejected write, and is blocked by **CCG-1** regardless.

C7 therefore stays open on pages where all six states are required. Record the states actually
measured; do not tick the box from four of six.

**Orchestrator-only.** It needs a minted session bound to a real unrevoked `user_sessions` row and a
read-only production query. Lanes must not attempt it.

## CCG-3 — the acceptance specs are green but cover four of C6's six checks

Measured 2026-09-26, after the full serial Playwright drain: **all ten specs pass** — build-list 
28/28 governance-qa, 39/39 managed-products, 36/36 planning-surfaces, 9/9 settings, 9/9 teams-team,
plus content-intake, execution-core, org-work and portals.

Passing is not the same as covering. C6 names six checks, and the galleries currently exercise four:

| C6 check | Status |
|---|---|
| 375 px mobile | Covered by every spec |
| Screen-reader (roles, accessible names) | Covered by every spec |
| Reduced motion | Missing in `teams-team`, `content-intake`, `build-list-responsive` |
| Keyboard | **Missing entirely in `settings` and `planning-surfaces`** |
| High-density desktop | **Missing everywhere — all ten specs cap at 1280×800** |
| Secret redaction | Only `content-intake` asserts anything token-shaped |

So C6 is unmet on all 83 pages, and it is unmet for the *same* three reasons on nearly all of them.
Do not tick C6 because a spec is green; the spec does not yet ask two of the six questions.

Closing it is mechanical, not architectural:

1. Add a viewport above 1280 to each spec's viewport table. "High-density desktop" means both a wider
   viewport and `deviceScaleFactor` > 1 — a 1440/1920 run at scale 2 catches the layout break and the
   asset/measurement break, which a wider viewport alone does not.
2. Add a keyboard block to `settings` and `planning-surfaces`: `/` reaches the real search input,
   `Tab` order follows visual order, `Esc` closes an overlay.
3. Add the reduced-motion pair to the three specs missing it — **both halves**, because framer-motion
   12 animates through the Web Animations API, so assert the CSS-driven surface
   (`globals.css:700-708` disables `.skeleton-shimmer.animate-pulse`) with a `:visible` locator.
4. Assert redaction only where a secret exists — portal/public token surfaces. On an internal
   authenticated page there is no token to leak, and a test that asserts its absence proves nothing.

### Update 2026-09-26 — the four gaps above are written, none are browser-verified

Eight parallel lanes closed items 1–4 in source. Re-measured across all ten specs by counting the
constructs themselves, not by reading lane reports:

| C6 check | Before | Now |
|---|---|---|
| Reduced motion | 3 specs missing; `portals` had 1 unpaired | All ten carry a **paired** assertion |
| High-density desktop | Missing in all ten | All ten carry a `1920×1080 @ deviceScaleFactor 2` describe |
| Keyboard | Missing in `settings`, `planning-surfaces` | Present in nine; **absent in `teams-team`** |
| Secret redaction | `content-intake` only | `portals`, `settings`, `content-intake` |

**The table above this section is now stale and is kept only as the record of what was found.**

Three corrections to it, each of which made something read as covered when it was not:

- It listed `portals` as having reduced-motion coverage. `portals` did carry one `reducedMotion`
  block, but its body counted `.animate-spin` nodes in a test named "no animated spinner is visible
  **at rest**" — so the count was always 0 and the loop body never ran. The test could not fail.
  A reduced-motion assertion must be **paired**: the "reduce" half alone passes when the element is
  simply absent.
- `content-intake`'s three redaction assertions only checked absence from `el.textContent`, which a
  blank frame satisfies. Each is now paired with a positive assertion that the surface rendered.
- `teams-team-a11y.spec.ts:55` opens a describe named "team member list — **keyboard reachability**
  at 1280 px" whose two tests assert `[role="listitem"]` count and badge visibility. It presses no
  key and asserts no focus. The name claims the coverage; the body does not provide it. Root cause is
  the gallery: `team-home-gallery.tsx:45` hand-rolls the member row as a plain `div` with an Avatar,
  two spans and a `Badge` — nothing focusable — while the real `team-home-page.tsx:408-450` row
  carries a `MemberRoleSelect` and a `RemoveMemberButton` whenever `canManage`. The case also renders
  a `Focused: {name}` `aria-live` region behind a `focused !== null` branch that nothing can set.
  This is the [[gallery must mount the REAL component]] rule: a lookalike yields both false failures
  and false passes.

A separate finding that C6 cannot close in a spec: **`.animate-spin` has no `prefers-reduced-motion`
override in `globals.css`.** Overrides exist at lines 452, 590, 655, 700 and 750, but Tailwind 4's
spin keeps running for a user who asked for reduced motion. That is an FE-108 violation in shared
CSS, not a per-page defect, and it is filed rather than patched because it changes every module.

**None of this is browser-verified.** The drain quoted at the top of CCG-3 predates all of it, so the
pass counts above describe specs that no longer exist in that form. C6 stays unticked on all 83 pages
until a fresh serial drain, and the rule holds unchanged: do not tick C6 because a spec is green.

### Update 2026-09-26, later — the fresh drain ran. 261 passed, 5 failed, 0 skipped

Serial, one spec at a time, real browser. Raw output kept outside the repo at
`D:/agent-work/drain-2026-09-26/` so a peer `git add -A` cannot commit it.

| Spec | Result |
|---|---|
| build-list-responsive | 36 passed |
| content-intake-a11y | 27 passed |
| execution-core-a11y | 16 passed |
| governance-qa-a11y | **3 failed**, 31 passed |
| managed-products-a11y | 45 passed |
| org-work-a11y | 17 passed |
| planning-surfaces-a11y | 41 passed |
| portals-a11y | 20 passed |
| settings-a11y | **1 failed**, 15 passed |
| teams-team-a11y | **1 failed**, 13 passed |

**Zero skipped, which had to be checked before reading anything else.** The config omits
`BACKEND_JWT_SECRET` and `INTERNAL_API_SECRET` from `E2E_ENV`, and authenticated specs call
`hasBackendSecrets()` and **skip with a message rather than fail** — so a skip read as a pass would
have produced false ticks. All eleven design-system routes live under `app/(public)/design-system/`,
need no auth, and cannot skip for that reason. Confirmed in the output.

**The five failures are real, not flakes.** `retries: 0` locally, so each ran once and lost once.

- `governance-qa:231/243/255` — one root cause, three symptoms. The `risks-with-selection` case has
  no working selection state: Space leaves the select-all checkbox `unchecked`, and the
  `role="region"` named "Bulk actions" is **element(s) not found** for both the reveal test and the
  Escape test. Note the reveal test's negative half (`not.toBeVisible()` before selecting) *passed* —
  because the element does not exist at all. That is the vacuous-control trap in the wild: only the
  positive half had teeth, and it is the half that failed.
- `settings:137` — Tab from the search input does not reach the first view card name button;
  "Received: **inactive**", so the element exists and focus went elsewhere. The sibling test for
  intra-card order (Rename → Delete) passed, so it is the *entry* into the card that is wrong.
- `teams-team:74` — `locator.focus` timed out at 90 s, which means the locator never resolved, not
  that focus landed elsewhere. The combobox is almost certainly not in the DOM. This is the describe
  rewritten earlier the same day after it was found to press no keys; the rewrite mounts the real
  `MemberRoleSelect`/`RemoveMemberButton`, and those render only when `canManage`.

### The finding that matters more than the five failures

**A green spec is not evidence for the pages in its lane, and now there are numbers.** Counting
describes rather than reading lane reports:

| Spec | Pages in its lane | Tests | Keyboard | Screen-reader |
|---|---|---|---|---|
| build-list-responsive | — | 36 | **absent** | **absent** |
| org-work-a11y | 9 | 17 | templates only | — |
| execution-core-a11y | 10 | 16 | ticket detail only | **absent** |
| settings-a11y | 15 | 16 | saved views only | views case only |

`build-list-responsive` is the largest green spec in the suite and asks **three** of C6's five
questions — it has no keyboard describe and no ARIA describe at all. `org-work-a11y`'s top-level
describe is named "Templates surfaces"; it covers templates, not the other eight LANE-1 pages.

So the earlier update's "all ten carry a paired assertion / a high-density describe / keyboard in
nine" was true **per spec** and says nothing **per page**. A lane's gallery mounting one surface
cannot close C6 on the other eight pages that share its spec.

C6 therefore stays unticked on all 83 pages, now for a measured reason rather than an unverified one.
The unit of evidence is a (page × check) pair, not a spec exit code. Ten agents hold one gallery each
and are writing that matrix; tick from the matrix plus a green re-drain, never from either alone.

Two traps already paid for on this criterion, both of which made a spec prove less than it read:
`getByRole(..., { name })` is a case-insensitive **substring** match, so `{ name: "ID" }` also matched
"Decided" and needed `exact: true` at all 22 call sites; and a `getByText` for a stat label matched
the identically-worded status badge beside it, which needs scoping to `[data-slot="stat-card-grid"]`
rather than `.first()`.

---

## CCG-4 — C3's keyboard clause is templated, and on most pages it names shortcuts with no target

**Blocks:** C3 on the pages where the named shortcuts have nothing to act on.

**Measured 2026-09-26.** Two variants of the keyboard line exist across the 83 specs, and the count
is the finding:

| Variant | Pages |
|---|---|
| ``` `/` search, `c` create in current scope, `j/k` move, `Enter` open, `e` edit, `Esc` close/clear, `?` shortcut help ``` | **74** |
| ``` `Tab` follows visual order, `Enter` activates the focused primary action, `Esc` closes overlays, and `/` focuses search only when search exists ``` | **9** |

The 74 are byte-identical to each other. They are stated as absolutes on pages that have no list to
move through, no search box to focus and nothing to create — `10-project-settings-retention.md` is a
per-project singleton form and carries the same seven shortcuts as `10-inbox.md`.

The 9 are the public/portal pages, and they carry the clause the 74 are missing: **"only when search
exists"**. The same document already knows how to write this conditionally.

The spec is internally inconsistent in the same way one line higher up. The bulk-actions line *is*
conditional on all 74 — "only where a real repeated operation exists", "Child collections support
selection only when a real repeated operation exists" — so the authors applied a reachability
condition to bulk actions and not to keyboard.

**Why this blocks C3 rather than merely annoying:** C3 reads "Every core field, action, overlay, query
parameter, bulk action, shortcut, state, and permission above is implemented and tested." Read
literally, a read-only notification inbox must implement `c` create and `e` edit, and a retention
settings form must implement `j/k` move. Implementing them means inventing a target, which is worse
than leaving them out — it puts a keystroke on a page that does something arbitrary. Four lanes
independently reported the same blocker this session, on `10-inbox.md`, `10-command-center.md`,
`10-project.md`, `10-project-issues.md` and `10-project-workload.md`.

**What is genuinely implemented**, so this is not a story about missing work: `use-build-list-keyboard.ts`
handles `/`, `c`, `j/k`, `Enter`, `e`, `Esc` and `?`, and `features/build/shared/shortcut-help-dialog.tsx`
is a reusable `?` surface. The hook is wired where the page has targets. The gap is between the spec's
absolute phrasing and the pages where a target cannot exist.

**Recommended resolution — not yet applied, it needs the product owner.** Import the conditional
phrasing the 9 public pages already use into the other 74, so a shortcut is required exactly where its
target exists and `Tab` order plus `Esc` are required everywhere. That is not a scope reduction: it
adopts the stricter, better-specified variant already present in this document, and it keeps every
shortcut demanded on every page that has a list, a search box or a create action.

Until that is decided, do **not** tick C3 on a page whose only outstanding items are targetless
shortcuts, and do **not** invent a target to close the box. Record which items are targetless in the
page's lane status doc so the decision can be applied mechanically afterwards.

### Decision applied 2026-09-26 — the conditional phrasing is now in all 74 specs

The product owner chose to adopt the conditional variant. All 74 keyboard lines were rewritten to:

> `Tab` follows visual order and `Esc` closes overlays or clears selection, on every page. Where the
> page has the target: `/` focuses search, `c` creates in current scope, `j/k` moves through the list,
> `Enter` opens the focused row, `e` edits it, `?` opens shortcut help. A shortcut whose target does
> not exist on this page is not required — see CCG-4.

`Tab` order and `Esc` are now unconditional on every page, which the old absolute list did not
actually require. So this is stricter in one respect and narrower in six.

**What this does not excuse.** "No target" means the page has no list, no search input and no create
action — not that wiring one would be effort. A page with a `DataTable` has a list; a page with
`SearchInput` has a search box. Check the component, not the lane report.

---

## CCG-5 is NOT a gap — "Offline state" is already implemented, and two lanes reported otherwise

**Do not file an offline cross-cutting gap.** Two lanes this session reported the `Offline` state as
"PWA-level infrastructure not implemented anywhere in the build module", and one of them rested a C3
verdict on it. **Both were wrong.**

`hooks/common/use-online-status.ts:22` exports `useOnlineStatus(): boolean`. It is consumed by at
least eight build pages — `all-work-page.tsx:29,64`, `approvals-inbox-page.tsx`, `inbox-list.tsx`,
`my-work-content.tsx`, `teams-list-page.tsx`, `build-templates-page.tsx`, `project-board-content.tsx` —
and two suites exist for it specifically: `my-work/my-work-page-offline.test.tsx` and
`inbox/inbox-offline-and-chat-gap.test.tsx`. `all-work-page.tsx:278` renders `title="You are offline"`.

So the offline state has a working pattern in this repo and roughly a lane's worth of precedent. A
page missing it has ordinary unfinished work, not a blocked dependency, and C3 stays open there until
the hook is wired and tested.

This entry exists because "it is not implemented anywhere" is the most expensive kind of wrong
report: it converts a twenty-minute task into a permanent exemption. Verify an absence claim by
grepping for the hook before repeating it.

---

## CCG-6 — C3 says "everything above", and for 74 pages "above" is the same boilerplate

**Affects:** the core-field, action and overlay clauses of C3 on **74 of 83** pages.

C3 reads: "Every core field, action, overlay, query parameter, bulk action, shortcut, state, and
permission **above** is implemented and tested." Measured 2026-09-26, "above" is largely not about
the page:

| Spec section | Distinct versions across 83 pages |
|---|---|
| `## Elements and interactions` (whole block) | **2** — one shared by 74 pages, one by 9 |
| `- Keyboard:` line | 2 — see CCG-4, now resolved |
| `- **Core fields:**` line | 13 pages share the settings parent's section list |

Every one of these five lines appears on exactly the same 74 pages, byte-identical:

- `Title/breadcrumb: clickable ancestors…`
- `Search: debounced, keyboard focused with '/'…`
- `Rows/cards: single click selects/opens preview…`
- `Inline edits: status, priority, assignee, dates, estimate, and labels…`
- `Non-interactive: explanatory copy, historical audit events…`

So `10-project-settings-retention.md` — a per-project singleton form with three field rows and no
list — is specified as having rows and cards, right-click row menus, and inline edits of status,
priority, assignee, dates, estimate and labels. It has none of those and should have none.

The same artifact hits the core-fields line inside the settings family. These 13 files all declare
`Core fields: general, access, workflow, views, fields, iterations, automations, integrations,
portal, agents, retention` — which is the **parent** page's list of settings sections:

`10-project-settings.md`, `-access`, `-agents`, `-agents-credentials`, `-fields`, `-integrations`,
`-iterations`, `-portal`, `-retention`, `-views`, `10-settings-access.md`, `10-settings-client-access.md`,
`10-settings-integrations.md`

It is correct on the parent and wrong on the other twelve: the fields page's core fields are custom
fields, not "retention".

Note which sections are genuinely per-page and therefore load-bearing: **Route decision**, **Product
contract**, **Above-the-fold text wireframe**, **URL state**, **States**, **Permissions**,
**Components**, **API and data contract**, and **Gaps**. The URL-state line in particular is authored
per page — `10-inbox.md` names `view, unread, type, projectId, q, cursor` while
`10-project-settings-retention.md` names `section and search`. Those are real requirements and this
entry does not touch them.

**Recommended resolution — needs the product owner, not yet applied.** Read C3's core-field, action
and overlay clauses against the page's **own** sections (the nine listed above), and treat the shared
`Elements and interactions` block as module-wide UX policy rather than a per-page inventory. It is
still binding wherever the page has the surface: a page with a `DataTable` must honour the rows/cards
and inline-edit rules; a page with `SearchInput` must honour the search rule.

**What this must not become.** "The spec is boilerplate" is not a licence to tick. Four lanes this
session correctly left C3 open on genuine, page-specific gaps found in the load-bearing sections —
`activity` with no project-level endpoint, `lastRunAt`/`lastFailureAt` absent from
`project_automations`, `wins`/`risks`/`next`/`citations` absent from `updateRowSchema`, `capacity`
absent from `teamDetailSchema`. None of those are boilerplate and none are excused here.

Until this is decided, evaluate C3 from the load-bearing sections, and record in the lane status doc
which items were judged boilerplate so the decision can be applied mechanically afterwards.

### Decision applied 2026-09-26 — judge C3 from the per-page sections

The product owner chose the recommended reading. **C3's core-field, action and overlay clauses are
evaluated against the page's own nine load-bearing sections**, and the shared `Elements and
interactions` block is module-wide UX policy — binding wherever the page has the surface it describes,
and silent where it does not.

The 74 shared blocks and the 12 wrong core-field lines are **left in place deliberately**, so this
entry stays the single record of why they are not read as a per-page inventory. Do not delete them and
do not rewrite them page by page; that was considered and rejected as 74 sections of authoring before
any box could move.

The bar does not drop. A gap found in a load-bearing section still blocks C3, and the same owner
separately authorised building the backend work behind those gaps rather than documenting it — so
`activity`, `capacity`, `lastRunAt`/`lastFailureAt`, `wins`/`risks`/`next`/`citations`, the webhook
PATCH route and the bulk verbs are being implemented, not excused.
