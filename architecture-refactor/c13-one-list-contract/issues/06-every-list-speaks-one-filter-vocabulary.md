# 06 — Every list speaks one filter and sort vocabulary

**What to build:** Knowing how to filter and sort one list teaches you every other list. Page size, cursor, sort field, sort direction and filters are parsed and validated in one shared shape.

**Blocked by:** 05 — Scrolled lists page by cursor

**Status:** in-progress

## Acceptance criteria

- [x] One validated shape covers page size, cursor, sort field, sort direction and filters, living beside the feature per the schema convention. — `backend/src/common/pagination/list-query.schema.ts` now exports the shape *and* its parts: `PAGE_SIZE_CAP`, `pageNumberField`, `pageSizeField(defaultSize, maxSize?)`, with `baseListQuerySchema` rebuilt on top of them, so page and page size have exactly one definition. The cursor half is `backend/src/common/pagination/cursor.schema.ts` (`idCursorSchema`), added by c13-05.
- [x] Sort fields are an allowlist per endpoint — an arbitrary sort column is refused. — `withSortField(allowlist)`, covered by `list-query.schema.spec.ts`.
- [x] A page size above the cap is clamped rather than honoured or rejected. — `pageSizeField`'s `.transform(v => Math.min(v, ceiling))`, and true at every call site in this territory: `backend/src/common/pagination/list-query.schema.spec.ts:177-200` (22 page-numbered schemas) and `:279-287` (the seven cursor and size-only ones S4 migrated). 154 tests, all pass.
- [ ] Sorting composes with the tenant-led indexes rather than falling off them. — **BLOCKED on a credential, not on scope.** The Neon branch is alive: `DATABASE_URL` (`neondb_owner`) connects. `APP_DATABASE_URL` fails `28P01 password authentication failed for user 'streamline_app'` (probed 2026-08-27), and the owner has `BYPASSRLS`, so its plans hide exactly the effect being tested. Fix the password in the Neon console — `ALTER ROLE` does not survive a branch suspend — then `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set. Recorded in `architecture-refactor/lane-requests/s4.md` §1.
- [ ] The 16 duplicated local copies of the pagination schema are deleted. — **The count is wrong and the criterion cannot be met as written.** Re-verified 2026-08-27, and it is larger again than the last count: hand-rolled `z.coerce.number()` page fields number **411 across 141 files** (`page` 177 · `limit` 183 · `pageSize` 51 · `perPage` 0). **Zero remain in this territory** — the previous lane migrated sixteen page-numbered schemas, S4 migrated the seven that were left, all of them size-only or cursor lists the `page:` pattern never matched. The other 141 files are in modules this session may not edit; they are listed by path in `architecture-refactor/lane-requests/s4.md` §4 and nothing is ticked for them.

## Todo

- [x] Add the shared schema beside the existing runtime helper — `backend/src/common/pagination/list-query.schema.ts` exports `baseListQuerySchema` and `withSortField(allowlist)` factory; page size is clamped, not rejected
- [x] Migrate the hand-rolled offset callers to the capped helper — `ticketsListQuerySchema` (lines 33–34), `allWorkQuerySchema` (lines 77–78) and `ticketActivityQuerySchema` (line 131) in `backend/src/modules/build/core/dto/ticket.schemas.ts` now extend `baseListQuerySchema`; `searchTicketsQuerySchema` (line 126) is intentionally excluded — its 20-row cap is a deliberate autocomplete limit, not a list pagination pattern; remaining 12 copies are in other modules outside this agent's scope
- [x] Delete the local copies as their last caller migrates — done for all sixteen in this lane's territory:
  `build/core/dto/project-core.schemas.ts` · `build/core/dto/projects-customers.schemas.ts` · `build/core/dto/projects-workspace-members.schemas.ts` · `build/core/dto/roadmap.schemas.ts` (3 schemas) · `build/execution/dto/timesheets.schemas.ts` (2) · `build/managed-products/dto/managed-products.schemas.ts` · `build/pm-workspaces/dto/pm-workspaces.schemas.ts` (2) · `build/portfolios/dto/portfolios.schemas.ts` · `build/teams/dto/teams.schemas.ts` (2) · `accounting/core/dto/accounting.schemas.ts` (4) · `accounting/gl/dto/general-ledger.schemas.ts` · `accounting/gl/recurring-journals.controller.ts` · `invoices/dto/invoice.schemas.ts` · `quotes/dto/quote.schemas.ts` · `crm/core/dto/campaigns.schemas.ts` · `crm/core/dto/organizations.schemas.ts` (2).
  Query-key spelling was preserved per endpoint — some publish `limit`, some `pageSize` — and each endpoint's own default page size (9, 20, 25, 50) was carried through as `pageSizeField(n)`. Renaming `pageSize` to `limit` would be a silent client-contract break and is recorded below as remaining rather than done quietly.
- [x] Migrate the seven that the `page:` search never found — the size-only and cursor lists, where the page-size half of the vocabulary is the same shape and the clamp rule applies identically. Each answered **400** for an over-large page before this:
  `build/core/dto/ticket.schemas.ts:127` (`searchTicketsQuerySchema` → `pageSizeField(10, 20)`) · `build/execution/dto/workspace.schemas.ts:37` (`intakeListQuerySchema` → `pageSizeField(50)`) · `crm/core/dto/territories.schemas.ts:17` (`territoryListSchema` → `pageSizeField(50)`) · `chat/dto/chat.schemas.ts:101` (`listMessagesQuerySchema` → `pageSizeField(50)`) and `:111` (`searchQuerySchema` → `pageSizeField(20)`) · `mail/dto/mail-schemas.ts:18` (`pageSizeField(25, 50)`) · `search/dto/search.schemas.ts:7` (`pageSizeField(5, 10)`).
  No ceiling widened: each endpoint's own tighter cap is carried by `pageSizeField`'s second argument. Covered by `backend/src/common/pagination/list-query.schema.spec.ts:279-317`, 35 tests over the seven.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by the two acceptance criteria above.

### Judgement calls made during the migration

- **`campaignListSchema` capped at 50, not 100.** It was `.max(50)`; a plain migration to `pageSizeField(20)` would have doubled its ceiling. `pageSizeField` therefore takes an optional second argument and the endpoint keeps its own tighter ceiling: `pageSizeField(20, 50)`. Widening a cap is a capability change and is not what this ticket asked for.
- **`timeEntriesListQuerySchema.page`** was `optional()` with no default and its service reads `query.page ?? 1`; `pageNumberField` defaults to 1, which the `??` then leaves alone.
- **`listJournalQuerySchema`** carries a `.refine(from <= to)`; only the page fields were replaced.
- **`listProgramsQuerySchema`** (`portfolios.schemas.ts`) has no page or limit at all and was left alone.
- **`searchTicketsQuerySchema`** (`build/core/dto/ticket.schemas.ts:126`) keeps its own `max(20)`. It is an autocomplete cap, not list pagination.
  **Overridden by S4, 2026-08-27.** The stated reason for excluding it was the 20-row cap, and `pageSizeField(10, 20)` preserves that cap exactly — the second argument exists for this. What the exclusion left in place was the *other* half: `?limit=50` returned 400 on an endpoint the contract says must clamp. Migrated, ceiling unchanged.
- **`recurring-journals.controller.ts`** holds its list schema inline in the controller body, which violates §6 ("schemas live in `*-schema.ts`"). The page fields were migrated in place; extracting it to `dto/` would have meant creating a file outside the migration's remit. Recorded as remaining.

### Correction to this ticket's own audit note

The 2026-08-26 audit note says `ticket.schemas.ts` "still has four inline `page`/`limit` blocks (lines 33–34, 77–78, 126, 131)". That is stale. It extends `baseListQuerySchema` at `:33`, `:77` and `:131`; the fourth is `searchTicketsQuerySchema`, now `pageSizeField(10, 20)` at `:127`. The file holds no hand-rolled page field.

### Remaining local copies outside this territory

**411 fields across 141 files** (re-counted 2026-08-27; the 2026-08-26 figure of 204/135 counted `page:` alone and undercounted even that). Nothing is ticked for these.

By module, files: **hr** 45 · **inventory** 18 · **finance** 14 · **timesheets** 6 · **surveys** 4 · **payroll** 4 · **notifications** 3 · **kb** 3 · **rbac · party · organization · leads · contacts · billing · api-tokens** 2 each · 29 modules with 1 each.

`common/pipes/zod-validation.pipe.spec.ts` also matches, but it is an inline fixture inside a test, not a list endpoint. Leave it.

Every path with its count is in `architecture-refactor/lane-requests/s4.md` §4, with the grep that regenerates it.

### The one field in this territory that was deliberately not migrated

`intakeListQuerySchema.offset` (`build/execution/dto/workspace.schemas.ts:38`). The shared vocabulary pages by `page`, not `offset`; rewriting the field would be a silent client-contract break, and `offset` is not one of the five things this criterion names (page size, cursor, sort field, sort direction, filters). Its `limit` is migrated; the `offset` stays and is recorded rather than changed quietly.

---

**Audit note (2026-08-26):** The ticked items are confirmed. `backend/src/common/pagination/list-query.schema.ts` exports `baseListQuerySchema` (page clamped at 100 via `transform`) and `withSortField` factory — the shared schema exists. The build module's `ticket.schemas.ts` still has four inline `page`/`limit` blocks (lines 33–34, 77–78, 126, 131) without using `baseListQuerySchema`. The two open ACs are genuinely open: (1) "Sorting composes with the tenant-led indexes" cannot be verified without EXPLAIN ANALYZE as `streamline_app` with the tenant GUC set; (2) "The 16 duplicated local copies are deleted" — the build module alone has 4; remaining 12+ copies are in other modules outside this agent's scope and the build module's own copies are not yet migrated.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
