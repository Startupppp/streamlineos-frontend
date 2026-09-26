# 57 — The change-request number counter becomes a module whose concurrency is testable

**What to build:** Two people raising a change request at the same moment get different numbers, and there is a test that proves it. The allocation — an advisory lock plus the current maximum plus one — is welded into a 54-line method that also does access checks, field mapping and audit, and that method is the module's only transactional write. It has zero references across all 243 Build specs. There is no seam between "allocate the next number under a lock" and "insert a change request", which is *why* it cannot be tested.

Extract the counter as a module whose interface is next-number-for-this-project given a transaction, and the concurrency property becomes provable with a double that actually runs its callback.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The counter is a module with a single entry point taking the transaction, organisation and project
- [ ] Its interface states that it must be called inside a transaction and that it serialises per project
- [ ] A test proves two concurrent allocations produce different numbers, using a double that runs its callback
- [ ] A test proves the lock is taken before the maximum is read
- [ ] Creating a change request behaves exactly as before, including its numbering
- [ ] No database connection is opened to prove any of this
