# 16 — Vertical implementation roadmap

Status: Planned

Each slice produces a user-visible outcome across UI, command/query interface, schema if needed, permission, cache, events, tests, browser proof, and operational evidence. Detailed product priority remains in [delivery roadmap](../delivery/09-delivery-roadmap-release-gates-and-positioning.md).

Before a slice starts, map it to one or more packages in [the architecture work-package registry](./18-architecture-work-package-registry.md) and claim the primary package in [WORK-CLAIMS.md](./WORK-CLAIMS.md). Slices describe user outcomes; packages control architecture ownership. A slice may depend on several packages, but two active agents may not own the same primary seam.

**Start-order clarification:** Slice 0 repairs the legacy-path execution-plan and route-census gates and reconciles generated Build contracts. The [2026-10-02 audit](../audit/comprehensive-recheck-2026-10-02.md#final-start-readiness-gate-sample) is a pre-repair snapshot; the current branch passes the repaired execution-plan, route-census, Build contract and OpenAPI freshness gates. These are source/contract checks, not browser, database, deployment or release proof. `ARCH-01-MODULE-ACCESS` is the technical prerequisite for invitation acceptance, even though the customer-visible research priority is invite acceptance → automatic Build assignment → client grant activation. Implement the authority before adapting the invite caller, then verify these outcomes in that priority order. Do not create missing legacy Markdown solely to placate the old gate.

| Slice | User-visible outcome | Main files/seams | Data/interfaces | Verification and definition of done |
|---|---|---|---|---|
| 0. Contract baseline | Agents implement from one registry without drift | this pack, `CONTEXT.md`, route/nav/query/permission registries, architecture ownership and work claims | no schema | Link/registry/source census passes; no missing master prompt, duplicate requirement ID, conflicting active claim, or unowned primary seam. |
| 1. Invite acceptance | Invited internal user lands in the intended org/module safely | onboarding UI, invitation controller/module access | invitation idempotency and membership/module assignment | new/existing/wrong-email/expired/replay/concurrent acceptance in DB and browser. |
| 2. Module access assignment | Org Member sees Build only after explicit assignment | access UI, Build member/project access seams | membership/access cache version | owner/admin/member negative matrix and immediate revocation. |
| 3. Client grant activation | Client receives usable scoped portal access | client portal UI/services | grant revision/capabilities/token | atomic activate, expired/revoked/wrong-project, signed files, browser magic link. |
| 4. Three-step onboarding | Owner activates one or many modules with few inputs | org setup routes/features; module adapters | durable setup session, preview, activation idempotency | all six journeys, resume/retry, five-control Build path, invited People batch. |
| 5. Projects destination | Users can find/create/import projects from one page | Planned `/build/projects`, nav catalog, project/import seams | project projection/import job | empty/populated/filter/mobile; create/import/retry/plan/access. |
| 6. Ticket command parity | Every Ticket mutation has identical rules/effects | `apply-ticket-change.ts` and adapters/hooks | CAS/idempotency/audit/outbox/cache | UI/bulk/import/AI/automation parity, conflicts, WIP, tenant and browser. |
| 7. My Work/Inbox consolidation | Assigned work, drafts, and attention are focused | My Work/Inbox screens/query keys | attention projection | counts and records authorized; Back/pane/mobile/offline; old aliases redirect. |
| 8. Intake and Triage | Feedback/bugs become governed requests and Tickets | Intake/Triage/Feedbucket adapters | explicit legacy mapping and conversion idempotency | submission-detail mapping, duplicate/accept/decline/convert, client visibility. |
| 9. Product discovery chain | PM traces evidence to outcome | managed products/roadmap/goals/Tickets | evidence/opportunity/score/outcome links | score source/override, roadmap-to-delivery, post-release outcome proof. |
| 10. Command Center | Each user has a safe customizable command view | dashboard UI/query module | dashboard/layout versions and batch query | 24-widget layout, 12 batch, partial errors, permission, restore/conflict/mobile. |
| 11. Cross-module delivery loop | Client/time/invoice/calendar/file actions retain context | owning-module adapters/deep links | versioned projections/reference links | unavailable/stale/revoked, correct return, no duplicate ledgers. |
| 12. Quality/release/reporting | Delivery has QA, release, risk, capacity, and outcome proof | quality/report screens/services | immutable evidence/projections | target DB, bounded query plans, browser/report/export equivalence. |
| 13. Governed automation/AI | Users automate and use fewer screens without bypass | automation runner, Ask OS tools/actions | proposal/idempotency/run history | tool visibility, confirmation, replay, token/cost, permissions, loop/rate guard. |
| 14. Scale and launch | Product is operable for solo to large tenants | admission/cache/jobs/telemetry/deploy | indexes, retention, archival | load, cache outage, worker lag/DLQ, backup/restore, rollback, release gates. |

## Slice file checklist

Each implementation ticket names exact existing files after a fresh inventory, proposed files with responsibilities, migration and rollback, endpoint/DTO, permission key, query keys, invalidation, events/jobs, tests by evidence level, browser actors/data/actions, observability, risks, and ledger IDs. A slice is not done while its compatibility adapter has no removal condition or its verification relies only on source/tests.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Record the dependency-ordered slice plan and per-slice file/evidence template; the [work-package registry](18-architecture-work-package-registry.md) maps the 16 architecture decisions and 26 product areas at source revision `a5b8347fb`.
- [x] Revalidate Slice 0 gates on the current branch and attach exact outputs, environment, source revision, and remaining failures to [work claims](WORK-CLAIMS.md).
- [x] Complete invite acceptance, module assignment, and client grant activation in that order, with atomic persistence, negative access checks, and browser journeys.
- [x] For each later slice, claim exact files and interfaces, implement one vertical path, verify negative then happy cases, and update the [requirement ledger](REQUIREMENT-LEDGER.md).
- [x] Keep scale and launch open until target database, cache/job, rollback, role/tenant browser, and deployment evidence is recorded.
