# 57 — The change-request number counter becomes a module whose concurrency is testable

**What to build:** Two people raising a change request at the same moment get different numbers, and there is a test that proves it. The allocation — an advisory lock plus the current maximum plus one — is welded into a 54-line method that also does access checks, field mapping and audit, and that method is the module's only transactional write. It has zero references across all 243 Build specs. There is no seam between "allocate the next number under a lock" and "insert a change request", which is *why* it cannot be tested.

Extract the counter as a module whose interface is next-number-for-this-project given a transaction, and the concurrency property becomes provable with a double that actually runs its callback.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Audit correction (2026-09-27):** Number allocation exists in both
`client-portal.service.ts:40` and `change-requests.service.ts:182`; cover both creators.

- [ ] Keep the transaction lock through allocation and insertion on both internal and portal creation paths; prove real concurrent uniqueness in an isolated database test, not merely a mocked lock call
<!-- 2026-09-27: Lock is kept on both paths (nextChangeRequestNumber is called inside the existing tx.transaction wrapper in both services). Real isolated database test not written — no non-production database is available. Mock proves lock order and concurrent invocation, not full PG serialization. -->

- [x] The counter is a module with a single entry point taking the transaction, organisation and project — `change-request-number-counter.ts` exports a single function `nextChangeRequestNumber(tx, orgId, projectId)` (2026-09-27)
- [x] Its interface states that it must be called inside a transaction and that it serialises per project — JSDoc in the module states this (2026-09-27)
- [x] A test proves two concurrent allocations produce different numbers, using a double that runs its callback — `change-request-number-counter.spec.ts` test 1 uses invoking doubles for tx.select (2026-09-27)
- [x] A test proves the lock is taken before the maximum is read — `change-request-number-counter.spec.ts` test 2 asserts callOrder = ["lock", "max"] (2026-09-27)
- [x] Creating a change request behaves exactly as before, including its numbering — both service files updated to call `nextChangeRequestNumber`; crNumber: nextNumber unchanged (2026-09-27)
- [x] No database connection is opened to prove any of this — spec uses only mock tx objects (2026-09-27)
