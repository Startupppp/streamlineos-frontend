# c10 · Make module-level standing answerable

**Status: engine shipped, one question unanswerable.** Verified at source 2026-08-25. `MODULE_REGISTRY` derives `planGated`, `administrable`, `ladder` and `administersNamespaces` declaratively. `ROLE_RANK` is a real ladder — `ORG_OWNER 0`, `ORG_ADMIN 10`, `MODULE_OWNER 15`, `MODULE_ADMIN 20`, `MODULE_CUSTOM 30`, `FUNCTIONAL 40` — and roles carry a `moduleKey`, so module standing is structural and stored, not a naming convention. Grant-time scope escalation is refused by a `SCOPE_RANK` ceiling. **The vision is built.** What is missing is a read: nothing can answer *"who holds standing in this module, and who may I grant to?"* without assembling it from three places.

## Problem Statement

**As an HR head, I cannot see who is in my module.** I am the module owner. The engine knows it — my role carries `moduleKey: "hr"` at rank 15. But no screen can list the HR module's admins and members, because no endpoint returns them. I administer a group I cannot enumerate.

**As a module owner, I cannot tell what I am allowed to grant.** The rules exist and are enforced: I cannot grant a rank at or above my own, and I cannot grant a scope wider than I hold. Both are enforced at write time, as a refusal. So the interface teaches by rejection — I discover the boundary by hitting it.

**As an org owner, I cannot delegate a module and walk away.** Handing HR to a new head means finding every grant that names the old one. There is no "transfer this module's ownership" operation, so delegation is a manual sweep and an ex-owner keeps standing until someone remembers to remove it.

**As a developer, I answer this question differently each time.** Module standing is derivable from `roles.moduleKey` + `ROLE_RANK`, from a permission-key namespace, or from `MODULE_REGISTRY.administersNamespaces`. Three routes to one fact, none canonical, so each caller picks one and they drift.

**As a security reviewer, I cannot audit standing.** "Who can administer payroll?" is a question about the union of module roles, org-level bypass and per-person grants. Today it is answered by reading code.

## Solution

Add the read side of the ladder that already exists. One module — call it module standing — whose interface answers two questions and nothing else:

- **Who holds standing in this module?** Returns people with their rank and scope, including those who hold it by org-level bypass rather than a module role, because the distinction matters to the person reading the screen.
- **What may this actor grant here?** Returns the grantable ranks and the scope ceiling, derived from the same `ROLE_RANK` and `SCOPE_RANK` comparisons the write path already enforces.

The second is the important one. It converts the grant rules from a refusal into a description, and it does so *without a second implementation* — the read must be computed by the same comparison the writer uses, or the UI will offer options the writer rejects.

Then module ownership transfer becomes one operation over that interface rather than a sweep.

## User Stories

1. As a module owner, I want to list everyone with standing in my module, so that I can see who I am responsible for.
2. As a module owner, I want each person's rank shown, so that I can tell an admin from a member.
3. As a module owner, I want each person's data scope shown, so that I know whether they see all records or only their own.
4. As a module owner, I want people who hold standing via org-level bypass shown distinctly, so that I do not try to revoke something my module does not own.
5. As a module owner, I want to know which ranks I may grant before I open the form, so that I am not offered choices that will be refused.
6. As a module owner, I want the scope ceiling shown, so that I understand I cannot grant wider than I hold.
7. As a module owner, I want to grant module-admin standing to a person, so that I can delegate administration.
8. As a module owner, I want to revoke standing, so that someone leaving the function loses access with one action.
9. As a module owner, I want to transfer ownership of my module, so that a handover is a single operation rather than a sweep.
10. As a module owner, I want transferring ownership to remove my own standing, so that an ex-owner does not silently retain it.
11. As an org owner, I want to appoint a module owner for a module that has none, so that a new function can be delegated.
12. As an org owner, I want to see every module and its current owner, so that I know what is delegated and what is not.
13. As an org admin, I want the same module administration the owner has, so that the documented owner/admin equivalence holds.
14. As an org admin, I want to be refused when changing the org owner, so that the one documented exception is enforced.
15. As a member with no module standing, I want module administration screens to be absent, so that I am not shown a page that will refuse me.
16. As a member invited to one module, I want standing in that module only, so that an invitation does not widen my access elsewhere.
17. As a person in multiple organisations, I want standing evaluated per organisation, so that being an HR owner in one does not imply it in another.
18. As a security reviewer, I want one endpoint that answers who can administer a module, so that an audit is a query rather than a code read.
19. As a security reviewer, I want the read and the write to share one comparison, so that the UI cannot advertise a grant the writer refuses.
20. As a developer, I want one way to ask whether a person holds module standing, so that a fourth derivation is not invented.
21. As an operator, I want a module left without an owner to be visible, so that an orphaned function is noticed rather than discovered.

## Implementation Decisions

**Already shipped — build on this, do not restate it**

- **`MODULE_REGISTRY` is the source of truth for what a module is.** `administrable` decides whether a module can carry standing at all; `ladder` decides which ranks apply; `administersNamespaces` maps a module to the permission namespaces it governs. A module that is `administrable: false` has no standing to list, and the interface must say so rather than return an empty list.
- **`ROLE_RANK` is the ladder and it is stored.** Standing is `roles.moduleKey` plus rank. Do not derive standing from permission-key prefixes — that is the third derivation this spec exists to remove.
- **The `SCOPE_RANK` ceiling is enforced at grant time** and refuses widening. The new read computes the same ceiling; it does not restate the rule.

**To build**

- **One module, two reads.** `listStanding(orgId, moduleKey)` and `describeGrantable(orgId, moduleKey, actor)`. Both are reads; neither mutates. Keeping them on one interface is deliberate — they answer the same question from two sides, and splitting them invites the second to be reimplemented in the UI.
- **`describeGrantable` must call the same predicate the writer calls.** Extract the comparison the grant path already performs and have both consume it. If the read reimplements the comparison, the two will drift and the symptom is a form offering a grant that fails on submit.
- **Standing has a source.** Each entry reports whether it comes from a module role, from org-level standing, or from a direct grant. Story 4 depends on this and it is also what makes the audit answerable.
- **Module ownership transfer is one operation**, taking the module, the new owner and the outgoing owner. It is transactional: appointing the new owner and removing the old one cannot half-apply. Reuse the ownership-transfer pattern already established for organisations rather than inventing a second.
- **Authorization is the module's own.** Listing standing in a module requires standing in that module, or org-level administration. It is not a global settings permission — that would make every module's roster readable by anyone holding a settings key.
- **No new permission catalog file.** Keys live in the existing per-module catalog folders on both sides. A key that exists on only one side is inert, so both catalogs move together.
- **Route ownership follows the product contract.** Module standing is module configuration, so it lives under the module's own settings, not global `/settings/*`.

## Testing Decisions

**What makes a good test here.** Assert on what an actor may see and do, never on how standing was derived. The prior art is the RBAC resolution and grantability specs, which already test allow/deny tables per actor — extend that shape rather than starting a new one.

- **Standing enumeration** — a module owner, a module admin, an org admin, an org owner and an unrelated member each list a module's standing; assert the roster and the refusals. This is the allow/deny table the existing specs use.
- **Read/write agreement is the load-bearing test.** For a matrix of actor ranks and scopes, assert that every grant `describeGrantable` offers is accepted by the writer, and every grant it omits is refused. This is the one test that cannot be replaced by testing the two sides separately — it is the reason they share a predicate.
- **Ceiling enforcement** — a module admin cannot grant module-owner standing; a `team`-scoped holder cannot grant `all`. Both already have write-side coverage; add the read-side assertion beside it.
- **Ownership transfer** — the new owner holds standing and the old one does not, in one transaction. Note the `db.transaction` mock trap: a bare `jest.fn()` never invokes its callback, so every assertion inside it silently passes.
- **Cross-tenant isolation** — standing in one organisation is invisible from another, and a person in both sees only the current one's.
- **Controller e2e** — auth, RBAC and scope allow/deny per route. These run only under the e2e command; they are not part of the default suite.

## Out of Scope

- Custom role authoring beyond the existing `MODULE_CUSTOM` rank.
- Time-bounded or approval-gated standing.
- Changing what any module's permission keys mean.
- The employee self-service surface, which is universal by design and carries no module standing.

## Further Notes

The engine here is better than the screens on top of it, which is why this reads as a gap rather than a defect. The user-facing symptom — "I own HR but cannot see who is in it" — has a structural cause: the ladder was built to be *enforced* and was never given a way to be *described*.

Worth stating plainly: the RBAC vision as originally described is substantially already implemented. This spec adds the missing read, and nothing here requires reworking the model.
