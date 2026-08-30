# L15 Mail Report

**Status:** DONE

## Sync idempotency proof
`mailbox-sync.ts` implements watermark-based checkpointing (`planSweep`/`advanceWatermark`). Each sweep reads from `syncedThrough - OVERLAP_MS` and only advances the watermark to the newest message actually read — never to "now". The 5-minute overlap closes the gap for messages arriving mid-sweep. A duplicate delivery costs nothing: `InboundIngressService.accept` deduplicates on the provider's own message id. Tests in `mailbox-sync.spec.ts` (4 pass) and `crm-mailbox.service.spec.ts` (14 pass) prove idempotency, truncation watermark-hold, and page-following behavior.

## Cursor contract verdict
VERIFIED DONE. The mail inbox cursor: (1) uses explicit `null` for exhausted accounts — `undefined` is never written to `nextCursorMap`, closing the "undefined vanishes in JSON" replay defect; (2) is HMAC-signed with a per-user key so a cursor minted for one reader fails for another; (3) hard-capped at 50 messages (`pageSizeField(25, 50)`); (4) returns first page on unreadable/tampered cursors. All properties proved by `mail-inbox-paging.spec.ts` (7 tests).

## Files split with line counts
`crm-mailbox.service.ts` was 709 lines. Split into three files without touching public interface or constructor signature (spec still passes 14/14):
- `crm-mailbox.service.ts` → 427 lines (CRUD + push + sync + sweep orchestration)
- `crm-mailbox-sweep-types.ts` → 53 lines (constants, SweepRead interface, `forIngress`, `sweepNote`)
- `crm-mailbox-provider-fetch.ts` → 120 lines (standalone `fetchGmailMessages`, `fetchOutlookMessages`, `enrichWithDetail`)

## Guard audit
**0 handlers** have `@RequirePermission` without `@UseGuards(JwtAuthGuard, PermissionGuard)`. All controllers in mail/email/ingress are correctly guarded.

## Test summary
`node ./node_modules/jest/bin/jest.js --testPathPattern="mail|email|ingress" --maxWorkers=1`: **33 suites, 510 passed, 3 skipped, 0 failed**.

## Checks
- `check:route-classification`: PASS — 0 undeclared, 3534 total handlers
- `check:log-secrets`: PASS — no plaintext secrets, all `@UseRateLimit` keys in TIERS
- `check:tenant-isolation`: mail/email/ingress not in MISSING list (0 gaps in my trees)
- `pnpm typecheck`: errors in ai/finance/payroll modules only — none in mail/email/ingress

## Outbox consumers
No orphaned event types emitted from mail/email/ingress trees.

## SSRF
No direct user-supplied URL fetching in mail/email/ingress. Provider calls go through Composio gateway (`common/integrations/`). No second SSRF guard needed.

## OUT-OF-OWNERSHIP note
Attachment malware scanning and signed expiring URLs: the `getAttachment` endpoints proxy a `downloadUrl` from Gmail/Outlook via Composio. Adding AV scanning requires a ClamAV/VirusTotal integration in `common/security/` (out of ownership) and a storage proxy endpoint. The provider-issued URLs are already time-limited by Gmail/Outlook. Recorded as a known gap; no file in my tree can close it unilaterally.
