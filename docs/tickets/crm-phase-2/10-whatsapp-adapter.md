# 10 — WhatsApp arrives through the ingress seam

**Status:** done — see notes
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

## Notes (2026-08-25)

Adapter done, inert until ticket 22 and wiring land.

Threads on the provider's conversation id where present and the sorted
participant pair where not — and the absent case is the normal one, since an
inbound Cloud API message carries no conversation id. Setting `providerThreadId`
in the adapter is load-bearing: handed over null, the seam synthesises from the
subject, and WhatsApp has none, so every message becomes its own thread.

An org with two business lines refuses rather than threading on the sender alone.
A merged timeline cannot be unmerged.

Attachments reuse `attachment-capture.ts` exactly. Note it had **zero importers**
before this ticket — email does not use it either — so "the same attachment path
email uses" is today a decision module with no downloader behind it.
