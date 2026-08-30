# 03 — The confirmed dead controller is removed

**What to build:** The one endpoint group with no caller and no log traffic is deleted, proved rather than assumed.

**Blocked by:** 01 — done

**Status:** BLOCKED on the operator — no access log exists, and this candidate's own standard forbids deleting an endpoint without one

**Correction (2026-08-26).** Every box below previously read `**BLOCKED:** c18-01 not closed`. That dependency is gone — c18-01's two remaining criteria (the retention marker at `db/schema/hrms-phase1-sql-managed.ts:1-10`, the frontend cycle CI step at `frontend/.github/workflows/ci.yml:40-42`) both landed and were verified at source. The ticket is still blocked, but by something else, and the old text hid it: **there is no access log to consult.** Nothing in this program has been deployed or booted.

That is not a technicality here. The standard c18-01 records says an endpoint is dead **only** when access logs show no calls over a stated window, and the PRD lists "acting on static route analysis without log confirmation" under **Out of Scope**. Deleting a controller on static evidence would violate the rule this candidate exists to establish — on the same codebase where a static join called a third of the API dead.

**One dead handler was found and removed, and it is not this ticket.** c18-02's collision scan proved `StorageVaultController.remove` unreachable by *routing order* — a stronger proof than an access log, since a shadowed route cannot be called at all. That was a handler inside a live controller, so it closes nothing here. No whole controller has been shown dead by any means.

## Acceptance criteria

- [ ] Deletion is justified by the recorded standard, with the evidence stated. — **BLOCKED:** the standard requires access logs over a stated window; no deployment, no logs. The controller has still not been identified, and the PRD never names it.
- [ ] The application builds and boots and serves a request afterwards. — **BLOCKED:** nothing to delete yet. Note the build half is available today (`nest build` exits 0); the boot-and-serve half needs a running environment, which no ticket in this program has had.
- [ ] No existing test is rewritten to accommodate the deletion — a test failing because something was removed is the signal. — **BLOCKED:** nothing to delete yet.
- [ ] The deletion is its own commit. — **BLOCKED:** nothing to delete yet.

## Todo

- [ ] Confirm by access log over a stated window — **BLOCKED on the operator.** This is the whole ticket. Until a deployment produces a log, every other box is unreachable.
- [ ] Boot the app afterwards; a missing side-effect import survives a build and fails at runtime — **BLOCKED:** needs a running environment.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED.**

## What an operator needs to do to unblock this

Deploy, then query the access log for routes with zero calls over a stated window — two weeks is the shortest window that survives a monthly-cadence feature. Cross-reference the result against `backend/src/app-route-uniqueness.spec.ts`'s enumeration (3,523 declared routes) to get the candidate set. Static analysis narrows that set; it may not decide it.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
