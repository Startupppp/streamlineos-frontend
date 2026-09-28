# Browser-verification exclusions

**Decided by the owner, 2026-09-27.** The boxes listed here stay unchecked. They are not
forgotten, not deferred pending someone's attention, and not blocked on a decision. They require
a human driving a real browser against a deployed environment, and that is deliberately out of
scope for the remediation programme.

This file exists so the unchecked count in `docs/build-module/**` can be read honestly: a reader
seeing 202 unchecked boxes outside `tickets/` should know that 170 of them are this, and 32 are
real remaining work.

## The counts

Re-measured 2026-09-28 by classifying every `- [ ]` line outside `docs/build-module/tickets/`.
The 2026-09-27 figures are superseded: the total outside `tickets/` was 250 and is now 202,
because 48 boxes were earned in between. The browser-excluded classes barely moved, which is the
point of separating them — they cannot be earned by the work that closed the other 48.

| class | boxes |
|---|---|
| Keyboard, screen-reader, reduced-motion, 375 px and high-density desktop checks | 86 |
| Production browser evidence for ready / empty / filtered-empty / error / denied / conflict | 80 |
| Browser-dependent boxes outside the two standard texts, listed below | 4 |
| **Excluded total** | **170** |
| Not browser work — real remaining scope, excluded from this note | 32 |
| **Total unchecked outside `tickets/`** | **202** |

Reproduce the three classes with `grep -rc "^\s*- \[ \]"` filtered on the box texts quoted below.
The 32 split as 15 copies of the "implemented and tested" box and 17 design, decision and
measurement boxes.

### The 4 browser-dependent boxes outside the two standard texts

| file | box | why it needs a browser |
|---|---|---|
| `01-ia-navigation.md` | Collapsed, mobile, keyboard and screen-reader navigation expose equivalent names and badges | jsdom reports no collapsed width and no real screen-reader output |
| `04-shared-components.md` | Shared modules own loading, error, empty, denied, focus and responsive mechanics | four of the six are gate-checkable; `focus` and `responsive` are not observable from any gate in this repo |
| `05-performance-caching.md` | Production skeletons resolve to ready, empty, denied or error within a measured budget | needs a real paint timeline against a deployed environment, not a jsdom render |
| `RELEASE-STATUS.md` | Authenticated desktop and mobile browser matrices pass for the full Build route census | a browser matrix is the box |

Two of the four are partly settleable without a browser and say so in their own entries; they are
counted here in full because neither can be *ticked* without the browser half.

## The two box texts this is almost entirely made of

Nearly every `10-*.md` page specification ends with the same three-box acceptance block. Two of
the three are excluded here, verbatim:

> - [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
> - [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

The third box in that block is **not** excluded:

> - [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

That one is ordinary implementation work. It is unchecked because it is unfinished, not because
it needs a browser. Do not read this file as covering it.

## Why a Playwright run would not settle them

This is the part worth knowing before anyone proposes automating the exclusion away.

1. **The capture stack is gone.** The harness these page specs were written against no longer
   exists in the repository.
2. **The e2e suite skips rather than fails when there is no backend.** A run with no API reachable
   reports green by skipping, so "the browser checks pass" would be produced by a suite that never
   loaded a page. That is worse than an unchecked box, because it reads as evidence.
3. **jsdom cannot see three of the classes at all.** Focus order, real focus trapping, and
   `prefers-reduced-motion` behaviour are not observable in jsdom, so a component test asserting
   them asserts nothing. Neither is actual layout at 375 px.
4. **"Without modifying real data" is the hard half.** Every configured connection string in this
   repository points at production, and an e2e suite on this codebase has already sent real email
   to real people. Production browser evidence gathered carelessly is a production incident, not a
   tick.

So earning these needs a deployed non-production environment with its own database and its own
mail sink — which does not exist here — plus a person to drive it. Until that exists, the only
honest state for these boxes is unchecked.

## Separately excluded: the peer-owned wiki pages

`10-project-wiki.md` and `10-project-wiki-page.md` hold **10 unchecked boxes** between them. They
are excluded for a different reason: a concurrent session owns the Knowledge Base workstream,
including `frontend/features/wiki/**`, and those two documents describe its surfaces. They are
not this programme's to tick. 6 of the 10 are ordinary implementation boxes and 4 are the browser
block above.

## What this note does not cover

The 32 non-browser boxes outside `tickets/` are real scope. The largest concentrations:

| boxes | file | character |
|---|---|---|
| 10 | `lanes/status/LANE-5-STATUS.md` | a previous programme's status file; mixed |
| 4 | `05-performance-caching.md` | measurement work needing a load environment |
| 3 each | `99-kill-list.md`, `04-shared-components.md` | route retirement decisions; shared-module ownership |
| 2 each | `02-schemas.md`, `03-api-contracts.md`, `99-open-questions.md`, `RELEASE-STATUS.md`, `performance-followup/cache-policy.md` | design-document completeness, owner decisions, deploy and cache measurement |
| 1 | `01-ia-navigation.md` | counted above as browser-dependent |
| 1 | `lanes/status/LANE-5-STATUS.md` | a previous programme's status file |
| 1 each | 13 `10-*.md` page docs | the "every core field … implemented and tested" box |

Re-derived 2026-09-28. `00-overview.md` is no longer listed because its 6 boxes are now earned,
and the `10-*.md` tail is 13 files rather than 27 for the same reason — so this table shrank
because the work landed, not because it was reclassified. Four of the rows above are the
browser-dependent boxes itemised in the counts section and are not additional scope.

The remaining `10-*.md` boxes are whole-page completeness claims that can only be answered once
the page's implementation tickets land, so they are correctly last rather than skipped.

## How to retire this note

Delete it, and tick the boxes, when a non-production deployed environment with its own database
exists and someone has driven the checks in a real browser. Do not retire it by asserting the
boxes from a source audit or a component test — a source audit is not browser evidence, and that
substitution is the specific thing these boxes were written to prevent.
