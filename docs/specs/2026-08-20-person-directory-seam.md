# Person Directory seam — one way to resolve a person

Status: ready-for-agent
Date: 2026-08-20
Scope: candidate C6 from the 2026-08-20 architecture review

## Problem Statement

An organization's people are described three different ways at once, and nothing declares which one is authoritative.

For an HR admin this shows up as duplicate work: a person added through HR onboarding does not appear as a directory worker, and a person added through the directory does not appear in HR. Neither knows about the other, so the same human is entered twice under two identities.

For a payroll admin it shows up as a payroll run that cannot see its own inputs. Payroll inputs are assembled against the HR person model; payroll runs, payees and salary profiles resolve against the directory worker model. A run can therefore be generated for a payee whose inputs were never collected, or collect inputs for a person the run cannot pay.

For a developer or coding agent it shows up as an unanswerable question. Asked to add a field to "a person", there is no single place to put it, and no rule that says which model a new feature should read. Every new HR, Payroll or Directory feature re-litigates the decision, and picks differently.

Nothing here is a data-loss bug today, because the tables are effectively empty. It is a correctness and velocity problem that becomes a migration problem the moment real organizations are onboarded.

## Solution

One seam that answers "who is this person in this organization", used by every module that needs the answer.

A person is resolved once, from a subject that is either a platform user or a directory worker, and the result carries their identity, their employment if they have one, and whether they may be paid. HRMS, Payroll, Directory and any future consumer read through that seam instead of querying person tables directly.

The two models stop competing and take defined roles:

- Someone who is a member of the organization is described by the HR person and employment model. This is the canonical path and covers every employee.
- Someone who is paid but is not a member of the organization — a contractor — is described by the directory person and worker model, flagged as a payee.

The existing link between the two models becomes load-bearing rather than decorative, so a person who exists in both is provably the same person.

From the outside this is mostly invisible, and that is the point: an HR admin adds a person once and sees them everywhere, a payroll admin generates a run that can always reach its inputs, and a contractor can be paid without being given a seat in the organization.

## User Stories

1. As an HR admin, I want a person I onboard to appear immediately in the people directory, so that I do not have to create them a second time.
2. As an HR admin, I want a person created in the directory to be visible to HR, so that the two lists never disagree about who works here.
3. As an HR admin, I want each human in my organization to have exactly one canonical record, so that reports and headcount are trustworthy.
4. As an HR admin, I want to see when a person is linked to a platform user account, so that I know who can sign in.
5. As an HR admin, I want to add a person who has no login, so that I can record staff who do not use the product.
6. As an HR admin, I want archiving a person to hide them consistently from every module, so that a departed employee does not linger in one surface.
7. As an HR admin, I want a person's employment history to remain attached to them across a rehire, so that tenure is not lost.
8. As a payroll admin, I want every payee in a run to resolve to a person with collected inputs, so that a run cannot be generated against a person I have no data for.
9. As a payroll admin, I want to pay a contractor who is not a member of the organization, so that I do not have to give an outside party a seat to pay them.
10. As a payroll admin, I want a contractor to be explicitly marked as a payee, so that directory records are not accidentally paid.
11. As a payroll admin, I want a payroll run to refuse a payee who is neither an active member nor a flagged payee, so that money cannot be sent to a stale record.
12. As a payroll admin, I want salary profiles to attach to the same person identity payroll runs use, so that a profile is never silently ignored at generation time.
13. As a payroll admin, I want payroll inputs and payroll runs to agree on who is in scope, so that reconciliation is not manual.
14. As a payroll admin, I want a person who leaves mid-cycle to still resolve for that cycle's run, so that a final payment can be produced.
15. As a payroll admin, I want to see which identity a payee was resolved through, so that I can explain an unexpected inclusion or exclusion.
16. As an employee, I want my own profile to show the same details everywhere in the product, so that I do not report the same correction twice.
17. As an employee, I want my payslip to be attached to my identity, so that I can find my own pay history without an admin.
18. As an employee, I want my name and avatar to render identically in chat, directory and HR surfaces, so that the product feels like one system.
19. As a contractor, I want to be payable without being made a member of the organization, so that I do not receive access to internal modules.
20. As an org owner, I want a contractor to have no access to organization modules by virtue of being a payee, so that paying someone never grants them entry.
21. As an org admin, I want the people directory to be a read-only reflection of the canonical model, so that there is no second place to create people.
22. As an org admin, I want person records to be tenant-isolated, so that no query can return a person from another organization.
23. As a module owner, I want my module to read people through one interface, so that I do not have to learn which person table is correct for my case.
24. As a developer, I want a single interface that returns identity, employment and payee eligibility, so that I do not hand-join three tables at every call site.
25. As a developer, I want the resolver to return a clear "not resolvable" result rather than throwing, so that callers can present a useful message instead of a 500.
26. As a developer, I want the subject type to make an unresolvable person unrepresentable where possible, so that mistakes are caught at compile time.
27. As a developer, I want adding a new person-shaped field to have one obvious home, so that a new feature does not fork the model again.
28. As a coding agent, I want the canonical person model documented in the repo rules, so that I do not pick the wrong model on my next task.
29. As a security reviewer, I want person resolution to re-assert tenant scope on every call, so that a subject id from another organization cannot be resolved.
30. As a security reviewer, I want resolving a person to never widen the caller's data scope, so that the seam cannot be used to bypass permission checks.
31. As a security reviewer, I want sensitive person fields to stay behind their existing permission gates after the change, so that consolidation does not quietly expose bank or tax data.
32. As a QA engineer, I want controller-level tests that cover member, contractor and unresolvable subjects, so that all three paths are proven rather than assumed.
33. As a QA engineer, I want a cross-tenant test for person resolution, so that isolation is enforced by a test and not by convention.
34. As an operator, I want the seam to work on an organization that has zero directory workers, so that an organization that never uses contractors is unaffected.
35. As an operator, I want the change to require no data migration on current environments, so that it can ship without a maintenance window.

## Implementation Decisions

**A new Person Directory module owns resolution.** The subject abstraction currently living inside Payroll is promoted into a module of its own. Payroll, HRMS and Directory all consume it. It is the only module permitted to join across the person tables.

**The subject type stays a union and keeps its current shape.** This came from the existing Payroll implementation and encodes the decision more precisely than prose:

```ts
type PersonSubject = { userId: string; workerId: null }
                   | { userId: null; workerId: string }
```

The existing helpers that derive a stable key from a subject, and that detect a worker-only subject, move with it. The current shape allows both fields to be null simultaneously; the promoted version tightens this so an empty subject cannot be constructed.

**Resolution returns a discriminated union, not a throw.** The result distinguishes a resolved member, a resolved non-member payee, and an unresolvable subject. Callers switch exhaustively. Payroll's existing eligibility assertion becomes a thin wrapper that converts the unresolvable case into its current forbidden error, so its external behaviour is unchanged.

**Membership decides which model describes a person.** A person who is an active organization member is described by the HR person and employment model. A person who is not a member but is flagged as a payee is described by the directory person and worker model. These are the only two resolvable cases; anything else is unresolvable.

**The existing link column becomes load-bearing.** The HR person model already carries a nullable link to the directory person, with a partial unique index on it. Resolution uses that link to prove that a person present in both models is the same human, and the link is populated whenever a person exists in both. The column already exists — no schema change is required to start using it.

**No new person tables, and no table is retired in this spec.** Both models stay. The change is about which one is authoritative for which case, and about routing every read through one interface.

**No data migration.** All affected tables are empty or near-empty on current environments, so the change ships as code plus documentation. This is explicitly why the work is being done now rather than after launch.

**Payroll's stored dual identity is retained.** The payroll run employee record keeps both identity columns, because it must be able to record either kind of payee. Its tenant column stays mandatory.

**The directory becomes a read projection.** Directory read endpoints continue to serve the people directory, resolved through the new seam. Directory write endpoints that create a person as an employee are retired in favour of the HR creation path; directory writes that create a non-member payee remain, since that is the contractor lane.

**Contractors gain no access.** Being a payee is not membership and grants no module access, no permissions and no session. This is stated explicitly because the resolver now returns contractors alongside members, and a future caller could mistake resolvability for authorization.

**Cross-module access goes through the module, not the tables.** Payroll stops importing HR and directory schema directly and calls the Person Directory module instead, per the existing repo rule on cross-module access.

**The canonical model is recorded in the repo rules.** The decision that the HR person and employment model is canonical for members is written into the project rules so the next agent does not re-litigate it.

## Testing Decisions

**A good test here asserts externally observable behaviour.** It states who the caller is and what they asked for, and checks what came back — a resolved person, a refusal, or a specific error. It does not assert which tables were queried, how many queries ran, or the internal order of joins, because all of those are exactly what this change is free to alter. A test that breaks when the join strategy changes is testing the implementation and should be rewritten.

**The primary seam is the controller.** This is the highest available seam and the codebase has extensive prior art — there are more than a dozen controller-level end-to-end specs across access, accounting, billing, blog, branches, audit log, auth and automation, and the recent chat actions spec follows the same shape. New coverage goes here first.

**Controller-level cases to cover:**
- Payroll run generation for an active member payee, resolved through the HR model.
- Payroll run generation for a non-member flagged payee, resolved through the directory model.
- Payroll run generation refused for a subject that is neither, returning the existing forbidden error rather than a server error.
- Salary profile creation and read for both kinds of subject.
- Directory people listing returning both members and contractors, with contractors distinguishable.
- Directory employee-creation endpoints no longer accepting employee creation.
- Cross-tenant isolation: a subject id belonging to another organization resolves as unresolvable and returns a not-found rather than a forbidden, matching the repo's existing rule that cross-tenant misses must not confirm existence.
- Permission and scope allow/deny for each new or changed route, matching the existing controller spec pattern.

**Unit coverage on the promoted module.** The subject helpers already have unit specs in Payroll; those move with the code and are extended to cover the tightened subject type, the three-way resolution result, and exhaustive handling of each case. This is the prior art to follow for the module's own tests.

**Two known traps to avoid, both previously hit in this repo.** A transaction mock must actually invoke its callback, or every assertion inside the transaction silently passes without running. And end-to-end specs are excluded from the default test run and execute only under the dedicated end-to-end command, so adding a case to a controller spec is not the same as adding executed coverage — the end-to-end suite must be run to prove it.

**Existing Payroll tests must keep passing unchanged.** The eligibility assertion keeps its current signature and error, so its current specs are the regression net for the refactor. If they need editing, the external behaviour changed and that needs justifying.

## Out of Scope

- Retiring either person model. Both remain after this spec.
- Any data migration or backfill. If an environment turns out to hold real person data, that is a separate, sequenced piece of work.
- The directory tables that are declared in the schema but absent from the database. That is real drift and needs its own fix, but it is not required for this seam.
- Moving payroll tables between schema folders. The payroll domain is currently split across two folders; that reorganisation is tracked separately as part of the same review.
- Widening the seam to non-person entities. Sharing tickets, leads and records across modules is a different seam and has its own candidate in the review.
- Frontend work. No UI changes are required; the directory and HR surfaces keep their current routes and shapes.
- Chat, calendar and inbox. Unaffected by this change.
- Row-level security policy changes. Existing tenant policies continue to apply unchanged.

## Further Notes

The architecture review that produced this candidate contained three claims that did not survive verification against the codebase and database, and the spec above reflects the corrected picture:

- The review said nothing joins the two person models. In fact Payroll already models both identities in a deliberate union type, with unit tests, and the payroll run employee record stores both identity columns. That union is being promoted, not invented.
- The review said the HR person model is the older generation with bare foreign keys. In fact it already carries a row version, soft delete, archive columns, actor foreign keys, a composite tenant key and a partial live-rows index — the same hardening as the directory model. No hardening work is needed.
- The review implied consolidating onto the HR model was a straightforward simplification. It is not — but the reason given in an earlier draft of this spec was itself wrong and is corrected here.

**Corrected 2026-08-20.** An earlier draft claimed the HR employment model hangs off organization membership, so consolidating would remove the ability to pay a non-member. That is false. `hr_employments` has a foreign key to `hr_people`, not to `organization_members`, and `hr_people.user_id` is nullable — so the HR chain can already represent a person with no login and no membership, and give them an employment.

The real gap is narrower and more specific: **payroll has two payee entry points and needs a third.** Eligibility can be asserted by user id (member, or a worker carrying that user id) or by worker id (flagged payee, user id may be null). There is no entry point keyed by person, so a person recorded only in HR without a login can hold an employment and still never be payable. That is the hole this seam closes, and it is a stronger justification than the one it replaces.

The decision to keep both models therefore rests on effort and risk — re-keying roughly 206 references concentrated in two module folders, rather than roughly 583 spread across every HR service — not on preserving a capability that consolidation would have destroyed.

The directory payee flag currently matches zero rows, so the contractor path has no production usage to regress. It should still be covered by tests, because it is the case most likely to be broken by a future well-intentioned simplification.

This work was sequenced after a separate P0 in the chat module, which has been fixed and verified.
