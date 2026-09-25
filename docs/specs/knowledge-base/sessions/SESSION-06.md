# Session 06 — Ask observability: `kb_ai_interactions` and a reconstructable record

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S16, the data half. The UI half is SESSION-07 — do not edit its files.

**The defect, measured 2026-09-25.** `kb_ai_interactions` **does not exist.** The record of a
single Ask is spread across five tables that cannot be joined, and `kb_events` has no
`correlation_id`, so one Ask cannot be reconstructed after the fact. Cost, latency, which
passages were sent, which model answered, and what the user did with the answer are not
recoverable together. This blocks cost accounting, abuse investigation, and every quota in S16.

**Migration tags allocated to you:** `1208_kb_ai_interactions`, `1209_kb_events_correlation_id`.

## Files you own

Backend (`backend/src/`):
- `db/schema/kb/chat.ts`, `db/schema/kb/events.ts`, `db/schema/kb/credits.ts`
- **NEW, yours to create:** `db/schema/kb/ai-interactions.ts`
- `modules/kb/retrieval/kb-ask.service.ts` + `kb-ask.service.spec.ts`
- `modules/kb/retrieval/kb-ask-context.ts` + `kb-ask-context-precedes-model.spec.ts`
- `modules/kb/retrieval/kb-chat-history.service.ts` + `kb-chat-history-tenant-isolation.spec.ts`
- `modules/kb/retrieval/kb-context-passage-provenance.spec.ts`
- `modules/kb/core/kb-events.service.ts` + `kb-events-off-read-path.spec.ts`
- `modules/kb/core/kb-credits.service.ts` + `kb-credits-tenant-isolation.spec.ts`

Migrations: `1208_kb_ai_interactions.sql`, `1209_kb_events_correlation_id.sql` + both rollbacks.

`db/schema/kb/index.ts` is a shared barrel — add your export, change nothing else in it, and note
the edit in `## Handoffs` so the orchestrator can check for a collision.

## Todo

- [ ] Measure first: name the five tables the Ask record is spread across today, with `file:line`,
      and show concretely why one interaction cannot be reconstructed.
- [ ] Design `kb_ai_interactions`: tenant, actor, conversation and message ids, provider, model,
      prompt policy version, source ids **with the revisions that were live at send time**, token
      counts in and out, latency, result state, feedback, and cost. Tenant-leading primary and
      unique keys; tenant-composite FKs.
- [ ] `1208` creates it with RLS armed and the grants the app role needs. A table created without
      grants fails `42501` and reads like an RLS denial — grant explicitly.
- [ ] `1209` adds `correlation_id` to `kb_events`, indexed, so every event emitted for one Ask
      joins back to its interaction row.
- [ ] `kb-ask.service.ts` writes exactly one interaction row per Ask, and every event it emits
      carries the same `correlation_id`.
- [ ] The interaction row and the source mutation commit together. No provider call, embedding
      call or object-store call holds the database transaction open.
- [ ] Streaming path writes the same record as the non-streaming path — verify against
      `kb-ask-stream-parity.spec.ts` (SESSION-07 owns the Ask controller; if the stream handler
      commits early, post a `HANDOFF`).
- [ ] Source ids are recorded with the ACL revision that was current at send time, so a later
      revocation is detectable rather than silently rewriting history.
- [ ] Cost and token counts land on the row, and `kb-credits.service.ts` reads from it rather than
      recomputing.
- [ ] No page bodies, titles, queries, tokens or filenames in metrics or logs — only ids, counts
      and states.
- [ ] Tenant-isolation spec: an interaction row is unreachable cross-tenant on every read path.
- [ ] Reconstruction spec: given one `correlation_id`, every event, citation and cost line for that
      Ask is recoverable in a single query.
- [ ] Interruption spec: a provider failure mid-Ask still leaves a coherent interaction row in a
      terminal state, not a dangling one.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` and `pnpm typecheck:test` (backend, under the lock) clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output, file:line, and schema verification here as you close each box)_
