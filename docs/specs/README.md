# Architecture review 2026-08-23 — nine candidate PRDs

**Implementation status re-audited at source on 2026-08-26.** The scoped c1–c9 seams are implemented and focused tests pass, but the PRDs remain because not every acceptance criterion has 100% production evidence yet. CRM, Inventory, and HRMS ticket work is excluded by direction.

Live c6/c9 report summaries are recorded in [`runtime-evidence-2026-08-26.md`](runtime-evidence-2026-08-26.md).

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | Implemented: lifecycle-only indexing, bounded resumable backfill with explicit apply guard, seeded direct/keyword/vector parity coverage, and denial-of-wallet tests; one text-bearing page still needs the guarded backfill and live seeded artifact remains unavailable |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | Implemented: granular source adapters, production registration coverage, preference-isolation coverage; controller e2e exists (all routes 401 without token); RBAC 403 tests for `GET /calendar/events/:id/rsvp` (`calendar:read`) and `GET /calendar/export` (`calendar:events:export`) absent from e2e; live HTTP persistence remains environment-level |
| c3 | One representation of capability | Closed — see git history; `AccessService.holds`/`scopeFor` seam live, `CurrentUserContext.permissions` deleted, all five call sites migrated, hydration contract in the authenticated layout, `usePermissions()` deleted, CRM leads carries the first `useScope` consumer — verified at source 2026-08-26 |
| c4 | One interface for module availability | Closed — see git history. `common/rbac/module-availability.ts` is the single decision function; `EntitlementsService.buildModuleAvailabilityResolver()` is the canonical assembly used by all four callers; parity and assembly-guard tests verified at source 2026-08-27. |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Implemented: configured-provider resolver, billing isolation, provider-neutral webhook normalization, neutral headers, and legacy Razorpay delegation through the provider seam; provider delivery/replay evidence remains operational |
| c6 | Split the two products inside `kb/` | Closed — see git history. `features/help-centre/` and `features/wiki/` confirmed; import boundary test, `GET /kb/article-migration/preview`, CLI, and namespace decision all verified. One article remained convertible at 2026-08-26 runtime; the conversion tool is permanent by design (article creation is a live intake) and the spec required tooling+policy, not zero backlog. |
| c7 | Chat send path as a fan-out module | Closed — see git history. Standing limit: the ledger forwards a stable idempotency key to Ably and records the crash window via `uncertainRetryCount`, but provider-side de-duplication (exactly-once) cannot be verified without live Ably traffic |
| c8 | Frontend server-data seam | Closed — see git history. Every locally-verifiable criterion is met (authenticated adapter, scope-keyed prefetch factories, access hydration at layout, five route ordering+hydration suites, public Help Centre isolation, verifier script); a deployed-session HTML capture proving real rows in the first response is a standing operational limit, not unfinished work. |
| c9 | Decide what the outbox is for | Closed — see git history. Two-ledger decision recorded; relay fully wired (lease, retry, dead-letter, fencing); fault-injection tests confirmed for retry/dead-letter/fencing/inbox-dedupe/malformed-chat/effect-replay; migration `0474` deployed; 44-tenant evidence captured. Six pending rows are operational state (read-only evidence run; requires cron secret + operator authority to flush). Provider-side exactly-once remains an external operational gate, not a local gap. |

## The successor program

The four-pass review of **2026-08-25** produced fifteen further candidates (c10–c24) and 72 tickets. They live together in **[`architecture-refactor/`](../../architecture-refactor/README.md)** at the repository root — PRD and tickets side by side per candidate — so that program stays separate from the rest of `docs/`.

## Reading these

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence, not instruction.
- Candidates the review deliberately did not raise — downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions, plaintext invite tokens, serial primary keys, unpartitioned chat — are recorded decisions or already-disproved claims. Do not re-raise them.
