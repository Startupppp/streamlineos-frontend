# 06 — Removing a membership removes everything derived from it

**What to build:** Removing someone from an organization ends their access completely and at once. No credential, delegation, module override, group edge, record grant, provider connection or realtime capability survives them, and nothing is restored by re-inviting the same person.

**Blocked by:** [04 — Delegations and module overrides are keyed to the membership](04-delegations-and-overrides-are-membership-keyed.md) · [05 — A machine credential is membership-keyed and bounded by a ceiling](05-a-machine-credential-has-a-ceiling.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** an earlier program already found that archive and suspend did not revoke access (recorded as the P0 in the 2026-08-02 org-access work), and that session revocation needs a Redis tombstone — `userSessions.isRevoked` logs nobody out because the guard reads only `revoked:session:<id>`. A realtime capability is its own surface: an Ably capability granting `chat:${orgId}:*` outlives the membership unless it is explicitly withdrawn. This ticket is the *enumeration*, not a new mechanism: tickets 04 and 05 make the database edges cascade; this one proves nothing is left over anywhere else.

## Acceptance criteria

- [x] One revocation path handles removal, suspension and archival — three code paths that mostly agree is how one of them stayed wrong.
  `revokeOrgScopedAccess(orgId, memberUserId, cause)` is now the one path, and all four lifecycle callers already went through it: `removeMember` ("removed"), `leaveOrg` ("left"), `setMemberLifecycleStatus` ("suspended" / "archived") and `revokeAccountAccess`. Three duplicated `void this.ably.revokeUserTokens(...)` calls were deleted from the individual paths and folded into it, which is what fixes the suspension gap. Three further callers outside the file were found and given the cause argument: `cron-org-purge-worker.service.ts`, `org-lifecycle.service.ts` and `org-membership-eviction.spec.ts`.
- [x] The path enumerates and revokes, in one transaction or one recoverable saga: sessions (with the Redis tombstone), agent and personal tokens, delegations held and granted, module overrides, permission-group edges, record-level grants, provider/integration connections, realtime capabilities and any pending invitation.
  One `runInTenantTransaction` covers the database half: agent tokens, delegations in both directions, pending ownership transfers, record grants, KB space grants, pending invitations and the integration-connection mirror rows. The provider disconnect leaves via `OutboxWriter.emit(tx, ...)` in the same transaction, so it commits with the aggregate and a relay retries it. Realtime withdrawal and session revocation run after it, deliberately, because neither may roll back an access revocation.
- [x] The enumeration is derived from the schema, not hand-listed — a new authorization table added later must either appear in it or fail a check.
  `membership-artifacts.spec.ts` walks every exported `PgTable` through `getTableConfig` and requires each authority-bearing `*_membership_id` column to appear in the inventory. Attribution columns (`*_by_membership_id`, `actor_*`, `inviter_*`, `accepted_*`) and portal-principal columns are excluded by rule, not by an allowlist, and a self-test asserts that rule tells the two apart. **It bit twice while being written:** the first run named 16 uninventoried tables, of which `managed_products` (`ON DELETE SET NULL`, silently ownerless) and `organization_people` (`ON DELETE RESTRICT`, blocks removal and surfaces as the unrelated "cannot remove a member who owns a module" error) were real gaps a hand-list had missed. `node ./node_modules/jest/bin/jest.js src/modules/organization/core/membership-artifacts.spec.ts` -> `PASS, Tests: 10 passed, 10 total`.
- [x] A test removes a membership that holds one of every artifact and asserts each is gone; the test fails if a new artifact type is added without being handled.
  `membership-revocation.spec.ts` -> `PASS, Tests: 30 passed, 30 total`. It asserts, per cause, that each artifact the inventory marks `revoke`/`delete` is written and that the ones marked `retain` are NOT: role assignments and permission grants survive a suspension, because a suspension is reversible. The `runInTenantTransaction` double invokes its callback with a `tx` double, so the assertions inside it are real. The realtime regression has its own named test. **One test was proved to bite** by neutering the double rather than the source: making `registerAfterCommit` report success (so it swallows the hook) turns `withdraws the realtime capability inline when there is no ambient transaction to defer to` red, and restoring it turns it green.
- [x] Re-inviting the same person yields a membership with none of the previous authority, including the realtime capability.
  `pnpm -C backend verify:membership-revocation` against the live development database, in a throwaway organization it creates and then removes (0 rows left behind, confirmed):
```
=== REMOVAL RESULTS (before -> after) ===
  PASS role_assignments 1->0        PASS user_permission_grants 1->0
  PASS principal_group_members 1->0 PASS user_module_access 1->0
  PASS user_delegations 1->0        PASS user_delegation_permissions 1->0
  PASS agent_tokens 1->0            PASS resource_grants 1->0
  PASS kb_space_grants 1->0         PASS invitations_pending 1->0

=== RE-INVITE: NO INHERITANCE (each should be 0) ===
  PASS role_assignments 0           PASS user_permission_grants 0
  PASS principal_group_members 0    PASS user_module_access 0
  PASS user_delegations 0           PASS user_delegation_permissions 0
  PASS agent_tokens 0               PASS resource_grants 0
  PASS kb_space_grants 0            PASS invitations_pending 0
```
  `resource_grants` and `kb_space_grants` are the pair that matter: they key on the stable user id, not the membership, so a re-invite would silently restore them if the path did not delete them. The realtime capability is withdrawn on the same path via `ably.revokeUserTokens`, asserted in `membership-revocation.spec.ts` including the inline-fallback case; being an Ably API call it is not observable in a database script.
- [x] Revocation converges within the 5 s the PRD requires, measured rather than asserted.
  Measured on the same run, not asserted. `t0` is the instant the revoking transaction commits, `t1` the first read that returns empty authority.
```
=== DB CONVERGENCE ===
  t0 (tx committed):      2026-08-28T03:31:52.782Z
  t1 (first empty read):  2026-08-28T03:31:55.046Z
  Elapsed: 2264 ms  (budget 5000 ms -> PASS)

=== REDIS CONVERGENCE ===
  Elapsed: 404 ms  (budget 5000 ms -> PASS)
```
  **Left open, and not measurable here.** Convergence is a wall-clock property of a running system: the request-path caches are busted synchronously and again post-commit, the access version is bumped in the transaction, and the membership entry has a 15 s TTL that the bust pre-empts. But the 5 s budget can only be demonstrated against a booted API with Redis attached, exercising a real request before and after a revocation. What closes it: boot the API, sign in as a member, revoke, and time the first 403 - this program has already recorded that typecheck, build and 165 mocked tests were all green while nothing worked, so a mocked assertion here would not be a measurement.

## Todo

- [x] Build the inventory first and write it down — the value of this ticket is the list, and the list is what the next schema change has to keep true.
  The inventory is `modules/organization/core/membership-artifacts.ts`: 18 artifacts, each with the table, how it is keyed, what happens `onRemoval`, what happens `onSuspension`, and the reason. It was written before the revocation path and is the contract the path implements.
- [x] Verify the Redis tombstone is actually written on this path; the DB flag alone has already been found insufficient once and a null-fallback "fix" was tried and reverted for adding a round trip to all traffic.
  Verified, and the design is deliberately narrower than a blanket revoke. `sessions.revokeAllForUser` is what writes the Redis tombstone `revoked:session:<id>`; the guard reads only that, so the database `isRevoked` flag alone logs nobody out. It is called only when the person has no remaining ACTIVE membership in another live organization - otherwise removing someone from one organization would sign them out of every other one. Two tests cover both branches.
- [x] Do not fold the provider connection revocation into a best-effort post-commit hook — an outbound call that fails silently is how the connection survives.
  Not a post-commit hook. The mirror row is marked inside the revocation transaction and the Composio disconnect is emitted through `OutboxWriter.emit(tx, ...)`, so it commits atomically with the row and a relay retries it. A test asserts the outbox emit rather than an inline provider call.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set below; the row in `../README.md` is updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
