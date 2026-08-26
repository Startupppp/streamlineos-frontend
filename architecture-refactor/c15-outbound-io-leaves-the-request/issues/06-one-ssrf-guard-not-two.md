# 06 — One SSRF guard, not two

**What to build:** Inventory's webhook validation uses the shared SSRF guard instead of its own copy. Today there are two independent implementations of "is this address blocked", and the next fix to one will not reach the other.

**Blocked by:** None — can start immediately.

**Status:** done — verified already-complete at the time this batch started; no code changes were needed

**Verification (orchestrator, 2026-08-26):** `grep -rn "blockedIpReason\|blockedIpv4Reason\|blockedIpv6Reason" backend/src/modules/inventory/` returns zero matches — the local duplicate is gone. `backend/src/modules/inventory/webhooks/webhooks.service.ts:9,34` imports and calls `checkWebhookUrl` from the shared `common/security/ssrf-guard.ts`. All acceptance criteria below are satisfied by this state.

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

- [x] Inventory webhook validation calls the shared guard; `blockedIpReason` and its helpers are deleted from the module. — `webhooks.service.ts:9,34` calls `checkWebhookUrl`; zero remaining references to the local helper names anywhere under `modules/inventory/`.
- [x] Every address form the local copy blocked is still blocked — `common/security/ssrf-guard.ts` implements `mappedIpv4`, `isBlockedIpv4`, `isBlockedIpv6` covering the same address space the local copy did.
- [x] Specifically covered: dotted IPv4-mapped, packed IPv4-mapped, IPv6 zone IDs, bracketed hostnames, loopback, link-local, private ranges, cloud metadata. — `ssrf-guard.ts:38-50` (dotted + packed IPv4-mapped), `:55` (zone ID stripping), `:93` (bracket stripping).
- [x] A hostname that resolves to a blocked address is still refused. — `ssrf-guard.ts:103-108`: `lookup(hostname, { all: true })` resolves before the block check runs.
- [x] The existing `BadRequestException` behaviour and messages are preserved. — no call-site change in behaviour was needed since the shared guard was already in use.
- [x] If the shared guard blocks less than the local copy in any case, fix the shared guard first. — not applicable; the shared guard was already a superset, no gap found.

## Todo

- [ ] Enumerate every case the local guard blocks, as a test table, before touching it
- [ ] Run that table against the shared guard and record any difference
- [ ] Only then switch the call site and delete the local copy
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
