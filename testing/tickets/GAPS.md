# QA Backlog — Adversarial Gap Report

> Original audit: 2026-07-24. **Gap-fill pass:** 2026-07-24b (structure + missing executable tickets).  
> **Mobile coverage pass:** 2026-07-24c — dedicated Mobile milestone + mandatory checklist section.  
> **Verdict after fill:** inventory + executable tickets largely present; **product testing still ~0% executed** (only M0 tracker/MCP hygiene done).

## Verdict summary

| Question | Answer |
|----------|--------|
| Can we claim all screens/flows/test cases are done? | **NO** (execution not started) |
| Route inventory for scoped modules | **Complete** (dups/mis-scopes fixed) |
| Mobile responsive coverage | **Complete in backlog** — every in-scope `page.tsx` has a `QA-MOB-P-*` ticket; checklist Mobile section is mandatory |
| Executable ticket gaps from audit | **Closed** in backlog (see Fixed below) |
| Testing executed | **~1%** tickets done (MCP/docs only) |
| Defects filed | **0** |
| Classification | **backlog-gap-fill-complete · mobile-track-added · execution-pending** |

Dashboard: see `testing/QA_BACKLOG.md`.  
Mobile track: `testing/tickets/m-mobile-responsive.md`.

---

## Fixed in backlog (2026-07-24b)

| Gap | Resolution |
|-----|------------|
| Duplicate `/projects/inbox` | `QA-M1-P-016` **cancelled** → canonical `QA-M3-P-013` |
| Accounting invoices under Subscription | `QA-M2-SUB-003..005` → type `deferred`, module Accounting (out of M2) |
| Redirect routes as full audits | `QA-M2-SUB-006/007` → `redirect-smoke`, Est S |
| Platform Role=`admin` | `QA-M2-PL-*` Role=`platform-admin` |
| Per-type approval journeys | **Added** `QA-M1-J-030..037` |
| Approval edge soft-close | **Hardened** AC on `J-010`, `J-026..029` |
| Chat search | **Added** `QA-M3-J-013` |
| Calendar recurrence | **Added** `QA-M3-J-014` (verify or document unsupported — hooks expose `recurringRule`, calendar UI/backend usage not found) |
| Billing upgrade/promo/profile | **Added** `QA-M2-J-017..019` |
| API idempotency | **Added** `QA-M1-A-007/008`, `QA-M2-A-003` |
| Page-audit rigor | **Added** `testing/tickets/PAGE_AUDIT_CHECKLIST.md`; page AC references it |
| Inbox ACL / surface split | **Added** `QA-M3-J-015`, `J-016` |
| Calendar many-sources perf | **Added** `QA-M3-J-017` |
| Client portal file matrix | **Added** `QA-M1-J-038` |
| People profile update | **Added** `QA-M2-J-020` |
| Webhook permission-change | **Added** `QA-M2-J-021` |
| M4 security/perf | **Added** `QA-M4-008`, `QA-M4-009` |

---

## Fixed in backlog (2026-07-24c — mobile)

| Gap | Resolution |
|-----|------------|
| Mobile treated as optional “spot-check” | **Removed** — `PAGE_AUDIT_CHECKLIST.md` now has mandatory **Mobile responsive** section (375 / 768 / 1280, no page H-scroll, Drawer/FAB/chat chrome, safe-area) |
| Page-audit AC soft on viewport | M1/M2/M3 page + redirect tickets require **mandatory** 375/768/1280 pass referencing the checklist |
| Mobile progress buried in page audits | **Added** `testing/tickets/m-mobile-responsive.md`: 3 epics · 4 journeys · **one mobile ticket per page route** (`QA-MOB-P-*`) · zero missing in-scope routes after inventory |
| Public client portal routes | Mobile tickets for `/intake/[projectId]` and `/board/[shareToken]` |

**Cleared:** any prior “mobile missing / optional” backlog gap. Mobile execution remains 0% until tickets are run.

---

## Remaining true gaps (not backlog inventoriable)

These are **execution / process** gaps, not missing ticket rows:

| Gap | Why it remains |
|-----|----------------|
| Zero product QA evidence | Journeys/pages still `todo`; no HARs/screenshots |
| Empty `testing/tickets/defects/` | No defects filed yet |
| Role×action spreadsheet artifact | `QA-M0-007` still todo (ticket exists) |
| Org Alpha/Beta seeds | `QA-M0-003/004` still todo |
| StreamlineOS status drift for M0-010/012 | Local `done`, mirror may still show `TODO` until statuses moved |
| Idempotency product support | Tickets exist; backend may lack `Idempotency-Key` — expect FAIL→feature-gap when executed |
| Calendar recurrence product support | Ticket exists to document unsupported if UI/backend absent |

---

## Honest answer

**Backlog structure/coverage gaps from the adversarial audit are closed, including mandatory mobile trackability.**  
**You still cannot claim screens/flows (or mobile) are tested** until M0 seeds finish and journeys (starting `QA-M1-J-025`) plus `QA-MOB-*` produce evidence.
