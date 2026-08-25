# Architecture review — the candidate PRDs

Two rounds. **c1–c9** came from the review of **2026-08-23** (scope: org- and module-level RBAC, billing, chat, calendar, notifications, inbox, knowledge base / wiki, chatbot) and are **all closed**. **c10–c18** come from the four-pass review of **2026-08-25**, which went deeper on query cost, schema, deletion and reliability.

## Round one — c1–c9, closed

Verified at source 2026-08-25. Every one shipped; the status lines inside those files predate the work and are kept for history.

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | `isPageIndexable` is lifecycle-only now — no visibility rule at index time |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | `calendar_source_preferences` table + service; per-person toggles persist |
| [c3](c3-one-representation-of-capability.md) | One representation of capability | Flat array gone, `usePermissions` removed, `useScope` has a production consumer |
| [c4](c4-module-availability-interface.md) | One interface for module availability | One `isCoreModuleKey`; the four remaining stubs are all test fixtures |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Adapter + `adapters/`, zero provider calls in `BillingService`, import-boundary spec |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | `help-centre/` and `wiki/` split; no dual frontend directories |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | `ChatMessageFanoutService` behind `MessageFanout` |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | 28 of 29 retired; 11 hydration boundaries, 5 prefetch modules |
| [c9](c9-transactional-outbox-decision.md) | Decide what the outbox is for | Wired — 6 consumers register via `InboxConsumer`, flush is cron-guarded |

## Round two — c10–c18

| # | Candidate | What it fixes | Wave |
|---|---|---|---|
| [c10](c10-module-role-standing.md) | Make module standing answerable | A module owner cannot list their own module's members | 3 |
| [c11](c11-read-cost-budgets.md) | Read-cost budgets in CI | The one instrument that proves a query is fast guards 2 of 3,385 routes | 1 |
| [c12](c12-text-search-id-probe.md) | Route search through the id probe | Global search bypasses the indexes built for it — 5 parallel seq scans per keystroke | 0 |
| [c13](c13-one-list-contract.md) | One contract for every list | A ticket past #100 cannot be opened at all — deep links silently fail | 0 |
| [c14](c14-set-based-sweeps.md) | Sweeps operate on sets | Leave accrual: 5,000 reads and 2,500 transactions per org, per month | 1 |
| [c15](c15-outbound-io-leaves-the-request.md) | Outbound I/O leaves the transaction | Every request holds a transaction; three providers have no timeout | 0 |
| [c16](c16-schema-says-what-it-means.md) | The schema says what it means | Two person tables, naive calendar timestamps, write-only recurrence | 2 |
| [c17](c17-billing-writes-are-provable.md) | Every billing write is provable | Paid-not-credited, inert coupon guards, quota fails open | 0 |
| [c18](c18-removals-are-proved.md) | Removals are proved, not grepped | A route scan was wrong by three orders of magnitude | 2 |

## The verdict, unchanged across four passes

**The architecture does not need replacing.** Zero import cycles in both repos. Zero unused frontend files across 4,429. The backend's only 11 unused files are a deliberate, spec-guarded arrangement. CI rebuilds the database from empty. The RBAC model as originally envisioned — org owner/admin/member, module owner/admin/member, per-permission grants, cross-org membership — is **substantially already built**, and the ladder is structural and stored rather than a naming convention.

What the fourth pass found was not systemic decay. It was **four concentrated problems and one structural gap**: the instrument that proves a query is fast exists and is pointed at two queries.

## Suggested order

**Wave 0 — stops a loss or fixes a live bug.**

1. **c17's webhook and guards** — a customer can pay and not be credited; a single-use coupon is unlimited; quota fails open. Each is small and each is currently losing money.
2. **c15's timeouts** — three providers with no deadline, inside a transaction that spans the request. One line each, and it is a pool-exhaustion fix rather than a politeness one.
3. **c13's ticket-by-key** — the only correctness bug found in the review. Tickets past the hundredth cannot be opened; deep links, notification links and shared URLs fail.
4. **c12's search routing** — the highest-traffic query in the product, currently five parallel sequential scans. The pattern is already written and proven in `leads-read`.

**Wave 1 — stops recurrence.**

5. **c11's read budgets** — the highest-leverage item in the review. Every finding above was found by a person reading source; none of it needed to be.
6. **c14's leave accrual** — background work fails quietly and multiplies by tenant count.

**Wave 2 — mechanical, parallelisable.**

7. **c13's remaining items**, **c16's four schema defects**, **c18's consolidations**.

**Wave 3 — the read side.**

8. **c10** — module standing. A gap in the product, not a defect in the model.

## Reading these

- **No file path or line number is load-bearing.** They were accurate on 2026-08-25 and cited as evidence, not instruction. Re-read at source.
- **Each spec's "Already shipped" section is as important as its "To build".** Round one's main failure mode was re-specifying work that had landed.
- **Numbers in these specs are measured, not estimated.** Where a number was corrected mid-review, the correction is recorded rather than the original quietly replaced.
- **Static analysis produces candidates, not conclusions.** Three scans in this review were wrong in the same direction — a route join off by three orders of magnitude, an N+1 count of 155 that was really 57, an unbounded-read count of 588 that was really about 85. All three were caught by classifying rather than counting. c18 records the standard.
- **Deliberately not raised**, because they are recorded decisions or already-disproved claims: the frontend permission-key subset (intentional and tested), downgrade not revoking an enabled module, table splitting by width, key-type unification, migrating all naive timestamps, wrapping every `ilike()` call site, and `PermissionGuard` not being global. Do not re-raise them.
