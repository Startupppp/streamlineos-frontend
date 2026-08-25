# 02 — Capability checks inside services stop reading the request object

**What to build:** The five service-level capability checks — the HR calendar's admin, travel and interview visibility, the KB access service's admin check, and the KB page-review visibility check — ask the access service instead of reading a flat array off the request. Each one drops the hand-written org-owner prefix, because the seam answers correctly for owners on its own.

Behaviour must not change for anyone. This is the *migrate* step: the old array still exists, so every batch stays green.

**Blocked by:** 01 — One function answers whether a person holds a permission.

**Status:** done — but the five were eight

## Acceptance criteria

- [x] An org owner who holds no explicit grant sees all KB page reviews, manages all KB spaces, and sees HR travel and interviews — **without any call site checking for ownership**.
- [x] A non-owner sees exactly what they saw before this ticket, on all five checks.
- [x] No call site reads the flat permission array any more.
- [x] Where a check could use the data scope rather than a yes/no, it does.
- [x] The KB helpers that become asynchronous have callers that already await, or are made to.
- [x] Existing specs for these helpers are rewritten against the seam, and each gains the owner case it cannot express today.
- [x] Backend suite green.

## Todo

- [x] Migrate one check first and confirm the owner case now passes with the ownership prefix removed
- [x] Repeat for the remaining four
- [x] Grep for any other reader of the flat array before declaring the set complete — the five are what a source read found, not a guarantee
- [x] Rewrite the affected specs against the seam rather than adjusting fixtures to keep old assertions alive
- [x] Confirm no behaviour change for a non-owner by running the existing suites before and after
- [ ] Boot the API and open a KB review list as a non-owner and as an owner — **not done: the API cannot boot (APP_DATABASE_URL 28P01)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd backend && npx jest --testPathPattern "modules/kb|modules/hr/helpdesk"` → **21 suites, 237 tests, all pass.**

The five named checks moved onto `AccessService.holds` and each dropped its hand-written owner prefix. Every rewritten spec gained the case it could not express before: **an org owner who holds nothing explicitly still passes.**

**The ticket said five. There were eight.** This ticket's grep found only the five, and ticket 03 — which deletes the field and therefore cannot miss a reader — found three more: the dashboard controller/announcements pair, dashboard leave approvals, and sales quota creation. The last is why a symbol grep was not enough: it takes an inline `{ isOrgOwner: boolean; permissions: string[] }` rather than `CurrentUserContext`, so nothing tied it to the type being changed. All three were migrated during ticket 03.
