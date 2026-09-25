# Session 07 — Ask UI: source scope sheet, answer parts, tenant quotas

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S16, the UI and quota half. The schema half is SESSION-06 — do not edit its files.

**The defects, measured 2026-09-25.** There is **no pre-send source scope sheet**: the user cannot
see or change which pages, files and notes Ask will read before sending, so sources are
auto-selected invisibly. Only **1 of 6 answer parts** is rendered — citations, source passage,
freshness, verification, disagreement and insufficient-evidence were specified; most are missing.
The indexed-bytes quota is absent entirely, so one tenant can index without bound.

**Migration tag allocated to you:** `1212_kb_indexed_bytes_quota`.

## Files you own

Frontend:
- `frontend/features/wiki/components/kb-chat-parts.tsx`
- `frontend/features/wiki/components/kb-conversation-list.tsx`
- `frontend/features/wiki/components/kb-sources-sheet.tsx`
- `frontend/features/wiki/components/knowledge-base-page.tsx`
- `frontend/features/wiki/components/kb-note-sheet.tsx`, `kb-note-schema.ts`
- `frontend/app/(authenticated)/knowledge/chat/page.tsx`
- `frontend/hooks/api/kb/ask.ts`, `ask-result-schema.ts`, `ask-idempotency.test.tsx`
- `frontend/hooks/api/kb/chat-history.ts`, `chat-history-signal.test.tsx`, `kb-chat-schema.ts`
- `frontend/hooks/api/kb/sources.ts`, `kb-sources-schema.ts`, `sources-poll.test.ts`
- `frontend/hooks/api/kb/kb-citation-contracts.test.ts`

Backend (`backend/src/modules/kb/`):
- `retrieval/kb-ask.controller.ts` + `kb-ask.controller.e2e-spec.ts`
- `retrieval/kb-ask-generate-permission.spec.ts`
- `retrieval/kb-ask-stream-parity.spec.ts`
- `retrieval/kb-conversations.controller.ts`
- `retrieval/dto/` — Ask and conversation DTOs
- `wiki/kb-sources.controller.ts`, `wiki/kb-sources.service.ts` + their specs

Migration: `backend/migrations/1212_kb_indexed_bytes_quota.sql` + its rollback.

## Todo

- [ ] Measure first: list which of the six answer parts render today, with `file:line`, and confirm
      no pre-send scope control exists.
- [ ] Pre-send source scope sheet: pages, files and notes, filterable by space, owner, status and
      verified-only. Visible **and editable before send**, and what it shows is what is actually
      retrieved — not a decorative summary.
- [ ] The scope the user chose is sent with the request and honoured server-side. A scope the actor
      cannot read is not silently widened.
- [ ] All six answer parts render: citations, the source passage behind each citation, freshness,
      verification state, disagreement between sources, and an explicit insufficient-evidence
      result. Insufficient evidence is a first-class answer, not an empty state.
- [ ] Citations are accepted only when they map to a retrieved, still-authorized passage. A
      citation that no longer resolves is redacted, not rendered.
- [ ] Access-change handling after an answer was generated: re-opening a conversation re-checks
      citations against current ACLs.
- [ ] Streaming stop and retry; network-loss recovery; copy; helpful/unhelpful; report wrong or
      stale; create knowledge gap.
- [ ] Conversation rail: new, search, rename, delete, cursor-paginated.
- [ ] Tenant quotas enforced and surfaced: requests, tokens, concurrent streams, **indexed bytes**,
      research jobs. `1212` adds the indexed-bytes accounting, tenant-leading, with a rollback and
      a postcondition.
- [ ] Over-quota is a clear, actionable state with the limit named — not a generic error.
- [ ] `kb:ai:generate` plus read access required on generation routes; history routes stay on
      `kb:pages:view`. `kb-ask-generate-permission.spec.ts` pins this — keep it passing.
- [ ] Remove confidence percentages, uncited prose, hidden auto-selected sources, and any draft in
      browser storage.
- [ ] All six states on `/knowledge/chat`; keyboard path for scope editing, stop and retry;
      usable at 375 px.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output and file:line here as you close each box)_
