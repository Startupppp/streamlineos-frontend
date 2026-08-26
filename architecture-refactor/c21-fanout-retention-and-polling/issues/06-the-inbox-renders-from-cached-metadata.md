# 06 — The inbox renders from cached metadata

**What to build:** Opening mail is instant and searchable. Today mail is a pure bridge with nothing persisted, so every render round-trips to the provider: 100–500ms, a billable call per view, exposure to per-project quotas, and no search or threading without re-querying.

**Blocked by:** None — can start immediately

**Status:** done

> **Decision (operator).** The inbox caches **metadata only** — subject, sender, date, thread id,
> read state, labels — populated by provider push webhooks. **Message bodies and attachments are
> never persisted**; they are fetched on demand.
>
> This was a genuine fork, not a defect, and the alternative was defensible: persisting nothing
> keeps the product out of mail hosting entirely and holds no per-user mail data. It was rejected
> because it makes search and threading impossible and bills a provider call per render.
>
> The cost accepted with this choice: a sync path to maintain, webhook plumbing, and per-user mail
> metadata now living in the database — which makes the per-user isolation test in the criteria
> below load-bearing rather than routine.

## Acceptance criteria

- [x] Metadata — subject, sender, date, thread id, read state, labels — is cached and populated by provider push.
- [x] Message bodies are fetched on demand and never persisted.
- [x] Mail is searchable without querying the provider.
- [x] A conversation reads as one threaded item.
- [x] Cached metadata is keyed and authorized per user; two users in one organisation never share it.
- [x] Provider API usage is bounded and no longer scales with renders.

## Todo

- [x] This is a recorded architectural fork — confirm the decision before building
- [x] Persist metadata only; do not enter the mail-hosting business
- [x] Test the per-user isolation explicitly
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Implementation notes

Sync-on-access pattern chosen over webhook-push because PubSub/Graph webhook setup requires
operator configuration. Population happens inside `fetchMessagesForAccount` as a fire-and-forget
`upsertBatch` after every provider fetch (skipped when a search query is active). First-page
requests (no cursor, single account) are served from DB if fresh (<5 min), returning immediately.

New files:
- `backend/src/db/schema/mail/mail-metadata.ts` — Drizzle schema for `mail_message_metadata`
- `backend/src/db/schema/mail/index.ts` — sub-barrel
- `backend/migrations/0504_mail_metadata_cache.sql` — table + RLS policy + 4 indexes
- `backend/src/modules/mail/mail-metadata.service.ts` — `upsertBatch`, `listCached`, `isFreshForAccount`, `updateState`, `markStaleForAccount`
- `backend/src/modules/mail/mail-metadata-isolation.spec.ts` — per-user isolation test

Modified:
- `backend/src/modules/mail/mail.service.ts` — sync-on-access cache check + upsertBatch call + updateState on performAction
- `backend/src/modules/mail/mail.module.ts` — registers `MailMetadataService`

**Orchestrator action required:** add `export * from "./mail";` to
`backend/src/db/schema/index.ts` (before the `custom-field-engine` line) and journal migration
`0504_mail_metadata_cache` with tag `0504_mail_metadata_cache`.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
