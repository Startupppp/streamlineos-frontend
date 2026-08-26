# 06 — One SSRF guard, not two

**What to build:** Inventory's webhook validation uses the shared SSRF guard instead of its own copy. Today there are two independent implementations of "is this address blocked", and the next fix to one will not reach the other.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## What was found, and what was NOT found

Verified at source 2026-08-26 while sweeping inventory for swallowed failures.

- `backend/src/common/security/ssrf-guard.ts` is the canonical guard — `checkWebhookUrl` (async, resolves DNS) and `assertSafeWebhookUrl`.
- `backend/src/modules/inventory/webhooks/webhooks.service.ts:19` defines its own `blockedIpReason`, with private `blockedIpv4Reason` and `blockedIpv6Reason` helpers.

**This is not currently a vulnerability, and the ticket should not be written up as one.** The known failure mode for a duplicate guard here is the packed IPv4-mapped form: `new URL()` normalises `::ffff:127.0.0.1` to `::ffff:7f00:1`, and a guard that only matches the dotted spelling waves it through. That mistake has been made in this codebase before. **The inventory copy handles both** — it has a `v4MappedHex` branch that parses `::ffff:c0a8:0101` and reduces it to the IPv4 check.

So the defect is **maintenance, not exposure**: two implementations of a security predicate, and no mechanism that keeps them agreeing.

## Why it still matters

A security guard that exists twice is one that will diverge. The next address family, encoding trick or cloud metadata endpoint someone remembers to block will be blocked in one file. Nobody greps for the second copy, because nobody knows it is there — that is how this one survived.

The DNS-lookup catch in the same file is **correct** and must not be changed: a resolution failure becomes a `BadRequestException` with a clear message rather than being swallowed.

## Acceptance criteria

- [ ] Inventory webhook validation calls the shared guard; `blockedIpReason` and its helpers are deleted from the module.
- [ ] Every address form the local copy blocked is still blocked — enumerate them from the local implementation FIRST and assert each against the shared guard before deleting anything.
- [ ] Specifically covered: dotted IPv4-mapped (`::ffff:127.0.0.1`), **packed IPv4-mapped (`::ffff:7f00:1`)**, IPv6 zone IDs (`fe80::1%eth0`), bracketed URL hostnames, loopback, link-local, private ranges, and cloud metadata addresses.
- [ ] A hostname that resolves to a blocked address is still refused, not just a literal one — the DNS path is the part that matters and it is easy to lose in a refactor.
- [ ] The existing `BadRequestException` behaviour and messages are preserved; a caller sees no change.
- [ ] If the shared guard turns out to block LESS than the local copy in any case, **fix the shared guard first** and say so. Do not weaken inventory to match.

## Todo

- [ ] Enumerate every case the local guard blocks, as a test table, before touching it
- [ ] Run that table against the shared guard and record any difference
- [ ] Only then switch the call site and delete the local copy
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
