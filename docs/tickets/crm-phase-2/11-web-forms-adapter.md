# 11 — Web form submissions arrive through the ingress seam

**Status:** done — transport still needed
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

## Notes (2026-08-25)

Normaliser and boundary done. **The transport does not exist and was not
invented.** Composio has no form toolkit; the repo's actual form door is
`POST /leads/ingest`, which writes a legacy `leads` row and never reaches the
seam — and `leads` is the table this phase retires.

Still to wire: a `crm_web_forms` registry, a public rate-limited route preserving
the raw body, and one line in `ingress.module.ts`.

Injection containment is verified against the real `redactForModel` and
`buildExtractionPrompt` rather than asserted: exactly one BEGIN and one END fence
marker survive a payload that submits both.
