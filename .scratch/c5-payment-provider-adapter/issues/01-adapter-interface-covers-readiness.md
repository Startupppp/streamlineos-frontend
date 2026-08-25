# 01 — Everything billing asks a payment provider is on the seam

**What to build:** The payment provider interface covers all five things the billing service currently asks a provider for, not just three. Today `createOrder`, signature verification and webhook verification are declared — but readiness ("is a provider configured for this organisation") and the public key the browser needs to open a checkout are asked of the concrete provider directly, so they cannot be substituted.

This is the *expand* step: the interface grows, the existing adapter implements the new members, and nothing migrates yet.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The interface covers readiness and the browser-facing public key alongside the three money operations.
- [ ] The existing adapter implements the new members with today's behaviour, unchanged.
- [ ] Provider secrets stay inside the adapter — nothing on the interface returns or accepts a secret that the caller does not already need to hold.
- [ ] The optional cheap credential-format check stays optional and stays synchronous; it must not become a live API call.
- [ ] The registry resolves an adapter by provider key and returns nothing for an unknown key, and callers handle that.
- [ ] Nothing else changes behaviour; the billing service is untouched by this ticket.
- [ ] Backend suite green.

## Todo

- [ ] List the five things the billing service currently asks the concrete provider for, from source, and confirm the count before designing
- [ ] Add the missing members to the interface with the parameters the existing call sites already pass
- [ ] Implement them on the existing adapter by delegating to today's code
- [ ] Confirm no secret crosses the interface that did not have to
- [ ] Leave the billing service alone — that is tickets 02 and 03
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
