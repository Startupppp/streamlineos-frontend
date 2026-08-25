# 05 — The API surface is not published in production

**What to build:** The interactive API documentation is unreachable in production, and realtime relay credentials are issued server-side rather than being reachable by the client.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] API documentation returns not-found in a production configuration, asserted conditionally.
- [ ] Relay credentials are never present in a client bundle or a client-readable response.
- [ ] Neither change affects local development.

## Todo

- [ ] Gate the documentation route on environment
- [ ] Move credential issuance server-side
- [ ] Grep the client bundle to confirm the credential is absent
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
