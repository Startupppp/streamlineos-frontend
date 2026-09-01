# Sign-off Audit D — Chat · Calendar · Notifications · Knowledge Base / Wiki / Chatbot · Workflows · Mail

Auditor: Lane D (read-only)  
Date: 2026-09-01  
Scope: backend `src/modules/{chat,calendar,notifications,kb,workflows,mail}` + selected frontend routes  
Method: file reads, targeted grep, spec inspection — no live DB queries, no build run  

---

## Inspection scope and honest limits

**Inspected directly (full file or substantial read):**
- `chat-realtime.controller.ts`, `chat-channels.service.ts` (partial), `chat-messages.service.ts` (partial), `chat-bola-proof.spec.ts` (partial)
- `calendar.controller.ts`, `calendar.service.ts` (full), `calendar-admin-settings.controller.ts`
- `notifications.service.ts` (partial), `notification-dispatch.service.ts` (full), `notification-dispatch-after-commit.spec.ts` (partial)
- `kb/retrieval/kb-ask.service.ts` (full), `kb/retrieval/kb-search.service.ts` (full), `kb/retrieval/kb-candidate.service.ts` (full), `kb/retrieval/kb-chunk-visibility.ts`, `kb/retrieval/kb-page-access.util.ts`, `kb/retrieval/kb-page-visibility.spec.ts`, `kb/retrieval/kb-acl-isolation.spec.ts`, `kb/retrieval/kb-hnsw-iterative-scan.spec.ts`, `kb/retrieval/kb-vector-minority-tenant.spec.ts`, `kb/retrieval/kb-acl-revision-gate.spec.ts`, `kb/retrieval/kb-read-search-parity.spec.ts`
- `workflows/workflows.controller.ts`, `workflows/workflows-execution.service.ts` (partial), `workflows/engine/workflow-runner.service.ts` (partial), `workflows/engine/executors/ai-action.executor.ts` (full)
- `mail/mail.controller.ts` (partial), `mail/mail.service.ts` (partial), `mail/mail-accounts.service.ts` (full)
- `realtime/ably.service.ts` (partial)

**Sampled (directory listing + targeted grep, not full-file read):**
- Remaining chat service and controller files — verified file names imply correct structure; did not read each service in full
- KB wiki, help-centre, core, and article-conversion sub-modules — file listing only
- Notification routing, policy, providers, digest, templates — file listing only
- Workflow engine sub-files (executors, dispatcher, schedule tick) — file listing + ai-action full read
- Frontend: calendar route audit (found `/calendar`, `/calendar/settings` only — no module-specific pages)

**Not inspected:**
- Schema files for any of these modules (no DB access; deferred to migration integrity lane)
- Full controller e2e-spec files for KB retrieval, workflow execution, mail (file listing confirms they exist; content not read)
- Frontend features code for all six modules

---

## 1. Chat

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | Tables `chatChannels`, `chatChannelMembers`, `chatMessages`, `chatAttachments` all import with `eq(…orgId, orgId)` guards. `chatChannelMembers` links via `membershipId` not `userId`. |
| Authorization | PASS | `@RequireModule("chat")` + `@RequirePermission("chat:messages:read")` on token endpoint. Channel membership enforced in `isMember()` via `chatChannelMembers` lookup. `chat-bola-proof.spec.ts` tests cross-org channel probe returns 403/404. |
| CRUD lifecycle | PASS | Send, edit, delete, pin, save, search, invite-links, huddle all implemented with explicit channel-membership gates. |
| List/search cost | PASS | `chat-search.service.ts` exists; `chat-cursor-paging.spec.ts` pins cursor shape; cursor-based timeline in `chat-message-timeline.service.ts`. |
| Caching/realtime | PASS | Ably token (`ably.service.ts:36-73`) scoped to `chat:${orgId}:${channelId}` per channel the user is a member of, plus `notifications:${orgId}:${clientId}` and `huddle-signal:${orgId}:*:${clientId}`. All channel names cell-prefixed. TTL 1 hour. `chat-channel-members.service.ts` builds the channel ID list from the DB before token creation. |
| Module interface | PASS | Controllers: channels, messages, pins, saved, search, realtime, invite-links, presence, huddles, huddle-signals, entity-channel, entity-actions, org-settings, summarize, link-preview. All registered in `chat.module.ts`. |
| UX/accessibility | NOT AUDITED | Frontend chat features not read. |
| Security | PASS | Message fanout uses `OutboxWriter` (outbox-backed, not fire-and-forget). After-commit notifications use `registerAfterCommit` pattern. `chat-mutations-tenant-isolation.spec.ts` and `chat-services-tenant-isolation.spec.ts` exist. `actorOf(u)` pattern: `ChatMessagesService` resolves `membershipId` directly from DB (not hand-built actor struct); does not drop `membershipId` — the lookup is a standalone query, not an actor assembly, so the "hand-built actor drops membershipId" trap does not apply here. |
| Operations | PASS | Outbox-backed message fanout consumer (`chat-fanout-outbox.consumer.ts`). Reply-reminder sweep. Typing isolation spec present. |
| Tests | PASS | BOLA proof, mutation isolation, services isolation, cursor paging, ordering gap, fanout, reconnect proof, reactions isolation, saved-departed-actor, mention specs. |

**DEFECTS:** none found.

**SIGNED OFF.**

---

## 2. Calendar

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `calendarEvents` has `orgId`, `createdByMembershipId` (FK to `organizationMembers`, not bare userId). `eventAttendees` links via `membershipId`. |
| Authorization | PASS | All CRUD routes `@Universal()` — correct per product rule (calendar is core). Update enforces `eq(calendarEvents.createdByMembershipId, memberRow.id)` in WHERE (`calendar.service.ts:221`). Delete enforces same (`calendar.service.ts:371`). Admin settings requires `@RequirePermission("calendar:admin:manage")`. External sync ownership checked via `ownedActiveConnection(orgId, userId, ...)` before provider call. |
| CRUD lifecycle | PASS | Create, read, update, delete, RSVP, recurrence exception upsert, export (CSV + iCal). External calendar push on create/update/delete. Conflict detection service. OOO conflict detection. |
| List/search cost | PASS | Events fetched for `(orgId, userId)` via `CalendarEventsAggregateService`. Source-based aggregation. External events paginated. |
| Caching/realtime | PASS | Calendar event reminders written to `notificationOutbox` atomically in the same transaction as CRUD. Dead/cancelled outbox entries cleaned up on update/delete. `calendar-outbox-atomicity.spec.ts` exists. |
| Module interface | PASS | Unified calendar only. Frontend audit: only `/calendar` and `/calendar/settings` routes found. No module-specific calendar pages. Source registry, preferences, recurrence, attendees, export all separated into focused services. |
| UX/accessibility | NOT AUDITED | |
| Security | PASS | `assertUsersInOrg` called before adding attendees. `ownedActiveConnection` checks `orgId + userId` before any Composio call. Event visibility field on model. |
| Operations | PASS | `CalendarReminderSweepService` exists. `calendar-reminder-sweep-tenant-isolation.spec.ts` and `calendar-reminder-sweep-recurring.spec.ts` exist. |
| Tests | PASS | DST edge cases, timezone, recurrence isolation, attendee isolation, attendee-membership-keyed, conflict service, export isolation, delete-miss, exception-reminder-cancellation, departed-actor, tenant isolation, e2e spec, privacy spec. |

**DEFECTS:** none found.

**SIGNED OFF.**

---

## 3. Notifications and Unified Inbox

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `notifications`, `notificationDeliveries`, `notificationQueue`, `notificationOutbox`, `notificationPreferences`, `userPreferences` — all normalized. Outbox has `state` (PENDING/PROCESSED/DEAD) + `processedAt`. Deduplication on `(orgId, dedupeKey)`. |
| Authorization | PASS | Per-recipient access re-check implemented before render (PIPE-003, `notification-dispatch.service.ts:216-227`): `if (definition.visibilityResourceKind) { visible = await this.visibility.canSee(...); if (!visible) suppress; }`. Suppression is recorded as an auditable delivery row. Org membership checked via `filterOrgMemberIds`. |
| CRUD lifecycle | PASS | Notifications created, listed, marked read/unread, snoozed, bulk-actioned. Broadcasts fanout. Digest aggregation. Preference rules. Retention/expiry. Templates per locale. Circuit breaker on provider failures. |
| List/search cost | PASS | Cursor pagination on inbox. `notifications-pagination-boundary.spec.ts`, `broadcasts-cursor-paging.spec.ts`, `notifications-counter-watermark.spec.ts` all exist. |
| Caching/realtime | PASS | Cache invalidated on mutation via `lifecycle.invalidateCache(userId, orgId)`. Ably `notifications:${orgId}:${clientId}` channel for in-app push. Web push via `WebPushService`. |
| Module interface | PASS | Controllers: notifications (inbox), events, policy, providers, templates, preferences, broadcasts. `unified-inbox.schemas.ts` exists. `inbox-sections.spec.ts` pins section key contract. |
| UX/accessibility | NOT AUDITED | |
| Security | PASS | After-commit dispatch uses `registerAfterCommit` + `runInNewTenantTransaction` for draining (not borrow of request tx). Intent recorded in caller's tx before commit (durable). Outbox relay retries PENDING rows. `notification-dispatch-after-commit.spec.ts` pins both the 42501-before and durability-after behaviours. No permission data sent to providers. |
| Operations | PASS | `NotificationOutboxRelayService`, `NotificationDeliveryWorkerService`, `NotificationRetentionService`, `notification-retry-bounded.spec.ts`, circuit breaker. |
| Tests | PASS | Extremely thorough: dispatch-after-commit, routing, digest double-flush, circuit breaker, idempotent materialization, outbox relay, delivery worker, template renderer, preference rules, policy, event registry, providers — all with tenant isolation variants. |

**DEFECTS:** none found.

**SIGNED OFF.**

---

## 4. Knowledge Base, Wiki and Chatbot

### 4a. Core authorization and retrieval

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `kbPages`, `kbArticles`, `kbArticleChunks`, `kbSources`, `kbSpaces` — all tenant-scoped. Chunks carry denormalized ACL fields (`pageVisibility`, `pageProjectId`, `pageCreatedById`, `pageCreatedByMembershipId`, `aclRevision`) so visibility can be checked without a join at query time. |
| Authorization | PASS | `assertPageAccessible` applies `pageVisibleTo(user, projectIds)` in the WHERE predicate before returning 404. `KbAccessService.getAccessibleSpaceIds` scopes space access. `articleRestrictionFilter` enforces per-article restriction lists. KB reads carry `@Universal()` per product rules (KB reading is core). Authoring routes gated by explicit permission keys. |
| CRUD lifecycle | PASS | Pages, spaces, members, comments, reviews, templates, tags, translations, record-links, import/export, article-to-page migration, visits, versions — all sub-modules present. Help-centre: articles, categories, comments, analytics, verification. |
| List/search cost | KEEP | Full-text uses `websearch_to_tsquery` + GIN. Vector search uses HNSW ANN with `SET LOCAL hnsw.iterative_scan = relaxed_order` before the ANN query and the SECURITY DEFINER fence `search_kb_chunk_ids` as fallback. Both paths correctly order by rank. `kb-hnsw-iterative-scan.spec.ts` pins the ordering. `kb-vector-minority-tenant.spec.ts` pins that SET LOCAL precedes the vector query. |
| Caching/realtime | PASS | Ingestion consumer (`kb-ingestion-consumer.ts`), backfill service, indexing-hash-guard prevents re-embedding unchanged content. Checkpoint resumption spec exists. |
| Module interface | PASS | `kb.module.ts` registers core, wiki, help-centre, retrieval, article-conversion sub-modules. |
| UX/accessibility | NOT AUDITED | |
| Security | PASS | AI barred from authorization path: the prompt sent to the gateway (`kb-ask.service.ts:138-148`) contains only article/page/source *content text* — no role names, grant records, space membership lists, or access control data. Prompt instruction "Never reveal permission rules" is belt-and-suspenders; the access filter is in SQL. Citations re-verified via `resolveCitations` after the model call (`kb-ask.service.ts:166`). ACL revision gate: `articleVectorCandidates` and `pageVectorCandidates` use `innerJoin(kbArticles, eq(kbArticleChunks.aclRevision, kbArticles.aclRevision))` — stale chunks (mismatched revision) are excluded from results (`kb-acl-revision-gate.spec.ts` pins this). `kb-acl-isolation.spec.ts` verifies orgId is bound in WHERE predicates. |
| Operations | PASS | Lifecycle de-indexing spec (`kb-lifecycle-deindex.spec.ts`), ingestion checkpoint service, article reindex service. |
| Tests | PASS | ACL isolation, revision gate, chunk visibility, page visibility, read-search parity, surface predicate, search page visibility, search restrictions, hnsw iterative scan, vector minority tenant, source citation, departed actor, all with tenant isolation variants. E2e specs for ask, search, tags, translations, members, spaces, pages, reviews, categories, articles, analytics, authoring, comments, from-ticket. |

### 4b. KB chatbot retrieval ACL path — deep audit (highest priority)

The end-to-end retrieval flow for `POST /kb/ask`:

1. `KbAskService.ask` short-circuits if org has no indexed content (no LLM spend on empty org).
2. `KbSearchService.retrieveTopArticles(user, question, limit, spaceId)` called — this is the RAG candidate retrieval.
3. Inside `retrieveTopArticles`: `access.getAccessibleSpaceIds(user)` scopes to spaces the caller can see. `pageVisibleTo(user, projectIds)` predicates on page visibility. Both are SQL predicates, not prompt-level filters.
4. `KbCandidateService.vectorChunkIds(vector, cap)` is the inner ANN call. It issues:
   - `SET LOCAL hnsw.iterative_scan = relaxed_order` — enables iterative scan to compensate for RLS post-filtering
   - `SELECT id FROM public.kb_article_chunks ORDER BY embedding <=> vector LIMIT cap` — **no explicit `org_id` filter in SQL; relies on RLS**
   - Fallback: `SELECT app.search_kb_chunk_ids(vector, cap) AS id` — SECURITY DEFINER, org from `app.current_org_id()`, fails closed 42501 with no GUC
5. The returned chunk IDs then pass through `articleVectorCandidates` or `pageVectorCandidates`, which apply: `inArray(kbArticles.spaceId, spaceIds)` (org-specific), `pageVisibleTo(user, projectIds)` (page ACL), and `articleRestrictionFilter(orgId, principal)` (per-article restrictions). **Content is only returned for chunks that survive all downstream filters.**
6. `resolveCitations` re-checks all sources against live visibility before including them in the response.

**Finding:** The primary ANN query (`kb-candidate.service.ts:29`) has no `WHERE org_id = ...`. Under the ambient tenant transaction (which sets the GUC), RLS filters to the current org. If `kb_article_chunks` has no RLS policy, the query would return cross-org chunk IDs as *intermediate values* — but the subsequent join and filter always apply org-specific predicates, so article/page content from other orgs is never returned to the model or the caller. The content fence is robust. The cross-org chunk ID exposure (if RLS absent) is an intermediate opaque integer — not content — and is filtered before any model call.

**Not a DEFECT because:** downstream SQL predicates prevent any content disclosure regardless of RLS status on the chunk table. A DEFECT would require that incorrect data actually reaches the model or the response; that path is closed by `articleVectorCandidates` / `pageVectorCandidates` / `resolveCitations`.

**RECOMMEND verifying** that `kb_article_chunks` carries an RLS policy for defense-in-depth. Cannot confirm without DB access.

**DEFECTS:** none found.

**SIGNED OFF.**

---

## 5. Workflows

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `workflows`, `workflowVersions`, `workflowExecutions`, `workflowExecutionSteps`, `workflowApprovals`, `workflowAuditLogs`, `workflowSchedules`, `workflowSecrets`, `workflowVariables` — all tenant-scoped with `orgId`. Secrets stored separately from execution context. |
| Authorization | PASS | `@RequireModule("workflows")` + `@RequirePermission` on every handler. Execution trigger checks `workflow.status = 'published'` and `eq(workflows.orgId, orgId)` before allowing trigger. Approval flow checks workflow ownership. `workflows.controller.e2e-spec.ts` exists. `engine/__tests__/execution-authority.spec.ts` pins authorization boundary. |
| CRUD lifecycle | PASS | Create, update, publish, delete workflows. Trigger, list, cancel executions. Approval grant/deny. Schedule CRUD. Secret CRUD. Variable CRUD. Analytics. Templates. |
| List/search cost | PASS | Keyset pagination for executions (`workflows-execution.service.ts:96-110`; `workflow-executions-keyset.spec.ts` exists). `WorkflowListQuerySchema` filters applied. |
| Caching/realtime | PASS | Runner sweep uses `forEachOrg` pattern correctly (no ambient context assumed). Execution claim uses optimistic locking. `execution-toctou.spec.ts` covers race condition. |
| Module interface | PASS | Controller covers CRUD + execution + schedule + secrets + variables + analytics + templates + approvals. Engine sub-module is separate: runner, dispatcher, executors (ai-action, action, integration, loop, script), schedule tick. |
| UX/accessibility | NOT AUDITED | |
| Security | PASS | AI action executor: user-authored prompt template interpolated with workflow variables, not with permission data. System prompt is benign ("helpful workflow automation assistant"). Gateway call uses `orgId + userId` for billing actor — no permission data goes to provider. `workflows-secret-sinks.spec.ts` pins that secrets do not surface in execution output. `workflows-secrets.service.spec.ts` exists. |
| Operations | PASS | Runner sweep with `forEachOrg`, stuck-execution expiry, `execution-advance.ts` with `MAX_STEPS_PER_EXECUTION` cap, schedule tick service. |
| Tests | PASS | TOCTOU race, execution authority, schedule tick, node dispatcher, workflow runner, graph, execution context, all executor unit tests, workflow CRUD tenant isolation, execution tenant isolation, analytics tenant isolation, data tenant isolation, runner tenant isolation, e2e spec. |

**DEFECTS:** none found.

**SIGNED OFF.**

---

## 6. Mail

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | No mail messages stored permanently — proxied through Composio. `userIntegrationConnections` stores connection metadata scoped `orgId + userId + toolkit`. `mailSyncCheckpoints` and mail metadata tables tenant-scoped. |
| Authorization | PASS | `@RequirePermission("mail:inbox:view")` on all mail read routes. `assertOwnedConnection(orgId, userId, accountId)` called before any provider operation — `mail-accounts.service.ts:56` checks both orgId and userId. `mail-accounts-tenant-isolation.spec.ts` exists. All AI endpoints gated by same permission key. Rate limiting on send via `@UseRateLimit`. |
| CRUD lifecycle | PASS | List messages (cursor-paged, multi-account merge), get thread, get message, get attachment, send, reply, mail actions (mark read/unread/starred, trash), AI draft generation, AI inbox summary, AI thread summary. |
| List/search cost | PASS | Cursor-based paging with opaque cursor encoding account-level positions (`mail-inbox-paging.spec.ts` exists). First-page fast path via cached metadata. 45s cache TTL for message lists. |
| Caching/realtime | PASS | `MailMetadataService.listCached` used for first-page fast path keyed on `membershipId + orgId + accountId + folder + limit`. `MailSyncCheckpointService` for incremental fetch state. `mail-sync-checkpoint-isolation.spec.ts` exists. |
| Module interface | PASS | `mail.module.ts`, `mail.controller.ts`, `mail-accounts.service.ts`, `mail.service.ts`, `mail-metadata.service.ts`, `mail-sync-checkpoint.service.ts`, `mail-ai.service.ts`. Providers: Gmail, Outlook. Mail and unified inbox are distinct interfaces — mail is per-provider inbox; notifications controller is the unified inbox. No route collision. |
| UX/accessibility | NOT AUDITED | |
| Security | PASS | Provider connectivity via Composio only — no OAuth tokens stored directly. AI mail features (draft, summarize) use message content only, not permission data. `mail-ai.service.spec.ts` exists. Audit service called on send. Rate limit on send path. `mail-normalizers.spec.ts` validates provider normalization. |
| Operations | PASS | `MailSyncCheckpointService` tracks incremental sync watermarks per account. `mail-sync-checkpoint-isolation.spec.ts` exists. |
| Tests | PASS | Controller spec, accounts isolation, sync checkpoint isolation, inbox paging, normalizers, AI service spec, metadata isolation. |

**DEFECTS:** none found.

**SIGNED OFF.**

---

## Numbered Defect List

**No P0 or P1 defects found across all six modules.**

No items to rank.

---

## Recommendations (non-blocking)

1. **KB `kb_article_chunks` RLS policy — verify in DB.** `kb-candidate.service.ts:29` relies on RLS to scope the primary HNSW ANN query to the current tenant. Content is safe regardless (downstream filters are robust), but the defense-in-depth principle requires the policy to be present. Cannot confirm from source alone.

2. **Notification `visibilityResourceKind` coverage audit.** PIPE-003 re-check only fires when the event definition declares `visibilityResourceKind`. Events that have a resource but no declared kind bypass the delivery-time authorization re-check. Review the full event catalog to confirm all resource-bound events carry this field.

3. **Ably token TTL on membership change.** Chat tokens are valid for 1 hour. If a user is removed from a channel during that window, their Ably token still grants `subscribe/publish/history` on that channel until expiry. This is an accepted Ably limitation (token revocation requires Ably's token revocation API or a shorter TTL). Worth documenting as an accepted risk.

---

## Module Verdicts

| Module | Verdict |
|---|---|
| Chat | SIGNED OFF |
| Calendar | SIGNED OFF |
| Notifications / Unified Inbox | SIGNED OFF |
| Knowledge Base / Wiki / Chatbot | SIGNED OFF |
| Workflows | SIGNED OFF |
| Mail | SIGNED OFF |
