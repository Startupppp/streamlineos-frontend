# 06 — Removing a membership removes everything derived from it

**What to build:** Removing someone from an organization ends their access completely and at once. No credential, delegation, module override, group edge, record grant, provider connection or realtime capability survives them, and nothing is restored by re-inviting the same person.

**Blocked by:** [04 — Delegations and module overrides are keyed to the membership](04-delegations-and-overrides-are-membership-keyed.md) · [05 — A machine credential is membership-keyed and bounded by a ceiling](05-a-machine-credential-has-a-ceiling.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** an earlier program already found that archive and suspend did not revoke access (recorded as the P0 in the 2026-08-02 org-access work), and that session revocation needs a Redis tombstone — `userSessions.isRevoked` logs nobody out because the guard reads only `revoked:session:<id>`. A realtime capability is its own surface: an Ably capability granting `chat:${orgId}:*` outlives the membership unless it is explicitly withdrawn. This ticket is the *enumeration*, not a new mechanism: tickets 04 and 05 make the database edges cascade; this one proves nothing is left over anywhere else.

## Acceptance criteria

- [ ] One revocation path handles removal, suspension and archival — three code paths that mostly agree is how one of them stayed wrong.
- [ ] The path enumerates and revokes, in one transaction or one recoverable saga: sessions (with the Redis tombstone), agent and personal tokens, delegations held and granted, module overrides, permission-group edges, record-level grants, provider/integration connections, realtime capabilities and any pending invitation.
- [ ] The enumeration is derived from the schema, not hand-listed — a new authorization table added later must either appear in it or fail a check.
- [ ] A test removes a membership that holds one of every artifact and asserts each is gone; the test fails if a new artifact type is added without being handled.
- [ ] Re-inviting the same person yields a membership with none of the previous authority, including the realtime capability.
- [ ] Revocation converges within the 5 s the PRD requires, measured rather than asserted.

## Todo

- [ ] Build the inventory first and write it down — the value of this ticket is the list, and the list is what the next schema change has to keep true.
- [ ] Verify the Redis tombstone is actually written on this path; the DB flag alone has already been found insufficient once and a null-fallback "fix" was tried and reverted for adding a round trip to all traffic.
- [ ] Do not fold the provider connection revocation into a best-effort post-commit hook — an outbound call that fails silently is how the connection survives.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
