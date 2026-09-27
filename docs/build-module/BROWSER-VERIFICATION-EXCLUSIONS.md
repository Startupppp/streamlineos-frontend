# Browser-verification exclusions

**Decided by the owner, 2026-09-27.** The boxes listed here stay unchecked. They are not
forgotten, not deferred pending someone's attention, and not blocked on a decision. They require
a human driving a real browser against a deployed environment, and that is deliberately out of
scope for the remediation programme.

This file exists so the unchecked count in `docs/build-module/**` can be read honestly: a reader
seeing 250 unchecked boxes outside `tickets/` should know that 168 of them are this, and 82 are
real remaining work.

## The counts

Measured 2026-09-27 by classifying every `- [ ]` line outside `docs/build-module/tickets/`.

| class | boxes | files |
|---|---|---|
| Keyboard, screen-reader, reduced-motion, 375 px and high-density desktop checks | 87 | 78 |
| Production browser evidence for ready / empty / filtered-empty / error / denied / conflict | 80 | 76 |
| Narrow-viewport layout, stated separately from the combined check above | 1 | 1 |
| **Excluded total** | **168** | **~80** |
| Not browser work — real remaining scope, excluded from this note | 82 | 36 |
| **Total unchecked outside `tickets/`** | **250** | |

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

The 82 non-browser boxes outside `tickets/` are real scope. The largest concentrations:

| boxes | file | character |
|---|---|---|
| 10 | `lanes/status/LANE-5-STATUS.md` | a previous programme's status file; mixed |
| 8 | `05-performance-caching.md` | measurement work needing a load environment |
| 6 | `00-overview.md` | programme-level completeness assertions |
| 5 each | `01-ia-navigation.md`, `02-schemas.md`, `03-api-contracts.md` | design-document completeness |
| 4 | `99-kill-list.md` | route retirement decisions |
| 3 | `04-shared-components.md`, `99-open-questions.md` | |
| 1 each | 27 `10-*.md` page docs | the "every core field … implemented and tested" box |

Several of these are whole-page completeness claims that can only be answered once the page's
implementation tickets land, so they are correctly last rather than skipped.

## How to retire this note

Delete it, and tick the boxes, when a non-production deployed environment with its own database
exists and someone has driven the checks in a real browser. Do not retire it by asserting the
boxes from a source audit or a component test — a source audit is not browser evidence, and that
substitution is the specific thing these boxes were written to prevent.
