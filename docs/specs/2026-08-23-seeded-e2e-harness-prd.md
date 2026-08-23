# Spec — A seeded controller harness that exercises the real access services

Status: **ready-for-agent**
Date: 2026-08-23
Stream: O (prerequisite)
Blocks: the testing decisions of streams P, Q, R, S, T, U

## Problem Statement

The team cannot prove that a permission change actually changed what a person can reach.

There are 119 controller end-to-end specs. Every one of them boots through `createE2eApp`, which replaces `EntitlementsService` and `AccessService` with fixtures and connects to no database. A fixture answers "is this module enabled" from an array on the test, and "what permissions does this person hold" from another array on the test.

That harness is genuinely useful for what it was built for: it proves a route is decorated, that the guard chain runs, and that a caller without the key is refused. It needs no database precisely because it never asks one.

But it means a whole class of claim is currently unprovable at the controller. Whether module availability assembles its six sources correctly, whether a knowledge-base page is withheld from someone outside its project, whether a permission grant actually widens what a list returns — none of these can fail in the current harness, because the code that decides them has been overridden before the request starts.

This repository's own history is the argument: typecheck, build and 165 mocked tests once passed while nothing worked at all. A green e2e run that stubs the decision under test is that same failure with more ceremony.

## Solution

A second harness beside the first, for the specs that need it.

`createE2eApp` stays exactly as it is and keeps serving the guard-tier specs — it is fast, needs no infrastructure, and its 119 consumers are not rewritten.

Alongside it, a seeded harness boots the real `AccessService`, the real `EntitlementsService` and a real database, seeds a small fixture organisation, and lets a spec ask a real question: this person, this request, this row — what comes back?

A spec picks the harness that matches the claim it makes. A spec asserting "the route is gated" uses the stubbed one. A spec asserting "this person cannot see that page" uses the seeded one.

## User Stories

1. As a developer, I want a harness that boots the real access services, so that a spec about access can actually fail when access is broken.
2. As a developer, I want the existing stubbed harness left alone, so that 119 specs do not need rewriting to land this.
3. As a developer, I want to choose the harness per spec, so that a cheap claim keeps a cheap test.
4. As a developer, I want the seeded harness to create its own organisation, so that a spec does not depend on data another spec left behind.
5. As a developer, I want each spec's data torn down after it runs, so that specs can run in any order.
6. As a developer, I want to seed a person with a named set of permissions, so that a spec reads as a sentence about a role.
7. As a developer, I want to seed a second organisation, so that cross-tenant isolation can be asserted rather than assumed.
8. As a developer, I want to seed a person who belongs to one project and not another, so that project-scoped visibility can be tested at all.
9. As a developer, I want to seed an organisation on a specific plan tier, so that plan gating can be exercised.
10. As a developer, I want to seed a module as enabled or disabled for an organisation, so that module gating can be exercised.
11. As a developer, I want the seed to be small and explicit, so that a failing spec points at a cause instead of a fixture.
12. As a developer, I want the seeded harness to run in CI, so that its coverage is real rather than aspirational.
13. As a developer, I want CI to bootstrap its own database, so that no developer machine is a prerequisite.
14. As a developer, I want the seeded run to be a separate command, so that the fast suite stays fast.
15. As a developer, I want a spec that forgets to seed to fail loudly, so that an empty result never reads as a passing denial.
16. As a security reviewer, I want a cross-tenant request to be provable at the controller, so that "returns 404, never 403" is enforced rather than documented.
17. As a security reviewer, I want an allow case and a deny case for the same route, so that a spec cannot pass by denying everything.
18. As a security reviewer, I want the tenant context to be established the way a real request establishes it, so that a row-level policy is genuinely in force during the test.
19. As a security reviewer, I want a spec to fail if row-level security is bypassed, so that the harness does not run as a role that ignores it.
20. As an operator, I want the seeded suite to have a bounded runtime, so that it can gate a merge.
21. As an operator, I want a failing seeded spec to say which organisation and person it used, so that a failure is reproducible.
22. As a QA engineer, I want the same fixture vocabulary across every seeded spec, so that reading one teaches you all of them.
23. As a QA engineer, I want to add a seeded spec without inventing new setup, so that coverage grows cheaply.
24. As a developer new to the repository, I want the two harnesses to have names that say what they do, so that I pick the right one without asking.
25. As a developer, I want the harness choice recorded in each spec's own comments or name, so that a reviewer can see whether the claim matches the tool.

## Implementation Decisions

**Two harnesses, not one.** The stubbed harness is not modified, deprecated, or wrapped. Its speed is a feature and its consumers are correct for what they assert. The seeded harness is additive.

**The seeded harness overrides nothing in the access path.** `AccessService`, `EntitlementsService` and `MembershipStateService` are the real implementations. If a spec needs to change what a person may do, it changes the seeded grants, not a provider.

**Tenant context is established the way a request establishes it.** The seeded harness must exercise the real tenant transaction path, because row-level security is live on every organisation-scoped table and a write with no tenant setting fails outright. A harness that sidesteps this proves nothing about the policies.

**The database role matters.** Seeding may run as the owner; the request under test must not. The owner bypasses row-level security, so a spec run as the owner cannot observe a policy failure — the same trap that makes owner-only performance measurement misleading.

**The seed is a fixture builder, not a fixture file.** A spec declares the organisation, the people, their standings, their grants, their projects and their plan tier, and receives identifiers back. A large shared fixture becomes a coupling every spec inherits.

**Isolation is per spec.** Each seeded spec gets its own organisation. Two specs sharing an organisation will eventually share a failure.

**An empty result is not a passing denial.** The builder asserts the rows it created exist before the spec proceeds. Otherwise a mis-seeded spec asserting "this person sees nothing" passes for the wrong reason — which is the most likely way this harness silently rots.

**Separate command, run in CI.** The seeded suite is its own script and its own CI job that bootstraps a database, in the same shape as the existing jobs that seed their own database for the request-cost and read-count ceilings.

**Naming says which harness.** A reader of a spec file should know from its name or its first line whether the claim rests on real services or fixtures.

## Testing Decisions

**A good test here names the caller, the request and the row, and asserts what came back** — not which tables were read or in what order. Query strategy is exactly what the streams that depend on this harness are free to change; a test that fails when a predicate is consolidated is testing the implementation.

**The harness tests itself first.** Before any stream uses it, prove it can fail:

- Seed a person without a permission, request the route, assert refused. Then seed the permission, request again, assert allowed. A harness that cannot produce both outcomes is not yet a harness.
- Seed two organisations, request organisation B's identifier as organisation A's member, assert **not-found, never forbidden**.
- Seed a row, deliberately clear the tenant context, assert the request fails rather than returning the row.
- Assert the request runs as the application role, not the owning role.

**Prior art.** The stubbed harness is the model for the shape of a controller spec — how a request is made, how the exception filter is asserted, how a token carries a fixture. Reuse all of that. The CI jobs that boot and seed a database for the request-transaction and build-read ceilings are the model for the job.

**Two traps this repository has already paid for.** A transaction mock that does not invoke its callback voids every assertion inside it silently. And `*e2e-spec` files run only under the dedicated command — adding a case to one is not the same as adding executed coverage, so the CI job is part of this spec, not a follow-up.

## Out of Scope

- Rewriting any of the 119 existing e2e specs.
- Retiring or changing the stubbed harness.
- Seeding data for modules none of the dependent streams touch.
- Any assertion about performance. Buffers and transaction counts have their own ceiling jobs and their own measurement rules.
- Making the seeded suite a required merge gate on day one. Prove it is stable first.

## Further Notes

This spec exists because a choice was made to test the six architecture streams at the controller, and the controller harness in this repository cannot currently carry those claims. That is not a criticism of the harness — it was built for guard-tier assertions and it does that well. It is a statement that the chosen seam needs a capability that does not exist yet.

The alternative was to specify service-level tests, which run in the default suite and prove that two code paths cannot drift, but do not prove the real request behaves. Both are legitimate. This spec is what makes the chosen one honest.

If this prerequisite is not taken, each dependent stream must say plainly which of its claims are proven by mocked tests and which remain unproven until the application is booted — and no stream should tick a criterion that says "verified by running the app" on the strength of a stubbed harness.
