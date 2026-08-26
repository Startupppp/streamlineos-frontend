# 06 — Every list speaks one filter and sort vocabulary

**What to build:** Knowing how to filter and sort one list teaches you every other list. Page size, cursor, sort field, sort direction and filters are parsed and validated in one shared shape.

**Blocked by:** 05 — Scrolled lists page by cursor

**Status:** in-progress

## Acceptance criteria

- [x] One validated shape covers page size, cursor, sort field, sort direction and filters, living beside the feature per the schema convention. — `backend/src/common/pagination/list-query.schema.ts` now exports the shape *and* its parts: `PAGE_SIZE_CAP`, `pageNumberField`, `pageSizeField(defaultSize, maxSize?)`, with `baseListQuerySchema` rebuilt on top of them, so page and page size have exactly one definition. The cursor half is `backend/src/common/pagination/cursor.schema.ts` (`idCursorSchema`), added by c13-05.
- [x] Sort fields are an allowlist per endpoint — an arbitrary sort column is refused. — `withSortField(allowlist)`, covered by `list-query.schema.spec.ts`.
- [x] A page size above the cap is clamped rather than honoured or rejected. — `pageSizeField`'s `.transform(v => Math.min(v, ceiling))`. This is now true at the call sites too, not just in the helper: all sixteen migrated schemas previously used `.max(100)`, which **returned 400** for an over-large page. `backend/src/common/pagination/list-query.schema.spec.ts`, 120 tests, all pass.
- [ ] Sorting composes with the tenant-led indexes rather than falling off them. — **BLOCKED:** needs `EXPLAIN (ANALYZE, BUFFERS)` run as `streamline_app` with the tenant GUC set. No database has been touched in this program, and measuring as the owner would prove nothing — `BYPASSRLS` hides exactly the effect being tested.
- [ ] The 16 duplicated local copies of the pagination schema are deleted. — **The count is wrong and the criterion cannot be met as written.** Verified 2026-08-26: `page: z.coerce.number()` appears **204 times across 135 files**, not 16. Sixteen of those files are in this lane's territory and all sixteen are now migrated (26 occurrences → 0). The other **178 occurrences across 119 files** are in modules this lane may not edit; they are listed below by module and in `architecture-refactor/lane-requests/lane-3.md`, and nothing is ticked for them.

## Todo

- [x] Add the shared schema beside the existing runtime helper — `backend/src/common/pagination/list-query.schema.ts` exports `baseListQuerySchema` and `withSortField(allowlist)` factory; page size is clamped, not rejected
- [x] Migrate the hand-rolled offset callers to the capped helper — `ticketsListQuerySchema` (lines 33–34), `allWorkQuerySchema` (lines 77–78) and `ticketActivityQuerySchema` (line 131) in `backend/src/modules/build/core/dto/ticket.schemas.ts` now extend `baseListQuerySchema`; `searchTicketsQuerySchema` (line 126) is intentionally excluded — its 20-row cap is a deliberate autocomplete limit, not a list pagination pattern; remaining 12 copies are in other modules outside this agent's scope
- [x] Delete the local copies as their last caller migrates — done for all sixteen in this lane's territory:
  `build/core/dto/project-core.schemas.ts` · `build/core/dto/projects-customers.schemas.ts` · `build/core/dto/projects-workspace-members.schemas.ts` · `build/core/dto/roadmap.schemas.ts` (3 schemas) · `build/execution/dto/timesheets.schemas.ts` (2) · `build/managed-products/dto/managed-products.schemas.ts` · `build/pm-workspaces/dto/pm-workspaces.schemas.ts` (2) · `build/portfolios/dto/portfolios.schemas.ts` · `build/teams/dto/teams.schemas.ts` (2) · `accounting/core/dto/accounting.schemas.ts` (4) · `accounting/gl/dto/general-ledger.schemas.ts` · `accounting/gl/recurring-journals.controller.ts` · `invoices/dto/invoice.schemas.ts` · `quotes/dto/quote.schemas.ts` · `crm/core/dto/campaigns.schemas.ts` · `crm/core/dto/organizations.schemas.ts` (2).
  Query-key spelling was preserved per endpoint — some publish `limit`, some `pageSize` — and each endpoint's own default page size (9, 20, 25, 50) was carried through as `pageSizeField(n)`. Renaming `pageSize` to `limit` would be a silent client-contract break and is recorded below as remaining rather than done quietly.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by the two acceptance criteria above.

### Judgement calls made during the migration

- **`campaignListSchema` capped at 50, not 100.** It was `.max(50)`; a plain migration to `pageSizeField(20)` would have doubled its ceiling. `pageSizeField` therefore takes an optional second argument and the endpoint keeps its own tighter ceiling: `pageSizeField(20, 50)`. Widening a cap is a capability change and is not what this ticket asked for.
- **`timeEntriesListQuerySchema.page`** was `optional()` with no default and its service reads `query.page ?? 1`; `pageNumberField` defaults to 1, which the `??` then leaves alone.
- **`listJournalQuerySchema`** carries a `.refine(from <= to)`; only the page fields were replaced.
- **`listProgramsQuerySchema`** (`portfolios.schemas.ts`) has no page or limit at all and was left alone.
- **`searchTicketsQuerySchema`** (`build/core/dto/ticket.schemas.ts:126`) keeps its own `max(20)`. It is an autocomplete cap, not list pagination.
- **`recurring-journals.controller.ts`** holds its list schema inline in the controller body, which violates §6 ("schemas live in `*-schema.ts`"). The page fields were migrated in place; extracting it to `dto/` would have meant creating a file outside the migration's remit. Recorded as remaining.

### Correction to this ticket's own audit note

The 2026-08-26 audit note says `ticket.schemas.ts` "still has four inline `page`/`limit` blocks (lines 33–34, 77–78, 126, 131)". That is stale. It extends `baseListQuerySchema` at `:33`, `:77` and `:131`; `:126` is `searchTicketsQuerySchema`'s deliberate autocomplete cap.

### Remaining local copies outside this lane's territory

178 occurrences across 119 files. Nothing is ticked for these.

- **hr** — 24 files, ~40 copies
- **inventory** — 17 files, ~35 copies
- **finance** — 14 files, 26 copies (`ar/dto/finance-ar.schemas.ts` alone has 6, `ap/dto/finance-ap.schemas.ts` 4)
- **payroll** — 4 files, 9 copies
- **timesheets** — 5 files, 5 copies
- **surveys** — 4 files, 4 copies
- **kb** — 3 files, 3 copies
- **users** — 1 file, 4 copies · **module-access** — 1 file, 3 copies
- **api-tokens · billing · rbac · webhooks · workflows · portal** — 2 files or 2 copies each
- **audit-log · automation · clients · contacts · delegations · e-sign · expenses · feedbucket · goals · leads · offer-fulfillment · organization · ownership · party · public · settings · storage · support · tasks** — 1 copy each

`common/pipes/zod-validation.pipe.spec.ts` also matches, but it is an inline fixture inside a test, not a list endpoint. Leave it.

Full per-file paths and counts are in `architecture-refactor/lane-requests/lane-3.md`.

---

**Audit note (2026-08-26):** The ticked items are confirmed. `backend/src/common/pagination/list-query.schema.ts` exports `baseListQuerySchema` (page clamped at 100 via `transform`) and `withSortField` factory — the shared schema exists. The build module's `ticket.schemas.ts` still has four inline `page`/`limit` blocks (lines 33–34, 77–78, 126, 131) without using `baseListQuerySchema`. The two open ACs are genuinely open: (1) "Sorting composes with the tenant-led indexes" cannot be verified without EXPLAIN ANALYZE as `streamline_app` with the tenant GUC set; (2) "The 16 duplicated local copies are deleted" — the build module alone has 4; remaining 12+ copies are in other modules outside this agent's scope and the build module's own copies are not yet migrated.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
