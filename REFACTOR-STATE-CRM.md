# REFACTOR-STATE — CRM

**Module:** CRM (design alignment · completion · AI layer)
**Phase:** 0 + 1 delivered → **first fix batch landed**
**Updated:** 2026-08-11

## Closed this session

| ID | What | Verified |
|---|---|---|
| **SEC-002** | `snoozeTask`/`completeTask` now take `scope: DataScope` and build their WHERE from `applyScope(..., { ownerColumn: tasks.assigneeId })` — used for the SELECT **and** the UPDATE, so `own` scope can no longer mutate another user's task. Controller passes the scope; the repeated `rbacScope` cast replaced by one `readScope(req)` helper, removing 2 existing casts as well. 2 new scope specs added | BE tsc 0 |
| **PERM-004** | The 11 ungrantable keys added to `frontend/lib/rbac/permissions/crm.ts` — `crm:deals:{read,update,delete,approve,forecast,manage}` and `crm:quotes:{read,create,update,delete,approve}`, descriptions mirrored verbatim from the backend catalog. The role editor can now grant them | FE tsc 0 |
| **NAV-001** | 5 sidebar entries repointed at the keys their endpoints actually enforce, each verified against the controller: contacts → `crm:contacts:view` (`contacts.controller.ts:49`), companies → `crm:organizations:view` (`:51`), quotes → `crm:quotes:read` (`:49`), deals → `crm:deals:read` (`deals.controller.ts:54`), tasks → `tasks:read` | FE tsc 0 |
| **TXN-001/002** | Both pricebook default-flag paths wrapped in `runInTenantTransaction`, so insert/update + "unset other defaults" can no longer tear | BE tsc 0 |
| **SEC-001** | Unreachable `ForbiddenException` deleted from `crm-org-merge.service.ts` along with its now-unused import | BE tsc 0 |
| **DSV-005** | **Every CRM query is now permission-gated** — 13 hook files + `crm-settings.ts`, each `useCan(...)` called at hook top level and combined with any pre-existing condition. Verified: **zero** `enabled:` declared after an `...options` spread (the clobber trap), and all 9 non-obvious keys re-checked to be both enforced by a backend decorator and present in the backend catalog (`sales:view`, `crm:customer360:view`, `crm:data-quality:view`, `settings:custom-fields:manage`, `crm:products:manage`, `crm:pricebooks:manage`, `crm:automations:manage`, `crm:sequences:manage`, `dashboard:support:view`). `usePublicNpsSurvey` correctly skipped — public endpoint, no `@RequirePermission` | FE tsc 0 |
| **BRK-003** | Contacts Export wired to the real `GET /contacts/export` via a new `useExportContacts` + `downloadBlob`; button is `<LoadingButton isPending>`, gated on the endpoint's key, errors through `getErrorMessage` | FE tsc 0 |

### Batch 2

| ID | What | Verified |
|---|---|---|
| **TXN-003** | The audit helper in `crm-metadata.service.ts` now delegates to `audit.logCritical` (injected; `AuditModule` is `@Global`), and **all 9** call sites — the audit said 8 — changed from `void this.auditLog(...)` to `await`. Awaited inside the live request transaction means the audit row commits atomically with the change and a failure surfaces, instead of dying `42501` on a dead handle. Unused `auditLogs` schema import removed. Deliberately chose `logCritical` over `log()`: `log()` is also fire-and-forget, so it shares the same race | BE 0 errors in my files |
| **AI-001** | `resolveSurface` default flipped from `"sheet"` to `"popover"`, so all 40 previously-inheriting call sites now render short AI reads in an anchored popover (which becomes a Drawer under `md` via `ResponsivePopover`). Genuine multi-field drafts keep the larger surface explicitly: `surface: "sheet"` set on the three `email-draft` actions and `meeting-followup` | FE 0 errors |

### Batch 3

| ID | What | Verified |
|---|---|---|
| **QUERY-001** | Support dashboard no longer loads **every** company with its `csm` relation to slice in memory. Split into two bounded, projected queries — key accounts (`ORDER BY revenue DESC LIMIT 5`, `columns` projection, `csm: { columns: { name: true } }`) and renewals (`WHERE renewalDate IS NOT NULL ORDER BY renewalDate ASC LIMIT 6`). The two aggregates that genuinely needed all rows became aggregates: `totalClients` now sums the existing `healthAggs` group-by (**free — no new query**), and `newClients` is a `count()` with `inArray(customerSince, …)`. All four outputs are semantically identical to before | BE 0 errors in my files |
| **QUERY-002** | `getWithContacts` ran two **sequential** queries; now one `Promise.all`, with `.limit(1)` on the org row and a 100-row cap on contacts (§19). Column projection deliberately **deferred** — the consumer shape isn't verified and dropping a field the UI reads would not be caught by tsc across the API boundary | BE 0 errors in my files |
| **QUERY-005** | `wouldCreateCycle` and `getAllDescendantIds` each fetched **every** org row to walk the tree in memory on every parent change. Both are now single `WITH RECURSIVE` CTEs (ancestors / descendants) with a `HIERARCHY_MAX_DEPTH` guard so pre-existing bad data can't spin. Raw rows converted at the use site per §7 (`Number(row.id)`) | BE 0 errors in my files |
| **BRK-001/002** | Dead surfaces **deleted**: `deal-orders-section.tsx` (4 nonexistent endpoints) and `lead-attachments-section.tsx` (3 nonexistent endpoints), plus their imports, the orphaned `Card` wrapper on the lead page, and the now-unused `Card`/`CardContent` imports. Non-use proven per §25 before deleting — component name, file basename, barrel re-export, bare side-effect import and dynamic `import(` all searched; 2 references each, both the expected call site | FE tsc 0 |
| **BRK-004** | "Download PDF" menu item and its `toast.info` stub removed from `deal-quotes-section.tsx`; the rest of the section is real and untouched | FE tsc 0 |

### Batch 5

| ID | What | Verified |
|---|---|---|
| **DSV-007** | 9 shell card surfaces corrected. For the 5 `<Card>` sites the fix was **deleting** the redundant `bg-card rounded-lg border border-border` override — the primitive already supplies `rounded-xl` and `bg-card`, so this removes code rather than adding it. The 4 `<div>` surfaces went `rounded-lg` → `rounded-xl`. **Deliberately left `rounded-lg`:** dashed-border dropzones, `bg-muted/*` inner rows and chips, the kanban drop area, and timeline row wrappers — §7 keeps `rounded-lg`/`rounded-md` for inner elements; only card surfaces are `rounded-xl` | FE tsc 0 |
| **DSV-008** | The 4 filter-bar selects in `tasks-toolbar.tsx` returned to the h-9/text-sm canon (overrides removed from triggers **and** items). **Most of this finding was not a violation:** the `h-6 text-[10px]` selects in `lead-columns.tsx`, `deal-table-view.tsx`, `lead-table-view.tsx` and `stage-card.tsx` are in-cell inline editors and a page-size selector, which §6 *explicitly sanctions* ("the only sanctioned compact controls are established inline-cell/popover editors inside tables and cards"). Changing them would have broken table density | FE tsc 0 |
| **DSV-011** | **Deliberately not done.** All 7 sites are inside **Sheets**, not page bodies — `lead-detail-sheet.tsx` uses `mt-5`/`mt-4` spacing inside a sheet that owns its own scroll area, and `sequence-sheet.tsx` already hand-writes the fill intent. §15's rule targets `TabsContent` that fills a *page body*, so it doesn't cleanly apply, and altering flex behaviour without visual verification risks layout regressions for zero user-visible gain. Recorded rather than guessed | — |
| **DSV-006** | **26 inline Zod schemas extracted** to sibling `*-schema.ts` files (CRM now has 27), each exporting the schema plus its `z.infer` type; multi-schema files (`assignment-rule-sheet`, `field-row`, `pricebook-*`) got all their schemas in one sibling. Re-exports preserved on 8 components whose types are consumed by `app/` route files, so no route needed touching. **Verified: exactly 1 inline `z.object` remains** — `deals/detail/log-activity-dialog.tsx:16`, a single-field `{ notes: z.string().min(1) }`, which §7 explicitly exempts as a trivial guard | FE tsc **0** |

### Batch 4

| ID | What | Verified |
|---|---|---|
| **BRK-006..009** | The four pages that conflated API failure with absence now have a real error branch **before** the not-found branch — `<ErrorState description={getErrorMessage(error)} onRetry={refetch} className="flex-1" />` on deals/forecast, deal detail, contact detail and company detail. A network failure no longer reads as "not found" | FE 0 errors |
| **DSV-003** | 11 async buttons converted to `<LoadingButton isPending>` across 9 files, preserving variant/size/icons and any additional disabled conditions, with `loadingText` where the original swapped its label | FE 0 errors |

#### Correction — DSV-003 was over-counted (22 → 11)

The design lane reported ~22 violations. **11 are real.** The other 17 are correctly *not* violations, and the
distinction is the one the audit missed: `disabled={mutation.isPending}` on a control that does not itself trigger
the mutation is a **UX guard**, not a missing pending indicator. Skipped for good reasons: Radix
`AlertDialogAction` (swapping it changes dialog close semantics) · icon-only buttons with no text for a spinner to
replace, where a swap would break a fixed `h-5 w-5`/`h-7` layout · `Checkbox` and `Switch`, which aren't buttons ·
and **Cancel buttons**, which are disabled during a mutation purely to stop the user dismissing mid-flight.

This is the same over-counting pattern as DSV-002 (19 → 8): a lane pattern-matches the shape and can't judge
whether the control is an async trigger. Treat every design-lane count as an upper bound.

A deleted surface is recoverable from git if the product wants Orders or Attachments built properly — what was
removed is UI that 404s silently, which is worse for the user than the feature being absent (§0.9, §16).

**Verification:** backend `tsc --noEmit` (8GB heap) and frontend `tsc --noEmit` both exit 0, exit codes read
directly. Three backend errors remain in `ai-action-copilot.spec.ts` and `payroll/filings/__tests__/export-builders.spec.ts`
— proven **not mine** (neither file is in my 8-file backend change set). Lint and tests NOT run (not requested).

### New finding from the fix pass

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **NAV-002** | **`/crm/tasks` is gated on the Build module, and `crm:tasks:view` is enforced nowhere.** The page reads `GET /tasks` (`hooks/api/crm/crm-activities.ts:70`), whose controller is `@RequireModule("build")` + `@RequirePermission("tasks:read")` (`tasks/tasks.controller.ts:44,51`). So a CRM-only org gets 403 on its own Tasks page, and `crm:tasks:view` — present in **both** catalogs — guards nothing. Same cross-module class as Administration's ADM-001 and ADSEC-F04. The sidebar now uses `tasks:read` so nav parity holds; **whether CRM Tasks should belong to Build is a product decision left open** | `tasks/tasks.controller.ts:44,51`; `crm-activities.ts:70` | **P1** |

> One tracker per concurrent program; do not merge them.
> `REFACTOR-STATE.md` = Build refactor (live). `REFACTOR-STATE-CRM.md` = this. `REFACTOR-STATE-ADMIN.md` = Administration.
>
> **Finding-ID namespaces are global** — two programs must never reuse a prefix. Build owns `SCH/PERF/SEC/API/TIME/RPT/UI`.
> This program owns `DS` (design contract, in `UI-UX-SYSTEM.md` §17), `BRK`, `DSV`, `GAP`, `AI`, and CRM `SCH`/`API`/`SEC`
> qualified as `CRM-*` when quoted next to Build's. Administration owns `ADM/ADS/ADSEC/ADGAP/ADUX`.
> The design-contract IDs were renamed `UI-00x` → `DS-00x` on 2026-08-10 after Build claimed `UI-001`/`UI-002`.

---

## Decisions taken

| ID | Decision | Rationale |
|---|---|---|
| D-01 | **No `UI-CONTRACT.md`.** The contract is `UI-UX-SYSTEM.md` §12–§17 | It was already canonical (CLAUDE.md §14) and covered ~80% of the Phase 0 checklist. Two design docs drift — the exact failure CLAUDE.md §9 names for permission catalogs |
| D-02 | Extract from **Build + Accounting + Inventory** | Ink-first and recently worked. **HR excluded** — its gradient hero and tone tiles are a deliberate exception (CLAUDE.md §14), so a contract extracted from it would be wrong for CRM |
| D-03 | **No `CLAUDE.md` AI amendment** — the program doc's premise was false | CLAUDE.md never says AI is out of scope; it *mandates* AI at `:177`, `:193`, `:274`, `:276`, `:370`. `backend/src/modules/ai/**`, `/crm/settings/ai`, and `crm:ai:use` already exist. A scoped "exception" would contradict five broader rules in force |
| D-04 | Queued work **extends the existing outbox**, not BullMQ and not a new jobs table | `common/outbox/` already provides `outbox-writer.ts` (in-transaction write), `outbox-publisher.service.ts`, `outbox-flush.controller.ts`, `inbox-consumer.ts` over `outbox_events` + `inbox_records` (`schema/common/outbox.ts:29,87`), drained by `cron`. BullMQ would need 2 new deps + a TCP Redis (`@upstash/redis` is HTTP REST). Reuse before create (§0.2) |
| D-05 | Phase 7 AI may send tenant CRM data to **Google Gemini** via the existing gateway | `@ai-sdk/google` installed; reuse `ai/core/gateway` with token metering, per-tenant ceilings, tenant-scoped retrieval (§20/§23). **Open:** confirm zero-retention terms |
| D-06 | Repo conventions override the program document where they conflict (§29.4) | See Overrides |

## Overrides applied to the program document

| Program doc says | Actual rule | Evidence |
|---|---|---|
| `tenant_id` everywhere | **`org_id`** | 0 `tenantId` hits in `schema/crm/`; 340 `orgId` |
| Money as `numeric` | **Integer cents** per CLAUDE.md §19 — but ⚠️ **the CRM already violates this almost everywhere** (SCH-006): every money column is `decimal(15,2)`/`decimal(18,4)` except `crm_pricebook_entries.unit_price_cents`. So this is not "the doc is wrong", it is "the doc matches the CRM's current non-conformant state". CLAUDE.md still governs the target | CLAUDE.md §19; `pricebooks.ts:29` is the lone correct column |
| "`AccessService` (module-level RBAC)" | `@RequirePermission` + `PermissionGuard` + `DataScope` | CLAUDE.md §21 |
| Produce `UI-CONTRACT.md` | Extend `UI-UX-SYSTEM.md` | D-01 |
| Add BullMQ for queued jobs | Extend `common/outbox/` | D-04 |

## Environment (verified, not assumed)

| Field | Value |
|---|---|
| Backend | `backend/src/modules/crm/{core,inbox,metadata,pricebooks,automation-studio}` — 89 files, 12,034 LOC |
| Frontend | `frontend/app/(authenticated)/crm/**` — 53 pages · `features/crm/**` — 16 sub-dirs |
| Schema | `backend/src/db/schema/crm/` — 17 files, **66 tables** |
| Redis | `@upstash/redis@^1.37.0` (HTTP REST — cannot back BullMQ) |
| Queue | No BullMQ. Custom outbox at `common/outbox/`, flushed by `cron` |
| Real-time | **Ably** |
| LLM | `@ai-sdk/google` + `ai@^7` + `@langchain/openai`; `ai/core/llm-provider.config.ts`. No Anthropic SDK |
| AI budget | Token-metered milli-credit ledger + `/settings/billing/ai-credits`, already live |
| RLS | **Live.** App connects as `streamline_app` (no BYPASSRLS); tenant GUC `app.organization_id`; policy `org_id = app.current_org_id()` |
| Tests | 395 backend `.spec.ts`, 6 e2e, 56 frontend. No coverage gate |
| Email/calendar sync | Unverified — Phase 1. Third-party connectivity is Composio-only (§6) |

---

## Phase 0 — complete

**Deliverable:** `UI-UX-SYSTEM.md` v2.0 — 6 new sections, 9 corrections.

Added: §12 Overlay Decision Tree · §13 Forms and Errors · §14 Data Layer · §15 Structure and Naming ·
§16 Component Import Index · §17 Conflicts and Decisions.

Corrected — each a place where v1.0 described behaviour the code does not have: §4 table density ·
§4 page chrome · §5 `PageWrapper` props · §5 divider claim · §7 Cards · §7 `DataTable` props/layout/pagination.

### Closed

| ID | Finding | Resolution |
|---|---|---|
| DS-001 | Card radius `rounded-lg` vs `rounded-xl` | `rounded-xl` (`card.tsx:10`, CLAUDE.md §14, 135 vs 81 files) |
| DS-002 | Card border full-opacity vs `/70` | ≥70% allowed |
| DS-003 | Three competing card shadows | `shadow-sm` panels · `shadow-noir` in `<Card>` · `soft`/`medium` deprecated (1 file each) |
| DS-004 | `DataTable` `search`/`toolbar` claimed removed, still present (`data-table.tsx:81-88`) | Convention, enforced in review — not a compile error |
| DS-005 | `PageWrapper` props wrong: 2 fictional (`eyebrow`, `filtersCollapseBreakpoint`), 7 real ones missing, `title` optional | Rewritten verbatim from source |
| DS-006 | Page inset missing `lg:px-8` | Use `PAGE_CHROME_X` |
| DS-007 | Two pagination components conflated | `DataTablePagination` internal · `TablePagination` for non-`DataTable` surfaces |
| DS-008 | Fictional `PageWrapper` hairline divider | Claim removed |
| DS-009 | Table density `h-8`/`px-2 py-1`/`text-[11px]` not implemented | `h-10` / `px-2 py-2` / `text-sm` (`table.tsx:79`, `data-table.tsx:360`) |

### Open

| ID | Item | Owner |
|---|---|---|
| OPEN-01 | Confirm Google zero-retention terms before Phase 7 | User |
| OPEN-02 | 215 `.tsx` files hold inline `z.object({` vs 83 proper `*-schema.ts` — platform-wide §7 drift. CRM's share is a Phase 1 finding | Phase 1 |
| OPEN-03 | Email/calendar sync availability unverified | Phase 1 |

---

## Phase 1 — CRM audit 🔄 in progress

Running as five parallel read-only audits: object model (`SCH`), broken surfaces (`BRK`),
design-contract conformance (`DSV`), API/RBAC/tenancy (`API`/`SEC`), capability gaps + AI map (`GAP`/`AI`).

### SIG-01 — RESOLVED ✅

The duplication is real, and one family is **legacy read-only**. Canonical entities (HIGH confidence — each has a full CRUD service + controller):

| Entity | Canonical | Legacy | Legacy status |
|---|---|---|---|
| Person | **`contacts`** `contacts.ts:112` | `crm_people` `analytics.ts:10` | Read-only, dashboards only — no user-facing INSERT |
| Company / Account | **`crm_organizations`** `contacts.ts:87` | `crm_companies` `analytics.ts:30` | Read-only, one dashboard read (`crm-people.service.ts:119`) |
| Deal / Opportunity | **`deals`** `deals.ts:36` | `crm_deals` `analytics.ts:45` | Read-only, 4 dashboard/analytics services |
| Lead | **`leads`** `leads.ts:10` | `crm_leads` `campaigns.ts:29` | **Fully dead** — symbol never imported anywhere |
| Quote | **`quotes`** `invoicing.ts:161` | — | — |
| Campaign | **`crm_campaigns`** `campaigns.ts:6` | — | — |

**The consequence is worse than duplication.** The CRM dashboards compute their numbers from the legacy
hand-seeded tables, not from real transaction data (`crm-sales-dashboard.service.ts:3-4`,
`sales-analytics.service.ts:3`, `sales-dashboard.service.ts:3`). `sales-analytics.service.ts` imports **both** —
deal-cycle length from real `deals`, rep comparison from legacy `crm_deals`. See SCH-002.

### Pre-audit signals (remaining)

**SIG-02 — "Largely non-functional" is contradicted by the repo's own record.** `PAGES.md:279-287` marks all
53 CRM routes `[x]`, including a completed "Sales/CRM conformance program (34 pages, 95 files)" and a
"CRM metadata-first program" (migrations 0251–0255, hardcoded stage constants deleted). Phase 1 must establish
what is *actually* broken with `file:line` evidence rather than inherit the premise.

**SIG-03 — RESOLVED ✅ no drift.** Build's SCH-009 class (pgEnum declared, live column still `text`) does **not**
occur in CRM. All 8 CRM enums are created in migration `0000_light_vance_astro.sql:18-26`. `leads.status` and
`deals.stage` are `text` *deliberately* — they are driven by configurable `crm_options` / `crm_pipeline_stages`.

---

## Phase 1 findings — schema lane

| ID | Table / Column | Evidence | Problem | Severity | Migration risk |
|---|---|---|---|---|---|
| **SCH-002** | `crm_people`/`crm_companies`/`crm_deals` `analytics.ts` | `crm-sales-dashboard.service.ts:3-4` · `sales-analytics.service.ts:3` · `sales-dashboard.service.ts:3` · `crm-people.service.ts:4` | **Dashboards read a stale hand-seeded legacy roster instead of real data.** `crm_deals.salesRepId → crm_people.id`, so there is no join path from a dashboard rep to a real user | **P0 — product correctness** | HIGH: 6 tables FK to `crm_people.id` |
| **SCH-006** | Every CRM money column | `contacts.ts:23,53,58,148` · `deals.ts:50,189,430,486,490,495` · `invoicing.ts:22-26,170-174` · `campaigns.ts:17-19` | All money is `decimal(15,2)`/`decimal(18,4)`, **not integer cents** (CLAUDE.md §19). `crm_pricebook_entries.unit_price_cents` (`pricebooks.ts:29`) is the only conformant column. Two different precisions coexist (2dp vs 4dp) | **P1** | HIGH — pervasive |
| **SCH-010** | `territory_reps.crm_person_id` `deals.ts:639` | `.references(() => crmPeople.id)` | Territory rep assignment FKs to the **legacy** table, so territories cannot reference real org members. Territory features are live (`crm-territories.controller.ts`) | **P1 — feature broken** | HIGH — backfill |
| **SCH-005/011** | `crm_contact_roles.entity_type + entity_id` `contact-roles.ts:13-14` | `text` + `integer`, no FK | Banned polymorphic pair (§19). No referential integrity, no `ON DELETE` — deleting a deal/lead leaves dangling rows. Table is LIVE (`contact-roles.service.ts:3`) | **P1** | HIGH — backfill splits rows by type |
| **SCH-012** | `deals`/`quotes` currency | `invoicing.ts:47` has `invoices.exchange_rate`; `deals`/`quotes` have none | Multi-currency deals store `currency` with **no FX-rate snapshot**, so commission/quota maths silently re-values after a rate move | **P1** | MEDIUM |
| **SCH-001** | `crm_leads` `campaigns.ts:29` | Symbol never imported by any service; `plan-limits.service.ts:173` counts `leads` | Fully dead table + `crm_lead_status` enum. The billing key string `"crmLeads"` counts `leads`, not this table | P2 | LOW — ⚠️ deletion needs knip + `nest build` proof per §25 before removal |
| **SCH-003** | `crm_activities` `analytics.ts:60` | Sole write path `tasks.service.ts:216`; read `crm-sales-dashboard.service.ts:181` | Task-completion activities land in the dead-end analytics table (`personId → crm_people.id`) instead of `lead_activities`/`deal_activities`. No user-facing surface renders them | P2 | LOW after SCH-002 |
| **SCH-004** | `contacts.deal_id` `contacts.ts:127` | Migration `0000:5934` — bare `integer`, no `.references()`, no reader | Orphan column with no FK and no query using it. The real relationship is `crm_deal_stakeholders` | P3 | LOW |
| **SCH-008** | `crm_sla_policies` `analytics.ts:136` | `crm-sla.service.ts`, `sla-resolver.service.ts` active | **Live** table sitting in the "legacy" file, with `crm_sla_breach_log` (`deals.ts:686`) FK-ing across files. §9 placement violation, misleads every future reader | P3 | LOW — move only |

**Capability absences confirmed (feed the Phase 2 gap matrix):** no enrichment provenance (no per-field source or
timestamp anywhere) · **no consent or suppression fields at all** · no dedicated stage-history table (transitions
inferred from `deal_activities.previousValue/newValue` text) · custom fields are stringly-typed `jsonb custom_data`
(`leads.ts:42`, `deals.ts:73`) · lead conversion is **not reversible** (`lead-status.service.ts:96,115`) ·
contact→account is a **single FK** (`contacts.ts:121`), not many-to-many · account-hierarchy cycle prevention is
**application-level only** (`crm-organizations.service.ts:194` walks the chain in memory; no DB constraint).

**Lead merge is sound** — `leads-ops.service.ts:137` soft-deletes the loser, sets `mergedIntoId` so old IDs still
resolve, and re-parents activities/notes/tasks/emails in one transaction. Not reversible, but non-destructive.

### Open questions from this lane

| ID | Question | Why it needs an answer |
|---|---|---|
| OPEN-04 | Do `crm_people`/`crm_companies`/`crm_deals` hold real tenant rows or only seed data? Needs DB access | Decides whether SCH-002 is a migration or a deletion |
| ~~OPEN-05~~ | ~~Is a contact-merge endpoint wired?~~ **CLOSED — yes.** `modules/contacts/contact-roles.controller.ts:47-54`, `@Post("merge")` + `@RequirePermission("crm:contacts:merge")` → `contact-roles.service.ts:206` sets `deletedAt` + `mergedIntoId` | Merge is built, not a gap |

---

## Phase 1 findings — capability, AI and navigation lane

**SIG-02 answered: the CRM is NOT "largely non-functional."** 27 of 39 audited capabilities are fully present
with working UI and backend, including several that are differentiating: configurable pipeline stages
(`metadata.ts:28`), **immutable forecast snapshots** (`crm_forecast_snapshots`, `deals.ts:175`), sequences/cadences
(`automation-studio.ts:38`), territories with a matching service (`territory-match.service.ts`), assignment rules
with round-robin state, lead scoring, SLA with a breach log, and non-destructive merge for all three entities.
The real problems are narrower and sharper than "broken".

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **NAV-001** | **Sidebar nav-parity break.** Contacts, Companies, Quotes, Deals and Tasks are all gated on `crm:leads:view`, but the backend enforces entity-specific keys that all exist in the catalog (`crm:contacts:view`, `crm:organizations:view`, `crm:quotes:read`, `crm:deals:read`, `crm:tasks:view`). A user granted `crm:contacts:view` **without** `crm:leads:view` gets no Contacts nav entry — navigation fails before the backend is ever reached (CLAUDE.md §21) | `sidebar-nav-items.ts:1039,1045,1063,1069,1110` vs `rbac/permissions/crm.ts` (30 keys verified) | **P1** |
| **AI-001** | **Every short AI read opens a Sheet — platform-wide, not CRM-local.** `resolveSurface` ends `?? "sheet"`, so any action without an explicit `surface` and any caller without `defaultSurface` gets a write-heavy Sheet. **Only 1 of 41 `AiActionsMenu` call sites sets `defaultSurface`**, and `crm-inline-ai-menu.tsx` sets `surface` on **none** of its 12 actions. So "Lead summary", "Next best action", "Win-probability estimate", "Deal brief" and "Account brief" all open a Sheet to show a sentence or a number | `components/ai/ai-actions-menu.tsx:78`; `features/crm/shared/crm-inline-ai-menu.tsx:90-293` | **P1** |
| GAP-002 | Contact→Account is a single FK; no contact-to-many-accounts. Blocks the consultant / multi-subsidiary / champion-changed-jobs cases | `contacts.ts` `organizationId` single FK | P1 table-stakes |
| GAP-005 | **No CRM saved views.** The Support module already has `support_saved_views` (`support-workspace.ts:52`) — the pattern exists and was not applied to CRM | absence in `schema/crm/**` | P1 table-stakes |
| GAP-006 | No list inline editing — every edit opens the detail sheet. Build already solved this (`features/build/views/card-inline-fields.tsx`) | leads/deals list components | P1 table-stakes |
| GAP-025 | **No consent / suppression per channel anywhere.** Sequences can already send; there is no structural way to make a suppressed contact un-emailable | absence in `schema/crm/**` | P1 — legal risk once volume grows |
| GAP-009 | Stage-transition history is **partial, not present**: transitions are inferred from `deal_activities.previousValue`/`newValue` **text** columns (`deals.ts:68`), not a typed append-only stage log. Funnel/velocity metrics are therefore not reliably reproducible | `deals.ts:68` | P2 |
| GAP-013 | Multi-currency partial — `quotes.currency` exists with **no** `exchange_rate`; only `invoices.exchange_rate` (`invoicing.ts:47`) snapshots a rate. Same defect as SCH-012 | `invoicing.ts:161` vs `:47` | P2 |
| GAP-022 | Duplicate detection is a **manual page** (`/crm/leads/duplicates`), not a write-time check — the model (`useDuplicateSuggestions`, `crm-data-quality.service.ts`) already exists and simply is not fired on create | P2 |
| GAP-028 | Bulk ops partial — bulk AI scoring and lead distribution exist; no bulk status-update, reassign or delete from a list | P2 |
| GAP-035 | Inbound web-lead webhooks exist (`crm-web-forms.controller.ts`); **no outbound webhook subscriptions** | P2 |
| GAP-016 | `/crm/calendar` is just `redirect("/calendar")` — correct per the one-calendar rule, but CRM events are not yet wired as a calendar **source** | P3 |
| GAP-039 | No field-level visibility (deal amounts, margins) — defer to an enterprise tier | P3 |

### Refuted — do not re-raise

- **`crm:access:view` is NOT a ghost key.** It is *generated*, not literal: `rbac/permissions/module-access.ts:19-25`
  builds `${moduleKey}:access:view|manage` for all 10 modules in `ACCESS_MANAGED_MODULES`, which includes `crm`.
  A grep for the literal string in `crm.ts` finds nothing and looks like drift. This exact false positive has now
  been raised for `hr:`, `build:` and `crm:` — **grep for the generator before reporting an `:access:` key**.

## Phase 1 findings — broken-surface lane

**SIG-02 settled: 49 of 53 routes verified working end to end.** Leads, deals, contacts, companies, clients,
quotes, tasks, activities, campaigns, inbox, analytics, reports and every settings sub-page call real endpoints,
handle loading/error states, and support full CRUD. Four routes carry real defects.

| ID | Surface | Evidence | What is broken | Severity |
|---|---|---|---|---|
| **BRK-001** | `/crm/deals/[dealId]` Orders card | `deal-orders-section.tsx:77,88,100,112` — verified `deals/:dealId/orders` and `crm/orders` return **0 controller hits** repo-wide | Full CRUD UI calling **4 endpoints that do not exist**. Every operation 404s | **P1 feature dead** |
| **BRK-002** | `/crm/leads/[leadId]` Attachments | `lead-attachments-section.tsx:38,48,60` call `/leads/:leadId/attachments` ×3; verified **0** attachment route paths in `modules/leads/` (the only "attachment" match there is a CSV `Content-Disposition` header at `leads-reports.controller.ts:124`) | Upload, list and delete all 404 silently | **P1 feature dead** |
| **BRK-003** | `/crm/contacts` Export | `contacts/page.tsx:116-117` → `toast.info("Export not yet supported")`, while `contacts.controller.ts:78-86` has a **working** `@Get("export")` streaming CSV via `exportCsvChunks` | Button is wired to a stub even though the backend is done. **Free win — one hook** | **P1 dead control** |
| **BRK-004** | `/crm/deals/[dealId]` quote PDF | `deal-quotes-section.tsx:139-141` → `toast.info("PDF generation coming soon")`; no PDF generation anywhere in either repo | Dead menu item | **P1 dead control** |
| BRK-005 | `/crm/deals` assignee filter | `deals/page.tsx:88-90` (hook), `240-250` (client filter) | `useDeals({ stage })` never receives `assignedToId`, though the backend schema accepts it. The filter runs on the already-fetched array, so with the 100-row cap it silently drops deals never fetched | P2 |
| BRK-006/007/008/009 | forecast · deal detail · contact detail · company detail | `forecast/page.tsx` (no `isError`); `deals/[dealId]/page.tsx:70,285`; `contacts/[contactId]/page.tsx:67,89`; `companies/[companyId]/page.tsx:121,191` | Failure conflated with absence: an API error leaves `data` undefined and renders "not found" / "no open deals" instead of an error + retry. Network problems are invisible | P3 |

---

## Phase 1 findings — design-contract lane

~156 violations across ~50 files. One is systemic and dwarfs the rest.

| ID | Rule | Instances | Files | Severity |
|---|---|---|---|---|
| **DSV-005** | **§11 — no CRM query is permission-gated.** Verified: **0 `useCan` in all 21 files** under `hooks/api/crm/` plus `crm.ts` and `crm-settings.ts`; **0 call sites** pass `enabled: useCan(...)`; and only 8 files in `features/crm/` use `useCan` at all — every one of them to hide a control, never to gate a query. So every CRM query fires for any authenticated user regardless of permission or module entitlement: 403-spam on every page load and wasted Neon CPU. **This is the same defect class already fixed for HR (30 hooks).** | ~40 queries | all CRM hook files | **P1** |
| DSV-003 | §7 — `disabled={isPending}` on a raw `<Button>` instead of `<LoadingButton isPending>` | ~22 | ~18 | P2 |
| DSV-006 | §15 — inline `z.object({})` in `.tsx` instead of `*-schema.ts`. CRM is 32 of the ~215 platform-wide files (OPEN-02) | ~40 | 32 | P2 |
| DSV-002 | §15 — mutation `onError` handlers that discard the backend message (see the split below) | ~8 real | 6 | P2 |
| DSV-008 | DS-009/§4 — `text-[10px]`/`text-[11px]` overrides on `SelectTrigger`/`SelectItem` in filter rows | 15+ | 2 | P2 |
| DSV-007 | DS-001/§7 — `rounded-lg` on a shell card, must be `rounded-xl` | 8 | 7 | P3 |
| DSV-011 | §15 — `TabsContent` filling a body without `TABS_CONTENT_PAGE_BODY_CLASS` | 4 | 4 | P3 |
| DSV-004 | §14 — `useQuery`/`useMutation` defined inside component files with hand-typed key arrays (`lead-attachments-section.tsx:36-65`, `deal-orders-section.tsx:74-103`) | 5 hooks | 2 | P3 |
| DSV-001 | §13 — a hand-rolled 5-`useState` form with manual validation instead of RHF + zodResolver (`lead-followup-tab.tsx:98-102`) | 1 | 1 | P3 |
| DSV-010 | §12 — a 2-field submitting form inside a raw `Popover`; should be rung 3 (Dialog) (`contact-roles-card.tsx:97-104`) | 1 | 1 | P3 |

### Corrections I applied to this lane's report

- **DSV-002 was over-counted (19 → ~8).** `getErrorMessage` governs values of type `unknown` coming back from an
  API or mutation. It does **not** govern deliberate client-side product strings, so these are *not* §15 violations:
  the plan-gate messages in the six AI buttons (`"…requires the PROFESSIONAL plan"`) and the CSV format checks in
  `csv-upload-dialog.tsx` / `contacts-csv-import-dialog.tsx`. The genuine violations are mutation `onError`
  handlers that throw the backend message away — `toast.error("Failed to schedule follow-up")`
  (`lead-followup-tab.tsx:149,159`) and `toast.error("Failed to log activity")` (`lead-detail-sheet.tsx:134`).
  Separately, `contact-roles-card.tsx:145,164` interpolate `errors.x.message` directly instead of using
  `<FormMessage>` — real, but a §13 form-primitive issue, not an error-extraction one.
- **DSV-009 is not a token violation.** `style={{ background: stage.color }}` (`kanban-column.tsx:79`) renders a
  **tenant-configured** stage colour from the DB. AP-8 bans hardcoded hex and literal chrome, not data-driven
  colour. Keep the feature; the improvement is to pass it through a CSS custom property so dark mode can adjust it.

### Verified clean — do not re-raise

No `@phosphor-icons/react` · no `_components/`/`_lib/` under `app/` · no `rounded-2xl`/`rounded-3xl` on shell
surfaces · no brand gradients inside the shell · all stat surfaces use `StatCard`/`StatCardGrid` · no `backHref`
on a page that owns a sidebar entry · filter toolbars use `FILTER_TOOLBAR_ROW` with no outer card wrapper ·
`lead-table-view.tsx:199` has the correct `flex-1 min-h-0` fill chain.

---

## Phase 1 findings — API / RBAC / tenancy lane

**Guard coverage is excellent.** All ~119 CRM endpoints across 16 controllers carry `@RequirePermission` **and**
class-level `PermissionGuard`; there are no `@Public()` CRM routes, no inert decorators, and every single-record
read/write includes `eq(table.orgId, orgId)` so wrong-tenant ids return 404 not 403. Identity is taken from
`@CurrentUser()` everywhere — no endpoint accepts a client-supplied `orgId` or `userId`.

**The gap is DataScope: only 2 of ~119 endpoints apply it** (`GET /crm/inbox`, `GET /crm/inbox/counts`).

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **SEC-002** | **Declared-but-unenforced task scope — in-tenant privilege escalation.** `crm:tasks:update` is `scopable: true` and described as "Update, complete, and snooze CRM tasks", but neither mutation filters by assignee. `snoozeTask` even **selects `assigneeId` into `task` and then never uses it** in the `UPDATE ... WHERE`; `completeTask` doesn't select it at all. A user granted the key with DataScope `own` can snooze or complete **any task in the org** | `crm/inbox/crm-inbox.service.ts:471-499`; `rbac/permissions/crm.ts:311-315` | **P1** |
| **TXN-003** | **Audit records for every pipeline/stage/option change are silently lost.** 8 call sites do `void this.auditLog(...)` which runs a raw `this.db.insert(auditLogs)`. That is the known post-commit dead-handle bug (§20): the request transaction has committed and the connection is back in the pool, so the tenant GUC is gone and the insert dies `42501` — uncaught. Unlike the org-merge path it bypasses `AuditService`, which has the `withTenant` mitigation | `crm/metadata/crm-metadata.service.ts:52,61,69,82,94,105,141,150` | **P1** |
| **TXN-001/002** | `createPricebook` and `updatePricebook` each do insert/update **plus** an "unset other defaults" UPDATE as two separate calls with no `db.transaction`. A failure between them leaves the org with multiple default pricebooks | `crm/pricebooks/crm-pricebooks.service.ts:35-59,62-86` | **P1** |
| **QUERY-001** | Support dashboard loads **all** org companies with no `.limit()`, then slices in memory | `crm/core/crm-support-dashboard.service.ts:348-352,445-464` | **P1** |
| **QUERY-002** | `GET /crm/organizations/:id` → two **sequential** `SELECT *` queries, contacts **unbounded** | `crm/core/crm-organizations.service.ts:141-154` | **P1** |
| **PERM-004** | **Catalog drift (§9):** 11 keys exist in the backend catalog and in the frontend `types.ts` `PermissionKey` union, but are missing from frontend `lib/rbac/permissions/crm.ts` — `crm:deals:{read,update,delete,approve,forecast,manage}` and `crm:quotes:{read,create,update,delete,approve}`. `GET /rbac/permissions` reads the catalog file, so the role editor **cannot grant or revoke any of them** | frontend `lib/rbac/permissions/crm.ts` vs backend `crm.ts` | **P1 — ungrantable** |
| VAL-001 | Only 3 of 14 CRM DTO files use `.strict()`; the other 11 (campaign, organization, automation, product, SLA, territory, web-form) silently strip unknown fields instead of rejecting them (§18) | `crm/**/dto/*.ts` | P2 |
| CACHE-001 | `applyUpdate` and `remove` never `invalidateNamespace` the organizations list cache — `create` does. Stale list after every edit/delete until TTL | `crm/core/crm-organizations.service.ts:165-192` | P2 |
| CACHE-002 | `getAccountRollup` / `getAccountTimeline` caches are never invalidated by contact, deal or lead mutations | `crm/core/crm-organizations.service.ts:278-355` | P2 |
| QUERY-005 | `wouldCreateCycle` + `getAllDescendantIds` fetch **every** org row for in-memory traversal on each parent change — should be a recursive CTE | `crm/core/crm-organizations.service.ts:195-215` | P2 |
| QUERY-006 | Two `limit(500)` fetches for in-memory average-resolution-time maths, over the 100/page cap; replaceable with one SQL `AVG` | `crm/core/crm-support-dashboard.service.ts:109,380` | P2 |
| QUERY-003/004 | `getAllPeopleSlugs` and `getPersonBySlug` issue unbounded `findMany` calls | `crm/core/crm-people.service.ts:91-103,113-121` | P2 |
| PERM-001 | `permSet.has("build:view")` is a **two-segment** key (§21 wants three). No BUILD role template grants it, so the Customer-360 `projects` section is permanently invisible | `crm/core/crm-customer360.service.ts:52,95` | P2 |
| PERM-003 | `crm:incentives:config` uses action `config`, outside the canonical action vocabulary | `rbac/permissions/crm.ts:93` | P2 |
| SEC-001 | Dead `ForbiddenException` after the `NotFound` guards in org-merge — unreachable, but delete it so it can't become an existence oracle | `crm/core/crm-org-merge.service.ts:76-79` | P2 |

### Verified correct — do not re-raise

Guard wiring on all 119 endpoints · `@CurrentUser()` identity everywhere · 404-not-403 on cross-tenant ids ·
`salesRep`/`csm` relations point at `crm_people`, **not** global `users`, so §19's unprojected-users rule does not
apply · the support-dashboard `leftJoin(users)` selects only `users.name` · `23505` → `ConflictException` in
pricebooks · composite tenant unique indexes throughout (bare `.unique()` only on `publicToken` and a singleton
settings row) · zero `class-validator` · `@Idempotent` on the main creates · `assertPipelineOwner` BOLA check.

### Own finding — module placement

`contacts`, `leads`, `deals` and `quotes` are **top-level modules** (`src/modules/{contacts,leads,deals,quotes}/`),
not sub-modules of `src/modules/crm/`. So the CRM's four canonical entities live outside the CRM module folder,
while `crm/` holds only core/inbox/metadata/pricebooks/automation-studio. Per CLAUDE.md §18 (nest by domain,
`<module>/<subdomain>/`) these belong under `crm/`. Cosmetic today, but it is why the module looked smaller
than it is — the 89-file / 12k-LOC figure understates the real CRM surface.

---

## Phase 1 — prioritised build order

Security and correctness first, then the systemic gate, then cheap wins.

**Status: 1–7 and 9–11 are CLOSED**, and the design lane is now DSV-001..006 + 010 closed. Remaining:

- **#8 SCH-002** — dashboards computing from the legacy hand-seeded tables. The biggest correctness item left, and
  still blocked on **OPEN-04**: whether `crm_people`/`crm_companies`/`crm_deals` hold real tenant rows or only seed
  data. That answer decides migration vs deletion, and it needs DB access.
- **#12** — the four table-stakes capability gaps: **GAP-025 consent/suppression first** (sequences can already
  send, and there is no structural way to make a suppressed contact un-emailable), then GAP-005 saved views,
  GAP-002 contact↔many-accounts, GAP-006 list inline editing.
- Cosmetic remainder: **DSV-004** only (5 hooks defined inside component files with hand-typed query keys — 2 of
  the 5 vanished with the dead-surface deletions, so this is now 3 hooks in 1 file). DSV-007 and DSV-008 are
  closed; DSV-011 is deliberately deferred with a recorded reason.
- **NAV-002** — `/crm/tasks` is Build-module-gated and `crm:tasks:view` is enforced nowhere. Nav parity is patched;
  whether CRM Tasks belongs to Build is an open product decision.

| # | Item | Why first | Effort |
|---|---|---|---|
| 1 | **SEC-002** — filter `snoozeTask`/`completeTask` by assignee under `own` scope | In-tenant privilege escalation on a `scopable` key; the selected `assigneeId` is already in hand | XS |
| 2 | **TXN-003** — route the 8 `void this.auditLog()` sites through `AuditService.log()` | Every pipeline/stage/option change is currently unlogged; §20 pattern already exists | S |
| 3 | **PERM-004** — add the 11 `crm:deals:*`/`crm:quotes:*` entries to the frontend catalog | Those permissions are ungrantable in the role editor today; pure data entry | XS |
| 4 | **NAV-001** — point the 5 sidebar entries at their real entity keys | Nav fails before the backend is reached for correctly-scoped users | XS |
| 5 | **BRK-003** — wire Export to the existing `GET /contacts/export` | Backend is done and streaming; frontend is a `toast.info` stub | XS |
| 6 | **DSV-005** — add `enabled: useCan(...)` to every CRM query hook | Biggest item but highest leverage: stops 403-spam and Neon burn on every CRM page for unauthorised users. HR's 30-hook precedent is the template | L |
| 7 | **AI-001** — change `resolveSurface`'s default off `"sheet"`, set `surface` per action | Platform-wide (40 of 41 call sites); a one-field default plus per-action tagging | S |
| 8 | **SCH-002** — migrate dashboards onto `deals`/`contacts`/`users` | P0 correctness, but **blocked on OPEN-04** (do the legacy tables hold real rows?) | L |
| 9 | **BRK-001/002/004** — decide per surface: build the endpoint or delete the UI | Three dead features shipping in the product; §0.9 says leave less code | M |
| 10 | **TXN-001/002** — wrap the pricebook default-flag writes in one transaction | Torn write leaves multiple default pricebooks | XS |
| 11 | **QUERY-001/002/005** — bound the unbounded `findMany`s; recursive CTE for the cycle check | DoS surface on large orgs | M |
| 12 | **GAP-025 / GAP-005 / GAP-002 / GAP-006** — consent+suppression, saved views, contact↔many-accounts, list inline edit | The four table-stakes gaps; consent first since sequences can already send | L each |

## Phases 2–9 ⏸ not started

## Next action

**Phase 1 is complete and gated.** All five lanes reported; findings above carry `file:line` evidence, and every
claim I acted on was re-verified against source (four agent claims were corrected or refuted — see the refuted
sections). No code touched, so nothing typechecked.

The audit lives here rather than in a separate `docs/crm-audit-*.md`: a second copy would drift from this tracker,
the same reasoning as D-01. Awaiting approval of the build order before any edit.
