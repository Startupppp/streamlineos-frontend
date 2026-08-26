# 07 — Usage limits that also bind autonomous writers

**Status:** done — enforced for all three actors, and the audit found the gap was wider than the ticket said.
**Track:** B — enforcement
**Blocked by:** 06

## Why

Phase 1 introduced writers that create records and spend AI credits with no
person initiating anything. **Every limit written before Phase 1 assumed a human
on the other end.** This is the kind of gap that is invisible until a tenant's
automation quietly runs up a bill.

## Acceptance criteria

- [x] Usage enforcement applies at the write path for human, import **and autonomous** actors alike.
- [x] An autonomous writer that would exceed the cap is stopped, and **the stop is recorded as a decision**, not swallowed.
- [x] Overage is either refused or billed per the tenant's election, never silently absorbed.
- [ ] A tenant sees usage against cap during the period, so an overage bill is never a surprise. — the backend serves it (`getEntitlements` returns `limits: { limit, used }` per key); no surface reads it yet.
- [x] Credits are reserved atomically before the provider call and refunded only on provider failure, per the existing rule.

## Notes (2026-08-26) — measured before building

**The AI-credit half of this ticket is already done, and the PRD is wrong about
it.** The PRD says "every limit written before Phase 1 assumed a human on the
other end" and treats autonomous spend as unenforced. It is not:

- `autonomy.service.ts` and `autonomy-scoring.service.ts` both call the AI
  gateway's `invokeStructuredWithUsage`, never a provider directly.
- `AutonomyModule` imports `AiGatewayModule`, and its own docstring says that is
  what makes credits reserved before the provider call.
- `ai-gateway-runner.helper.ts` checks `reserveResult.reserved` at three call
  sites and refuses when it is false.

So an autonomous writer that would exceed the AI credit cap is already stopped.

**What is still open** is the non-AI half: record creation by an autonomous
writer against plan limits that are not credit-denominated, and whether the
refusal is *recorded as a decision* rather than swallowed. That is the part worth
building, and it is much smaller than the ticket implies.

Re-scope before starting rather than building enforcement that exists.


---

## Notes

### The ticket named one actor; three were unguarded

The premise was that autonomous writers escape limits written for humans. That
was true, and it was not the whole of it. Of the four places in the backend that
insert a `business_parties` row, **three consulted no plan limit at all**:

| Path | Actor | Before |
|---|---|---|
| `ingress/inbound-ingress.workflow.ts` | autonomous | unguarded |
| `party/party.service.ts` — `createParty` | human | unguarded |
| `crm-import/crm-import.service.ts` | import | unguarded |
| `party/party-legacy-writer.ts` — `insertBareParty` | the seam | callers assert |

So the odd position the ticket was written to prevent — a limit that binds the
robot and not the person — was already the actual state, in the other direction:
nothing bound anybody on this record type. All three now ask.

### Two shapes of enforcement, because the actor decides which is right

`assertWithinLimit` throws, and that is correct wherever a person is waiting for
an answer and can be told to upgrade. It is wrong on the inbound path: throwing
unwinds an ingest carrying a customer's message, and **refusing to record that an
email arrived, because a plan limit was reached, loses the message.**

So `PlanLimitsService` gained `limitFor` — the allowance without the assertion —
and the inbound workflow decides for itself. The refusal keeps the receipt and
declines only the *derived* record: the activity is filed with `partyId: null`,
so the communication is visible, searchable, and attachable by hand, and the
refusal appears in the review feed as a `skipped` decision naming the limit and
the count. Nothing about the communication is lost, which is the property that
makes refusing safe enough to do at all.

The import path checks at claim time rather than per row, for the reason
`startRevert` already gives about its own window: the refusal reaches the person
who pressed Commit, as a refusal. Per-row enforcement would import eight hundred
rows and dead-letter on the eight hundred and first, leaving exactly the
half-imported file the preview/commit split exists to prevent.

### A bug in the guard, found by wiring it

The guard read "unlimited" as a negative number. `PLAN_LIMITS` writes it as
`null`. Unwired, that was inert; wired, an ENTERPRISE plan would have arrived
with `null`, failed `current + 1 <= null`, and **refused every autonomous write
on the most expensive plan we sell** — discovered by the largest customers first.
This is the argument for wiring a decision function to something, rather than
banking it as done: the convention mismatch is invisible until a caller supplies
a real value.

### Finding, not fixed: the contact counter no longer counts contacts

`assertWithinLimit(org, "crmContacts")` counts parties **joined to a
`contact_party_map` row**. That was equivalent to "the tenant's contacts" while
every contact was written through the legacy mirror. Ingress and the importer
write `business_parties` directly and create no map row, so **the parties they
create are invisible to the counter** — which is the mechanism by which
autonomous creation was unbounded even though the tenant had a contact limit.

The inbound guard therefore counts what its own path produces: live parties of
type `CUSTOMER`. The two numbers differ for any tenant using ingress.

This is deliberately left divergent rather than resolved. Making the counter
count live parties would change what **every existing tenant is billed against**,
upward, and could begin refusing writes for tenants who are fine today. That is a
pricing decision, not a refactor. What the divergence needs is a decision about
what the `crmContacts` limit is meant to govern; until then the guard is
conservative on the path that had no guard at all.

### The regression guard

`party/party-creation-invariant.spec.ts` reads the source: every
`insert(businessParties)` must consult a limit in its own file or be named with a
reason. It was verified to fail — a probe file was added, the invariant named it,
and the probe was removed. Both directions are enforced, so the exemption list
cannot rot into an allowlist.

Enforcement holding because four call sites each remembered is the same fragility
ticket 06 found with seats, and it gets the same answer.
