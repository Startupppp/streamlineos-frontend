# 09 — Telephony arrives through the ingress seam

**Status:** done — and it produced the phase's finding
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

## Notes (2026-08-25)

Adapter done, and inert until ticket 22 and wiring land — deliberately.

**The seam held; the claim did not.** `InboundCommunicationEvent` cannot carry
duration, direction or a recording reference. `body` and `subject` were both
rejected after checking what reads them: autonomy builds its prompt from
`[subject, body]` and can advance a deal from it, so "Inbound call, 4m 12s" is a
synthesised reason to act — the thing criterion 2 forbids. And `threadIdentity`
falls back to the subject, so a constant one would put every call in the
organisation on one thread. The facts are returned beside the event instead, and
a test asserts none reaches the serialised form.

**Outbound calls are refused by name**, because the workflow resolves the party
from the sender, which on an outbound call is our own rep. The only alternative
inside the present shape is to put the person we called in the `from` slot, which
writes a lie about who rang whom into a permanent record. For a sales CRM that is
most of the corpus, and it needs its own ticket.
