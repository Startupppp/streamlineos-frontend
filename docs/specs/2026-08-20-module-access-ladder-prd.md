# PRD — Module owner/admin/member ladder for every module

Status: ready-for-agent
Date: 2026-08-20
Scope: candidate C3 from the 2026-08-20 architecture review, extended to all modules
Supersedes: the "permission catalog drift" item, which did not survive verification (see Appendix B)

## Problem Statement

The product model is: an organization owner or admin appoints a module owner; that owner runs their module, appoints module admins and members, and grants those people the specific screens and actions they need. A member with no grants sees only Home and the Knowledge Base.

That model is built for ten modules and absent for eight. HR, CRM, Build, Accounting, Inventory, Support, Surveys, Payroll, Sign and Timesheets have a working access surface. **Chat, Mail, Calendar, Notifications, Blog, Workflows, Directory and Billing do not** — requesting their access surface returns a not-found, because the module is not on the managed list.

For an org owner this means eight modules they cannot delegate. They must either administer those modules personally forever, or hand out organization-admin rights, which grants far more than intended. There is no middle rung.

For a module owner it means the ladder stops early. They can be given Chat, but they cannot appoint a Chat admin or scope what a Chat member may do.

This has just moved onto the critical path: Chat, Calendar and Inbox are now phase-one surfaces, and three of the eight unmanaged modules are exactly those.

A second problem sits underneath it. Access resolution runs on every authenticated request, and it is the single largest source of database load in the product. Extending the ladder to eight more modules multiplies whatever that path costs. Measured on the current build, a trivial authenticated request that returns nothing but the caller's own token payload costs **4 database transactions and roughly 1,266 tuples read**. Adding modules to a path that expensive without fixing the path first would increase the bill for every request in the system.

## Solution

Two things, deliberately sequenced so the second does not multiply the first.

**Make the access path cheap.** Establish tenant context once per request and have the guard chain reuse it, instead of each access check opening its own transaction. Collapse the per-request transaction count from four to one, cut the round trips to the database, and lower both latency and the compute time the database is billed for.

**Then extend the ladder to every module.** Add the eight missing modules to the managed set so each gets the same owner, admin and member rungs, the same permission grants, and the same access screen that the existing ten already have. Home and the Knowledge Base stay universal and are deliberately excluded.

The user-visible result: every module can be delegated, every module owner can appoint and scope their own people, and the product gets faster and cheaper to run rather than slower and more expensive.

## Goals

- Every module except Home and Knowledge Base has an owner, admins, members and owner-authored permission grants.
- One shared implementation serves all modules; adding a nineteenth module is configuration, not code.
- Per-request database cost goes down, not up, despite the added surface.
- No regression to the ten modules that already work.

## Non-Goals

- Changing what the ten working modules already do, beyond what the shared implementation requires.
- Changing the organization-level roles. Owner, org admin and member keep their current meanings.
- Making Home or the Knowledge Base permission-gated. They stay universal for every active member.
- Granting access by being a payee. Contractors remain non-members with no module access.

## The Eight Modules

Chat, Mail, Calendar, Notifications, Blog, Workflows, Directory, Billing.

Three of these — Chat, Mail and Calendar — are phase-one surfaces and are sequenced first. Directory and Notifications carry cross-module read implications and are called out in Implementation Decisions. Billing is the most sensitive and is sequenced last.

## User Stories

1. As an org owner, I want to appoint a module owner for Chat, so that I do not have to administer chat myself.
2. As an org owner, I want to appoint a module owner for Calendar, so that scheduling policy has a responsible person.
3. As an org owner, I want to appoint a module owner for Mail, so that shared inboxes have an accountable administrator.
4. As an org owner, I want to appoint a module owner for each remaining module, so that no module is permanently stuck with me as its only administrator.
5. As an org owner, I want to delegate a module without granting organization-admin rights, so that delegation does not over-privilege.
6. As an org owner, I want to transfer module ownership to a different person, so that a departure does not orphan a module.
7. As an org owner, I want to remove a module owner, so that I can reclaim a module.
8. As an org admin, I want the same module-management rights as the owner, so that administration is not blocked when the owner is away.
9. As an org admin, I want ownership transfer to remain owner-only, so that the ownership lifecycle stays with the owner.
10. As a module owner, I want to appoint module admins, so that I can share the administrative load.
11. As a module owner, I want to add and remove module members, so that I control who works inside my module.
12. As a module owner, I want to create a permission grant and attach it to a specific person, so that they get exactly the screens and actions they need.
13. As a module owner, I want to scope a grant to the holder's own records rather than everything, so that people see only what concerns them.
14. As a module owner, I want to see every person who currently has access to my module and how they got it, so that I can audit it.
15. As a module owner, I want to see an audit trail of access changes in my module, so that I can explain who changed what.
16. As a module owner, I want my authority to stop at my module's boundary, so that I cannot accidentally affect another module.
17. As a module admin, I want to manage members and grants but not ownership, so that the rungs stay distinct.
18. As a module member, I want to see only the screens I have been granted, so that the navigation is not full of dead ends.
19. As a module member, I want controls I cannot use to be hidden rather than shown-and-failing, so that the interface does not mislead me.
20. As a member with no module grants, I want Home and the Knowledge Base to work fully, so that I can still do my job.
21. As a member with no module grants, I want no other module to appear in my navigation, so that I am not offered things I cannot open.
22. As an employee, I want my own self-service surfaces to keep working regardless of module grants, so that I can always see my own leave, pay and documents.
23. As a chat user, I want a module member to be able to read and post in channels they belong to, so that chat is usable with a plain member grant.
24. As a chat module owner, I want to control who may create public channels or manage org-wide chat settings, so that chat governance is not open to everyone.
25. As a calendar module owner, I want to control who may manage shared calendars and org-wide events, so that the shared calendar is not editable by all.
26. As a mail module owner, I want to control who may access shared inboxes, so that inbox access is deliberate.
27. As a directory module owner, I want people-directory reading to stay universal while administration is gated, so that the company directory does not disappear for ordinary members.
28. As a notifications module owner, I want personal notifications to keep working for everyone while template and policy administration is gated, so that nobody stops receiving their own alerts.
29. As a billing module owner, I want billing administration gated tightly, so that spend is not exposed org-wide.
30. As a developer, I want adding a module to the managed set to be a configuration change, so that the nineteenth module costs almost nothing.
31. As a developer, I want one shared access screen for every module, so that I do not maintain eighteen variants.
32. As a developer, I want the permission keys for a module to live in that module's catalog file, so that ownership of keys is obvious.
33. As a security reviewer, I want a module admin to be structurally unable to escalate outside their module, so that the boundary is enforced, not merely intended.
34. As a security reviewer, I want a permission grant to never manufacture management authority, so that holding a manage key is not the same as being an admin.
35. As a security reviewer, I want every access change to bump the permission version in the same transaction, so that a stale cache cannot serve revoked access.
36. As a security reviewer, I want hidden UI controls to still fail closed in the handler, so that hiding is cosmetic and the guard is the boundary.
37. As a security reviewer, I want cross-tenant access attempts to return not-found rather than forbidden, so that the API is not an existence oracle.
38. As an operator, I want per-request database transactions reduced, so that the database bill goes down.
39. As an operator, I want the access path to add no additional per-request queries when modules are added, so that cost does not scale with module count.
40. As an operator, I want cache invalidation to remain correct after the optimization, so that cheaper does not mean staler.
41. As an operator, I want the change to require no data migration, so that it ships without a maintenance window.
42. As a QA engineer, I want allow and deny cases tested for every rung on every module, so that coverage is not just the ten that already worked.
43. As a QA engineer, I want cross-tenant isolation tested on the new modules, so that the new surface is not a new hole.

## Implementation Decisions

### Access path cost — do this first

**Establish tenant context once per request.** Today the guard chain runs before the interceptor that establishes tenant context, so each access check opens its own transaction. Access resolution opens one in at least five methods and membership resolution in two more. Tenant context moves to the earliest point in the request lifecycle, and every guard and service reuses the ambient context instead of opening its own.

**Target: one database transaction per request.** Measured baseline on the current build is 3.2 to 4.0 transactions per authenticated request. The target is 1. This is the primary cost lever, because each transaction on the pooled Neon connection is a separate round trip sequence and the database is billed for compute time.

**No additional queries per module added.** Access resolution already loads a person's full grant set in one pass and caches it per person, per organization, per permission version. Adding modules must not add a per-module query. Module authority facts — is this person the owner, is this person an admin — are resolved from the already-loaded grant set rather than by querying per module.

**Cache keys stay version-scoped and tenant-scoped.** The existing pattern of keying on organization, person and permission version is retained, and every access mutation bumps that version inside the same transaction as the write. No new wildcard cache scans are introduced on the request path.

**Queries follow the existing tenant index discipline.** Every access query leads with the tenant column, selects only needed columns, and avoids per-row follow-up queries. Any list is paginated with the standard cap.

**Do not attempt prepared statements.** Prepared statements are disabled on this Neon driver, so statements are parsed and planned per execution — a meaningful share of the measured tuple reads are catalog reads from that. The lever is fewer statements and fewer transactions, not statement reuse.

### The ladder

**Extend the managed-module list; do not fork the implementation.** The API is already generic on the module key and the web interface is already one shared feature with thin per-module routes. Eight modules join the managed set and inherit both.

**Corrected 2026-08-20 — this is not configuration alone.** An earlier draft claimed adding a module was a configuration change. Verification showed the eight modules have almost nothing to delegate: chat has 4 permission keys, mail 4, directory 4, calendar 3, and blog has 1. Chat exposes 21 routes against those 4 keys. A ladder over that vocabulary exists but cannot express any distinction the product model requires — no way to say who may start a huddle, create a public channel, mint an invite link, or manage org chat settings.

**Therefore each module needs a real permission catalog authored before it joins the managed set**, derived from the endpoints it actually exposes. Four of the eight (notifications, blog, workflows, billing) additionally have zero role-template grants, so their default roles would come up empty.

**Move module-owned administration out of the global `settings:*` namespace.** This is the second reason the ladder cannot be used, and it was missing from an earlier draft of this PRD.

Twenty-eight routes across three modules gate module administration on the global settings namespace, so the authority cannot be delegated to a module owner without also granting organisation-wide settings authority:

| Routes | Gate | Assessment |
|---|---|---|
| Billing × 15 — checkout, add-ons, payment provider, profile, seats, referrals, coupons | `settings:manage` / `settings:view` | Over-broad. `settings:manage` is far wider authority than subscription management, and it blocks a billing owner entirely. |
| HR custom fields × 4 | `settings:custom-fields:manage` | **Contradicts root §8**, which states module-owned surfaces — custom fields, automations, integrations, data-hub — live in each module's settings, never global `/settings/*`. These belong on an `hr:` key. |
| Chat org settings × 1 | `settings:manage` | Blocks a chat owner from managing attachment limits, huddle caps and notification defaults. |
| HR org-structure compatibility × 8 — locations, teams | `settings:organization:manage` | **Leave as-is.** Organisation hierarchy is genuinely global administration under root §8, and this controller is a compatibility alias. Listed so it is not swept up by mistake. |

Twenty routes move to their owning module's namespace; eight stay. Note the risk this carries: `settings:manage` has previously been an accidental platform-wide superuser in this codebase, so narrowing what depends on it is a security improvement as well as a delegation one.

**Settle the key grammar first.** 53 catalog keys are two-segment rather than the documented `module:resource:action`, and use actions outside the permitted set (`read`, `write`, `use`, `report`). No validator enforces the grammar. Two-segment keys break the assumption that segment one is the module and segment two the resource — which is precisely how module-scoped grants, the module catalog filter and the access screen slice the catalog, and `build:*` is in this state today. Authoring eight new catalogs against an unsettled grammar means migrating them twice, so the grammar and its catalog test come first.

**Each module needs its own view and manage keys.** The paired access keys are generated per module from the managed list, so this follows automatically from adding the module.

**Keep the two rungs structurally distinct, and unify how they are resolved — not how they are stored.** Module owner stays a single lifecycle record; module admin stays a ranked role assignment. Both storage shapes are correct for what they model: exactly one owner per module, many admins. What is wrong today is that every consumer has to know both mechanisms and ask two questions, which is a significant reason the ladder was only ever built for ten modules — nothing forced a new module to acquire both rungs.

They are therefore brought under one resolution interface: a consumer asks one question — what is this person's standing in this module — and gets owner, admin, member or none. Storage is unchanged, so the ten working modules are not migrated, and the risk of this work is confined to adding modules rather than altering existing ones. Unifying storage remains possible later and is explicitly not attempted here.

**A grant never creates management authority.** Holding a module's manage key permits viewing access administration. Changing roles, permissions, members or ownership additionally requires being a module owner, module admin, org admin or org owner. This is existing behaviour and is preserved explicitly, because it is the property that stops a grant from becoming a back door.

**Writes stay confined to the module's own namespace.** A module admin editing permissions may only touch keys in their own module, and the grantable-subset check applies unchanged, so a module admin cannot grant themselves anything outside their module.

**Home and Knowledge Base are excluded by design.** They remain universal for every active member and are never added to the managed set. Self-service surfaces stay universal for the same reason.

**Three modules need explicit read/administration splits**, because gating them wholesale would remove something every member is entitled to:
- Directory — reading the people directory stays universal; directory administration is gated.
- Notifications — receiving and managing one's own notifications stays universal; template, policy and delivery administration is gated.
- Calendar — seeing one's own calendar stays universal; shared-calendar and org-wide event administration is gated.

**Navigation is driven by the same resolved access.** The sidebar, mobile navigation, command palette and product switcher consume one filtered navigation model. A module the person has no standing in does not appear. A control they cannot use is hidden and the handler still refuses it.

**Sequencing.** Chat, Mail and Calendar first, as phase-one surfaces. Then Notifications, Workflows, Blog and Directory. Billing last, as the most sensitive.

### Code quality requirements

**File size.** The module access group service is currently 1,566 lines, over three times the 500-line hard review limit, and is split by responsibility as part of this work. No file introduced or materially modified by this work exceeds the limit without a documented exception.

**Reuse before creation.** The shared access screen, the shared table, pagination, form shells, empty and error states, and the shared field primitives are used as they are. No per-module variant of an existing shared component is created. A second consumer of anything new promotes it to the shared layer and records it in the component index.

**Typing.** Strict typing throughout, no escape hatches, no forced casts, no suppression comments. Result shapes that vary are discriminated unions handled exhaustively. Types are derived from validation schemas rather than declared twice.

**Validation.** Every untrusted boundary is schema-validated, with schemas in their own files beside the feature rather than inline.

**Errors.** The API returns a specific, actionable message; the web app surfaces it through the single shared error extractor rather than reading message fields directly.

**No raw identifiers in the interface.** People, roles and modules are chosen through the existing searchable pickers with single and multiple selection, and are always displayed by name.

**Readability.** No commentary except where something is genuinely non-obvious, and then one line. Dead code and superseded paths are deleted rather than left in place.

**Consistency.** The access screens follow the established settings-surface pattern already used by the ten working modules, so all eighteen look and behave identically.

## Testing Decisions

**A good test here states who the caller is, what they attempted, and what came back.** It asserts the response and the resulting access, not which tables were read or in what order — the query strategy is exactly what this work is free to change. A test that fails when a transaction is consolidated is testing the implementation and should be rewritten.

**The primary seam is the controller.** This is the highest available seam and the codebase has extensive prior art — more than a dozen controller-level end-to-end specs, including ones covering the module access surface, ownership, and permission-guard behaviour. New coverage goes there.

**Coverage required per module, for all eighteen:**
- Org owner and org admin can manage the module's access.
- Module owner can manage members, roles and grants; can transfer ownership.
- Module admin can manage members and grants; cannot transfer ownership.
- Module member sees only granted screens and actions.
- A person holding only the module's manage key can view access administration but cannot change it.
- A person with no standing receives a refusal.
- A cross-tenant module key or member id returns not-found, not forbidden.
- Home and Knowledge Base remain reachable for a member with zero module grants.

**Regression coverage for the read/administration splits.** Directory reading, notification receipt and personal calendar access must each be proven still available to a member with no grants in those modules.

**Cost regression coverage.** A test asserts the per-request transaction count does not exceed the agreed ceiling, so the optimization cannot silently regress. The measurement approach used to establish the baseline — transaction and tuple deltas from database statistics around a fixed number of requests — is reused.

**Two traps previously hit in this repository.** A transaction mock must invoke its callback, or every assertion inside it silently passes without running. And end-to-end specs are excluded from the default test run and execute only under the dedicated end-to-end command, so adding a case is not the same as adding executed coverage.

**Existing specs for the ten working modules are the regression net.** If they need editing, external behaviour changed and that requires justification.

## Out of Scope

- Home and Knowledge Base access gating. They stay universal.
- Changing organization-level role semantics.
- The person and payroll consolidation, which has its own spec.
- The list-view and filter work, which is a separate candidate.
- The cross-module entity reference seam, which is a separate candidate.
- Chat scale work — partitioning, identity primary keys, search indexing, realtime channel ceilings — tracked separately under the phase-one scale bar.
- Retiring the unused frontend permission array, which is a small cleanup, not part of this.
- Any data migration. This work is additive.

## Further Notes

**Measured baseline, 2026-08-20, local build against the development database.** Averages over ten warm requests each:

| Request | Latency | Transactions | Tuples read |
|---|---|---|---|
| Caller's access snapshot | 384ms | 3.2 | 1 |
| Caller's own token payload | 491ms | 4.0 | 1,266 |
| Chat channel list | 397ms | 3.8 | 61 |

The second row is the one to note: it returns the caller's own token payload and touches no business data, so its cost is entirely the guard chain. Latency is inflated by round trips to a remote region and should be read as relative, not absolute; the transaction count is the portable number and the thing to drive down.

**Appendix A — why the ladder stopped at ten.** Module owner and module admin are stored two different ways. Nothing forces a new module to get both rungs, so each module was added by hand and eight were never done. Unifying the resolution interface is what makes the remaining eight cheap and the nineteenth free.

**Appendix B — a claim that did not survive verification.** The originating review reported that the web permission catalog was 206 keys short of the API catalog and that this prevented module owners from granting those permissions. This is incorrect and no work should be planned against it. The permission picker reads the API catalog directly, so all keys are already grantable. The smaller array is a subset by design, guarded by an existing test that asserts the subset direction deliberately. Two small real items remain and are tracked separately: the array has no runtime consumer other than the test that validates it, and the key-union-to-API direction is unguarded, which allows one key with an invalid action segment to sit in the union and always evaluate false.
