# 07 — Usage limits that also bind autonomous writers

**Status:** not started
**Track:** B — enforcement
**Blocked by:** 06

## Why

Phase 1 introduced writers that create records and spend AI credits with no
person initiating anything. **Every limit written before Phase 1 assumed a human
on the other end.** This is the kind of gap that is invisible until a tenant's
automation quietly runs up a bill.

## Acceptance criteria

- [ ] Usage enforcement applies at the write path for human, import **and autonomous** actors alike.
- [ ] An autonomous writer that would exceed the cap is stopped, and **the stop is recorded as a decision**, not swallowed.
- [ ] Overage is either refused or billed per the tenant's election, never silently absorbed.
- [ ] A tenant sees usage against cap during the period, so an overage bill is never a surprise.
- [ ] Credits are reserved atomically before the provider call and refunded only on provider failure, per the existing rule.

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
