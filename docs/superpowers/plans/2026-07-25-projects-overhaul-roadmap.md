# Projects Management Overhaul — Master Roadmap

> **This is an index, not an executable plan.** It decomposes the Projects-module review-and-fix program into sequenced, individually-shippable slices. Execute in order; each ends green (build + lint + types + tests) and gets a `PAGES.md` entry before the next begins. Write each slice's detailed plan **just-in-time** (fresh reads of its target files) when its turn comes.

**Program goal:** Bring the Projects Management module (backend `backend/src/modules/projects/**` + `db/schema/projects/**`; frontend `app/(authenticated)/projects/**` + `features/projects/**`) to production quality per `CLAUDE.md` + `UI-UX-SYSTEM.md` — correct, secure, efficient, DRY, responsive, well-typed, and **visually consistent across modules** (one shared kanban card / list / badge, not one per module). The stated **primary task** is the shared cross-module primitives (Slice 3).

**Governing constraints:** slice by slice, audit-first, verify before claiming done, test the touched APIs · no `any`/forced casts/`@ts-ignore` · reuse existing shared primitives before creating new (`DataTable`, `MemberPicker`, `StatusBadge`, `SemanticBadge`, `PriorityBadge`, `ResponsivePopover`, `PageWrapper`, `LoadingButton`, `AnimatedIconButton`) · git orchestrator-only, commit between slices.

**User scope decisions (2026-07-25):** (1) P0 backend security first, then shared components. (2) Migrate all 4 kanban modules now (Projects, CRM Deals, CRM Leads, HR Recruitment) + badge adoption everywhere. (3) Schema = safe-additive + soft-delete. (4) RAG/vector-DB = separate KB track (Slice 7), pgvector+HNSW for now.

**Verified facts (three Explore agents, 2026-07-25):** backend schema is well-normalized (no JSONB-array lifecycle anti-patterns); frontend data layer healthy (single `apiClient`, central `query-keys`, optimistic `useUpdateTicket`/`useUpdateProject`, no enabled-clobber bug); the shared `components/ui/data-table.tsx` is widely + correctly adopted (keep). Duplication concentrated in: 4 independent kanban cards (0% reuse), 7 `PRIORITY_COLORS` + 15+ `STATUS_COLORS` local dicts, `UserCombobox` = redundant `MemberPicker` wrapper.

**Disproven audit flag (do NOT "fix"):** the member/custom-state/automation/`updateProject` writes gated at the controller on `projects:view` are NOT a privilege-escalation hole — each re-asserts object-level authority in-service (`assertCanManageProject` / `updateProject`'s inline owner·platform-admin·`projects:manage`·`managerId`·project-`ADMIN` check). Flipping the guard to `projects:manage` would break the intended project-manager/ADMIN fallback. Guards intentionally left coarse; object-level authorization is the real gate.

---

## Sequence

| # | Slice | Layer | Status | Depends on |
|---|-------|-------|--------|-----------|
| 0 | Backend security + correctness hotfix | Backend | ✅ **DONE** (2026-07-25) | — |
| 1 | Backend API efficiency, limits & DTO hygiene | Backend | ▫️ roadmap only | 0 |
| 2 | Schema: safe-additive indexes/FK + soft-delete | Schema | ▫️ roadmap only | 0, 1 |
| 3 | **Shared cross-module primitives (PRIMARY)** | Frontend | ▫️ roadmap only | — |
| 4 | Frontend page structure, routing & page-splits | Frontend | ▫️ roadmap only | 3 |
| 5 | Frontend data-layer & responsive polish | Frontend | ▫️ roadmap only | 3, 4 |
| 6 | Inline AI on Projects detail surfaces | Frontend + AI | ▫️ roadmap only | 3, 5 |
| 7 | *(linked, deferred)* RAG / vector-DB scale evaluation | KB track | ⏳ deferred | — |

---

## Slice 0 — Backend security + correctness hotfix ✅ DONE
Disproven the RBAC-flip flag (object-level checks already enforce; guards left coarse by user decision). Real fixes shipped: `updateProject`/`deleteProject` now invalidate `projects:list:${orgId}:*`; `updateProject` field-update + member-sync unified into one `db.transaction`; `removeMember` 3 writes wrapped in one transaction. New `assertProjectAccess` (owner·platform-admin·`projects:manage`·`managerId`·any member) gates the sub-resource reads `GET /projects/:id/{members,custom-states,automations}` — closed an intra-tenant info-disclosure. New `projects-access.e2e-spec.ts`. BE tsc ✓ lint ✓. See `PAGES.md` 2026-07-25.

## Slice 1 — Backend API efficiency, limits & DTO hygiene
Cap `bulkUpdate.ticketIds` (≤100); paginate `GET /projects/my-work`; bound/stream `GET /projects/:id/tickets/export`; make `GET /projects/:id/tickets/:ticketId` return an attachment count + paginate comments/attachments (no unbounded embed). Kill N+1 ancestor walks (`assertValidParent`, `bulkUpdate`) → recursive CTE. Split `dto/projects.schemas.ts` (645) into `tickets`/`roadmap`/`templates` schemas; fix member-role enum inconsistency (`ADMIN|MEMBER|VIEWER` vs service `OWNER|CONTRIBUTOR`); replace `listCustomStates` `select()` with explicit projection. Split `projects-tickets.service.ts` (709) + other >500-line files. Short-lived request cache for `checkProjectAccess`. **Acceptance:** no unbounded list/detail; no per-row loop query; no backend file > 500 lines (except §9); one-schema-per-file with `z.infer`; tests assert caps + envelope shape.

## Slice 2 — Schema: safe-additive + soft-delete (migrations)
Additive/reversible only, one migration per concern. Composite/missing indexes: `project_statuses(org_id, project_id)`, `custom_states(org_id, project_id)`, `tickets(epic_id)`, `ticket_comments(ticket_id, created_at DESC)`, `project_milestones(org_id, target_date)`. Cross-tenant hardening: add nullable `org_id` to `work_item_relations` → batched backfill → `NOT NULL` + composite index; FK constraints on `ticket_comment_reactions.org_id` + `project_automations.org_id`. Soft-delete: `deleted_at` on `tickets`/`projects`/`ticket_comments`; hard-deletes → tombstone; `isNull(deleted_at)` on every list/read; define cascade (soft-deleting a project hides its tickets); catch `23505` → `ConflictException`. **Acceptance:** `db:generate` clean; additive+reversible; no data loss; every reader excludes tombstones; index coverage verified.

## Slice 3 — Shared cross-module primitives (PRIMARY)
Reuse existing shared primitives; create new only where nothing fits. Sub-parts ship independently.
- **3a — Board primitives (new):** `components/shared/board-card.tsx` (drag-state, header [title + id + overflow], body, footer [badges + assignee] slots) + `components/shared/board-column.tsx` (Droppable, header [label + count], empty state, windowed list reusing `kanban-virtual-ticket-list.tsx`). Migrate **Projects** onto them first as reference.
- **3b — Migrate the other 3 kanban modules:** CRM Deals (`deal-kanban-card` + `kanban-column`), CRM Leads (`kanban-card` + `leads-kanban`), HR Recruitment (`candidate-card` + pipeline) — domain fields via slots, behavior unchanged; audit-first per module.
- **3c — Badge consolidation:** move `features/projects/shared/priority-badge.tsx` → `components/shared/priority-badge.tsx`; delete the 7 `PRIORITY_COLORS` + 15+ `STATUS_COLORS` local dicts → `StatusBadge`/`SemanticBadge`/`PriorityBadge`.
- **3d — Member-select + list-row + misc:** retire `UserCombobox` (26 callers → `MemberPicker`); extract `MemberCommandList` for `InlineAssignee`; extract the verbatim HR Helpdesk `TicketRow`; reconcile `data-table-pagination` vs `table-pagination`; hoist `timeAgo` → `lib/date-utils.ts`.
- **Acceptance:** all 4 kanban modules render from `BoardCard`/`BoardColumn`; zero local status/priority dicts; `UserCombobox` deleted; drag/drop + optimistic inline edits intact; no regressions at 375/768/1280.

## Slice 4 — Frontend page structure, routing & page-splits
Delete dead routes (redirect-only `[projectId]/{workload,pages}`, stub `projects/page.tsx` + `customers/page.tsx`, re-export `portfolios/page.tsx`) + fix links. Add missing `error.tsx` (~21) + `loading.tsx` (~10) with real-layout skeletons. Split >600-line pages — board `[projectId]/page.tsx` (707 → `use-board-filters`/`use-saved-view`/`project-board-page`), `automations` (687), `webhooks`, `whiteboard`, `cycles`/`intake`/`modules`, `all` (452), `goal` — and large feature files (`list-view` 889, `kanban-board` 571, `filter-command-menu` 658). **Acceptance:** thin route files; no page > 600 lines; every data route has skeleton + error boundary; extractions reuse Slice-3 primitives.

## Slice 5 — Frontend data-layer & responsive polish
Global `refetchOnWindowFocus` in the `QueryClient` provider (one place). Debounced search (separate UI state; never "type 3 show 1"). `enabled: useCan("<exact backend key>")` on project queries. Replace the raw query-key string in `use-all-work-bulk` with `queryKeys.projects.allWork()`; move feature-level `apiClient` mutations into `hooks/api/projects/`. Migrate `filter-command-menu` + raw `Popover` filters (goals/customers) to `ResponsivePopover` (Drawer < md). **Acceptance:** global focus-refetch; debounced+typed search; gated queries never 403-spam; no raw popover mobile filter; skeletons mirror content at 375px.

## Slice 6 — Inline AI on Projects detail surfaces
Add shared `AiActionsMenu` (§15) to ticket/project surfaces where it reduces real effort; reuse the module's existing gateway AI endpoint (add one only if none fits); draft-first, credit-metered, `useCan`-gated, `AiUsageChip` on results, graceful 402/403/error. **Acceptance:** no duplicated AI primitive; every action draft-first + metered + gated.

## Slice 7 — *(linked, deferred)* RAG / vector-DB scale evaluation
Out of this roadmap unless pulled in. KB track (pgvector+HNSW now). If requested: design-only spike (pgvector-HNSW vs Qdrant at millions-of-users) → migration spec, no code. Not started without explicit sign-off.

---

## Verification (per slice + end-to-end)
Backend: `pnpm -C backend build && pnpm -C backend lint && pnpm -C backend test` (controller e2e: auth + RBAC allow/deny + cross-tenant + limit caps). Frontend: `pnpm -C frontend build && pnpm -C frontend lint && pnpm -C frontend tsc --noEmit`. Smoke real endpoints via the `streamlineos` MCP tools after Slices 0–2. Responsive check 375/768/1280 for UI slices; drag/drop + optimistic edits after Slice 3. Update `PAGES.md` after each slice; commit between slices on the current branch (orchestrator-only).
