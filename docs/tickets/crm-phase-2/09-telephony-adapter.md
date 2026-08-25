# 09 — Telephony arrives through the ingress seam

**Status:** not started
**Track:** B — channels
**Blocked by:** — (Phase 1 ingress seam)

## Why

A rep whose customers call sees a timeline with a quarter of the conversation on
it, which is worse than no timeline: it looks complete and is not.

## Acceptance criteria

- [ ] A call produces an `InboundCommunicationEvent` carrying duration,
      direction, recording reference and, where the provider offers one, a
      transcript.
- [ ] **No transcript is synthesised.** A call with no transcript is a call with
      no body; the extraction tier does nothing rather than guessing.
- [ ] Connectivity goes through Composio and the `integrations` module,
      server-side only. No direct provider OAuth, no provider tokens in our
      database — mirror only `user_integration_connections`.
- [ ] Driven from a fixture. No provider SDK is mocked anywhere; the fixture is
      the contract.
- [ ] **Nothing below the ingress seam changes.** A diff touching the workflow,
      the party resolver, the activity writer or the schema is a finding, not an
      implementation detail — see ticket 12.
