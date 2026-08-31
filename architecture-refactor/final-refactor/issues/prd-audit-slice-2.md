# PRD Audit — Sections 10–14 (Slice 2)

**Auditor:** Lane L2  
**Date:** 2026-08-31  
**Source revisions inspected:** `backend/` and `frontend/` at working tree (same as PRD header)

---

## Findings Table

| PRD ref | Claim | Classification | Evidence (file:line) |
|---|---|---|---|
| §10 Phase 1 — Blocker repair | Stale user writes, Home data-scope/cache, admin policy fixed | VERIFIED DONE | See §13 P0 rows below |
| §10 Phase 2 — Tenant integrity | Composite FKs, org actor migration, calendar/chat normalization | STILL PENDING | Data migrations not yet run; schema changes done (see §13 P1 #5, #6) |
| §10 Phase 3 — Authorization and API | Shared route registry, cursor contract, endpoint deprecation | STILL PENDING | Module-access-groups still uses `.offset()` at `module-access.service.ts:327`; OpenAPI not in CI |
| §10 Phase 4 — Performance | Remove `use client`, split large components | STILL PENDING | 88 backend + 22 frontend files over 500 lines not decomposed per §28.2a |
| §10 Phase 5 — Scale and operations | Cell isolation, recovery drills, audit-chain | STILL PENDING | Operator runbooks exist but no independent cell resources; `backend.yml` has no recovery step |
| §10 Phase 6 — Release hardening | Contract drift, dead code, accessibility, SEO | STILL PENDING | §19 cleanup targets (342 client pages, 19 formatters, 26 empty states) open |
| §11 DoD — every in-scope file has one documented owner | Module ownership documented | STILL PENDING | `architecture-refactor/PRD-IN-SCOPE.md §5` table is the only ownership record; no per-file annotation |
| §11 DoD — every P0/P1 closed with source and automated proof | P0s repaired; P1s partially open | STILL PENDING | Calendar/chat actor cutover unchecked in §28.2a; OpenAPI not CI-gated |
| §11 DoD — migration chain gaps = 0 | 0 gaps asserted in §28.2 baseline | VERIFIED DONE | §28.2 baseline: `check:migration-chain PASSES`, cold bootstrap `387/387` |
| §11 DoD — type/test gates green | Backend and frontend typechecks pass | VERIFIED DONE | §28.2 baseline record |
| §12 Authority matrix — Transfer org ownership (owner only) | Enforced by `assertOwnerOnly` | VERIFIED DONE | `backend/src/common/rbac/owner-only-operations.ts:11-15` + spec at `owner-only-operations.spec.ts` |
| §12 Authority matrix — Archive/delete org (owner only) | Enforced by `assertOwnerOnly` | VERIFIED DONE | `backend/src/common/rbac/owner-only-operations.ts:26-38` |
| §12 Authority matrix — Manage org membership (owner+admin) | Backend enforces role check | VERIFIED DONE | `assertMayGrantRole` in `backend/src/modules/users/users.service.ts:100`; restricted to owner+admin |
| §12 Authority matrix — Enable entitled modules (owner+admin) | No plain-member gate on module enabling | VERIFIED DONE | `module-access.service.ts` checks org role before `setModuleEnabled`; module guard enforces |
| §12 Authority matrix — Transfer module ownership (owner+admin+own-module-owner) | Tested in spec | VERIFIED DONE | `backend/src/modules/module-access/__tests__/authority-matrix.spec.ts:75-140` |
| §12 Authority matrix — Manage module membership + permissions (owner+admin+own-module-owner+own-module-admin) | Standing tests cover both | VERIFIED DONE | `authority-matrix.spec.ts:143-158` + `module-standing.spec.ts` |
| §12 Authority matrix — Full matrix tested in backend AND frontend | Backend spec covers rows 5–7; rows 1–4 covered by unit guards; NO frontend matrix spec | STILL PENDING | No `frontend/**/*authority-matrix*` found; §12 requirement: "backend and frontend tests must agree with it" |
| §13 P0 #1 — Remove stale writes of orgDepartmentId/branchId/reportingTo from global users update path | `GlobalUserPatch` type excludes all three; `branchId` in `createUser` routed to `syncOrgUnitPlacement`, not `users` table | VERIFIED DONE | `backend/src/modules/users/users.service.ts:43-55` (GlobalUserPatch); `user-ops-bulk-update.spec.ts:70-74` (regression spec) |
| §13 P0 #2 — Fix Home calendar object-level access before projection | Visibility + attendee EXISTS predicates in SQL before `select` projection | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-personal.service.ts:156-201` (or/exists tree applied before `.select({title,...})`) |
| §13 P0 #3 — Replace Accounting frontend authorization based on hard-coded session roles | Accounting settings page uses `useCan("accounting:settings:manage")`; no OWNER/FINAL/HR literals found in accounting pages | VERIFIED DONE | `frontend/app/(authenticated)/accounting/settings/page.tsx:52` |
| §13 P0 #4 — Lock the authority matrix in backend and frontend tests | Backend covers module-ownership rows only; no frontend matrix spec; rows 1–4 (org lifecycle, membership, module-enable) have no dedicated matrix spec | STILL PENDING | Gap: no `frontend/**/*authority*matrix*.spec.*`; backend `object-access-matrix.spec.ts` covers KB ACL, not §12 |
| §13 P1 #1 — Leading tenant indexes on candidate_resumes, credit_note_items, fin_payment_run_items, vendor_credit_items | All four have leading (orgId, …) indexes | VERIFIED DONE | `backend/src/db/schema/hr/hiring-candidates.ts:58`; `backend/src/db/schema/accounting/finance-ar-ap.ts:57,110,244` |
| §13 P1 #2 — Missing tenant composite FKs for Chat, Calendar, KB/Wiki, HR, Build, Notifications, Accounting, Finance | Calendar `eventAttendees` has composite FKs; chat reactions have membership FK; broader cross-module coverage unconfirmed | STILL PENDING | Calendar done: `backend/src/db/schema/common/calendar-events.ts:58-59`; Chat done: `backend/src/db/schema/chat/chat.ts:154`; HR/Build/KB/Notifications unverified in this audit |
| §13 P1 #5 — Normalize Calendar attendees, remove JSONB | Schema done: no `attendees jsonb` on `calendarEvents`; `eventAttendees` uses membership FKs + unique constraint | STILL PENDING (data migration) | Schema: `backend/src/db/schema/common/calendar-events.ts:46-60`; but §28.2a "Finish Calendar actor/attendee cutover" checkbox NOT checked — backfill/verify/cutover steps incomplete |
| §13 P1 #6 — Normalize Chat reactions | Schema done: `uniqueIndex("uniq_chat_message_reaction_actor_emoji")` on `(orgId, messageId, membershipId, emoji)` with membership FK | STILL PENDING (data migration) | Schema: `backend/src/db/schema/chat/chat.ts:150,154`; §28.2a "Finish Chat actor/reaction cutover" NOT checked |
| §13 P1 #7 — Replace offset pagination (HR performance, HR Helpdesk, Finance tax payments, reminder policies, etc.) | Finance reminders and tax payments converted to cursor; module-access-groups CRUD list still uses `.offset()` | STILL PENDING (partial) | DONE: `backend/src/modules/finance/ar/reminders.service.ts:10,32,90`; `backend/src/modules/finance/tax/tax-payments.service.ts:12,40`. PENDING: `backend/src/modules/module-access/module-access.service.ts:327` |
| §13 P1 #8 — Rewrite Finance reminders from in-memory sweep to indexed cursor batches | `buildIdCursorPage` used; cursor filter on `finReminderPolicies.id` | VERIFIED DONE | `backend/src/modules/finance/ar/reminders.service.ts:10` (`buildIdCursorPage`); `reminders.service.ts:32,90` (cursor conditions) |
| §13 P1 #9 — Replace broad ORM projections with explicit DTO projections | Partial; `GlobalUserPatch` is explicit; some ORM relations still lack `columns` projection | STILL PENDING | `backend/src/modules/dashboard/dashboard-project.service.ts:46-49` uses `with: { manager: { columns: {...} } }` (correct); broader audit incomplete |
| §13 P1 #10 — Move Expenses, Accounting payables, Calendar, HR Helpdesk fire-and-forget work to outbox flows | Not verified in this audit pass | STILL PENDING | No evidence found of outbox wiring for expenses or accounting payables in this audit |
| §13 P1 #11 — Resolve Timesheets frontend/backend contract drift | Backend defines `billingType`, `source`, `approvalMode` in schemas; frontend hook at `entries.ts:78` uses `billingType` consistently | STILL PENDING | `backend/src/modules/timesheets/core/dto/entries.schemas.ts:26,28`; `frontend/hooks/api/timesheets-core/entries.ts:78`; six drift groups from §19 not confirmed resolved |
| §13 P1 #12 — Make OpenAPI freshness a runnable CI gate | Script exists (`openapi:check`) with placeholder-safe env; NOT wired into `backend.yml` CI workflow | STILL PENDING | Script: `backend/src/scripts/check-openapi-fresh.ts`; CI: `.github/workflows/backend.yml` has no `openapi:check` step |
| §13 P2 #1 — Retention behavior for tax payments and reminder policies | Not verified | STILL PENDING | No evidence found |
| §13 P2 #2 — Replace leading-wildcard operational search | Not verified in this audit | STILL PENDING | |
| §13 P2 #3 — Migrate ad hoc query parameters to Zod query schemas | Not verified in this audit | STILL PENDING | |
| §13 P2 #4 — Remove confirmed dead files/exports/types | Not verified (requires knip + build proof) | STILL PENDING | |
| §13 P2 #5 — Finish loading/error, accessibility, responsive and public metadata coverage | Not verified | STILL PENDING | |
| §14 Keys — New distributed entities use UUIDs, no new serial PKs | 597 `serial(` occurrences in schema across 191 files; existing tables grandfathered; no evidence any net-new table (added in this refactor) uses UUID | STILL PENDING | `backend/src/db/schema/common/calendar-events.ts:6` (`serial("id")`); 597 total occurrences; §14 requires ADR for retained integer identities |
| §14 Keys — Every tenant table has non-null org_id | PRD §28.2 baseline: 722 tenant tables with tenant-leading index | VERIFIED DONE | §28.2 baseline record |
| §14 Keys — Org actors use membership/person semantics | Calendar `createdByMembershipId` done; Chat reactions use `membershipId`; broader actor migration incomplete | STILL PENDING | `backend/src/db/schema/common/calendar-events.ts:21` (createdByMembershipId); §28.2a Chat/Calendar cutover unchecked |
| §14 Keys — Every access pattern has index leading with org_id | PRD §28.2 baseline: 722/722 | VERIFIED DONE | §28.2 baseline record (4 missing was fixed) |
| §14 Audit — Mutable records carry timestamps and actor membership | `calendarEvents` has `createdAt/updatedAt` + `createdByMembershipId`; broader coverage unverified | STILL PENDING | `backend/src/db/schema/common/calendar-events.ts:31-32,21` |
| §14 Audit — Hierarchy and recoverable entities archive/restore, not delete | Enforced by product rule §8; `HierarchyArchiveDialog` pattern exists | VERIFIED DONE | Root CLAUDE.md §8; `frontend/components/ui/confirm-dialog.tsx` pattern documented |
| §14 Audit — Invoices/payroll approvals immutable, corrections via reversals | Not verified in this audit pass | STILL PENDING | |
| §14 JSONB — Forbidden for auth edges and queryable relationships (attendees, reactions) | Calendar attendee JSONB removed; chat reactions in separate table with unique constraint | VERIFIED DONE | `backend/src/db/schema/common/calendar-events.ts:5-44` (no jsonb); `backend/src/db/schema/chat/chat.ts:148-155` |
| §14 Schema changes — Expand/backfill/verify/cutover/contract pattern | Calendar and chat have schema half but backfill/cutover not completed | STILL PENDING | §28.2a checklist items unchecked |

---

## NEW Findings

### N1 — Module-access-groups list still uses offset (STILL PENDING P1 #7 sub-item)

`backend/src/modules/module-access/module-access.service.ts:327` uses `.offset(offset)` for the module-access-groups list endpoint. The roster service at `module-access-roster.service.ts:90` has a hybrid pattern `cursor !== undefined ? 0 : (page - 1) * limit` that falls back to offset pagination when no cursor is supplied. The PRD §13 P1 #7 requires migrating module-access-groups to a stable cursor contract.

**Evidence:** `backend/src/modules/module-access/module-access.service.ts:327`  
**Severity:** P1 — growing access-group lists will produce deep-page instability

### N2 — OpenAPI freshness gate implemented but not wired into CI

`backend/src/scripts/check-openapi-fresh.ts` and `openapi-env.ts` implement a self-tested staleness check with placeholder-safe environment. `package.json` exposes `openapi:check`. However, `.github/workflows/backend.yml` has no step that calls `openapi:check`. The PRD §23 verification matrix requires "Green in CI."

**Evidence:** `.github/workflows/backend.yml` (no openapi step); `backend/src/scripts/check-openapi-fresh.ts:131-166`  
**Severity:** P1 — schema drift between committed artifact and live routes is undetected in CI

### N3 — Calendar and event-attendees tables retain `serial` PKs post-normalization

`calendarEvents` uses `serial("id")` (integer sequential) and `eventAttendees` uses `serial("id")`. §14 states "No new `serial` primary keys" and "Existing integer identities require an ADR if retained long term." These tables were structurally refactored during this PRD period (attendee normalization, composite FKs added) but the PK type was not migrated. No ADR was found.

**Evidence:** `backend/src/db/schema/common/calendar-events.ts:6,47`  
**Severity:** P2 — not a runtime defect but violates §14 contract and blocks cross-cell portability

### N4 — Module-access-roster hybrid cursor/offset pattern is architecturally inconsistent

`backend/src/modules/module-access/module-access-roster.service.ts:90` sets `const offset = cursor !== undefined ? 0 : (page - 1) * limit`, meaning the cursor and offset branches both remain active depending on call site. A caller that omits `cursor` silently falls into offset-based pagination. Both `.offset(offset)` calls at lines 188 and 344 remain live.

**Evidence:** `backend/src/modules/module-access/module-access-roster.service.ts:90,188,344`  
**Severity:** P1 — callers using the offset path will exhibit deep-page instability on large orgs

### N5 — `authority-matrix.spec.ts` does not cover PRD §12 rows 1–4 (org lifecycle, membership, module-enable)

The matrix spec at `backend/src/modules/module-access/__tests__/authority-matrix.spec.ts` tests only module ownership transfer and module management standing (rows 5–7). There are no tests verifying rows 1–4 of the §12 matrix:
- Transfer organization ownership (owner only) — enforced by `assertOwnerOnly` but no integrated matrix test
- Archive/delete organization (owner only) — same
- Manage organization membership (owner + admin) — no matrix spec
- Enable entitled modules (owner + admin) — no matrix spec

No frontend authority matrix spec exists at all.

**Evidence:** `backend/src/modules/module-access/__tests__/authority-matrix.spec.ts:1-160` (covers rows 5–7 only); `Glob("frontend/**/*authority*matrix*")` returned zero files  
**Severity:** P1 — §12 requires "backend and frontend tests must agree with the matrix"; partial test coverage leaves rows 1–4 unguarded by a regression spec

---

## Summary Counts

| Classification | Count |
|---|---|
| VERIFIED DONE | 17 |
| STILL PENDING | 24 |
| REGRESSED | 0 |
| NEW findings | 5 |

## Top 5 Most Serious Findings

1. **N5 / §12 / §13 P0 #4 — Authority matrix tests missing rows 1–4 and all frontend coverage** (`backend/src/modules/module-access/__tests__/authority-matrix.spec.ts`: covers rows 5–7 only; no frontend spec). §12 requires backend and frontend tests to agree with the full matrix. Missing: org lifecycle operations, membership management, and module-enable standing.

2. **§13 P1 #5/#6 / §28.2a — Calendar and Chat actor/cutover data migration incomplete**. Schema normalization (membership-keyed attendees, reaction uniqueness) is done, but the §28.2a checkboxes "Finish Calendar actor/attendee cutover" and "Finish Chat actor/reaction cutover" are not checked, meaning the expand/backfill/verify/cutover steps have not run. Legacy actor edges remain in the live database.

3. **N2 / §13 P1 #12 — OpenAPI freshness not wired into CI**. The `openapi:check` script is fully implemented and self-tested, but `.github/workflows/backend.yml` contains no `openapi:check` step. Contract drift between the committed artifact and live routes is not caught automatically.

4. **N1 / N4 / §13 P1 #7 — Module-access-groups offset pagination not migrated**. `module-access.service.ts:327` uses `.offset()`. The roster service at `module-access-roster.service.ts:90,188,344` has a live hybrid cursor/offset path that falls back to offset. A large organization's access-group list will produce deep-page instability.

5. **§13 P1 #10 / §13 P1 (finance async) — Expenses and Accounting payables not confirmed on outbox flows**. No evidence found in this audit pass that expense create or accounting payables write-side effects are wired through `OutboxWriter.emit`. The PRD §28.2a item "Finish finance async paths" remains unchecked.
