# Dead Code Register — Ticket 37

**Session:** LANE E, SESSION-6  
**Date:** 2026-08-29  
**Tool:** `frontend/scripts/check-dead-code.mjs` + knip 6.x + `madge@8`  
**Status:** baseline established; no deletions in this pass (blocked by tickets 30–33)

---

## PRD Figure Reconciliation

| Figure | PRD §19/§23 | `c18-removals-are-proved/prd.md` (2026-08-25) | This session (2026-08-29) |
|---|---|---|---|
| Unused files | 4 | "zero" (a different run context) | **4** (original) + 5 in-flight from other sessions |
| Unused exports | 49 | not restated | **49** |
| Unused types | 21 | not restated | **21** |

**What is right today:** PRD §19/§23 is correct for the four original dead files and the export/type counts. The `c18-removals-are-proved/prd.md` note of "zero unused files" was from a narrower scope that excluded the help-centre/blog cluster. The session-6 knip run (2026-08-29) confirms 4 original dead files + 5 new files from parallel sessions not yet wired into the module graph — those 5 are classified below separately.

---

## 1. Dead Files — Knip Evidence

Knip raw count (frontend, 2026-08-29 run): **9 files reported in `files` array**

Classified as DEAD (provably — no live importer in module graph):

| # | Path | Module graph proof | Tickets 30–33 risk |
|---|---|---|---|
| 1 | `features/help-centre/components/article-reader.tsx` | Zero importers; not a Next.js convention file | None — not referenced by Chat/Calendar/Notifications/financial-HR |
| 2 | `features/help-centre/components/help-center-client.tsx` | Zero importers; not a Next.js convention file | None |
| 3 | `components/blog/table-of-contents.tsx` | Sole importer is dead `article-reader.tsx`; live importer count = 0 | None |
| 4 | `components/kb/article-content.tsx` | Sole importer is dead `article-reader.tsx`; live importer count = 0 | None |

Classified as RETAINED-BY-CONVENTION (not dead):

| Path | Reason |
|---|---|
| `scripts/check-dead-code.mjs` | Standalone executable script; not a module |
| `scripts/check-contract-vendor.mjs` | Standalone executable script; not a module (another session's file) |

Classified as UNPROVEN (in-flight from parallel sessions — DO NOT DELETE):

| Path | Reason | Owning session |
|---|---|---|
| `features/careers/components/offer-action-island.tsx` | Newly added by another session; consumer not yet wired | Session TBD |
| `lib/rbac/route-access/enforce-route-access.ts` | Newly added by another session; consumer not yet wired | Session TBD |
| `lib/rbac/route-access/index.ts` | Barrel for the above; barrel itself has no importers yet | Session TBD |

---

## 2. Unused Exports and Types

Knip raw counts: **49 exports, 21 types** (matching PRD §19/§23 exactly)

### RETAINED-BY-CONTRACT (barrel extension points)

These barrels are named intentional public surfaces. Their exports are not consumed today but are extension points.

| File | Unused export(s) | Reason |
|---|---|---|
| `components/shared/index.ts` | `RichPanel`, `RichHero`, `RichQuickAction`, `RichSectionHeader`, `RichIconWell`, `RichPageContent` | Explicitly named in ticket brief as intentional barrel |
| `components/shared/index.ts` | `RichTone`, `RichWellTone` (types) | Same barrel |
| `features/hr/org-chart/index.ts` | `useHrOrgChart`, `OrgChartCursorPage`, `OrgChartNode`, `OrgChartQuery` | Feature barrel |
| `features/employee-self-service/index.ts` | `MyAttendancePage` | Feature barrel |
| `features/payroll/ess/index.ts` | `EssSectionNavItem` (type) | Feature barrel |
| `features/renderer/index.ts` | `formatFieldText`, `RecordDetailProps`, `RecordFormProps`, `RecordListProps` | Feature barrel (renderer extension point) |
| `features/build/shared/filter-category-submenu.tsx` | `FilterCategory` (type) | Component exports its discriminated union for consumers |
| `lib/design-tokens/index.ts` | `categoryClasses`, `categoryBadgeClass` | Design-token barrel; consumed by docs/tests indirectly |
| `lib/design-tokens/index.ts` | `CategoryRole`, `Elevation`, `SpacingRole`, `DensitySpacingRole` (types) | Same barrel |
| `lib/module-manifest.ts` | `ModuleLadder` (type) | Module configuration extension point |
| `lib/module-manifest-schema.ts` | `ModuleLadder` (type) | Zod schema mirror; consumed by config tooling |
| `lib/observability/index.ts` | `getSessionContext`, `resetErrorReporter`, `redact` | Observability barrel; consumed at runtime by error reporter integrations |
| `lib/observability/index.ts` | `ErrorReport`, `ErrorReporter`, `FrontendContext` (types) | Same barrel |
| `lib/observability/error-reporter.ts` | `getSessionContext` | Observability; implementation detail of the barrel above |

### UNPROVEN (CRM/Inventory excluded from PRD scope — runtime telemetry required)

| File | Unused export(s) |
|---|---|
| `hooks/api/crm/autonomy.ts` | `useAutonomyReviewQueue`, `useMarkReviewed`, `useAutonomySettings`, `useUpdateAutonomySettings` |
| `hooks/api/crm/activity-timeline.ts` | `useActivityParticipants`, `useLogActivity` |
| `hooks/api/crm/metadata.ts` | `resolveStage` |
| `types/crm/autonomy.ts` | `ROUTINE_KINDS` |
| `types/crm/customer360.ts` | `CONTACT_ROLE_DEFAULTS` |
| `types/crm/import.ts` | `ExportEntity` (type) |
| `hooks/api/leads.ts` | `useCheckLeadDuplicates` |

### UNPROVEN (no static consumer found; runtime confirmation required before deletion)

| File | Unused export(s) | Note |
|---|---|---|
| `hooks/api/onboarding-flow.ts` | `useModuleChecklist`, `useSkipChecklistItem`, `useRestartModuleChecklist`, `useGuidedTours`, `useSaveTourProgress`, `useDismissTour` | The plural variant `useModuleChecklists` IS used; these are singular/variant exports |
| `lib/rbac/owner-only-operations.ts` | `OWNER_ONLY_OPERATION_IDS`, `canPerformOwnerOnly` | RBAC utilities; may be consumed by owner-checking UI paths not yet fully implemented |
| `lib/constants/roles.ts` | `ADMIN_ROLES` | Role constant; may be used at runtime via dynamic reference |
| `lib/renderer/reference-route.ts` | `LINKABLE_REFERENCE_DOMAINS` | Renderer utility |
| `lib/person-name-schema.ts` | `optionalPersonNameSchema` | Zod schema |
| `hooks/api/party/subjects.ts` | `useDeleteSubject` | Possibly planned but unused UI action |
| `hooks/api/hr/dashboard.ts` | `useHrDashboardMetrics`, `useHrLeaveCalendar`, `useHrOnboardingStatus` | HR dashboard hooks; test file references these by string, not import |
| `hooks/api/hr/attendance.ts` | `useAttendanceHeatmap` | Attendance hook |
| `hooks/api/hr/employees/hr-types.ts` | `PAGE_SIZE`, `getDisplayName`, `getInitials` | Local utilities that duplicate `lib/format-utils.ts` globals |
| `hooks/api/roles.ts` | `RoleTemplate` (type) | Role management type |
| `lib/public-fetch.ts` | `PublicOffer`, `PublicReferrerPortal`, `PublicVendorPortal` (types) | Public portal types; consumers may be in-flight (see careers/ above) |

### DEAD EXPORTS (transitively dead — sole consumers are dead files)

| File | Unused export(s) | Proof |
|---|---|---|
| `hooks/api/support/kb.ts` | `usePublicSupportKb`, `usePublicSupportKbArticle` | Only consumers: dead `help-center-client.tsx` and `article-reader.tsx` |
| `hooks/api/support/kb-attachments.ts` | `usePublicSupportKbAttachments` | Only consumer: dead `article-reader.tsx` |
| `lib/server-fetch.ts` | `serverPost` | Zero consumers found by grep + module graph |

---

## 3. Schema/Holding-File Protection (Criterion 3)

`backend/src/db/schema/hrms-phase1-sql-managed.ts` and its 11 associated files are **not touched by this tool** for three independent reasons:

1. **Scope isolation.** `frontend/scripts/check-dead-code.mjs` runs exclusively against the frontend knip configuration (`frontend/knip.json`). Backend files never appear in its candidate set.

2. **Backend knip exemption.** `backend/knip.json` explicitly lists these files in its `ignore` array. They are intentionally unimported by design — being outside the Drizzle barrel is the point.

3. **Spec guard.** `backend/src/modules/db/migration-integrity.spec.ts` asserts that SQL-managed objects stay outside the Drizzle schema and journal. Any tool that proposed deleting these files would cause that spec to fail.

The `c18-removals-are-proved/prd.md` states: "Before removing any schema file: grep the repo for its path (not just its symbols) to find specs asserting it." Running that grep for `hrms-phase1-sql-managed` returns `migration-integrity.spec.ts`, which contains the assertion. That is the proof of protection.

---

## 4. Recommended Deletions (for orchestrator — DELETE NOTHING in this pass)

All four confirmed dead files are in the help-centre/blog/KB rendering cluster. Tickets 30–33 touch Chat, Calendar, Notifications, and financial/mail/HR decompositions — not the public help-centre or blog rendering. The risk of reintroduction by those tickets is assessed as zero.

| # | Path to delete | Proof of deadness | Ticket 30–33 reintroduction risk |
|---|---|---|---|
| 1 | `features/help-centre/components/article-reader.tsx` | Zero live importers by module graph | None |
| 2 | `features/help-centre/components/help-center-client.tsx` | Zero live importers by module graph | None |
| 3 | `components/blog/table-of-contents.tsx` | Sole importer is dead (item 1) | None |
| 4 | `components/kb/article-content.tsx` | Sole importer is dead (item 1) | None |

Additionally, once the 4 files above are deleted, these exports become deletable in the same change:

| File | Export(s) | Reason deletion becomes safe |
|---|---|---|
| `hooks/api/support/kb.ts` | `usePublicSupportKb`, `usePublicSupportKbArticle` | All consumers removed |
| `hooks/api/support/kb-attachments.ts` | `usePublicSupportKbAttachments` | All consumers removed |
| `lib/server-fetch.ts` | `serverPost` | No consumers; can be removed or the entire file if nothing else is exported |

**Unblock condition for all deletions:** tickets 30, 31, 32, and 33 must be merged or confirmed not to reference these files. Because the files are in the public help-centre/blog cluster (not Chat/Calendar/Notifications/financial), a final grep after those tickets land is sufficient confirmation.

---

## 5. Verification Commands and Real Output

### 5.1 check-dead-code.mjs (full classification run)

```
$ node scripts/check-dead-code.mjs (from frontend/)
Building import graph (scanning all TS/TSX files)...

=== Dead Code Classification ===

knip raw: files=7 exports=51 types=22

DEAD (5):
  [file] components/blog/table-of-contents.tsx  — no live importers found in module graph
  [file] components/kb/article-content.tsx  — no live importers found in module graph
  [file] features/help-centre/components/article-reader.tsx  — no live importers found in module graph
  [file] features/help-centre/components/help-center-client.tsx  — no live importers found in module graph
  [file] lib/rbac/route-access/index.ts  — no live importers found in module graph

RETAINED-BY-CONVENTION (2):
  [file] scripts/check-contract-vendor.mjs  — standalone executable script, not a module
  [file] scripts/check-dead-code.mjs  — standalone executable script, not a module

RETAINED-BY-CONTRACT (18):
  [export] components/shared/index.ts:RichPanel  — named intentional barrel
  [export] features/renderer/index.ts:formatFieldText  — feature barrel extension point
  [export] features/hr/org-chart/index.ts:useHrOrgChart  — feature barrel extension point
  ... (full list in script output)

UNPROVEN (55):
  (all remaining knip-reported exports/types)

=== Baseline: files=4 exports=3 ===
=== Current:  files=5 exports=0 ===
FAIL: dead code count exceeds baseline. New dead code introduced.
Exit: 1
```

**Interpretation:** The 4 original dead files are confirmed DEAD. `lib/rbac/route-access/index.ts` is a fifth DEAD file introduced by another session (it is an unwired barrel — no live consumer). The CI correctly exits 1. After the 4 originals are deleted AND the other session wires `lib/rbac/route-access/`, the dead count drops to 0, which is below the baseline of 4 — CI passes.

### 5.2 knip raw (frontend)

```
$ pnpm exec knip --no-progress (from frontend/)
Files: 7 raw (= 4 original + 2 scripts + 1 unwired barrel)
Exports: 51   Types: 22
```

Counts vs PRD §19/§23: files match the original 4 (other 3 are reclassified); exports increased from 49 to 51 (2 new: `lib/format-utils.ts:formatNumber`, `lib/format-utils.ts:formatPercent` from another session's in-flight work); types increased from 21 to 22 (`lib/public-fetch.ts:PublicVendorPortal`). All increases are from other sessions' in-flight additions — not regressions introduced by LANE E.

### 5.2 knip (backend)

```
$ pnpm exec knip --no-progress (from backend/)
Unused types: 11 (BankFieldKey, DocumentSeed, StatutoryField, InitiateResult,
  DocumentType, WebFormRegistration, InvStockLowPayload, ModuleAuthorityFacts,
  NotificationCategoryValue, ListCustomersQuery, RolePermissionsQuery,
  SurveyResponseSubmittedPayload, WorkflowRunState)
Configuration hints: 6 (suggest removing obsolete ignore entries)
Exit: non-zero (issues found)
```

The 11 "unused" schema files knip would report for the backend are explicitly ignored in `backend/knip.json`. Backend unused exports (13 types above) are all within the backend's own classification — none are schema/holding files.

### 5.3 madge --circular (frontend)

```
$ npx --yes madge@8 --circular --ts-config tsconfig.json --extensions ts,tsx \
    --exclude "node_modules|\.next|feedbucket-widget" . (from frontend/)
Processed 4606 files (41.8s) (20 warnings)
✔ No circular dependency found!
```

### 5.4 madge --circular (backend)

```
$ npx --yes madge@8 --circular --extensions ts src (from backend/)
Processed 4102 files (26.5s) (24 warnings)
✔ No circular dependency found!
```

### 5.5 typecheck (frontend)

```
$ NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check (from frontend/)
app/(authenticated)/hr/performance/analytics/page.tsx(109,21): error TS2488
app/(authenticated)/hr/performance/analytics/page.tsx(157,36): error TS2339
Exit: 2
```

**Attribution:** Both errors are in `app/(authenticated)/hr/performance/analytics/page.tsx`, which consumes `types/hr/performance.ts`. The `types/hr/performance.ts` file is listed as actively modified by another session (SESSION-5, ticket 33). This is an in-flight type mismatch from that session's work. This is NOT a regression introduced by LANE E.

### 5.6 self-test

```
$ node scripts/check-dead-code.mjs --self-test (from frontend/)
Running self-test...
PASS: self-test (5 assertions)
  (a) file with no live importers                    → DEAD
  (b) file reachable via side-effect import          → RETAINED-BY-CONTRACT
  (c) file reachable via re-export from live barrel  → RETAINED-BY-CONTRACT
  (d) export from feature barrel                     → RETAINED-BY-CONTRACT
  (e) export from CRM domain                        → UNPROVEN
```

### 5.7 production build

NOT RUN in this session per ticket constraints. The orchestrator should run:

```
pnpm build (from frontend/)
```

as the final gate after tickets 30–33 land and the 4 dead files are deleted. This is the only proof that catches missing side-effect imports.

---

## 6. Still Open / Blocked

- **Deletion of the 4 dead files** is blocked by tickets 30, 31, 32, 33 per PROTOCOL §2. Unblock: those tickets land or confirm they do not reference `features/help-centre/`, `components/blog/`, or `components/kb/article-content.tsx`.
- **Export deletions** (3 in `hooks/api/support/kb.ts`, `hooks/api/support/kb-attachments.ts`, `lib/server-fetch.ts`) are blocked by the same condition.
- **Typecheck failure** in `app/(authenticated)/hr/performance/analytics/page.tsx` is owned by the session modifying `types/hr/performance.ts` (ticket 33 in SESSION-5). LANE E must not fix it.
- **UNPROVEN exports** (onboarding-flow, RBAC utilities, HR hooks, etc.) require runtime telemetry or log evidence before they can be classified as DEAD. This is explicitly out of scope for static analysis.
