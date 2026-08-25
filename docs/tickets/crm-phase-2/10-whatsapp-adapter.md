# 10 — WhatsApp arrives through the ingress seam

**Status:** not started
**Track:** B — channels
**Blocked by:** —

## Acceptance criteria

- [ ] A message produces an `InboundCommunicationEvent`, threaded on the
      provider's conversation identifier where present and on the participant
      pair where not.
- [ ] Media is captured through the same attachment path email uses, including
      its size caps and its filename sanitiser — a filename from WhatsApp is as
      attacker-controlled as one from email.
- [ ] Through Composio, server-side only; no provider tokens stored.
- [ ] Driven from a fixture; no SDK mocked.
- [ ] Nothing below the ingress seam changes.
