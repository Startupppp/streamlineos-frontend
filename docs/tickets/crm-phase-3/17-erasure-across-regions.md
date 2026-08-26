# 17 — Erasure across every region and generation

**Status:** not started
**Track:** E — compliance
**Blocked by:** 08, 10

## Why

A right that only works in one region is not a right.

## Acceptance criteria

- [ ] An erasure request **enumerates every configured region**, asserted against a registry with three entries rather than one.
- [ ] Each region records what was deleted or anonymised, with a timestamp.
- [ ] Backup generations are covered by stated policy and schedule, and **the policy is on the record** so the customer can be told when the last copy expires.
- [ ] The request completes within the statutory window, and the window is tracked.
- [ ] Erasure is one of the enumerated exceptions to the platform's soft-delete default.
