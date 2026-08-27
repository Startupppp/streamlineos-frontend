# 04 — A quota that cannot be computed refuses the write

**What to build:** A plan limit holds even when the database is struggling. Today the counter catches everything and returns zero for every limit key, so a blip during a spike lifts every plan limit at once — exactly when it matters most.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] A count that cannot be computed refuses the limited write and says why. — `plan-limits.service.ts:85-93` (`readCount` throws on a missing row, a NULL/absent column and a non-numeric value) and `:271-272` (`assertWithinLimit` converts it to a `ServiceUnavailableException` naming the resource: "The knowledge base pages count could not be determined."). All fourteen `fetchCount` branches read through it (`:333-411`).
- [x] With the count query throwing, the write is refused rather than allowed. — `plan-limits.service.spec.ts:268-308` ("refuses when the count query throws", plus no-rows / null column / absent column / non-numeric / non-members-key, and `:330-341` proves a paid tier is refused too). Before the fix five of those six returned `used = 0` and allowed the write.
- [x] The failure is reported rather than swallowed. — `plan-limits.service.ts:271` (`logger.error` carries `orgId`, `key` and the cause) and `:248`; asserted in `plan-limits.service.spec.ts:317-328`, which reads the logged text rather than trusting the call.
- [x] A customer can still see what they have consumed against their plan. — `plan-limits.service.ts:190-224` (`getEntitlements` → `fetchAllCounts`) returns `limits[key].used` unchanged when the counts are computable; `plan-limits.service.spec.ts:373-388` asserts members/kbPages/projects used-vs-limit, and `:390-421` asserts the same call refuses instead of reporting zero usage when the query throws, a column is missing, or no row returns.

## Todo

- [x] Remove the catch that returns zeroed counts — `plan-limits.service.ts:245-249`: the fourteen `Number(row[key] ?? 0)` reads and the `Number(rows[0]?.["count"] ?? 0)` in every `fetchCount` branch are gone; the remaining catch converts the failure into a refusal instead of a zero.
- [x] Test the failure path explicitly — the current behaviour is the inverse — `plan-limits.service.spec.ts:254-421`, 15 new tests. 7 of them failed against the pre-fix source (`refuses when the count query returns no rows`, `… column is null`, `… column is absent`, `… is not a number`, `… every limited resource`, `… paid plan`, and the missing-column entitlements case) and pass after it.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Note (2026-08-27):** the `catch (err) { return zeroes }` the ticket describes had already been narrowed by commit `564be864` ("wave 0 — quota fails closed"), which made a *thrown* count fail closed. What survived was the same defect one layer down: an empty result set, a NULL column, an absent column or a non-numeric value still became `0`, and `0 + 1 > limit` is false for every plan. A count query that returns no rows is exactly what a struggling database does, so the ticket's scenario was still live — a happy-path test passed throughout.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
