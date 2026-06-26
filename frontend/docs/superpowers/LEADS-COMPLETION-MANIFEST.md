# Leads Domain — Strangler-Fig Completion Manifest

Scope: complete the `leads` domain port from Next.js route handlers (`frontend/app/api/leads/**`) to the NestJS pilot module (`backend/src/modules/leads/**`). Leads was the migration PILOT; only a subset of routes were ported. This manifest is the precise method-level gap.

- Frontend source enumerated: 31 `route.ts` files → **36 HTTP method handlers**.
- Backend ported controllers: `leads.controller.ts` (LeadsController) + `leads.ingest.controller.ts` (LeadsIngestController).
- Backend precedent confirmed (`leads.service.ts` `create`, lines 265–342): the port **preserves DB-only side effects** (notification insert, assignment-rule/score/SLA triggers, cache invalidation, audit log) and **drops outbound integrations** (`sendLeadAssignedEmail`, `dispatchWebhook`/inngest, `runAutomationsForEvent`/automation engine). PARTIAL routes below follow that precedent.

---

## 1. Summary counts

| Bucket | Count (method handlers) |
|---|---|
| Total leads route files | 31 |
| Total HTTP method handlers | 36 |
| **Already ported** | **8** |
| **Missing — total** | **28** |
| &nbsp;&nbsp;↳ Portable-now (pure) | 26 |
| &nbsp;&nbsp;↳ Partial (DB core portable, side-effect deferred) | 2 |
| &nbsp;&nbsp;↳ **Missing-portable-now (incl. partial)** | **28** |
| &nbsp;&nbsp;↳ **Missing-deferred** (route can't function without unported integration) | **0** |
| &nbsp;&nbsp;↳ **Missing-stays-frontend** (NextAuth/identity-owned) | **0** |

Every missing route is portable now. No leads route is fully blocked on an integration, and none touches the NextAuth/identity table. The only deferred coupling is **droppable** email/AI-enrichment on two routes (assign, distribute) — same pattern the backend already applied to `create`.

---

## 2. Already-ported routes (path + method)

| Frontend path | Method | Backend handler | Auth (frontend → backend) |
|---|---|---|---|
| `/api/leads` | GET | `LeadsController.list` | `withAbility("read","crm:leads")` → `@CheckAbility("read","crm:leads")` |
| `/api/leads` | POST | `LeadsController.create` | `withAbility("create","crm:leads")` → `@CheckAbility("create","crm:leads")` |
| `/api/leads/board` | GET | `LeadsController.getBoard` | `withAuth` → JwtAuthGuard (no ability) |
| `/api/leads/stats` | GET | `LeadsController.getStats` | `withAuth` → JwtAuthGuard (no ability) |
| `/api/leads/[leadId]` | GET | `LeadsController.get` | `withAuth` → JwtAuthGuard (no ability) |
| `/api/leads/[leadId]` | PATCH | `LeadsController.update` | `withAuth` → JwtAuthGuard (no ability) |
| `/api/leads/[leadId]` | DELETE | `LeadsController.remove` | `withAbility("delete","crm:leads")` → `@CheckAbility("delete","crm:leads")` |
| `/api/leads/ingest` | POST | `LeadsIngestController.ingest` | inline `X-API-Key` hash → `ApiKeyGuard` |

Backend already mirrors the frontend's mixed auth (board/stats/get/patch = auth-only; list/create/delete = CASL `crm:leads`). The ingest route's inline API-key check was normalized to `ApiKeyGuard` in the backend.

---

## 3. Missing routes table

Auth legend: `CASL` = `withAbility(verb,"crm:leads")`; `auth` = `withAuth` (session only, no ability gate); `role-string` = inline `session.user.role` check.

| # | Frontend path | Method | Tables read / written | Auth (source) | Classification | Deferred integration |
|---|---|---|---|---|---|---|
| 1 | `/api/leads/analytics` | GET | R: leads (`getLeadAnalytics`) | auth | PORTABLE-NOW | — |
| 2 | `/api/leads/check-duplicates` | GET | R: leads | auth | PORTABLE-NOW | — |
| 3 | `/api/leads/duplicates` | GET | R: leads (`findDuplicateLeads`) | auth | PORTABLE-NOW | — |
| 4 | `/api/leads/dashboard-metrics` | GET | R: leads (`getDashboardMetrics`) | auth | PORTABLE-NOW | — |
| 5 | `/api/leads/export` | GET | R: leads ⨝ users (assignee name) | auth | PORTABLE-NOW | in-process CSV (no integration) |
| 6 | `/api/leads/follow-ups` | GET | R: leads ⨝ users | auth | PORTABLE-NOW | — |
| 7 | `/api/leads/sales-leaderboard` | GET | R: leads, users (`leads-analytics`) | auth | PORTABLE-NOW | — |
| 8 | `/api/leads/sales-team-capacity` | GET | R: leads, users (`leads-analytics`) | auth | PORTABLE-NOW | — |
| 9 | `/api/leads/sla-alerts` | GET | R: leads (`getLeadSlaAlerts`) | auth | PORTABLE-NOW | — |
| 10 | `/api/leads/source-report` | GET | R: leads (Redis `cached`) | auth | PORTABLE-NOW | optional Redis cache only |
| 11 | `/api/leads/unverified` | GET | R: leads (`getUnverifiedLeads`) | CASL read | PORTABLE-NOW | — |
| 12 | `/api/leads/[leadId]/activities` | GET | R: leadActivities (`getLeadActivities`) | auth | PORTABLE-NOW | — |
| 13 | `/api/leads/[leadId]/timeline` | GET | R: leads/activities (`getLeadTimeline`) | auth | PORTABLE-NOW | — |
| 14 | `/api/leads/[leadId]/score-explanation` | GET | R: leads, leadScoringRules | auth | PORTABLE-NOW | — |
| 15 | `/api/leads/import/[batchId]` | GET | R: leadImportBatches | auth | PORTABLE-NOW | — |
| 16 | `/api/leads/bulk` | PATCH | R: organizationMembers; W: leads (bulk) | CASL update | PORTABLE-NOW | — |
| 17 | `/api/leads/bulk` | DELETE | W: leads (bulk delete) | CASL delete | PORTABLE-NOW | — |
| 18 | `/api/leads/[leadId]/activities` | POST | W: leadActivities | auth | PORTABLE-NOW | — |
| 19 | `/api/leads/[leadId]/custom-data` | PATCH | R/W: leads (`customData`) | auth | PORTABLE-NOW | — |
| 20 | `/api/leads/[leadId]/status` | PATCH | W: leads (`transitionLeadStatus` svc) + audit + cache | auth | PORTABLE-NOW | in-app audit + Redis invalidation only |
| 21 | `/api/leads/[leadId]/reject` | PATCH | W: leads (status→LOST) | CASL update | PORTABLE-NOW | — |
| 22 | `/api/leads/[leadId]/verify` | PATCH | W: leads (verifiedById/priority/notes) | CASL update | PORTABLE-NOW | — |
| 23 | `/api/leads/[leadId]/self-assign` | PATCH | W: leads (assign to self) | auth | PORTABLE-NOW | — |
| 24 | `/api/leads/[leadId]/merge` | POST | R/W: leads (loser→LOST) | auth | PORTABLE-NOW | — |
| 25 | `/api/leads/merge` | POST | W: leads (txn); reparent leadActivities, leadNotes; audit | role-string (CEO/ADMIN/HR/SALES_MANAGER) | PORTABLE-NOW | in-app audit only |
| 26 | `/api/leads/import` | POST | R: organizationMembers, users; W: leads (bulk insert + dedupe + round-robin distribute) | CASL create | PORTABLE-NOW | — |
| 27 | `/api/leads/[leadId]/assign` | PATCH | W: leads + audit + notifications (DB) | auth | **PARTIAL** | `sendEmail` (email); `generateSmartNotification` (OpenAI, graceful fallback) |
| 28 | `/api/leads/distribute` | POST | R: users, organizationMembers, leaveRequests; W: leads (round-robin assign) | role-string (CEO/HR) | **PARTIAL** | `sendEmail` (email, per-recipient loop) |

### PARTIAL detail (which part defers)

- **#27 `/api/leads/[leadId]/assign` (PATCH)** — DB core is fully portable: update lead assignment, insert `auditLogs`, insert `notifications` (in-app). Deferred/droppable: (a) `sendEmail` assignment email (awaited in try/catch, non-blocking), (b) `generateSmartNotification` → OpenAI `aiText` (`lib/ai/smart-notification.ts`), which **already self-degrades** to the default title/message when OpenAI is unconfigured. Port = insert the notification with default copy, drop email + AI enrichment (mirrors backend `create` precedent).
- **#28 `/api/leads/distribute` (POST)** — DB core portable: load active SALES members, subtract today's APPROVED `leaveRequests`, round-robin assign `leads` (writes only). Deferred/droppable: per-recipient `sendEmail` digest (try/catch, non-blocking). Port = keep the assignment + summary response, drop the email loop.

---

## 4. Ordered port plan — portable gap (28 routes, 2 slices)

Prereq query/service helpers to port alongside (frontend `server/` + `lib/services`): `server/queries/leads-analytics.ts`, `server/queries/duplicate-leads.ts`, `server/queries/leads.ts` analytics/timeline/sla/unverified/dashboard helpers, and `lib/services/lead-status.ts` (`transitionLeadStatus`). Dominant table across the whole gap is **leads**; secondary tables: leadActivities, leadNotes, leadScoringRules, leadImportBatches, organizationMembers, users, leaveRequests.

### Slice 1 — Reads & reports (15 GETs, no mutations, lowest risk; unblocks dashboards)

Routes #1–#15. Tables: leads (often ⨝ users), leadActivities, leadScoringRules, leadImportBatches. RBAC subjects: `crm:leads` read for #11 (`unverified`); the rest are auth-only — **mirror as-is** (do not add gates). Sub-order:
1. Port the analytics/duplicate query helpers first (`leads-analytics`, `duplicate-leads`, leads stats helpers).
2. Aggregate reports: `analytics`, `dashboard-metrics`, `source-report` (Redis-cached), `sales-leaderboard`, `sales-team-capacity`, `sla-alerts`, `follow-ups`, `unverified`.
3. Dedup reads: `duplicates`, `check-duplicates`.
4. Per-lead reads: `[leadId]/activities` GET, `[leadId]/timeline`, `[leadId]/score-explanation`, `import/[batchId]`.
5. `export` (CSV) — emit `text/csv` with the same headers/escaping; in-process, no integration.

### Slice 2 — Mutations (13 handlers; respect intra-leads ordering)

RBAC subjects: `crm:leads` (#16,#17,#21,#22,#26 + create on import), auth-only (#18,#19,#20,#23,#24,#27), role-string (#25 merge, #28 distribute) — mirror source exactly.

1. **Single-lead field/status mutations (no cross-row deps):** `[leadId]/custom-data` (#19), `[leadId]/verify` (#22), `[leadId]/reject` (#21), `[leadId]/self-assign` (#23), `[leadId]/activities` POST (#18). Then `[leadId]/status` (#20) — **port `transitionLeadStatus` service first** (optimistic-lock transition + audit + cache invalidation).
2. **Assignment:** `[leadId]/assign` (#27, PARTIAL — DB core only, drop email + AI), then `bulk` PATCH (#16) and `bulk` DELETE (#17).
3. **Merge (order matters):** `[leadId]/merge` (#24, simple loser→LOST) **before** top-level `merge` (#25). #25 is a transaction that reparents `leadActivities` + `leadNotes` onto the winner and sets `deletedAt`/`mergedIntoId` on the loser → port after leadActivities/leadNotes writes (Slice 1 activities + #18) exist.
4. **Import + distribute (shared round-robin):** extract the round-robin assignment helper first (used by both). `import` (#26) does bulk insert + email/phone dedupe + optional `autoDistribute`; `distribute` (#28, PARTIAL — drop email loop) is the standalone round-robin. Port `import` → `distribute`.

Recommended PR granularity: Slice 1 as one PR (reads only), Slice 2 split into 2 PRs (2.1–2.2 single-lead + assignment + bulk; 2.3–2.4 merge + import/distribute) so the merge/import transactional logic lands isolated.

---

## 5. Deferred-integration & stays-frontend rollups

### Deferred integrations (all droppable; **0 routes blocked**)
| Integration | Where it appears | Disposition |
|---|---|---|
| Email (`sendEmail` / `sendLeadAssignedEmail`, `lib/email`) | `distribute` POST (#28), `[leadId]/assign` PATCH (#27); also already-ported base `POST /api/leads` | Drop on port (backend `create` already dropped it). Both routes' DB core is portable. |
| OpenAI (`generateSmartNotification` → `aiText`, `lib/ai/smart-notification.ts`, `isOpenAIConfigured`) | `[leadId]/assign` PATCH (#27) | Self-degrades to default copy; drop enrichment, insert default notification. |
| inngest `dispatchWebhook` + automation engine `runAutomationsForEvent` | base `POST /api/leads` (already ported) | Backend `create` **already dropped both** — confirms the domain-wide pattern; no missing route depends on either. |

No leads route uses SMS/Twilio, Razorpay, R2/S3 download or presigned URLs, Gemini, pgvector/RAG, Google Calendar OAuth, Ably, or web-push.

### Stays-frontend (NextAuth/identity-owned): **none**
No leads route writes the `users`/identity table, calls `invalidateUserSession`, or issues NextAuth sessions. (`distribute`/`import`/`assign` only *read* `users`; `export`/`follow-ups` only join `users` for display name.)

---

## 6. RBAC inconsistencies (flag only — port mirrors source, do NOT add gates)

The leads domain is **internally inconsistent** on auth for equivalent operations. The port must reproduce each route's existing gate verbatim; these are flagged for a later RBAC-normalization pass, not for this port.

- **CASL vs auth-only on writes:** `bulk` (update/delete), `reject`, `verify`, `unverified`, `import` use `withAbility(..,"crm:leads")`, but sibling mutations `[leadId]/assign`, `[leadId]/self-assign`, `[leadId]/status`, `[leadId]/custom-data`, `[leadId]/activities` POST, `[leadId]/merge` use bare `withAuth`. These writes arguably belong under `crm:leads` update.
- **Inline role-string checks (not CASL):**
  - `distribute` POST → `["CEO","HR"].includes(role)`.
  - `merge` POST → `role` must be one of `CEO/ADMIN/HR/SALES_MANAGER`.
  These two should normalize to a `crm:leads` CASL subject (e.g. update/manage) but currently hardcode role strings.
- **Reads mostly auth-only:** all reporting GETs (#1–#10, #12–#15) are `withAuth` except `unverified` (#11) which is `withAbility("read","crm:leads")` — an outlier among the read endpoints.

Backend precedent for mirroring: `LeadsController` already reproduces the auth-only-vs-CASL split for the ported subset (board/stats/get/patch carry no `@CheckAbility`; list/create/delete do). Continue that exact mirroring for the missing routes.
