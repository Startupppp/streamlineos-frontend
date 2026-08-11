# TASKS — CRM

Updated: 2026-08-11 · **Done 50 · Open 18 · Blocked 12 · Deferred 8 · Total 88**
Counts recomputed by script, not from memory. All 12 blocked items trace to **D-009** (migration TTY blocker).

Legend: `[x]` done with evidence · `[ ]` open · `[!]` blocked · `[~]` deliberately deferred with reason.
Evidence = a command or grep I ran **this session**. "tsc 0" = `tsc --noEmit` reported no error in the edited files.
No test suite was run — nothing here claims tests pass.

---

## Phase 0 — Design contract (DS-*)

- [x] DS-001 Card radius `rounded-lg` → `rounded-xl` · Evidence: `card.tsx:10` xl, `content-fill-panel.tsx:21` xl, 135 vs 81 file usage; §7 rewritten
- [x] DS-002 Card border ≥70% not full opacity · Evidence: `card.tsx:10` `border-border/70`; §2 reworded
- [x] DS-003 Shadow canon (`shadow-sm` panels, `shadow-noir` in Card; soft/medium deprecated) · Evidence: usage counts 257/27/1/1; `globals.css:274-291` definitions read
- [x] DS-004 `DataTable` `search`/`toolbar` still exist · Evidence: `data-table.tsx:81-88` — doc claim of "compile error" refuted
- [x] DS-005 `PageWrapper` props rewritten verbatim · Evidence: `page-wrapper.tsx:11-32`; `eyebrow`/`filtersCollapseBreakpoint` absent
- [x] DS-006 Page inset uses `PAGE_CHROME_X` (`px-4 sm:px-6 lg:px-8`) · Evidence: `content-fill-panel.tsx:9`
- [x] DS-007 Two pagination components split by surface · Evidence: `data-table.tsx:19` imports `DataTablePagination`
- [x] DS-008 Fictional `PageWrapper` divider claim removed · Evidence: full read of `page-wrapper.tsx`, no border element
- [x] DS-009 Table density is `h-10`/`px-2 py-2`/`text-sm` · Evidence: `table.tsx:79`, `data-table.tsx:358,360`
- [x] Screen-template catalog (§18, 9 archetypes) · Evidence: `grep -c '^### T[0-9]' UI-UX-SYSTEM.md` = 9; file 1264 lines

## Phase 1 — Security & correctness

- [x] SEC-002 own-scope enforced on task snooze/complete · Evidence: `applyScope` on SELECT **and** UPDATE, `crm-inbox.service.ts`; 2 scope specs added; BE tsc 0
- [x] SEC-001 dead `ForbiddenException` + unused import removed · Evidence: `crm-org-merge.service.ts`; BE tsc 0
- [x] TXN-001/002 pricebook default-flag writes in one `runInTenantTransaction` · Evidence: `grep -c runInTenantTransaction` = 3; BE tsc 0
- [x] TXN-003 9 audit sites → `audit.logCritical`, awaited · Evidence: `grep -c 'await this.auditLog('` = 9, `void` count 0; unused `auditLogs` import removed; BE tsc 0
- [x] PERM-004 11 ungrantable keys added to the frontend catalog · Evidence: backend/frontend key diff now empty; FE tsc 0
- [x] NAV-001 5 sidebar entries repointed at enforced keys · Evidence: each read off its controller (`contacts.controller.ts:49`, `crm-organizations.controller.ts:51`, `quotes.controller.ts:49`, `deals.controller.ts:54`)
- [x] NAV-002 `/crm/tasks` un-gated from Build **after** closing the org-wide read · Evidence: `tasks:read` is `EMPLOYEE_SELF_SERVICE`; list now forces own-scope unless `crm:tasks:view`; `@RequireModule("build")` removed; BE tsc 0
- [~] PERM-001 **REFUTED — do not "fix".** The audit claimed `build:view` is a bogus 2-segment key that no BUILD template grants, so the Customer-360 projects section "has never appeared for any user". False on every count: the key exists (`permissions/shared.ts:36`), is granted by **4 role templates** (`role-templates.constants.ts:323,373,394,497`), and is enforced by **30 `@RequirePermission` decorators**. Only the format nit is real (2 segments vs §21's 3) — and normalising it is a repo-wide rename across 34 sites, not a CRM fix. Left as-is deliberately
- [ ] PERM-002 `dashboard:*:view` compound-resource keys — cosmetic
- [ ] PERM-003 `crm:incentives:config` uses a non-canonical action
- [x] VAL-001 `.strict()` added to **24 CRM write schemas** · Evidence: every DTO under `crm/**/dto/` enumerated; query/filter schemas deliberately left tolerant (`campaignListSchema`, `organizationListSchema`, `territoryListSchema`, `listPipelinesSchema`, `resolvePriceQuerySchema`, `orgDuplicatesQuerySchema`); `.strict()` placed before `.refine()` on `mergeOrgsSchema`; BE tsc 3 pre-existing, none in edited files
- [x] **VAL-002 (new, found by VAL-001)** — 9 schemas could **not** be tightened because the frontend already sends fields the schema does not declare. Recorded rather than "fixed" by tightening, which would have turned working requests into 400s
- [ ] **CONTRACT-001 · 3 live field-name mismatches silently stripping data** (§11: "drift silently strips fields into no-ops"). Each means the feature is partially broken **today**:
  - `assignmentReorderSchema` — frontend sends `{ rules: {id,priority}[] }`, backend expects `{ ruleIds: number[] }` → **assignment-rule reorder does nothing**
  - `territoryCreateSchema`/`territoryUpdateSchema` — frontend sends `assignedRepUserIds: string[]`, backend has `assignedReps: number[]` → **territory rep assignment is dropped** (compounds SCH-010, where the FK also points at the legacy roster)
  - `territoryPreviewSchema` — frontend sends `{ sampleLead }`, backend expects `{ sample }` → **territory preview receives nothing**
- [ ] CONTRACT-002 6 schemas where the frontend sends server-owned fields (`executionCount`, `lastRunAt`, `version`, `createdAt`, `ownerId`) — should be omitted client-side, then those schemas can be tightened

## Phase 1 — Query cost

- [x] QUERY-001 support dashboard: 2 bounded projected queries + 2 aggregates replace an unbounded fetch · Evidence: `KEY_ACCOUNTS_LIMIT`/`UPCOMING_RENEWALS_LIMIT`/`NEW_CLIENT_YEARS` added; outputs semantically identical; BE tsc 0
- [x] QUERY-002 `getWithContacts` parallelised + 100-row cap · Evidence: single `Promise.all`, `ORG_CONTACTS_LIMIT`; BE tsc 0
- [x] QUERY-005 both graph walks → `WITH RECURSIVE` + depth guard · Evidence: `HIERARCHY_MAX_DEPTH`; both CTEs present; BE tsc 0
- [x] QUERY-003 `getAllPeopleSlugs` capped at 1000 · Evidence: existing `columns` projection kept
- [x] QUERY-004 `getPersonBySlug` 3 queries capped at 100 each **with column projections justified from the mapping code** · Evidence: `crmTeamPerformance` → `{month,value}`; `crmDeals` → `{companyName,value,stage,probability,closeDate}`; `crmCompanies` → `{name,revenue,health,customerSince,renewalDate}` — each field traced to its use site
- [x] QUERY-006 both `limit(500)` in-memory averages → SQL `AVG` · Evidence: `EXTRACT(EPOCH FROM AVG(resolved_at - created_at)) * 1000`; identical filter sets; zero-row case returns SQL NULL → `?? 0` → "—", same as before. `AVG(interval)*1000` is arithmetically identical to `SUM(delta)/count`
- [~] QUERY-002 column projection deferred · Reason: consumer shape unverified; dropping a field the UI reads is not caught by tsc across the API boundary

## Phase 1 — Caching (CACHE-*)

- [x] CACHE-001 every organizations writer now invalidates · Evidence: new private `invalidateOrgCaches` bumps **both** namespaces; `create`, `applyUpdate` (previously invalidated **nothing**) and `remove` all route through it; `applyUpdate` became `async` and returns the row after invalidating; BE tsc 0 in edited files
- [x] CACHE-002 rollup/timeline moved onto a versioned namespace · Evidence: both used `cache.cached()` with plain unversioned keys and were **never** invalidated, so a stale rollup could outlive any edit; now `cachedVersioned(CACHE_KEYS.crmOrganizationDetailNamespace(orgId), …)` with a new namespace helper, so any writer bumping it expires them. §22's prescribed shape — no request-path `invalidatePattern` added

## Phase 1 — Broken surfaces

- [x] BRK-001 `deal-orders-section.tsx` deleted (4 nonexistent endpoints) · Evidence: 0 controller hits for `deals/:dealId/orders` and `crm/orders`; non-use proven per §25; FE tsc 0
- [x] BRK-002 `lead-attachments-section.tsx` deleted (3 nonexistent endpoints) · Evidence: 0 attachment routes in `modules/leads/`; the only match was a CSV `Content-Disposition` header
- [x] BRK-003 Contacts export wired to the real endpoint · Evidence: `contacts.controller.ts:78-86` streams CSV; page now uses `useExportContacts` + `downloadBlob` + `LoadingButton` + `getErrorMessage`
- [x] BRK-004 quote PDF stub removed · Evidence: no PDF generation exists in either repo
- [x] BRK-006..009 error branch before not-found on 4 pages · Evidence: `ErrorState` prop signature matched; `getErrorMessage(error)` + `onRetry` + `flex-1`; FE tsc 0
- [x] BRK-005 deals assignee filter moved server-side · Evidence: `DealFilters.assignedToId` already existed and `listDealsSchema:7` already accepted it — the page simply never passed it, so with the 100-row cap the filter silently dropped deals never fetched. Now built into a `useMemo`'d `dealFilters` and the assignee branch removed from the client filter. **Search stays client-side deliberately** — `listDealsSchema` has no `search` field, so that half is by design. FE tsc **0**

## Phase 1 — Design conformance (DSV-*)

- [x] DSV-005 every CRM query permission-gated · Evidence: 19 files; **0** `enabled:` after an `...options` spread; 9 non-obvious keys re-verified as enforced **and** catalogued
- [x] DSV-003 11 async buttons → `LoadingButton` · Evidence: 17 sites correctly skipped (Radix `AlertDialogAction`, icon-only, `Checkbox`/`Switch`, Cancel buttons); FE tsc 0
- [x] DSV-006 26 inline Zod schemas extracted · Evidence: CRM `*-schema.ts` count 27; exactly 1 inline `z.object` remains (`log-activity-dialog.tsx:16`, single-field — §7 exempt)
- [x] DSV-007 9 card surfaces corrected · Evidence: 5 `<Card>` overrides deleted, 4 divs → `rounded-xl`; dropzones/inner rows left
- [x] DSV-008 4 filter-bar selects returned to canon · Evidence: in-cell editors + page-size select left, per §6's explicit exemption
- [x] DSV-001 hand-rolled form → RHF (covered by DSV-006 extraction)
- [x] DSV-002 mutation `onError` handlers that discarded the backend message · Evidence: over-count corrected 19 → 8
- [x] DSV-010 2-field submitting form moved off a raw `Popover`
- [~] DSV-004 hooks in component files · **Both cited files (`lead-attachments-section`, `deal-orders-section`) were the dead surfaces I deleted, so the original finding is gone.** 3 remain — `contact-actions-menu.tsx:29` (enrich), `contacts-csv-import-dialog.tsx:146`, `deals-csv-import-dialog.tsx:96` — all well-formed `useMutation`s with a `mutationKey`, using `apiClient`. **Deliberately left.** Their input types (`ParsedContact`, `ParsedDeal`) are owned by the feature's CSV parsing step, so moving them into `hooks/api/` would make shared infrastructure import from `features/**` — a §24 one-directional-flow violation. Satisfying §14's letter would break §24. Would need the payload types relocated to `types/` first: 3 files of churn for zero user benefit
- [~] DSV-011 `TabsContent` fill class · Reason: all 7 sites are inside **Sheets**, not page bodies; §15 targets page-body fill, and changing flex behaviour unverified risks regressions for no visible gain
- [~] DSV-009 `style={{ background: stage.color }}` · Reason: tenant-configured colour, not hardcoded chrome; AP-8 does not apply

## Phase 1 — Capability gaps

- [x] AI-001 `resolveSurface` default `"sheet"` → `"popover"`; drafts keep `surface: "sheet"` · Evidence: 40 of 41 call sites inherited the default; `ai-actions-menu.tsx:78`
- [ ] GAP-025 consent & suppression — **foundation done, feature incomplete** (see below)
- [!] GAP-005 saved views — BLOCKED on D-009 (new table). `support_saved_views` is the pattern to copy
- [!] GAP-002 contact ↔ many accounts — BLOCKED on D-009 (link table)
- [ ] GAP-006 list inline editing — reuse `features/build/views/card-inline-fields.tsx`
- [!] GAP-013 FX-rate snapshot on quotes — BLOCKED on D-009
- [ ] GAP-022 duplicate detection at write time (model already exists, not fired on create)
- [ ] GAP-028 bulk status-update / reassign / delete
- [!] GAP-035 outbound webhook subscriptions — BLOCKED on D-009
- [~] GAP-016 CRM events as a `/calendar` source · Reason: the redirect is correct per the one-calendar rule
- [~] GAP-039 field-level visibility · Reason: enterprise-tier, deliberately deferred

### GAP-025 sub-tasks

- [x] Schema authored: `crm_contact_channel_consent` + append-only `crm_contact_consent_events` + 4 enums · Evidence: `schema/crm/consent.ts`; barrel updated; BE tsc 0
- [x] `CrmConsentService` — `filterSendable`, `assertSendable`, `suppressedEmails`, `record` (upsert + event + audit in one txn), `listForContact`, `countMissingConsent` · Evidence: BE tsc 0
- [x] **Choke point** `CrmOutboundEmailService`; both CRM runners routed through it · Evidence: `grep AutomationEmailService src/modules/crm/` returns **only** the wrapper itself
- [x] Leaf `CrmConsentModule` so no cycle · Evidence: `madge --circular` → "No circular dependency found!" over 2967 files
- [!] Migration for the two tables — BLOCKED on D-009
- [ ] Endpoints: record/update consent, list per contact
- [ ] `@Public()` unsubscribe-link handler (needs the public-token treatment, not a guessable id)
- [ ] Route the 4 manual lead send paths through `assertSendable`
- [ ] UI + tests
- [ ] DPDP/GDPR retention & erasure path for contact PII

## Phase 1 — Object model

- [x] SIG-01 resolved: canonical entities identified · Evidence: `contacts`/`crm_organizations`/`deals`/`leads`/`quotes` have full CRUD services; legacy family is read-only
- [x] SIG-02 answered: 49 of 53 routes work end to end
- [x] SIG-03 answered: no pgEnum/text drift in CRM · Evidence: all 8 CRM enums created in `0000_light_vance_astro.sql:18-26`
- [x] OPEN-04 answered · Evidence: measured **0 rows / 0 orgs** in all 8 CRM tables this session
- [x] OPEN-05 answered: contact merge **is** wired · Evidence: `contact-roles.controller.ts:47-54`, `@RequirePermission("crm:contacts:merge")`
- [x] SCH-002 **discrepancy report produced; no figures changed** · Evidence: `docs/crm-dashboard-discrepancy-2026-08-11.md`. Measured legacy-vs-canonical symbol counts per service — `sales-dashboard` 63 legacy vs 3 canonical, `crm-sales-dashboard` 18 vs 3, **`sales-analytics` reads BOTH (18 legacy, 23 canonical)** so one screen mixes two sources of truth, `crm-support-dashboard` 15 legacy. Per the protocol default for untrusted report data, the repoint itself is **not** done: it needs a populated environment to record the per-metric delta first, and `territory_reps`/`crm_activities` must be re-pointed off `crm_people` before the dashboards, which is blocked on D-009
- [!] SCH-001 drop dead `crm_leads` — BLOCKED on D-009; also needs knip + `nest build` proof per §25
- [!] SCH-004 drop orphan `contacts.deal_id` — BLOCKED on D-009
- [!] SCH-005/011 polymorphic `crm_contact_roles` → exclusive arc — BLOCKED on D-009
- [!] SCH-010 `territory_reps.crm_person_id` → `users.id` — BLOCKED on D-009
- [!] SCH-012 FX snapshot on deals — BLOCKED on D-009
- [ ] SCH-003 route task-completion activities off `crm_activities`
- [ ] SCH-008 move live `crm_sla_policies` out of `analytics.ts`
- [~] SCH-006 money `decimal` → integer cents · Reason: see D-007; needs a migration and touches every financial path

## Soft delete (CRM slice of `docs/soft-delete-audit-2026-08-11.md`)

- [x] V-08/09 `leads` · Evidence: 24 `isNull(leads.deletedAt)` across 8 services; list/count share one conditions object on all 4 pairs; 4 sites deliberately unfiltered per D-013
- [x] V-14 `crm_organizations` · Evidence: `remove()` now sets `deletedAt` guarded by `isNull`; `queryList`/`getWithContacts`/`exists` filter; **both** CTE arms carry `deleted_at IS NULL`
- [x] Org-detail contacts read (my catch) · Evidence: contacts service filters in 4 places; this read was the outlier
- [!] V-07 `deals`, V-13 `quotes`, V-25 `crm_campaigns` — BLOCKED on D-009: **no `deleted_at` column exists**
- [!] Partial indexes on 7 CRM tables — BLOCKED on D-009
- [ ] Cascade review: `contacts` soft-deletes so `crm_contact_channel_consent.contactId` cascade never fires
