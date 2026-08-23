# Spec — One representation of what a person may do

Status: **ready-for-agent**
Date: 2026-08-23
Stream: Q · Ticket Q01
Testing prerequisite: `2026-08-23-seeded-e2e-harness-prd.md`

## Problem Statement

Every screen in the product asks the same question hundreds of times — may this person do this? — and the answer is delivered in a form that makes asking expensive.

When someone opens a page, the app downloads the complete list of everything they are permitted to do, twice: once as a list of names, and once as a table of names to how much they may see. The two always contain the same names. The app then reads the list, not the table, and searches it from the beginning every time it needs an answer. On a screen with fifty rows and four permission-gated controls per row, that is two hundred searches through a list that for an administrator is hundreds of entries long.

The visible cost is not speed. It is that every gated control on every screen is hidden for the first moment after the page loads, then appears. Buttons pop in. A row's menu is empty and then fills. The reason is that while the permission list is still arriving, the app answers "no" to every question, and "no" and "not yet known" are the same answer.

There is a second cost that shows up as missing features rather than slow ones. Many screens need to know not just *whether* someone may see something but *how much* — everything in the organisation, their team's, or only their own. That information is in the table nobody reads, so screens that need it re-derive it or do without.

## Solution

Send the answer once, in the form that can actually be used.

The table of names to how-much becomes the single representation. Checking whether someone may do something becomes a direct lookup rather than a search. Asking how much they may see becomes possible everywhere, because the information is already there.

Nothing about who may do what changes. No permission is added, removed or renamed. This is entirely about the shape of the answer, and no calling code changes — the check keeps the exact same name and takes the exact same argument.

Separately, the moment where every control is hidden and then appears is fixed in the one shared place that renders gated controls, rather than by changing what the check means at each of its call sites.

## User Stories

1. As an employee, I want the buttons I am allowed to use to appear with the page, so that the interface does not flicker every time I navigate.
2. As an employee, I want a row's action menu to be complete when I open it, so that I do not see it fill in under my cursor.
3. As an employee, I want a large list to render without lag, so that a screen with many rows is usable.
4. As an employee on a slow connection, I want a smaller download when I open the app, so that the first screen arrives sooner.
5. As an administrator with many permissions, I want the app to stay responsive, so that having more access does not make the product slower.
6. As an employee, I want the app to distinguish "you may not" from "we do not know yet", so that I am not briefly shown a version of the product I do not have.
7. As an organisation owner, I want to keep seeing everything, so that ownership continues to short-circuit the question.
8. As an employee, I want a permission that has been revoked to disappear from my interface, so that I am not offered something that will then fail.
9. As an employee, I want a permission just granted to me to appear without signing out, so that access changes take effect promptly.
10. As an employee whose access is scoped to my own records, I want screens to show me my records rather than an empty list, so that scoping does not read as breakage.
11. As an employee whose access is scoped to my team, I want screens to reflect that, so that the scope I was given is the scope I experience.
12. As a developer, I want one representation of a person's access, so that I do not have to know which of two fields to read.
13. As a developer, I want checking a permission to be a direct lookup, so that its cost does not depend on how many permissions the person has.
14. As a developer, I want the check to keep its current name and argument, so that no calling code changes.
15. As a developer, I want a way to ask how much a person may see, so that a scoped list does not have to re-derive it.
16. As a developer, I want the new scope question to exist without being forced to adopt it, so that this change stays small.
17. As a developer, I want the server-side check to read the same representation, so that the two sides cannot disagree.
18. As a developer, I want the server to stop rebuilding a lookup structure on every check, so that repeated checks on one request are cheap.
19. As a developer, I want the response shape and the client's expectation to match exactly, so that a field cannot be silently dropped.
20. As a developer, I want a test that fails if the redundant field returns, so that the duplication cannot come back.
21. As a developer, I want the fix for the hidden-then-shown controls in one shared place, so that it is not applied hundreds of times.
22. As a reviewer, I want this change to touch a small number of files, so that I can review it properly.
23. As a reviewer, I want no permission key to change, so that I can be confident nothing about authorisation moved.
24. As a security reviewer, I want hiding a control to remain a convenience only, so that the server remains the boundary.
25. As a security reviewer, I want a hidden control to still be refused if it is invoked directly, so that this stays true after the change.
26. As a security reviewer, I want a person with no access to receive an empty answer rather than an error, so that the absence of permission is not an information leak.
27. As a security reviewer, I want the answer scoped to the person's current organisation, so that switching organisations cannot serve the previous one's access.
28. As an operator, I want a smaller response on the most frequently requested endpoint in the product, so that bandwidth and serialisation cost fall.
29. As an operator, I want no additional database work, so that a client-side improvement does not become a server-side cost.
30. As an operator, I want caching of this answer to keep working exactly as it does, so that a revocation still takes effect as quickly as it does today.

## Implementation Decisions

**The table is the representation; the list is deleted.** They are built together from the same source and always hold the same names — one is literally derived from the other. The table also carries how much may be seen, which the list cannot express. It is the one that survives, on the wire and in the types on both sides.

**The check keeps its exact signature.** Same name, same argument, same boolean result, same owner short-circuit. Only its body changes. This is what makes a change with over a thousand call sites reviewable.

**A companion question for scope is added and nothing is migrated to it.** It answers how much a person may see, defaulting to nothing when they hold nothing. It exists so the next scoped screen does not re-derive scope from a boolean. Converting existing screens is not part of this.

**Absent and "none" mean the same thing.** The resolver already excludes zero-scope entries when building the answer, so presence in the table is the test.

**The server-side check reads the table directly** and stops constructing a temporary lookup structure on every call.

**Nothing else on the answer changes.** Module availability, ownership, the membership-management flag, multi-factor state and the version marker are untouched.

**The authorisation result type is explicitly not part of this.** A neighbouring stream owns the file where the guard's own result type lives, and the two must not both edit it. If this work finds it must, that is a signal to stop rather than proceed.

**The hidden-then-shown moment is fixed at the shared gate, not at the check.** Making the check return three states instead of two would touch every one of its call sites for a benefit a single shared component can deliver once. The component knows whether the answer has arrived; the check does not need to.

## Testing Decisions

**A good test here states what a person holds and asserts what they are told they may do.** It does not assert the internal shape of a cache or the number of lookups performed.

**The primary seam is the controller**, against seeded data, for the answer's shape and content — depending on the seeded harness spec. The existing controller harness replaces permission resolution with a fixture, so it cannot prove that a real grant produces a real answer; it can only prove the route is gated.

**Seeded controller coverage:**

- A person with a scoped grant receives that scope in the answer, and no redundant list field is present anywhere in the response.
- An organisation owner receives an answer that grants everything, consistent with the short-circuit.
- A person with no grants receives an empty set rather than an error.
- A grant added takes effect on the next request; a grant revoked stops taking effect on the next request.
- Requesting the answer while acting in one organisation never returns another organisation's access.

**The wire-shape assertion is the mutation check.** Put the redundant field back and the test must fail. Without that, this change can be reverted invisibly.

**Client-side coverage** for the check and its new scope companion: a scoped permission answers yes and returns its scope; an absent permission answers no and returns nothing; an owner answers yes for a permission not in the table at all.

**Prior art.** The existing entitlements and permission-guard controller specs are the model for shape. The two-directional permission catalog tests are the regression net and must pass unchanged, because this stream touches no key.

**A trap specific to the web side.** Its type configuration excludes test files, so a clean type check does not prove the tests compile. The web suite must be run, not just type-checked.

## Out of Scope

- Any change to what resolves into a person's access. Grants, roles, delegations, ownership expansion and module denial are untouched.
- Any permission key, role template or grant path.
- Migrating existing screens onto the scope question.
- The team-scope query behaviour, which is separately recorded and separately owned.
- Server-side prefetching of this answer, which belongs to another stream.
- The caching and invalidation of this answer, which already works.

## Further Notes

This is the smallest change in the set and the widest-reaching: one type, one function body, one field on the wire, and over a thousand places that get faster without being edited.

It is worth doing early for a reason beyond its own value — several other streams touch access, and doing this first means they are all reading one representation rather than choosing between two.
