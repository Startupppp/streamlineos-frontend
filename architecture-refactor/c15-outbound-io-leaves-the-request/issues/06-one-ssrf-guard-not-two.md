# 06 — One SSRF guard, not two

**What to build:** Inventory's webhook validation uses the shared SSRF guard instead of its own copy. Today there are two independent implementations of "is this address blocked", and the next fix to one will not reach the other.

**Blocked by:** None — can start immediately.

**Status:** done

**Verification (orchestrator, 2026-08-26):** `grep -rn "blockedIpReason\|blockedIpv4Reason\|blockedIpv6Reason" backend/src/modules/inventory/` returns zero matches — the local duplicate is gone. `backend/src/modules/inventory/webhooks/webhooks.service.ts:9,34` imports and calls `checkWebhookUrl` from the shared `common/security/ssrf-guard.ts`.

**Lane 2, 2026-08-26:** the call-site migration was already done, but the ticket's own todo — enumerate the local guard's cases and *diff* them — had never been performed, so "the shared guard is a superset" was an assertion with nothing behind it. Performing the diff found one real gap (`*.localhost`, see below). The mechanism this ticket exists to create — something that keeps the predicate honest as it changes — is now the test table, not the assertion.

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
- [x] If the shared guard blocks less than the local copy in any case, fix the shared guard first. — **one gap found and fixed 2026-08-26.** The retired copy blocked `*.localhost` by suffix (`checkUrlSync`: `host === "localhost" || host.endsWith(".localhost")`); the shared `assertSafeWebhookUrl` matched only the bare name, so `http://api.localhost/` passed the sync guard at its two live call sites (`hr-automation-actions.service.ts:125`, `webhooks/dto/webhook.schemas.ts:11`). Fixed at `common/security/ssrf-guard.ts:136-139`; pinned by `ssrf-guard.spec.ts` "blocks a localhost subdomain". The earlier "no gap found" note was wrong.

## Case-by-case diff (2026-08-26)

The retired implementation was recovered from `git show a9166e06^:src/modules/inventory/webhooks/webhooks.service.ts`
and every case it blocked was enumerated as an executable table in
`backend/src/common/security/ssrf-guard.spec.ts` (`BLOCKED_ADDRESS_FORMS`, 27 forms +
`ALLOWED_ADDRESS_FORMS`, 7 boundary forms). Result: the shared guard is a **strict superset** on
address forms, with one non-address gap since closed.

| Local copy blocked | Shared guard | Note |
|---|---|---|
| `0.0.0.0/8`, `127/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `100.64/10` | same | `isBlockedIpv4` |
| `192.0.2.0/24` (TEST-NET-1) | **broader** — `a===192 && b===0` covers all of `192.0.0.0/16` | superset |
| `198.51.100.0/24`, `203.0.113.0/24` | same | |
| `240.0.0.0/4`, `255.255.255.255` | **broader** — `a >= 224` also covers multicast `224.0.0.0/4` | superset |
| `::1`, `::`, and their expanded `0:0:0:0:0:0:0:1` spellings | same via `new URL()` normalisation — verified: `new URL("http://[0:0:0:0:0:0:0:1]/")` yields hostname `[::1]` | pinned by two table rows |
| `fe80::/10`, `fc00::/7` | **broader** — prefix match, no trailing-colon requirement; also blocks `ff00::/8` multicast, which the local copy did not | superset |
| `::ffff:a.b.c.d` and packed `::ffff:7f00:1` | same (`mappedIpv4`) | the known trap; both spellings pinned |
| IPv6 zone id `fe80::1%eth0` | rejected earlier, as `invalid-url` — `new URL()` throws on it | blocked, different reason |
| `*.localhost` suffix | **was NOT blocked** by the sync guard | fixed, see above |
| HTTPS-required-in-production | not in the shared guard | retained at the call site, `webhooks.service.ts:25-33` |

## Todo

- [x] Enumerate every case the local guard blocks, as a test table, before touching it — `ssrf-guard.spec.ts` `BLOCKED_ADDRESS_FORMS` (27) / `ALLOWED_ADDRESS_FORMS` (7), derived from the recovered `blockedIpv4Reason`/`blockedIpv6Reason` at `a9166e06^`.
- [x] Run that table against the shared guard and record any difference — table above; `npx jest src/common/security/ssrf-guard.spec.ts` → 56 passed.
- [x] Only then switch the call site and delete the local copy — already done before this batch; `webhooks.service.ts:9,34` calls `checkWebhookUrl`, zero references to the local helper names remain under `modules/inventory/`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
