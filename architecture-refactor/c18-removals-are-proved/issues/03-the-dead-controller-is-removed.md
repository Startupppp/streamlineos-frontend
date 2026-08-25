# 03 — The confirmed dead controller is removed

**What to build:** The one endpoint group with no caller and no log traffic is deleted, proved rather than assumed.

**Blocked by:** 01 — The standard of proof is written down

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Deletion is justified by the recorded standard, with the evidence stated.
- [ ] The application builds and boots and serves a request afterwards.
- [ ] No existing test is rewritten to accommodate the deletion — a test failing because something was removed is the signal.
- [ ] The deletion is its own commit.

## Todo

- [ ] Confirm by access log over a stated window
- [ ] Boot the app afterwards; a missing side-effect import survives a build and fails at runtime
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
