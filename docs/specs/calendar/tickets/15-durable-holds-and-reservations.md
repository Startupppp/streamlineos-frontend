# 15: Create durable slot holds and reservation constraints

**What to build:** Temporarily and durably claim people or resource capacity while a booking or poll is being finalized.

**Blocked by:** 13: Build privacy-safe availability and diagnostics.

**Status:** accepted

- [x] Holds have owner/session identity, rule version, constrained targets, expiry, fencing/version token, and idempotency identity.
- [x] Expired, cancelled, abandoned, or crashed holds release capacity safely.
- [x] Concurrent attempts cannot both hold or reserve the same indivisible capacity.
- [x] Retrying the same request returns the same hold rather than consuming more capacity.
- [x] Real-persistence race tests cover expiry during confirmation, worker crash, duplicate submit, and last-unit capacity.

