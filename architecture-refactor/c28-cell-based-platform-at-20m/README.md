# c28 — Cell-based platform at 20M

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**32 tickets, 0 closed.** Not started. This is a proposed target architecture, not a repair of a broken one — the PRD's own verdict is that the current implementation is sound *inside one cell* and has not yet proved it can serve 20 million users.

The release rule is in the PRD and is the whole point of the ticket set: the architecture may be called **20M-ready** only when Phase 0 is complete, at least two cells are operating, relocation and recovery have been exercised, and the acceptance workload passes with published headroom. Until then the accurate statement is that the design has a credible horizontal path and the implementation has not proved the capacity.

## What grounding the PRD against the repository changed

Four facts, verified 2026-08-28, that shaped the tickets rather than being restated from the PRD:

- **The HR destination tables already exist.** `hr_people`, `hr_employments`, `hr_employee_sensitive_fields`, `hr_effective_dated_changes`, `hr_reporting_lines` and `organization_people` are all declared, and `common/hr/sync-canonical-employment-fields.ts` already dual-writes three fields. So mistake #1 is a *migrate-the-readers* job, not a design job — and it is the one genuine **wide refactor** here. `designation` appears in 90 backend and 64 frontend files, `employeeId` in 78 and 52. Tickets 09–14 are its expand–contract sequence.
- **The membership composite anchor already exists.** `organization_members` carries `unique("uniq_org_members_org_id").on(orgId, id)`, and `user_delegation_permissions` is already composite against its parent. The parent edges are not: `agent_tokens.userId` and `user_delegations.delegator_id`/`delegatee_id` still reference `users.id`.
- **The region seam is a KEEP and the tickets deepen it.** `RegionRegistry.regionForOrg` already fails closed in both directions, and `withTenant` resolves the regional connection inside itself so a caller cannot forget. Ticket 20 turns a region string into a placement record; it does not build a second registry, which the PRD's mistake #19 explicitly warns against.
- **Four production sites fabricate `isOrgOwner: true`** — two in payroll payout, one in the git integration, one inside `module-standing.ts`. The rest of the hits are specs. Ticket 02 is that list.

## Tickets

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` can start immediately.

The **S** column is the execution session that owns the ticket. The split was chosen so that **every blocking edge is inside one session**: S1–S5 can run fully in parallel, and S6 is the only one sequenced after another (S3). Session briefs are in [`sessions/`](sessions/README.md).

### Prefactor

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 01 | S1 | [The request knows which membership it is](issues/01-the-request-knows-its-membership.md) | — | ready-for-agent |
| 02 | S1 | [A principal declares what kind of thing it is](issues/02-a-principal-declares-what-it-is.md) | 01 | ready-for-agent |

### Phase 0 — authorization

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 03 | S1 | [A permission snapshot cannot outlive its grant](issues/03-a-snapshot-cannot-outlive-its-grant.md) | 01 | ready-for-agent |
| 04 | S1 | [Delegations and module overrides are keyed to the membership](issues/04-delegations-and-overrides-are-membership-keyed.md) | 01 | ready-for-agent |
| 05 | S1 | [A machine credential is membership-keyed and bounded by a ceiling](issues/05-a-machine-credential-has-a-ceiling.md) | 02, 04 | ready-for-agent |
| 06 | S1 | [Removing a membership removes everything derived from it](issues/06-removing-a-membership-removes-its-authority.md) | 04, 05 | ready-for-agent |
| 07 | S1 | [Owner-only operations are enumerated, not implied](issues/07-owner-only-operations-are-enumerated.md) | — | ready-for-agent |
| 08 | S1 | [A module transfer records its initiator and its expected current owner separately](issues/08-a-module-transfer-records-both-parties.md) | 07 | ready-for-agent |

### Phase 0 — the users table (expand → migrate → contract)

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 09 | S2 | [Employment truth is backfilled into the organization-owned tables](issues/09-employment-truth-is-backfilled.md) | — | ready-for-agent |
| 10 | S2 | [One accessor dual-reads employment, and shouts when the two disagree](issues/10-one-accessor-dual-reads-employment.md) | 09 | ready-for-agent |
| 11 | S2 | [HR, directory and onboarding read the accessor](issues/11-hr-directory-and-onboarding-read-the-accessor.md) | 10 | ready-for-agent |
| 12 | S2 | [Payroll, finance and compensation read the accessor](issues/12-payroll-and-finance-read-the-accessor.md) | 10 | ready-for-agent |
| 13 | S2 | [The remaining readers migrate](issues/13-the-last-readers-migrate.md) | 10 | ready-for-agent |
| 14 | S2 | [`users` holds authentication identity only](issues/14-users-holds-authentication-only.md) | 11, 12, 13 | ready-for-agent |

### Phase 0 — carried work and client contracts

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 15 | S4 | [Every open item in `OPEN-FINDINGS.md` is closed or carries a dated reason](issues/15-the-open-findings-are-closed.md) | — | ready-for-agent |
| 16 | S4 | [Every latency seam is instrumented and alerted below its SLO budget](issues/16-latency-seams-are-alerted-below-slo.md) | — | ready-for-agent |
| 17 | S5 | [The query key carries the tenant](issues/17-the-query-key-carries-the-tenant.md) | — | ready-for-agent |
| 18 | S5 | [The API surface is versioned and its contract is generated in CI](issues/18-the-api-surface-is-versioned.md) | — | ready-for-agent |
| 19 | S5 | [Every module is registered through one versioned manifest](issues/19-every-module-has-one-manifest.md) | — | ready-for-agent |

### Phase 1 — placement without moving data

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 20 | S3 | [Placement is a record, not a column](issues/20-placement-is-a-record.md) | — | ready-for-agent |
| 21 | S3 | [A signed placement cache survives a control-plane outage](issues/21-placement-survives-a-control-plane-outage.md) | 20 | ready-for-agent |
| 22 | S3 | [Every write carries its placement version and dies without the fence](issues/22-a-write-carries-its-placement-version.md) | 20 | ready-for-agent |
| 23 | S3 | [No organization-owned query bypasses placement](issues/23-no-query-bypasses-placement.md) | 20 | ready-for-agent |
| 24 | S3 | [An organization switch is revalidated in the target cell](issues/24-an-org-switch-is-revalidated-in-the-target-cell.md) | 20 | ready-for-agent |
| 25 | S3 | [Creating an organization is an idempotent, resumable saga](issues/25-creating-an-org-is-a-resumable-saga.md) | 20 | ready-for-agent |

### Phases 2–4 — cells

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 26 | S6 | [A second cell exists and is proved from cold](issues/26-a-second-cell-is-proved-cold.md) | 20–25 | ready-for-agent · needs infrastructure |
| 27 | S6 | [A cell has a measured capacity budget and an admission threshold](issues/27-a-cell-has-a-capacity-budget.md) | 26 | ready-for-agent · needs infrastructure |
| 28 | S6 | [An organization moves between cells, and can roll back until the flip](issues/28-an-organization-moves-between-cells.md) | 22, 26 | ready-for-agent · needs infrastructure |
| 29 | S6 | [Placement is automated and a noisy neighbour is relocated](issues/29-placement-is-automated.md) | 27, 28 | ready-for-agent · needs infrastructure |

### Acceptance

| # | S | Ticket | Blocked by | Status |
|---|---|---|---|---|
| 30 | S6 | [The workload envelope is a runnable load profile](issues/30-the-workload-envelope-is-runnable.md) | 26 | ready-for-agent · needs seed data |
| 31 | S4 | [Declared degradation is tested, not described](issues/31-declared-degradation-is-tested.md) | — | ready-for-agent |
| 32 | S6 | [Unit cost per cell is tracked and forecast](issues/32-unit-cost-per-cell-is-forecast.md) | 27 | ready-for-agent · needs infrastructure |

## Deliberately not ticketed

- **Phase 5 — extracting chat delivery, notification delivery, search ingestion or billing webhooks.** The PRD gates extraction on measurements that do not exist yet: *"a network deployment is justified only when independent scaling or reliability creates a real second adapter."* Ticket 30 is what would produce them. Writing the extraction ticket now would be the mistake the PRD names as #18.
- **The domain scale rules** (chat, mail, notifications, calendar, knowledge, billing, HR, CRM, directory, support, integrations, AI). These are restatements of failure classes that already have closed tickets and durable guards in c11–c27 — see the archive in [`../README.md`](../README.md). Re-ticketing them would re-open closed work.
- **Data-architecture items already closed:** partitioning and retention (c21), search and vector ACL (c12, c27), tenant extensibility without migrations (c23), the list contract (c13), cache-key safety (c19).
- **Recorded decisions, not defects.** Do not re-raise the frontend permission-key subset, downgrade not revoking an enabled module, table splitting by width, key-type unification, migrating all naive timestamps, wrapping every text-match call site, or full APM. The backend `CACHE_KEYS` factories are already tenant-safe and a migration onto `*ForOrg` wrappers was tried at ~50 sites and fully reverted.

## Working these

Every ticket is a vertical slice: a narrow but complete path through schema, API, UI and tests, verifiable on its own. Tickets 09–14 are the exception the PRD's own shape forces — a wide refactor sequenced expand → migrate in batches → contract, where each batch stays green because the old form still exists.

**Acceptance criteria are the contract. The Todo list is a suggested route** and may be ignored if a better one exists; the criteria may not.

The program-level rules in [`../README.md`](../README.md) apply to every ticket here — verify by running the app, prove a deletion with a module graph and a real build, a `db.transaction` mock must invoke its callback, do not rewrite a test to accommodate a change, measure as the application's database role, vacuum and analyse after a table rewrite, and a "done" tick is evidence rather than proof.

No file path or line number in these tickets is load-bearing. They were accurate on 2026-08-28 and are cited as evidence, not instruction. Re-read at source.
