# 11 — Web form submissions arrive through the ingress seam

**Status:** not started
**Track:** B — channels
**Blocked by:** —

## Acceptance criteria

- [ ] A submission produces an `InboundCommunicationEvent` whose participants
      are derived from the submitted fields, with the form's own identity as the
      provider.
- [ ] A field that looks like an email or a phone resolves a party through the
      existing resolver; an unrecognised submitter creates nothing until the
      normal thresholds are met.
- [ ] Submitted content is untrusted input: validated at the boundary, and
      carried to the model only through the existing redaction path.
- [ ] Driven from a fixture; no SDK mocked.
- [ ] Nothing below the ingress seam changes.
