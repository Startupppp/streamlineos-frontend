# PRD — One answer to "which permission keys does this module own"

Status: COMPLETE — 2026-08-23
Date: 2026-08-23
Scope: candidates C1, C2 and C3 from the 2026-08-23 access and authority review
Sequenced before: the module owner/admin/member ladder PRD (2026-08-20), which cannot safely onboard eight more modules until this lands

## Completion checklist

Verified line by line against the code, not against intent. Backend `1d0ff797`, `03fa6a4f`, `dfbae6d5` (+ `7df8b3f2`, which a concurrent session swept one file into); root `e34546e50`, `cd4d349dc`.

### Implementation Decisions

- [x] **One implementation, and the others are deleted.** Both private `moduleOf` copies gone; the inline `startsWith(\`${moduleKey}:\`)` in `getCallerPermissions` gone; `permission-catalog-sync` no longer persists a naive first-segment `module_key`. The three surviving `split(":")[0]` sites ask different questions (org-only namespace; membership-in-namespaces; not module ownership).
- [x] **A module's namespaces include its own.** `namespacesForModule` returns `[moduleKey, ...extras]`. Home: 29 keys from every implementation, was 2/27/29/29/2.
- [x] **Key strings do not change.** No `name:` line in the permission catalog altered.
- [x] **Adding a module stays a configuration change.** One entry in `ADDITIONAL_MODULE_NAMESPACES`.
- [x] **The bar moves into permission resolution.** Ownership expansion filtered by `isDelegablePermission`.
- [x] **The bar applies to the expansion, not the structural principals.** Org owner and org admin return `allCatalogScopes()` before the expansion runs.
- [x] **This generalises beyond the one key that exposes it.** Written against the predicate, not the key.
- [x] **Both rungs derive from standing.** `view` = the module's view key **or** management standing; `manage` = standing. Covered by four cases incl. org admin holding no key.
- [x] **The assertion wrappers collapse.** One policy (`assertModuleAccessPolicy`), one precondition (`assertModuleEnabled` → `assertManagedModule`), one deps factory; both duplicate `assertKnownModule` copies deleted. The per-service wrappers are now DI adapters only.
- [x] **The caller-permissions endpoint uses the shared answer.** Slices with `administeringModuleOf`.
- [x] **Grants still never manufacture management authority.** Preserved; pinned by "forbids a functional member even when an effective grant contains manage".
- [x] **Ownership lifecycle authority is unchanged.** Still `canTransferModuleOwnership`; module admin still refused.
- [x] **Template changes are inert without a backfill.** Migration `0450`.
- [x] **The backfill adds, never removes.** `INSERT … ON CONFLICT DO NOTHING` only.
- [x] **Every change bumps the permission version.** `0450` bumps `access_versions` in the same migration.
- [x] **Home gets its access route.** `/home/access`, the same six-line adapter as the other thirteen.
- [x] **No other frontend change.** Route plus two test files.
- [x] **No additional per-request queries.** The `view` rung now checks the cached permission set before any DB call, so a key-holder costs one query fewer than before.
- [x] **No new cache keys and no new wildcard scans.** None added.

### Testing Decisions

- [x] **The primary seam is the controller.** Extended `module-access.controller.e2e-spec.ts`. **Amended:** that harness stubs both services, so asserting authority there would assert the mock. Routing, auth and refusal propagation are covered at the controller; the authority decisions are covered at the service, where the decision is actually made.
- [x] **The end-to-end suite was actually run.** 48/48. Needs a 10GB heap — `test:e2e:ci` sets 6GB and OOMs on app boot.
- [x] **The two default-run specs are retained.** `home-surfaces-universal.spec.ts` passes. `module-standing.spec.ts` retargeted from the dead four-level `resolveModuleStanding` onto the live `resolveModuleManagementStanding`, and now covers the read rung.
- [x] **All twelve controller cases covered**, distributed across the correct seams.
- [x] **Regression coverage for the working modules.** Every Home case has an `hr` control alongside it.
- [x] **Backfill coverage.** Migration and templates pinned to each other.
- [x] **Both known traps avoided.** Transaction mocks invoke their callbacks; the e2e suite was executed, not merely extended.

### Amended during implementation

- **`resolveModuleStanding` was deleted, not promoted.** The spec said the four-level answer becomes the module's whole interface. Its only candidate consumer was `getCallerPermissions`, and routing it through collapsed four independent facts into one precedence-ordered source — which flipped `isModuleOwner` to false for an org owner who also owns the module, breaking the web app's ownership tab. A test caught it. The four-level shape has no correct consumer, so it went; `resolveModuleManagementStanding` is the one interface both rungs use.
- **The backfill also grants `HOME_MODULE_MEMBER`.** The spec said owner and admin. `buildModuleMemberPermissionKeys` filters to `:view`/`:read`, so every other module's member role already holds `<module>:access:view`; omitting Home's would diverge new orgs from existing ones.

## Problem Statement

The product model says an organization owner appoints a module owner, and that owner runs their module — appoints admins, adds members, and grants each person the screens and actions they need. That model is built on one question, asked constantly: **does this permission key belong to this module?**

Five different pieces of code answer it, and they disagree.

Home is where the disagreement is visible, because Home is the one module that administers namespaces other than its own — it owns chat, mail, calendar and notifications, so that those three communication surfaces are administered by one ladder rather than three. Measured against the live catalog of 673 keys, the five answers for Home are: 2 keys, 27 keys, 29 keys, 29 keys, and 2 keys.

Three consequences, all of them live today.

**A Home module owner cannot administer anything.** The catalog endpoint that fills the permission picker uses the 2-key answer, so the picker offers a module owner their own two access keys and nothing else. Every attempt to grant a chat, mail, calendar or notification permission through the module role editor is rejected as an unknown key for that module. The rung exists and has nothing to hand out.

**A Home module owner cannot open their own module.** The read routes on the access surface — the catalog, the role list, the group list, the member list, the audit log — are gated on an action called `view`, and `view` resolves authority in a completely different way from `manage`. `manage` asks what the person's standing is. `view` looks for a literal permission key named after the module. Module owners of the other thirteen modules pass that check only because their seeded role happens to contain a key that starts with the module's own name. Home's seeded role does not, because the 27-key answer forgets Home's own namespace. Two mechanisms answering one question, agreeing by coincidence of naming.

**Appointing a Home module owner hands out organization-wide chat settings.** Organization-wide chat settings are meant to be the organization owner's and organization admins' alone, and that is enforced on every grant path. Module ownership is not a grant path — it is a resolution path — and it expands an ownership record into every key the module owns, at the widest scope, with no filter. So the one key the product most wants to withhold is handed to a module owner by the act of appointing them. The repository already knows this: a spec asserts the opposite, explains this exact failure mode in its own docstring, and is **the single failing test in a backend suite of 4,374**.

For a developer or coding agent the problem is worse than any one of these. Asked "does this key belong to this module", there is no single place to look, and picking the wrong one produces code that is right for thirteen modules and wrong for the fourteenth — which is exactly how all three defects were written.

## Solution

One module answers the question, and it answers it completely.

The permission-namespace vocabulary becomes the only implementation. The competing copies are deleted rather than kept in agreement, because a rule enforced by four cooperating implementations is a rule that a fifth implementation can walk around — and one already has. A module's namespaces include its own, so the answer stops depending on whether a module happens to administer namespaces beyond itself.

The rule that certain keys are never delegated moves from the grant paths into permission resolution. Delegability is already a property of the key rather than of the actor, so resolution is where it belongs. Once the resolver will not produce an organization-only key for a non-structural principal, no future grant source can leak one — the unsafe state stops being guarded and becomes unrepresentable.

Module authority gets one interface. A consumer asks what this person's standing is in this module and gets owner, admin, member or none, and both the read and the write rungs derive from that single answer. That function already exists and is already tested; nothing in production calls it.

From the outside the result is small and specific: a Home module owner can open the Home access screen, can grant chat, mail, calendar and notification permissions to their people, and does **not** receive organization-wide chat settings by virtue of being appointed. Every other module behaves exactly as it does today.

## User Stories

1. As an organization owner, I want to appoint a Home module owner, so that I do not have to administer chat, mail and calendar myself.
2. As an organization owner, I want appointing a module owner to grant exactly the authority I intended, so that delegation does not over-privilege.
3. As an organization owner, I want organization-wide chat settings to remain mine and my administrators', so that a module owner cannot reconfigure the organization.
4. As an organization owner, I want to reclaim a module from its owner, so that appointment is reversible.
5. As an organization owner, I want the Home ladder to behave like the other thirteen, so that I do not have to learn an exception.
6. As an organization admin, I want the same module-administration rights the owner has, so that administration is not blocked when the owner is away.
7. As an organization admin, I want to open any module's access screen, so that I can audit who has what.
8. As a module owner, I want to open my module's access screen, so that I can see and change who works inside my module.
9. As a module owner, I want the permission picker to offer every permission my module owns, so that I can grant what my people actually need.
10. As a Home module owner, I want the picker to offer chat, mail, calendar and notification permissions, so that the ladder is usable at all.
11. As a module owner, I want to create a role group in my module and attach permissions to it, so that I can describe a job rather than a list of keys.
12. As a module owner, I want to attach specific permissions to one person, so that they get exactly the screens they need.
13. As a module owner, I want to scope a grant to the holder's own records, so that people see only what concerns them.
14. As a module owner, I want my authority to stop at my module's boundary, so that I cannot accidentally affect another module.
15. As a module owner, I want to see every person who has access to my module and how they got it, so that I can audit it.
16. As a module owner, I want to read my module's access audit log, so that I can explain who changed what.
17. As a module owner, I want to transfer ownership of my module, so that a departure does not orphan it.
18. As a module admin, I want to manage members and grants but not ownership, so that the rungs stay distinct.
19. As a module admin, I want to open the access screen I administer, so that the read and write rungs agree about who I am.
20. As a module member, I want to see only the screens I have been granted, so that navigation is not full of dead ends.
21. As a member with no module grants, I want Home surfaces to keep working, so that I can still do my job.
22. As a member with no module grants, I want to keep receiving my own notifications and seeing my own calendar, so that consolidation does not remove what is universal.
23. As an employee, I want my self-service surfaces to keep working regardless of module grants, so that I can always see my own leave, pay and documents.
24. As a chat user, I want to read and post in my channels with a plain member grant, so that chat is usable without administration rights.
25. As a chat user, I want huddle moderation to remain delegatable, so that moderating a conversation is not confused with reconfiguring the organization.
26. As a security reviewer, I want a permission grant never to manufacture management authority, so that holding a manage key is not the same as being an admin.
27. As a security reviewer, I want an organization-only key to be unobtainable through any path including module ownership, so that the restriction is structural rather than a list of guarded doors.
28. As a security reviewer, I want the read rung and the write rung to resolve authority the same way, so that they cannot drift apart.
29. As a security reviewer, I want a cross-tenant module key or member id to return not-found rather than forbidden, so that the API is not an existence oracle.
30. As a security reviewer, I want hidden controls to still fail closed in the handler, so that hiding is cosmetic and the guard is the boundary.
31. As a security reviewer, I want every access change to bump the permission version in the same transaction, so that a stale cache cannot serve revoked access.
32. As a security reviewer, I want the change to widen nobody's access, so that a correctness fix is not also a privilege grant.
33. As a developer, I want one function that answers whether a key belongs to a module, so that I cannot pick the wrong one.
34. As a developer, I want the competing implementations deleted rather than kept in sync, so that a sixth cannot appear.
35. As a developer, I want a module's namespaces to include its own, so that the answer does not depend on whether the module administers anything beyond itself.
36. As a developer, I want one interface for module standing, so that I do not have to know which of two mechanisms a given rung uses.
37. As a developer, I want permission key strings to stay exactly as they are, so that stored grants keep resolving.
38. As a coding agent, I want the namespace rule stated once in the repository rules, so that my next task does not re-litigate it.
39. As a coding agent, I want adding a module to be a configuration change, so that the nineteenth module costs almost nothing.
40. As a QA engineer, I want allow and deny cases for both rungs on the module that exposes the defect, so that coverage is not just the thirteen that already worked.
41. As a QA engineer, I want the currently failing spec to be the regression net for the organization-only rule, so that the fix is proven by the test that caught it.
42. As a QA engineer, I want the standing tests to exercise the code production runs, so that a green suite means something.
43. As a QA engineer, I want cross-tenant isolation covered on the changed routes, so that a correctness fix is not a new hole.
44. As an operator, I want no additional per-request database queries, so that cost does not rise.
45. As an operator, I want a backfill for organizations that already exist, so that the fix is not inert everywhere it matters.
46. As an operator, I want the change to need no data migration beyond that backfill, so that it ships without a maintenance window.
47. As an operator, I want existing role grants left alone where they are already correct, so that an owner's earlier revocation is not silently restored.

## Implementation Decisions

### The namespace question

**One implementation, and the others are deleted.** The permission-namespace vocabulary in the shared RBAC layer becomes the only answer to "does this key belong to this module". The two private copies inside the module-access services and the inline prefix comparison inside the caller-permissions method are removed and their call sites import the shared one. Deleting them is the point: an invariant maintained by five cooperating implementations is not an invariant, and no test that asserts they agree is as good as not having five.

**A module's namespaces include its own.** The mapping currently returns only the *extra* namespaces a module administers, so a module that administers others loses itself. This is the root cause of the 27-versus-29 discrepancy and of a Home module owner being unable to open their own screen. The shape of the decision:

```
namespacesForModule("hr")   → ["hr"]
namespacesForModule("home") → ["home", "chat", "mail", "calendar", "notifications"]
```

**Key strings do not change.** Ownership is expressed by the mapping, never by renaming a key — a rename breaks every grant already stored against it. `chat:*` keys stay `chat:*` and are owned by Home.

**Adding a module stays a configuration change.** After this, a new module that administers extra namespaces is one entry in the mapping, with no code path to update.

### The organization-only bar

**The bar moves into permission resolution.** Module ownership expands an ownership record into every key its module owns. That expansion must not produce a key that is barred from delegation. The existing predicate that decides delegability takes no actor precisely because delegability is a property of the key, so the resolver is the correct home for it.

**The bar applies to the expansion, not to the structural principals.** Organization owners and organization admins reach the full catalog before this expansion runs, so barring the key inside the expansion withholds it from module owners without touching the two standings that are supposed to hold it.

**This generalises beyond the one key that exposes it.** Today exactly one key and one namespace are organization-only. The fix is written against the predicate, not against the key, so a future organization-only key is covered on the day it is added.

### Module standing

**One interface for module authority.** The four-level resolution — owner, admin, member, none — becomes the module-access module's whole answer to "what may this person do here". It already exists, already carries the rules table that states what each standing may do, and is already unit-tested; production simply does not call it.

```
type ModuleStandingLevel = "owner" | "admin" | "member" | "none"
```

**Both rungs derive from standing.** `manage` requires a standing that may manage access. `view` is satisfied by a standing of admin or above, **or** by holding the module's view key — so the key keeps working as a way to grant read-only access administration to someone with no standing, which is its documented purpose, while a module owner is no longer refused a screen they can already write to.

**The three assertion wrappers collapse to one.** The module-access service, the groups service and the ownership gate each wrap the same policy; the ownership gate additionally re-implements the module-enabled precondition by hand. One wrapper, one precondition, one policy.

**The caller-permissions endpoint uses the shared answer.** It currently derives both the permission slice and the authority facts its own way. It reports the standing it is given and slices with the shared namespace answer.

**Grants still never manufacture management authority.** Holding a module's manage key permits viewing access administration. Changing roles, permissions, members or ownership continues to require being a module owner, module admin, organization admin or organization owner. This is existing behaviour and is preserved explicitly, because it is the property that stops a grant becoming a back door.

**Ownership lifecycle authority is unchanged.** Transferring module ownership stays with the module owner and the organization owner. Organization admins and module admins do not inherit it.

### Reaching organizations that already exist

**Template changes are inert without a backfill.** System roles are granted at role *creation*, and a re-seed deliberately does not touch an existing role's grants, so that an owner's revocation is never silently restored. Correcting what the Home owner and admin templates contain therefore reaches new organizations only. This work ships a backfill migration that adds the two missing access keys to the existing Home owner and admin roles, following the shape of the previous backfill of this kind.

**The backfill adds, never removes.** It grants the two keys where absent and touches nothing else, so an intentional revocation elsewhere survives.

**Every change bumps the permission version in the same transaction.** Both the backfill and any runtime write invalidate resolution for the affected organizations, or a cached set serves the old answer.

### The user-visible surface

**Home gets its access route.** Thirteen of the fourteen access-managed modules have a page; Home is the missing one, which is why none of this was noticed. The route is the same six-line adapter over the existing shared access page that the other thirteen use — no new component, no per-module variant. This is the one frontend change in scope, and it is what makes the rest of the work observable to a user rather than only to a test.

**No other frontend change.** The access screen, the navigation model and the permission picker already read the API and need no edit.

### Cost

**No additional per-request queries.** The namespace answer is computed from compile-time constants; standing resolution already runs on the paths that need it and is not added to any path that does not.

**No new cache keys and no new wildcard scans.** Existing keys stay tenant-scoped and version-scoped.

## Testing Decisions

**A good test here states who the caller is, what they attempted, and what came back.** It asserts the response and the resulting access — not which tables were read, in what order, or how many queries ran. The query strategy is exactly what this work is free to change; a test that fails when an implementation is deleted is testing the implementation and should be rewritten. This is the same standard the two 2026-08-20 specs set, and the reason the two currently-red frontend RBAC tests are being treated as defects in the tests rather than in the code.

**The primary seam is the controller.** This is the highest available seam and the codebase has extensive prior art — more than a dozen controller-level end-to-end specs, including ones covering the module access surface, the permission guard, ownership and entitlements. New coverage goes there, extending the existing module-access controller spec rather than starting a new file.

**End-to-end specs are excluded from the default test run.** They execute only under the dedicated end-to-end command, so adding a case is not the same as adding executed coverage. This work is not done until that suite has actually been run and its result reported.

**Two existing default-run specs are retained as the fast net**, because they catch the two invariants that matter most and they catch them in the pass that runs every time:

- The universal-Home-surfaces spec, which currently fails, is the regression net for the organization-only rule. It should pass unchanged — if it needs editing, the external behaviour changed and that needs justifying.
- The module-standing spec already covers the full four-level answer. Today it is the only consumer of that function; after this work it covers the code production runs, which converts a dead spec into the ladder's regression net. Extend it to cover the read rung as well as the write rung.

**Controller cases to cover, on Home and on one already-working module as the control:**

- Organization owner and organization admin can view and manage the module's access.
- Module owner can view the catalog, the role list, the group list, the member list and the audit log — the case that fails today for Home.
- Module owner can manage groups, members and grants, and can transfer ownership.
- Module admin can manage members and grants, and cannot transfer ownership.
- A person holding only the module's manage key can view access administration but cannot change it.
- A person with no standing receives a refusal.
- The catalog endpoint returns every key the module owns, including the namespaces it administers beyond its own.
- A grant of a key from an administered namespace succeeds; a grant of a key from another module is refused.
- A module owner's access snapshot does not contain the organization-only chat settings key, and a route gated on that key refuses them.
- An organization owner's and an organization admin's access snapshot still contains it.
- A cross-tenant module key or member id returns not-found, not forbidden.
- Home surfaces and the knowledge base remain reachable for a member with zero module grants.

**Regression coverage for the thirteen working modules.** Their existing specs are the net. The control module in each case above exists to prove this work changed nothing for them.

**Backfill coverage.** Assert that an organization seeded before the change ends up with the two keys on its Home owner and admin roles, and that an unrelated revoked grant is not restored.

**Two traps previously hit in this repository.** A transaction mock must invoke its callback, or every assertion inside it silently passes without running. And the end-to-end suite must be run explicitly, per above.

## Out of Scope

- Candidates C4 through C12 from the 2026-08-23 review. The duplicated rank resolvers and the incomplete parallel resolver (C4, C5) are the natural next spec and are both deletions; the ownership transfer lifecycle (C6, C7), email canonicalisation (C8), the scope-fallback seam (C9), the source-text RBAC tests (C10), the invitation state machine (C11) and the custom-role governance question (C12) each stand alone.
- Extending the ladder to the eight modules named in the 2026-08-20 ladder PRD. That work depends on this one and follows it.
- The per-request transaction reduction from that same PRD. Unchanged here, and this work adds no transactions.
- Materialising the `team` data scope. The correlated teammate lookup remains; no call site supplies pre-fetched team ids today and none is added.
- The duplicate access-snapshot route. There are two endpoints serving the same snapshot; retiring one belongs with C5.
- Any change to organization-level role semantics. Owner, organization admin and member keep their current meanings.
- Making Home or the knowledge base permission-gated as *surfaces*. They stay universal for every active member; this spec concerns administration inside Home, which is a different thing and is deliberately delegatable.
- Unifying how module owner and module admin are *stored*. Ownership stays a lifecycle record and admin stays a ranked role assignment; only their resolution is unified, exactly as the 2026-08-20 ladder PRD decided.
- Any data migration beyond the additive role-grant backfill.

## Further Notes

**Measured, 2026-08-23, against the live catalog of 673 permission keys.** The five implementations that answer "does this key belong to this module", and what each returns for Home:

| Implementation | Home |
|---|---|
| Shared namespace vocabulary, used by role seeding | 27 |
| Shared namespace-owner lookup, used by grantability | 29 |
| Private copy in the module-access service | 2 |
| Private copy in the module-access groups service | 29 |
| Inline prefix comparison in the caller-permissions method | 2 |

The 27 differs from the 29 by exactly the two keys Home owns in its own namespace. The two 2s are the naive first-segment slice.

**Verification baseline at the time of writing.** Both repositories typecheck clean. The backend import graph has zero cycles across 3,296 files. The backend suite is 4,340 passing with one failure, and that failure is the organization-only chat settings assertion this spec fixes. The frontend suite is 388 passing with four failures, none of which is a defect in the code — three are tests that assert against source text or against a payload field a recent refactor deliberately removed, and one is outside this area. Lint and the end-to-end suite were not run.

**Why Home is the module that exposes this.** Home is the only module that administers namespaces other than its own. Every other module's keys begin with its own name, so the naive first-segment slice happens to be right for thirteen of fourteen — which is precisely the condition under which a wrong implementation survives review.

**Why the missing access page matters as evidence.** Home is also the only access-managed module with no route on the web app. The backend registered Home in the managed set, the catalog filter could not serve it, the role templates did not grant its access keys, and no page was ever built. Four symptoms, one cause.

**The organization-only expansion is not hypothetical.** The failing spec's own docstring states the mechanism: barring the key from the grant paths is not enough on its own, because this expansion never passes through them. The intent shipped and the enforcement did not — the test was written and left red.

**One thing deliberately left alone.** The caller-permissions endpoint requires only active membership, with no access-policy check, because it reports the caller's own standing. That is correct and is not changed here; it is noted because it is the fifth site that derives module authority and a reader may expect it to be gated.
