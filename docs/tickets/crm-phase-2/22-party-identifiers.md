# 22 — Party identifiers, because the resolver could only ever see email

**Status:** done — 0260; a phone number stops being written into the email column.
**Track:** A — identity convergence (added mid-phase)
**Blocks:** 09, 10, 11 working end to end; 12's honest verdict
**Blocked by:** 02

## Why this ticket exists

It was not in the plan. Phase 1 proposed the ingress seam at the highest point it
could defend, on the argument that a new channel would cost an adapter and
nothing else, and the PRD says plainly that if any Phase 2 channel needs a change
below the seam, that is the most valuable finding in the phase and must be
treated as one rather than patched around.

Three channel adapters were built independently — telephony, WhatsApp, web forms.
All three reported the same defect without seeing each other's work.

**The seam itself held.** No adapter changed the workflow, the resolver, the
activity writer or the schema, and `seam-integrity.spec.ts` passes untouched.
What did not hold is everything below it, which is email-shaped:

- `resolve-party` matches `senderOf(event).address` against
  `business_parties.email` and, on a miss, inserts `{ email: address }`. There is
  no notion of what *kind* of identifier arrived, so a phone number is written
  into the email column. The row looks fine. The same person's next email does
  not match it, so they become a second party — and the first is unreachable by
  the only channel currently wired.
- `externalParticipants` keeps a participant only when `addressDomain()` is
  non-null, which requires an `@`. So `record-participants` writes **zero rows**
  for calls and WhatsApp, and `AutonomyService.loadActivity` then left-joins that
  table for a sender it can never find — handing the bounce classifier an empty
  address for every call.

A form can refuse an unrecognisable submitter, and ticket 11's adapter correctly
does. A phone call cannot: every caller is a phone number.

## The decision

**An identifier table keyed `(kind, value)`, not more columns on Party.**

Adding `phone` and `whatsapp_phone` matching is smaller today and wrong at the
next channel — one column and one branch per kind, so the fifth channel pays what
the fourth paid. That is the same claim failing twice in the same place. It is
also ambiguous on arrival: a phone number could match either column, and nothing
says which wins.

The precedent is one ticket old. Ticket 01 refused to give `clients.is_vendor` a
column and made it a `party_roles` row, on exactly this argument. An identifier is
the same shape: a party has many, of varying kinds, and the set grows with the
product.

## Acceptance criteria

- [ ] `party_identifiers` — `(organization_id, party_id, kind, value, normalised_value)`,
      with `kind` a closed vocabulary (`email`, `phone`, `whatsapp`, `handle`).
- [ ] **Unique on `(organization_id, kind, normalised_value)`**, so two parties
      claiming one phone number is impossible rather than merely unlikely.
- [ ] Normalisation is per kind and lives in one place: addresses lower-cased and
      trimmed as `normaliseAddress` already does, phone numbers to E.164. One
      person must not become three parties because of formatting.
- [ ] `resolve-party` resolves through this table, and the identifier's kind comes
      from the adapter rather than being guessed from the string's shape — a
      guess is how `+1-555` becomes an email again.
- [ ] `externalParticipants` keeps participants of every kind. Its current
      email-only filter is the reason `activity_participants` is empty for two
      channels.
- [ ] A backfill migration writes an identifier row for every existing
      `business_parties.email`, `phone` and `whatsapp_phone`, and a test asserts
      no party with one of those values lacks the matching identifier.
- [ ] The duplicate scorer matches on identifiers rather than on string columns.
- [ ] Ticket 11's `unresolvable-identity` refusal branch is **deleted**, not left
      beside the new path.
- [ ] Every existing e2e suite passes unchanged. If one needs editing, behaviour
      changed and that is the finding.

## Notes

Ticket 01 added `phone` and `whatsapp_phone` to Party. They stay as display
fields; they stop being the matching mechanism. Do not leave a second resolution
path beside this one — a rewrite absorbs the old mechanism rather than standing a
new one up next to it.

Outbound telephony remains unattributable even after this: the workflow resolves
the party from the sender, which on an outbound call is our own rep. Ticket 09
refuses outbound by name and counts it. That is a separate decision and it needs
its own ticket, because for a sales CRM outbound is most of the corpus.
