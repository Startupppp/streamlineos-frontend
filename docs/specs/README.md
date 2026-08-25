# Architecture review — the candidate PRDs

Two rounds. **c1–c9** came from the review of **2026-08-23** (scope: org- and module-level RBAC, billing, chat, calendar, notifications, inbox, knowledge base / wiki, chatbot) and are **all closed**. **c10–c24** come from the four-pass review of **2026-08-25** and cover every finding in it.

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

## Round two — c10–c24

| # | Candidate | What it fixes | Wave |
|---|---|---|---|
| [c10](c10-module-role-standing.md) | Make module standing answerable | A module owner cannot list their own module's members | 3 |
| [c11](c11-read-cost-budgets.md) | Read-cost budgets in CI | The instrument that proves a query is fast guards 2 of 3,385 routes | 1 |
| [c12](c12-text-search-id-probe.md) | Route search through the id probe | Global search bypasses the indexes built for it — 5 seq scans per keystroke | 0 |
| [c13](c13-one-list-contract.md) | One contract for every list | A ticket past #100 cannot be opened at all — deep links silently fail | 0 |
| [c14](c14-set-based-sweeps.md) | Sweeps operate on sets | Leave accrual: 5,000 reads and 2,500 transactions per org, per month | 1 |
| [c15](c15-outbound-io-leaves-the-request.md) | Outbound I/O leaves the transaction | Every request holds a transaction; three providers have no timeout | 0 |
| [c16](c16-schema-says-what-it-means.md) | The schema says what it means | Two person tables, naive calendar timestamps, write-only recurrence | 2 |
| [c17](c17-billing-writes-are-provable.md) | Every billing write is provable | Paid-not-credited, inert coupon guards, quota fails open | 0 |
| [c18](c18-removals-are-proved.md) | Removals are proved, not grepped | A route scan was wrong by three orders of magnitude | 2 |
| [c19](c19-cache-keys-cannot-be-unsafe.md) | Cache keys cannot be unsafe | Post a journal entry and your books are wrong for 5 minutes | 0 |
| [c20](c20-failures-are-visible.md) | A failure in production is visible | Zero error tracking; ten known failures swallowed silently | 0 |
| [c21](c21-fanout-retention-and-polling.md) | Fan-out, retention and polling | A 50k announcement times out; polling alone is ~22,000 req/s | 1 |
| [c22](c22-scheduled-work-and-deploy-safety.md) | Scheduled work runs once | No cron lock — a retry duplicates emails; every deploy sheds requests | 1 |
| [c23](c23-tenant-extensibility-without-migrations.md) | Tenants extend without a deploy | 306 taxonomies frozen in enums; custom-field values unindexed | 2 |
| [c24](c24-frontend-consistency-and-access.md) | The design system is the only way | 487 icon-only buttons, 78 labelled — the clearest accessibility debt | 2 |

## Coverage map — every report section

| Report section | Specs |
|---|---|
| Verdict · Corrections · Appendix · Process notes | This README's preamble and each spec's *Already shipped* section |
| Your vision (org + module RBAC) | c10 |
| Deletion & consolidation ledger | c18 |
| Schema architecture (S1–S4) | c16 (person, calendar, invoices, audit) · c23 (enums, custom fields, HR proportion, junk drawer) |
| Track A — data model, keys, timestamps, partitioning, RBAC, coverage tools | c16 · c10 · c11 |
| Track B — query cost, pagination, **caching**, API surface, **abstractions**, **observability** | c11 · c12 · c13 · c14 · **c19** · c18 · **c20** |
| Track C — billing, chat/inbox/notifications, calendar, KB/wiki/chatbot | c17 · **c21** · c16 · (KB verified sound — no spec) |
| Query efficiency (the deep pass) | c11 · c12 · c13 · c14 · c15 · c16 |
| Split / combine | c13 |
| Reliability — timeouts, **cron locks**, **shutdown**, **races** | c15 · **c22** |
| Frontend — speed, SEO, structure, UI/UX, accessibility | c13 (ticket detail) · c8 (closed) · **c24** |
| Security & compliance | Folded into the owning seam: c15 (timeouts, SSRF, Swagger, TURN) · c17 (webhook signatures, entitlement) · c10 (standing, grant ceilings) · c19 (cache tenancy) · c20 (scrubbing) |

## The verdict, unchanged across four passes

**The architecture does not need replacing.** Zero import cycles in both repos. Zero unused frontend files across 4,429. Zero arbitrary colour classes across 591k lines. Zero `useEffect` firing an API call. The backend's only 11 unused files are a deliberate, spec-guarded arrangement. CI rebuilds the database from empty. The RBAC model as originally envisioned — org owner/admin/member, module owner/admin/member, per-permission grants, cross-org membership — is **substantially already built**.

What the fourth pass found was not systemic decay. It was **concentrated problems and two structural gaps**: the instrument that proves a query is fast is pointed at two queries, and nothing reports a failure in production.

## Suggested order

**Wave 0 — stops a loss, fixes a live bug, or makes the rest observable.**

1. **c20's error tracking** — an afternoon, and it surfaces every other Wave 0 item as it happens. Do it first so the rest is verifiable.
2. **c17's webhook and guards** — a customer can pay and not be credited; a single-use coupon is unlimited; quota fails open.
3. **c19's journal-post invalidation** — one line; without it the books are wrong for five minutes after every entry.
4. **c15's timeouts** — three providers with no deadline inside a request-wide transaction. A pool-exhaustion fix, not a politeness one.
5. **c13's ticket-by-key** — the only correctness bug in the review. Tickets past the hundredth cannot be opened.
6. **c12's search routing** — the highest-traffic query in the product, currently five parallel sequential scans.

**Wave 1 — stops recurrence, or removes the largest costs.**

7. **c11's read budgets** — every finding above was found by a person reading source; none of it needed to be.
8. **c21's polling suppression** — ~22,000 req/s at 50k sessions, over half from one four-second widget.
9. **c22's cron lease and readiness flip** — ten lines and an ordering change.
10. **c14's leave accrual** — background work fails quietly and multiplies by tenant count.

**Wave 2 — mechanical, parallelisable.**

11. **c19's remaining invalidation matrix**, **c13's remaining items**, **c16's schema defects**, **c18's consolidations**, **c23's taxonomy propagation**, **c24's accessibility triage**.

**Wave 3 — the read side.**

12. **c10** — module standing. A gap in the product, not a defect in the model.

## Reading these

- **No file path or line number is load-bearing.** They were accurate on 2026-08-25 and cited as evidence, not instruction. Re-read at source.
- **Each spec's "Already shipped" section is as important as its "To build".** Round one's main failure mode was re-specifying work that had landed.
- **Numbers are measured, not estimated.** Where one was corrected mid-review, the correction is recorded rather than the original quietly replaced.
- **Static analysis produces candidates, not conclusions.** Three scans in this review were wrong in the same direction — a route join off by three orders of magnitude, 155 N+1 loops that were 57, 588 unbounded reads that were ~85. All three were caught by classifying rather than counting. c18 records the standard.
- **Several sections are verified KEEPs with no spec, deliberately**: the knowledge base and chatbot retrieval design, frontend error-boundary resilience, the realtime capability model, the cache primitive itself, and the three already-serialized write paths. They are recorded inside the relevant spec's *Already shipped* section so they are not re-audited.
- **Deliberately not raised**, because they are recorded decisions or already-disproved claims: the frontend permission-key subset (intentional and tested), downgrade not revoking an enabled module, table splitting by width, key-type unification, migrating all naive timestamps, wrapping every `ilike()` call site, `PermissionGuard` not being global, and full APM/tracing. Do not re-raise them.
