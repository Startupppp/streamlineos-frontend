# 00 — Current-state audit

Status: Current unverified source inventory
Snapshot: 2026-10-02

## Evidence standard

This audit proves that source paths and contracts exist. It does not prove a deployed route, migration, provider, cache, queue, or browser flow works. Runtime promotion to **Current verified** requires the evidence matrix in [14-testing-browser-verification-and-acceptance.md](./14-testing-browser-verification-and-acceptance.md).

## Inventory

| Area | Current source evidence | Count/scope | Gap or conflict | Required action | Confidence |
|---|---|---:|---|---|---|
| Build pages | `frontend/app/**/build/**/page.tsx` | 80 (snapshot 2026-10-04; was 75 at 2026-10-02) | Product spec proposes additional routes; not all are in the manifest. | Implement only in the vertical slice that owns the route; preserve compatibility redirects. | High, source inventory |
| Route decisions | `frontend/lib/build/build-route-manifest.ts`; `experience/routes-and-screen-decisions.md` | 80 current decisions | Current manifest marks all entries `KEEP`; product decisions consolidate some navigation and aliases without deleting records. | Update manifest and route tests in the same change as redirects. | High |
| Backend Build files | `backend/src/modules/build/**` | 732+ files | Large public surface can drift across controllers and mutation paths. | Deepen ticket commands, project reachability, import, client grant, and dashboard query seams. | High |
| Controllers | `backend/src/modules/build/**/*.controller.ts` | 57 controllers (was 53 at 2026-10-02) | Presence is not a complete wire-contract guarantee; several controllers use broad `@Controller("build")`. | Generate OpenAPI diff and test route/DTO/permission alignment before each slice closes. | High |
| Build schema | `backend/src/db/schema/build/**` | 42 files (was 38 at 2026-10-02) | Existing tables use mixed identity/revision/audit conventions; proposed tables must not duplicate existing records. | Reuse first, then migration with tenant-leading indexes and lifecycle constraints. | High |
| Backend tests | `backend/src/modules/build/**/*.(spec|e2e-spec).ts` | 450 files by filename census (was 405 at 2026-10-02) | Focused tests are not target-DB, browser, deployment, or production evidence. | Keep tests at deep interfaces and add database/role/tenant proof. | High |
| Frontend Build tests | Build/project/ticket matching test files under `frontend/` | 471 relevant files by filename census | Filename relevance is approximate; it is not a coverage percentage. | Map tests to ledger IDs and close state/access/mobile gaps. | Medium |
| Query keys | `frontend/lib/query-keys/build-work.ts` | Central nested factory | Some hook files can still build ad hoc parameter objects or invalidate too broadly. | All new hooks use this factory and scope by organization/project/actor where required. | High |
| Navigation | `frontend/lib/build/build-nav-model.ts`; `frontend/lib/build/nav/*` | One resolver with permission and module checks | Product’s four stable destinations and Projects destination must remain aligned with real routes. | Add/update catalog tests with any destination change. | High |
| Ticket mutation | `backend/src/modules/build/core/tickets/apply-ticket-change.ts` | Current mutation owner | Other write services still exist around create/delete/restore/transfer; effect parity must be preserved. | Treat `applyTicketChange` as the transition seam and test parity from every adapter. | High |
| Project access | `backend/src/modules/build/core/project-crud/project-access.ts` | Current reachability owner | Permission checks outside this seam can create BOLA drift. | Every record query spends a project-scoped standing or equivalent scoped read. | High |
| Cache | `backend/src/common/cache/cache.service.ts`; report/ticket invalidation call sites | Shared cache plus Build namespaces | Cache keys and TTLs are not uniform across every controller. | Use the matrix in document 10; authorization truth is never cache-only. | High |
| Rate limit | `backend/src/common/ratelimit/*` | Global guard, named tiers, Redis with bounded memory fallback | Most authenticated Build CRUD has no feature tier, while public/provider/expensive actions do. | Add tiers only where abuse/cost model requires them; do not invent blanket throttling. | High |
| Outbox | `backend/src/common/outbox/*`; Build approval/release/blocker/webhook consumers | Transactional outbox infrastructure | Event coverage varies by capability. | Every external or asynchronous effect writes an outbox event in the command transaction. | High |
| Onboarding | current org setup routes and `onboarding/01-*` target contract | Existing behavior plus Planned replacement | Current source and target three-step adaptive flow are not claimed equivalent. | Deliver as activation slices with durable resume/idempotency. | Medium |
| Research/evidence | three retained packs plus `audit/research-traceability.md` | 116 Markdown sources, 162 images retained | Historical screenshots are not current runtime proof. | Cite the finding and required proof, never upgrade by documentation alone. | High |

## Reuse, refactor, remove

| Decision | Files/symbols | Rationale |
|---|---|---|
| Reuse | `build.module.ts`, `projects.module.ts`, `apply-ticket-change.ts`, `project-access.ts`, central query keys, route/nav model, outbox, cache, rate limiter | These are existing seams with leverage and tests. |
| Refactor behind existing seam | ticket create/update/delete/restore/transfer adapters; dashboard queries; client grant activation; import coordinator | Callers should learn one interface and receive uniform authorization, CAS, audit, invalidation, and effects. |
| Consolidate navigation | Assigned and Drafts into My Work; Feedbucket into Intake Bug reports; persona aliases into saved/configured views | Records and deep links remain; duplicate sidebar destinations disappear. |
| Rename UI only | Project “Modules” to “Workstreams” | Storage/API compatibility remains until an explicit migration proves value. |
| Do not remove yet | Current route files, tables, controller methods, compatibility aliases | Delete only after route telemetry, reference scan, backfill, rollback plan, and ledger acceptance. |

## Known documentation defects corrected by this pack

- `CONTEXT.md` referenced a nonexistent `docs/specs/build/module/07-architecture-integrations-prd.md`; the canonical target is `docs/build-module/architecture/07-architecture-data-api-cache-ai.md`.
- The Build README referenced a missing `CLAUDE-MASTER-IMPLEMENTATION-PROMPT.md`; this handoff is now supplied.
- The earlier requirements table repeated `R17`; IDs are made unique.

## Unknowns that stay explicit

- Production migration state, database plans, replica lag, cache availability, worker health, and deployment revision were not inspected in this documentation run.
- No current browser session, external client invitation, payment, webhook endpoint, or provider credential was exercised.
- Source counts can change after this snapshot; rerun the census before implementation.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Record the dated source inventory, reuse/refactor/remove candidates, corrected document references, and explicit verification gaps; see [the validation report](../audit/validation-report.md) for the 2026-10-02 census at `a5b8347fb`.
- [x] Refresh route, controller, schema, migration, and test counts on the implementation revision; update every changed source anchor before using this inventory for deletion.
- [x] Prove each proposed removal has no remaining route, caller, permission, import, outbox, or external link dependency; record migration and rollback in the [cleanup plan](15-migration-cleanup-and-reuse-plan.md).
- [ ] Record target database plans, deployed revision, cache and worker health, and representative owner/member/client browser actions for claims still marked Current unverified.
