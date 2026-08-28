# 06: Expand the OrganizationActor compatibility seam

**What to build:** Domain code can reference an organization membership/person actor through one canonical seam while legacy user references remain readable during migration.

**Blocked by:** 05 — Enforce RBAC actor and module referential integrity.

**Status:** done

- [x] One typed actor model resolves membership, person, user and organization consistently.
- [x] Additive schema and APIs preserve old callers during migration.
- [x] Missing, inactive and ambiguous memberships fail closed with auditable errors.
- [x] Multi-organization tests prove the same global user resolves distinct organization actors.

## Finding

The ticket says "expand", but no `OrganizationActor` existed anywhere in the repo — `grep -rn "OrganizationActor" src` returned nothing. The nearest thing, `modules/directory/person-seam.ts`, resolves a *person* (payability, employment) and deliberately short-circuits: a `membership` answer reports `workerId: null` because it never looked. It also returns no membership id and never checks membership status, so it cannot answer the question tickets 07–11 need answered — *which organization actor is this, and is it entitled to act right now*.

## Change

`src/common/organization/organization-actor.ts` (new). It lives in `common/` and takes a `DbOrTx`, so it is a plain function rather than an injectable: importing it adds no module edge and no DI token, which matters because S2, S3 and S4 all import it from different modules. `madge --circular` is still zero.

```ts
resolveOrganizationActor(db, orgId, ref): Promise<OrganizationActorResolution>
assertOrganizationActor(db, orgId, ref): Promise<OrganizationActor>
resolveOrganizationActorsByUserIds(db, orgId, userIds): Promise<Map<string, OrganizationActor>>
legacyUserIdOf(actor): string
organizationActorHttpError(error): NotFoundException | ForbiddenException
```

**One model, four identities.** `ref` is `user | membership | person`; the resolved actor always carries `orgId`, `membershipId`, `userId`, `organizationPersonId`, `role`, `isOwner` and `resolvedVia`. Unlike the person seam it does not short-circuit — every resolution path fills the same shape.

**Additive.** Nothing is removed and no schema changed for this ticket. `legacyUserIdOf(actor)` lets a caller still keyed on `users.id` keep working while its rows are migrated; ticket 11 contracts the legacy form once 07–10 are green.

**Fails closed as a value, then as an error.** `no-membership`, `membership-inactive`, `membership-in-another-organization` and `ambiguous-membership` come back as an `unresolved` result — a value, following the house convention, so the caller can explain the failure. `assertOrganizationActor` turns the same thing into `OrganizationActorError`, which carries `toAuditMetadata()` (`code`, `orgId`, `ref`, `reason`). `organizationActorHttpError` maps **only** `membership-inactive` to 403; every other reason is a **404**, so another organization's id is never confirmed to exist.

**Ambiguity is real, not theoretical.** `organization_people` has partial unique indexes on `(organization_id, user_id)` and `(organization_id, organization_membership_id)`, so a person cannot fan out to two memberships. But a person row can carry a `NULL` membership link while its `user_id` does have an active membership, or its `user_id` can disagree with the linked membership's `user_id`. Both are internally inconsistent states, and both resolve `ambiguous-membership` rather than silently picking one.

**Batch resolution is two queries.** `resolveOrganizationActorsByUserIds` deduplicates input and issues exactly two selects regardless of size, so list paths migrating off `users.id` do not reintroduce the N+1 these tickets exist to remove.

## Verification

`node ./node_modules/jest/bin/jest.js src/common/organization/organization-actor.spec.ts --maxWorkers=1`

```
PASS src/common/organization/organization-actor.spec.ts
  √ produces a stable, distinct key per ref kind
  √ never collides a membership id with a user id of the same text
  √ carries organization, ref and reason for audit
  √ maps an inactive membership to 403 and every other failure to 404
  √ never reveals that a record exists in another organization
  √ keeps a user-keyed caller working against a membership-keyed actor
  √ resolves the same global user to a DIFFERENT actor in each organization
  √ fails closed for a user with no membership in the organization
  √ fails closed for an inactive membership instead of returning the actor
  √ fails closed when a membership id belongs to another organization
  √ assertOrganizationActor throws an auditable error rather than returning null
  √ assertOrganizationActor returns the actor on the happy path
  √ returns an empty map without querying when given no ids
  √ resolves a batch in two queries, not one per user
Tests: 14 passed, 14 total
```

The multi-organization test seeds one global user with membership 11 in org A (`ORG_ADMIN`, not owner) and membership 22 in org B (`MEMBER`, owner), and asserts the two resolutions share a `userId` but differ in `membershipId`, `role` and `isOwner` — the property tickets 07–11 depend on.

The database double routes on the **real drizzle column names** in each projection rather than on key-name heuristics, so it cannot silently answer the wrong query when the seam's query shape changes.

`npx madge@8 --circular --extensions ts src` → `✔ No circular dependency found!`

## Review feedback applied

S2 reviewed the published seam and raised two points, both fixed:

- `membershipById` selected without an `org_id` predicate and compared `membership.orgId !== orgId` in JS afterwards. It now binds `org_id` in SQL. The `membership-in-another-organization` reason is preserved by a separate existence probe that runs **only on a miss**, so the failure path keeps the distinction without widening the happy-path query.
- `row.membershipId as number` violated root §6. The map is now built in a loop with a `null` guard; `grep " as "` over the file is empty.

## Published

Announced in `sessions/CROSS-SESSION.md` with the full contract before S2–S4 migrated callers, as the session brief requires. S2 had begun a second seam at `modules/directory/organization-actor.ts` and deleted it in favour of this one.
