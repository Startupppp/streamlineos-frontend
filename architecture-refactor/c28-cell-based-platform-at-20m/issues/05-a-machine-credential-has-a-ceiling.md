# 05 — A machine credential is membership-keyed and bounded by a ceiling

**What to build:** An agent token can never do more than the membership that issued it can do right now. Its authority is the intersection of its declared scopes and its issuer's live capability — so demoting the issuer demotes the token, and removing the issuer's membership kills it.

**Blocked by:** [02 — A principal declares what kind of thing it is](02-a-principal-declares-what-it-is.md) · [04 — Delegations and module overrides are keyed to the membership](04-delegations-and-overrides-are-membership-keyed.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `agent_tokens.userId` references `users.id` with `onDelete: "cascade"` (`db/schema/common/agent-tokens.ts:8`), so the token survives its issuer leaving the organization. The table already has `orgId`, `expiresAt`, `revokedAt` and `unique("uniq_agent_tokens_org_id").on(orgId, id)` — the shape is nearly right. `tokenScopes` already reaches the authorization context (`modules/access/authorize.ts` and its specs branch on it), so the intersection has somewhere to happen.

## Acceptance criteria

- [ ] `agent_tokens` references the issuing membership through `(org_id, membership_id)`, so removing the membership removes the credential.
- [ ] Every authorization decision for a token principal is the intersection of its scopes and its issuer's currently resolved capability — never the union, and never the scopes alone.
- [ ] Demoting the issuer takes effect on the token within the same revocation window as for a human, because it reads the same snapshot.
- [ ] A token cannot be issued with a scope its issuer does not hold at issue time, and cannot be edited to gain one afterwards.
- [ ] Expiry and rotation are enforced at the guard, not merely stored — a token past `expiresAt` is denied before any handler runs.
- [ ] Audit records the token's own identity and its issuer, so a machine action is traceable to the person accountable for it.

## Todo

- [ ] Check what happens today when `tokenScopes` is `null` before changing anything — a null that currently means *"full inherited access"* is the vulnerability, and its callers need finding first.
- [ ] Write the intersection test against a real demotion, not a mocked resolver; a stubbed capability set proves nothing about the composition.
- [ ] Include the personal-token variant if one exists — the two differ in who they represent, not in whether they need a ceiling.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
