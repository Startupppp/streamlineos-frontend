# 03 — The confirmed dead controller is removed

**What to build:** The one endpoint group with no caller and no log traffic is deleted, proved rather than assumed.

**Blocked by:** 01 — The standard of proof is written down

**Status:** ready-for-agent — BLOCKED on c18-01 (retention marker + frontend cycle CI not done)

**Audit note (2026-08-26):** c18-01 is partially done but two items remain open. No implementation has started here. The specific controller has not been identified in this ticket — that identification requires access-log analysis which is part of the prerequisite work for c18-01. All criteria require the standard to be fully written before proceeding; the access-log confirmation step is the first gate.

## Acceptance criteria

- [ ] Deletion is justified by the recorded standard, with the evidence stated. — **BLOCKED:** c18-01 not closed; the access-log window and the controller name are not yet documented here.
- [ ] The application builds and boots and serves a request afterwards. — **BLOCKED:** c18-01 not closed.
- [ ] No existing test is rewritten to accommodate the deletion — a test failing because something was removed is the signal. — **BLOCKED:** c18-01 not closed.
- [ ] The deletion is its own commit. — **BLOCKED:** c18-01 not closed.

## Todo

- [ ] Confirm by access log over a stated window — **BLOCKED:** c18-01 not closed.
- [ ] Boot the app afterwards; a missing side-effect import survives a build and fails at runtime — **BLOCKED:** c18-01 not closed.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED:** c18-01 not closed.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
