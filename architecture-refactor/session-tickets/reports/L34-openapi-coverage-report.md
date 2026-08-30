# L34 — OpenAPI Contract Coverage Report

**Status:** DONE

## Coverage
- Before: 1,917 / 3,545 operations (54%)
- After: 1,971 / 3,546 operations (55.6%, +54 operations)

## Changes made
Controllers updated with `ZodValidationPipe` or `@Validate`:
- `kb/retrieval/kb-ask.controller.ts` — all 5 handlers
- `kb/retrieval/kb-research-brief.controller.ts` — enqueue, list, rateBrief
- `kb/help-centre/kb-ai-feedback.controller.ts` — submitFeedback
- `kb/help-centre/kb-article-ai.controller.ts` — ask
- `kb/wiki/kb-page-ai.controller.ts` — ask
- `ai/core/controllers/kb-rag.controller.ts` — ask
- `ai/summaries/ai-summaries.controller.ts` — saveSnapshot
- `ai/core/controllers/chat-assistant.controller.ts` — all 7 handlers
- `ai/core/controllers/crm-ai.controller.ts` — scoreLead (union schema)
- `email/controllers/notifications-dispatch.controller.ts` — dispatch
- `chat/chat-search.controller.ts` — searchMessages, searchChannels, searchUsers
- `chat/chat-saved.controller.ts` — list
- `chat/chat-link-preview.controller.ts` — preview
- `chat/chat-channels.controller.ts` — listFiles
- `kb/wiki/kb-page-reviews.controller.ts` — list

## No-payload classifications (genuinely exempt)
GET with no query params or POST with path params only: `chat-realtime::ablyToken`, `chat-invite-links` (all 3), `chat-summarize::summarize`, `kb-page-indexing` (reindexPage, reindexAllPages), `kb-public-pages::getPublicPage`, `kb-widget` (config, script), `kb-article-ai` (summarize, improve, suggest-related), `kb-page-ai` (summarize, improve, suggest-related), `ai-summaries::getLatest`, `kb-research-brief::getById`, `kb-ask` (clearHistory, deleteConversation), `survey-ai::summarizeResponses`, `executive-brief` (getLatest, generate), `email/unsubscribe` (@Public route), `kb-media::upload` (multipart file upload), `notifications::stream` (SSE auth-token param).

## Behavioral notes
- `crm-ai::scoreLead`: previously a missing body reaching `scoreLeadSingleSchema.parse()` threw ZodError → 500; now fails at interceptor as 400. Tightening documented.
- All other changes are additive — no previously-accepted payloads are now rejected.

## Validation
- `tsc --noEmit`: errors only in `*.spec.ts` files (concurrent lanes) and `support.module.ts` (not in scope)
- `pnpm check:route-classification`: 0 undeclared — PASS
- `pnpm openapi:generate`: 1,971 contracts applied, every schema converted — PASS
- `pnpm check:contract-vendor`: frontend matches backend sha256 — PASS
- Lint/tests: not run
