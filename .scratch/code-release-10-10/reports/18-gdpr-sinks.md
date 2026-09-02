# 18 — GDPR erasure sinks and export (session S4)

## Boxes closed (5 of 7)

| Box | Proof |
|---|---|
| Keyset cursor on every drain | 66 `.limit(` in `src/modules/gdpr/**` audited; 3 unbounded selects converted to keyset drains. Multi-page test (200-row page + 1-row tail) asserts 3 chunk deletes; neutering the drain gives "Expected length: 3, Received length: 2". |
| Export exhaustive + resumable | `npx jest src/modules/gdpr --maxWorkers=2` → 13 suites, **201 passed**. Async worker keyset-drains every `REQUIRED_GDPR_EXPORT_SOURCES` entry; cursor-stall throws. |
| Correction is correction | New spec asserts `set()` receives exactly the submitted value, read-back verified, hashes audited. |
| Auth-linked fields | Closed schema rejects `profile.email`/`auth.*`; all 9 accepted fields driven through the service, no `set()` ever contains an auth column. |
| Object storage removes the object | Wired + call-order proof; 11 tests in the new sink spec. |

Backend typecheck after all edits: `node --max-old-space-size=8192 tsc --noEmit -p tsconfig.json` → **exit 0, 0 errors**.

## Boxes left open (2), honestly

1. **"across every remaining sink"** — `support_tickets.requester_email` / `requester_name` are never anonymised for tickets the subject raised, and `support_ticket_embeddings` holds a pgvector of those tickets. Not fixed: the brief told me DB PII erasure was done and to move on. One `update(supportTickets)` inside the existing transaction closes it.
2. **"document/payroll/export/purge/retention never silently truncate"** — two silent truncations found, both outside my territory (see P1s).

## P0 found and fixed

**`GdprStoragePurgeService` had zero callers.** It was provided AND exported by `GdprModule`, fully specced, and no route or service ever invoked it. `POST /gdpr/erasure/:subjectId` anonymised the database only, so every avatar, payslip and uploaded document survived the record that named it — exactly the orphaned-object defect the ticket describes. Now injected into `GdprSubjectErasureService`.

**Manifest ordering.** The manifest is built BEFORE the transaction. Building it after would read `*_key` columns the erasure has already nulled, so those objects would be unreachable and permanent. Asserted with `invocationCallOrder`.

**Latent org-wide data destruction.** `collectSubjectFileKeysWithLegalHold` falls back to `org_id IN (...)` for tables with no FK to `users`, returning EVERY file key in the tenant for that table. Wiring the purge in unchanged would have deleted other people's objects on a single subject erasure. Fixed inside my territory: `source === "org-id"` keys now go to `skipped[]` with a reason and are never passed to `deleteFile`, and the count is audited. Bite proof asserts `deleteFile` is called once, for the user-FK key only.

## P1 found, NOT fixed (other agents' territory)

1. `src/modules/cron/cron-mail-retention.service.ts`, `cron-announcements-retention.service.ts`, `cron-helpdesk-retention.service.ts` — one `LIMIT BATCH_SIZE` delete per org per tick, no loop, no "rows still eligible" signal. A backlog above the batch size is carried silently forever. Contrast `cron-outbox-retention`, which caps at `MAX_BATCHES` but returns `truncated: true` and logs.
2. `src/modules/organization/core/org-purge.service.ts:69` — `listMemberUserIds` uses a bare `.limit(10000)`; members past 10 000 never get caches busted or org-scoped access revoked during a purge.
3. `src/modules/gdpr/gdpr.service.ts` sync export carried three STALE `exportIncomplete` notes claiming audit logs, blob keys, chat and mail were unavailable when the async export returns all of them. Fixed (my territory), noted here because it misrepresented the product to data subjects.
4. `kb_ingestion_checkpoints` stored the subject's chunk text AND its embedding, keyed by `(content_type, content_id)` with no FK to `kb_article_chunks`, so deleting the chunks left the vector behind. Fixed inside erasure.
5. **Not mine:** `src/modules/storage/storage-onboarding.controller.spec.ts` has 2 failures (expects a `https://cdn.example.com/...` URL, gets a bare key). `storage-onboarding.controller.ts` mtime 16:57 vs spec 16:24 — a concurrent agent's edit. I touched no file in `src/modules/storage/`.
6. `src/modules/gdpr/gdpr-subject-erasure-kb-erasure.spec.ts.neutered` is a stray superseded copy of a spec. Jest does not run it. Deleting it is safe; I left it alone.
7. Residual sink not covered by the file-key catalog: `enumerateFileKeyColumns` matches only `%_key`, `file_url`, `storage_url`, `document_url`. `organization_people.avatar_url` and `users.image` are nulled by erasure but never enumerated, so if either ever holds a storage key the object is orphaned. No avatar upload endpoint exists today, so this is latent.

## Files changed (all absolute)

- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-subject-erasure.service.ts`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-storage-purge.service.ts`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr.service.ts`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-subject-erasure.spec.ts`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-subject-erasure-kb-erasure.spec.ts`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-erasure-storage-sink.spec.ts` (new, 11 tests)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/gdpr/gdpr-rectification-auth-linked-fields.spec.ts` (new, 11 tests)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/issues/18-gdpr-erasure-sinks-and-export.md`

No git commands were run. No file outside `src/modules/gdpr/**` was edited.

---

## Session 18d — the two remaining items

**1. `chat_attachments` — the last open sink — is closed, and it never needed the chat module.**

18c reverted its own implementation because reaching the subject's messages took an
unpredicated read of `chat_messages`, which pushed `check:lifecycle-predicates` to 76/75 and
`check:unbounded-reads` to 1 unclassified. That reach-through was avoidable. The
`chat_messages` redaction inside `anonymiseSubjectConversations` already updates exactly the
rows the attachment sink must follow — every message the subject sent, soft-deleted ones
included — so it now returns their ids (`ConversationErasure { tables, chatMessageIds }`) and
`gdpr-subject-erasure-chat-attachments.ts` is driven by that `RETURNING` rather than by a second
read. No new read site exists.

- `DELETE ... RETURNING file_key` inside the erasure transaction, so there is no window in
  which the row is gone and the object is unnamed.
- Keys are tagged `source: "user-fk"`. `purgeFromManifest` skips `org-id` keys by design, which
  is the precise reason the file-key catalog could never reach this table.
- Ids are spent `ERASURE_ID_PAGE` (200) at a time.

Ratchets, measured after the change:
`pnpm -s check:lifecycle-predicates` -> exit 0, primary-read candidates **75 (baseline 75)**,
join candidates **335 (baseline 335)**.
`pnpm -s check:unbounded-reads` -> exit 0, **offset ACTIONABLE 0, unbounded ACTIONABLE 0**.

**2. `gdpr.export.requested` had a payload schema nothing validated with.**

`GdprExportRequestedConsumer.handle` called `worker.wake()` on any row carrying the event type
and returned success, so `OutboxPublisherService` marked the event DELIVERED whatever it
contained. Two failures were invisible: a payload the producer had drifted away from still
reported delivered while no export ever ran, and a payload whose `orgId` disagreed with the
outbox row's `organization_id` — the tenant binding the relay leases and audits on — was waved
through. The schema is now `.strict()`; a bare `z.object({})` strips an unexpected key rather
than rejecting it, which is what turns a dropped field into a wrong-subject write. The consumer
`safeParse`s, cross-checks the tenant, and throws on either failure so the event goes to the
retry ladder and finally to the dead-letter the dead-outbox alert reports.

## Proofs run and read

| Command | Exit | Number |
|---|---|---|
| `jest --runInBand --testPathPattern="src/modules/gdpr\|support-ticket-erasure\|src/common/outbox"` | 0 | 25 suites, 302 tests passed |
| `pnpm -C streamlineos-backend typecheck` | 0 | 0 errors |
| `pnpm -s check:lifecycle-predicates` | 0 | 75/75 primary, 335/335 join |
| `pnpm -s check:unbounded-reads` | 0 | 0 actionable |
| `pnpm -s check:dead-code` | 0 | 35 verdicts, 0 stale |

Bite proofs, each run and read, each file restored byte-identical (sha256 verified):

| Mutation | Result |
|---|---|
| attachment drain capped to a single page | **2 failed / 11 passed / 13** — "Expected: 3, Received: 1" and "Expected length: 413, Received length: 200" |
| `.strict()` removed + org cross-check forced false | **3 failed / 6 passed / 9** |

## Cross-territory findings

1. **The dead GDPR export re-export chain cannot be removed from this territory alone.**
   knip (importer graph 9,811 files / 68,252 edges) confirms five dead symbols:
   `GDPR_EXPORT_SOURCE_ADAPTERS` in `gdpr-export-adapters.ts`, `gdpr-export-worker-implementation.ts`
   and `gdpr-export-worker.service.ts`, plus `SUBJECT_SCOPED_GDPR_EXPORT_SOURCES` in the latter two.
   (The brief's "four names nobody imports" in `gdpr-export-worker.service.ts` is two: the other four
   forwarded names are imported by `gdpr-export-worker-tenant-isolation.spec.ts`.)
   `check:dead-code` fails a verdict whose finding knip no longer reports, so deleting the exports
   without deleting the five matching ledger lines in `src/scripts/check-dead-code.mjs` turns the gate
   red. That script is outside this territory. **Coupled change required:** delete the 5 exports and
   the 5 ledger entries in one commit.

2. **Same coupling blocks the ledger's own WIRE prescription.** The ledger says
   `GdprExportRequestedPayload` should be wired because "nothing validates the payload on the consuming
   side today, which is the defect". The defect itself is now fixed — the consumer validates with
   `gdprExportRequestedPayloadSchema`. Wiring the exported *type alias* as well was tried and
   **measured**: `check:dead-code` exits **1** with "1 stale verdict — src/modules/gdpr/dto/
   gdpr-export-outbox.schemas.ts:GdprExportRequestedPayload". Reverted to keep the gate green.
   The ledger line should be deleted and the type wired in the same commit.

3. `src/modules/gdpr/gdpr-subject-erasure-kb-erasure.spec.ts.neutered` is still tracked in git. It is
   a superseded bite-proof copy of a live spec; jest and tsc both ignore it, but it reads like a real
   spec in the tree. Left in place (an earlier report also flagged and left it).
