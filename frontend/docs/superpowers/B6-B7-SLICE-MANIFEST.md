# B6–B7 Slice Manifest — projects / support / accounting / chat

Strangler-fig migration of Next.js App Router route handlers → NestJS backend.
Read-only analysis. Source of truth = the `route.ts` files actually read for this manifest.
Counts are at **route.ts file granularity** (a file ports as a unit); per-method nuances are noted inline.

## Classification legend

- **PORTABLE-NOW** — pure DB + auth; no unported integration. Allowed non-blockers present: `createNotification` (INSERTs a notifications row), `writeAuditLog`/`createAuditLog`, Redis cache (`@/lib/cache`), in-process compute, file URL/`fileKey` stored as strings.
- **PORTABLE-NOW-PARTIAL** — clean synchronous core (DB write + response) ports now; one named fire-and-forget side effect defers. The deferred part is named per row.
- **DEFERRED** — the route's purpose genuinely depends on an unported integration (named).
- **STAYS-FRONTEND** — writes users/identity table, `invalidateUserSession`, or NextAuth session issuance. **None found in these 4 domains.**

---

## 1. Per-domain summary counts

| Domain | Total route files | Portable-now (incl. partial) | of which PARTIAL | Deferred | Stays-frontend |
|---|---:|---:|---:|---:|---:|
| projects | 62 | 62 | 2 | 0 | 0 |
| support | 22 | 17 | 5 | 5 | 0 |
| accounting | 21 | 21 | 0 | 0 | 0 |
| chat | 17 | 15 | 1 | 2 | 0 |
| **TOTAL** | **122** | **115** | **8** | **7** | **0** |

### Corrections to the earlier coarse estimate (grounded in files read)

- **projects 62/62 portable, 0 deferred** (estimate said 58/62, defer 4). The 4 flagged routes all port now:
  - `[projectId]` PATCH and `[projectId]/tickets` POST → **PARTIAL** (defer only the assignment **email**; `createNotification` is an allowed non-blocker).
  - `[projectId]/reports/snapshot` POST → **PORTABLE-NOW**: it is a pure `db.insert(projectDailySnapshots).onConflictDoUpdate` — the "scheduler" is an external cron caller, not a code dependency.
  - `from-deal` POST → **PORTABLE-NOW**: reads the CRM `deals` table directly (same shared DB). Cross-domain read dep, not an integration. Order after CRM `deals` table is reachable.
- **support 17/22 portable** (estimate said 11/22). Ticket create/PATCH/messages are **PARTIAL** (email is fire-and-forget after a clean DB write) per the rules, not fully deferred.
- **accounting 21/21 portable, 0 deferred** (estimate said 12/21, defer 9). Grep confirms **zero external integrations** in the whole tree. The "billing-coupled 9–11" are not integration deferrals — they are pure DB and merely depend on the **billing tables** (`invoices`, `purchaseBills`, `purchaseBillItems`, `vendorPayments`, `clients`). That is intra-domain **slice ordering**, handled as Accounting Slice 2.
- **chat 15/17 portable** (estimate said 13/17). `messages` POST is **PARTIAL** (Ably + web-push are fire-and-forget after the DB insert). `typing` is **PORTABLE-NOW**, not deferred — it currently uses an in-process `Map` (`server/queries/chat.ts:15 typingState`) and must be re-implemented on Redis (backend already has Redis); per the rules optional Redis is a non-blocker. Only **2** files are truly deferred: AI assistant (Gemini) and `ably-token`.

---

## 2. Ordered slice plan per domain

### PROJECTS (62 files → 3 slices)

RBAC reality: the vast majority are **`withAuth`-only** (auth + per-row `projectMembers`/`checkProjectAccess` checks). CASL appears only on: project create (`withModuleAbility("projects","create","projects")`), sprints (`projects:sprints`), and the public-roadmap cluster (`withAbility(...,"projects:roadmap")`). Inline role: `[projectId]` DELETE gates `role !== "CEO"`.

**Slice P1 — Core project + ticket spine** (dominant tables: `projects`, `projectMembers`, `projectStatuses`, `customStates`, `tickets`, `ticketAssignees`, `ticketWatchers`, `ticketLabels`, `ticketAttachments`, `ticketActivityLog`, `workItemRelations`, `gitTicketLinks`)
- Port FIRST (everything else depends on a project/ticket existing): `projects/route.ts` (list/create), `[projectId]/route.ts` ⚠PARTIAL, `from-deal` (after CRM `deals` reachable), `[projectId]/members`, `[projectId]/custom-states`, `[projectId]/labels`, `labels`.
- Then tickets: `[projectId]/tickets` ⚠PARTIAL, `[projectId]/tickets/[ticketId]`, `…/bulk`, `…/reorder`, `…/[ticketId]/{activity,comments,subtasks,relations,watchers,labels,labels/[labelId],attachments,git-links}`.
- RBAC subjects on port: normalize the `withAuth`-only ticket/project routes to `projects` / `projects:tickets` CASL subjects (mirror source = `withAuth` for now; see §RBAC flags).
- Intra-slice dep: ticket sub-resources depend on `[projectId]/tickets` POST; `from-deal` depends on `projects` + `projectStatuses` + `projectMembers` inserts.

**Slice P2 — Planning & execution** (tables: `sprints`, `cycles`, `modules`, `tickets.epicId`, `projectMilestones`, `intakeItems`, `timesheets`, `projectViews`, `projectWhiteboards`, `pages`, `projectDailySnapshots`)
- `[projectId]/sprints` (+`/[sprintId]`, `/[sprintId]/burndown`) — sprints POST/PATCH use `projects:sprints` CASL.
- `[projectId]/cycles` (+`/[cycleId]`), `[projectId]/modules` (+`/[moduleId]`), `[projectId]/epics`, `[projectId]/milestones` (+`/[milestoneId]`), `[projectId]/intake` (+`/[requestId]`), `[projectId]/views` (+`/[viewId]`), `[projectId]/whiteboards` (+`/[whiteboardId]`), `[projectId]/pages` (+`/[pageId]`).
- Time tracking: `time-entries`, `time-entries/[entryId]` (+`/approve`, `/reject`), `time-entries/team`, `[projectId]/tickets/[ticketId]/time-entries`, `[projectId]/budget`, `billing-summary`, `resource-allocation`.
- Dep: sprints/cycles/epics/milestones reference `tickets` (P1); time-entries reference `tickets` + `projects`.

**Slice P3 — Analytics, reports & public roadmap** (tables: read-mostly over P1/P2 + `projectDailySnapshots`, `roadmapItems`, `feedbackPosts`, `changelogEntries`)
- Reports/analytics (all read, `withAuth`): `[projectId]/analytics`, `[projectId]/reports/{burnup,cfd,critical-path,velocity}`, `[projectId]/reports/snapshot` (POST, cron-fed write).
- Templates: `templates`, `templates/[templateId]`, `templates/[templateId]/apply` (apply seeds `projectMembers`+`tickets` → after P1).
- Public roadmap cluster (CASL `projects:roadmap`): `roadmap` (+`/[itemId]`), `feedback` (+`/[postId]`), `changelog` (+`/[entryId]`).
- Dep: reports read tickets/sprints/snapshots from P1/P2; roadmap cluster is self-contained and could ship any time.

**Projects deferred side effects:** `sendProjectAssignmentEmail` (in `[projectId]` PATCH), `sendTicketAssignmentEmail` (in `[projectId]/tickets` POST) — `@/lib/email`. Everything else ports clean.

---

### SUPPORT (22 files → 2 slices + a deferred RAG group)

RBAC reality: **ticket** routes are `withAuth`-only; **KB / macros / routing-rules** use CASL (`support:kb`, `support:macros`).

**Slice S1 — Tickets** (dominant tables: `supportTickets`, `supportTicketMessages`, `supportTicketActivity`, `supportMacros`, `supportRoutingRules`; service `@/lib/services/support-routing` is in-process DB)
- `support/route.ts` GET + POST ⚠PARTIAL, `[supportTicketId]` GET + PATCH ⚠PARTIAL, `[supportTicketId]/messages` GET + POST ⚠PARTIAL, `[supportTicketId]/activity` GET, `stats`.
- `macros` (+`/[macroId]`), `routing-rules` (+`/[ruleId]`).
- Deferred side effect across the 3 PARTIAL files: support emails (`sendSupportTicketCreatedEmail` / `…StatusEmail` / `…ReplyEmail`, `@/lib/email`) — all `void`-wrapped after the DB write.
- RBAC flag: normalize ticket routes to a `support:tickets` CASL subject on port (mirror source = `withAuth`).

**Slice S2 — KB content (non-RAG)** (tables: `kbCategories`, `kbArticles`, `kbArticleFeedback`, `kbArticleComments`, `kbArticleAttachments`; CASL `support:kb`)
- `kb/categories` (+`/[categoryId]`), `kb/articles` GET+POST, `kb/articles/[articleId]` GET/DELETE + PATCH ⚠PARTIAL, `kb/articles/[articleId]/{feedback,comments,comments/[commentId]}`, `kb/articles/[articleId]/attachments` GET + POST ⚠PARTIAL.
- PARTIAL deferred side effect: `reindexArticleSafe` (RAG embedding) fires after the DB write in `[articleId]` PATCH and `attachments` POST — core CRUD ports now.
- Dep: articles depend on categories (FK optional); attachments/comments/feedback depend on `kbArticles`.

**Deferred group S-RAG (ship with the RAG/storage workstream):**
- `kb/ask` — `@/lib/services/kb-rag` + `isEmbeddingConfigured` (OpenAI/pgvector embeddings + Gemini answer). **DEFERRED — KB RAG.**
- `kb/articles/[articleId]/reindex` — `indexArticle` + embeddings. **DEFERRED — embeddings.**
- `kb/reindex-all` — embeddings. **DEFERRED — embeddings.**
- `kb/articles/[articleId]/index-status` — reads RAG index state (`getArticleIndexStatus`). DB-read-only but meaningless without the pipeline. **DEFERRED — KB RAG.**
- `kb/articles/[articleId]/attachments/[attachmentId]` — GET returns an R2 presigned URL (`getFileUrl`, `isStorageConfigured`). **DEFERRED — R2/S3 storage.** (Its DELETE handler's core DB delete ports now; only `deleteFile` + `reindexArticleSafe` defer.)

---

### ACCOUNTING (21 files → 2 slices, both portable-now)

RBAC reality: **uniform CASL** — every handler is `withModuleAbility("accounting", verb, subject)` with subjects `accounting:accounts`, `accounting:journal`, `accounting:reports`. Best-gated domain; mirror as-is. **No external integrations anywhere** (grep clean).

**Slice A1 — Pure ledger / double-entry core** (tables: `ledgerAccounts`, `journalEntries`, `journalLines`) — port FIRST
- `accounts` (read/create), `accounts/[accountId]` (update) — `accounting:accounts`.
- `journal` (read/create), `journal/[entryId]` (read), `journal/[entryId]/post`, `journal/[entryId]/reverse` — `accounting:journal`.
- `reports/trial-balance`, `reports/profit-loss`, `reports/balance-sheet`, `reports/cash-flow` — `accounting:reports` (read over `ledgerAccounts`/`journalLines`).
- Intra-slice dep: posting/reversal and all 4 ledger reports depend on `journalEntries`+`journalLines`, which depend on `ledgerAccounts`.

**Slice A2 — Billing-coupled ledger** (additional tables: `clients`, `invoices`, `purchaseBills`, `purchaseBillItems`, `vendorPayments`) — port AFTER billing tables exist
- AP: `purchase-bills` (read/create), `purchase-bills/[billId]` (read/update), `purchase-bills/[billId]/payments` (read/create) — `accounting:journal`.
- Subledgers: `vendors`, `vendors/[vendorId]/ledger`, `customers`, `customers/[clientId]/ledger` — `accounting:reports`.
- Statutory/aging: `reports/aged-receivables`, `reports/aged-payables`, `reports/gstr-1`, `reports/gstr-3b` — `accounting:reports`.
- All PORTABLE-NOW; the only reason to sequence after A1 is shared `journalLines` posting + dependence on the billing tables.

---

### CHAT (17 files → 1 slice + 2 deferred)

RBAC reality: **entirely `withAuth`-only**, with per-channel `chatChannelMembers` membership checks and two inline role gates: channel PATCH requires membership `role === "ADMIN"`; message DELETE allows `role === "CEO" || role === "HR"`. No CASL subject exists for chat.

**Slice C1 — Channels, messages, presence** (tables: `chatChannels`, `chatChannelMembers`, `chatMessages`, `chatAttachments`, `chatMessageReactions`, `chatUserPresence`; reads `users`)
- Channels: `chat/channels` (GET/POST), `chat/channels/[channelId]` (GET/PATCH), `chat/channels/[channelId]/members` (GET), `chat/channels/[channelId]/read` (POST).
- Messages: `…/messages` GET + POST ⚠PARTIAL, `…/messages/poll` (GET, long-poll fallback — pure DB), `…/messages/[messageId]` (PATCH/DELETE), `…/messages/[messageId]/reactions` (POST).
- Presence/util: `presence/heartbeat` (POST), `presence/online` (GET), `status` (PUT), `unread` (GET), `search` (GET), `users` (GET, read-only over `users`).
- `channels/[channelId]/typing` (POST/GET) — PORTABLE-NOW but ⚠ currently an **in-process `Map`** (`typingState`); re-implement on Redis when porting (in-process state breaks horizontal scaling).
- PARTIAL deferred side effects (in `messages` POST, both `void`-wrapped after the insert): **Ably** publish (`new Ably.Rest`) + **web-push** fan-out (`sendPushToChannelMembers`, `@/lib/web-push`).
- Dep: messages/reactions/read/typing depend on `chatChannels`+`chatChannelMembers`.

**Deferred (chat):**
- `chat/route.ts` (POST) — AI assistant `processChatWithGraph` (`@/lib/ai/langchain-graph`, `gemini-1.5-pro-latest`). **DEFERRED — LLM (Gemini).**
- `chat/ably-token` (GET) — mints an Ably token (`new Ably.Rest`). **DEFERRED — Ably realtime.**

---

## 3. Appendix — full route table per domain

Legend: auth `withAuth`=auth-only · `withAbility(v,s)`=CASL ability · `withModuleAbility(m,v,s)`=module CASL · `role:X`=inline role check. ⚠ = PARTIAL.

### 3.1 projects (62)

| Route file (under `app/api/projects/`) | Methods | Tables (r/w) | Auth | Classification |
|---|---|---|---|---|
| `route.ts` | GET, POST | projects, projectMembers | GET withAuth · POST withModuleAbility(projects,create,projects) | PORTABLE |
| `[projectId]/route.ts` | GET, PATCH, DELETE | projects, projectMembers, tickets, users(r) | withAuth · DELETE role:CEO | ⚠PARTIAL — PATCH defers `sendProjectAssignmentEmail` (@/lib/email) |
| `from-deal/route.ts` | POST | deals(r, CRM), projects, projectStatuses, projectMembers | withAuth | PORTABLE — cross-domain read of `deals` |
| `[projectId]/members/route.ts` | GET, POST, DELETE | projectMembers, tickets | withAuth | PORTABLE |
| `[projectId]/custom-states/route.ts` | GET, POST | customStates | withAuth | PORTABLE |
| `[projectId]/labels/route.ts` | GET, POST | ticketLabels | withAuth | PORTABLE |
| `labels/route.ts` | GET, POST | ticketLabels | withAuth | PORTABLE |
| `[projectId]/tickets/route.ts` | GET, POST | tickets, projectMembers, ticketAssignees, ticketWatchers, users(r), projects(r) | withAuth | ⚠PARTIAL — POST defers `sendTicketAssignmentEmail` (email); `createNotification` is non-blocker |
| `[projectId]/tickets/[ticketId]/route.ts` | GET, PATCH, DELETE | tickets, workItemRelations | withAuth | PORTABLE |
| `[projectId]/tickets/bulk/route.ts` | POST | tickets, projectMembers | withAuth | PORTABLE |
| `[projectId]/tickets/reorder/route.ts` | PATCH | tickets | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/activity/route.ts` | GET | ticketActivityLog, tickets | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/comments/route.ts` | POST | tickets(+comments) | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/subtasks/route.ts` | GET | tickets | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/relations/route.ts` | GET, POST, DELETE | workItemRelations, projectMembers, tickets | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/watchers/route.ts` | GET, POST, DELETE | ticketWatchers, tickets | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/labels/route.ts` | POST | tickets(+ticketLabels) | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/labels/[labelId]/route.ts` | DELETE | tickets(+ticketLabels) | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/attachments/route.ts` | POST | ticketAttachments, tickets | withAuth | PORTABLE — fileUrl/fileKey stored as strings |
| `[projectId]/tickets/[ticketId]/git-links/route.ts` | GET | gitTicketLinks, tickets, projects | withAuth | PORTABLE |
| `[projectId]/tickets/[ticketId]/time-entries/route.ts` | GET, POST | timesheets, tickets, projectMembers | withAuth | PORTABLE |
| `[projectId]/sprints/route.ts` | GET, POST | sprints | GET withAuth · POST withModuleAbility(projects,manage,projects:sprints) | PORTABLE |
| `[projectId]/sprints/[sprintId]/route.ts` | GET, PATCH | sprints | GET withAuth · PATCH withModuleAbility(projects,manage,projects:sprints) | PORTABLE |
| `[projectId]/sprints/[sprintId]/burndown/route.ts` | GET | sprints, timesheets | withAuth | PORTABLE |
| `[projectId]/cycles/route.ts` | GET, POST | cycles, tickets | withAuth | PORTABLE |
| `[projectId]/cycles/[cycleId]/route.ts` | PATCH, DELETE | cycles | withAuth | PORTABLE |
| `[projectId]/modules/route.ts` | GET, POST | modules, tickets | withAuth | PORTABLE |
| `[projectId]/modules/[moduleId]/route.ts` | PATCH, DELETE | modules | withAuth | PORTABLE |
| `[projectId]/epics/route.ts` | GET, POST | tickets (epics) | withAuth | PORTABLE |
| `[projectId]/milestones/route.ts` | GET, POST | projectMilestones, projects | withAuth | PORTABLE |
| `[projectId]/milestones/[milestoneId]/route.ts` | PATCH, DELETE | projectMilestones | withAuth | PORTABLE |
| `[projectId]/intake/route.ts` | GET, POST | intakeItems | withAuth | PORTABLE |
| `[projectId]/intake/[requestId]/route.ts` | PATCH | intakeItems, tickets | withAuth | PORTABLE |
| `[projectId]/views/route.ts` | GET, POST | projectViews | withAuth | PORTABLE |
| `[projectId]/views/[viewId]/route.ts` | PATCH, DELETE | projectViews | withAuth | PORTABLE |
| `[projectId]/whiteboards/route.ts` | GET, POST | projectWhiteboards, projects | withAuth | PORTABLE |
| `[projectId]/whiteboards/[whiteboardId]/route.ts` | GET, PATCH, DELETE | projectWhiteboards, projects | withAuth | PORTABLE |
| `[projectId]/pages/route.ts` | GET, POST | pages | withAuth | PORTABLE |
| `[projectId]/pages/[pageId]/route.ts` | PATCH, DELETE | pages | withAuth | PORTABLE |
| `[projectId]/budget/route.ts` | GET, PATCH | projects, projectMembers, timesheets | withAuth | PORTABLE |
| `time-entries/route.ts` | GET | timesheets | withAuth | PORTABLE |
| `time-entries/[entryId]/route.ts` | PATCH, DELETE | timesheets | withAuth | PORTABLE |
| `time-entries/[entryId]/approve/route.ts` | PATCH | timesheets | withAuth | PORTABLE |
| `time-entries/[entryId]/reject/route.ts` | PATCH | timesheets | withAuth | PORTABLE |
| `time-entries/team/route.ts` | GET | timesheets | withAuth | PORTABLE |
| `billing-summary/route.ts` | GET | timesheets | withAuth | PORTABLE |
| `resource-allocation/route.ts` | GET | projects, tickets, ticketAssignees, users(r) | withAuth | PORTABLE |
| `[projectId]/analytics/route.ts` | GET | projects, tickets (read) | withAuth | PORTABLE |
| `[projectId]/reports/burnup/route.ts` | GET | projects, sprints, tickets | withAuth | PORTABLE |
| `[projectId]/reports/cfd/route.ts` | GET | projects, projectDailySnapshots | withAuth | PORTABLE |
| `[projectId]/reports/critical-path/route.ts` | GET | projects, tickets, workItemRelations | withAuth | PORTABLE |
| `[projectId]/reports/velocity/route.ts` | GET | projects, sprints, tickets | withAuth | PORTABLE |
| `[projectId]/reports/snapshot/route.ts` | POST | projects, tickets, customStates, projectDailySnapshots | withAuth | PORTABLE — pure DB upsert (cron-fed) |
| `templates/route.ts` | GET, POST | projectTemplates, projectTemplateTickets | withAuth | PORTABLE |
| `templates/[templateId]/route.ts` | DELETE | projectTemplates | withAuth | PORTABLE |
| `templates/[templateId]/apply/route.ts` | POST | projectTemplates, projectMembers, tickets | withAuth | PORTABLE |
| `roadmap/route.ts` | GET, POST | roadmapItems | withAbility(view/manage, projects:roadmap) | PORTABLE |
| `roadmap/[itemId]/route.ts` | GET, PATCH, DELETE | roadmapItems | withAbility(projects:roadmap) | PORTABLE |
| `feedback/route.ts` | GET, POST | feedbackPosts | withAbility(view/manage, projects:roadmap) | PORTABLE |
| `feedback/[postId]/route.ts` | GET, PATCH, DELETE | feedbackPosts | withAbility(projects:roadmap) | PORTABLE |
| `changelog/route.ts` | GET, POST | changelogEntries | withAbility(view/manage, projects:roadmap) | PORTABLE |
| `changelog/[entryId]/route.ts` | GET, PATCH, DELETE | changelogEntries | withAbility(projects:roadmap) | PORTABLE |

### 3.2 support (22)

| Route file (under `app/api/support/`) | Methods | Tables (r/w) | Auth | Classification |
|---|---|---|---|---|
| `route.ts` | GET, POST | supportTickets, users(r); `@/lib/cache`; `support-routing` svc | withAuth | ⚠PARTIAL — POST defers `sendSupportTicketCreatedEmail` (email) |
| `[supportTicketId]/route.ts` | GET, PATCH | supportTickets, supportTicketActivity, users(r) | withAuth | ⚠PARTIAL — PATCH defers status/assign emails (email) |
| `[supportTicketId]/messages/route.ts` | GET, POST | supportTicketMessages, supportTickets, users(r) | withAuth | ⚠PARTIAL — POST defers `sendSupportTicketReplyEmail` (email); attachments are URL strings |
| `[supportTicketId]/activity/route.ts` | GET | supportTicketActivity, supportTickets | withAuth | PORTABLE |
| `stats/route.ts` | GET | supportTickets | withAuth | PORTABLE |
| `macros/route.ts` | GET, POST | supportMacros | withAbility(view/manage, support:macros) | PORTABLE |
| `macros/[macroId]/route.ts` | PATCH, DELETE | supportMacros | withAbility(manage, support:macros) | PORTABLE |
| `routing-rules/route.ts` | GET, POST | supportRoutingRules | withAbility(view/manage, support:macros) | PORTABLE |
| `routing-rules/[ruleId]/route.ts` | PATCH, DELETE | supportRoutingRules | withAbility(manage, support:macros) | PORTABLE |
| `kb/categories/route.ts` | GET, POST | kbCategories | withAbility(view/manage, support:kb) | PORTABLE |
| `kb/categories/[categoryId]/route.ts` | PATCH, DELETE | kbCategories | withAbility(manage, support:kb) | PORTABLE |
| `kb/articles/route.ts` | GET, POST | kbArticles | withAbility(view/manage, support:kb) | PORTABLE — create does NOT embed |
| `kb/articles/[articleId]/route.ts` | GET, PATCH, DELETE | kbArticles | withAbility(view/manage, support:kb) | ⚠PARTIAL — PATCH defers `reindexArticleSafe` (KB RAG embeddings) |
| `kb/articles/[articleId]/feedback/route.ts` | GET | kbArticleFeedback, kbArticles | withAbility(view, support:kb) | PORTABLE |
| `kb/articles/[articleId]/comments/route.ts` | GET, POST | kbArticleComments, kbArticles | withAbility(view/manage, support:kb) | PORTABLE |
| `kb/articles/[articleId]/comments/[commentId]/route.ts` | DELETE | kbArticleComments | withAbility(manage, support:kb) | PORTABLE |
| `kb/articles/[articleId]/attachments/route.ts` | GET, POST | kbArticleAttachments, kbArticles | withAbility(view/manage, support:kb) | ⚠PARTIAL — POST defers `reindexArticleSafe` (embeddings); metadata-only insert |
| `kb/articles/[articleId]/attachments/[attachmentId]/route.ts` | GET, DELETE | kbArticleAttachments; `@/lib/storage` | withAbility(view/manage, support:kb) | DEFERRED — GET=R2 presigned download (`getFileUrl`); DELETE core ports, defers `deleteFile`+reindex |
| `kb/ask/route.ts` | POST | (RAG) | withAbility(view, support:kb) | DEFERRED — KB RAG (`answerQuestion`, OpenAI embeddings + Gemini) |
| `kb/articles/[articleId]/reindex/route.ts` | POST | kbArticles(r) + RAG | withAbility(manage, support:kb) | DEFERRED — embeddings (`indexArticle`) |
| `kb/articles/[articleId]/index-status/route.ts` | GET | RAG index state | withAbility(view, support:kb) | DEFERRED — KB RAG (`getArticleIndexStatus`) |
| `kb/reindex-all/route.ts` | POST | RAG | withAbility(manage, support:kb) | DEFERRED — embeddings |

### 3.3 accounting (21) — all `withModuleAbility("accounting", …)`, all PORTABLE-NOW

| Route file (under `app/api/accounting/`) | Methods | Tables (r/w) | Verb · Subject | Slice |
|---|---|---|---|---|
| `accounts/route.ts` | GET, POST | ledgerAccounts | read/create · accounting:accounts | A1 |
| `accounts/[accountId]/route.ts` | PATCH | ledgerAccounts | update · accounting:accounts | A1 |
| `journal/route.ts` | GET, POST | journalEntries, journalLines | read/manage · accounting:journal | A1 |
| `journal/[entryId]/route.ts` | GET | journalEntries, journalLines | read · accounting:journal | A1 |
| `journal/[entryId]/post/route.ts` | POST | journalEntries | manage · accounting:journal | A1 |
| `journal/[entryId]/reverse/route.ts` | POST | journalEntries, journalLines | manage · accounting:journal | A1 |
| `reports/trial-balance/route.ts` | GET | ledgerAccounts | read · accounting:reports | A1 |
| `reports/profit-loss/route.ts` | GET | ledgerAccounts | read · accounting:reports | A1 |
| `reports/balance-sheet/route.ts` | GET | ledgerAccounts | read · accounting:reports | A1 |
| `reports/cash-flow/route.ts` | GET | ledgerAccounts, journalLines | read · accounting:reports | A1 |
| `purchase-bills/route.ts` | GET, POST | purchaseBills | read/manage · accounting:journal | A2 |
| `purchase-bills/[billId]/route.ts` | GET, PATCH | purchaseBills, purchaseBillItems | read/manage · accounting:journal | A2 |
| `purchase-bills/[billId]/payments/route.ts` | GET, POST | purchaseBills, vendorPayments | read/manage · accounting:journal | A2 |
| `vendors/route.ts` | GET | clients | read · accounting:reports | A2 |
| `vendors/[vendorId]/ledger/route.ts` | GET | clients, ledgerAccounts, purchaseBills, journalLines | read · accounting:reports | A2 |
| `customers/route.ts` | GET | clients | read · accounting:reports | A2 |
| `customers/[clientId]/ledger/route.ts` | GET | invoices, journalLines | read · accounting:reports | A2 |
| `reports/aged-receivables/route.ts` | GET | invoices | read · accounting:reports | A2 |
| `reports/aged-payables/route.ts` | GET | purchaseBills | read · accounting:reports | A2 |
| `reports/gstr-1/route.ts` | GET | invoices | read · accounting:reports | A2 |
| `reports/gstr-3b/route.ts` | GET | invoices, purchaseBills | read · accounting:reports | A2 |

### 3.4 chat (17)

| Route file (under `app/api/chat/`) | Methods | Tables (r/w) | Auth | Classification |
|---|---|---|---|---|
| `channels/route.ts` | GET, POST | chatChannels, chatChannelMembers, users(r) | withAuth | PORTABLE |
| `channels/[channelId]/route.ts` | GET, PATCH | chatChannels, chatChannelMembers | withAuth · PATCH role:ADMIN (channel member) | PORTABLE |
| `channels/[channelId]/members/route.ts` | GET | chatChannelMembers | withAuth | PORTABLE |
| `channels/[channelId]/read/route.ts` | POST | chatChannelMembers (lastRead) | withAuth | PORTABLE |
| `channels/[channelId]/messages/route.ts` | GET, POST | chatMessages, chatAttachments, chatChannels, chatChannelMembers | withAuth | ⚠PARTIAL — POST defers Ably publish + web-push (`sendPushToChannelMembers`) |
| `channels/[channelId]/messages/poll/route.ts` | GET | chatMessages (since) | withAuth | PORTABLE — long-poll fallback, pure DB |
| `channels/[channelId]/messages/[messageId]/route.ts` | PATCH, DELETE | chatMessages | withAuth · DELETE role:CEO/HR | PORTABLE |
| `channels/[channelId]/messages/[messageId]/reactions/route.ts` | POST | chatMessageReactions, chatMessages, chatChannelMembers | withAuth | PORTABLE |
| `channels/[channelId]/typing/route.ts` | POST, GET | in-process `Map` (no DB) | withAuth | PORTABLE — ⚠ reimplement on Redis (in-process `typingState`) |
| `presence/heartbeat/route.ts` | POST | chatUserPresence | withAuth | PORTABLE |
| `presence/online/route.ts` | GET | chatUserPresence | withAuth | PORTABLE |
| `status/route.ts` | PUT | chatUserPresence | withAuth | PORTABLE |
| `unread/route.ts` | GET | chatMessages/members (read) | withAuth | PORTABLE |
| `search/route.ts` | GET | chatMessages (search) | withAuth | PORTABLE |
| `users/route.ts` | GET | users(r) | withAuth | PORTABLE — read-only over users |
| `route.ts` | POST | (none) | withAuth | DEFERRED — AI assistant `processChatWithGraph` (Gemini) |
| `ably-token/route.ts` | GET | (none) | withAuth | DEFERRED — Ably realtime token |

---

## 4. Deferred-by-integration rollup + stays-frontend

### 4.1 Wholly-deferred route files (7) by integration

| Integration | Route files | Count |
|---|---|---|
| KB RAG — OpenAI/pgvector embeddings + Gemini answer (`@/lib/services/kb-rag`, `@/lib/ai/embeddings`) | `support/kb/ask`, `support/kb/articles/[articleId]/reindex`, `support/kb/reindex-all`, `support/kb/articles/[articleId]/index-status` | 4 |
| R2/S3 object storage (`@/lib/storage`, presigned download) | `support/kb/articles/[articleId]/attachments/[attachmentId]` (GET) | 1 |
| LLM — Gemini (`@/lib/ai/langchain-graph`) | `chat/route.ts` | 1 |
| Ably realtime (token mint) | `chat/ably-token` | 1 |
| **Total wholly-deferred** | | **7** |

### 4.2 Partial deferrals — clean core ports now, only the named side effect defers (8 files)

| Side effect (integration) | Route file · method · what defers |
|---|---|
| Email (`@/lib/email`/Resend) | `projects/[projectId]` PATCH — `sendProjectAssignmentEmail` |
| Email | `projects/[projectId]/tickets` POST — `sendTicketAssignmentEmail` (the `createNotification` call ports now) |
| Email | `support/route.ts` POST — `sendSupportTicketCreatedEmail` |
| Email | `support/[supportTicketId]` PATCH — `sendSupportTicketStatusEmail` / `…CreatedEmail` |
| Email | `support/[supportTicketId]/messages` POST — `sendSupportTicketReplyEmail` |
| KB RAG embeddings | `support/kb/articles/[articleId]` PATCH — `reindexArticleSafe` |
| KB RAG embeddings | `support/kb/articles/[articleId]/attachments` POST — `reindexArticleSafe` |
| Ably realtime + web-push | `chat/channels/[channelId]/messages` POST — `Ably.Rest.publish` + `sendPushToChannelMembers` |

Additional method-level partial (inside a deferred file): `support/kb/articles/[articleId]/attachments/[attachmentId]` DELETE — DB delete ports now; defers `deleteFile` (R2) + `reindexArticleSafe`.

### 4.3 Stays-frontend (NextAuth/identity)

**None.** Grep across all 4 trees for `db.update/insert/delete(users)`, `invalidateUserSession`, and session issuance returned no matches. `users` is only **read** (e.g. `projects/resource-allocation`, `chat/users`, email-recipient lookups) — reads do not force a route to stay frontend.

---

## 5. RBAC normalization flags (note only — the port MUST mirror source, do not add gates)

- **projects** — bulk of routes are `withAuth`-only with per-row `projectMembers`/`checkProjectAccess` checks. On port, normalize to CASL subjects: `projects` (project CRUD), `projects:tickets` (ticket + sub-resources), `projects:timesheets` (time-entries). ⚠ **`projects:timesheets` is missing from the `AbilitySubject` union** — add it when the timesheet routes are CASL-gated. Existing CASL subjects already in source: `projects` (create), `projects:sprints`, `projects:roadmap`. Inline `role:CEO` on `[projectId]` DELETE → could become `projects` `delete` ability.
- **support** — ticket routes (`route`, `[id]`, `messages`, `activity`, `stats`) are `withAuth`-only → normalize to a `support:tickets` subject. KB/macros already CASL. Minor: `routing-rules` reuses the `support:macros` subject rather than a dedicated `support:routing`.
- **accounting** — already uniform CASL (`accounting:accounts` / `:journal` / `:reports`); mirror as-is, no normalization needed (cleanest domain).
- **chat** — no CASL subject at all; entirely `withAuth` + per-channel membership + inline `role:ADMIN` (channel PATCH) / `role:CEO|HR` (message DELETE). Mirror `withAuth` on port; optionally introduce a `chat` subject later (out of scope for the mirror port).
