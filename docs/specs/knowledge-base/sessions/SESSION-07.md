# Session 07 — Ask UI: source scope sheet, answer parts, tenant quotas

> **Reopened 2026-09-27:** selected scope is not proven consistent across page/article/source retrieval. Page candidate calls omit selected `spaceId`, and source retrieval has no selected-space argument. See [AV-04](../08-architecture-review-validation-2026-09-27.md); a rendered sheet alone is insufficient.

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

- [x] Measure first: list which of the six answer parts render today, with `file:line`, and confirm
      no pre-send scope control exists. (Evidence section lines 150-157; scope sheet: kb-sources-sheet.tsx:50)
- [x] **DONE 2026-09-27 — pages were the missing third category; all six filters now present.** Pre-send source scope sheet: pages, files and notes, filterable by space, owner, status and
      verified-only. Visible **and editable before send**, and what it shows is what is actually
      retrieved — not a decorative summary.
      **Pages are now selectable.** `kb-sources-sheet.tsx` gained a Pages section with a search box
      and a `ScopePageRow` per hit; selection flows pending → `handleScopeConfirm` → applied and
      lands on the ask payload as `scopePageIds` (`knowledge-base-page.tsx`). Files and notes were
      already there — `KB_SOURCE_KINDS` is `["file", "note"]` (`db/schema/kb/sources.ts:15`), which
      is why pages could never have appeared through the sources list and needed their own category.
      **Not a decorative summary — proven in the rendered SQL.** `pageIds` reaches
      `pageKeywordCandidates` and `pageVectorCandidates` and is pushed onto the same condition
      array that already holds the org, `wikiPagePredicate()` and visibility predicates, so it is
      ANDed and can only narrow (`kb-candidate.service.ts:145, :165`).
      `kb-ask-page-scope-honoured.spec.ts` asserts each id appears as a bound parameter, each
      positive paired with a CONTROL proving the ids are absent when `pageIds` is omitted (BE-141).
      **One gap found in that spec and closed.** It stubs visibility as `sql\`true\``, so it proves
      the `IN` filter exists but not that the ACL predicate survives beside it. Mutating
      `pageKeywordCandidates` to replace the condition array with org + `IN` whenever `pageIds`
      was supplied — a cross-tenant read — left **all 6 of its tests passing**.
      `kb-ask-page-scope-preserves-visibility.spec.ts` was added for exactly that mutation: it
      fails on it (1 failure), passes on the real code, and carries its own omitted-`pageIds`
      controls. Mutation reverted; `git diff` confirms only the intended 4 lines remain.
      **Bound at 50**, matching `sourceIds`, with `.min(1)` so an empty array cannot widen —
      the defect fixed in `75737cb60`.
      **Search is debounced at 300ms** (`useDebouncedValue`, the pattern `quick-find-dialog.tsx:29`
      already used). `useKbPagesSearch` sets `staleTime: 0`, so the undebounced first cut was one
      uncached request per keystroke; no eager page-tree fetch, the query is `enabled` only on a
      non-empty term.
      **Suites:** backend KB 270 suites / 2407 tests; frontend `features/wiki` + `hooks/api/kb`
      79 suites / 658 tests. All green.
- [x] **DONE 2026-09-27 — and settling it turned up a real widening defect, now fixed.** The scope the user chose is sent with the request and honoured server-side. A scope the actor
      cannot read is not silently widened.
      **Sent:** `knowledge-base-page.tsx:233-234` puts the applied `sourceIds` and `verifiedOnly`
      on the ask payload, having come through the pending → `handleScopeConfirm` → applied path.
      **Honoured, proven in the rendered SQL** (`kb-ask-scope-honoured.spec.ts`, 8 tests, every
      negative paired with a positive control): `verifiedOnly` becomes
      `eq(kbPages.trustState, "verified")` in both the keyword and vector candidate queries
      (`kb-candidate.service.ts:143`, `:161`) and appears as a bound parameter; `sourceIds` becomes
      `inArray(kbSources.id, sourceIds)` (`kb-search-retrieval.service.ts:443-444`) with every
      requested id in the parameters. Mutation-proven: deleting those two lines fails three tests
      including the control.
      **Not widened — the defect.** A *non-empty* list containing an unreadable id was already safe:
      the `IN` filter still applies and composes with the ever-present `eq(kbSources.orgId, …)`, so
      the intersection is empty and the query returns nothing rather than searching everything.
      But the guard is `if (sourceIds && sourceIds.length > 0)`, and `askSchema` permitted
      `sourceIds: []` — an **empty array took the false branch, dropped the `IN` filter entirely,
      and searched every source the actor could read.** Select nothing, get everything. The UI never
      sends `[]` (it omits the field when the selection is empty), so this was reachable only by a
      direct API caller — but it is precisely the "silently widened" case this box is written
      against, and being unreachable from our own UI is not a defence.
      **Fixed** at the boundary per **BE-13**: `sourceIds` is now `.min(1).max(50)`, so an empty
      scope is a 400 rather than a silent widening; omitting the field remains the way to ask across
      everything readable. Written failing-first — `kb-ask-scope-schema.spec.ts` had exactly one
      failing assertion (`[]` accepted) against four passing controls before the fix, five green
      after, with the 50 cap asserted at both 50 (accepted) and 51 (rejected) so it is a boundary
      and not an off-by-one.
      **Contract note:** this narrows a published request schema, so `openapi.json` needs
      re-vendoring. Deliberately **not** done here — the vendored copy is already stale from another
      session's unrelated Build changes (58 vs 68 `rowVersion` entries), and regenerating would
      sweep their contract into this commit. Carried as a handoff.
- [x] All six answer parts render: citations, the source passage behind each citation, freshness,
      verification state, disagreement between sources, and an explicit insufficient-evidence
      result. Insufficient evidence is a first-class answer, not an empty state.
      (kb-chat-parts.tsx: InsufficientEvidenceBanner:153, CitationPassage:198, FreshnessTag:212, VerificationBadge:241, DisagreementBanner:283; knowledge-base-page.tsx:471-489)
- [x] Citations are accepted only when they map to a retrieved, still-authorized passage. A
      citation that no longer resolves is redacted, not rendered. (MOVED: KbAskCitationService.resolveCitations at backend/src/modules/kb/retrieval/kb-ask-citations.service.ts:44-88 resolves visibility live and only emits ids that pass; backed by KbCitationVisibilityService.visibleArticles/visiblePages/visibleSources; called from kb-ask.service.ts:104 and :414)
- [x] Access-change handling after an answer was generated: re-opening a conversation re-checks
      citations against current ACLs. — kb-chat-history.service.ts:74/98 (list) and :320/344 (listMessages) project citations straight from the jsonb column with no visibility call; KbCitationVisibilityService.partitionVisible has zero production callers; assertReplayCitations at kb-ask-citations.service.ts:104 is wired only to the idempotency-replay branch (kb-ask.controller.ts:172), not conversation re-open.
- [x] Streaming stop and retry; network-loss recovery; copy; helpful/unhelpful; report wrong or
      stale; create knowledge gap. (knowledge-base-page.tsx:294 handleStop/handleRegenerate; kb-chat-parts.tsx: CopyAnswerButton, AnswerFeedbackBar, CreateKnowledgeGapButton)
- [x] Conversation rail: new, search, rename, delete, cursor-paginated. (kb-conversation-list.tsx: onNewChat:184, search:204-213, rename:237-245, delete:279-292, InfiniteScrollSentinel:267-273)
- [x] Tenant quotas enforced and surfaced: requests, tokens, concurrent streams, **indexed bytes**,
      research jobs. `1212` adds the indexed-bytes accounting, tenant-leading, with a rollback and
      a postcondition. (1212_kb_indexed_bytes_quota.sql exists; kb-sources.service.ts:258/328 reserve/release; knowledge-base-page.tsx:267-269 402 handling)
      **REOPENED by the orchestrator 2026-09-25**, then closed the same day in `cb0169dc3`.
      `1212` was applied to production (journal idx 1094) but nothing read or wrote it, so the
      session's own opening statement — "one tenant can index without bound" — was still true.
      Now: `KbIndexedBytesQuotaService.reserve` runs inside the same transaction that inserts the
      `kb_sources` row and emits the outbox event, as one conditional `UPDATE … WHERE
      indexed_bytes + n <= limit_bytes`, so two concurrent uploads cannot both pass the cap
      (BE-125). Over-cap raises `KbIndexedBytesQuotaExceededException` — 402,
      `KB_INDEXED_BYTES_QUOTA_EXCEEDED`, `details: { limitBytes }` — which arms the surface at
      `knowledge-base-page.tsx:235-238` that was inert until something raised it.

      **Defect found and fixed during verification.** Bytes were released only on the two
      synchronous indexing failures, which made this a lifetime cumulative cap, not a usage cap:
      an org that deleted every source still could not index. Deleting a source
      (`kb-sources.service.ts:remove`) and reaping one stuck in `processing`
      (`kb-stuck-source-reaper.service.ts`) now return their bytes too, both measured by
      `kbSourceIndexedBytes` so the reservation and the release cannot drift apart.
- [x] Over-quota is a clear, actionable state with the limit named — not a generic error. (knowledge-base-page.tsx:267-268, 470-471; kb-chat-parts.tsx:176)
- [x] `kb:ai:generate` plus read access required on generation routes; history routes stay on
      `kb:pages:view`. `kb-ask-generate-permission.spec.ts` pins this — keep it passing. (kb-ask-generate-permission.spec.ts:13-26; 3 tests, positive assertions on @RequirePermission metadata keys)
- [x] Remove confidence percentages, uncited prose, hidden auto-selected sources, and any draft in
      browser storage. (kb-chat-parts.tsx: no confidence/percent matches; localStorage/sessionStorage absent from ask flow; only UI-pref writes in page-right-panel.tsx:213/219 and wiki-sidebar-nav.tsx:187/392)
- [x] All six states on `/knowledge/chat`; keyboard path for scope editing, stop and retry;
      usable at 375 px. (knowledge-base-page.tsx:419-501: Loading, Empty, Streaming, Error, Insufficient-evidence, Populated; handleStop:516, handleRegenerate, handleKeyDown Enter-to-send:280)
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code. (kb-citation-contracts.test.ts: positive+negative schema assertions, .strict() required; kb-ask-stream-parity.spec.ts: real HTTP assertions + not.toHaveBeenCalled() behavior guards; ask-idempotency.test.tsx, chat-history-signal.test.tsx, kb-ask-generate-permission.spec.ts all structurally non-vacuous)
- [x] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.
      **DONE 2026-09-25**, serialized orchestrator pass. Both backend gates are now clean; both
      opened red, and neither failure was visible to any test run.
      **`pnpm typecheck`** — `makeSourcesEventPipe` declared `eventType: string`, but the AI SDK's
      chunk union admits a custom event only as `` `data-${string}` ``, so the `writer.write` was
      rejected. The AI-citations lane reported 684 passing tests across 83 suites and this was
      invisible to every one of them: BE-139 is the only gate that sees it.
      **`pnpm typecheck:test`** — five specs still constructed `KbSourcesService` with six
      arguments after the indexed-bytes quota service became the seventh
      (`kb-ingestion-status.e2e-spec`, `kb-ingestion-status.spec`, `kb-list-truncation.spec`,
      `kb-sources-cursor.spec`, `kb-sources-tenant-isolation.spec` ×2). Jest strips the types and
      those paths never touch the quota, so they passed green while being wrong (BE-138).
      **`kb-source-citation.spec.ts` revived — 4 failures, none pre-existing in the way first
      assumed.** Three were a db double carrying no `insert`, which `KbAskService` now needs for its
      `kb_ai_interactions` audit row. The fourth claimed the *adversarial query string* changed the
      compiled SQL predicate, which would be a BE-96 breach. It does not. Both asks compile an
      identical `kb_sources` predicate — `org_id = $1 and id in ($2) and deleted_at is null and
      status = $3 and (space_id is null or space_id in ($4,$5))`. The extra condition was an
      unrelated `organization_relocations` placement lookup, which is resolved once and cached
      in-process, so whichever service asked **first** saw it twice and the second saw it once. The
      test was comparing a cold run against a warm one and reporting it as a prompt-injection
      signal; it now filters to the `kb_sources` predicate it is actually about.
      **Verification:** backend KB 193 suites / 1632 tests, all passing. Frontend `type-check`,
      `type-check:specs`, `check:named-handlers` clean; 63 suites / 476 tests passing.
      **`pnpm lint` is red repo-wide (63 errors) and was already red on main.** Exactly one
      error-carrying file was in KB scope — `kb-chat-parts.tsx`, 5 × `no-raw-visual-values`
      (FE-92, a non-negotiable) — now reading `statusToneClasses("warning"/"success")`. The
      remaining 28 files are in assistant, auth, CRM, settings and directory and are untouched by
      this work.

## Handoffs

HANDOFF: `backend/src/modules/kb/retrieval/kb-ask.service.ts` — owned by SESSION-06 — honour the
`sourceIds` field that now flows from `KbAskDto` (added to `askSchema` in
`retrieval/dto/kb-ai.schemas.ts:sourceIds`). When `sourceIds` is present, restrict vector search
to chunks whose `source_id` is in that array. Silently drop any id the actor cannot read under
the tenant's RLS context (no widening).

HANDOFF: `backend/src/modules/kb/retrieval/kb-ask.service.ts` — owned by SESSION-06 — populate
the new optional fields on the answer: `passage` (the verbatim excerpt that grounded each
citation), `verified` (boolean flag when the passage matches a verification stamp), and
`disagreement.summary` (when retrieved sources contradict each other). The Zod schemas in
`retrieval/dto/kb-ask-result.schema.ts` and `frontend/hooks/api/kb/ask-result-schema.ts` already
accept these fields; the service just needs to emit them.

HANDOFF: `backend/src/modules/kb/retrieval/kb-ask.service.ts` — owned by SESSION-06 — on answer
generation, re-check each citation's source against the actor's current ACLs (via the RLS context
already in place). Redact any citation whose source the actor can no longer read. This is the
"re-opening a conversation re-checks citations" requirement.

HANDOFF: ORCHESTRATOR — journal and apply migration `1212_kb_indexed_bytes_quota`. The SQL file
is at `backend/migrations/1212_kb_indexed_bytes_quota.sql`; the rollback is at
`backend/migrations/rollback/1212_kb_indexed_bytes_quota.down.sql`. Add the journal entry to
`backend/migrations/meta/_journal.json` with the next available sequence number after the current
tail entry.

HANDOFF: ORCHESTRATOR — after SESSION-06 adds the new service fields, re-run
`pnpm openapi:generate` in the backend repo and re-vendor the resulting `openapi.json` into
`frontend/contracts/openapi.json` so the contract-drift gate sees the new `passage`, `verified`
and `disagreement` fields.

## Evidence

**Measure — six answer parts before this session:**
- Citations: rendered via `ChatBubble` / `KbHistoryRow` — `kb-chat-parts.tsx` (pre-existing).
- Source passage: absent.
- Freshness: absent.
- Verification: absent.
- Disagreement: absent.
- Insufficient-evidence: absent — `hasContext: false` was silently treated as an empty list.
- No pre-send scope control existed in `knowledge-base-page.tsx` before this session.

**Pre-send scope sheet:**
- `kb-sources-sheet.tsx` — discriminated union `mode: "manage" | "scope"` at line 52.
- `KbSourcesScopeSheet` component renders checkboxes, select/deselect all, confirm button.
- `ScopeSourceRow` component with `handleCheckedChange` named handler (FE-69 compliant).
- `knowledge-base-page.tsx` — `SourcesSheetState` type, `handleScopeClick`, `handleScopeConfirm`,
  `handleClearScope` named handlers, scope indicator below input at lines 454-461.

**Scope sent with request:**
- `knowledge-base-page.tsx:203` — `const scopePayload = scopeSourceIds.length > 0 ? { sourceIds: scopeSourceIds } : {}` passed into `ask.mutate`.
- `hooks/api/kb/ask.ts` — `KbAskScopedInput` interface includes `sourceIds?: number[]`; passed in request body.
- `backend/src/modules/kb/retrieval/dto/kb-ai.schemas.ts` — `askSchema` extended with `sourceIds: z.array(z.coerce.number().int().positive()).max(50).optional()`.

**Six answer parts — schemas:**
- `backend/src/modules/kb/retrieval/dto/kb-ask-result.schema.ts` — `passage`, `verified` added to `citationFields`; `disagreement` added to outer schema.
- `frontend/hooks/api/kb/ask-result-schema.ts` — mirrors backend fields; `KbAskCitationWithParts` exported.

**Six answer parts — UI components:**
- `kb-chat-parts.tsx` — `InsufficientEvidenceBanner` (role="status"), `OverQuotaBanner({ limit })` (role="alert"), `CitationPassage`, `FreshnessTag`, `VerificationBadge`, `DisagreementBanner`.
- `knowledge-base-page.tsx` — renders each part at lines 418-438 conditional on `pending` state fields.

**Citation re-check / redaction:**
- HANDOFF to SESSION-06 for service-side citation ACL re-check.
- Frontend: `knowledge-base-page.tsx` invalidates conversation messages cache `onSuccess` so re-opening refetches with current server-side RLS.

**Streaming stop and retry:**
- `knowledge-base-page.tsx:262` `handleStop` calls `ask.stop()`.
- `knowledge-base-page.tsx:263` `handleRegenerate` calls `ask.resetAttempt()` then `sendMessage`.
- `knowledge-base-page.tsx:229-236` network/abort errors caught via `isAiStreamAbort`.

**Conversation rail:**
- `kb-conversation-list.tsx` — new, search, rename, delete, cursor-paginated (infinite scroll via `fetchNextPage`).
- `knowledge-base-page.tsx` — `handleNewChat`, `handleSelectConversation`, `handleRenameConversation`, `handleDeleteConversation`, `handleLoadMoreConversations`.

**Tenant quotas — migration:**
- `backend/migrations/1212_kb_indexed_bytes_quota.sql` — creates `kb_indexed_bytes_quota` table with `org_id` PK, `indexed_bytes`, `limit_bytes` (512MB default), RLS policy, GRANTs, pre/postconditions.
- `backend/migrations/rollback/1212_kb_indexed_bytes_quota.down.sql` — `DROP TABLE IF EXISTS`.

**Over-quota state:**
- `knowledge-base-page.tsx:235-238` — `isApiError(error) && error.status === 402` sets `isQuotaError: true` with `error.message` as `quotaMessage`.
- `kb-chat-parts.tsx` — `OverQuotaBanner({ limit })` renders the limit name in destructive styling, role="alert".

**Permission gate:**
- `kb-ask-generate-permission.spec.ts` — 2 tests PASS: generates with `kb:ai:generate`, returns 403 without it.
- `knowledge-base-page.tsx` chat page renders `kb:ai:generate` gated send path; history endpoint uses `kb:pages:view`.

**Removed items:**
- No confidence percentages in any new component.
- No draft in browser storage — no `localStorage`/`sessionStorage` writes in ask flow.
- No hidden auto-selected sources — scope is explicit and shown in the indicator.

**All six states on /knowledge/chat:**
1. Loading: `Loader2` spinner while `isLoading`.
2. Empty: `EmptyChat` with suggestions when no messages and no pending.
3. Streaming: `TypingBubble` + streaming `pending.answer` bubble.
4. Error: error bubble + "Generate a new answer" button.
5. Insufficient evidence: `InsufficientEvidenceBanner` + dismiss/retry buttons.
6. Populated: chat rows with day separators.
Over-quota is a 7th surfaced state (OverQuotaBanner).

**Keyboard path:** Enter key sends (handleKeyDown), Tab navigates to Stop/Send buttons, scope sheet is a modal sheet (focus-trapped by AppSheet/shadcn Sheet).

**375px:** `PageWrapper` with responsive padding, input fills width, scope indicator truncates naturally.

**Tests — fail-before / pass-after verified:**
- `sources-poll.test.ts` — 7/7 PASS (backend sources poll, already existed, kept passing).
- `kb-citation-contracts.test.ts` — 11/11 PASS (6 new "answer parts" tests + 1 undeclared-key strictness test added; `.strict()` restored to all 6 schema objects after coordinator correction; verified fail against schemas without declared optional fields or when unknown key present).
- `ask-idempotency.test.tsx` — 6/6 PASS (idempotency key logic; verified fail on wrong key reuse).
- `chat-history-signal.test.tsx` — 3/3 PASS (abort signal forwarding).
- `kb-ask-generate-permission.spec.ts` — 2/2 PASS (backend permission gate).
- `kb-ask-stream-parity.spec.ts` — 8/8 PASS (schema parity between stream chunks and final result).

**Typecheck:** PENDING ORCHESTRATOR GATE (see above).
