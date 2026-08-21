# PRD — HRMS: converge on the model that actually runs

Status: ready-for-agent
Date: 2026-08-20
Scope: the HR module (people, employment, attendance, leave, onboarding, performance) and its seam with Payroll
Evidence: live row counts and catalog inspection against the development database

## Problem Statement

HRMS works. `GET /hr/employees` returns real people, `/hr/directory`, `/hr/people`, `/hr/employments` and `/hr/leaves` all respond correctly, and the module is well organised — 492 files across thirty sub-domains, with exactly one file over the 500-line limit.

But it works through a different model than the one that was built.

The employees endpoint reads organisation membership and identity directly. Meanwhile `hr_people`, `hr_employments`, `hr_employee_sensitive_fields` and 92 sibling tables hold **zero rows — 95 of 98 `hr_*` tables are empty**. The three that are not hold one row each. The person model the module was designed around is carrying no data anywhere, in any organisation.

This has three consequences.

**Every new HR feature faces a fork with no rule.** Read membership, or read the person model? Both are present, one is populated, neither is documented as canonical. Features have picked differently, and Payroll picked a third option.

**Payroll cannot pay everyone it can employ.** Eligibility can be asserted by user id or by worker id. There is no entry point keyed by person — so a person recorded in HR without a login can hold an employment and never be payable. That is a hole, not a design.

**The payroll domain is split across two schema folders.** Twenty-three `payroll_*` tables sit under `hr/`, five under `payroll/`, keyed on different person concepts. A payroll run and its inputs live in different halves.

Underneath all of it, the schema files declare tables the database does not have — several attendance families, and two directory tables. Those pass every static check and fail at runtime with `42P01` on whichever feature reaches them first.

## Solution

Decide which model is canonical, route every read through one seam, and delete what stays empty.

The Person Directory seam (specified separately) gives HRMS, Payroll and Directory one question to ask — *who is this person in this organisation* — with one answer covering members, non-member payees, and people recorded without a login. Payroll's two eligibility entry points become thin wrappers over it, and the missing third case is closed.

Because 95 of 98 tables are empty, this is a code change with **no data migration**. Tables that remain empty after the decision are deletion candidates rather than architecture.

## Goals

- One canonical person model, recorded in the repo rules so the next feature does not re-decide.
- One seam through which HRMS, Payroll and Directory resolve people.
- Payroll can pay every person it can employ, including a person with no login.
- The payroll domain lives in one schema folder.
- Schema declarations and database agree, enforced automatically.

## Non-Goals

- Rewriting HR features that work today. The employees, directory, people, employments and leave surfaces stay behind their current routes and response shapes.
- Restructuring the module. Thirty sub-domains, one file over the limit — the layout is not the problem.
- Deleting any table or schema file. Tested and ruled out — see Implementation Decisions.
- Building the attendance families the schema declares but the database lacks. They belong to the pending SQL-managed phase; applying that phase is a separate decision.

## User Stories

1. As an HR administrator, I want a person I add to appear everywhere immediately, so that I never enter someone twice.
2. As an HR administrator, I want one canonical record per human, so that headcount and reporting are trustworthy.
3. As an HR administrator, I want to record someone who has no login, so that staff who do not use the product still appear.
4. As an HR administrator, I want to see whether a person is linked to a login, so that I know who can sign in.
5. As an HR administrator, I want archiving a person to hide them consistently everywhere, so that a leaver does not linger in one surface.
6. As an HR administrator, I want employment history to survive a rehire, so that tenure is preserved.
7. As a payroll administrator, I want every employed person to be payable, so that employment and payability cannot diverge.
8. As a payroll administrator, I want to pay a person who has no login, so that record-keeping does not dictate payment.
9. As a payroll administrator, I want to pay a non-member contractor, so that paying someone never requires granting them access.
10. As a payroll administrator, I want a run to reach its own inputs, so that reconciliation is not manual.
11. As a payroll administrator, I want to see which identity a payee resolved through, so that I can explain an inclusion or exclusion.
12. As a payroll administrator, I want a person who leaves mid-cycle to still resolve for that cycle, so that a final payment can be produced.
13. As an employee, I want my details identical across every surface, so that I report a correction once.
14. As an employee, I want my own leave, attendance and pay always available, so that self-service is never gated away.
15. As an employee, I want my name and avatar to render the same everywhere, so that the product feels like one system.
16. As a contractor, I want to be paid without being granted module access, so that payment does not imply entry.
17. As a developer, I want one interface returning identity, employment and payability, so that I do not hand-join three models.
18. As a developer, I want the canonical model written into the repo rules, so that I do not choose wrongly on my next task.
19. As a developer, I want a new person field to have one obvious home, so that the model does not fork again.
20. As a developer, I want the resolver to return an explicit unresolvable result, so that callers can explain the failure rather than throw.
21. As a security reviewer, I want person resolution tenant-scoped on every call, so that an id from another organisation cannot resolve.
22. As a security reviewer, I want resolution never to widen the caller's data scope, so that the seam cannot bypass permission checks.
23. As a security reviewer, I want sensitive fields to stay behind their existing gates, so that convergence does not expose bank or tax data.
24. As an operator, I want a declared-but-absent table to be caught in CI, so that it is not discovered by a runtime failure.
25. As an operator, I want this to require no data migration, so that it ships without a maintenance window.
26. As a QA engineer, I want member, contractor and login-less cases each covered, so that all three resolve paths are proven.

## Implementation Decisions

**The canonical model is `hr_people` / `hr_employments`, for members and non-members alike.** Verified: `hr_employments` has a foreign key to `hr_people`, **not** to organisation membership, and `hr_people.user_id` is nullable. The HR chain can therefore already represent a person with no login and no membership. An earlier draft claimed otherwise and was wrong; the correction is recorded in the Person Directory spec.

**Payroll gains a third eligibility entry point, keyed by person.** It has one keyed by user and one keyed by worker. The missing case — a person recorded in HR without a login — is why a person can be employed and unpayable. All three become thin wrappers over the Person Directory seam, preserving their current errors so existing specs remain the regression net.

**The directory chain is retained for non-member payees.** Both chains can represent a contractor; keeping the existing one is the smaller change — roughly 206 references concentrated in two module folders, against roughly 583 spread across every HR service. This is a decision about effort and risk, not capability.

**Payroll tables converge into `db/schema/payroll/`.** Twenty-three under `hr/` and five under `payroll/` is a split through the middle of one domain. The module owns its schema folder.

**Nothing in the HR schema is safe to delete. This was tested, not assumed.**

An earlier draft of this PRD implied empty tables were deletion candidates. They are not. Applying the dead-code standard — zero symbol references outside the schema folder, zero raw table-name references, no inbound foreign key — to all 95 empty `hr_*` tables returns **zero** safe candidates. Every one is referenced by a live service. They are empty because no HR data is seeded, not because the features are abandoned; deleting them would break 95 services.

Separately, `knip` reports 11 unused schema files. **They are also not dead.** `hrms-phase1-sql-managed.ts` is a deliberate holding barrel for tables managed by raw SQL migrations in a pending root, kept out of the runtime barrel precisely so Drizzle never manages them — an arrangement asserted by `migration-integrity.spec.ts` ("keeps SQL-managed objects outside the Drizzle schema and journal"). `knip` flags them as unimported because being unimported is the design. Their tables are absent from the database because that phase has not been applied.

**Therefore schema removal is out of scope for this PRD**, and any future attempt needs a stronger signal than emptiness or a module-graph tool alone. Two traps to carry forward: a reference scan whose symbol pattern misses `pgTable(` silently reports every table as unreferenced, and a table name may sit on the line *after* the `pgTable(` call, so single-line patterns find nothing.

**Schema-versus-catalog drift becomes a CI check.** The schema declares attendance tables and two directory tables the database lacks. This is the same class as the chat failure in reverse: there the database had a column the schema omitted and every insert died; here the schema declares tables the database lacks and any query dies `42P01`. Neither typecheck nor a module-graph tool can see it. The existing `org_id` drift scanner is the same shape and generalises.

**Self-service stays universal.** Own leave, attendance, pay and documents remain available to every active member regardless of grants, derived from the caller's identity and never from a client-supplied id.

**No data migration.** Every affected table is empty. This is the cheapest this decision will ever be, and it is the principal reason to make it now.

## Testing Decisions

**A good test states who asked, what they asked for, and what came back.** It does not assert which model answered — that is exactly what this work changes. A test that breaks when a read moves behind the seam is testing the implementation.

**Controller seam first**, with extensive prior art in existing end-to-end specs.
- An employee resolves for a member, a non-member payee, and a person with no login.
- Payroll eligibility succeeds for all three and fails clearly for an unresolvable subject.
- A person added through HR appears in the directory, and vice versa.
- Archiving hides a person consistently across every surface that lists people.
- Self-service surfaces remain available to a member holding zero HR grants.
- Sensitive fields stay gated after convergence.
- Cross-tenant: a person id from another organisation returns not-found, never forbidden.

**Unit coverage on the seam.** The three-way resolve result is handled exhaustively; an unresolvable subject is a value, not a throw.

**A drift test.** Every table declared in the schema exists in the database. This is the only test that catches the `42P01` class, and it is cheap.

**Two traps already hit here.** A transaction mock must invoke its callback. End-to-end specs run only under the dedicated command, so adding a case is not the same as executing it.

## Out of Scope

- The Build module, which has its own PRD.
- The module access ladder and the `settings:*` namespace question.
- Attendance feature work beyond deciding the fate of the declared-but-absent tables.
- Recruitment, interviews and performance, none of which are implicated.
- Frontend changes. Routes and response shapes are preserved.

## Further Notes

**What is healthy.** 492 files across thirty sub-domains with one file over the size limit is good structure. The endpoints work. Tenant isolation is real — row-level security failed closed the moment a query ran without the tenant GUC. The problem is convergence, not construction.

**The measurements.**

| Fact | Value |
|---|---|
| `hr_*` tables | 98 |
| With zero rows | **95** |
| `hr_people` / `hr_employments` / `hr_employee_sensitive_fields` | 0 / 0 / 0 |
| Populated tables | 3, one row each |
| Payroll tables under `hr/` versus `payroll/` | 23 / 5 |
| Attendance tables declared versus present | several / **2** |
| Files over 500 lines | 1 |

**One claim to retire.** An earlier review asserted that `hr_people` was an older generation with bare foreign keys. It is not: it already carries row versions, soft delete, archive columns, actor foreign keys, a composite tenant key and a partial live-rows index. No hardening work is required, and none is proposed here.
