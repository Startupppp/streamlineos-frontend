# PRD — One registry answers "what is a module"

Status: ready-for-agent
Date: 2026-08-23
Scope: candidate C9 from the re-verified 2026-08-20 architecture review (`architecture-review-20260820-2.html`), found while verifying candidate C2
Supersedes: the module-access ladder PRD (2026-08-20) in full — both of its premises were disproved; see Appendix
Sequenced after: the access version channel PRD (2026-08-23)
Sequenced before: adding any nineteenth module, and before any further module-namespace work

## Problem Statement

"Module" is the product's central organising idea. It decides what a plan sells, what an organization can enable, who can be appointed to run something, which permissions exist, and which screens appear in navigation.

There is no single definition of it. There are four, they are held in four places, they disagree with each other in both directions, and nothing forces them to agree.

- **The plan catalog** lists twelve keys — the modules a subscription gates.
- **The access-managed list** names thirteen — the modules with an owner, admin and member ladder.
- **A namespace map** says that one module administers the permission namespaces of four others.
- **The enabled-modules projection** stores the same keys in a different case, and the module guard lowercases at the boundary to compensate.

Compare the first two and the disagreement is immediate. Knowledge Base and Chat are gated by a plan but have no ladder. Workflows, Blog and Directory have a ladder but are not gated by a plan. Neither difference is written down anywhere as a decision; both are visible only by reading two arrays side by side.

The namespace map is worse. It routes Chat, Mail, Calendar and Notifications to an administering module called `home`, on the reasoning that the communication surfaces should be administered together rather than three times over. Home's access ladder was then built and — correctly, on the rule that Home and employee self-service are platform core rather than a delegable entitlement — retired again. The map was not updated. So today the platform's answer to "who administers a chat permission" is a module that appears in no catalog, has no access keys and has no screen. That answer is written into the permission catalog table's module column on every sync, for every chat, mail, calendar and notification permission in the product.

This class of defect has already reached production once from the same root: the case mismatch between the enabled-modules projection and the lowercase catalog made module gates throw for every non-owner across more than a dozen modules until a translation was added at the guard.

For an organization owner, the symptom is a module that cannot be delegated with no stated reason. For a developer or coding agent, the symptom is that adding a module means editing four lists, and forgetting the fourth produces a not-found that surfaces weeks later in someone's browser.

## Solution

One registry, keyed by module, holding every fact about that module in one entry. The four lists stop being independent declarations and become derived views over it.

A module's entry states, in one place: its stable identifier, its display name, whether a plan gates it, whether it has a delegation ladder, whether it is universal to every active member, and which permission namespaces it administers. Everything downstream — the plan catalog, the managed-access list, the namespace map, the permission catalog sync, navigation, the module guard — reads the registry rather than its own array.

Because every fact lives on one entry, the identifier type is generated from the registry. A module that omits a required fact is a type error at build time rather than a not-found in production. Adding the nineteenth module becomes adding one entry.

The registry also forces the questions that are currently unasked to be answered explicitly and visibly: is Knowledge Base delegable or not, is Chat plan-gated or universal, and does `home` administer four namespaces or does nothing. Each becomes a written value with a reason beside it instead of an absence inferred from two arrays.

From the outside: nothing changes today except that Chat, Mail, Calendar and Notification permissions stop being catalogued against a module that does not exist. What changes tomorrow is that a module's behaviour is discoverable in one read.

## Goals

- Exactly one declaration of what modules exist and what is true of each.
- The plan catalog, the access-managed list and the namespace map are derived, not authored.
- The module identifier type is generated from the registry, so an incomplete module cannot compile.
- The `home` namespace mapping is resolved to a stated decision, and whatever the decision is, one place expresses it.
- The case mismatch between the stored projection and the catalog is handled in one translation, not per guard.
- No change to which permissions exist, who holds them, or which modules are enabled for any existing organization.

## Non-Goals

- Extending the delegation ladder to more modules. That was the previous PRD's goal and it is not this one's; see the Appendix.
- Making Home, Chat, Mail, Calendar or Notifications permission-gated surfaces. They stay universal for every active member.
- Renaming any module key already stored in a grant, an enablement row or a permission record.
- Changing plan tiers or what any plan includes.
- Building a runtime module system. This is a static registry, not plugin loading.

## User Stories

1. As an organization owner, I want every module I can see to have a stated reason for whether it can be delegated, so that "you cannot appoint an owner for this" is a decision rather than an oversight.
2. As an organization owner, I want the modules my plan includes to match the modules I can enable, so that billing and capability agree.
3. As an organization owner, I want a module I enable to appear consistently in navigation, permissions and access administration, so that enabling it is one action with one result.
4. As a module owner, I want the permissions I can grant to be the ones my module actually administers, so that the access screen shows me a complete and correct set.
5. As a module owner, I want a permission namespace my module administers to be listed under my module, so that I am not sent to the organization roles screen for something I own.
6. As a member, I want the universal surfaces — Home, chat, mail, calendar, notifications — to keep working regardless of which paid modules my organization has, so that I can do my own job.
7. As a member, I want a module my organization has not bought to be absent rather than broken, so that I am not shown a dead link.
8. As a platform admin, I want the set of modules to be enumerable from one place, so that I can audit what the platform sells.
9. As a platform admin, I want a module's plan gating to be visible without reading two arrays, so that I can answer an entitlement question directly.
10. As a developer, I want adding a module to be adding one entry, so that I cannot half-add one.
11. As a developer, I want the compiler to reject a module that declares no ladder policy, so that the omission is caught before review.
12. As a developer, I want to ask "does this module have a ladder" and get one answer, so that I do not have to know which of four lists is authoritative for my question.
13. As a developer, I want "which module administers this permission key" to have one implementation, so that the catalog sync, the access screen and the guard cannot disagree.
14. As a developer, I want the uppercase-versus-lowercase translation to happen once at the storage boundary, so that no guard has to remember to lowercase.
15. As a coding agent, I want a module's facts co-located, so that a task like "add Workflows to the access ladder" does not require discovering three other files by inference.
16. As a coding agent, I want the registry to be the thing I read when a task mentions a module, so that I do not have to guess which array to edit.
17. As a security reviewer, I want the administering module of every permission key to resolve to a module that exists, so that a permission cannot be catalogued against a ghost.
18. As a security reviewer, I want universal surfaces to be declared universal rather than inferred from absence, so that "no ladder" and "everyone gets it" are distinguishable.
19. As a support engineer, I want to explain why a customer cannot delegate a module, so that the answer is a product decision rather than "it is not on the list".
20. As an operator, I want a module added to the platform to appear in the permission catalog sync automatically, so that a deploy does not need a manual follow-up.
21. As a QA engineer, I want a test that every module in the registry is consistent across every derived view, so that drift is a failing build rather than a bug report.
22. As a QA engineer, I want a test that every permission key's administering module exists in the registry, so that the `home` class of defect cannot recur.

## Implementation Decisions

### The registry shape

A record keyed by module identifier. Each entry carries at minimum:

```
{
  id,                    // stable, lowercase, never renamed once granted against
  displayName,
  planGated,             // does a subscription gate it
  ladder,                // 'delegable' | 'universal' | 'platform-admin'
  administersNamespaces, // permission namespaces this module owns beyond its own id
}
```

The `ladder` field is a three-valued decision rather than a boolean, because "no ladder" currently conflates two very different things: *universal* (every active member has it; there is no membership to appoint) and *platform-admin* (organization administration, governed by settings permissions, not delegable to a module owner). Billing is the second; chat is the first. A boolean cannot express that, which is part of why the distinction was never written down.

### Derived views replace the authored lists

- The plan catalog becomes the entries where `planGated` is true.
- The access-managed list becomes the entries where `ladder` is `delegable`.
- The namespace map becomes the union of `administersNamespaces` across entries, built once at module load.
- The module identifier union type is derived from the registry keys.

The existing exported names should be kept as the derived values so that call sites do not all have to change at once. The migration is: registry lands, lists become derived, call sites move opportunistically.

### The `home` decision must be made, not deferred

The map is not an accident, and the history matters when choosing. The phase-one ticket set recorded the decision explicitly — *"Chat, mail, calendar and notifications are Home. One ladder, one access screen. Keys keep their namespaces; `namespacesForModule` maps Home to them."* That ladder was then built and, days later, deliberately retired on the rule that Home is universal, with the accompanying vocabulary *"universal means ungated, not defaulted"*. The map is the residue of a decision that was made, implemented, and reversed — only the reversal did not reach it.

Two acceptable outcomes, and the work must pick one explicitly rather than leaving the map pointing at a ghost:

- **`home` is a real registry entry** with `ladder: 'universal'` and `administersNamespaces: [chat, mail, calendar, notifications]`. The permission catalog's module column then names a module that exists, and a future universal-surface administration screen has somewhere to hang. This is the smaller change and preserves the reasoning that put the map there.
- **`home` is deleted from the map.** Chat, mail, calendar and notification permissions then administer themselves, are catalogued under their own keys, and are granted from the organization roles screen. This matches the retirement commits' stated intent most literally.

The first is recommended: it keeps the grouping decision that was deliberately made, while removing the ghost. Whichever is chosen, the permission catalog sync must be re-run so the stored module column matches, and the change must be verified against existing grant rows rather than assumed.

### Case translation lands once

The stored enablement projection keeps its uppercase values — they are persisted and renaming them is out of scope. The registry owns the translation, and the module guard stops doing it inline. One function, one place, tested.

### Ordering constraint

This work reads the access path on every request through the entitlement check. It should land **after** the access version channel PRD, so that the registry's reads ride a path that is already cheap.

## Testing Decisions

A good test here asserts that the derived views agree and that no permission escapes the registry. It does not assert the literal contents of any array — that would pin the very duplication being removed.

**Seam 1 — the registry module's own interface.** This is the highest and, for most of this work, the only seam needed:

- Every derived view contains exactly the entries whose facts justify it, computed from the registry rather than compared to a literal list.
- Every permission key in the catalog resolves to an administering module that exists in the registry. This is the test that would have caught the `home` ghost, and it is the single most valuable assertion in this spec.
- Every namespace claimed by `administersNamespaces` is claimed by exactly one module — no namespace administered twice.
- Case translation round-trips: a stored projection value maps to a registry identifier and back.
- A module marked `universal` has no ladder permissions generated for it; a module marked `delegable` has exactly the view and manage keys.

**Seam 2 — the existing controller e2e harness, for regression only.** The module-access controller e2e specs already assert that an unmanaged module returns not-found and a managed one does not. They must keep passing unchanged. Their job here is to prove the derived list is the same list, not to test the registry.

Prior art: the existing module-namespace ownership specs, which already iterate the access-managed list and assert a property per module — that iteration pattern is exactly right and should be extended to iterate the registry instead. The organization setup service specs already assert that ownership is seeded only for managed modules; those should be repointed at the derived view.

Note that `e2e-spec` files run only under the e2e script and are excluded from the default suite, so registry invariants belong in unit specs where they execute on every run.

## Out of Scope

- Extending the ladder to any module that does not have one today. The registry makes that a one-line change later; making it is a separate decision with its own product reasoning.
- The Knowledge Base ladder question. The registry forces it to be *stated*; answering it is product work, and the current space/audience ACL model is a valid answer for now.
- **Billing is not an open question and must not be reopened.** The phase-one ticket set decided it: platform billing is never delegated, organization owner and admins only, and the grantability guard refuses the whole `billing:` namespace on every path including the owner's own. Billing joins the registry as `ladder: 'platform-admin'` and must not appear in the plan-gated or delegable derived views. A registry entry that put it in either is a defect, and the invariant tests should say so.
- Migrating any stored module key, grant row or enablement row.
- Navigation, which should read the registry eventually but does not have to in this change.
- Plan tier definitions and what each tier includes.

## Appendix — why the module-access ladder PRD is superseded

The 2026-08-20 module-access ladder PRD (`2026-08-20-module-access-ladder-prd.md`) was marked ready-for-agent and rests on two premises, both of which failed re-verification on 2026-08-23:

**Premise one — the access path fix.** Its first sequenced deliverable is "establish tenant context once per request and have the guard chain reuse it, collapsing the per-request transaction count from four to one". This cannot be built: the tenant context interceptor is a global interceptor and interceptors run after guards; the organization is not known until the authentication guard resolves it, so there is no earlier point; and the transaction helper is callback-scoped and cannot span the guard-to-handler boundary. It also would not have removed the cost, because the queries inside the transaction still run. Replaced by the access version channel PRD (2026-08-23).

**Premise two — the eight missing modules.** It specifies adding the ladder to Chat, Mail, Calendar, Notifications, Blog, Workflows, Directory and Billing, and sequences Chat, Mail and Calendar first as phase-one surfaces. Since it was written, the three genuinely delegable ones — Workflows, Blog and Directory — were added, and a Home ladder covering the communication surfaces was built and then deliberately retired on the rule that Home and the communication surfaces are platform core rather than delegable entitlements. The codebase reached the opposite conclusion to the PRD, and reached the right one. Adding ladders to Chat, Mail, Calendar and Notifications would now be building something four commits deliberately removed.

**On its measurement.** The four transactions and roughly 1,266 tuples it quotes were measured on 2026-08-20 and are superseded. The phase-one ticket set fixed the warm path and left behind a request-cost gate that measures as a non-owner and pins ceilings of roughly one tenant transaction per request — the handler's own. Neither figure should be quoted as current. What remains of that finding is a cold-path version poll whose real cost is cross-instance revocation staleness rather than throughput, specified in `2026-08-23-access-version-channel-prd.md`.

What survives from it: the product model it describes — owner appoints admins, admins scope members — is correct and unchanged, and the ten-module implementation it documents is the one still running. It is worth reading for that model. It is not worth executing.
