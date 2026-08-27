# 02 — A principal declares what kind of thing it is

**What to build:** Authorization can tell a person from a robot. Human membership, personal token, agent token, integration, portal member, external signer, public-link token and system job are separate principal variants with their own audience, scope, capability ceiling, expiry and audit identity. No code path can manufacture organization ownership to get work done.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** four production sites fabricate `isOrgOwner: true` today —
`modules/payroll/payout/lib/payout-run-completion.ts:202` and `modules/payroll/payout/locking.service.ts:83` both build `{ role: "system", isOrgOwner: true, sessionId: "system", tokenScopes: null }`;
`modules/integrations/git/integrations-git.service.ts:23`;
`modules/module-access/module-standing.ts:166`.
The rest of the ~40 hits are specs and fixtures. `agent_tokens` (`db/schema/common/agent-tokens.ts`) already carries `tokenHash`, `expiresAt`, `revokedAt` and `unique(orgId, id)` — the credential exists, the ceiling does not.

## Acceptance criteria

- [ ] The actor at the authorization boundary is a discriminated union with an exhaustive `switch` and `assertNever`, not an object with optional flags.
- [ ] Only a human membership variant can be an organization owner — the type makes `isOrgOwner` unreachable on the others rather than merely unset.
- [ ] Each of the four fabrication sites runs under an explicit system principal with a named, enumerated capability ceiling covering only what that job does; a payroll payout job cannot read CRM.
- [ ] A system principal is auditable: the audit row names the job, not a person, and never attributes work to an owner who did not do it.
- [ ] A test asserts that a system principal denied a capability outside its ceiling fails, and that removing the ceiling entry breaks the test — the guard bites.
- [ ] `grep` for `isOrgOwner: true` outside specs returns zero, and a CI check keeps it there.

## Todo

- [ ] Start with `module-standing.ts:166` — it is the one inside the authorization engine itself, so it is the one whose fabrication is load-bearing for other decisions.
- [ ] The two payroll sites share a shape; extract the system principal once rather than twice.
- [ ] Do not delete the flag from the spec fixtures wholesale — a fixture asserting owner behaviour is testing the human variant and stays.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
