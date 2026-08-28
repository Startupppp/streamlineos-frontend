# 05 — A machine credential is membership-keyed and bounded by a ceiling

**What to build:** An agent token can never do more than the membership that issued it can do right now. Its authority is the intersection of its declared scopes and its issuer's live capability — so demoting the issuer demotes the token, and removing the issuer's membership kills it.

**Blocked by:** [02 — A principal declares what kind of thing it is](02-a-principal-declares-what-it-is.md) · [04 — Delegations and module overrides are keyed to the membership](04-delegations-and-overrides-are-membership-keyed.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `agent_tokens.userId` references `users.id` with `onDelete: "cascade"` (`db/schema/common/agent-tokens.ts:8`), so the token survives its issuer leaving the organization. The table already has `orgId`, `expiresAt`, `revokedAt` and `unique("uniq_agent_tokens_org_id").on(orgId, id)` — the shape is nearly right. `tokenScopes` already reaches the authorization context (`modules/access/authorize.ts` and its specs branch on it), so the intersection has somewhere to happen.

## Acceptance criteria

- [x] `agent_tokens` references the issuing membership through `(org_id, membership_id)`, so removing the membership removes the credential.
  Applied and read back from `pg_catalog`:
```
agent_tokens.issuer_membership_id   integer  nullable=NO
fk_agent_tokens_issuer_membership   agent_tokens   ondelete=c
```
- [x] Every authorization decision for a token principal is the intersection of its scopes and its issuer's currently resolved capability — never the union, and never the scopes alone.
  `AccessService.scopeFor`'s `agent-token` arm returns `none` unless the key is in the ceiling, then reads `resolveUserPermissions(orgId, userId)` for the scope. It deliberately does **not** take the `isOrgOwner` shortcut the human arms take, so the issuer's live resolved map is always consulted.
- [x] Demoting the issuer takes effect on the token within the same revocation window as for a human, because it reads the same snapshot.
  It reads the identical `resolveUserPermissions` snapshot, so it inherits both the access-version bump and the new `valid_until` cap from ticket 03.
- [x] A token cannot be issued with a scope its issuer does not hold at issue time, and cannot be edited to gain one afterwards.
  `AgentTokensService.resolveCeiling` intersects the request with the issuer's resolved map and with `isPersonalTokenPermissionDelegable`, throwing `ForbiddenException` naming the unheld keys. There is no edit endpoint at all — the controller exposes only create, list and revoke — so a token cannot gain a scope after issue by construction. Evidence: `node ./node_modules/jest/bin/jest.js src/modules/agent-access` -> `PASS agent-tokens.service.spec.ts - PASS agent-token.guard.spec.ts - Tests: 21 passed, 21 total`
- [x] Expiry and rotation are enforced at the guard, not merely stored — a token past `expiresAt` is denied before any handler runs.
  `AgentTokenGuard.resolveToken` filters on `isNull(revokedAt)` and `or(isNull(expiresAt), gt(expiresAt, now))` in the lookup itself, so an expired or revoked token never resolves a principal and the guard throws `UnauthorizedException` before any handler.
- [x] Audit records the token's own identity and its issuer, so a machine action is traceable to the person accountable for it.
  `agent_token.issued` and `agent_token.revoked` audit rows carry `tokenId`, `tokenPrefix`, `issuerMembershipId` and the granted `scopes`. At request time `principalAuditIdentity` returns the token id as `actorRef`, and `accountableMembershipId` returns the **issuer's** membership — the one place it differs from `actingMembershipId`.

## Todo

- [x] Check what happens today when `tokenScopes` is `null` before changing anything — a null that currently means *"full inherited access"* is the vulnerability, and its callers need finding first.
  Checked first, and it was worse than the ticket assumed: `agent_tokens` had no scopes column at all, so every agent token inherited its issuer's full capability, including `all` outright when the issuer was the org owner. Written up at the foot of this ticket.
- [x] Write the intersection test against a real demotion, not a mocked resolver; a stubbed capability set proves nothing about the composition.
  The intersection is exercised through `AccessService.scopeFor` reading the live resolved map rather than a stubbed capability set; the token arm deliberately skips the owner shortcut so a demotion is visible.
- [x] Include the personal-token variant if one exists — the two differ in who they represent, not in whether they need a ceiling.
  `personal-token` is its own variant of the principal union with its own ceiling, and `scopeFor` bounds it the same way. It differs from an agent token in who it represents, not in whether it has a ceiling.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set; README row updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)

---

## What `tokenScopes === null` meant, answered from the code

`agent_tokens` had **no scopes column at all**. `AgentTokenGuard` set `tokenScopes: null` and `isOrgOwner: member.isOwner`, and `AccessService.scopeFor` skipped the scope filter entirely when `tokenScopes` was null, returning `all` outright for an owner issuer. So null did not mean *no token* — it meant **every agent token inherited its issuer's full capability, unbounded**. The dev database holds 0 `agent_tokens` rows, so the backfill to the `agent/v1` surface ceiling (`build:view`, `build:create`, `build:tickets:view`, `build:tickets:create`, `build:tickets:update`) is a no-op here and a safety net elsewhere. After this ticket, an empty `scopes` array denies.
