# 02 — Capability checks inside services stop reading the request object

**What to build:** The five service-level capability checks — the HR calendar's admin, travel and interview visibility, the KB access service's admin check, and the KB page-review visibility check — ask the access service instead of reading a flat array off the request. Each one drops the hand-written org-owner prefix, because the seam answers correctly for owners on its own.

Behaviour must not change for anyone. This is the *migrate* step: the old array still exists, so every batch stays green.

**Blocked by:** 01 — One function answers whether a person holds a permission.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] An org owner who holds no explicit grant sees all KB page reviews, manages all KB spaces, and sees HR travel and interviews — **without any call site checking for ownership**.
- [ ] A non-owner sees exactly what they saw before this ticket, on all five checks.
- [ ] No call site reads the flat permission array any more.
- [ ] Where a check could use the data scope rather than a yes/no, it does.
- [ ] The KB helpers that become asynchronous have callers that already await, or are made to.
- [ ] Existing specs for these helpers are rewritten against the seam, and each gains the owner case it cannot express today.
- [ ] Backend suite green.

## Todo

- [ ] Migrate one check first and confirm the owner case now passes with the ownership prefix removed
- [ ] Repeat for the remaining four
- [ ] Grep for any other reader of the flat array before declaring the set complete — the five are what a source read found, not a guarantee
- [ ] Rewrite the affected specs against the seam rather than adjusting fixtures to keep old assertions alive
- [ ] Confirm no behaviour change for a non-owner by running the existing suites before and after
- [ ] Boot the API and open a KB review list as a non-owner and as an owner
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
