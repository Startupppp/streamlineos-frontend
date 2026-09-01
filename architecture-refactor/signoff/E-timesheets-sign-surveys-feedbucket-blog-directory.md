# Sign-off E — Timesheets · Sign · Surveys · Feedbucket · Blog · Directory

**Auditor lane:** E (read-only, parallel program)
**Date:** 2026-09-01
**Scope basis:** `backend/src/common/rbac/module-registry.ts` — the six in-scope modules §12 does not cover

---

## 0. Scope Verdict

All six modules are **genuinely in-scope**. Evidence:

| Module | Controllers | Schema files | Frontend routes | Permission keys | Verdict |
|---|---|---|---|---|---|
| Timesheets | 14 | 12 | 10+ | 22 | IN SCOPE |
| Sign (e-sign) | 11 | 14 | 7 | 12 | IN SCOPE |
| Surveys | 9 (8 internal + 1 public) | 4+ | 5 | catalog present | IN SCOPE |
| Feedbucket | 2 (1 internal + 1 public) | in build schema | under `/build/[projectId]/feedbucket` | 11 | IN SCOPE |
| Blog | 1 (public reads only) | 2 (global, not org-scoped) | `/blog/access` access page only | 1 | IN SCOPE (partial — see D5) |
| Directory | 2 | directory schema | 5 | 7 | IN SCOPE |

§12 was wrong to omit all six. None are dormant.

**Coverage:** Inspected all controllers in full; sampled service layers for BOLA, immutability, and auth patterns; inspected schema folder structure; read rate-limit tiers; read permission catalogs; checked frontend route trees. Did NOT run tests (per charter rules), did NOT run tsc, did NOT run knip.

---

## 1. Timesheets

Module registry: `planGated: true`, `publicExposure: false`, `route: "/timesheets"`, `moduleFolder: "timesheets"`, `schemaFolder: "timesheets"`.

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | 12 schema files: `entries.ts`, `periods.ts`, `rates.ts`, `budgets.ts`, `settings.ts`, `timer.ts`, `exceptions.ts`, `exports.ts`, `audit.ts`, `relations.ts`, `enums.ts`, `index.ts` under `db/schema/timesheets/`. Lifecycle columns (`voidedAt`, `lockedAt`, `payrollStatus`, `invoicingStatus`, `status`) cover immutability requirements. |
| Authorization | **DEFECT D1** | All 13 of 14 controllers declare `@RequireModule("build")` instead of `@RequireModule("timesheets")`. One controller (`exceptions`) has no module gate at all. See defect list. |
| CRUD lifecycle | PASS | Entries: create/update/void. Approvals: bulk-approve, bulk-reject, approve, reject. Immutability gate in `entries.service.ts:230-243`: APPROVED/SUBMITTED/locked/exported/invoiced entries are blocked. Payroll export at `timesheets/payroll/`. |
| List/search cost | KEEP | Queries lead with `org_id` + membership predicates. Soft-deleted/voided rows filtered via `isNull(timesheets.voidedAt)`. No full-table scan spotted in service layer. |
| Caching/realtime | PASS | Registry `cacheNamespaces: ["timesheets"]`. `CacheService` injected in settings and rates; mutations invalidate namespace. |
| Module structure | PASS | 14 controllers organized under `core/` and `payroll/` sub-folders. Module file present. Permission keys consistently `timesheets:*`. |
| UX/accessibility | PASS | 10 frontend routes covering entries, approvals, billing, exceptions, reports, settings, team, payroll. Loading/error states present. |
| Security | **DEFECT D1** | Module gate wrong — see D1. BOLA re-asserted correctly in `entries.service.ts:224-228` (entry loaded by `orgId + entryId`). Owner-scope check: manager vs own entry at line 246-253. |
| Operations | PASS | Payroll export controller at `timesheets/payroll/payroll.controller.ts`. Audit trail at `timesheets/audit.controller.ts`. Budget tracking at `timesheets/budgets.controller.ts`. |
| Tests | NOT RUN | Files present but not executed per charter rules. |

**Verdict: BLOCKED BY D1**

---

## 2. Sign (e-sign)

Module registry: `planGated: true`, `publicExposure: true`, `route: "/sign"`, `moduleFolder: "e-sign"`, `schemaFolder: "e-sign"`.

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | 14 schema files: envelopes, recipients, fields, documents, certificates, bulk-send, templates, public-forms, settings, audit, watermark, signature-assets, enums, index. Full signing lifecycle represented. |
| Authorization | **DEFECT D3** | 9 of 10 internal controllers correctly use `@RequireModule("sign")` + `ModuleGuard`. `sign-ai.controller.ts:17` uses `@UseGuards(JwtAuthGuard, PermissionGuard, RateLimitGuard)` with no `ModuleGuard` and no `@RequireModule("sign")`. Org owners bypass `PermissionGuard` and can call `POST /sign/envelopes/:envelopeId/ai/summarize` without the sign module enabled. |
| CRUD lifecycle | PASS | Envelope draft → upload docs → add recipients → add fields → send → sign (OTP/email-link auth) → complete/decline/void. Templates, bulk-send, correction all present. |
| List/search cost | PASS | Envelope list queries scoped by `orgId`. DataScope applied for `sign:envelope:view` (`own` scope filters by `senderMembershipId`). |
| Caching/realtime | KEEP | Registry `cacheNamespaces: NONE`. Signing state changes on every action; caching would require aggressive invalidation. No cache is safe here. |
| Module structure | PASS | 11 controllers well-organized. Public controller (`sign-public.controller.ts`) separated. AI controller separate. |
| UX/accessibility | PASS | 7 frontend routes: envelopes list/detail, templates, bulk-send, reports, settings, access. Public signing app presumably at `/sign/:token`. |
| Security (public routes) | PASS | Token = `randomBytes(32).toString("hex")` (`sign-tokens.service.ts:11`) — 256-bit CSPRNG. Hash-stored at rest. Cross-tenant miss → 404. Rate limits defined: session 60/min, auth 10/min, OTP request 5/hr, complete 10/min, form-submit 10/hr. All keyed on `token:ip`. Rate limit tiers exist in `rate-limit.service.ts:66-70`. |
| Security (tenant routes) | PASS | BOLA checks in envelope service (loads by `orgId + envelopeId`). Permission-scoped for sender vs org. |
| Operations | PASS | Audit trail controller. Certificate download. Reports (status breakdown, completion rates). |
| Tests | NOT RUN | `e-sign-auth-rbac.e2e-spec.ts` and `e-sign-signing-flow.e2e-spec.ts` present. |

**Verdict: BLOCKED BY D3**

---

## 3. Surveys

Module registry: `planGated: true`, `publicExposure: true`, `route: "/surveys"`, `moduleFolder: "surveys"`, `schemaFolder: "surveys"`.

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | Schema folder present. Tables: `surveyForms`, `surveyVersions`, `surveyCollectors`, `surveyResponseSessions`, `surveyAnswers`, `surveyQuestionChoices` referenced in service code. |
| Authorization | **DEFECT D2** | 8 internal controllers (`surveys.controller.ts`, `survey-builder.controller.ts`, `survey-analytics.controller.ts`, `survey-collectors.controller.ts`, `survey-participants.controller.ts`, `survey-assessment.controller.ts`, `survey-automation.controller.ts`, `survey-live-session.controller.ts`) use `@UseGuards(JwtAuthGuard, PermissionGuard)` with no `@RequireModule("surveys")` and no `ModuleGuard`. Org owners bypass `PermissionGuard` entirely and can access all survey data without the surveys subscription. |
| CRUD lifecycle | PASS | Survey create/patch/publish/archive; version management via builder; collectors; participants; live session host controls; automation; analytics. |
| List/search cost | KEEP | Survey lists scoped by `orgId`. No full-table scan patterns spotted. |
| Caching/realtime | KEEP | `cacheNamespaces: NONE`. Live session uses WebSocket/SSE (not sampled). |
| Module structure | PASS | 9 controllers (8 internal + 1 public). Well-organized. Public controller properly separated. |
| UX/accessibility | PASS | Frontend routes: surveys list, new survey, survey detail, participants, live session host. |
| Security (public routes) | **DEFECT D6** | `SurveyPublicController.saveAnswers` (line 84) and `submit` (line 96) call `Number(sessionId)` on a `z.string().min(1)` validated param. `Number("abc")` = `NaN`; Postgres receives `NaN` as the session id, producing an unhandled error instead of a clean 400. Rate limits defined and applied per IP. |
| Security (tenant routes) | PASS | BOLA: `survey-response.service.ts:104-111` resolves `orgId` from the sessionId via `app.resolve_survey_session_org_id` before any write. Collector token is the public access credential. |
| Operations | PASS | Analytics, automation triggers, live session management. |
| Tests | NOT RUN | |

**Verdict: BLOCKED BY D2, D6**

---

## 4. Feedbucket

Module registry: `planGated: true`, `publicExposure: true`, `route: null` (integrated under build), `moduleFolder: "feedbucket"`, `schemaFolder: null` (schema lives in build module).

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | Tables `feedbucketWidgets`, `feedbucketSubmissions`, `feedbucketAttachments` in build schema. Soft-delete via `deletedAt`. `publicKey` is the widget access credential. |
| Authorization | PASS | `feedbucket.controller.ts:45` has `@RequireModule("feedbucket")`. Public controller is class-level `@Public()`. Internal endpoints gated with `feedbucket:*` permissions. |
| CRUD lifecycle | PASS | Widget CRUD; submission create (public)/view/update/delete/assign/ai-analyze. File uploads validated by magic bytes and MIME. |
| List/search cost | PASS | Submission queries scoped by `orgId`. Soft-delete filtered (`isNull(feedbucketSubmissions.deletedAt)` in `loadSubmission`). |
| Caching/realtime | KEEP | `cacheNamespaces: NONE`. Notification fired on new submission. Acceptable for webhook/notification pattern. |
| Module structure | PASS | 2 controllers + public. Service split: public service, AI service, main service. |
| UX/accessibility | PASS | Frontend under `/build/[projectId]/feedbucket/` (list and detail). Consistent with feedbucket being a build integration. |
| Security (public routes) | **DEFECT D4** | `feedbucket-public.controller.ts:290`: `void this.autoLinkTicket(...)` is called inside the `runInTenantTransaction` callback without `await`. The method starts executing concurrently, then the transaction commits. At line 479-484, `autoLinkTicket` calls `this.db.update(feedbucketSubmissions)` directly (no `runInTenantTransaction`). If RLS is enabled on `feedbucket_submissions`, this raw call executes without `app.current_org_id` set (GUC is gone after commit) and fails with `42501`. The error is caught and logged (`logger.warn`) but silently drops the linked-ticket update. |
| Denial-of-wallet (AI) | PASS | Two-tier rate limit: per-IP per widget (`feedbucket:ai-assist`, 5/min) and per-widget daily (`feedbucket:ai-assist-daily`, 200/day). AI gateway reserves credits BEFORE the provider call (`ai-gateway-runner.helper.ts:40,161,258`). Domain allowlist check prevents cross-origin widget abuse. `aiAssistEnabled` flag gates per-widget. |
| Operations | PASS | AI-driven triage (authenticated), auto-link to build tickets, notification to widget creator. |
| Tests | NOT RUN | |

**Verdict: BLOCKED BY D4**

---

## 5. Blog

Module registry: `planGated: false`, `publicExposure: true`, `route: "/blog"`, `moduleFolder: "blog"`, `schemaFolder: "blog"`. Schema comment: "Public marketing blog. Posts are global (not org-scoped)."

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `blog_posts`, `blog_authors`, `blog_categories`. Global (no `org_id`). Intentionally not tenant-scoped. No cross-tenant risk by design. |
| Authorization | PASS (public reads) | All 4 controller routes are `@Public()` with `RateLimitGuard`. Rate tier `blog:public-read` defined (60/min). The class-level `@UseGuards(JwtAuthGuard)` is overridden per handler by `@Public()`. |
| CRUD lifecycle | **DEFECT D5** | `blog.service.ts` has `listAdminPosts`, `getAdminPostById`, `createPost`, `updatePost`, `deletePost`, `createCategory`, `updateCategory`, `deleteCategory` (lines 28-209). **None of these are exposed via any controller route.** `blog.controller.ts` (65 lines total) exposes only 4 public read endpoints. Blog posts cannot be created, edited, or deleted through the API. The only permission key (`blog:ai:use`) covers AI assistance on posts, not creation. |
| List/search cost | **DEFECT D7** | `blog.service.ts:270`: `sql\`(${blogPosts.title} ILIKE ${term} OR ${blogPosts.excerpt} ILIKE ${term})\`` where `term = \`%${input.search}%\``. Leading-wildcard ILIKE violates the backend rule (§3: "never leading-wildcard ILIKE"). Blog is global/non-RLS so this is a performance concern, not a security one. Table is likely small. |
| Caching/realtime | PASS | `listAdminPosts` uses `cachedVersioned` with namespace `blog:admin:posts`; mutations call `invalidateNamespace`. Public reads not cached (appropriate for a public CDN-cacheable surface). |
| Module structure | PASS | 1 controller, 1 service, 1 schema folder. Compact and coherent. |
| UX/accessibility | PASS (access page only) | `/blog/access` route present for module access management. No blog reader in the authenticated app (blog reader is presumably on the marketing site consuming `GET /blog/feed`). |
| Security | PASS | Global table, no org-scoped data. Public reads only. Rate limited. No SSRF risk (no URL fetch). |
| Operations | PASS | The 4 public endpoints (`/blog/feed`, `/blog/by-slug/:slug`, `/blog/by-slug/:slug/adjacent`, `/blog/categories`) cover public consumption. |
| Tests | NOT RUN | `blog.controller.e2e-spec.ts` present. |

**Verdict: BLOCKED BY D5**

---

## 6. Directory

Module registry: `planGated: false`, `publicExposure: false`, `route: "/directory"`, `moduleFolder: "directory"`, `schemaFolder: "directory"`.

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `organization_people` (person record), `workers` (payability facet), worker engagements. Lifecycle columns on each. Soft-delete via `deletedAt`. Facet isolation per `backend/CLAUDE.md §1`: a person may hold any combination of facets. |
| Authorization | PASS | `listPeople` and `getPerson` are `@Universal()` per product rule §8 (people directory is platform-core). Write operations gated with `@UseGuards(PermissionGuard)` + `@RequirePermission`. No `@RequireModule` needed (module is `planGated: false`). |
| CRUD lifecycle | PASS | People: create/update/soft-delete. Workers: create + engagements (create/update/cancel/terminate). `softDeletePerson` at `directory.service.ts` sets `deletedAt`. |
| List/search cost | PASS | `listPeople` in `directory.service.ts:74-105`: leads conditions with `eq(organizationPeople.organizationId, organizationId)` + `isNull(organizationPeople.deletedAt)`. Cursor-based pagination (`gt(organizationPersonId, cursor)`) with `limit + 1` pattern. Free-text search uses `app.search_organization_people_ids` (SECURITY DEFINER function, canonical FTS path). ILIKE fallback guarded by result count (`> DIRECTORY_SEARCH_CAP`). |
| Caching/realtime | KEEP | `cacheNamespaces: NONE`. Directory reads are universal; caching all-org data under a single key would require careful invalidation on every person write. Deferring is sound. |
| Module structure | PASS | 2 controllers (`directory.controller.ts`, `employment-facts.controller.ts`). `PersonSeam` service at `modules/directory/person-seam.ts` for cross-module resolution. |
| UX/accessibility | PASS | 5 frontend routes: directory list, person detail, workers list, settings, access. |
| Security | PASS | No public exposure. All reads are org-scoped. `loadPerson` re-asserts both `organizationPersonId` and `organizationId`. Universal `listPeople` returns only `organization_people` fields — does not expose HR employment, payroll, or member data. Cross-tenant miss returns NotFoundException (404 equivalent). |
| Operations | PASS | Engagement lifecycle fully covered (create/update/cancel/terminate). Employment-facts controller covers additional HR facets. |
| Tests | NOT RUN | |

**Verdict: SIGNED OFF** (no defects found in this lane; tests not run per charter)

---

## Defect List — Ranked by Blast Radius

### D1 — CRITICAL: Timesheets — all 13/14 controllers gated on wrong module (`build` instead of `timesheets`)

**Files:** 13 controllers listed below, all verified by grep:
- `backend/src/modules/timesheets/core/entries.controller.ts:36`
- `backend/src/modules/timesheets/core/approvals.controller.ts:38`
- `backend/src/modules/timesheets/core/audit.controller.ts:13`
- `backend/src/modules/timesheets/core/billing.controller.ts:30`
- `backend/src/modules/timesheets/core/budgets.controller.ts:32`
- `backend/src/modules/timesheets/core/periods.controller.ts:27`
- `backend/src/modules/timesheets/core/rates.controller.ts:32`
- `backend/src/modules/timesheets/core/reports.controller.ts:19`
- `backend/src/modules/timesheets/core/settings.controller.ts:13`
- `backend/src/modules/timesheets/core/team.controller.ts:13`
- `backend/src/modules/timesheets/core/timer.controller.ts:31`
- `backend/src/modules/timesheets/core/timesheets-ai.controller.ts:27`
- `backend/src/modules/timesheets/payroll/payroll.controller.ts:43`

Additionally, `backend/src/modules/timesheets/core/exceptions.controller.ts:34` has `@UseGuards(JwtAuthGuard, PermissionGuard)` with NO `@RequireModule` and NO `ModuleGuard` at all.

**Failure scenario:** Org A subscribes to Timesheets only (not Build). `ModuleGuard` checks for `build` enablement, which is absent. Every `GET /timesheets/entries` returns 403. Org A cannot use the module they paid for. Conversely, Org B subscribes to Build only (not Timesheets). `ModuleGuard` passes (Build is enabled). Org B's members with `timesheets:entries:view` permission (which would be in their role template if they ever had timesheets) can read timesheet data without the timesheets subscription. The exceptions endpoint has no module gate at all — any authenticated org member at any org can call `GET /timesheets/exceptions` if they have `timesheets:exceptions:view`.

**Smallest correct fix:** In all 13 controllers, replace `@RequireModule("build")` with `@RequireModule("timesheets")`. In `exceptions.controller.ts`, add the import for `RequireModule` and `ModuleGuard`, add `@RequireModule("timesheets")` at the class level, and add `ModuleGuard` to the `@UseGuards()` decorator.

---

### D2 — HIGH: Surveys — 8 internal controllers lack module gate (plan bypass)

**Files:**
- `backend/src/modules/surveys/surveys.controller.ts:25` — `@UseGuards(JwtAuthGuard, PermissionGuard)`, no `ModuleGuard`
- `backend/src/modules/surveys/survey-builder.controller.ts` — same pattern
- `backend/src/modules/surveys/survey-analytics.controller.ts:26` — verified
- `backend/src/modules/surveys/survey-collectors.controller.ts` — same pattern
- `backend/src/modules/surveys/survey-participants.controller.ts` — same pattern
- `backend/src/modules/surveys/survey-assessment.controller.ts` — same pattern
- `backend/src/modules/surveys/survey-automation.controller.ts` — same pattern
- `backend/src/modules/surveys/survey-live-session.controller.ts` — same pattern

**Failure scenario:** An org owner at an org without the surveys subscription calls `GET /surveys`. `PermissionGuard` is bypassed for org owners (they always pass). `ModuleGuard` is not in the guard chain, so no module check occurs. The request reaches the service and returns the org's surveys. The org has received a paid feature without paying. Any org owner can create surveys, add participants, run live sessions, or view analytics without the surveys plan.

**Smallest correct fix:** Add `import { ModuleGuard } from "../../common/rbac/module.guard"` and `import { RequireModule } from "../../common/rbac/require-module.decorator"` to each controller. Add `@RequireModule("surveys")` at the class level. Add `ModuleGuard` to the existing `@UseGuards()` call: `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)`.

---

### D3 — MEDIUM: Sign AI controller lacks module gate

**File:** `backend/src/modules/e-sign/sign-ai.controller.ts:17`

**Failure scenario:** An org owner at an org without the sign subscription calls `POST /sign/envelopes/42/ai/summarize`. `PermissionGuard` is bypassed for org owners. `ModuleGuard` is absent. If the envelope `42` belongs to their org, the AI summarization runs, consuming AI credits, without the sign subscription.

**Smallest correct fix:** Add `@RequireModule("sign")` to `SignAiController` and add `ModuleGuard` to its `@UseGuards()` decorator, matching the pattern in `sign-envelopes.controller.ts`.

---

### D4 — MEDIUM: Feedbucket — `autoLinkTicket` fire-and-forget loses tenant context

**File:** `backend/src/modules/feedbucket/feedbucket-public.controller.ts:290`

**Failure scenario:** A widget has `autoCreateTicket: true` and `projectId` set. When a public submission arrives, `void this.autoLinkTicket(...)` is called inside the `runInTenantTransaction` callback without `await`. The outer transaction commits (tenant GUC cleared from AsyncLocalStorage). `autoLinkTicket` then calls `this.db.update(feedbucketSubmissions).set({ linkedTicketId: ticket.id }).where(...)` at line 479, which runs outside any tenant transaction context. If RLS is enabled for `feedbucket_submissions`, this call fails with `42501` (no GUC set) and is swallowed by the `catch` at line 487. The submission is created correctly, but the linked-ticket field is never written. The bug is invisible in logs except for a single `logger.warn`.

**Smallest correct fix:** Either (a) `await` the call inside the transaction (requires `autoLinkTicket` to accept and use the `tx`), or (b) move the call to `registerAfterCommit` with its own `runInNewTenantTransaction({ orgId: widget.orgId })` inside, matching the canonical pattern in `backend/CLAUDE.md §4`. Option (b) preserves the non-blocking intent.

---

### D5 — MEDIUM: Blog — admin CRUD exists in service, no controller route exposes it

**File:** `backend/src/modules/blog/blog.service.ts:28-209`

**Failure scenario:** The service implements `createPost`, `updatePost`, `deletePost`, `createCategory`, `updateCategory`, `deleteCategory`. `blog.controller.ts` (65 lines) exposes only 4 `@Public()` read endpoints. There is no authenticated management API. Blog posts cannot be created or updated through the StreamlineOS API. The blog module is read-only from a tenant/admin perspective.

**Smallest correct fix:** Add a separate `blog-admin.controller.ts` with `@UseGuards(JwtAuthGuard, PermissionGuard)` and a new `blog:posts:manage` permission (add to `blog.ts` catalog). The controller exposes `POST /blog/admin/posts`, `PATCH /blog/admin/posts/:postId`, `DELETE /blog/admin/posts/:postId`, and category equivalents. Given the global (non-org-scoped) nature, scope the gate to platform admins or a specific RBAC role — this requires product decision. Until then, the blog is write-inaccessible through the API.

---

### D6 — LOW: Surveys public — sessionId not coerced from string to integer

**File:** `backend/src/modules/surveys/survey-public.controller.ts:84,96`

**Failure scenario:** A client POSTs to `PATCH /public/surveys/:collectorToken/session/abc`. The params schema validates `sessionId` as `z.string().min(1)` — passes. The handler calls `Number("abc")` = `NaN`. The service calls `resolveSessionOrgId(NaN)` which executes `SELECT app.resolve_survey_session_org_id(NaN)`. PostgreSQL receives `NaN` as a numeric literal (invalid for an integer function parameter), producing an unhandled database error that bubbles up as an unformatted 500 instead of a clean 400.

**Smallest correct fix:** Change `collectorTokensessionIdParams` to `z.object({ collectorToken: z.string().min(1), sessionId: z.coerce.number().int().positive() }).strict()`, and remove the `Number(...)` casts at lines 84 and 96.

---

### D7 — LOW: Blog — leading-wildcard ILIKE for full-text search

**File:** `backend/src/modules/blog/blog.service.ts:270`

**Failure scenario:** `GET /blog/feed?search=nestjs` executes `WHERE title ILIKE '%nestjs%' OR excerpt ILIKE '%nestjs%'`. This is a leading-wildcard scan that cannot use a B-tree index. At low row counts (a typical company blog) the wall-clock impact is negligible, but this violates the backend rule (§3: "Free-text search: `to_tsvector` + GIN — never leading-wildcard ILIKE") and will not scale.

**Smallest correct fix:** Add a `tsvector` generated column on `blog_posts` (or a separate `blog_posts_search` GIN index), and replace the ILIKE clause with `to_tsvector('english', title || ' ' || excerpt) @@ plainto_tsquery('english', search)`.

---

## Module Sign-off Summary

| Module | Status | Blocker(s) |
|---|---|---|
| Timesheets | BLOCKED | D1 — wrong module gate on 13/14 controllers, no gate on exceptions controller |
| Sign (e-sign) | BLOCKED | D3 — SignAiController missing module gate |
| Surveys | BLOCKED | D2 — 8 controllers lack module gate; D6 — sessionId coercion |
| Feedbucket | BLOCKED | D4 — autoLinkTicket loses tenant context on async path |
| Blog | BLOCKED | D5 — admin CRUD exists in service but no API route exposes it |
| Directory | SIGNED OFF | No defects found this session; tests not run |
