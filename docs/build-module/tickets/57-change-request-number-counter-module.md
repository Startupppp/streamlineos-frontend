# 57 — The change-request number counter becomes a module whose concurrency is testable

**What to build:** Two people raising a change request at the same moment get different numbers, and there is a test that proves it. The allocation — an advisory lock plus the current maximum plus one — is welded into a 54-line method that also does access checks, field mapping and audit, and that method is the module's only transactional write. It has zero references across all 243 Build specs. There is no seam between "allocate the next number under a lock" and "insert a change request", which is *why* it cannot be tested.

Extract the counter as a module whose interface is next-number-for-this-project given a transaction, and the concurrency property becomes provable with a double that actually runs its callback.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Audit correction (2026-09-27):** Number allocation exists in both
`client-portal.service.ts:40` and `change-requests.service.ts:182`; cover both creators.

- [ ] Keep the transaction lock through allocation and insertion on both internal and portal creation paths; prove real concurrent uniqueness in an isolated database test, not merely a mocked lock call
<!-- 2026-09-27: Lock is held on both paths — `change-requests.service.ts:182-183` calls nextChangeRequestNumber inside `this.db.transaction(async (tx) => {})` before the INSERT; `client-portal.service.ts:34-35` does the same. Nothing between allocation and INSERT can commit early or escape the transaction. Real isolated database test not written — no non-production database is available. A real test would assert: two concurrent requests against the same projectId in separate transactions each receive a different crNumber, with no gap, no duplicate, and neither number appearing before its transaction commits. The existing spec (`change-request-number-counter.spec.ts`, 2/2 pass) proves lock order and concurrent invocation with mock transaction doubles — not full PG advisory-lock serialization. `as any` in the spec was replaced with `as unknown as TenantTx` to satisfy the hard-zero rule (2026-09-27). -->

- [x] The counter is a module with a single entry point taking the transaction, organisation and project — `change-request-number-counter.ts` exports a single function `nextChangeRequestNumber(tx, orgId, projectId)` (2026-09-27)
- [x] Its interface states that it must be called inside a transaction and that it serialises per project — JSDoc in the module states this (2026-09-27)
- [x] A test proves two concurrent allocations produce different numbers, using a double that runs its callback — `change-request-number-counter.spec.ts` test 1 uses invoking doubles for tx.select (2026-09-27)
- [x] A test proves the lock is taken before the maximum is read — `change-request-number-counter.spec.ts` test 2 asserts callOrder = ["lock", "max"] (2026-09-27)
- [x] Creating a change request behaves exactly as before, including its numbering — both service files updated to call `nextChangeRequestNumber`; crNumber: nextNumber unchanged (2026-09-27)
- [x] No database connection is opened to prove any of this — spec uses only mock tx objects (2026-09-27)
