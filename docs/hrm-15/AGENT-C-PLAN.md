# HRM-15 — Agent C (frontend) plan

Scope: `hrm15-frontend/frontend/**` on `hrms/hrm-15-reporting-managers`. The binding
contract is `hrm15-backend/docs/hrm-15/CONTRACT.md` (§4 HTTP, §5 FE). The PRD
sections this plan implements are §7, §9 and §11 (Phase D). The rules are
`frontend/CLAUDE.md` (FE-xx).

Block 1 (this run) covers the audit plus the contract-independent pieces. Everything under
"Block 2" waits until the main agent publishes the backend contract.

## 0. Audit findings (verified 2026-09-26)

| Area | File(s) | Finding | Consequence |
|---|---|---|---|
| Reporting-line card | `features/hr/employees/detail/reporting-line-section.tsx` (105) via `overview-tab.tsx:49` | Read-only. Only the primary line is shown, labelled "Reports to". The card has no source, secondary or editor. | Becomes the editor host (§3). |
| Hooks / contract | `hooks/api/hr/reporting-lines.ts` (42), `reporting-lines-schema.ts` (71) | `useReportingLine`, `useManagerCoverage`. Both are gated on `hr:employees:view` with `staleTime` 60 s and use `lazyContract`. | Extended in place (FE-28). No parallel file. |
| Query keys | `lib/query-keys/human-resources.ts:252-256` | `reportingLine(userId)`, `managerCoverage()` and `myTeam()` exist. | §5 keys are added beside them. |
| Invalidation | `lib/hr-workforce-cache.ts` | Covers employees, orgChart, directory, onboardingStatus, directory people/workers, coverage, and per-user employee/stats/employment/reportingLine. It **misses `myTeam()`**, which the contract §5 requires. | Add `myTeam()` plus the request/job keys. |
| Second FE writer | `features/hr/employees/detail/edit-employee-form.tsx:82` + `professional-info-section.tsx:76`; `manager-coverage-page.tsx` `AssignManagerCell` | Both write the manager through `useUpdateProfile({reportingTo})`, which is PATCH employee. | Both move to `PUT /hr/reporting-lines/:id` (Q2). |
| Onboarding schema | `lib/validation/hr.ts:12-27` `requireReportsTo` | Requires a manager unless the employee is top-level. | Manager becomes optional (PRD D2). Top-level stays exclusive. |
| Onboarding UI | `components/hr/_onboarding/step-employment.tsx` (209), `step-review.tsx`, `onboarding-wizard.tsx:44,75`, `components/hr/onboarding-payload.ts` | Uses `UserCombobox`, which is `MemberPicker` over org or build members. That source has no active-only filter and falls back without `settings:view`. | Every manager selector moves to `manager-candidates` (§4.6/§4.12). |
| Bulk onboarding | `features/hr/onboarding/bulk-onboard-*` | The template **was** 486 lines. It is now split (see §6). `reportingManagerEmail` is required. There is no preview endpoint, no statuses beyond valid/invalid, and no error export. | Canonical columns, a server preview and statuses (§4). |
| Idempotency | `hooks/api/hr/employee-profile.ts:131` | `crypto.randomUUID()` is minted per HTTP call, so a retry becomes a new operation. | `useIdempotentOperation` (`hooks/common/use-idempotent-operation.ts`), with `settle()` on success. |
| Staged import | `features/hr/import-export/components/import-export-page.tsx:27-34`; `import-wizard-sheet.tsx` (378) | The employees `columns` list has no manager column. The preview shows only valid/error counts and the first 5 errors. | Canonical columns, plus a resolution column in the preview. |
| Coverage | `features/hr/employees/manager-coverage-page.tsx` (242→250) | `CIRCULAR_COLUMNS` rendered raw user ids (FE-85). **Fixed in Block 1.** There are no fallback, pending-review, policy-missing or top-level states. | §8 below. |
| Self profile | `/settings` → `features/settings/settings-profile.tsx`. The `/me/*` pages are ESS (time-off, pay, team…). | No `/me/profile` page exists. `/me/team` is manager-home, whose empty state is "you manage nobody", so it is the wrong home for this. | The "Reporting line" section lives in `/settings` (§6). |
| HR settings registration | `app/(authenticated)/hr/settings/layout.tsx` (`TABS` + `SETTINGS_OVERVIEW_PERMISSIONS`), `components/layout/sidebar/sidebar-nav-routes-hr-settings.ts` (`HR_SETTINGS_PERMISSIONS`), `features/hr/settings-hub/hub-grid.tsx` (`CARD_GROUPS`) | A new page must be registered in all three places. It also needs a `loading.tsx` with an h1 (`lib/hrms-static-routes.test.tsx`). | §2. |
| Picker | `components/members/member-picker.tsx` (485) | The `candidates` prop is filtered **client-side**. The picker owns its search state and exposes no `onSearchChange`. | The server-searched candidates (cap 20) cannot drive it as-is (Q1). |
| Existing primitives | `StatusMapBadge`/`SemanticBadge` (`components/ui`), `ConfirmDialog`, typed-name confirm (`features/build/sidebar/delete-project-*`), `downloadXlsx` (`lib/export/xlsx-utils.ts`) | These are reused. There is no new badge or dialog primitive. | — |
| Permission catalog | `lib/rbac/permissions/hr.ts`, `permission-key-foundation.ts` | `hr:reporting-lines:*` was absent. **Added in Block 1.** | See the §6 note on catalog-sync. |

## 1. Contracts, hooks, keys (Block 2, first commit)

The `hooks/api/hr/reporting-lines-schema.ts` file is extended to match CONTRACT §4 field for field.
- `managerRefContract` = `{userId, name, email|null, designation|null, state}`. This reuses the existing `managerStateContract`.
- `relationshipEntryContract` (RelationshipEntry). The existing `reportingLineEntryContract` gains `source`, `isFallback` and `relationshipType`.
- `reportingLineViewContract` gains `secondary`, `topLevel`, `primaryChangesLast24h`, `changeThreshold`, `maxSecondaryManagers`, `pendingRequest` and `permittedActions`.
- `managerCoverageReportContract` gains `summary.{topLevel,fallback,pendingReview}`, `policyMissing`, `fallback[]` and `pendingReview[]`.

The next file is only needed if the schema file passes 300 lines: `hooks/api/hr/reporting-manager-schema.ts`. It would hold the policy, `MyRequest`/`HrRequest` (cursor envelope), `BulkJob`/`BulkJobRow` and the bulk-onboard preview.

New hook files follow FE-29, with `signal`, `staleTime` and a `mutationKey` on every hook, all through `useAuthorizedMutation`:
- `hooks/api/hr/reporting-lines.ts` (extend):
  - `useReportingLine` and `useManagerCoverage`;
  - `useSetReportingLine` (PUT, `hr:reporting-lines:manage`, `useIdempotentOperation`);
  - `useConfirmFallback`;
  - `useManagerCandidates(q, excludeUserId)` (staleTime 30 s, enabled when `q` is debounced ≥300 ms or the popover is open).
- `hooks/api/hr/reporting-manager-policy.ts`: `useReportingManagerPolicy` (5 min, session/org) and `useUpdateReportingManagerPolicy` (PATCH with `expectedVersion`, `setQueryData` from the response per FE-35, and a 409 branch per FE-78).
- `hooks/api/hr/my-reporting-line.ts`: `useMyReportingLine`, `useMyReportingManagerRequests` (infinite cursor, FE-125), `useCreateReportingManagerRequest`, `useCancelReportingManagerRequest`, `useRespondReportingManagerRequest` and `useMyManagerCandidates`. These are `@Universal`, so they are gated on session plus `useModuleEnabled("hr")` only.
- `hooks/api/hr/reporting-manager-requests.ts`: `useReportingManagerRequests(filters)` (cursor, `hr:reporting-lines:review`), `useReportingManagerRequest(id)` and `useReviewReportingManagerRequest`.
- `hooks/api/hr/reporting-line-bulk-jobs.ts`: `useReportingLineBulkJobs`, `useReportingLineBulkJob(id, rowCursor)`, `useCreateReportingLineBulkJob` (preview), `useCommitReportingLineBulkJob` and `downloadBulkJobFailures(jobId)`. The last one uses the apiClient blob path; there is no raw fetch (FE-15).
- `hooks/api/hr/employee-profile.ts`:
  - `useBulkOnboardEmployees` switches to `useIdempotentOperation`, keyed by the row payload, with `settle()` on success;
  - a new `useBulkOnboardPreview` is added (§4.20);
  - `bulkOnboardResult` gains `status`, `codes`, `primaryManager` and `skipped`;
  - the `onboard` response gains `primaryManager`.
- `types/hr/employee.ts:295-331`: `reportingManagerUserId` becomes optional (already `?`), and it gains `secondaryManagers`, `primaryManagerEmail`, `secondaryManagerEmail1..3` and `effectiveFrom`. `reportingManagerEmail` is kept only as a read alias; new code never writes it.

`lib/query-keys/human-resources.ts` adds these keys per §5:
- `reportingManagerPolicy()`, `myReportingLine()` and `myReportingManagerRequests()`;
- `reportingManagerRequests(filters?)` (prefix-safe form, like `hrTemplates`) and `reportingManagerRequest(id)`;
- `reportingLineBulkJobs()` and `reportingLineBulkJob(id)`;
- `managerCandidates(q, exclude)`.

`lib/hr-workforce-cache.ts` adds `myTeam()` and an optional `extra` key list for request/job keys. Every HRM-15 mutation calls it.

## 2. Reporting Manager Policy settings page (PRD §7.1)

| Add | Purpose |
|---|---|
| `app/(authenticated)/hr/settings/reporting-managers/page.tsx` | Server gate `requirePermission("hr:employees:view")` plus the feature component. |
| `app/(authenticated)/hr/settings/reporting-managers/loading.tsx` | `PageWrapper` title "Reporting managers" with a skeleton (static-route smoke needs the h1). |
| `features/hr/reporting-managers/policy/reporting-manager-policy-page.tsx` | `usePageState({permission:"hr:employees:view", error})`. It shows the explainer (primary vs additional, approval impact) and a policy summary. The form is editable only when `useCan("hr:reporting-lines:override")` (FE-44); otherwise it is read-only. |
| `…/policy/reporting-manager-policy-form-fields.tsx` + `…-schema.ts` | Default manager (candidate picker), fallback order (radio with the resolution order spelled out), secondary cap 0-3 (Select), change threshold 1-10 and allow-top-level (Switch). |
| `…/policy/policy-missing-banner.tsx` | Blocking warning (PRD §7.1.6), reused by the onboarding wizard, bulk panel and import wizard. It uses `isConfigured`, `defaultPrimaryManagerEligible` and `actorQualifiesAsFallback`. The text: "A blank manager fails unless you qualify as fallback or the row is top-level." |

Save is `EntityFormSheet`-free, because it is an inline settings form. It uses `LoadingButton`. A 409 version conflict refetches and shows "Someone else changed this policy; review and save again".

Registration touches three files:
- `hr/settings/layout.tsx`: add `TABS` `{label:"Reporting managers", href:"/hr/settings/reporting-managers", permission:"hr:employees:view"}`. `SETTINGS_OVERVIEW_PERMISSIONS` gains `hr:reporting-lines:override`.
- `sidebar-nav-routes-hr-settings.ts`: add a child route and add `hr:reporting-lines:override` to `HR_SETTINGS_PERMISSIONS`.
- `hub-grid.tsx`: add a card under "Policies & Rules".

## 3. Reporting-line card editor (PRD §7.6 single, §9)

- `features/hr/employees/detail/reporting-line-section.tsx` shows:
  - a **Primary reporting manager** row with a `ReportingRelationshipBadge kind="fallback"` when `isFallback && !fallbackConfirmedAt`, plus one-click "Replace" and "Keep" actions (confirm-fallback);
  - **Additional reporting managers** rows with a secondary label;
  - a top-level state with its reason;
  - upcoming (scheduled) rows;
  - a history count linking to the timeline;
  - a pending-request chip.

  Actions follow `permittedActions` together with `useCan` (both must hold).
- `features/hr/employees/detail/reporting-line-editor-sheet.tsx` (`EntityFormSheet`, 6+ fields) has these fields:
  - the primary picker (candidates, excluding the employee);
  - a top-level toggle, which disables every manager field and makes the reason required;
  - secondary rows up to `maxSecondaryManagers`, each with a label (≤60 characters);
  - effective date (org-local, default today);
  - reason.

  It also shows an old→new primary preview with the line "changes future approval routing; in-flight approvals keep their approver" (D5).
- `…/reporting-line-change-warning.tsx` covers the change-warning UI. When `primaryChangesLast24h + 1 > changeThreshold`, it shows a high-visibility `statusToneClasses("warning")` callout. The reason becomes required (≥10 non-whitespace characters). Submit is disabled unless `permittedActions.override`, and the emergency checkbox is shown only with override. A server `CHANGE_REASON_REQUIRED` / `ELEVATED_AUTHORITY_REQUIRED` error maps to its field (FE-79).
- `…/reporting-line-editor-schema.ts`. `reporting-line-section.tsx` must stay <300 lines, so the rows split into `reporting-line-rows.tsx`.
- The profile form's "Reports to" in `professional-info-section.tsx` / `edit-employee-form.tsx` becomes a read-only display with an "Edit reporting line" link that opens the sheet. The PATCH `reportingTo` write is removed (pending Q2).

## 4. Onboarding (PRD §7.2, §7.3)

**Single onboarding**
- `lib/validation/hr.ts`: `requireReportsTo` becomes `validateReportingChoice`. The manager is optional, top-level is exclusive with every manager field, and top-level requires a reason. `secondaryManagers` is capped by a runtime param via a `createOnboardEmployeeInputSchema(maxSecondary)` factory. `REPORTS_TO_REQUIRED_MESSAGE` is deleted along with its tests' assertion.
- `step-employment.tsx`: the label becomes "Primary reporting manager" with the helper "Assigned automatically by policy if left blank". It shows the selected name, designation and status. It gains secondary rows (when cap > 0) and the `PolicyMissingBanner`. The manager fields move to `components/hr/_onboarding/step-employment-reporting.tsx` so the step file stays under 300 lines.
- `step-review.tsx`: shows "Assigned by policy on submit" instead of "—" for a blank manager. It resolves names from candidates, not `useOrgMembersByIds` (which is `settings:view`-gated).
- `onboarding-wizard.tsx`: the success toast states the primary manager and its resolution: Selected, or "Assigned by fallback policy: <name>". `resolution` appears only when present.
- `components/hr/onboarding-payload.ts`: sends `secondaryManagers` and omits `reportingManagerUserId` when blank.

**Bulk onboarding**
- `features/hr/onboarding/bulk-onboard-columns.ts`:
  - `primaryManagerEmail` (required: false) replaces `reportingManagerEmail` in new templates;
  - it adds `secondaryManagerEmail1..3` and `effectiveFrom`;
  - the aliases `reportingManagerEmail`, `reportsTo`, `managerEmail`, "reports to" and "manager email" map to `primaryManagerEmail`.
- `bulk-onboard-template.ts` (validation): drops "manager required". It keeps top-level ⟂ managers, per-cell email format, self-link and duplicate-manager checks, and file-level duplicate employee emails. Browser validation stays advisory (PRD §10.2); the server preview is authoritative.
- `bulk-onboard-download.ts`: the Instructions sheet documents every new column and adds example rows for **selected**, **fallback (blank)** and **top-level**. A secondary column is marked valid only if the cap allows it; the org's cap is read from the policy.
- New `bulk-onboard-preview.ts` maps rows to `POST /hr/employees/onboard/bulk/preview`.
- `bulk-onboard-preview-table.tsx`:
  - `ReportingRowStatusBadge`;
  - a "Primary manager" column showing the name plus a `Fallback` chip naming the chosen person and the reason ("configured default" / "you, as uploader"), never "automatic";
  - `dependsOnRow` shown as "Waits on row N (email)";
  - codes and messages.
- `bulk-onboard-panel.tsx` (345 lines, over 300, so the step logic moves to `use-bulk-onboard-flow.ts`) follows the flow upload → client parse → server preview → explicit "Create N employees" confirm (Ready + Warning only) → result.
- `bulk-onboard-result-panel.tsx` shows created, skipped and failed counts, per-row status, a link to job history, and an "Download error report" `.xlsx` built via `downloadXlsx`. The report is client-side from the result, so no new endpoint is needed.

## 5. Staged import (PRD §7.4)

- `import-export-page.tsx:27-34`: the employees `columns` gain `primaryManagerEmail`, `secondaryManagerEmail1`-`3`, `topLevelRoleReason`, `effectiveFrom` and `clearPrimaryManager`. The description notes that "blank manager = no change for existing employees".
- `import-wizard-sheet.tsx`: the preview renders per-row manager resolution with `ReportingRowStatusBadge` and the same `Fallback` chip as bulk onboarding. That chip and column are promoted to `components/hr/reporting-lines/manager-resolution-cell.tsx` on the second consumer (FE-60). The file is at 378 lines, so the preview table extracts to `import-preview-rows.tsx`.
- The column documentation text is shared from `bulk-onboard-columns.ts` descriptions. It moves to `components/hr/reporting-lines/manager-columns.ts` so both features import it without feature→feature imports (FE-61).

## 6. Employee self-service (PRD §7.5)

`/settings` gains a "Reporting line" section, rendered only when `useModuleEnabled("hr")` and `/me/reporting-line` returns data. A 404 (no employment) hides the section; it does not show an error.

| Add | Purpose |
|---|---|
| `features/settings/reporting-line/my-reporting-line-section.tsx` | Primary and additional managers with badges (no reasons), plus "Report an issue" (disabled with an explanation while a request is active). |
| `…/report-reporting-issue-dialog.tsx` + `…-schema.ts` | `EntityFormDialog` (≤5 fields): reason 20-1000 characters with a live counter, optional suggested manager from `/me/.../manager-candidates` (no free-text email), and an optional effective date. `REQUEST_DUPLICATE_ACTIVE` (409) produces "You already have a request under review" and refetches. |
| `…/my-reporting-requests-list.tsx` | History with `ReportingRequestStatusBadge`, the reviewer reason, Cancel (`ConfirmDialog`) and "Respond" for MORE_INFO_REQUIRED. Infinite scroll uses a sentinel (FE-125). |
| `app/(authenticated)/settings/page.tsx` | Composes the section as a third `<section>`. |

## 7. HR review queue and drawer (PRD §7.5.4-6)

- Route: `app/(authenticated)/hr/employees/reporting-requests/page.tsx` + `loading.tsx`, gated on `requirePermission("hr:reporting-lines:review")`.
- `features/hr/reporting-managers/requests/reporting-requests-page.tsx`: a `DataTable` with cursor pagination (`TablePagination mode="cursor"`), a status `Select` in the URL (FE-86, AP-8), and `usePageState({permission:"hr:reporting-lines:review", error})`.
- `…/reporting-request-review-sheet.tsx` is the drawer. It is a `Sheet`, which becomes a Drawer below `md`. It shows the employee, current manager, suggested manager, employee reason and dates. The decision is one of Approve (manager picker defaulting to the suggestion, plus effective date), Reject (the reason is required and visible to the employee), Cancel as duplicate, or Request info. The review reason is required for every decision. Warnings come back as a toast plus inline text. `REQUEST_INVALID_TRANSITION` (409) produces "This request changed; reloaded" and a refetch.
- `…/review-decision-schema.ts`.

## 8. Bulk reporting-change wizard (PRD §7.6)

- Route: `app/(authenticated)/hr/employees/reporting-changes/page.tsx` + `loading.tsx` (`hr:reporting-lines:manage`). `…/reporting-changes/[jobId]/page.tsx` shows the job result and history (FE-05 param name).
- `features/hr/reporting-managers/bulk/`. Each file stays under 300 lines.
  - `bulk-reporting-change-wizard.tsx` runs three steps:
    - Source: select employees plus a new primary manager, or upload a mapping file (template via `downloadXlsx`, parse via papaparse/exceljs reusing `bulk-onboard-parse` mapping, which is promoted to `components/hr/reporting-lines/` on reuse).
    - Preview: the job reason ≥10 characters, a delta table (current → requested primary, secondary changes, changes in 24 h, status and codes), and the affected count.
    - Commit: a per-row reason input for every `requiresRowReason` row, and for `requiresConfirmation` a `ConfirmDialog` whose `content` is `ConfirmationPhraseInput` bound to `createConfirmationPhraseSchema(job.confirmationPhrase)`.
  - `bulk-reporting-change-preview-table.tsx` and `bulk-reporting-change-result.tsx` show committed and failed counts and "Download failures (CSV)" (`GET …/failures.csv`).
  - `bulk-reporting-jobs-table.tsx` shows job history.
- Entry point: the "Bulk reporting change" action on `/hr/employees` (page header, gated on `useCan("hr:reporting-lines:manage")`) and on Manager Coverage.

## 9. Manager Coverage labels and actions (PRD §9)

- `features/hr/employees/manager-coverage-page.tsx`:
  - the stat cards gain "Temporary fallback" and "Pending employee review";
  - a `PolicyMissingBanner` shows when `policyMissing`;
  - top-level employees are listed as intentional, not as defects.
- There are now 6 categories, and more than 4 tabs overflow at 768 px (AP-8). The tab strip becomes a `Select` of categories held in the URL `?view=`.
- `AssignManagerCell` switches from `useUpdateProfile` to the editor sheet (§3), because a plain combobox cannot carry a reason or date.
- The fallback rows get Replace and Confirm actions. The pending rows link to the review drawer.
- The file is at 250 lines and will exceed 300, so the column definitions move to `manager-coverage-columns.tsx`.
- Block 1 already done: circular chains show names (`manager-coverage-names.ts`).

## 10. PAGES.md, nav, permissions

- `frontend/PAGES.md` gets a row for each of:
  - `/hr/settings/reporting-managers`;
  - `/hr/employees/reporting-requests`;
  - `/hr/employees/reporting-changes`;
  - `/hr/employees/reporting-changes/[jobId]`.

  It also updates the existing rows for `/settings`, `/hr/employees/manager-coverage`, `/hr/employees/[employeeId]` (reporting-line editor), `/hr/onboarding` (bulk preview) and `/hr/settings/import-export`.
- Nav (`sidebar-nav-routes-hr-foundation.ts`, under Employees):
  - "Reporting requests" (`hr:reporting-lines:review`);
  - "Reporting changes" (`hr:reporting-lines:manage`);
  - HR settings as in §2.

  `sidebar-permission-coverage.test.ts` and `lib/hrms-static-routes.test.tsx` cover these automatically. Each route needs `loading.tsx` with an h1.
- Permissions: the three keys are **done** (Block 1). `catalog-sync.test.ts` "no phantom" and "no ghost" stay red on exactly these 3 keys until the main agent regenerates `contracts/permission-catalog.json` (Block 3). `lib/rbac/route-access` gets decisions for the new routes if `check:route-access-contract` requires them.

## 11. Tests (PRD §11 frontend line)

| Criterion | Test file |
|---|---|
| Form validation | `lib/validation/hr-reporting.test.ts`: the manager is optional; top-level ⟂ manager/secondary; the reason is required; the secondary cap boundary 0/1/3. Plus `report-reporting-issue-schema.test.ts` for 19/20/1000/1001 characters. |
| Top-level toggle | `components/hr/_onboarding/step-employment-reporting.test.tsx`. Toggling on disables and clears primary and secondary, and the reason is required. Toggling off re-enables them. This replaces `step-employment-reports-to.test.tsx`. |
| Fallback preview | `features/hr/onboarding/bulk-onboard-preview-table.test.tsx` and `manager-resolution-cell.test.tsx`. The chip names the resolved person and resolution, and the word "automatic" never appears. |
| Bulk-row diagnostics | The preview test covers Ready/Warning/Error/Skipped plus the "waits on row N" text and codes. `bulk-onboard-columns.test.ts` covers the aliases. The instructions test covers the canonical columns and the three example rows. |
| Accessible manager selection | `components/hr/reporting-lines/manager-candidate-picker.test.tsx`. It is keyboard-only: open, type, arrow and Enter. It checks the accessible name, that the excluded subject is absent, that inactive candidates are absent, and the live "no matches" status. |
| Request lifecycle | `my-reporting-line-section.test.tsx`: create → pending chip → duplicate 409 → cancel. `reporting-request-review-sheet.test.tsx` covers each decision payload, the reject reason being required, and the 409 transition. |
| Change-warning UI | `reporting-line-change-warning.test.tsx`: under the threshold there is no warning; at threshold+1 the warning shows, the reason is required and submit is disabled without override. Paired positive and negative (FE-122). |
| Gates | Paired `useCan` negative and positive tests on each control. `usePageState` receives `error` (402 path). There are denial tests for the queue. |
| Idempotency | `employee-profile.bulk-onboard.test.ts`: a retry with the same rows reuses the key, and a success followed by a resend mints a new one. |
| Block 1 (done) | `bulk-onboard-parse.test.ts`, `manager-coverage-names.test.ts`, `reporting-lines-presentational.test.tsx`. |

Run: `cd frontend && nice -n 15 npx jest <paths> --maxWorkers=2`, then `type-check`, `type-check:specs` and the gates named by touched rules (`check:page-state-usage`, `check:gated-reads`, `check:empty-states`, `check:named-handlers`, `check:over-300`, `check:type-assertions`, `check:response-contracts`, `check:contract-parity`).

## 12. Accessibility plan (375 / 768 / 1280)

| Surface | 375 | 768 | 1280 |
|---|---|---|---|
| Manager picker | The popover is a `ResponsivePopover` Drawer (FE-111). The option shows name, designation and state; the email wraps. | Popover, full field width. | Same. |
| Editor / review sheet | Full-height Drawer, footer actions sticky; the fields stack in one column. | Sheet at `sm` width. | Sheet at `md` width with a two-column old→new preview. |
| Preview tables (bulk / import / job) | `DataTable` scrolls horizontally inside its card (never the page). The status and name columns come first, and codes wrap under the status. | Same, fewer hidden columns. | All columns. |
| Coverage | A category `Select` replaces the tabs, and `StatCardGrid` goes to 2 columns. | Select plus a 3-column grid. | Select plus a 6-column grid. |
| Settings section | Single column; the "Report an issue" button is full width. | — | — |

For keyboard and assistive technology:
- Every icon-only control gets an `aria-label` (FE-117).
- The status badges carry a text label, never colour alone.
- The fallback chip is text.
- The warning callout is `role="status"`, and `role="alert"` only on a blocking server error.
- The confirmation-phrase hint is wired through `aria-describedby` (done).
- Focus returns to the invoking control when a sheet or dialog closes.
- The primary action in the change warning is not autofocused.
- Numeric cells use `tabular-nums` (FE-103).

A browser pass at the three widths is required (FE-120, FE-123), because jsdom cannot verify overflow or focus order.

## 13. Open questions / objections to CONTRACT §4/§5

1. **Q1, manager picker search.** `MemberPicker` filters `candidates` client-side and owns its search box, but `manager-candidates` is server-searched and capped at 20. Two options:
   - (a) add an optional `onSearchChange` to `components/members/member-picker.tsx`. It is a shared file outside the ownership list, 485 lines, and needs a split;
   - (b) build `components/hr/reporting-lines/manager-candidate-picker.tsx` on the same `Command`/`ResponsivePopover` primitives. That is a second picker, which FE-59 frowns on.

   The recommendation is (a), with the main agent's approval.
2. **Q2, second writer.** `PATCH /hr/employees/:id {reportingTo}` (profile form, coverage cell) still writes the manager. Is it routed through `ReportingRelationshipService` with `source=MANUAL` (Agent B), or retired? The frontend plan stops using it either way, but the contract should say which.
3. **Q3, circular names.** §4.7 extends coverage but keeps `circular: [{userIds}]`. Please add `members: [{userId, name}]` (or `names`). The Block 1 fix resolves names through `settings:view`-gated member lookup, so an HR user without `settings:view` sees "Unnamed employee".
4. **Q4, bulk-onboard preview resolution names.** In §4.20, `primaryManager.name` is required. For `IN_FILE` it should be the row's first and last name, which is fine. Please confirm that `userId` is null for an in-file manager not yet created, so the UI does not link it.
5. **Q5, `permittedActions` vs `useCan`.** §4.3 returns `permittedActions`. The frontend will require both, so a scope-denied object hides controls. Please confirm that `permittedActions.override` reflects org owner/admin standing, not only the key.
6. **Q6, the coverage `pendingReview` payload** has no current manager. That is fine for a list, but the drawer reads `GET /hr/reporting-manager-requests/:id`. A user with `hr:employees:view` but without `review` would see pending rows that link nowhere. The plan is to render them without a link unless `useCan("hr:reporting-lines:review")`.
7. **Q7, the bulk-job `rows` pagination** uses a `rowCursor` inside the job read, with no total, so the preview table uses `TablePagination mode="cursor"`. The confirmation count comes from `rowCount`, which is fine. Please confirm that `readyCount + warningCount` is the "affected" number that `confirmationPhrase` encodes.
8. **Q8, `/me/reporting-line` for a non-employee** (no employment). Please confirm it returns 404 (the frontend hides the section) rather than 200 with nulls, which would read as "no manager".
9. **Q9, the effective date default.** The contract says "org-local import date" server-side. The frontend will omit `effectiveFrom` when the user doesn't pick one, rather than sending the browser's date (host-timezone trap).
10. **Q10, the frontend-only relationship label length (≤60)** and reason bounds are mirrored in the Zod schemas as advisory. The server stays authoritative. Please confirm the exact bounds of `topLevelReason` on PUT §4.4 (1..500 as in §1.3?).

## 14. Block 1 deliverables (committed)

| Commit | Files |
|---|---|
| Split the bulk onboarding template (no behaviour change) | `features/hr/onboarding/bulk-onboard-{columns,parse,template}.ts` + importers + `bulk-onboard-parse.test.ts` |
| Narrow instead of asserting (ledger entry retired) | `bulk-onboard-parse.ts`, `bulk-onboard-template.ts`, `scripts/assertion-ceiling-ledger.json` |
| Frontend permission keys | `lib/rbac/permissions/hr.ts`, `permission-key-foundation.ts` |
| Coverage circular chains show names | `features/hr/employees/manager-coverage-{names.ts,names.test.ts,page.tsx}` |
| Presentational components | `components/hr/reporting-lines/{reporting-status-badge,reporting-relationship-badge,confirmation-phrase-input}.tsx`, `confirmation-phrase-schema.ts`, test |
