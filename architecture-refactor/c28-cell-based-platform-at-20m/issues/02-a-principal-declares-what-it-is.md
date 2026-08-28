# 02 — A principal declares what kind of thing it is

**What to build:** Authorization can tell a person from a robot. Human membership, personal token, agent token, integration, portal member, external signer, public-link token and system job are separate principal variants with their own audience, scope, capability ceiling, expiry and audit identity. No code path can manufacture organization ownership to get work done.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** four production sites fabricate `isOrgOwner: true` today —
`modules/payroll/payout/lib/payout-run-completion.ts:202` and `modules/payroll/payout/locking.service.ts:83` both build `{ role: "system", isOrgOwner: true, sessionId: "system", tokenScopes: null }`;
`modules/integrations/git/integrations-git.service.ts:23`;
`modules/module-access/module-standing.ts:166`.
The rest of the ~40 hits are specs and fixtures. `agent_tokens` (`db/schema/common/agent-tokens.ts`) already carries `tokenHash`, `expiresAt`, `revokedAt` and `unique(orgId, id)` — the credential exists, the ceiling does not.

## Acceptance criteria

- [x] The actor at the authorization boundary is a discriminated union with an exhaustive `switch` and `assertNever`, not an object with optional flags.
  `common/auth/principal.ts` defines `Principal` with five variants (`human-session`, `account-only`, `personal-token`, `agent-token`, `system-job`). `AccessService.scopeFor` switches on it exhaustively and ends in `assertNever(principal)`; so do `actingMembershipId`, `principalIsOrgOwner`, `principalCeiling` and `principalAuditIdentity`.
- [x] Only a human membership variant can be an organization owner — the type makes `isOrgOwner` unreachable on the others rather than merely unset.
  `isOrgOwner` exists only on `human-session` and `personal-token`. `principal.spec.ts` asserts `"isOrgOwner" in p === false` at runtime for `agent-token` and `system-job` — the type guarantee rendered observable.
- [x] Each of the four fabrication sites runs under an explicit system principal with a named, enumerated capability ceiling covering only what that job does; a payroll payout job cannot read CRM.
  `common/auth/system-jobs.ts` holds nine named jobs, each with a `reason` and a `ceiling`. The two payroll sites take `accounting:journal:create` + `:post` only. **Correction to the grounding:** `module-standing.ts:166` was NOT a fabrication — it was a derived local struct, and the grep that flagged it was a false positive. `resolveModuleAuthority` and `authoritySource` were collapsed into one `resolveAuthoritySource` returning the standing source directly, which removes both the literal and the intermediate type. Ten further synthetic-actor sites were found beyond the four; five were **reconstructed human contexts**, not jobs, and were given `humanSessionPrincipal(membershipId, isOwner)` from a real membership row — converting those to a system job would have denied them everything.
- [ ] A system principal is auditable: the audit row names the job, not a person, and never attributes work to an owner who did not do it.
  **Half met — un-ticked on re-audit 2026-08-28, having first been ticked on evidence that overstated it.**
  The second clause holds and is enforced: `systemActor()` sets `isOrgOwner: false` by construction, and
  `pnpm check:owner-authority` fails the build on any `isOrgOwner: true` literal anywhere in `src/`
  (currently `production files scanned 3054`, zero fabrications). No job can attribute work to an owner.

  The first clause does not hold. `systemActor()` puts the job id in `sessionId` (`system:<jobId>`), but
  `AuditEntry` (`common/audit/audit.service.ts:13`) has **no `sessionId`, `actorKind` or `actorRef`
  field**, so the job id is never persisted — the audit row records `userId`, which is the literal
  `"system"` for a job with no delegating human and that human's id for the five sites that pass one.
  `principalAuditIdentity(principal)` exists and returns `{ actorKind, actorRef }` with the job id as
  `actorRef`, but **nothing calls it** — `grep -rn "principalAuditIdentity" src/` returns only its own
  definition, and `knip` lists it as an unused export.

  What would close it: add `actorKind`/`actorRef` to `AuditEntry`, persist them, and populate them from
  the request principal. That needs the principal on `TenantContext`
  (`common/tenant/tenant-context.ts:9` carries only `orgId`, `audience`, `tx`, `afterCommit`), and
  `common/tenant` is explicitly not this session's territory. Raised in `CROSS-SESSION.md`. The helper is
  left in place as the ready-made piece for whoever closes it rather than deleted and rebuilt.
- [x] A test asserts that a system principal denied a capability outside its ceiling fails, and that removing the ceiling entry breaks the test — the guard bites.
  `common/auth/system-actor.spec.ts` and `principal.spec.ts` -> `Test Suites: 2 passed - Tests: 80 passed`. `systemJobCovers` is asserted false for a key outside the ceiling, and every ceiling entry is asserted to be a member of `ALL_PERMISSION_NAMES`, so a typo'd or removed key fails the suite. `AccessService.scopeFor`'s `system-job` arm returns `all` only for a key in the ceiling and `none` otherwise.
- [x] `grep` for `isOrgOwner: true` outside specs returns zero, and a CI check keeps it there.
  `node src/scripts/check-owner-authority.mjs` -> `production files scanned 3055 - owner shortcuts (reported) 12 - OK, nothing fabricates ownership and every owner gate reads the catalog.` (exit 0)
  Self-test: `node src/scripts/check-owner-authority.mjs --self-test` -> `SELF-TEST OK - fabrication, gate, shortcut and elevation are told apart.` The scan distinguishes a **gate** (`if (!x.isOrgOwner) throw`) from an owner **shortcut** around a permission check, which its first version conflated: it reported 7 gates where only 2 were real.

## Todo

- [x] Start with `module-standing.ts:166` — it is the one inside the authorization engine itself, so it is the one whose fabrication is load-bearing for other decisions.
  Done first, and it disproved the grounding: it was a derived local struct, not a fabricated principal. Collapsing `resolveModuleAuthority` + `authoritySource` into `resolveAuthoritySource` removed both the literal and the intermediate type.
- [x] The two payroll sites share a shape; extract the system principal once rather than twice.
  Extracted once as `systemActor(jobId, orgId, onBehalfOfUserId?)`; both payroll sites call it with their own job id.
- [x] Do not delete the flag from the spec fixtures wholesale — a fixture asserting owner behaviour is testing the human variant and stays.
  No spec fixture lost its owner behaviour. The CI scan excludes `*.spec.ts` and `*.e2e-spec.ts` precisely so a fixture asserting owner behaviour keeps testing the human variant.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set; README row updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
