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

Two traps already paid for on this criterion, both of which made a spec prove less than it read:
`getByRole(..., { name })` is a case-insensitive **substring** match, so `{ name: "ID" }` also matched
"Decided" and needed `exact: true` at all 22 call sites; and a `getByText` for a stat label matched
the identically-worded status badge beside it, which needs scoping to `[data-slot="stat-card-grid"]`
rather than `.first()`.
