# 18 — Issues, tasks and complaints as record types

**Status:** done — issues, tasks and complaints as record types, not three modules.
**Track:** E — records and renderer
**Blocked by:** 02

## Why

`D27`. Three record types on the renderer, not three bespoke modules. Issues the
system raises about itself, tasks a team assigns internally, and complaints a
customer escalates all currently live in email.

## Acceptance criteria

- [ ] All three are record types on the Phase 1 renderer. No hand-written list,
      table or form for any of them.
- [ ] A complaint anchors to a Party and optionally to a Deal, so the commercial
      consequence of a service failure is visible where the commercial decision
      is made.
- [ ] Severity, owner and clock are fields.
- [ ] **Escalation is a stage transition through the ledger Phase 1 built for
      deals** — the same `deal_stage_transitions` accountability model, not a
      reinvented one. A system actor must be representable without wearing a
      person's name.
- [ ] Permission keys in both catalogues, with a backfill migration (see 21).
