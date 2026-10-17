# HRMS and Payroll test catalog

This catalog is the manual and automated test inventory for StreamlineOS **HRMS OS** (people, attendance, leave, recruitment, and the employee self-service surfaces those depend on) and **Payroll OS**. It was derived from the Next.js App Router, the feature and hook graph that each page actually imports, and the vendored OpenAPI contract `frontend/contracts/openapi.json` (OpenAPI 3.0.0, `4429` operations). Operation ids are NestJS controller methods (`RunsController_create`, `ProfilesController_list`, and so on) and `x-permission` is the backend `@RequirePermission` key.

The GitHub repository `Startupppp/streamlineos-backend` returned 404 to this environment's token, so controller source was not re-read from that remote. The vendored spec is the contract the frontend build already pins. Where a page calls a path the spec does not contain, the row is flagged `CONTRACT_GAP` rather than guessed.

Application code was not modified.

## How the suites map to deploys

| When | What to run | Filter | Intent |
| --- | --- | --- | --- |
| Every deploy, before traffic | Smoke | `suite=smoke` AND `priority=P0` | Critical path only. One happy-path load per route in the smoke set: hubs, directory, onboarding, attendance, leave, approvals, recruitment pipeline through offer, public apply and offer accept, payroll command center, readiness, run list and run detail, salary profiles, inputs, payslips, bank transfers, settings, setup, and My Pay. |
| Every deploy, can finish after smoke starts | Bulk guards that move money or create people | `suite=bulk` AND `priority=P0` | Bulk onboard, reporting-line commit, candidate import, sequence enroll, payout return file, run create idempotency, input reimport. |
| Nightly, and on any HR or payroll pull request | Full regression | `suite=regression` | Positive, empty, error, permission, filter, strict-query, and boundary cases, plus the no-dead-route and no-dead-button pass. |
| Nightly, release candidate | Cross-module flows | `suite=e2e` | Hire to payslip, attendance to payable days, leave to payroll, expense to reimbursement, exit to final settlement, run lifecycle. The same cross-module ids exist in both CSVs so each module owner can run them. Count those ids once when you add the two files together. |
| Release candidate, and after any auth change | Security-adjacent | `type=security-adjacent` | Denied roles, cross-tenant ids, sensitive fields, public tokens, separation of duties on payroll approval. |
| Not a deploy gate | P2 rows | `priority=P2` | Secondary reports, email-report throttle, holiday edge. Run on the weekly pass. |

Smoke stays small on purpose. A route that is not in the smoke set still has a regression row that opens it directly, so a dead page fails nightly even when it is not on the deploy gate.

Suggested automation order: Playwright for `suite=smoke` and the no-dead-route rows (visit, assert h1, assert no error boundary, assert the primary request URL). Contract tests for strict cursor queries and write boundaries can hit the API with the same payloads as `test_data`. End-to-end rows need the fixture tenant described below and should stay in a nightly project, not the deploy gate, except the P0 bulk rows named above.

## Fixture tenant

- Tenant QA-A with HRMS and Payroll modules on, and a second tenant QA-B used only for cross-tenant probes.
- Users: Employee (self-service only), Manager, HR Admin (HR keys, no payroll approve), Payroll Admin, Payroll Approver (different person from the admin), Recruiter.
- One ACTIVE salary profile, one employee with no profile, one exited employee, one published payslip, one draft run and one locked run, one open job, one candidate, one pending leave.
- Do not reuse production tenants. Money, invites, and bank files in these cases are fixtures.

## Columns

| Column | Meaning |
| --- | --- |
| id | Stable id. `HRMS-*` and `PAY-*`. Shared cross-module flows are generated in both files and share the same numeric suffix only by coincidence; match on `route` + `element_or_api` when deduplicating, or treat each file as standalone. |
| module | `HRMS` or `Payroll`. |
| route | App Router path. Cross-module rows name the chain. |
| element_or_api | Control label and/or `METHOD path` plus NestJS `operationId` and permission when the spec has them. |
| steps | Manual steps. Bracket params are replaced with fixture ids. |
| test_data | Concrete values and the constraint they are probing. |
| expected_result | Observable result, including the failure that should be caught. |
| type | `smoke`, `regression`, `e2e`, or `security-adjacent`. |
| priority | `P0` deploy-relevant, `P1` nightly, `P2` weekly. |
| suite | `smoke`, `regression`, `e2e`, `bulk`. Bulk rows keep `type=regression` because the column `type` is limited to the four values above. |
| area | Feature area for slicing the regression suite. |
| permission | Page `requirePermission` when present, otherwise keys observed on the hook. |
| flags | Defect suspicions. Empty means no static signal. |

## Counts

Pages in scope: **175** (HRMS 149, Payroll 26).

OpenAPI operations indexed: **4429**. HR-prefixed paths and payroll-prefixed paths were both matched per call; only calls reachable from a page closure are catalogued, not every backend route.

### HRMS (`qa/hrms-test-catalog.csv`)

| Suite (filter `suite`) | Rows |
| --- | ---: |
| smoke | 23 |
| regression | 1621 |
| e2e | 11 |
| bulk | 13 |
| **Total rows** | **1668** |

| Type (filter `type`) | Rows |
| --- | ---: |
| smoke | 23 |
| regression | 1624 |
| e2e | 11 |
| security-adjacent | 10 |

| Priority | Rows |
| --- | ---: |
| P0 | 494 |
| P1 | 1172 |
| P2 | 2 |

| Area | Rows |
| --- | ---: |
| attendance | 115 |
| hr-settings | 179 |
| hrms-ops | 544 |
| leave | 65 |
| lifecycle | 93 |
| onboarding | 51 |
| payroll-inputs | 1 |
| people | 155 |
| recruitment | 465 |

### Payroll (`qa/payroll-test-catalog.csv`)

| Suite (filter `suite`) | Rows |
| --- | ---: |
| smoke | 12 |
| regression | 329 |
| e2e | 10 |
| bulk | 5 |
| **Total rows** | **356** |

| Type (filter `type`) | Rows |
| --- | ---: |
| smoke | 12 |
| regression | 321 |
| e2e | 10 |
| security-adjacent | 13 |

| Priority | Rows |
| --- | ---: |
| P0 | 127 |
| P1 | 229 |

| Area | Rows |
| --- | ---: |
| attendance | 1 |
| leave | 1 |
| lifecycle | 2 |
| payroll-inputs | 95 |
| payroll-ops | 115 |
| payroll-runs | 26 |
| payroll-setup | 86 |
| payslips | 30 |

Combined row count if you concatenate both files: **2024**. Cross-module e2e rows are duplicated on purpose.

## Route inventory

A page is in scope when its App Router path is under HR, recruitment, the public career/offer/interview/application surfaces, employee onboarding, the `/me` self-service pages, payroll, or the timesheet payroll bridge.

Sidebar coverage is taken from `sidebar-nav-routes-hr-*`, `sidebar-nav-groups-payroll.ts`, `sidebar-nav-groups-recruitment.ts`, and `sidebar-home-nav.ts`. `HIDDEN_FROM_NAV` means some other file links to the route. `NO_INBOUND_LINK` means the path string was not found outside its own `page.tsx`.

### Dead-nav check

Every in-scope sidebar href resolves to a page.tsx.

### Flag rollup

HRMS pages:

- NO_PAGE_PERMISSION_GATE: 56
- HIDDEN_FROM_NAV: 25
- NAV_HUB: 2
- CONTRACT_GAP: 1

Payroll pages:

- NO_PAGE_PERMISSION_GATE: 4
- HIDDEN_FROM_NAV: 1
- NOT_IMPLEMENTED_COPY: 1

### Top risks

1. **Interview bulk reschedule is not a bulk API.** `useBulkRescheduleInterviews` fires `PATCH /hr/recruitment/interviews/{interviewId}` in `Promise.all`. A mid-list 409 rejects the promise after earlier patches have already moved interviews. There is no transaction and no server max. Case `bulk` on `/recruitment/interviews`. Flag `PARTIAL_BULK_NO_TRANSACTION`.
2. **Bulk onboard seat limit.** Preview must surface `SEAT_LIMIT` and seat arithmetic. Confirming a file that does not fit must not 402 after creating a subset the preview called ready. `employees` maxItems is 100.
3. **Salary profile list is a strict cursor query.** `GET /payroll/employees` (`ProfilesController_list`, `payroll:salaries:view`) allows `cursor, limit, search, workerType, status, costCenter`. `page=1` is a 400. The catalog treats every cursor-and-not-page list the same way.
4. **Workflow settings list is a cursor page.** `GET /hr/workflows` returns `{ data, pagination: { limit, hasMore, nextCursor } }`. An offset contract blanks `/hr/settings/workflows`.
5. **My Pay missing profile.** A worker with no salary profile is `{ setupRequired: true }`, not a route-level error. `/me/pay` has a dedicated case.
6. **Onboarding pay preview must match the saved split.** The wizard reads the org salary-structure template. A hardcoded 50/25/25 preview against a 40/20 (or template) write is a failure of the hire-to-payslip flow.
7. **Attendance regularization window.** `POST /me/attendance/regularizations` requires `attendanceDate` and a `reason` of 10–500 characters, and the product rule rejects dates outside ±30 days, future dates, and times that are not on that date. The date pattern alone does not encode the window; the e2e case does.
8. **Final settlement crosses both modules.** Resignation, exit, asset return, `/hr/fnf`, `/payroll/fnf`, and a `FINAL_SETTLEMENT` run must agree. A person can be employed and still not payable; the timesheet bridge case covers that.
9. **India annual certificate is explicitly not implemented.** `/payroll/taxes` may render "full certificate not implemented". A control that claims to download one is a defect. Flag `NOT_IMPLEMENTED_COPY`.
10. **Directory bulk update does not exist.** People bulk write is onboard plus reporting-line jobs. Candidate bulk shortlist/reject and sequence enroll (max 100) are the recruitment bulk writes. `POST /hr/integrations/send-email` accepts one `to`, not a list.
11. **Pages with no `requirePermission` in `page.tsx`** still need a denial check. The feature may gate later; if an employee standing can read the admin payload, the row fails. Count: 60.
12. **Hidden routes.** 26 in-scope pages are absent from the sidebar. They are still tested. A page with `NO_INBOUND_LINK` is the strongest dead-route suspicion. Most recruitment omissions are linked from `/recruitment/settings` rather than the Recruitment OS sidebar, so they are hidden, not 404s.
13. **Assets export path is not in the contract.** `/hr/settings/import-export` offers an assets card whose `exportEndpoint` is `GET /hr/export/assets`. That path is not in the vendored spec. HR export jobs that do exist are `POST /hr/export/jobs`. Treat the assets card as unwired until a download from it returns a file.

### Pages with no discovered API

None. Every page closure contained at least one API call.

### Contract gaps (frontend path not in the vendored spec)

- `/hr/settings/import-export`: GET /hr/export/assets

### Not-implemented copy

- `/payroll/taxes`

### Hidden or unlinked routes

- `/employee-onboarding` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/hr/documents/editor/new` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/hr/documents/templates` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/hr/documents/templates/new` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/hr/onboarding/probation` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/payroll/setup` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/automations` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/bgv-compliance` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/candidates/import` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/developer` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/diversity-report` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/email-sequences` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/headcount` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/hiring-flows` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/integrations` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/interviewer-performance` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/jobs/new` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/offer-templates` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/question-bank` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/refer` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/reports` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/requisitions` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/scorecard-analytics` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/scorecard-templates` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/sla` — HIDDEN_FROM_NAV; sidebar: not in sidebar
- `/recruitment/sla-report` — HIDDEN_FROM_NAV; sidebar: not in sidebar

## HRMS routes

### `/application-status/[applicationToken]`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-REG-0001, HRMS-REG-0002, HRMS-REG-0003, HRMS-REG-0004, HRMS-REG-0005, HRMS-REG-0006.
- APIs: GET `/public/application-status/{param}` PublicController_applicationStatus
- Controls: `Choose an interview time`, `View your offer`

### `/careers/[orgSlug]`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-SMK-0001, HRMS-REG-0007, HRMS-REG-0008, HRMS-REG-0009, HRMS-REG-0010, HRMS-REG-0011.
- APIs: GET `/public/careers/{param}/jobs` PublicController_listOrgJobs
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/careers/[orgSlug]/jobs/[jobId]/apply`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-SMK-0002, HRMS-REG-0012, HRMS-REG-0013, HRMS-REG-0014, HRMS-REG-0015, HRMS-REG-0016, HRMS-REG-0017, HRMS-REG-0018, HRMS-REG-0019.
- APIs: GET `/public/careers/{param}/jobs/{param}` PublicController_getOrgJob; POST `/public/careers/{param}/jobs/{param}/apply` PublicController_applyToOrgJob
- Controls: `Submit application`, `Track my application`, `View other openings`

### `/employee-onboarding`

- Area: people. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0003, HRMS-REG-0020, HRMS-REG-0021, HRMS-REG-0022, HRMS-REG-0023, HRMS-REG-0024, HRMS-REG-0025, HRMS-REG-0026, HRMS-REG-0027, HRMS-REG-0028, HRMS-REG-0029, HRMS-E2E-0009.
- APIs: GET `/onboarding/requirements` OnboardingController_getRequirements; POST `/onboarding/complete` OnboardingController_complete; GET `/onboarding/bank-details` OnboardingController_getBankDetails; GET `/onboarding/personal-details` OnboardingController_getPersonalDetails; GET `/onboarding/session` OnboardingController_getOnboardingSession
- Controls: `Onboarding steps`, `Skip for now`, `Back`, `Edit`

### `/hr`

- Area: hrms-ops. Permission gate: hr:employees:view | hr:documents:view | self:onboarding-docs | hr:onboarding:manage. Sidebar: Hub.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0004, HRMS-REG-0030, HRMS-REG-0031, HRMS-REG-0032, HRMS-REG-0033, HRMS-REG-0034.
- APIs: GET `/hr/hub` HrHubController_getSnapshot; GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view); GET `/hr/documents/stats` DocumentsController_documentStats (hr:documents:view); GET `/hr/leave-policies` LeavePoliciesController_list (hr:leaves:view); GET `/hr/policies` HrPoliciesController_list (hr:policies:view); GET `/hr/shifts` ShiftsController_list (hr:attendance:view); GET `/hr/service-delivery/ops-inbox` ServiceDeliveryController_getOpsInbox (hr:cases:view); GET `/hr/service-delivery/my-items` ServiceDeliveryController_getMyItems (hr:helpdesk:view)
- Controls: `Create announcement`, `Review approvals`, `Onboard employee`, `Retry`, `Dismiss setup checklist`

### `/hr/access`

- Area: hr-settings. Permission gate: hr:access:view. Sidebar: HR access.
- Flags: none.
- Cases: HRMS-REG-0035, HRMS-REG-0036, HRMS-REG-0037, HRMS-REG-0038, HRMS-REG-0039, HRMS-REG-0040, HRMS-REG-0041, HRMS-REG-0042, HRMS-REG-0043, HRMS-REG-0044, HRMS-REG-0045, HRMS-REG-0046, HRMS-REG-0047.
- APIs: GET `/module-access/{param}/me/permissions` ModuleAccessController_getCallerPermissions; GET `/module-access/{param}/catalog` ModuleAccessController_catalog; GET `/module-access/{param}/audit-log` ModuleAccessController_getAuditLog; GET `/module-access/{param}/groups` ModuleAccessController_listGroups; PATCH `/module-access/{param}/groups/{param}` ModuleAccessController_renameGroup; DELETE `/module-access/{param}/groups/{param}` ModuleAccessController_deleteGroup; POST `/module-access/{param}/groups` ModuleAccessController_createGroup; PUT `/module-access/{param}/groups/{param}/permissions` ModuleAccessController_setGroupPermissions; GET `/module-access/{param}/groups/{param}/members` ModuleAccessController_listGroupMembers; POST `/module-access/{param}/groups/{param}/members` ModuleAccessController_addGroupMember; DELETE `/module-access/{param}/groups/{param}/members/{param}` ModuleAccessController_removeGroupMember; GET `/module-access/{param}/members` ModuleAccessController_listMembers; POST `/module-access/{param}/members` ModuleAccessController_addMember; PATCH `/module-access/{param}/members/{param}` ModuleAccessController_updateMemberGroups; DELETE `/module-access/{param}/members/{param}` ModuleAccessController_removeMember; GET `/module-access/{param}/members/{param}/grants` UserPermissionGrantsController_list; PUT `/module-access/{param}/members/{param}/grants` UserPermissionGrantsController_set; GET `/module-access/{param}/ownership` ModuleAccessController_getOwnership; POST `/module-access/{param}/ownership/transfer` ModuleAccessController_initiateOwnershipTransfer; DELETE `/module-access/{param}/ownership/transfer` ModuleAccessController_cancelOwnershipTransfer
- Controls: `Audit log`, `Roles`, `Members`, `Ownership`, `New group`, `Add member`, `Cancel`, `Rename`, `Delete group`, `Rename group`, `handleOpenChange(false)} disabled= > Cancel`, `Create`, `Members ( )`, `Reset`, `Save`, `Permissions`, `About`, `Add`, `handleClose(false)} disabled= > Cancel`, `Remove`, `Save grants`, `Transfer ownership`, `handleCloseTransfer(false)} disabled= > Cancel`, `Transfer`, `void auditQuery.refetch()} > Retry`, `Close`

### `/hr/accommodations`

- Area: hrms-ops. Permission gate: hr:accommodations:view. Sidebar: Accommodations.
- Flags: none.
- Cases: HRMS-REG-0048, HRMS-REG-0049, HRMS-REG-0050, HRMS-REG-0051, HRMS-REG-0052, HRMS-REG-0053, HRMS-REG-0054, HRMS-REG-0055, HRMS-REG-0056, HRMS-REG-0057, HRMS-REG-0058, HRMS-REG-0059, HRMS-REG-0060, HRMS-REG-0061.
- APIs: GET `/hr/enterprise/ops/accommodations` AccommodationsController_list (hr:accommodations:view); POST `/hr/enterprise/ops/accommodations` AccommodationsController_create (hr:accommodations:manage); GET `/hr/enterprise/ops/accommodations/{param}` AccommodationsController_getById (hr:accommodations:view); GET `/hr/enterprise/ops/accommodations/{param}/tasks` AccommodationsController_listTasks (hr:accommodations:view); POST `/hr/enterprise/ops/accommodations/{param}/approve` AccommodationsController_approve (hr:accommodations:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Create accommodation request`, `Has confidential note`, `Create Request`, `Approve`, `Approval note`

### `/hr/analytics`

- Area: hrms-ops. Permission gate: hr:analytics:read. Sidebar: People analytics.
- Flags: none.
- Cases: HRMS-REG-0062, HRMS-REG-0063, HRMS-REG-0064, HRMS-REG-0065, HRMS-REG-0066, HRMS-REG-0067, HRMS-REG-0068.
- APIs: GET `/hr/analytics` HrAnalyticsController_overview (hr:analytics:read); GET `/hr/analytics/attrition` HrAnalyticsController_attrition (hr:analytics:read); GET `/hr/analytics/attendance` HrAnalyticsController_attendance (hr:analytics:read); GET `/hr/analytics-plus` HrAnalyticsPlusController_getCommandCenter (hr:analytics:read); GET `/hr/analytics-plus/attrition` HrAnalyticsPlusController_getAttrition (hr:analytics:read); GET `/hr/analytics-plus/leave-trends` HrAnalyticsPlusController_getLeaveTrends (hr:analytics:read); GET `/hr/analytics-plus/engagement` HrAnalyticsPlusController_getEngagement (hr:analytics:read); GET `/hr/analytics-plus/performance-distribution` HrAnalyticsPlusController_getPerformanceDist (hr:analytics:read); GET `/hr/analytics-plus/compliance-gaps` HrAnalyticsPlusController_getComplianceGaps (hr:analytics:read); GET `/hr/analytics-plus/payroll-cost` HrAnalyticsPlusController_getPayrollCost (hr:analytics:read); GET `/hr/analytics-plus/drilldown` HrAnalyticsPlusController_getDrilldown (hr:analytics:read); GET `/hr/leaves/analytics` LeavesController_analytics (hr:leaves:view); GET `/me/org-display` MeController_getOrgDisplay
- Controls: `Date range`, `View attrition details`, `View leave details`, `View mood details`, `View compliance details`

### `/hr/announcements`

- Area: hrms-ops. Permission gate: hr:announcements:manage | hr:employees:view | hr:employees:manage. Sidebar: Announcements.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0069, HRMS-REG-0070, HRMS-REG-0071, HRMS-REG-0072, HRMS-REG-0073, HRMS-REG-0074, HRMS-REG-0075, HRMS-REG-0076, HRMS-REG-0077, HRMS-REG-0078, HRMS-REG-0079, HRMS-REG-0080.
- APIs: GET `/org/announcements` AnnouncementsController_list; GET `/org/announcements/all` AnnouncementsController_listAll (hr:announcements:manage); DELETE `/org/announcements/{param}` AnnouncementsController_remove (hr:announcements:manage); POST `/org/announcements/{param}/read` AnnouncementsController_markRead; POST `/org/announcements` AnnouncementsController_create (hr:announcements:manage); PATCH `/org/announcements/{param}` AnnouncementsController_update (hr:announcements:manage); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); GET `/org-hierarchy/branches/options` OrgHierarchyController_listOrgBranchOptions (branch:view); GET `/roles` RolesController_list (settings:rbac:manage)
- Controls: `Published`, `All`, `New Announcement`, `Publish time`, `Expiry time`, `Edit announcement`, `Pinned`, `Delete announcement`

### `/hr/approvals`

- Area: hrms-ops. Permission gate: hr:workflows:view | hr:workflows:manage | hr:workflows:approve | self:leaves. Sidebar: Action Center.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0005, HRMS-REG-0081, HRMS-REG-0082, HRMS-REG-0083, HRMS-REG-0084, HRMS-REG-0085, HRMS-REG-0086, HRMS-REG-0087.
- APIs: GET `/hr/workflows/instances/{param}` HrWorkflowInstancesController_getDetail (hr:workflows:view); POST `/hr/workflows/instances/{param}/approve` HrWorkflowInstancesController_approve (hr:workflows:approve); POST `/hr/workflows/instances/{param}/reject` HrWorkflowInstancesController_reject (hr:workflows:approve); GET `/hr/workflows/delegations/mine` HrWorkflowDelegationsController_myDelegations (hr:workflows:view); POST `/hr/workflows/delegations` HrWorkflowDelegationsController_create (hr:workflows:view); DELETE `/hr/workflows/delegations/{param}` HrWorkflowDelegationsController_remove (hr:workflows:view); GET `/hr/workflows/instances/inbox` HrWorkflowInstancesController_inbox (hr:workflows:approve); GET `/hr/workflows/instances/acted` HrWorkflowInstancesController_acted (hr:workflows:approve); GET `/me/approvers/{param}` ApprovalAuthorityController_myApprover; PUT `/hr/leaves/{param}/approve` LeavesController_approve (hr:leaves:approve); PUT `/hr/leaves/{param}/reject` LeavesController_reject (hr:leaves:approve); PATCH `/hr/wfh/{param}` WfhController_update (hr:attendance:manage); GET `/hr/wfh/pending` WfhController_pending (hr:attendance:manage); POST `/hr/attendance/regularizations/{param}/apply` AttendanceRegularizationController_apply (hr:attendance:manage); POST `/hr/attendance/regularizations/{param}/reject` AttendanceRegularizationController_reject (hr:attendance:manage); GET `/hr/attendance/regularizations` AttendanceRegularizationController_list (hr:attendance:view); PATCH `/hr/expenses/{param}` ExpensesController_update (hr:expenses:approve); GET `/me/expenses` EmployeeExpensesController_pageData (self:expenses); GET `/hr/expenses/page-data` ExpensesController_pageData (hr:expenses:view); GET `/hr/leaves/team` LeavesController_team (hr:leaves:view); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view)
- Controls: `My delegations`, `Acted`, `Confirm Reject`, `Cancel`, `Approve`, `Reject`, `Add Delegation`, `Affects cutoff`, `Filter by request type`, `Filters`, `Approve selected`, `Reject selected`, `Clear selection`, `Retry`

### `/hr/asset-returns`

- Area: lifecycle. Permission gate: hr:assets:view. Sidebar: Asset Returns.
- Flags: none.
- Cases: HRMS-REG-0088, HRMS-REG-0089, HRMS-REG-0090, HRMS-REG-0091, HRMS-REG-0092, HRMS-REG-0093, HRMS-REG-0094, HRMS-REG-0095, HRMS-REG-0096, HRMS-REG-0097, HRMS-REG-0098, HRMS-REG-0099, HRMS-REG-0100.
- APIs: GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/assets` AssetInventoryController_list (hr:assets:view); GET `/hr/asset-returns` HrAssetsController_listAssetReturns (hr:assets:view); POST `/hr/asset-returns` HrAssetsController_createAssetReturn (hr:assets:manage); PATCH `/hr/asset-returns/{param}` HrAssetsController_updateAssetReturn (hr:assets:manage)
- Controls: `Log Return`, `Mark returned`, `Change`, `Condition`

### `/hr/assets`

- Area: lifecycle. Permission gate: hr:assets:view. Sidebar: Assets.
- Flags: none.
- Cases: HRMS-REG-0101, HRMS-REG-0102, HRMS-REG-0103, HRMS-REG-0104, HRMS-REG-0105, HRMS-REG-0106, HRMS-REG-0107, HRMS-REG-0108, HRMS-REG-0109, HRMS-REG-0110, HRMS-REG-0111, HRMS-REG-0112, HRMS-REG-0113, HRMS-REG-0114.
- APIs: GET `/hr/assets` AssetInventoryController_list (hr:assets:view); POST `/hr/assets` AssetInventoryController_create (hr:assets:manage); PATCH `/hr/assets/{param}` AssetInventoryController_update (hr:assets:manage); PATCH `/hr/assets` AssetInventoryController_assign (hr:assets:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/access-requests` AccessRequestsController_list (hr:assets:view); POST `/hr/access-requests` AccessRequestsController_create (hr:assets:manage); PATCH `/hr/access-requests/{param}` AccessRequestsController_update (hr:assets:manage)
- Controls: `Export`, `Register Asset`, `Request Access`, `handleGrant(req.id)} isPending= > Grant`, `Revoke`, `Submit Request`, `Unassign Employee`, `Retire asset`, `Filter by status`, `Filter by type`, `Filter by assignment`

### `/hr/attendance`

- Area: attendance. Permission gate: hr:attendance:view. Sidebar: Attendance.
- Flags: none.
- Cases: HRMS-SMK-0006, HRMS-REG-0115, HRMS-REG-0116, HRMS-REG-0117, HRMS-REG-0118, HRMS-REG-0119, HRMS-REG-0120, HRMS-REG-0121, HRMS-REG-0122, HRMS-REG-0123, HRMS-REG-0124, HRMS-REG-0125, HRMS-REG-0126, HRMS-BLK-0013.
- APIs: GET `/me/preferences` MeController_getMyPreferences; GET `/me/org-display` MeController_getOrgDisplay; GET `/me/attendance/status` EmployeeAttendanceController_status (self:attendance); POST `/me/attendance/check-in` EmployeeAttendanceController_checkIn (self:attendance); POST `/me/attendance/check-out` EmployeeAttendanceController_checkOut (self:attendance); POST `/me/attendance/break` EmployeeAttendanceController_toggleBreak (self:attendance); GET `/hr/attendance/monthly` AttendanceController_monthly (hr:attendance:view); GET `/me/attendance/monthly` EmployeeAttendanceController_monthly (self:attendance); GET `/me/attendance/history` EmployeeAttendanceController_history (self:attendance); GET `/me/attendance/logs` EmployeeAttendanceController_logs (self:attendance); GET `/hr/attendance/team-status` AttendanceController_teamStatus (hr:attendance:view); POST `/me/attendance/regularizations` EmployeeAttendanceController_createRegularization (self:attendance); GET `/hr/holidays/calendar` HrHolidaysController_calendar (hr:attendance:view); POST `/hr/attendance/email-report` AttendanceController_emailReport (hr:attendance:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); POST `/hr/attendance/regularizations/{param}/apply` AttendanceRegularizationController_apply (hr:attendance:manage); GET `/hr/attendance/regularizations` AttendanceRegularizationController_list (hr:attendance:view); POST `/hr/attendance/regularizations/{param}/reject` AttendanceRegularizationController_reject (hr:attendance:manage); GET `/me/approvers/{param}` ApprovalAuthorityController_myApprover
- Controls: `Today's work and break totals`, `) : t("attendance.clockIn")}`, `Request WFH`, `Request regularisation`, `Retry`, `This week's presence`, `Send Report`, `Cancel`, `Filter corrections by status`, `Attendance corrections`, `Date range preset (IST)`, `Approve`, `Reject`

### `/hr/background-verification`

- Area: hrms-ops. Permission gate: hr:sensitive:view. Sidebar: Background Checks.
- Flags: none.
- Cases: HRMS-REG-0127, HRMS-REG-0128, HRMS-REG-0129, HRMS-REG-0130, HRMS-REG-0131, HRMS-REG-0132, HRMS-REG-0133, HRMS-REG-0134, HRMS-REG-0135, HRMS-REG-0136, HRMS-REG-0137, HRMS-REG-0138, HRMS-REG-0139, HRMS-REG-0140.
- APIs: GET `/hr/background-verification` BackgroundVerificationController_list (hr:sensitive:view); PATCH `/hr/background-verification` BackgroundVerificationController_update (hr:sensitive:manage); POST `/hr/background-verification` BackgroundVerificationController_create (hr:sensitive:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view)
- Controls: `Fail`, `} aria-label="Edit verification" >`, `Initiate BGV`, `Edit verification`

### `/hr/benefits`

- Area: hrms-ops. Permission gate: hr:benefits:manage | hr:benefits:view. Sidebar: Compensation & Benefits.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0141, HRMS-REG-0142, HRMS-REG-0143, HRMS-REG-0144, HRMS-REG-0145, HRMS-REG-0146, HRMS-REG-0147, HRMS-REG-0148, HRMS-REG-0149, HRMS-REG-0150, HRMS-REG-0151, HRMS-REG-0152, HRMS-REG-0153, HRMS-REG-0154.
- APIs: GET `/me/org-display` MeController_getOrgDisplay; PATCH `/hr/benefits/claims/{param}/review` HrBenefitsClaimsController_reviewClaim (hr:benefits:manage); GET `/hr/benefits/claims` HrBenefitsClaimsController_listClaims (hr:benefits:view); GET `/hr/benefits/dependents` HrBenefitsController_listDependents (hr:benefits:view); POST `/hr/benefits/dependents` HrBenefitsController_addDependent (hr:benefits:view); DELETE `/hr/benefits/dependents/{param}` HrBenefitsController_deleteDependent (hr:benefits:view); GET `/hr/benefits/plans` HrBenefitsController_listPlans (hr:benefits:view); POST `/hr/benefits/enroll` HrBenefitsController_enroll (hr:benefits:view); GET `/hr/benefits/my` HrBenefitsController_getMyBenefits (hr:benefits:view); POST `/hr/benefits/waive` HrBenefitsController_waive (hr:benefits:view); POST `/hr/benefits/plans` HrBenefitsController_createPlan (hr:benefits:manage); PATCH `/hr/benefits/plans/{param}` HrBenefitsController_updatePlan (hr:benefits:manage)
- Controls: `My benefits`, `Claims`, `Manage plans`, `Review`, `Enroll`, `Waive`, `Edit`, `Add dependent`, `New plan`

### `/hr/biometric`

- Area: attendance. Permission gate: hr:attendance:manage | hr:attendance:view. Sidebar: Biometric.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0155, HRMS-REG-0156, HRMS-REG-0157, HRMS-REG-0158, HRMS-REG-0159, HRMS-REG-0160, HRMS-REG-0161, HRMS-REG-0162, HRMS-REG-0163, HRMS-REG-0164, HRMS-REG-0165, HRMS-REG-0166, HRMS-REG-0167.
- APIs: GET `/hr/biometric/devices` BiometricController_listDevices (hr:attendance:manage); GET `/hr/biometric/logs` BiometricController_getLogs (hr:attendance:view); POST `/hr/biometric/devices` BiometricController_createDevice (hr:attendance:manage); PATCH `/hr/biometric/devices/{param}` BiometricController_updateDevice (hr:attendance:manage)
- Controls: `Register device`, `Devices`, `Punch Logs`, `onEdit(device)} aria-label= '} >`

### `/hr/cases`

- Area: hrms-ops. Permission gate: hr:cases:view. Sidebar: Cases.
- Flags: none.
- Cases: HRMS-REG-0168, HRMS-REG-0169, HRMS-REG-0170, HRMS-REG-0171, HRMS-REG-0172, HRMS-REG-0173, HRMS-REG-0174, HRMS-REG-0175, HRMS-REG-0176, HRMS-REG-0177, HRMS-REG-0178, HRMS-REG-0179, HRMS-REG-0180.
- APIs: GET `/hr/cases` HrCasesController_list (hr:cases:view); GET `/hr/cases/{param}` HrCasesController_getById (hr:cases:view); POST `/hr/cases/{param}/investigate` HrCasesController_startInvestigation (hr:cases:manage); PATCH `/hr/cases/{param}` HrCasesController_update (hr:cases:manage); GET `/hr/cases/{param}/notes` HrCasesController_listNotes (hr:cases:view); GET `/hr/cases/{param}/documents` HrCasesController_listDocuments (hr:cases:view); POST `/hr/cases/{param}/notes` HrCasesController_addNote (hr:cases:manage); POST `/hr/cases` HrCasesController_create (hr:cases:manage); POST `/hr/cases/anonymous` HrCasesController_createAnonymous (hr:cases:view); POST `/hr/cases/disciplinary` HrDisciplinaryController_create (hr:cases:manage); GET `/hr/cases/disciplinary` HrDisciplinaryController_list (hr:cases:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Anonymous Report`, `New Case`, `Cases`, `Disciplinary Actions`, `Details`, `Notes`, `Documents`, `Start Investigation`, `Mark Resolved`, `Add Note`, `Close`, `Cancel`, `Submit Anonymously`, `Search cases`, `Filter by status`, `Filter by category`, `Filter by severity`, `Issue Action`

### `/hr/comp-off`

- Area: leave. Permission gate: hr:leaves:view. Sidebar: Comp-off.
- Flags: none.
- Cases: HRMS-REG-0181, HRMS-REG-0182, HRMS-REG-0183, HRMS-REG-0184, HRMS-REG-0185, HRMS-REG-0186.
- APIs: GET `/hr/overtime/comp-off` OvertimeController_getCompOff (hr:attendance:view)
- Controls: `Apply Leave`

### `/hr/compensation-planning`

- Area: hrms-ops. Permission gate: hr:compensation:manage. Sidebar: Compensation Planning.
- Flags: none.
- Cases: HRMS-REG-0187, HRMS-REG-0188, HRMS-REG-0189, HRMS-REG-0190, HRMS-REG-0191, HRMS-REG-0192, HRMS-REG-0193, HRMS-REG-0194, HRMS-REG-0195, HRMS-REG-0196, HRMS-REG-0197, HRMS-REG-0198, HRMS-REG-0199.
- APIs: GET `/hr/enterprise/comp/planning/cycles` CompPlanningController_listCycles (hr:compensation:manage); GET `/hr/enterprise/comp/planning/cycles/{param}` CompPlanningController_getCycle (hr:compensation:manage); GET `/hr/enterprise/comp/planning/recommendations` CompPlanningController_listRecommendations (hr:compensation:manage); GET `/hr/enterprise/comp/planning/cycles/{param}/budget-pools` CompPlanningController_getBudgetPools (hr:compensation:manage); PATCH `/hr/enterprise/comp/planning/recommendations/{param}/calibrate` CompPlanningController_calibrateRecommendation (hr:compensation:manage); POST `/hr/enterprise/comp/planning/cycles` CompPlanningController_createCycle (hr:compensation:manage); GET `/me/org-display` MeController_getOrgDisplay; GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Create compensation cycle`, `Create cycle`, `handleCalibrate(r)} > Calibrate`

### `/hr/compliance`

- Area: hr-settings. Permission gate: hr:compliance:manage. Sidebar: Compliance & Risk.
- Flags: none.
- Cases: HRMS-REG-0200, HRMS-REG-0201, HRMS-REG-0202, HRMS-REG-0203, HRMS-REG-0204, HRMS-REG-0205, HRMS-REG-0206, HRMS-REG-0207, HRMS-REG-0208, HRMS-REG-0209, HRMS-REG-0210, HRMS-REG-0211.
- APIs: GET `/hr/global/compliance/requirements` ComplianceController_listRequirements (hr:compliance:manage); DELETE `/hr/global/compliance/requirements/{param}` ComplianceController_deleteRequirement (hr:compliance:manage); POST `/hr/global/compliance/generate-events` ComplianceController_generateEvents (hr:compliance:manage); POST `/hr/global/compliance/seed-country-pack` ComplianceController_seedCountryPack (hr:compliance:manage); GET `/hr/global/work-authorizations` WorkAuthorizationsController_list (hr:employees:view); DELETE `/hr/global/work-authorizations/{param}` WorkAuthorizationsController_remove (hr:compliance:manage); GET `/hr/global/compliance/events` ComplianceController_listEvents (hr:compliance:manage); POST `/hr/global/compliance/events/{param}/done` ComplianceController_markEventDone (hr:compliance:manage); POST `/hr/global/compliance/requirements` ComplianceController_createRequirement (hr:compliance:manage); PATCH `/hr/global/compliance/requirements/{param}` ComplianceController_updateRequirement (hr:compliance:manage); POST `/hr/global/work-authorizations` WorkAuthorizationsController_create (hr:compliance:manage); PATCH `/hr/global/work-authorizations/{param}` WorkAuthorizationsController_update (hr:compliance:manage)
- Controls: `Add requirement`, `Calendar`, `Requirements`, `Work Authorizations`, `Generate events (next 12 months)`, `Set up compliance`, `handleOpenEditReq(req)}>Edit`, `setDeleteReqId(req.id)}>Delete`, `Add authorization`, `handleOpenEditAuth(auth)}>Edit`, `setDeleteAuthId(auth.id)}>Delete`, `Mark done`

### `/hr/contingent`

- Area: hrms-ops. Permission gate: hr:contracts:view. Sidebar: Contingent Workforce.
- Flags: none.
- Cases: HRMS-REG-0212, HRMS-REG-0213, HRMS-REG-0214, HRMS-REG-0215, HRMS-REG-0216, HRMS-REG-0217, HRMS-REG-0218, HRMS-REG-0219, HRMS-REG-0220, HRMS-REG-0221, HRMS-REG-0222, HRMS-REG-0223, HRMS-REG-0224, HRMS-REG-0225.
- APIs: GET `/hr/global/contracts` ContractsController_list (hr:contracts:view); POST `/hr/global/contracts/{param}/end` ContractsController_endContract (hr:contracts:manage); POST `/hr/global/contracts/{param}/convert-to-employee` ContractsController_convertToEmployee (hr:contracts:manage); GET `/hr/global/contracts/{param}/internship-certificate` ContractsController_internshipCertificate (hr:contracts:view); POST `/hr/global/contracts` ContractsController_create (hr:contracts:manage); PATCH `/hr/global/contracts/{param}` ContractsController_update (hr:contracts:manage)
- Controls: `Certificate`, `New contract`, `handleOpenEdit(contract)}>Edit`, `setConvertContractId(contract.id)}> Convert`, `setEndContractId(contract.id)}> End`

### `/hr/delegations`

- Area: hrms-ops. Permission gate: hr:workflows:manage. Sidebar: Delegations.
- Flags: none.
- Cases: HRMS-REG-0226, HRMS-REG-0227, HRMS-REG-0228, HRMS-REG-0229, HRMS-REG-0230, HRMS-REG-0231, HRMS-REG-0232, HRMS-REG-0233, HRMS-REG-0234, HRMS-REG-0235, HRMS-REG-0236, HRMS-REG-0237, HRMS-REG-0238.
- APIs: GET `/hr/governance/delegations` HrGovernanceDelegationsController_listOrg (hr:workflows:manage); POST `/hr/governance/delegations` HrGovernanceDelegationsController_create (hr:workflows:view); DELETE `/hr/governance/delegations/{param}` HrGovernanceDelegationsController_revoke (hr:workflows:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `setRevoking(row)} > Revoke`, `Grant Proxy`, `setSheetOpen(false)}>Cancel`, `Grant Access`

### `/hr/devices`

- Area: attendance. Permission gate: hr:biometric:manage. Sidebar: Time clocks.
- Flags: none.
- Cases: HRMS-REG-0239, HRMS-REG-0240, HRMS-REG-0241, HRMS-REG-0242, HRMS-REG-0243, HRMS-REG-0244, HRMS-REG-0245, HRMS-REG-0246, HRMS-REG-0247, HRMS-REG-0248, HRMS-REG-0249, HRMS-REG-0250, HRMS-REG-0251.
- APIs: GET `/hr/enterprise/comp/devices` DevicesController_list (hr:biometric:manage); DELETE `/hr/enterprise/comp/devices/{param}` DevicesController_remove (hr:biometric:manage); POST `/hr/enterprise/comp/devices` DevicesController_create (hr:biometric:manage); PATCH `/hr/enterprise/comp/devices/{param}` DevicesController_update (hr:biometric:manage); GET `/hr/enterprise/comp/devices/failed-syncs` DevicesController_failedSyncs (hr:biometric:manage); GET `/hr/enterprise/comp/devices/sync-logs` DevicesController_listSyncLogs (hr:biometric:manage)
- Controls: `Register device`, `Devices`, `Failed Syncs`, `All Sync Logs`, `}>`

### `/hr/document-review`

- Area: hrms-ops. Permission gate: hr:documents:view. Sidebar: Doc Review.
- Flags: none.
- Cases: HRMS-REG-0252, HRMS-REG-0253, HRMS-REG-0254, HRMS-REG-0255, HRMS-REG-0256, HRMS-REG-0257, HRMS-REG-0258, HRMS-REG-0259, HRMS-REG-0260, HRMS-REG-0261, HRMS-REG-0262, HRMS-REG-0263, HRMS-REG-0264, HRMS-REG-0265.
- APIs: GET `/hr/onboarding-docs/summary` HrOnboardingDocsAdminController_summary (hr:onboarding:manage); GET `/hr/onboarding-docs` HrOnboardingDocsAdminController_list (hr:onboarding:manage); PATCH `/hr/onboarding-docs/{param}` HrOnboardingDocsAdminController_review (hr:onboarding:manage); POST `/hr/onboarding-docs/me` OnboardingViewsController_createMine (self:onboarding-docs); POST `/hr/onboarding-docs` HrOnboardingDocsAdminController_create (hr:onboarding:manage); GET `/onboarding` HrOnboardingAdminController_getProgress (hr:onboarding:manage); GET `/onboarding/{param}` HrOnboardingAdminController_getUserTasks (hr:onboarding:tasks:view); GET `/onboarding/me` OnboardingController_getMyTasks (self:onboarding-tasks); PATCH `/onboarding/tasks/{param}` OnboardingController_updateTask (self:onboarding-tasks); POST `/onboarding` HrOnboardingAdminController_initiate (hr:onboarding:manage); GET `/onboarding/templates/departments` HrOnboardingAdminController_listTemplateDepartments (hr:onboarding:manage); GET `/onboarding/templates` HrOnboardingAdminController_listTemplates (hr:onboarding:manage); POST `/onboarding/templates` HrOnboardingAdminController_createTemplate (hr:onboarding:manage); GET `/hr/onboarding-docs/me` OnboardingViewsController_listMine (self:onboarding-docs); POST `/storage/upload` StorageController_upload; GET `/hr/document-types` HrDocumentTypesController_list; PATCH `/hr/compliance` DocumentsController_acknowledgeCompliance (hr:documents:view); GET `/hr/compliance` DocumentsController_listCompliance (hr:documents:view)
- Controls: `Filter by status`, `Upload`, `Cancel`, `Send Request`, `Re-upload remarks`, `Approve`, `Request Re-upload`, `Retry`, `Choose File`, `Remove file`, `Acknowledge`

### `/hr/document-types`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: Doc Types.
- Flags: none.
- Cases: HRMS-REG-0266, HRMS-REG-0267, HRMS-REG-0268, HRMS-REG-0269, HRMS-REG-0270, HRMS-REG-0271, HRMS-REG-0272, HRMS-REG-0273, HRMS-REG-0274, HRMS-REG-0275, HRMS-REG-0276, HRMS-REG-0277, HRMS-REG-0278, HRMS-REG-0279.
- APIs: POST `/hr/document-types` HrDocumentTypesAdminController_create (hr:documents:manage); PATCH `/hr/document-types/{param}` HrDocumentTypesAdminController_update (hr:documents:manage); GET `/hr/document-types` HrDocumentTypesController_list
- Controls: `Add Document Type`, `Document type name`, `Description`, `Mandatory`, `Active`, `Sort order`

### `/hr/documents`

- Area: hrms-ops. Permission gate: hr:documents:view. Sidebar: Documents.
- Flags: none.
- Cases: HRMS-REG-0280, HRMS-REG-0281, HRMS-REG-0282, HRMS-REG-0283, HRMS-REG-0284, HRMS-REG-0285, HRMS-REG-0286, HRMS-REG-0287, HRMS-REG-0288, HRMS-REG-0289, HRMS-REG-0290, HRMS-REG-0291, HRMS-REG-0292, HRMS-BLK-0012.
- APIs: GET `/hr/documents` DocumentsController_listDocuments (hr:documents:view); GET `/hr/documents/stats` DocumentsController_documentStats (hr:documents:view); GET `/hr/document-expiry` DocumentsController_documentExpiry (hr:documents:view); DELETE `/hr/documents/{param}` DocumentsController_deleteDocument (hr:documents:manage); POST `/hr/documents` DocumentsController_createDocument (hr:documents:manage); PATCH `/hr/documents/{param}` DocumentsController_updateDocument (hr:documents:manage); POST `/sign/envelopes` SignEnvelopesController_create (sign:envelope:create); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); POST `/storage/upload` StorageController_upload; GET `/hr/templates` HrTemplatesController_list (hr:templates:view); POST `/hr/documents/letters/render` DocumentsController_renderLetter (hr:documents:manage); POST `/hr/documents/letters` DocumentsController_saveLetter (hr:documents:manage); GET `/hr/documents/letters` DocumentsController_listLetters (hr:documents:view); PATCH `/hr/documents/{param}/classification` DocumentClassificationController_classify (hr:documents:manage); GET `/hr/documents/{param}/classification` DocumentClassificationController_get (hr:documents:view); PUT `/hr/documents/{param}/audiences` DocumentClassificationController_setAudiences (hr:documents:publish); GET `/org-hierarchy/locations` OrgHierarchyController_listLocations (settings:view); GET `/org-hierarchy/departments` OrgHierarchyController_listDepartments (settings:view); GET `/hr/documents/{param}/kb-link` DocumentKbLinkController_state (hr:documents:view); POST `/hr/documents/{param}/kb-link` DocumentKbLinkController_publish (hr:documents:publish); DELETE `/hr/documents/{param}/kb-link` DocumentKbLinkController_unpublish (hr:documents:publish); PATCH `/hr/documents/{param}/kb-link` DocumentKbLinkController_update (hr:documents:publish); POST `/hr/documents/{param}/versions/{param}/approve` DocumentVersionsController_approve (hr:documents:publish); GET `/hr/documents/{param}/versions` DocumentVersionsController_list (hr:documents:view); POST `/hr/documents/{param}/versions` DocumentVersionsController_upload (hr:documents:manage)
- Controls: `Remove file`, `Clear all`, `Add tag`, `Add`, `Preview Letter`, `Save Letter`, `Letter Template`, `Variable name`, `Override value`, `Search documents`, `Filter by document type`, `ZIP this page ( )`, `View document`, `Download document`, `Edit document`, `View file`, `Download`, `Edit details`, `Classification and sharing`, `Send for e-signature`, `History ( )`, `Delete`, `More options`, `Cancel`, `Create Folder`, `Clear effective date`, `Clear`, `Try again`, `Remove from Knowledge Base`, `Add to Knowledge Base`, `Knowledge Base`, `Change settings`, `Version number`, `Approve`, `Upload new version`, `Versions`, `Choose a new version file`, `Stop`, `Classify`, `Continue`

### `/hr/documents/editor/[documentId]`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-REG-0293, HRMS-REG-0294, HRMS-REG-0295, HRMS-REG-0296, HRMS-REG-0297, HRMS-REG-0298, HRMS-REG-0299, HRMS-REG-0300, HRMS-REG-0301, HRMS-REG-0302.
- APIs: GET `/hr/rich-documents/{param}` DocumentsController_getRichDocument (hr:documents:view); PATCH `/hr/rich-documents/{param}` DocumentsController_updateRichDocument (hr:documents:manage); PATCH `/hr/rich-documents/{param}/publish` DocumentsController_publishRichDocument (hr:documents:manage)
- Controls: `Save`

### `/hr/documents/editor/new`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-0303, HRMS-REG-0304, HRMS-REG-0305, HRMS-REG-0306, HRMS-REG-0307, HRMS-REG-0308, HRMS-REG-0309, HRMS-REG-0310, HRMS-REG-0311.
- APIs: POST `/hr/rich-documents` DocumentsController_createRichDocument (hr:documents:manage)
- Controls: `Create &amp; Open Editor`, `Template`

### `/hr/documents/templates`

- Area: hrms-ops. Permission gate: hr:documents:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-0312, HRMS-REG-0313, HRMS-REG-0314, HRMS-REG-0315, HRMS-REG-0316, HRMS-REG-0317, HRMS-REG-0318, HRMS-REG-0319, HRMS-REG-0320, HRMS-REG-0321, HRMS-REG-0322.
- APIs: GET `/hr/documents/templates` HrDocumentTemplatesController_list (hr:documents:view); DELETE `/hr/documents/templates/{param}` HrDocumentTemplatesController_remove (hr:documents:manage); PATCH `/hr/documents/templates/{param}` HrDocumentTemplatesController_setDefault (hr:documents:manage)
- Controls: `router.push('/hr/documents/templates/$ /edit')}> Edit`, `Add Template`, `Template actions`, `Preview`, `Delete`

### `/hr/documents/templates/[templateId]/edit`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-REG-0323, HRMS-REG-0324, HRMS-REG-0325, HRMS-REG-0326, HRMS-REG-0327, HRMS-REG-0328, HRMS-REG-0329, HRMS-REG-0330, HRMS-REG-0331, HRMS-REG-0332, HRMS-REG-0333, HRMS-REG-0334.
- APIs: GET `/hr/documents/templates/{param}` HrDocumentTemplatesController_getOne (hr:documents:view); POST `/hr/documents/templates` HrDocumentTemplatesController_create (hr:documents:manage); PUT `/hr/documents/templates/{param}` HrDocumentTemplatesController_update (hr:documents:manage); GET `/hr/documents/templates/{param}/versions` HrDocumentTemplatesController_versions (hr:documents:view); GET `/hr/documents/templates` HrDocumentTemplatesController_list (hr:documents:view)
- Controls: `Reset`

### `/hr/documents/templates/new`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-0335, HRMS-REG-0336, HRMS-REG-0337, HRMS-REG-0338, HRMS-REG-0339, HRMS-REG-0340, HRMS-REG-0341, HRMS-REG-0342, HRMS-REG-0343, HRMS-REG-0344, HRMS-REG-0345, HRMS-REG-0346.
- APIs: POST `/hr/documents/templates` HrDocumentTemplatesController_create (hr:documents:manage); PUT `/hr/documents/templates/{param}` HrDocumentTemplatesController_update (hr:documents:manage); GET `/hr/documents/templates/{param}/versions` HrDocumentTemplatesController_versions (hr:documents:view); GET `/hr/documents/templates` HrDocumentTemplatesController_list (hr:documents:view)
- Controls: `Reset`

### `/hr/email-templates`

- Area: hrms-ops. Permission gate: hr:email-templates:manage. Sidebar: Email Templates.
- Flags: none.
- Cases: HRMS-REG-0347, HRMS-REG-0348, HRMS-REG-0349, HRMS-REG-0350, HRMS-REG-0351, HRMS-REG-0352, HRMS-REG-0353, HRMS-REG-0354, HRMS-REG-0355, HRMS-REG-0356, HRMS-REG-0357, HRMS-REG-0358, HRMS-REG-0359, HRMS-BLK-0009.
- APIs: GET `/hr/email-templates` HrEmailTemplatesController_list (hr:email-templates:manage); POST `/hr/email-templates` HrEmailTemplatesController_create (hr:email-templates:manage); PATCH `/hr/email-templates/{param}` HrEmailTemplatesController_update (hr:email-templates:manage); DELETE `/hr/email-templates/{param}` HrEmailTemplatesController_remove (hr:email-templates:manage); POST `/hr/email-templates/generate-ai` HrEmailTemplatesController_generateAi (hr:email-templates:manage)
- Controls: `New Template`, `Generate with AI`, `Copy template body`, `Category`

### `/hr/emergency`

- Area: hrms-ops. Permission gate: hr:emergency:manage. Sidebar: Emergency.
- Flags: none.
- Cases: HRMS-REG-0360, HRMS-REG-0361, HRMS-REG-0362, HRMS-REG-0363, HRMS-REG-0364, HRMS-REG-0365, HRMS-REG-0366, HRMS-REG-0367, HRMS-REG-0368, HRMS-REG-0369, HRMS-REG-0370, HRMS-REG-0371, HRMS-REG-0372, HRMS-REG-0373.
- APIs: GET `/hr/enterprise/ops/emergency/events` EmergencyController_listEvents (hr:emergency:manage); POST `/hr/enterprise/ops/emergency/events` EmergencyController_createEvent (hr:emergency:manage); GET `/hr/enterprise/ops/emergency/events/{param}` EmergencyController_getEvent (hr:emergency:manage); GET `/hr/enterprise/ops/emergency/events/{param}/status` EmergencyController_getEventStatus (hr:emergency:manage); POST `/hr/enterprise/ops/emergency/events/{param}/broadcast` EmergencyController_broadcast (hr:emergency:manage); POST `/hr/enterprise/ops/emergency/events/{param}/respond` EmergencyController_respond; PATCH `/hr/enterprise/ops/emergency/events/{param}` EmergencyController_updateEvent (hr:emergency:manage)
- Controls: `Declare Event`, `Back`, `Mark Resolved`, `I&apos;m Safe`, `Need Help`, `Send Check-in`, `Check-in message`

### `/hr/employees`

- Area: people. Permission gate: hr:employees:view. Sidebar: People.
- Flags: none.
- Cases: HRMS-SMK-0007, HRMS-REG-0374, HRMS-REG-0375, HRMS-REG-0376, HRMS-REG-0377, HRMS-REG-0378, HRMS-REG-0379, HRMS-REG-0380, HRMS-REG-0381, HRMS-REG-0382.
- APIs: GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); POST `/hr/export/jobs` HrExportController_create (hr:export:manage); GET `/hr/export/jobs/{param}` HrExportController_get (hr:export:manage); GET `/hr/employees/{param}/employment` HrEmployeeSubroutesController_getEmployment (hr:employees:view)
- Controls: `Clear`, `Search employees`, `Department`, `Status`, `Role`

### `/hr/employees/[employeeId]`

- Area: people. Permission gate: hr:employees:view. Sidebar: People.
- Flags: none.
- Cases: HRMS-SMK-0008, HRMS-REG-0383, HRMS-REG-0384, HRMS-REG-0385, HRMS-REG-0386, HRMS-REG-0387, HRMS-REG-0388, HRMS-REG-0389, HRMS-REG-0390, HRMS-REG-0391, HRMS-REG-0392, HRMS-REG-0393, HRMS-BLK-0004, HRMS-REG-1621.
- APIs: PATCH `/hr/employees/{param}` EmployeeDetailController_updateEmployee (hr:employees:update); GET `/hr/employees/{param}/employment` HrEmployeeSubroutesController_getEmployment (hr:employees:view); GET `/hr/employees/{param}/profile-pdf` EmployeeDetailController_profilePdf (hr:employees:manage); POST `/hr/employees/{param}/resend-invite` EmployeesController_resendInvite (hr:onboarding:manage); POST `/hr/employees/{param}/invite-link` EmployeesController_createInviteLink (hr:onboarding:manage); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); POST `/hr/departments` HrDepartmentsController_create (hr:employees:manage); GET `/hr/attendance/monthly` AttendanceController_monthly (hr:attendance:view); GET `/me/attendance/monthly` EmployeeAttendanceController_monthly (self:attendance); GET `/hr/employees/stats` EmployeesController_stats (hr:employees:view); GET `/hr/employees/projects` EmployeesController_projects (hr:employees:view); GET `/hr/employees/tickets` EmployeesController_tickets (hr:employees:view); GET `/hr/employees/{param}/reports-to-me` EmployeeDetailController_reportsToMe (hr:employees:view); GET `/hr/employees/{param}/manager-scorecard` EmployeeDetailController_managerScorecard (hr:employees:view); GET `/hr/employees/availability` EmployeesController_availability (hr:employees:view); POST `/ai/attrition-risk` HrAiController_attritionRisk (hr:employees:manage); POST `/ai/generate-review` HrAiController_generateReview (hr:performance:manage); POST `/storage/upload` StorageController_upload; POST `/hr/reporting-lines/{param}/confirm-fallback` ReportingLinesController_confirmFallback (hr:reporting-lines:manage); GET `/hr/reporting-lines/{param}` ReportingLinesController_line (hr:employees:view); PUT `/hr/reporting-lines/{param}` ReportingLinesController_setLine (hr:reporting-lines:manage); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates
- Controls: `Back`, `Export PDF PDF`, `Terminate employee`, `Terminate`, `Rehire employee`, `Rehire`, `Cancel`, `Save Changes`, `Add`, `Add a skill`, `LinkedIn URL`, `Twitter / X URL`, `GitHub URL`, `Website URL`, `Stop`, `Retry`, `Edit`, `Discard`, `Loading sources`, `Run again`, `Reject`, `Resend invite`, `Copy invite link`, `Replace manager`, `Keep as manager`, `Edit reporting line`, `Save`, `changes to`, `Add additional manager`, `Overview`, `Attendance`, `Timeline`, `Sensitive`, `My Profile`, `Edit details`

### `/hr/employees/find-expert`

- Area: people. Permission gate: hr:employees:view | hr:employees:manage. Sidebar: Find Expert.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0394, HRMS-REG-0395, HRMS-REG-0396, HRMS-REG-0397, HRMS-REG-0398, HRMS-REG-0399, HRMS-REG-0400.
- APIs: GET `/hr/employees/find-expert` EmployeesController_findExpert (hr:employees:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view)
- Controls: `Search`, `Clear filters`, `Skill search`

### `/hr/employees/manager-coverage`

- Area: people. Permission gate: hr:employees:view. Sidebar: Manager coverage.
- Flags: none.
- Cases: HRMS-REG-0401, HRMS-REG-0402, HRMS-REG-0403, HRMS-REG-0404, HRMS-REG-0405, HRMS-REG-0406, HRMS-REG-0407, HRMS-REG-0408, HRMS-REG-0409, HRMS-REG-0410, HRMS-REG-0411, HRMS-REG-0412, HRMS-REG-0413.
- APIs: GET `/hr/reporting-lines/coverage` ReportingLinesController_coverage (hr:employees:view); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); POST `/hr/reporting-lines/{param}/confirm-fallback` ReportingLinesController_confirmFallback (hr:reporting-lines:manage); PUT `/hr/reporting-lines/{param}` ReportingLinesController_setLine (hr:reporting-lines:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates
- Controls: `Bulk reporting change`, `Coverage category`, `Keep`

### `/hr/employees/reporting-changes`

- Area: people. Permission gate: hr:reporting-lines:manage. Sidebar: Reporting changes.
- Flags: none.
- Cases: HRMS-REG-0414, HRMS-REG-0415, HRMS-REG-0416, HRMS-REG-0417, HRMS-REG-0418, HRMS-REG-0419, HRMS-REG-0420, HRMS-REG-0421, HRMS-BLK-0005.
- APIs: GET `/hr/reporting-lines/bulk-jobs` ReportingLineBulkJobsController_list (hr:reporting-lines:manage); POST `/hr/reporting-lines/bulk-jobs` ReportingLineBulkJobsController_preview (hr:reporting-lines:manage); POST `/hr/reporting-lines/bulk-jobs/{param}/commit` ReportingLineBulkJobsController_commit (hr:reporting-lines:manage); GET `/hr/reporting-lines/bulk-jobs/{param}` ReportingLineBulkJobsController_get (hr:reporting-lines:manage); GET `/hr/reporting-lines/bulk-jobs/{param}/failures.csv` ReportingLineBulkJobsController_failures (hr:reporting-lines:manage); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates; GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view)
- Controls: `Select employees`, `Upload a mapping file`, `Search employees`, `Download template`, `Preview changes`, `Open job details`, `Commit`, `Download failures (CSV)`, `Commit changes`

### `/hr/employees/reporting-changes/[jobId]`

- Area: people. Permission gate: hr:reporting-lines:manage. Sidebar: Reporting changes.
- Flags: none.
- Cases: HRMS-REG-0422, HRMS-REG-0423, HRMS-REG-0424, HRMS-REG-0425, HRMS-REG-0426, HRMS-REG-0427.
- APIs: GET `/hr/reporting-lines/bulk-jobs/{param}` ReportingLineBulkJobsController_get (hr:reporting-lines:manage); GET `/hr/reporting-lines/bulk-jobs/{param}/failures.csv` ReportingLineBulkJobsController_failures (hr:reporting-lines:manage)
- Controls: `Download failures (CSV)`

### `/hr/employees/reporting-requests`

- Area: people. Permission gate: hr:reporting-lines:review. Sidebar: Reporting requests.
- Flags: none.
- Cases: HRMS-REG-0428, HRMS-REG-0429, HRMS-REG-0430, HRMS-REG-0431, HRMS-REG-0432, HRMS-REG-0433, HRMS-REG-0434, HRMS-REG-0435, HRMS-REG-0436, HRMS-REG-0437, HRMS-REG-0438.
- APIs: GET `/hr/reporting-manager-requests` ReportingManagerRequestsController_list (hr:reporting-lines:review); POST `/hr/reporting-manager-requests/{param}/review` ReportingManagerRequestsController_review (hr:reporting-lines:review); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates
- Controls: `Filter by status`

### `/hr/employees/skills-matrix`

- Area: people. Permission gate: hr:employees:view. Sidebar: Skills Matrix.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0439, HRMS-REG-0440, HRMS-REG-0441, HRMS-REG-0442, HRMS-REG-0443, HRMS-REG-0444, HRMS-REG-0445.
- APIs: GET `/hr/employees/skills-matrix` EmployeesController_skillsMatrix (hr:employees:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/hr/engagement`

- Area: hrms-ops. Permission gate: hr:engagement:view. Sidebar: Polls & engagement.
- Flags: none.
- Cases: HRMS-REG-0446, HRMS-REG-0447, HRMS-REG-0448, HRMS-REG-0449, HRMS-REG-0450, HRMS-REG-0451, HRMS-REG-0452, HRMS-REG-0453, HRMS-REG-0454, HRMS-REG-0455, HRMS-REG-0456, HRMS-REG-0457, HRMS-REG-0458.
- APIs: GET `/hr/recognition` EngagementController_listRecognitions (hr:engagement:view); POST `/hr/recognition` EngagementController_createRecognition (hr:engagement:view); GET `/hr/engagement/overview` EngagementBadgesController_overview (hr:engagement:view); GET `/hr/engagement/mood/history` EngagementExtrasController_myMoodHistory (hr:engagement:view); GET `/hr/engagement/mood/aggregate` EngagementExtrasController_orgMoodAggregate (hr:engagement:manage); POST `/hr/engagement/mood` EngagementExtrasController_moodCheckin (hr:engagement:view); GET `/hr/engagement/points/leaderboard` EngagementBadgesController_leaderboard (hr:engagement:view); GET `/hr/engagement/badges` EngagementBadgesController_listBadges (hr:engagement:view); POST `/hr/engagement/badges/{param}/award` EngagementBadgesController_awardBadge (hr:engagement:manage); GET `/hr/engagement/polls` EngagementExtrasController_listPolls (hr:engagement:view); POST `/hr/engagement/polls` EngagementExtrasController_createPoll (hr:engagement:manage); POST `/hr/engagement/polls/{param}/vote` EngagementExtrasController_votePoll (hr:engagement:view); GET `/hr/engagement/polls/{param}/results` EngagementExtrasController_pollResults (hr:engagement:view); PATCH `/hr/engagement/polls/{param}` EngagementExtrasController_updatePoll (hr:engagement:manage); GET `/hr/engagement/communities` EngagementExtrasController_listCommunities (hr:engagement:view); POST `/hr/engagement/communities` EngagementExtrasController_createCommunity (hr:engagement:view); POST `/hr/engagement/communities/{param}/join` EngagementExtrasController_joinCommunity (hr:engagement:view); POST `/hr/engagement/communities/{param}/leave` EngagementExtrasController_leaveCommunity (hr:engagement:view); GET `/hr/engagement/campaigns` EngagementExtrasController_listCampaigns (hr:engagement:view); POST `/hr/engagement/campaigns` EngagementExtrasController_createCampaign (hr:engagement:manage); PATCH `/hr/engagement/campaigns/{param}` EngagementExtrasController_updateCampaign (hr:engagement:manage); DELETE `/hr/engagement/campaigns/{param}` EngagementExtrasController_deleteCampaign (hr:engagement:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Give Kudos`, `setAwardBadgeId(badge.id)} > Award`, `setShowResults((p) => !p)} >`, `setSheetOpen(true)} > Create poll`, `append( )} > Add Option`, `Loading poll results`, `Joined`, `Join`, `setSheetOpen(true)} > New Community`, `setSheetOpen(true)} > New Campaign`, `handleEdit(c)} aria-label="Edit campaign" >`, `Edit campaign`, `Delete campaign`

### `/hr/equity`

- Area: hrms-ops. Permission gate: hr:equity:view. Sidebar: Equity & ESOP.
- Flags: none.
- Cases: HRMS-REG-0459, HRMS-REG-0460, HRMS-REG-0461, HRMS-REG-0462, HRMS-REG-0463, HRMS-REG-0464, HRMS-REG-0465, HRMS-REG-0466, HRMS-REG-0467, HRMS-REG-0468, HRMS-REG-0469, HRMS-REG-0470, HRMS-REG-0471, HRMS-REG-0472.
- APIs: POST `/hr/enterprise/comp/equity/grants` EquityController_createGrant (hr:equity:manage); GET `/hr/enterprise/comp/equity/grants/{param}/vesting-schedule` EquityController_vestingSchedule (hr:equity:view); POST `/hr/enterprise/comp/equity/exercises` EquityController_recordExercise (hr:equity:manage); GET `/hr/enterprise/comp/equity/grants` EquityController_listGrants (hr:equity:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view); GET `/me/org-display` MeController_getOrgDisplay
- Controls: `setGrantSheetOpen(true)}> New Grant`, `Close grant details`, `setSelectedGrant(null)}>`, `Cancel`, `Create Grant`, `Record Exercise`

### `/hr/event-stream`

- Area: hrms-ops. Permission gate: hr:eventstream:view. Sidebar: HR audit log.
- Flags: none.
- Cases: HRMS-REG-0473, HRMS-REG-0474, HRMS-REG-0475, HRMS-REG-0476, HRMS-REG-0477, HRMS-REG-0478, HRMS-REG-0479, HRMS-REG-0480, HRMS-REG-0481, HRMS-REG-0482.
- APIs: GET `/hr/enterprise/ops/event-stream/events` EventStreamController_listEvents (hr:eventstream:view); GET `/hr/enterprise/ops/event-stream/data-dictionary` EventStreamController_dataDictionary (hr:eventstream:view); GET `/hr/enterprise/ops/event-stream/metric-definitions` EventStreamController_metricDefinitions (hr:eventstream:view); POST `/hr/enterprise/ops/event-stream/export` EventStreamController_export (hr:analytics:read); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Export latest 100`, `Event Log`, `Data Dictionary`, `Metric Definitions`

### `/hr/exit`

- Area: lifecycle. Permission gate: hr:exit:view. Sidebar: Exit.
- Flags: none.
- Cases: HRMS-SMK-0009, HRMS-REG-0483, HRMS-REG-0484, HRMS-REG-0485, HRMS-REG-0486, HRMS-REG-0487, HRMS-REG-0488, HRMS-REG-0489, HRMS-REG-0490, HRMS-REG-0491, HRMS-REG-0492, HRMS-REG-0493, HRMS-REG-0494, HRMS-REG-0495.
- APIs: GET `/hr/exit/{param}/letter` ExitController_getLetter (hr:exit:view); GET `/hr/exit` ExitController_list (hr:exit:view); GET `/hr/exit/{param}/progress` ExitController_getProgress (hr:exit:view); POST `/me/resignations` EmployeeResignationController_create (self:resignation); POST `/hr/exit/admin-record` ExitController_adminRecord (hr:exit:manage); PATCH `/hr/exit/{param}/hr-review` ExitController_hrReview (hr:exit:manage); PATCH `/hr/exit/{param}/final-review` ExitController_finalReview (hr:exit:approve); PATCH `/hr/exit/{param}/withdraw` ExitController_withdraw (hr:exit:view); GET `/hr/exit/offboarding-checklists` ExitController_listOffboardingChecklists (hr:exit:view); POST `/storage/upload` StorageController_upload; GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view)
- Controls: `Record resignation`, `Initiate termination`, `onHrApprove(r.id)} > Approve`, `onHrReject(r.id)} > Reject`, `onFinalApprove(r.id)} > Approve`, `onFinalReject(r.id)} > Reject`, `Withdraw`, `View uploaded resignation letter`, `Letter`, `View generated resignation letter`, `Checklist`, `Download Template`, `Reason Category`, `Willing for exit interview`, `Remove uploaded letter`, `Remove file`, `Exit path`, `Open`, `Try again`

### `/hr/exit/[resignationId]`

- Area: lifecycle. Permission gate: hr:exit:view. Sidebar: Exit.
- Flags: none.
- Cases: HRMS-REG-0496, HRMS-REG-0497, HRMS-REG-0498, HRMS-REG-0499, HRMS-REG-0500, HRMS-REG-0501, HRMS-REG-0502, HRMS-REG-0503, HRMS-REG-0504, HRMS-REG-0505, HRMS-REG-0506, HRMS-REG-0507, HRMS-REG-0508.
- APIs: PATCH `/hr/exit/{param}` ExitController_update (hr:exit:view); GET `/hr/exit/{param}` ExitController_getDetail (hr:exit:view); PATCH `/hr/exit/{param}/checklist/{param}` ExitController_updateChecklistItem (hr:exit:view)
- Controls: `Complete exit`

### `/hr/expenses`

- Area: hrms-ops. Permission gate: hr:expenses:view | self:expenses | hr:expenses:approve | hr:expenses:read. Sidebar: Expenses.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0509, HRMS-REG-0510, HRMS-REG-0511, HRMS-REG-0512, HRMS-REG-0513, HRMS-REG-0514, HRMS-REG-0515, HRMS-REG-0516, HRMS-REG-0517, HRMS-REG-0518, HRMS-REG-0519, HRMS-REG-0520, HRMS-REG-0521.
- APIs: GET `/me/expenses` EmployeeExpensesController_pageData (self:expenses); GET `/hr/expenses/page-data` ExpensesController_pageData (hr:expenses:view); PATCH `/hr/expenses/{param}` ExpensesController_update (hr:expenses:approve); POST `/me/expenses` EmployeeExpensesController_create (self:expenses); POST `/hr/expenses/export/jobs` ExpensesController_createExportJob (hr:expenses:read); GET `/hr/expenses/export/jobs/{param}` ExpensesController_getExportJob (hr:expenses:read); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); POST `/storage/upload` StorageController_upload; POST `/hr/expenses/import` ExpensesImportController_importExpenses (hr:expenses:manage); POST `/hr/expenses/email-report` ExpensesController_emailReport (hr:expenses:approve)
- Controls: `Import expenses`, `Export expenses`, `Add expense`, `Submit expense claim`, `More actions`, `Upload receipts`, `Add another receipt`, `Download Template (.xlsx)`, `Remove file`, `Upload expense file`, `Export`, `Cancel`, `Filter by employee`, `Filter by status`, `Filter expenses by date range`, `Download report`, `Resubmit`, `Edit`, `Withdraw`, `View`, `View receipt`, `Download receipt`, `Confirm reject`, `Reject`, `Approve`

### `/hr/feedback`

- Area: hrms-ops. Permission gate: hr:feedback:view. Sidebar: 360 Feedback.
- Flags: none.
- Cases: HRMS-REG-0522, HRMS-REG-0523, HRMS-REG-0524, HRMS-REG-0525, HRMS-REG-0526, HRMS-REG-0527, HRMS-REG-0528, HRMS-REG-0529, HRMS-REG-0530, HRMS-REG-0531, HRMS-REG-0532, HRMS-REG-0533, HRMS-REG-0534, HRMS-REG-0535.
- APIs: GET `/hr/feedback/cycles` FeedbackController_listCycles (hr:performance:view); POST `/hr/feedback/cycles` FeedbackController_createCycle (hr:performance:manage); PATCH `/hr/feedback/cycles/{param}` FeedbackController_updateCycleStatus (hr:performance:manage); GET `/hr/feedback/my-reviews` FeedbackController_getMyPendingReviews (hr:performance:view); POST `/hr/feedback/requests/{param}/respond` FeedbackController_submitResponse (hr:performance:view); GET `/hr/feedback/results/{param}` FeedbackController_getResults (hr:performance:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Cycles`, `My Reviews`, `Results`, `Create Cycle`, `Add`, `handleActivate(cycle)} > Activate cycle`, `setCloseTarget(cycle)} > Close cycle`, `handleOpenReview(req)} > Submit Review`, `Submit Feedback`

### `/hr/fnf`

- Area: lifecycle. Permission gate: hr:payroll:approve. Sidebar: Final settlement.
- Flags: none.
- Cases: HRMS-REG-0536, HRMS-REG-0537, HRMS-REG-0538, HRMS-REG-0539, HRMS-REG-0540, HRMS-REG-0541, HRMS-REG-0542, HRMS-REG-0543, HRMS-REG-0544, HRMS-REG-0545, HRMS-REG-0546, HRMS-REG-0547, HRMS-REG-0548.
- APIs: GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view); GET `/me/org-display` MeController_getOrgDisplay; GET `/hr/fnf` HrPayrollFnfController_list (hr:payroll:view); POST `/hr/fnf` HrPayrollFnfController_create (hr:exit:manage); PATCH `/hr/fnf/{param}` HrPayrollFnfController_update (hr:exit:manage); GET `/hr/fnf/suggestion` HrPayrollFnfController_suggestion (hr:exit:manage)
- Controls: `Mark paid`, `Open payroll settlement`, `Create draft`, `Fill suggested amounts`

### `/hr/geofencing`

- Area: attendance. Permission gate: hr:attendance:view | hr:attendance:manage. Sidebar: Geofencing.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0549, HRMS-REG-0550, HRMS-REG-0551, HRMS-REG-0552, HRMS-REG-0553, HRMS-REG-0554, HRMS-REG-0555, HRMS-REG-0556, HRMS-REG-0557, HRMS-REG-0558, HRMS-REG-0559, HRMS-REG-0560.
- APIs: GET `/hr/geofencing` GeofencingController_list (hr:attendance:view); DELETE `/hr/geofencing/{param}` GeofencingController_remove (hr:attendance:manage); POST `/hr/geofencing` GeofencingController_create (hr:attendance:manage); PATCH `/hr/geofencing/{param}` GeofencingController_update (hr:attendance:manage)
- Controls: `Add location`, `Quick Select Location`

### `/hr/goals`

- Area: hrms-ops. Permission gate: hr:performance:view | hr:performance:manage. Sidebar: Goals & OKRs.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0561, HRMS-REG-0562, HRMS-REG-0563, HRMS-REG-0564, HRMS-REG-0565, HRMS-REG-0566, HRMS-REG-0567, HRMS-REG-0568, HRMS-REG-0569, HRMS-REG-0570, HRMS-REG-0571, HRMS-REG-0572, HRMS-REG-0573.
- APIs: GET `/hr/performance/goals` PerformanceController_listGoals (hr:performance:view); POST `/hr/performance/goals` PerformanceController_createGoal (hr:performance:manage); PATCH `/hr/performance/goals/{param}` PerformanceController_updateGoal (hr:performance:view)
- Controls: `All Goals ( )`, `Open ( )`, `Completed ( )`, `Update Progress`, `New Goal`, `Create Goal`, `Save Progress`, `Progress percent`

### `/hr/handbook`

- Area: hrms-ops. Permission gate: hr:documents:manage. Sidebar: Handbook.
- Flags: none.
- Cases: HRMS-REG-0574, HRMS-REG-0575, HRMS-REG-0576, HRMS-REG-0577, HRMS-REG-0578, HRMS-REG-0579, HRMS-REG-0580, HRMS-REG-0581, HRMS-REG-0582, HRMS-REG-0583, HRMS-REG-0584, HRMS-REG-0585, HRMS-REG-0586.
- APIs: GET `/hr/handbook` HrHandbookController_list (hr:employees:view); POST `/hr/handbook` HrHandbookController_create (hr:handbook:manage); PATCH `/hr/handbook/{param}` HrHandbookController_update (hr:handbook:manage); DELETE `/hr/handbook/{param}` HrHandbookController_remove (hr:handbook:manage); POST `/storage/upload` StorageController_upload
- Controls: `New Version`, `Publish`, `Unpublish`

### `/hr/helpdesk`

- Area: hrms-ops. Permission gate: hr:helpdesk:view. Sidebar: Employee support.
- Flags: none.
- Cases: HRMS-REG-0587, HRMS-REG-0588, HRMS-REG-0589, HRMS-REG-0590, HRMS-REG-0591, HRMS-REG-0592, HRMS-REG-0593, HRMS-REG-0594, HRMS-REG-0595, HRMS-REG-0596, HRMS-REG-0597, HRMS-REG-0598, HRMS-REG-0599, HRMS-REG-0600.
- APIs: GET `/hr/helpdesk/queues` HrHelpdeskController_listQueues (hr:helpdesk:view); GET `/hr/helpdesk` HrHelpdeskController_list (hr:helpdesk:view); POST `/hr/helpdesk/{param}/comments` HrHelpdeskController_addComment (hr:helpdesk:view); GET `/hr/helpdesk/{param}` HrHelpdeskController_getById (hr:helpdesk:view); PATCH `/hr/helpdesk/{param}` HrHelpdeskController_update (hr:helpdesk:view); PUT `/hr/helpdesk/queues/{param}` HrHelpdeskController_configureQueue (hr:helpdesk:manage); DELETE `/hr/helpdesk/routing/{param}` HrHelpdeskController_deleteRouting (hr:helpdesk:manage); GET `/hr/helpdesk/routing` HrHelpdeskController_listRouting (hr:helpdesk:manage); POST `/hr/helpdesk/routing` HrHelpdeskController_upsertRouting (hr:helpdesk:manage); POST `/me/support/{param}/comments` EmployeeSupportController_addComment (self:support); GET `/me/support/{param}` EmployeeSupportController_getById (self:support); POST `/me/support` EmployeeSupportController_create (self:support); GET `/me/support/suggest` EmployeeSupportController_suggest (self:support)
- Controls: `Queue settings`, `New request`, `Support queues`, `Status`, `Post reply`, `Queue`, `Reply`, `Save SLA`, `Reset`

### `/hr/holidays`

- Area: leave. Permission gate: self:attendance. Sidebar: Holiday Calendar.
- Flags: none.
- Cases: HRMS-REG-0601, HRMS-REG-0602, HRMS-REG-0603, HRMS-REG-0604, HRMS-REG-0605, HRMS-REG-0606, HRMS-REG-0607, HRMS-REG-0608, HRMS-REG-0609, HRMS-REG-0610, HRMS-REG-0611, HRMS-REG-0612.
- APIs: GET `/me/attendance/holidays` EmployeeAttendanceController_holidays (self:attendance); POST `/hr/attendance/holidays` AttendanceController_createHoliday (hr:attendance:manage); PATCH `/hr/attendance/holidays/{param}` AttendanceController_updateHoliday (hr:attendance:manage); DELETE `/hr/attendance/holidays/{param}` AttendanceController_deleteHoliday (hr:attendance:manage)
- Controls: `Previous month`, `Next month`, `Date`

### `/hr/identity`

- Area: hr-settings. Permission gate: hr:identity:view. Sidebar: Access & governance.
- Flags: none.
- Cases: HRMS-REG-0613, HRMS-REG-0614, HRMS-REG-0615, HRMS-REG-0616, HRMS-REG-0617, HRMS-REG-0618, HRMS-REG-0619, HRMS-REG-0620, HRMS-REG-0621, HRMS-REG-0622, HRMS-REG-0623, HRMS-REG-0624, HRMS-REG-0625.
- APIs: GET `/hr/enterprise/ops/identity/provisioning` IdentityController_listProvisioning (hr:identity:view); GET `/hr/enterprise/ops/identity/templates` IdentityController_listTemplates (hr:identity:view); DELETE `/hr/enterprise/ops/identity/templates/{param}` IdentityController_deleteTemplate (hr:identity:manage); POST `/hr/enterprise/ops/identity/provisioning` IdentityController_createProvisioning (hr:identity:manage); POST `/hr/enterprise/ops/identity/templates` IdentityController_createTemplate (hr:identity:manage); GET `/hr/enterprise/ops/identity/exit-verification` IdentityController_exitVerification (hr:identity:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Delete`, `New template`, `Provision`, `Provisioning`, `Templates`, `Exit Verification`, `Create`, `Create Template`, `Add system`, `Check`

### `/hr/kpis`

- Area: hrms-ops. Permission gate: hr:performance:view | hr:performance:manage. Sidebar: KPIs & Competencies.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0626, HRMS-REG-0627, HRMS-REG-0628, HRMS-REG-0629, HRMS-REG-0630, HRMS-REG-0631, HRMS-REG-0632, HRMS-REG-0633, HRMS-REG-0634, HRMS-REG-0635, HRMS-REG-0636, HRMS-REG-0637, HRMS-REG-0638.
- APIs: GET `/hr/kpis` KpisController_listKpis (hr:performance:view); POST `/hr/kpis` KpisController_createKpi (hr:performance:manage); PATCH `/hr/kpis/{param}` KpisController_updateKpi (hr:performance:manage); DELETE `/hr/kpis/{param}` KpisController_deleteKpi (hr:performance:manage); GET `/hr/kpis/frameworks` KpisController_listFrameworks (hr:performance:view); POST `/hr/kpis/frameworks` KpisController_createFramework (hr:performance:manage); POST `/hr/kpis/frameworks/{param}/competencies` KpisController_createCompetency (hr:performance:manage)
- Controls: `KPI Library`, `Competency Frameworks`, `Add KPI`, `Create KPI`, `handleToggleActive(kpi.id, kpi.isActive)} >`, `Add Framework`, `Add Level`, `Create Framework`, `Add Competency`

### `/hr/labor-relations`

- Area: hrms-ops. Permission gate: hr:labor:view. Sidebar: Labor Relations.
- Flags: none.
- Cases: HRMS-REG-0639, HRMS-REG-0640, HRMS-REG-0641, HRMS-REG-0642, HRMS-REG-0643, HRMS-REG-0644, HRMS-REG-0645, HRMS-REG-0646.
- APIs: GET `/organization/members` OrganizationMembersController_listMembers (settings:view); GET `/hr/governance/labor/memberships` LaborController_listMemberships (hr:labor:view); GET `/hr/governance/labor/agreements` LaborController_listAgreements (hr:labor:view); GET `/hr/governance/labor/cases` LaborController_listLaborCases (hr:labor:view); GET `/hr/governance/labor/agreements/expiring` LaborController_listExpiringAgreements (hr:labor:view); POST `/hr/governance/labor/memberships` LaborController_createMembership (hr:labor:manage); POST `/hr/governance/labor/agreements` LaborController_createAgreement (hr:labor:manage); POST `/hr/governance/labor/cases` LaborController_createLaborCase (hr:labor:manage); DELETE `/hr/governance/labor/memberships/{param}` LaborController_deleteMembership (hr:labor:manage); DELETE `/hr/governance/labor/agreements/{param}` LaborController_deleteAgreement (hr:labor:manage); DELETE `/hr/governance/labor/cases/{param}` LaborController_deleteLaborCase (hr:labor:manage)
- Controls: `setPendingDelete( )}>Delete`, `Add`, `New Case`, `setSheetOpen(false)}>Cancel`, `Create`

### `/hr/leave-policies`

- Area: leave. Permission gate: hr:leaves:manage. Sidebar: Leave types & policies.
- Flags: none.
- Cases: HRMS-REG-0647, HRMS-REG-0648, HRMS-REG-0649, HRMS-REG-0650, HRMS-REG-0651, HRMS-REG-0652, HRMS-REG-0653, HRMS-REG-0654, HRMS-REG-0655, HRMS-REG-0656, HRMS-REG-0657, HRMS-REG-0658.
- APIs: GET `/hr/leave-policies` LeavePoliciesController_list (hr:leaves:view); DELETE `/hr/leave-policies/{param}` LeavePoliciesController_remove (hr:leaves:manage); POST `/hr/leave-policies` LeavePoliciesController_create (hr:leaves:manage); PATCH `/hr/leave-policies/{param}` LeavePoliciesController_update (hr:leaves:manage); GET `/hr/leaves/types` LeavesController_listLeaveTypes (hr:leaves:view); POST `/hr/leave-policies/templates/dismiss` LeavePoliciesController_dismissTemplates (hr:leaves:manage); POST `/hr/leave-policies/templates/import` LeavePoliciesController_importTemplates (hr:leaves:manage); GET `/hr/leave-policies/templates` LeavePoliciesController_templateOffer (hr:leaves:manage)
- Controls: `Create leave policy`, `Add standard defaults`, `Add leave type`, `handleOpenEdit(type)} >`, `Use standard Indian defaults`, `Leave type name`, `Days per year`, `Not now`, `Import policies'}`

### `/hr/leaves`

- Area: leave. Permission gate: self:leaves | hr:leaves:view. Sidebar: Leave.
- Flags: none.
- Cases: HRMS-SMK-0010, HRMS-REG-0659, HRMS-REG-0660, HRMS-REG-0661, HRMS-REG-0662, HRMS-REG-0663, HRMS-REG-0664, HRMS-REG-0665, HRMS-REG-0666, HRMS-REG-0667, HRMS-REG-0668, HRMS-REG-0669, HRMS-REG-0670, HRMS-REG-0671.
- APIs: POST `/me/time-off` EmployeeTimeOffController_create (self:leaves); PATCH `/me/time-off/{param}/cancel` EmployeeTimeOffController_cancel (self:leaves); PUT `/hr/leaves/{param}/approve` LeavesController_approve (hr:leaves:approve); PUT `/hr/leaves/{param}/reject` LeavesController_reject (hr:leaves:approve); GET `/hr/leave-policy` LeavePolicySummaryController_getSummary (hr:leaves:view); GET `/me/time-off` EmployeeTimeOffController_pageData (self:leaves); GET `/hr/leaves/team` LeavesController_team (hr:leaves:view); GET `/me/time-off/requests` EmployeeTimeOffController_requests (self:leaves); GET `/me/time-off/team-calendar` EmployeeTimeOffController_teamCalendar (self:leaves); POST `/storage/upload` StorageController_upload; GET `/me/approvers/{param}` ApprovalAuthorityController_myApprover; POST `/me/time-off/wfh` EmployeeTimeOffController_createWfh (self:attendance); GET `/me/time-off/wfh` EmployeeTimeOffController_listWfh (self:attendance); GET `/hr/wfh/pending` WfhController_pending (hr:attendance:manage); GET `/me/preferences` MeController_getMyPreferences; POST `/hr/leaves/types/seed-defaults` LeavesController_seedDefaultLeaveTypes (hr:leaves:manage); GET `/hr/leaves/team-availability` LeavesController_teamAvailability (hr:leaves:read)
- Controls: `Configure leave types`, `Remove file`, `Leave balances`, `My leave requests`, `You are the approver — decide in Action Center`, `Cancel request`, `WFH statistics`, `My WFH requests`, `) : null}`, `Leave approvals`, `Approve`, `Reject`, `Cancel`, `Reject Request`, `Pending WFH approvals`, `Previous month`, `Next month`, `Approved leave by day`, `Approvals ) : null}`, `Export`, `Filter WFH requests by status`, `Leave settings and reports`

### `/hr/leaves/analytics`

- Area: leave. Permission gate: hr:leaves:view. Sidebar: Analytics.
- Flags: none.
- Cases: HRMS-REG-0672, HRMS-REG-0673, HRMS-REG-0674, HRMS-REG-0675, HRMS-REG-0676, HRMS-REG-0677.
- APIs: GET `/hr/analytics` HrAnalyticsController_overview (hr:analytics:read)
- Controls: `Open people analytics`

### `/hr/legal-holds`

- Area: hrms-ops. Permission gate: hr:legalhold:view. Sidebar: Legal Holds.
- Flags: none.
- Cases: HRMS-REG-0678, HRMS-REG-0679, HRMS-REG-0680, HRMS-REG-0681, HRMS-REG-0682, HRMS-REG-0683, HRMS-REG-0684, HRMS-REG-0685, HRMS-REG-0686, HRMS-REG-0687, HRMS-REG-0688, HRMS-REG-0689.
- APIs: GET `/organization/members` OrganizationMembersController_listMembers (settings:view); GET `/hr/governance/legal-holds` LegalHoldsController_list (hr:legalhold:view); POST `/hr/governance/legal-holds/{param}/release` LegalHoldsController_release (hr:legalhold:manage); DELETE `/hr/governance/legal-holds/{param}` LegalHoldsController_softDelete (hr:legalhold:manage); POST `/hr/governance/legal-holds` LegalHoldsController_create (hr:legalhold:manage); POST `/hr/governance/legal-holds/{param}/items` LegalHoldsController_attachItem (hr:legalhold:manage); DELETE `/hr/governance/legal-holds/{param}/items/{param}` LegalHoldsController_detachItem (hr:legalhold:manage); GET `/hr/governance/legal-holds/{param}/items` LegalHoldsController_listItems (hr:legalhold:view)
- Controls: `handleViewItems(row)}> Items`, `setPending( )}> Release`, `setPending( )} > Delete`, `Place Hold`, `Attach`, `Cancel`, `Item type`

### `/hr/onboarding`

- Area: onboarding. Permission gate: hr:employees:update | hr:onboarding:manage | hr:employees:view | hr:sensitive:view. Sidebar: Onboarding.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0011, HRMS-REG-0690, HRMS-REG-0691, HRMS-REG-0692, HRMS-REG-0693, HRMS-REG-0694, HRMS-REG-0695, HRMS-REG-0696, HRMS-REG-0697, HRMS-REG-0698, HRMS-REG-0699, HRMS-REG-0700, HRMS-REG-0701, HRMS-REG-0702, HRMS-REG-0703, HRMS-BLK-0001, HRMS-BLK-0002, HRMS-BLK-0003.
- APIs: POST `/hr/employees/onboard` EmployeesController_onboard (hr:onboarding:manage); POST `/hr/employees/{param}/resend-invite` EmployeesController_resendInvite (hr:onboarding:manage); POST `/hr/employees/{param}/invite-link` EmployeesController_createInviteLink (hr:onboarding:manage); POST `/hr/employees/onboard/bulk` EmployeesController_onboardBulk (hr:onboarding:manage); POST `/hr/employees/onboard/bulk/preview` EmployeesController_previewBulk (hr:onboarding:manage); GET `/onboarding/templates/departments` HrOnboardingAdminController_listTemplateDepartments (hr:onboarding:manage); POST `/onboarding` HrOnboardingAdminController_initiate (hr:onboarding:manage); GET `/onboarding` HrOnboardingAdminController_getProgress (hr:onboarding:manage); GET `/hr/onboarding-docs/me` OnboardingViewsController_listMine (self:onboarding-docs); POST `/hr/onboarding-docs/me` OnboardingViewsController_createMine (self:onboarding-docs); GET `/onboarding/templates` HrOnboardingAdminController_listTemplates (hr:onboarding:manage); POST `/onboarding/templates` HrOnboardingAdminController_createTemplate (hr:onboarding:manage); GET `/org-hierarchy/locations` OrgHierarchyController_listLocations (settings:view); GET `/hr/employees/check-email` EmployeesController_checkEmail (hr:onboarding:manage); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); POST `/hr/departments` HrDepartmentsController_create (hr:employees:manage); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates; GET `/hr/reporting-manager-policy` ReportingManagerPolicyController_get (hr:employees:view); GET `/hr/payroll/salary-structures` SalaryStructureTemplatesController_list (hr:salary:view); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/employees/counts` EmployeesController_countEmployees (hr:employees:view); POST `/storage/upload` StorageController_upload; GET `/hr/document-types` HrDocumentTypesController_list
- Controls: `Single employee`, `Bulk upload`, `View Reviews`, `Configure Types`, `Review Submissions`, `Workflow`, `Plans`, `New Employee`, `Documents`, `Probation`, `My Documents`, `Onboard mode`, `Back`, `Submit`, `Add additional manager`, `What happens when you submit`, `Initiate Onboarding`, `Resend invite`, `Copy invite link`, `Save & Continue`, `Upload`, `Add step`, `Create plan`, `Remove step`, `Download template`, `Clear`, `Check again`, `Create`, `Onboard more`, `Download error report`, `View employees`, `Upload employee onboard file`, `Choose employee onboard file`

### `/hr/onboarding/[userId]`

- Area: onboarding. Permission gate: hr:onboarding:manage | hr:onboarding:tasks:view | self:onboarding-tasks | self:onboarding-docs. Sidebar: Onboarding.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0704, HRMS-REG-0705, HRMS-REG-0706, HRMS-REG-0707, HRMS-REG-0708, HRMS-REG-0709, HRMS-REG-0710, HRMS-REG-0711, HRMS-REG-0712.
- APIs: GET `/onboarding/{param}` HrOnboardingAdminController_getUserTasks (hr:onboarding:tasks:view); PATCH `/onboarding/tasks/{param}` OnboardingController_updateTask (self:onboarding-tasks); GET `/onboarding` HrOnboardingAdminController_getProgress (hr:onboarding:manage)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/hr/onboarding/probation`

- Area: onboarding. Permission gate: hr:probation:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-0713, HRMS-REG-0714, HRMS-REG-0715, HRMS-REG-0716, HRMS-REG-0717, HRMS-REG-0718, HRMS-REG-0719, HRMS-REG-0720, HRMS-REG-0721, HRMS-REG-0722, HRMS-REG-0723, HRMS-REG-0724, HRMS-REG-0725, HRMS-REG-0726.
- APIs: GET `/hr/probation` ProbationController_listDueForReview (hr:probation:view); POST `/hr/probation/{param}/confirm` ProbationController_confirm (hr:probation:manage); POST `/hr/probation/{param}/extend` ProbationController_extend (hr:probation:manage)
- Controls: `Extend`, `Confirm`

### `/hr/org`

- Area: people. Permission gate: hr:employees:view. Sidebar: Job Architecture.
- Flags: none.
- Cases: HRMS-REG-0727, HRMS-REG-0728, HRMS-REG-0729, HRMS-REG-0730, HRMS-REG-0731, HRMS-REG-0732, HRMS-REG-0733, HRMS-REG-0734, HRMS-REG-0735, HRMS-REG-0736, HRMS-REG-0737, HRMS-REG-0738, HRMS-REG-0739.
- APIs: GET `/hr/org/roles` HrOrgCatalogController_listJobRoles (hr:employees:view); POST `/hr/org/roles` HrOrgCatalogController_createJobRole (hr:employees:manage); PATCH `/hr/org/roles/{param}` HrOrgCatalogController_updateJobRole (hr:employees:manage); DELETE `/hr/org/roles/{param}` HrOrgCatalogController_deleteJobRole (hr:employees:manage); GET `/hr/org/levels` HrOrgCatalogController_listJobLevels (hr:employees:view); POST `/hr/org/levels` HrOrgCatalogController_createJobLevel (hr:employees:manage); PATCH `/hr/org/levels/{param}` HrOrgCatalogController_updateJobLevel (hr:employees:manage); DELETE `/hr/org/levels/{param}` HrOrgCatalogController_deleteJobLevel (hr:employees:manage)
- Controls: `Job Roles`, `Job Levels`, `Edit`, `Delete`, `Add`

### `/hr/org-chart`

- Area: people. Permission gate: (none on page). Sidebar: Org Chart.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0740, HRMS-REG-0741, HRMS-REG-0742, HRMS-REG-0743, HRMS-REG-0744, HRMS-REG-0745, HRMS-REG-0746, HRMS-REG-0747.
- APIs: GET `/hr/org-chart` OrgStructureController_orgChart (hr:employees:view)
- Controls: `Previous`, `Next`, `Organization chart pages`

### `/hr/overtime`

- Area: attendance. Permission gate: hr:attendance:view | hr:attendance:manage. Sidebar: Overtime.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0748, HRMS-REG-0749, HRMS-REG-0750, HRMS-REG-0751, HRMS-REG-0752, HRMS-REG-0753, HRMS-REG-0754, HRMS-REG-0755, HRMS-REG-0756, HRMS-REG-0757, HRMS-REG-0758, HRMS-REG-0759.
- APIs: GET `/hr/overtime` OvertimeController_list (hr:attendance:view); PATCH `/hr/overtime/{param}/approve` OvertimeController_approve (hr:attendance:manage); PATCH `/hr/overtime/{param}/reject` OvertimeController_reject (hr:attendance:manage); GET `/hr/overtime/comp-off` OvertimeController_getCompOff (hr:attendance:view); POST `/hr/overtime` OvertimeController_create (hr:attendance:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Request overtime`, `Overtime Requests`, `Comp-Off Balances`, `handleApprove(req.id)} disabled= isPending= > Approve`, `handleReject(req.id)} disabled= isPending= > Reject`

### `/hr/performance`

- Area: hrms-ops. Permission gate: hr:performance:manage. Sidebar: Performance.
- Flags: none.
- Cases: HRMS-REG-0760, HRMS-REG-0761, HRMS-REG-0762, HRMS-REG-0763, HRMS-REG-0764, HRMS-REG-0765, HRMS-REG-0766, HRMS-REG-0767, HRMS-REG-0768, HRMS-REG-0769, HRMS-REG-0770, HRMS-REG-0771, HRMS-REG-0772, HRMS-REG-0773.
- APIs: GET `/hr/performance/reviews` PerformanceController_listReviews (hr:performance:view); POST `/hr/performance/goals` PerformanceController_createGoal (hr:performance:manage); GET `/hr/performance/cycles` PerformanceController_listCycles (hr:performance:view); POST `/hr/performance/reviews` PerformanceController_createReview (hr:performance:manage); PATCH `/hr/performance/reviews/{param}` PerformanceController_updateReview (hr:performance:view); DELETE `/hr/performance/reviews/{param}` PerformanceController_deleteReview (hr:performance:manage); PATCH `/hr/performance/goals/{param}` PerformanceController_updateGoal (hr:performance:view); DELETE `/hr/performance/goals/{param}` PerformanceController_deleteGoal (hr:performance:manage); GET `/hr/performance/one-on-ones` PerformanceController_listOneOnOnes (hr:performance:view); POST `/hr/performance/one-on-ones` PerformanceController_createOneOnOne (hr:performance:view); PATCH `/hr/performance/one-on-ones/{param}` PerformanceController_updateOneOnOne (hr:performance:view); DELETE `/hr/performance/one-on-ones/{param}` PerformanceController_deleteOneOnOne (hr:performance:view); POST `/hr/performance/cycles` PerformanceController_createCycle (hr:performance:manage); PATCH `/hr/performance/cycles/{param}` PerformanceController_updateCycle (hr:performance:manage); DELETE `/hr/performance/cycles/{param}` PerformanceController_deleteCycle (hr:performance:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); POST `/ai/generate-review` HrAiController_generateReview (hr:performance:manage); GET `/hr/performance/goals` PerformanceController_listGoals (hr:performance:view); GET `/hr/performance/pip` PerformanceController_listPips (hr:performance:view); POST `/hr/performance/pip` PerformanceController_createPip (hr:performance:manage); PATCH `/hr/performance/pip/{param}` PerformanceController_updatePip (hr:performance:manage); GET `/hr/performance/calibration/cycles/{param}/entries` CalibrationController_listEntries (hr:performance:manage); POST `/hr/performance/calibration/cycles/{param}/entries` CalibrationController_upsertEntry (hr:performance:manage); GET `/hr/performance/calibration/nine-box` CalibrationController_getNineBox (hr:performance:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Reviews`, `Goals`, `1-on-1s`, `Cycles`, `PIP`, `Calibration`, `9-Box`, `Succession`, `All`, `Draft`, `In Progress`, `Completed`, `New Review`, `handleOpenEdit(review)} aria-label= ' : ""}'}>`, `handleComplete(review.id)}> Mark Complete`, `Employee`, `Review Cycle`, `AI Draft Review`, `Generate Review Draft`, `Copy All`, `Regenerate`, `Stop`, `Retry`, `Edit`, `Discard`, `Run again`, `Loading sources`, `New Goal`, `handleOpenEdit(goal)}> Edit`, `+10% Progress`, `Mark Complete`, `setDeleteId(goal.id)} > Delete`, `Goal actions`, `Schedule 1-on-1`, `handleStatusChange(m.id, "COMPLETED")}>Mark Completed`, `handleStatusChange(m.id, "CANCELLED")}>Cancel meeting`, `setDeleteId(m.id)}> Delete`, `Meeting actions`, `Create review cycle`, `openEdit(cycle)}> Edit`

### `/hr/performance/analytics`

- Area: hrms-ops. Permission gate: hr:performance:view | hr:analytics:read | hr:performance:manage | hr:assets:manage. Sidebar: Analytics.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0774, HRMS-REG-0775, HRMS-REG-0776, HRMS-REG-0777, HRMS-REG-0778, HRMS-REG-0779, HRMS-REG-0780.
- APIs: GET `/hr/performance/cycles` PerformanceController_listCycles (hr:performance:view); GET `/hr/performance/reviews` PerformanceController_listReviews (hr:performance:view)
- Controls: `Open people analytics`

### `/hr/positions`

- Area: people. Permission gate: hr:positions:view. Sidebar: Positions.
- Flags: none.
- Cases: HRMS-REG-0781, HRMS-REG-0782, HRMS-REG-0783, HRMS-REG-0784, HRMS-REG-0785, HRMS-REG-0786, HRMS-REG-0787, HRMS-REG-0788, HRMS-REG-0789, HRMS-REG-0790, HRMS-REG-0791, HRMS-REG-0792, HRMS-REG-0793, HRMS-REG-0794.
- APIs: GET `/hr/governance/positions` PositionsController_list (hr:positions:view); DELETE `/hr/governance/positions/{param}` PositionsController_softDelete (hr:positions:manage); POST `/hr/governance/positions` PositionsController_create (hr:positions:manage); GET `/hr/governance/position-taxonomy/statuses` PositionsTaxonomyController_listStatuses (hr:positions:view); POST `/hr/governance/position-taxonomy/statuses/seed-defaults` PositionsTaxonomyController_seedDefaultStatuses (hr:positions:manage); GET `/hr/governance/scenarios` PositionsController_listScenarios (hr:positions:view); GET `/hr/governance/scenarios/{param}/simulate` PositionsController_simulateScenario (hr:positions:view); DELETE `/hr/governance/scenarios/{param}` PositionsController_deleteScenario (hr:positions:manage); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view)
- Controls: `Positions`, `Reorg Scenarios`, `handleDelete(row.id)} isPending= > Delete`, `Create position`, `Add default statuses`, `handleSimulate(row.id)}> Simulate`, `Close`

### `/hr/reimbursements`

- Area: hrms-ops. Permission gate: hr:payroll:view. Sidebar: Reimbursements.
- Flags: none.
- Cases: HRMS-REG-0795, HRMS-REG-0796, HRMS-REG-0797, HRMS-REG-0798, HRMS-REG-0799, HRMS-REG-0800, HRMS-REG-0801, HRMS-REG-0802, HRMS-REG-0803, HRMS-REG-0804, HRMS-REG-0805, HRMS-REG-0806, HRMS-REG-0807.
- APIs: GET `/hr/reimbursements` HrPayrollReimbursementsController_list (hr:payroll:view); PATCH `/hr/reimbursements/{param}` HrPayrollReimbursementsController_update (hr:payroll:view); POST `/hr/reimbursements` HrPayrollReimbursementsController_create (hr:payroll:view); GET `/me/org-display` MeController_getOrgDisplay; POST `/storage/upload` StorageController_upload
- Controls: `Create reimbursement request`, `Approve`, `Reject`, `Remove receipt`, `Upload receipt`

### `/hr/retention`

- Area: hrms-ops. Permission gate: hr:retention:manage. Sidebar: Data Retention.
- Flags: none.
- Cases: HRMS-REG-0808, HRMS-REG-0809, HRMS-REG-0810, HRMS-REG-0811, HRMS-REG-0812, HRMS-REG-0813, HRMS-REG-0814, HRMS-REG-0815, HRMS-REG-0816, HRMS-REG-0817, HRMS-REG-0818, HRMS-REG-0819, HRMS-REG-0820.
- APIs: GET `/hr/governance/retention/policies` RetentionController_listPolicies (hr:retention:manage); POST `/hr/governance/retention/policies` RetentionController_createPolicy (hr:retention:manage); DELETE `/hr/governance/retention/policies/{param}` RetentionController_deletePolicy (hr:retention:manage); GET `/hr/governance/retention/requests` RetentionController_listRequests (hr:retention:manage); POST `/hr/governance/retention/requests` RetentionController_createRequest (hr:retention:manage); POST `/hr/governance/retention/requests/{param}/approve` RetentionController_approveRequest (hr:retention:manage); POST `/hr/governance/retention/requests/{param}/process` RetentionController_processRequest (hr:retention:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Retention Policies`, `Data Requests`, `handleDelete(row.id)} isPending= > Delete`, `Add Policy`, `setSheetOpen(false)}>Cancel`, `Create`, `handleApprove(row.id)} isPending= > Approve`, `Create data request`, `Submit`

### `/hr/rosters`

- Area: attendance. Permission gate: hr:attendance:view | hr:attendance:manage. Sidebar: Rosters.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0821, HRMS-REG-0822, HRMS-REG-0823, HRMS-REG-0824, HRMS-REG-0825, HRMS-REG-0826, HRMS-REG-0827, HRMS-REG-0828, HRMS-REG-0829, HRMS-REG-0830, HRMS-REG-0831, HRMS-REG-0832, HRMS-REG-0833.
- APIs: GET `/hr/shifts` ShiftsController_list (hr:attendance:view); GET `/hr/rosters` RostersController_list (hr:attendance:view); GET `/hr/rosters/{param}/entries` RostersController_getEntries (hr:attendance:view); PATCH `/hr/rosters/{param}/publish` RostersController_publish (hr:attendance:manage); POST `/hr/rosters/{param}/entries` RostersController_upsertEntry (hr:attendance:manage); POST `/hr/rosters` RostersController_create (hr:attendance:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `New roster`, `Assign`, `Publish`, `Assign an employee`

### `/hr/safety`

- Area: hrms-ops. Permission gate: hr:safety:view. Sidebar: Health & Safety.
- Flags: none.
- Cases: HRMS-REG-0834, HRMS-REG-0835, HRMS-REG-0836, HRMS-REG-0837, HRMS-REG-0838, HRMS-REG-0839, HRMS-REG-0840, HRMS-REG-0841, HRMS-REG-0842, HRMS-REG-0843, HRMS-REG-0844, HRMS-REG-0845, HRMS-REG-0846, HRMS-REG-0847.
- APIs: GET `/hr/safety/incidents` HrSafetyController_listIncidents (hr:safety:view); GET `/hr/safety/wellness/pulse` HrSafetyController_wellnessPulse (hr:safety:manage); POST `/hr/safety/incidents` HrSafetyController_createIncident (hr:safety:manage); POST `/hr/safety/wellness/checkin` HrSafetyController_checkin (hr:safety:view); GET `/hr/safety/wellness/my` HrSafetyController_myCheckins (hr:safety:view); GET `/hr/safety/wellness/burnout` HrSafetyController_burnoutFlags (hr:safety:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Report Incident`, `Search incidents`, `Filter by status`, `Filter by type`, `Filter by severity`, `Safety view`, `Submit Check-in`

### `/hr/service-delivery`

- Area: hrms-ops. Permission gate: hr:cases:view | hr:helpdesk:view | hr:safety:view. Sidebar: Service Delivery.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0848, HRMS-REG-0849, HRMS-REG-0850, HRMS-REG-0851, HRMS-REG-0852, HRMS-REG-0853.
- APIs: GET `/hr/service-delivery/ops-inbox` ServiceDeliveryController_getOpsInbox (hr:cases:view); GET `/hr/service-delivery/my-items` ServiceDeliveryController_getMyItems (hr:helpdesk:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/hr/settings`

- Area: hr-settings. Permission gate: (none on page). Sidebar: HR configuration.
- Flags: NAV_HUB, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0854, HRMS-REG-0855, HRMS-REG-0856, HRMS-REG-0857, HRMS-REG-0858, HRMS-REG-0859.
- APIs: No API call found in the page→feature→hook closure.
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/hr/settings/automations`

- Area: hr-settings. Permission gate: hr:automations:view | hr:automations:manage. Sidebar: Automations.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0860, HRMS-REG-0861, HRMS-REG-0862, HRMS-REG-0863, HRMS-REG-0864, HRMS-REG-0865, HRMS-REG-0866, HRMS-REG-0867, HRMS-REG-0868, HRMS-REG-0869, HRMS-REG-0870, HRMS-REG-0871.
- APIs: GET `/hr/automations/events` HrAutomationsController_getEvents (hr:automations:view); GET `/hr/automations` HrAutomationsController_list (hr:automations:view); POST `/hr/automations/{param}/toggle` HrAutomationsController_toggle (hr:automations:manage); DELETE `/hr/automations/{param}` HrAutomationsController_remove (hr:automations:manage); POST `/hr/automations` HrAutomationsController_create (hr:automations:manage); PATCH `/hr/automations/{param}` HrAutomationsController_update (hr:automations:manage); POST `/hr/automations/{param}/test` HrAutomationsController_test (hr:automations:manage)
- Controls: `Add Condition`, `Add Action`, `Cancel`, `Remove condition`, `Remove action`, `Close`, `Run Dry Test`, `Toggle automation`

### `/hr/settings/custom-fields`

- Area: hr-settings. Permission gate: (none on page). Sidebar: Custom Fields.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0872, HRMS-REG-0873, HRMS-REG-0874, HRMS-REG-0875, HRMS-REG-0876, HRMS-REG-0877, HRMS-REG-0878, HRMS-REG-0879, HRMS-REG-0880, HRMS-REG-0881, HRMS-REG-0882, HRMS-REG-0883.
- APIs: PATCH `/hr/custom-fields/definitions/{param}` HrCustomFieldsController_updateDefinition (hr:custom-fields:manage); DELETE `/hr/custom-fields/definitions/{param}` HrCustomFieldsController_deleteDefinition (hr:custom-fields:manage); GET `/hr/custom-fields/definitions` HrCustomFieldsController_listDefinitions (hr:custom-fields:manage); POST `/hr/custom-fields/definitions` HrCustomFieldsController_createDefinition (hr:custom-fields:manage)
- Controls: `New Field`, `Entity type`, `Delete field`, `handleEditClick(row)} aria-label="Edit field">`, `Edit field`, `Cancel`, `Remove option`, `Add Option`

### `/hr/settings/forms`

- Area: hr-settings. Permission gate: (none on page). Sidebar: Forms.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0884, HRMS-REG-0885, HRMS-REG-0886, HRMS-REG-0887, HRMS-REG-0888, HRMS-REG-0889, HRMS-REG-0890, HRMS-REG-0891, HRMS-REG-0892, HRMS-REG-0893, HRMS-REG-0894, HRMS-REG-0895.
- APIs: POST `/hr/forms/{param}/activate` HrFormsController_activate (hr:forms:manage); POST `/hr/forms/{param}/archive` HrFormsController_archive (hr:forms:manage); DELETE `/hr/forms/{param}` HrFormsController_delete (hr:forms:manage); GET `/hr/forms` HrFormsController_list (hr:forms:view); POST `/hr/forms` HrFormsController_create (hr:forms:manage)
- Controls: `New form`, `handleActivate(row.id)}> Activate`, `setConfirm( )}> Archive`, `Submissions`, `setConfirm( )}> Delete`, `Form actions`, `Add field`, `Move field up`, `} >`, `Move field down`, `Save form`, `onAddField(type)} >`, `Remove field`, `handleRemoveOption(idx)} aria-label= '}>`, `Add option`

### `/hr/settings/forms/[formId]`

- Area: hr-settings. Permission gate: hr:forms:view. Sidebar: Forms.
- Flags: none.
- Cases: HRMS-REG-0896, HRMS-REG-0897, HRMS-REG-0898, HRMS-REG-0899, HRMS-REG-0900, HRMS-REG-0901, HRMS-REG-0902, HRMS-REG-0903, HRMS-REG-0904, HRMS-REG-0905.
- APIs: GET `/hr/forms/{param}` HrFormsController_get (hr:forms:view); PATCH `/hr/forms/{param}` HrFormsController_update (hr:forms:manage)
- Controls: `Add field`, `Move field up`, `} >`, `Move field down`, `Save form`, `onAddField(type)} >`, `Remove field`, `handleRemoveOption(idx)} aria-label= '}>`, `Add option`

### `/hr/settings/forms/[formId]/submissions`

- Area: hr-settings. Permission gate: hr:forms:view. Sidebar: Forms.
- Flags: none.
- Cases: HRMS-REG-0906, HRMS-REG-0907, HRMS-REG-0908, HRMS-REG-0909, HRMS-REG-0910, HRMS-REG-0911, HRMS-REG-0912, HRMS-REG-0913, HRMS-REG-0914, HRMS-REG-0915, HRMS-REG-0916.
- APIs: GET `/hr/forms/{param}` HrFormsController_get (hr:forms:view); GET `/hr/forms/{param}/submissions` HrFormsController_listSubmissions (hr:forms:view); PATCH `/hr/forms/submissions/{param}/status` HrFormsController_updateStatus (hr:forms:manage)
- Controls: `View`, `Submission status`, `Submit`

### `/hr/settings/import-export`

- Area: hr-settings. Permission gate: hr:import:manage | hr:export:manage. Sidebar: Import / Export.
- Flags: CONTRACT_GAP.
- Cases: HRMS-REG-0917, HRMS-REG-0918, HRMS-REG-0919, HRMS-REG-0920, HRMS-REG-0921, HRMS-REG-0922, HRMS-REG-0923, HRMS-REG-0924, HRMS-REG-0925, HRMS-REG-0926, HRMS-REG-0927, HRMS-REG-0928, HRMS-REG-0929, HRMS-BLK-0011.
- APIs: GET `/hr/export/assets` — **CONTRACT GAP**; POST `/hr/import/jobs` HrImportController_createJob (hr:import:manage); POST `/hr/import/jobs/{param}/commit` HrImportController_commitJob (hr:import:manage); GET `/hr/import/jobs/{param}` HrImportController_getJob (hr:import:manage); GET `/hr/import/jobs` HrImportController_listJobs (hr:import:manage); POST `/hr/import/jobs/{param}/rollback` HrImportController_rollbackJob (hr:import:manage); GET `/hr/reporting-manager-policy` ReportingManagerPolicyController_get (hr:employees:view)
- Controls: `Import CSV`, `Export`, `Cancel`, `Back`, `Validate rows`, `Done`, `Commit rows`, `Import steps`, `View errors`, `Roll back import`

### `/hr/settings/integrations`

- Area: hr-settings. Permission gate: hr:integrations:manage. Sidebar: Integrations.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0930, HRMS-REG-0931, HRMS-REG-0932, HRMS-REG-0933, HRMS-REG-0934, HRMS-REG-0935, HRMS-REG-0936, HRMS-REG-0937, HRMS-REG-0938, HRMS-REG-0939, HRMS-REG-0940, HRMS-REG-0941.
- APIs: GET `/hr/webhooks` HrWebhooksController_list (hr:integrations:manage); PATCH `/hr/webhooks/{param}` HrWebhooksController_update (hr:integrations:manage); DELETE `/hr/webhooks/{param}` HrWebhooksController_remove (hr:integrations:manage); POST `/hr/webhooks/{param}/test` HrWebhooksController_test (hr:integrations:manage); POST `/hr/webhooks` HrWebhooksController_create (hr:integrations:manage); GET `/hr/webhooks/events` HrWebhooksController_getEvents (hr:integrations:manage); GET `/hr/webhooks/{param}/deliveries` HrWebhooksController_listDeliveries (hr:integrations:manage); POST `/hr/webhooks/{param}/deliveries/{param}/redeliver` HrWebhooksController_redeliver (hr:integrations:manage); GET `/integrations/connections` IntegrationsController_listConnections (integrations:connections:view); POST `/integrations/connections/initiate` IntegrationsController_initiate (integrations:connections:manage); DELETE `/integrations/connections/{param}` IntegrationsController_disconnect (integrations:connections:manage)
- Controls: `Send Test Payload`, `Delete`, `Add webhook`, `onOpenChange(false)} className="mt-auto"> Done`, `onOpenChange(false)} disabled= > Cancel`, `Re-deliver`, `Disconnect`, `Connect`

### `/hr/settings/policies`

- Area: hr-settings. Permission gate: hr:policies:view | hr:policies:manage. Sidebar: Policies.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0942, HRMS-REG-0943, HRMS-REG-0944, HRMS-REG-0945, HRMS-REG-0946, HRMS-REG-0947, HRMS-REG-0948, HRMS-REG-0949, HRMS-REG-0950, HRMS-REG-0951, HRMS-REG-0952, HRMS-REG-0953.
- APIs: POST `/hr/policies/{param}/activate` HrPoliciesController_activate (hr:policies:manage); GET `/hr/policies` HrPoliciesController_list (hr:policies:view); POST `/hr/policies/seed-defaults` HrPoliciesController_seedDefaults (hr:policies:manage); GET `/hr/policies/conflicts` HrPoliciesController_orgConflicts (hr:policies:view); POST `/hr/policies` HrPoliciesController_create (hr:policies:manage); PATCH `/hr/policies/{param}` HrPoliciesController_update (hr:policies:manage); POST `/hr/policies/{param}/archive` HrPoliciesController_archive (hr:policies:manage); POST `/hr/policies/{param}/versions` HrPoliciesController_createVersion (hr:policies:manage); GET `/hr/policies/{param}/conflicts` HrPoliciesController_conflicts (hr:policies:view); GET `/hr/policies/{param}/preview` HrPoliciesController_preview (hr:policies:view)
- Controls: `Activate`, `Add starter policies`, `Create policy`, `Policy type`, `Policy status`, `Add Scope`, `Remove scope`, `New Version`, `Force activate`, `Archive`, `Evaluate Policy`

### `/hr/settings/preview`

- Area: hr-settings. Permission gate: hr:policies:view. Sidebar: Preview.
- Flags: none.
- Cases: HRMS-REG-0954, HRMS-REG-0955, HRMS-REG-0956, HRMS-REG-0957, HRMS-REG-0958, HRMS-REG-0959.
- APIs: GET `/hr/settings-hub/effective-rules` HrSettingsHubController_getEffectiveRules (hr:policies:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/hr/settings/reporting-managers`

- Area: people. Permission gate: hr:reporting-lines:manage. Sidebar: Reporting managers.
- Flags: none.
- Cases: HRMS-REG-0960, HRMS-REG-0961, HRMS-REG-0962, HRMS-REG-0963, HRMS-REG-0964, HRMS-REG-0965, HRMS-REG-0966, HRMS-REG-0967, HRMS-REG-0968, HRMS-REG-0969.
- APIs: GET `/hr/reporting-manager-policy` ReportingManagerPolicyController_get (hr:employees:view); PATCH `/hr/reporting-manager-policy` ReportingManagerPolicyController_update (hr:reporting-lines:override); GET `/hr/reporting-lines/manager-candidates` ReportingLinesController_managerCandidates (hr:employees:view); GET `/me/reporting-manager-requests/manager-candidates` MyReportingManagerRequestsController_candidates
- Controls: `Save policy`, `Additional reporting managers per employee`

### `/hr/settings/templates`

- Area: hr-settings. Permission gate: hr:templates:view | hr:templates:manage. Sidebar: Templates.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0970, HRMS-REG-0971, HRMS-REG-0972, HRMS-REG-0973, HRMS-REG-0974, HRMS-REG-0975, HRMS-REG-0976, HRMS-REG-0977, HRMS-REG-0978, HRMS-REG-0979, HRMS-REG-0980, HRMS-REG-0981, HRMS-REG-0982.
- APIs: GET `/hr/templates` HrTemplatesController_list (hr:templates:view); POST `/hr/templates/seed-defaults` HrTemplatesController_seedDefaults (hr:templates:manage); POST `/hr/templates` HrTemplatesController_create (hr:templates:manage); GET `/hr/templates/{param}` HrTemplatesController_getOne (hr:templates:view); PATCH `/hr/templates/{param}` HrTemplatesController_update (hr:templates:manage); GET `/hr/templates/variables` HrTemplatesController_listVariables (hr:templates:view); POST `/hr/templates/{param}/transition` HrTemplatesController_transition (hr:templates:manage); POST `/hr/templates/{param}/render` HrTemplatesController_render (hr:templates:view)
- Controls: `}> Edit`, `Add starter templates`, `Create template`, `Cancel`, `Add Task`, `handleAddQuestion(section.id)} > Add Question`, `Add Section`, `Add Question`, `setConfirmTarget(action.to)} >`, `Preview`

### `/hr/settings/versions`

- Area: hr-settings. Permission gate: hr:policies:view | hr:policies:manage. Sidebar: Versions.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0983, HRMS-REG-0984, HRMS-REG-0985, HRMS-REG-0986, HRMS-REG-0987, HRMS-REG-0988, HRMS-REG-0989, HRMS-REG-0990.
- APIs: GET `/hr/settings-hub/versions` HrSettingsHubController_getVersions (hr:policies:view); POST `/hr/policies/{param}/activate` HrPoliciesController_activate (hr:policies:manage)
- Controls: `Activate`, `View history`, `Entity type`

### `/hr/settings/workflows`

- Area: hr-settings. Permission gate: hr:workflows:view | hr:workflows:manage | hr:workflows:approve. Sidebar: Workflows.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-0991, HRMS-REG-0992, HRMS-REG-0993, HRMS-REG-0994, HRMS-REG-0995, HRMS-REG-0996, HRMS-REG-0997, HRMS-REG-0998, HRMS-REG-0999, HRMS-REG-1000, HRMS-REG-1001, HRMS-REG-1002, HRMS-REG-1620.
- APIs: GET `/hr/workflows` HrWorkflowDefinitionsController_list (hr:workflows:view); POST `/hr/workflows/{param}/activate` HrWorkflowDefinitionsController_activate (hr:workflows:manage); POST `/hr/workflows/{param}/archive` HrWorkflowDefinitionsController_archive (hr:workflows:manage); POST `/hr/workflows/{param}/duplicate` HrWorkflowDefinitionsController_duplicate (hr:workflows:manage); DELETE `/hr/workflows/{param}` HrWorkflowDefinitionsController_remove (hr:workflows:manage); GET `/hr/workflows/{param}` HrWorkflowDefinitionsController_get (hr:workflows:view); POST `/hr/workflows` HrWorkflowDefinitionsController_create (hr:workflows:manage); PATCH `/hr/workflows/{param}` HrWorkflowDefinitionsController_update (hr:workflows:manage); POST `/hr/workflows/{param}/simulate` HrWorkflowDefinitionsController_simulate (hr:workflows:view)
- Controls: `New Workflow`, `Workflow Actions`, `setSimulateTarget(def)}> Simulate`, `handleEdit(def)}> Edit`, `handleActivate(def.id)}> Activate`, `handleArchive(def.id)}> Archive`, `handleDuplicate(def.id)}> Duplicate`, `setDeleteTarget(def)} > Delete`, `Add Step`, `Run simulation`, `onOpenChange(false)}> Close`

### `/hr/shifts`

- Area: attendance. Permission gate: hr:attendance:view | hr:attendance:manage. Sidebar: Shifts.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1003, HRMS-REG-1004, HRMS-REG-1005, HRMS-REG-1006, HRMS-REG-1007, HRMS-REG-1008, HRMS-REG-1009, HRMS-REG-1010, HRMS-REG-1011, HRMS-REG-1012, HRMS-REG-1013, HRMS-REG-1014, HRMS-REG-1015.
- APIs: GET `/hr/shifts` ShiftsController_list (hr:attendance:view); DELETE `/hr/shifts/{param}` ShiftsController_remove (hr:attendance:manage); GET `/hr/shifts/assignments` ShiftsController_getAssignments (hr:attendance:view); GET `/hr/shifts/swaps` ShiftsController_listSwaps (hr:attendance:view); PATCH `/hr/shifts/swaps/{param}` ShiftsController_updateSwap (hr:attendance:manage); POST `/hr/shifts` ShiftsController_create (hr:attendance:manage); PATCH `/hr/shifts/{param}` ShiftsController_update (hr:attendance:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Create shift`, `Shift Templates`, `Assignments`, `Swap Requests`, `onEdit(shift)} aria-label= '} >`, `handleApprove(swap.id)} isPending= disabled= > Approve`, `handleReject(swap.id)} isPending= disabled= > Reject`

### `/hr/simulator`

- Area: hrms-ops. Permission gate: hr:policies:manage. Sidebar: Policy simulator.
- Flags: none.
- Cases: HRMS-REG-1016, HRMS-REG-1017, HRMS-REG-1018, HRMS-REG-1019, HRMS-REG-1020, HRMS-REG-1021, HRMS-REG-1022, HRMS-REG-1023, HRMS-REG-1024, HRMS-REG-1025, HRMS-REG-1026, HRMS-REG-1027, HRMS-REG-1028, HRMS-REG-1029.
- APIs: POST `/hr/enterprise/ops/simulator/simulate/policy` SimulatorController_simulatePolicy (hr:policies:manage); POST `/hr/enterprise/ops/simulator/simulate/leave-balance` SimulatorController_simulateLeaveBalance (hr:policies:manage); POST `/hr/enterprise/ops/simulator/simulate/approval-routing` SimulatorController_simulateApprovalRouting (hr:policies:manage); POST `/hr/enterprise/ops/simulator/simulate/payroll-impact` SimulatorController_simulatePayrollImpact (hr:policies:manage); GET `/hr/enterprise/ops/simulator/compare` SimulatorController_compare (hr:policies:manage); GET `/hr/enterprise/ops/simulator/history` SimulatorController_listHistory (hr:policies:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Policy`, `Leave Balance`, `Approval Routing`, `Payroll Impact`, `Compare`, `History`, `Run Simulation`, `Project Balance`, `Resolve Approvers`, `Project Impact`, `Component type`, `Add component`, `Compare policies`

### `/hr/termination`

- Area: lifecycle. Permission gate: hr:exit:manage. Sidebar: Termination.
- Flags: none.
- Cases: HRMS-REG-1030, HRMS-REG-1031, HRMS-REG-1032, HRMS-REG-1033, HRMS-REG-1034, HRMS-REG-1035, HRMS-REG-1036, HRMS-REG-1037, HRMS-REG-1038, HRMS-REG-1039, HRMS-REG-1040, HRMS-REG-1041.
- APIs: GET `/hr/termination` TerminationController_list (hr:exit:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); POST `/hr/termination` TerminationController_create (hr:exit:manage); PATCH `/hr/termination/{param}/submit` TerminationController_submit (hr:exit:manage); PATCH `/hr/termination/{param}/complete` TerminationController_complete (hr:exit:manage); PATCH `/hr/termination/{param}/final-review` TerminationController_finalReview (hr:exit:approve); POST `/hr/termination/{param}/send-email` TerminationController_sendEmail (hr:exit:manage)
- Controls: `New Termination`, `onView(record)} aria-label= '} > View`, `onApprove(record.id)} aria-label= '} > Approve`, `onReject(record.id)} aria-label= '} > Reject`, `onSendEmail(record)} aria-label= '} > Send Email`, `Select termination reason`, `Remarks`, `Notice period waived`, `Save as draft`, `Severance amount`, `Internal notes`, `Termination letter preview`, `FINAL remarks`

### `/hr/travel`

- Area: hrms-ops. Permission gate: hr:travel:view | hr:travel:manage | hr:travel:create. Sidebar: Travel.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1042, HRMS-REG-1043, HRMS-REG-1044, HRMS-REG-1045, HRMS-REG-1046, HRMS-REG-1047, HRMS-REG-1048, HRMS-REG-1049, HRMS-REG-1050, HRMS-REG-1051.
- APIs: GET `/hr/travel` TravelController_listMine (hr:travel:view); POST `/hr/travel` TravelController_create (hr:travel:create); GET `/me/org-display` MeController_getOrgDisplay
- Controls: `Request travel`

### `/hr/travel/approvals`

- Area: hrms-ops. Permission gate: hr:travel:view | hr:travel:manage | hr:travel:create. Sidebar: Travel Approvals.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1052, HRMS-REG-1053, HRMS-REG-1054, HRMS-REG-1055, HRMS-REG-1056, HRMS-REG-1057, HRMS-REG-1058, HRMS-REG-1059, HRMS-REG-1060, HRMS-REG-1061, HRMS-REG-1062.
- APIs: GET `/me/org-display` MeController_getOrgDisplay; GET `/hr/travel/approvals` TravelController_listPending (hr:travel:manage); PATCH `/hr/travel/{param}/manager-approve` TravelController_managerApprove (hr:travel:manage); PATCH `/hr/travel/{param}/finance-approve` TravelController_financeApprove (hr:travel:manage); PATCH `/hr/travel/{param}/reject` TravelController_reject (hr:travel:manage); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `Reject`, `Confirm`, `Cancel`, `Approve`, `Finance approve`, `Reason for rejection`

### `/hr/work-logs`

- Area: attendance. Permission gate: self:attendance | hr:attendance:view | hr:leaves:view | self:leaves. Sidebar: Work Logs.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1063, HRMS-REG-1064, HRMS-REG-1065, HRMS-REG-1066, HRMS-REG-1067, HRMS-REG-1068, HRMS-REG-1069, HRMS-REG-1070, HRMS-REG-1071, HRMS-REG-1072, HRMS-REG-1073.
- APIs: GET `/hr/work-logs` WorkLogsController_list (hr:attendance:view); POST `/hr/work-logs` WorkLogsController_create (hr:attendance:view); GET `/me/time-off/requests` EmployeeTimeOffController_requests (self:leaves); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view)
- Controls: `Export work logs`, `Export`, `Select year`, `Select quarter`, `Show work logs for`, `Reset`, `Apply Filters`, `Search work logs`, `Clear all filters`, `removeLink(index)} aria-label= '} >`, `Add link`, `Save`, `Discard`, `setExpanded(false)} > Collapse`, `Loading work logs`

### `/hr/workforce`

- Area: hrms-ops. Permission gate: hr:analytics:read. Sidebar: Workforce.
- Flags: none.
- Cases: HRMS-REG-1074, HRMS-REG-1075, HRMS-REG-1076, HRMS-REG-1077, HRMS-REG-1078, HRMS-REG-1079, HRMS-REG-1080, HRMS-REG-1081, HRMS-REG-1082, HRMS-REG-1083, HRMS-REG-1084, HRMS-REG-1085, HRMS-REG-1086.
- APIs: GET `/hr/analytics-plus/workforce/budget-vs-actual` HrAnalyticsPlusController_getBudgetVsActual (hr:headcount:read); GET `/hr/analytics-plus/workforce/skills-gap` HrAnalyticsPlusController_getSkillsGap (hr:analytics:read); GET `/hr/analytics-plus/workforce/succession-risk` HrAnalyticsPlusController_getSuccessionRisk (hr:succession:view); GET `/hr/analytics-plus/workforce/plans` HrAnalyticsPlusController_getWorkforcePlans (hr:headcount:read); POST `/hr/analytics-plus/workforce/plans` HrAnalyticsPlusController_createPlan (hr:workforce:manage); PATCH `/hr/analytics-plus/workforce/plans/{param}` HrAnalyticsPlusController_updatePlan (hr:workforce:manage)
- Controls: `Cancel`, `Edit`, `Add plan`, `Overview`, `Hiring Plans`, `Skills Gap`, `Succession Risk`

### `/hr/workforce-cost`

- Area: hrms-ops. Permission gate: hr:biometric:manage | hr:compensation:manage | hr:equity:view | hr:equity:manage. Sidebar: Cost Analysis.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1087, HRMS-REG-1088, HRMS-REG-1089, HRMS-REG-1090, HRMS-REG-1091, HRMS-REG-1092.
- APIs: GET `/me/org-display` MeController_getOrgDisplay; GET `/hr/enterprise/comp/costing/summary` WorkforceCostingController_summary (hr:analytics:read); GET `/hr/enterprise/comp/costing/by-department` WorkforceCostingController_byDepartment (hr:analytics:read); GET `/hr/enterprise/comp/costing/by-location` WorkforceCostingController_byLocation (hr:analytics:read)
- Controls: `Department cost period`

### `/interview-booking/[bookingToken]`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-REG-1093, HRMS-REG-1094, HRMS-REG-1095, HRMS-REG-1096, HRMS-REG-1097, HRMS-REG-1098, HRMS-REG-1099, HRMS-REG-1100, HRMS-REG-1101.
- APIs: POST `/public/interview-booking/{param}` HrInterviewBookingController_book; GET `/public/interview-booking/{param}` PublicController_getBookingLink
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/me`

- Area: people. Permission gate: hr:onboarding:manage | hr:onboarding:tasks:view | self:onboarding-tasks | self:onboarding-docs. Sidebar: My Day.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0012, HRMS-REG-1102, HRMS-REG-1103, HRMS-REG-1104, HRMS-REG-1105, HRMS-REG-1106, HRMS-REG-1107, HRMS-REG-1108, HRMS-REG-1109, HRMS-REG-1110, HRMS-REG-1111, HRMS-REG-1112.
- APIs: GET `/onboarding/me` OnboardingController_getMyTasks (self:onboarding-tasks); GET `/me/attendance/status` EmployeeAttendanceController_status (self:attendance); POST `/me/attendance/check-in` EmployeeAttendanceController_checkIn (self:attendance); POST `/me/attendance/check-out` EmployeeAttendanceController_checkOut (self:attendance); GET `/me/time-off` EmployeeTimeOffController_pageData (self:leaves); GET `/me/time-off/requests` EmployeeTimeOffController_requests (self:leaves); GET `/me/preferences` MeController_getMyPreferences; GET `/payroll/me/payslips` EssController_getPayslips (self:payslips)
- Controls: `Recent`

### `/me/attendance`

- Area: attendance. Permission gate: self:attendance | hr:attendance:view | hr:leaves:view | self:leaves. Sidebar: Attendance.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0013, HRMS-REG-1113, HRMS-REG-1114, HRMS-REG-1115, HRMS-REG-1116, HRMS-REG-1117, HRMS-REG-1118, HRMS-REG-1119, HRMS-REG-1120, HRMS-REG-1121, HRMS-REG-1122, HRMS-REG-1123.
- APIs: GET `/me/preferences` MeController_getMyPreferences; GET `/me/org-display` MeController_getOrgDisplay; GET `/me/attendance/status` EmployeeAttendanceController_status (self:attendance); POST `/me/attendance/check-in` EmployeeAttendanceController_checkIn (self:attendance); POST `/me/attendance/check-out` EmployeeAttendanceController_checkOut (self:attendance); POST `/me/attendance/break` EmployeeAttendanceController_toggleBreak (self:attendance); GET `/hr/attendance/monthly` AttendanceController_monthly (hr:attendance:view); GET `/me/attendance/monthly` EmployeeAttendanceController_monthly (self:attendance); GET `/me/attendance/history` EmployeeAttendanceController_history (self:attendance); GET `/me/attendance/logs` EmployeeAttendanceController_logs (self:attendance); POST `/me/attendance/regularizations` EmployeeAttendanceController_createRegularization (self:attendance); GET `/hr/holidays/calendar` HrHolidaysController_calendar (hr:attendance:view); POST `/hr/attendance/email-report` AttendanceController_emailReport (hr:attendance:manage); GET `/hr/employees` EmployeesController_listEmployees (hr:employees:view)
- Controls: `Today's work and break totals`, `) : t("attendance.clockIn")}`, `Request WFH`, `Request regularisation`, `Retry`, `This week's presence`, `Send Report`, `Cancel`

### `/me/documents`

- Area: hrms-ops. Permission gate: hr:documents:view | self:onboarding-docs | hr:onboarding:manage | hr:documents:manage. Sidebar: My Documents.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1124, HRMS-REG-1125, HRMS-REG-1126, HRMS-REG-1127, HRMS-REG-1128, HRMS-REG-1129, HRMS-REG-1130.
- APIs: GET `/hr/onboarding-docs/me` OnboardingViewsController_listMine (self:onboarding-docs); POST `/storage/upload` StorageController_upload; GET `/hr/document-types` HrDocumentTypesController_list; GET `/hr/onboarding-docs` HrOnboardingDocsAdminController_list (hr:onboarding:manage); PATCH `/hr/onboarding-docs/{param}` HrOnboardingDocsAdminController_review (hr:onboarding:manage); POST `/hr/onboarding-docs/me` OnboardingViewsController_createMine (self:onboarding-docs); POST `/hr/onboarding-docs` HrOnboardingDocsAdminController_create (hr:onboarding:manage)
- Controls: `Upload Document`, `Retry`, `Choose File`, `Cancel`, `Upload`, `Remove file`

### `/me/expenses`

- Area: hrms-ops. Permission gate: hr:expenses:view | self:expenses | hr:expenses:approve | hr:expenses:read. Sidebar: Expenses.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0014, HRMS-REG-1131, HRMS-REG-1132, HRMS-REG-1133, HRMS-REG-1134, HRMS-REG-1135, HRMS-REG-1136, HRMS-REG-1137, HRMS-REG-1138, HRMS-REG-1139, HRMS-REG-1140, HRMS-REG-1141.
- APIs: POST `/me/expenses` EmployeeExpensesController_create (self:expenses); GET `/me/expenses` EmployeeExpensesController_pageData (self:expenses); GET `/hr/expenses/page-data` ExpensesController_pageData (hr:expenses:view); POST `/me/expenses/{param}/withdraw` EmployeeExpensesController_withdraw (self:expenses); POST `/storage/upload` StorageController_upload
- Controls: `Submit Claim`, `Filter claims by status`, `Upload receipts`, `Add another receipt`, `Resubmit`, `Edit`, `Withdraw`, `View`, `View receipt`, `Download receipt`, `Cancel`, `Confirm reject`, `Reject`, `Approve`

### `/me/job-openings`

- Area: recruitment. Permission gate: self:job-openings. Sidebar: Job Openings.
- Flags: none.
- Cases: HRMS-REG-1142, HRMS-REG-1143, HRMS-REG-1144, HRMS-REG-1145, HRMS-REG-1146, HRMS-REG-1147, HRMS-REG-1148, HRMS-REG-1149, HRMS-REG-1150.
- APIs: POST `/hr/recruitment/me/job-openings/{param}/apply` RecruitmentSelfController_applyToJobOpening (self:job-openings); GET `/hr/recruitment/me/job-openings` RecruitmentSelfController_listJobOpenings (self:job-openings)
- Controls: `Apply`

### `/me/onboarding`

- Area: onboarding. Permission gate: self:onboarding-tasks. Sidebar: Onboarding Tasks.
- Flags: none.
- Cases: HRMS-SMK-0015, HRMS-REG-1151, HRMS-REG-1152, HRMS-REG-1153, HRMS-REG-1154, HRMS-REG-1155, HRMS-REG-1156, HRMS-REG-1157, HRMS-REG-1158.
- APIs: PATCH `/onboarding/tasks/{param}` OnboardingController_updateTask (self:onboarding-tasks); GET `/onboarding/me` OnboardingController_getMyTasks (self:onboarding-tasks)
- Controls: `All Onboarding`, `Collapse description`, `Expand description`

### `/me/recruitment`

- Area: recruitment. Permission gate: self:recruitment. Sidebar: Recruitment.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1159, HRMS-REG-1160, HRMS-REG-1161, HRMS-REG-1162, HRMS-REG-1163, HRMS-REG-1164, HRMS-REG-1165, HRMS-REG-1166, HRMS-REG-1167.
- APIs: GET `/me/recruitment` EmployeeRecruitmentController_list (self:recruitment); POST `/me/recruitment/{param}/scorecard` EmployeeRecruitmentController_submitScorecard (self:recruitment)
- Controls: `Join`, `setFeedbackInterview(interview)} >`, `Previous`, `= data.totalPages} onClick= > Next`, `onOpenChange(false)}> Cancel`, `Submit Feedback`, `Overall rating`, `Recommendation`

### `/me/referrals`

- Area: recruitment. Permission gate: self:referrals. Sidebar: My Referrals.
- Flags: none.
- Cases: HRMS-REG-1168, HRMS-REG-1169, HRMS-REG-1170, HRMS-REG-1171, HRMS-REG-1172, HRMS-REG-1173, HRMS-REG-1174, HRMS-REG-1175, HRMS-REG-1176.
- APIs: GET `/hr/recruitment/me/referrals` RecruitmentSelfController_listOwnReferrals (self:referrals); POST `/hr/recruitment/me/referrals` RecruitmentSelfController_createOwnReferral (self:referrals)
- Controls: `Refer someone`, `Submit referral`

### `/me/resignation`

- Area: lifecycle. Permission gate: self:resignation. Sidebar: Resignation.
- Flags: none.
- Cases: HRMS-REG-1177, HRMS-REG-1178, HRMS-REG-1179, HRMS-REG-1180, HRMS-REG-1181, HRMS-REG-1182, HRMS-REG-1183, HRMS-REG-1184, HRMS-REG-1185, HRMS-REG-1186, HRMS-REG-1187, HRMS-REG-1188.
- APIs: GET `/me/resignations` EmployeeResignationController_list (self:resignation); PATCH `/me/resignations/{param}/withdraw` EmployeeResignationController_withdraw (self:resignation); POST `/me/resignations` EmployeeResignationController_create (self:resignation); POST `/storage/upload` StorageController_upload
- Controls: `Withdraw`, `Submit resignation`, `Download Template`, `Reason Category`, `Willing for exit interview`, `Remove uploaded letter`, `Remove file`

### `/me/support`

- Area: hrms-ops. Permission gate: self:support | hr:helpdesk:view | hr:helpdesk:manage. Sidebar: Support.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1189, HRMS-REG-1190, HRMS-REG-1191, HRMS-REG-1192, HRMS-REG-1193, HRMS-REG-1194, HRMS-REG-1195, HRMS-REG-1196, HRMS-REG-1197, HRMS-REG-1198, HRMS-REG-1199, HRMS-REG-1200, HRMS-REG-1201, HRMS-REG-1202.
- APIs: GET `/me/support` EmployeeSupportController_list (self:support); POST `/me/support` EmployeeSupportController_create (self:support); GET `/me/support/suggest` EmployeeSupportController_suggest (self:support); POST `/me/support/{param}/comments` EmployeeSupportController_addComment (self:support); GET `/me/support/{param}` EmployeeSupportController_getById (self:support); POST `/hr/helpdesk/{param}/comments` HrHelpdeskController_addComment (hr:helpdesk:view); GET `/hr/helpdesk/{param}` HrHelpdeskController_getById (hr:helpdesk:view); PATCH `/hr/helpdesk/{param}` HrHelpdeskController_update (hr:helpdesk:view)
- Controls: `Create request`, `Status`, `Post reply`, `Queue`, `Reply`

### `/me/team`

- Area: people. Permission gate: self:leaves | hr:leaves:approve. Sidebar: My Team.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1203, HRMS-REG-1204, HRMS-REG-1205, HRMS-REG-1206, HRMS-REG-1207, HRMS-REG-1208, HRMS-REG-1209, HRMS-REG-1210, HRMS-REG-1211.
- APIs: GET `/me/team` ManagerHomeController_get; PUT `/hr/leaves/{param}/approve` LeavesController_approve (hr:leaves:approve)
- Controls: `Open Action Center`, `Pending decisions`, `Open`, `Decisions for my team`, `Overdue timesheets`

### `/me/time-off`

- Area: leave. Permission gate: self:leaves | hr:leaves:approve | hr:leaves:view | hr:attendance:view. Sidebar: Time Off.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0016, HRMS-REG-1212, HRMS-REG-1213, HRMS-REG-1214, HRMS-REG-1215, HRMS-REG-1216, HRMS-REG-1217, HRMS-REG-1218, HRMS-REG-1219, HRMS-REG-1220, HRMS-REG-1221, HRMS-REG-1222, HRMS-REG-1223.
- APIs: POST `/me/time-off` EmployeeTimeOffController_create (self:leaves); PATCH `/me/time-off/{param}/cancel` EmployeeTimeOffController_cancel (self:leaves); PUT `/hr/leaves/{param}/approve` LeavesController_approve (hr:leaves:approve); PUT `/hr/leaves/{param}/reject` LeavesController_reject (hr:leaves:approve); GET `/hr/leave-policy` LeavePolicySummaryController_getSummary (hr:leaves:view); GET `/me/time-off` EmployeeTimeOffController_pageData (self:leaves); GET `/hr/leaves/team` LeavesController_team (hr:leaves:view); GET `/me/time-off/requests` EmployeeTimeOffController_requests (self:leaves); GET `/me/time-off/team-calendar` EmployeeTimeOffController_teamCalendar (self:leaves); POST `/storage/upload` StorageController_upload; GET `/me/approvers/{param}` ApprovalAuthorityController_myApprover; POST `/me/time-off/wfh` EmployeeTimeOffController_createWfh (self:attendance); GET `/me/time-off/wfh` EmployeeTimeOffController_listWfh (self:attendance); GET `/hr/wfh/pending` WfhController_pending (hr:attendance:manage); GET `/me/preferences` MeController_getMyPreferences; POST `/hr/leaves/types/seed-defaults` LeavesController_seedDefaultLeaveTypes (hr:leaves:manage); GET `/hr/leaves/team-availability` LeavesController_teamAvailability (hr:leaves:read)
- Controls: `Configure leave types`, `Remove file`, `Leave balances`, `My leave requests`, `You are the approver — decide in Action Center`, `Cancel request`, `WFH statistics`, `My WFH requests`, `) : null}`, `Leave approvals`, `Approve`, `Reject`, `Cancel`, `Reject Request`, `Pending WFH approvals`, `Previous month`, `Next month`, `Approved leave by day`, `Approvals ) : null}`, `Export`, `Filter WFH requests by status`, `Leave settings and reports`

### `/offer/[offerToken]`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: none.
- Cases: HRMS-SMK-0017, HRMS-REG-1224, HRMS-REG-1225, HRMS-REG-1226, HRMS-REG-1227, HRMS-REG-1228, HRMS-REG-1229, HRMS-REG-1230, HRMS-REG-1231.
- APIs: GET `/public/offer/{param}` PublicController_getOffer; PATCH `/public/offer/{param}/respond` PublicController_respondToOffer
- Controls: `Accept Offer`, `Decline`, `Propose Different Terms`

### `/recruitment`

- Area: recruitment. Permission gate: hr:interviews:view | hr:requisitions:view | hr:requisitions:manage | hr:interviews:manage. Sidebar: Command Center.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0018, HRMS-REG-1232, HRMS-REG-1233, HRMS-REG-1234, HRMS-REG-1235, HRMS-REG-1236, HRMS-REG-1237.
- APIs: GET `/hr/recruitment/stats` HrRecruitmentReportsController_stats (hr:interviews:view); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view); GET `/hr/recruitment/interviews` HrInterviewsController_list (hr:interviews:view); GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view)
- Controls: `View All`, `Create`

### `/recruitment/analytics`

- Area: recruitment. Permission gate: hr:interviews:view | hr:requisitions:view | hr:requisitions:manage. Sidebar: Analytics.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1238, HRMS-REG-1239, HRMS-REG-1240, HRMS-REG-1241, HRMS-REG-1242, HRMS-REG-1243.
- APIs: GET `/hr/recruitment/stats` HrRecruitmentReportsController_stats (hr:interviews:view); GET `/hr/recruitment/analytics` RecruitingAnalyticsController_read (hr:requisitions:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/automations`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1244, HRMS-REG-1245, HRMS-REG-1246, HRMS-REG-1247, HRMS-REG-1248, HRMS-REG-1249, HRMS-REG-1250, HRMS-REG-1251, HRMS-REG-1252, HRMS-REG-1253, HRMS-REG-1254, HRMS-REG-1255.
- APIs: GET `/hr/recruitment/automations` RecruitmentAutomationController_listAutomations (hr:requisitions:view); POST `/hr/recruitment/automations` RecruitmentAutomationController_createAutomation (hr:requisitions:manage); PATCH `/hr/recruitment/automations/{param}` RecruitmentAutomationController_updateAutomation (hr:requisitions:manage); DELETE `/hr/recruitment/automations/{param}` RecruitmentAutomationController_deleteAutomation (hr:requisitions:manage)
- Controls: `New Automation`, `Cancel`, `Create`

### `/recruitment/bgv-compliance`

- Area: recruitment. Permission gate: hr:sensitive:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1256, HRMS-REG-1257, HRMS-REG-1258, HRMS-REG-1259, HRMS-REG-1260, HRMS-REG-1261.
- APIs: GET `/hr/recruitment/bgv-compliance` RecruitmentPipelineController_bgvCompliance (hr:sensitive:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/booking-links`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: Booking Links.
- Flags: none.
- Cases: HRMS-REG-1262, HRMS-REG-1263, HRMS-REG-1264, HRMS-REG-1265, HRMS-REG-1266, HRMS-REG-1267, HRMS-REG-1268, HRMS-REG-1269, HRMS-REG-1270, HRMS-REG-1271, HRMS-REG-1272.
- APIs: GET `/hr/recruitment/booking-links` HrInterviewersController_listBookingLinks (hr:interviews:view); PATCH `/hr/recruitment/booking-links/{param}` HrInterviewersController_cancelBookingLink (hr:interviews:manage); GET `/hr/recruitment/recruiters` RecruitmentRecruitersController_recruiterDirectory (hr:requisitions:view); POST `/hr/recruitment/interviews/suggest-slots` HrInterviewSchedulingController_suggestSlots (hr:interviews:manage)
- Controls: `Revoke`, `Find times`

### `/recruitment/candidates`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Candidates.
- Flags: none.
- Cases: HRMS-SMK-0019, HRMS-REG-1273, HRMS-REG-1274, HRMS-REG-1275, HRMS-REG-1276, HRMS-REG-1277, HRMS-REG-1278, HRMS-REG-1279, HRMS-REG-1280, HRMS-REG-1281, HRMS-REG-1282, HRMS-REG-1283, HRMS-REG-1284, HRMS-BLK-0007.
- APIs: PATCH `/hr/recruitment/candidates/{param}/stage` RecruitmentCandidatesController_moveStage (hr:requisitions:manage); DELETE `/hr/recruitment/candidates/{param}` RecruitmentCandidatesController_remove (hr:requisitions:manage); POST `/hr/recruitment/candidates/bulk-reject` RecruitmentCandidatesController_bulkReject (hr:requisitions:manage); GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view); POST `/hr/recruitment/candidates` RecruitmentCandidatesController_create (hr:requisitions:manage); PATCH `/hr/recruitment/candidates/{param}` RecruitmentCandidatesController_update (hr:requisitions:manage); POST `/ai/score-candidate` HrAiController_scoreCandidate (hr:interviews:manage); POST `/ai/hr/accept-candidate-score` HrAiController_acceptCandidateScore (hr:interviews:manage)
- Controls: `Reject`, `Compare`, `Clear`, `Import`, `Add Candidate`, `Cancel`, `Edit`, `Delete`, `Candidate actions`, `: "Get AI Estimate"}`, `Accept AI Score`, `Get AI Estimate`, `Stop`, `Retry`, `Discard`, `Loading sources`, `Run again`

### `/recruitment/candidates/[candidateId]`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage | hr:interviews:view | hr:interviews:manage. Sidebar: Candidates.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1285, HRMS-REG-1286, HRMS-REG-1287, HRMS-REG-1288, HRMS-REG-1289, HRMS-REG-1290, HRMS-REG-1291, HRMS-REG-1292, HRMS-REG-1293, HRMS-REG-1294, HRMS-REG-1295, HRMS-REG-1296, HRMS-REG-1297.
- APIs: GET `/hr/recruitment/candidates/{param}` RecruitmentCandidatesController_getOne (hr:requisitions:view); PATCH `/hr/recruitment/candidates/{param}` RecruitmentCandidatesController_update (hr:requisitions:manage); POST `/hr/recruitment/candidates/{param}/applications` RecruitmentCandidatesController_createApplication (hr:requisitions:manage); POST `/hr/recruitment/candidates/{param}/ai-score` RecruitmentCandidateRecordsController_aiScore (hr:requisitions:manage); POST `/hr/recruitment/candidates/{param}/composite-score` RecruitmentCandidateRecordsController_compositeScore (hr:requisitions:manage); DELETE `/hr/recruitment/candidates/{param}/personal-data` RecruitmentCandidatesController_erasePersonalData (hr:requisitions:manage); POST `/hr/recruitment/interviews` HrInterviewSchedulingController_create (hr:interviews:manage); GET `/hr/recruitment/scorecard-templates` HrScorecardsController_listTemplates (hr:interviews:view); POST `/hr/recruitment/interviews/{param}/scorecard` HrInterviewSchedulingController_submitScorecard (hr:interviews:manage); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view); GET `/hr/recruitment/candidates/{param}/rollout-documents` RecruitmentCandidateRecordsController_listRolloutDocuments (hr:requisitions:view); POST `/hr/recruitment/candidates/{param}/rollout-documents` RecruitmentCandidateRecordsController_generateRolloutDocuments (hr:requisitions:manage); GET `/hr/recruitment/candidates/{param}/vault` RecruitmentCandidateRecordsController_listVault (hr:requisitions:manage); PATCH `/hr/recruitment/candidates/{param}/bgv-status` RecruitmentCandidatesController_updateBgvStatus (hr:requisitions:manage); POST `/hr/recruitment/candidates/{param}/vault` RecruitmentCandidateRecordsController_addVaultDocument (hr:requisitions:manage); DELETE `/hr/recruitment/candidates/{param}/vault/{param}` RecruitmentCandidateRecordsController_deleteVaultDocument (hr:requisitions:manage); GET `/hr/recruitment/candidates/{param}/vault/access-logs` RecruitmentCandidateRecordsController_listVaultAccessLogs (hr:requisitions:manage); GET `/hr/recruitment/candidates/{param}/reference-checks` RecruitmentCandidateRecordsController_listReferenceChecks (hr:requisitions:view); POST `/hr/recruitment/candidates/{param}/reference-checks` RecruitmentCandidateRecordsController_createReferenceCheck (hr:requisitions:manage); PATCH `/hr/recruitment/candidates/{param}/reference-checks/{param}` RecruitmentCandidateRecordsController_updateReferenceCheck (hr:requisitions:manage); DELETE `/hr/recruitment/candidates/{param}/reference-checks/{param}` RecruitmentCandidateRecordsController_deleteReferenceCheck (hr:requisitions:manage); GET `/hr/recruitment/candidates/{param}/calibration` RecruitmentCandidateRecordsController_listCalibration (hr:requisitions:view); POST `/hr/recruitment/candidates/{param}/calibration` RecruitmentCandidateRecordsController_createCalibration (hr:requisitions:manage); PATCH `/hr/recruitment/candidates/{param}/calibration` RecruitmentCandidateRecordsController_updateCalibration (hr:requisitions:manage); GET `/hr/recruitment/candidates/{param}/referral` RecruitmentCandidateRecordsController_listReferrals (hr:requisitions:view)
- Controls: `Back to Candidates`, `Schedule Interview`, `Applications`, `Resume`, `Interviews`, `Messages`, `Documents`, `Referrals`, `Offers`, `Verification`, `References`, `Calibration`, `Activity`, `Generate Offer`, `Close`, `Cancel`, `Generate and send documents`, `Generate &amp; Send`, `Send email notification to candidate`, `Save`, `Start agency check`, `Send test`, `Vendor test id`, `Erase personal data`, `Browse`, `Drop zone for document upload`, `Upload vault document`, `Add Reference`, `Remove reference`, `Create Offer`, `Try again`, `Log Response Only`, `Send New Terms`, `Submit for Final Approval`, `Approve`, `Reject`, `History`, `Copy Offer Link`, `Edit`, `Mark Complete`

### `/recruitment/candidates/import`

- Area: recruitment. Permission gate: (none on page). Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1298, HRMS-REG-1299, HRMS-REG-1300, HRMS-REG-1301, HRMS-REG-1302, HRMS-REG-1303, HRMS-REG-1304, HRMS-REG-1305, HRMS-REG-1306, HRMS-BLK-0006.
- APIs: POST `/hr/recruitment/candidates/bulk-import` RecruitmentCandidatesController_bulkImport (hr:requisitions:manage)
- Controls: `Back`, `Preview ( rows)`, `Candidates'}`, `View Candidates`, `Import More`, `Reading file`

### `/recruitment/candidates/intake`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage | hr:interviews:view. Sidebar: Intake Inbox.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1307, HRMS-REG-1308, HRMS-REG-1309, HRMS-REG-1310, HRMS-REG-1311, HRMS-REG-1312, HRMS-REG-1313, HRMS-REG-1314, HRMS-REG-1315, HRMS-REG-1316, HRMS-REG-1317, HRMS-REG-1318, HRMS-REG-1319.
- APIs: GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view); POST `/hr/recruitment/candidates/bulk-reject` RecruitmentCandidatesController_bulkReject (hr:requisitions:manage); POST `/hr/recruitment/candidates/bulk-shortlist` RecruitmentCandidatesController_bulkShortlist (hr:requisitions:manage); GET `/hr/recruitment/candidates/duplicates` RecruitmentCandidatesController_findDuplicates (hr:requisitions:view); POST `/hr/recruitment/candidates/{param}/link-duplicate` RecruitmentCandidatesController_linkDuplicate (hr:requisitions:manage); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view)
- Controls: `Shortlist`, `Reject`, `Keep separate`, `Merge into this record`

### `/recruitment/developer`

- Area: recruitment. Permission gate: hr:integrations:manage. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1320, HRMS-REG-1321, HRMS-REG-1322, HRMS-REG-1323, HRMS-REG-1324, HRMS-REG-1325, HRMS-REG-1326, HRMS-REG-1327, HRMS-REG-1328.
- APIs: GET `/hr/recruitment/developer/events` AtsSandboxController_catalogue (hr:integrations:manage); GET `/hr/recruitment/developer/directory-sync` AtsSandboxController_directorySync (hr:integrations:manage); GET `/hr/recruitment/developer/deliveries` AtsSandboxController_recentDeliveries (hr:integrations:manage); POST `/hr/recruitment/developer/subscriptions/{param}/replay` AtsSandboxController_replay (hr:integrations:manage); GET `/hr/webhooks` HrWebhooksController_list (hr:integrations:manage)
- Controls: `Copy body`, `Replay`

### `/recruitment/diversity-report`

- Area: recruitment. Permission gate: hr:sensitive:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1329, HRMS-REG-1330, HRMS-REG-1331, HRMS-REG-1332, HRMS-REG-1333, HRMS-REG-1334.
- APIs: GET `/hr/recruitment/diversity-report` RecruitmentPipelineController_diversityReport (hr:sensitive:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view)
- Controls: `Apply`, `Reset`

### `/recruitment/email-sequences`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1335, HRMS-REG-1336, HRMS-REG-1337, HRMS-REG-1338, HRMS-REG-1339, HRMS-REG-1340, HRMS-REG-1341, HRMS-REG-1342, HRMS-REG-1343, HRMS-REG-1344, HRMS-REG-1345, HRMS-REG-1346, HRMS-BLK-0008.
- APIs: PATCH `/hr/recruitment/email-sequences/{param}` RecruitmentAutomationController_updateSequence (hr:requisitions:manage); GET `/hr/recruitment/email-sequences` RecruitmentAutomationController_listSequences (hr:requisitions:view); POST `/hr/recruitment/email-sequences` RecruitmentAutomationController_createSequence (hr:requisitions:manage); DELETE `/hr/recruitment/email-sequences/{param}` RecruitmentAutomationController_deleteSequence (hr:requisitions:manage); GET `/hr/recruitment/email-sequences/{param}/metrics` RecruitmentAutomationController_sequenceMetrics (hr:requisitions:view)
- Controls: `Add Step`, `Cancel`, `New Sequence`

### `/recruitment/headcount`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1347, HRMS-REG-1348, HRMS-REG-1349, HRMS-REG-1350, HRMS-REG-1351, HRMS-REG-1352, HRMS-REG-1353, HRMS-REG-1354, HRMS-REG-1355, HRMS-REG-1356, HRMS-REG-1357, HRMS-REG-1358, HRMS-REG-1359.
- APIs: GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); GET `/hr/recruitment/headcount` RecruitmentHeadcountController_listHeadcount (hr:requisitions:view); POST `/hr/recruitment/headcount` RecruitmentHeadcountController_createHeadcount (hr:requisitions:view); PATCH `/hr/recruitment/headcount/{param}` RecruitmentHeadcountController_updateHeadcount (hr:requisitions:view); POST `/hr/recruitment/headcount/{param}/reject` RecruitmentHeadcountController_rejectHeadcount (hr:requisitions:manage); POST `/hr/recruitment/headcount/{param}/approve` RecruitmentHeadcountController_approveHeadcount (hr:requisitions:manage); POST `/hr/recruitment/headcount/{param}/create-job` RecruitmentHeadcountController_createJobFromHeadcount (hr:requisitions:manage)
- Controls: `Cancel`, `Save Draft`, `Submit for Approval`, `Edit`, `Approve`, `Reject`, `Create Job Posting`, `Create headcount request`

### `/recruitment/hiring-flows`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1360, HRMS-REG-1361, HRMS-REG-1362, HRMS-REG-1363, HRMS-REG-1364, HRMS-REG-1365, HRMS-REG-1366, HRMS-REG-1367, HRMS-REG-1368, HRMS-REG-1369, HRMS-REG-1370.
- APIs: GET `/hr/recruitment/hiring-flows` HrHiringFlowsController_list (hr:interviews:view); DELETE `/hr/recruitment/hiring-flows/{param}` HrHiringFlowsController_remove (hr:interviews:manage); DELETE `/hr/recruitment/hiring-flows/{param}/rounds/{param}` HrHiringFlowsController_removeRound (hr:interviews:manage); POST `/hr/recruitment/hiring-flows` HrHiringFlowsController_create (hr:interviews:manage); PATCH `/hr/recruitment/hiring-flows/{param}` HrHiringFlowsController_update (hr:interviews:manage); POST `/hr/recruitment/hiring-flows/{param}/rounds` HrHiringFlowsController_createRound (hr:interviews:manage); PATCH `/hr/recruitment/hiring-flows/{param}/rounds/{param}` HrHiringFlowsController_updateRound (hr:interviews:manage)
- Controls: `New Flow`, `Rename flow`, `Delete flow`, `Add round`, `Flow actions`, `Edit round`, `Delete round`, `Round actions`, `Cancel`

### `/recruitment/inbox`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Inbox.
- Flags: none.
- Cases: HRMS-REG-1371, HRMS-REG-1372, HRMS-REG-1373, HRMS-REG-1374, HRMS-REG-1375, HRMS-REG-1376, HRMS-REG-1377, HRMS-REG-1378, HRMS-REG-1379.
- APIs: GET `/hr/recruitment/messages/threads` RecruitmentAutomationController_listMessageThreads (hr:requisitions:view); GET `/hr/recruitment/messages` RecruitmentAutomationController_listMessages (hr:requisitions:view); POST `/hr/recruitment/messages` RecruitmentAutomationController_sendMessage (hr:requisitions:manage)
- Controls: `Send`

### `/recruitment/integrations`

- Area: recruitment. Permission gate: hr:requisitions:manage | hr:interviews:view | hr:requisitions:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1380, HRMS-REG-1381, HRMS-REG-1382, HRMS-REG-1383, HRMS-REG-1384, HRMS-REG-1385, HRMS-REG-1386, HRMS-REG-1387, HRMS-REG-1388, HRMS-REG-1389.
- APIs: PUT `/hr/recruitment/integrations/{param}` RecruitmentIntegrationsController_connect (hr:requisitions:manage); DELETE `/hr/recruitment/integrations/{param}` RecruitmentIntegrationsController_disconnect (hr:requisitions:manage); GET `/hr/recruitment/integrations` RecruitmentIntegrationsController_list (hr:requisitions:manage); POST `/hr/recruitment/integrations/{param}/inbound-secret` RecruitmentIntegrationsController_rotateInboundSecret (hr:requisitions:manage); POST `/hr/recruitment/sourcing/extension-token` SourcingExtensionController_issueExtensionToken (settings:api-tokens:write); GET `/hr/recruitment/portals` RecruitmentRecruitersController_listPortals (hr:requisitions:manage); POST `/hr/recruitment/portals` RecruitmentRecruitersController_upsertPortal (hr:requisitions:manage)
- Controls: `Save key`, `Cancel`, `Callback secret`, `Disconnect`, `Done`, `Copy token`, `Issue token`

### `/recruitment/internal-jobs`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Internal Jobs.
- Flags: none.
- Cases: HRMS-REG-1390, HRMS-REG-1391, HRMS-REG-1392, HRMS-REG-1393, HRMS-REG-1394, HRMS-REG-1395, HRMS-REG-1396, HRMS-REG-1397, HRMS-REG-1398, HRMS-REG-1399, HRMS-REG-1400, HRMS-REG-1401.
- APIs: GET `/hr/recruitment/internal-jobs` RecruitmentJobsController_listInternalJobs (hr:requisitions:view); POST `/hr/recruitment/internal-jobs/{param}/apply` RecruitmentJobsController_internalApply (hr:requisitions:view); GET `/hr/recruitment/internal-mobility/my-applications` InternalMobilityController_myApplications; POST `/hr/recruitment/internal-mobility/approvals/{param}` InternalMobilityController_decide; GET `/hr/recruitment/internal-mobility/approvals` InternalMobilityController_approvals
- Controls: `Cancel`, `Submit Application`, `Approve the move`, `Decline`

### `/recruitment/interviewer-performance`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1402, HRMS-REG-1403, HRMS-REG-1404, HRMS-REG-1405, HRMS-REG-1406, HRMS-REG-1407.
- APIs: GET `/hr/recruitment/interviewer-performance` HrInterviewersController_interviewerPerformance (hr:interviews:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/interviews`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: Interviews.
- Flags: none.
- Cases: HRMS-SMK-0020, HRMS-REG-1408, HRMS-REG-1409, HRMS-REG-1410, HRMS-REG-1411, HRMS-REG-1412, HRMS-REG-1413, HRMS-REG-1414, HRMS-REG-1415, HRMS-REG-1416, HRMS-REG-1417, HRMS-REG-1418, HRMS-REG-1419, HRMS-REG-1420, HRMS-BLK-0010.
- APIs: GET `/hr/recruitment/interviews` HrInterviewsController_list (hr:interviews:view); GET `/hr/recruitment/interviews/stats` HrInterviewsController_stats (hr:interviews:view); PATCH `/hr/recruitment/interviews/{param}` HrInterviewSchedulingController_update (hr:interviews:manage); POST `/hr/recruitment/interviews/schedule` HrInterviewSchedulingController_schedule (hr:interviews:manage); GET `/hr/recruitment/interviewers/availability` HrInterviewersController_availability (hr:interviews:view); GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view); GET `/org/members` OrgController_listMembers (directory:people:view)
- Controls: `View in calendar`, `Performance`, `SLA Report`, `SLA Config`, `Schedule`, `Feedback`, `Reschedule`, `Add`, `Schedule Interview`, `Cancel`, `Add interviewer`, `Send email notifications`, `Send WhatsApp notifications`

### `/recruitment/jobs`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Jobs.
- Flags: none.
- Cases: HRMS-SMK-0021, HRMS-REG-1421, HRMS-REG-1422, HRMS-REG-1423, HRMS-REG-1424, HRMS-REG-1425, HRMS-REG-1426, HRMS-REG-1427, HRMS-REG-1428, HRMS-REG-1429, HRMS-REG-1430, HRMS-REG-1431.
- APIs: PATCH `/hr/recruitment/jobs/{param}` RecruitmentJobsController_update (hr:requisitions:manage); DELETE `/hr/recruitment/jobs/{param}` RecruitmentJobsController_remove (hr:requisitions:manage); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view); POST `/hr/recruitment/jobs/{param}/publish` RecruitmentJobsController_publish (hr:requisitions:manage); POST `/hr/recruitment/jobs/{param}/duplicate` RecruitmentJobsController_duplicate (hr:requisitions:manage); GET `/hr/recruitment/jobs/{param}/share` RecruitmentJobsController_share (hr:requisitions:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); GET `/hr/recruitment/jobs/{param}/board-postings` RecruitmentJobBoardsController_list (hr:requisitions:view); POST `/hr/recruitment/jobs/{param}/board-postings` RecruitmentJobBoardsController_create (hr:requisitions:manage); PATCH `/hr/recruitment/jobs/{param}/board-postings/{param}` RecruitmentJobBoardsController_update (hr:requisitions:manage); DELETE `/hr/recruitment/jobs/{param}/board-postings/{param}` RecruitmentJobBoardsController_remove (hr:requisitions:manage)
- Controls: `New Job`, `Mark as`, `Remove`, `Track Posting`, `Posting actions`, `Open posting`, `Open link`, `Edit`, `Duplicate`, `Publish`, `Post to Job Boards`, `Share Job Link`, `Track External Postings`, `Pause`, `Resume`, `Close Job`, `Reopen`, `Delete`, `View`, `Job actions`

### `/recruitment/jobs/[jobId]/edit`

- Area: recruitment. Permission gate: hr:interviews:view | hr:requisitions:view | hr:requisitions:manage | hr:employees:view. Sidebar: Jobs.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1432, HRMS-REG-1433, HRMS-REG-1434, HRMS-REG-1435, HRMS-REG-1436, HRMS-REG-1437, HRMS-REG-1438, HRMS-REG-1439, HRMS-REG-1440, HRMS-REG-1441, HRMS-REG-1442, HRMS-REG-1443, HRMS-REG-1444, HRMS-REG-1445.
- APIs: POST `/hr/recruitment/jobs` RecruitmentJobsController_create (hr:requisitions:manage); PATCH `/hr/recruitment/jobs/{param}` RecruitmentJobsController_update (hr:requisitions:manage); GET `/hr/recruitment/jobs/{param}` RecruitmentJobsController_getOne (hr:requisitions:view); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); GET `/org-hierarchy/branches/options` OrgHierarchyController_listOrgBranchOptions (branch:view); POST `/hr/recruitment/job-templates/{param}/apply` JobTemplatesController_apply (hr:requisitions:view); GET `/hr/recruitment/job-templates` JobTemplatesController_list (hr:requisitions:view); GET `/hr/recruitment/hiring-flows` HrHiringFlowsController_list (hr:interviews:view); POST `/ai/score-lead` CrmAiController_scoreLead (crm:ai:use); POST `/ai/generate-email` CrmAiController_generateEmail (crm:ai:use); POST `/ai/predict-deal` CrmAiController_predictDeal (crm:ai:use); POST `/ai/next-action` CrmAiController_nextAction (crm:ai:use); POST `/ai/enrich-lead` CrmAiController_enrichLead (crm:ai:use); POST `/ai/score-candidate` HrAiController_scoreCandidate (hr:interviews:manage); POST `/ai/generate-review` HrAiController_generateReview (hr:performance:manage); POST `/ai/attrition-risk` HrAiController_attritionRisk (hr:employees:manage); POST `/ai/nl-search` CrmAiController_nlSearch (crm:ai:use); GET `/settings/feature-flags` SettingsController_getFeatureFlags (settings:view); PATCH `/settings/feature-flags` SettingsController_updateFeatureFlag (settings:manage); GET `/settings/ai-usage` SettingsDeprecatedRoutesController_getAiUsage (ai:usage:view); POST `/ai/hr/interview-kit` HrAiController_interviewKit (hr:interviews:manage); POST `/ai/hr/interview-notes-summary` HrAiController_interviewNotesSummary (hr:interviews:manage); POST `/ai/hr/accept-candidate-score` HrAiController_acceptCandidateScore (hr:interviews:manage)
- Controls: `Save changes`, `Save draft`, `Publish`, `Start from template`, `Add question`, `Question type`, `Required`, `Knockout question`, `Resume Required`, `Cover Letter Required`, `Stop`, `Retry`, `Edit`, `Discard`, `Loading sources`, `Run again`, `Reject`

### `/recruitment/jobs/new`

- Area: recruitment. Permission gate: hr:interviews:view | hr:requisitions:view | hr:requisitions:manage | hr:employees:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1446, HRMS-REG-1447, HRMS-REG-1448, HRMS-REG-1449, HRMS-REG-1450, HRMS-REG-1451, HRMS-REG-1452, HRMS-REG-1453, HRMS-REG-1454, HRMS-REG-1455, HRMS-REG-1456, HRMS-REG-1457, HRMS-REG-1458, HRMS-REG-1459.
- APIs: POST `/hr/recruitment/jobs` RecruitmentJobsController_create (hr:requisitions:manage); PATCH `/hr/recruitment/jobs/{param}` RecruitmentJobsController_update (hr:requisitions:manage); GET `/hr/departments` HrDepartmentsController_list (hr:employees:view); GET `/org-hierarchy/branches/options` OrgHierarchyController_listOrgBranchOptions (branch:view); POST `/hr/recruitment/job-templates/{param}/apply` JobTemplatesController_apply (hr:requisitions:view); GET `/hr/recruitment/job-templates` JobTemplatesController_list (hr:requisitions:view); GET `/hr/recruitment/hiring-flows` HrHiringFlowsController_list (hr:interviews:view)
- Controls: `Save changes`, `Save draft`, `Publish`, `Start from template`, `Add question`, `Question type`, `Required`, `Knockout question`, `Resume Required`, `Cover Letter Required`

### `/recruitment/offer-templates`

- Area: recruitment. Permission gate: hr:offers:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1460, HRMS-REG-1461, HRMS-REG-1462, HRMS-REG-1463, HRMS-REG-1464, HRMS-REG-1465, HRMS-REG-1466, HRMS-REG-1467, HRMS-REG-1468, HRMS-REG-1469, HRMS-REG-1470, HRMS-REG-1471.
- APIs: GET `/hr/recruitment/offer-templates` HrOffersController_listTemplates (hr:offers:view); POST `/hr/recruitment/offer-templates` HrOffersController_createTemplate (hr:offers:manage); PATCH `/hr/recruitment/offer-templates/{param}` HrOffersController_updateTemplate (hr:offers:manage); DELETE `/hr/recruitment/offer-templates/{param}` HrOffersController_deleteTemplate (hr:offers:manage); POST `/hr/recruitment/offer-templates/{param}/generate-pdf` HrOffersController_generatePdf (hr:offers:manage)
- Controls: `Cancel`, `Close`, `Download Sample PDF`, `Preview`, `New Template`

### `/recruitment/offers`

- Area: recruitment. Permission gate: hr:offers:view | hr:offers:manage | hr:offers:approve. Sidebar: Offers.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0022, HRMS-REG-1472, HRMS-REG-1473, HRMS-REG-1474, HRMS-REG-1475, HRMS-REG-1476, HRMS-REG-1477.
- APIs: GET `/hr/recruitment/offers` RecruitmentOffersListController_listAll (hr:offers:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/pipeline`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage. Sidebar: Pipeline.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-SMK-0023, HRMS-REG-1478, HRMS-REG-1479, HRMS-REG-1480, HRMS-REG-1481, HRMS-REG-1482, HRMS-REG-1483, HRMS-REG-1484, HRMS-REG-1485, HRMS-REG-1486, HRMS-REG-1487, HRMS-REG-1488, HRMS-REG-1489.
- APIs: GET `/hr/recruitment/pipeline` RecruitmentPipelineController_getPipeline (hr:requisitions:view); PATCH `/hr/recruitment/candidates/{param}/stage` RecruitmentCandidatesController_moveStage (hr:requisitions:manage); POST `/hr/recruitment/candidates` RecruitmentCandidatesController_create (hr:requisitions:manage)
- Controls: `New Candidate`, `Cancel`, `Reject`, `Overview`, `Resume`

### `/recruitment/question-bank`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1490, HRMS-REG-1491, HRMS-REG-1492, HRMS-REG-1493, HRMS-REG-1494, HRMS-REG-1495, HRMS-REG-1496, HRMS-REG-1497, HRMS-REG-1498, HRMS-REG-1499, HRMS-REG-1500, HRMS-REG-1501, HRMS-REG-1502.
- APIs: GET `/hr/interview-questions` HrInterviewQuestionsController_list (hr:interviews:view); DELETE `/hr/interview-questions/{param}` HrInterviewQuestionsController_remove (hr:interviews:manage); POST `/hr/interview-questions` HrInterviewQuestionsController_create (hr:interviews:manage); PATCH `/hr/interview-questions/{param}` HrInterviewQuestionsController_update (hr:interviews:manage); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view)
- Controls: `Add Question`, `View details`, `Edit`, `Delete`, `Question actions`, `Cancel`, `Save Changes`, `Close`

### `/recruitment/recruiters`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Recruiters.
- Flags: none.
- Cases: HRMS-REG-1503, HRMS-REG-1504, HRMS-REG-1505, HRMS-REG-1506, HRMS-REG-1507, HRMS-REG-1508.
- APIs: GET `/hr/recruitment/recruiters` RecruitmentRecruitersController_recruiterDirectory (hr:requisitions:view); GET `/hr/recruitment/recruiters/activity` RecruitmentRecruitersController_listActivity (hr:requisitions:view)
- Controls: `View Activity`

### `/recruitment/refer`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage | hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1509, HRMS-REG-1510, HRMS-REG-1511, HRMS-REG-1512, HRMS-REG-1513, HRMS-REG-1514, HRMS-REG-1515, HRMS-REG-1516, HRMS-REG-1517, HRMS-REG-1518, HRMS-REG-1519.
- APIs: GET `/hr/recruitment/referrals` RecruitmentSourcingController_listReferrals (hr:requisitions:view); POST `/hr/recruitment/referrals` RecruitmentSourcingController_createReferral (hr:requisitions:view); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view)
- Controls: `Submit Referral`

### `/recruitment/referrals`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage. Sidebar: Referrals.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1520, HRMS-REG-1521, HRMS-REG-1522, HRMS-REG-1523, HRMS-REG-1524, HRMS-REG-1525, HRMS-REG-1526, HRMS-REG-1527, HRMS-REG-1528, HRMS-REG-1529, HRMS-REG-1530, HRMS-REG-1531, HRMS-REG-1532.
- APIs: GET `/hr/recruitment/referrals` RecruitmentSourcingController_listReferrals (hr:requisitions:view); PATCH `/hr/recruitment/referrals/{param}` RecruitmentSourcingController_updateReferral (hr:requisitions:manage); GET `/hr/recruitment/external-referrals` RecruitmentSourcingController_listExternalReferrals (hr:requisitions:view); PATCH `/hr/recruitment/external-referrals/{param}` RecruitmentSourcingController_updateExternalReferral (hr:requisitions:manage); GET `/hr/recruitment/external-referrers` RecruitmentSourcingController_listExternalReferrers (hr:requisitions:view); PATCH `/hr/recruitment/external-referrers/{param}` RecruitmentSourcingController_updateExternalReferrerStatus (hr:requisitions:manage)
- Controls: `Internal (Employees)`, `External (Affiliates)`, `Cancel`, `Mark Paid`, `Start Review`, `Mark Hired`, `Reject`, `Mark Bonus Paid`, `Queue Reward`, `Mark Reward Paid`, `Manage Referrers`, `Invite Referrers`

### `/recruitment/reports`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1533, HRMS-REG-1534, HRMS-REG-1535, HRMS-REG-1536, HRMS-REG-1537, HRMS-REG-1538, HRMS-REG-1539, HRMS-REG-1540, HRMS-REG-1541, HRMS-REG-1542, HRMS-REG-1543.
- APIs: POST `/hr/recruitment/reports/generate` HrRecruitmentReportsController_generateReport (hr:interviews:manage); GET `/hr/recruitment/reports/scheduled` HrRecruitmentReportsController_listScheduled (hr:interviews:view); DELETE `/hr/recruitment/reports/scheduled/{param}` HrRecruitmentReportsController_deleteScheduled (hr:interviews:manage); POST `/hr/recruitment/reports/scheduled` HrRecruitmentReportsController_createScheduled (hr:interviews:manage)
- Controls: `Generate Report`, `CSV`, `Excel`, `Schedule`, `Delete`, `void refetch()}> Try again`, `Add`, `Cancel`, `Schedule Report`

### `/recruitment/requisitions`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV, NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1544, HRMS-REG-1545, HRMS-REG-1546, HRMS-REG-1547, HRMS-REG-1548, HRMS-REG-1549, HRMS-REG-1550, HRMS-REG-1551, HRMS-REG-1552, HRMS-REG-1553, HRMS-REG-1554, HRMS-REG-1555.
- APIs: GET `/hr/recruitment/requisitions` RecruitmentRequisitionsController_list (hr:requisitions:view); PATCH `/hr/recruitment/requisitions/{param}/submit` RecruitmentRequisitionsController_submit (hr:requisitions:manage); PATCH `/hr/recruitment/requisitions/{param}/approve` RecruitmentRequisitionsController_approve (hr:requisitions:manage); PATCH `/hr/recruitment/requisitions/{param}/reject` RecruitmentRequisitionsController_reject (hr:requisitions:manage); POST `/hr/recruitment/requisitions/{param}/create-job` RecruitmentRequisitionsController_createJob (hr:requisitions:manage); POST `/hr/recruitment/requisitions` RecruitmentRequisitionsController_create (hr:requisitions:manage); GET `/hr/recruitment/headcount` RecruitmentHeadcountController_listHeadcount (hr:requisitions:view)
- Controls: `New Requisition`, `Submit for Approval`, `Approve`, `Reject`, `Convert to Job Posting`, `Submit`, `Requisition actions`, `Save Draft`

### `/recruitment/scorecard-analytics`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1556, HRMS-REG-1557, HRMS-REG-1558, HRMS-REG-1559, HRMS-REG-1560, HRMS-REG-1561.
- APIs: GET `/hr/recruitment/scorecard-analytics` HrScorecardsController_analytics (hr:interviews:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/scorecard-templates`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1562, HRMS-REG-1563, HRMS-REG-1564, HRMS-REG-1565, HRMS-REG-1566, HRMS-REG-1567, HRMS-REG-1568, HRMS-REG-1569, HRMS-REG-1570, HRMS-REG-1571, HRMS-REG-1572, HRMS-REG-1573.
- APIs: GET `/hr/recruitment/scorecard-templates` HrScorecardsController_listTemplates (hr:interviews:view); POST `/hr/recruitment/scorecard-templates` HrScorecardsController_createTemplate (hr:interviews:manage); PATCH `/hr/recruitment/scorecard-templates/{param}` HrScorecardsController_updateTemplate (hr:interviews:manage); DELETE `/hr/recruitment/scorecard-templates/{param}` HrScorecardsController_deleteTemplate (hr:interviews:manage)
- Controls: `Add Criterion`, `Cancel`, `Edit template`, `New Template`, `Remove criterion`, `Delete template`

### `/recruitment/settings`

- Area: recruitment. Permission gate: hr:requisitions:manage. Sidebar: Settings.
- Flags: NAV_HUB.
- Cases: HRMS-REG-1574, HRMS-REG-1575, HRMS-REG-1576, HRMS-REG-1577, HRMS-REG-1578, HRMS-REG-1579.
- APIs: No API call found in the page→feature→hook closure.
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/sla`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1580, HRMS-REG-1581, HRMS-REG-1582, HRMS-REG-1583, HRMS-REG-1584, HRMS-REG-1585, HRMS-REG-1586, HRMS-REG-1587, HRMS-REG-1588.
- APIs: GET `/hr/recruitment/interviews/slas` HrInterviewsController_listSlas (hr:interviews:view); PUT `/hr/recruitment/interviews/slas` HrInterviewsController_upsertSla (hr:interviews:manage)
- Controls: `Cancel`, `Save SLA`

### `/recruitment/sla-report`

- Area: recruitment. Permission gate: hr:interviews:view. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: HRMS-REG-1589, HRMS-REG-1590, HRMS-REG-1591, HRMS-REG-1592, HRMS-REG-1593, HRMS-REG-1594.
- APIs: GET `/hr/recruitment/interviews/sla-report` HrInterviewsController_slaReport (hr:interviews:view)
- Controls: None extracted. The no-dead-button case still requires a manual pass.

### `/recruitment/talent-pools`

- Area: recruitment. Permission gate: hr:requisitions:view | hr:requisitions:manage. Sidebar: Talent Pools.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: HRMS-REG-1595, HRMS-REG-1596, HRMS-REG-1597, HRMS-REG-1598, HRMS-REG-1599, HRMS-REG-1600, HRMS-REG-1601, HRMS-REG-1602, HRMS-REG-1603, HRMS-REG-1604, HRMS-REG-1605, HRMS-REG-1606, HRMS-REG-1607.
- APIs: GET `/hr/recruitment/talent-pools` RecruitmentTalentPoolsController_list (hr:requisitions:view); DELETE `/hr/recruitment/talent-pools/{param}` RecruitmentTalentPoolsController_remove (hr:requisitions:manage); GET `/hr/recruitment/talent-pools/{param}/members` RecruitmentTalentPoolsController_listMembers (hr:requisitions:view); POST `/hr/recruitment/talent-pools/{param}/members` RecruitmentTalentPoolsController_addMember (hr:requisitions:manage); DELETE `/hr/recruitment/talent-pools/{param}/members/{param}` RecruitmentTalentPoolsController_removeMember (hr:requisitions:manage); POST `/hr/recruitment/talent-pools` RecruitmentTalentPoolsController_create (hr:requisitions:manage); GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view)
- Controls: `Add Candidate`, `Cancel`, `Add`, `New Pool`, `Create Pool`

### `/recruitment/vendors`

- Area: recruitment. Permission gate: hr:requisitions:view. Sidebar: Vendors.
- Flags: none.
- Cases: HRMS-REG-1608, HRMS-REG-1609, HRMS-REG-1610, HRMS-REG-1611, HRMS-REG-1612, HRMS-REG-1613, HRMS-REG-1614, HRMS-REG-1615, HRMS-REG-1616, HRMS-REG-1617, HRMS-REG-1618, HRMS-REG-1619.
- APIs: GET `/hr/recruitment/vendors` RecruitmentSourcingController_listVendors (hr:requisitions:view); DELETE `/hr/recruitment/vendors/{param}` RecruitmentSourcingController_deleteVendor (hr:requisitions:manage); POST `/hr/recruitment/vendors` RecruitmentSourcingController_createVendor (hr:requisitions:manage); PATCH `/hr/recruitment/vendors/{param}` RecruitmentSourcingController_updateVendor (hr:requisitions:manage); GET `/hr/recruitment/vendors/{param}/submissions` RecruitmentSourcingController_listSubmissions (hr:requisitions:view); POST `/hr/recruitment/vendors/{param}/submissions` RecruitmentSourcingController_createSubmission (hr:requisitions:manage); PATCH `/hr/recruitment/vendors/{param}/submissions` RecruitmentSourcingController_updateSubmission (hr:requisitions:manage); POST `/hr/recruitment/vendors/{param}/portal-link` RecruitmentSourcingController_generateVendorPortalLink (hr:requisitions:manage); GET `/hr/recruitment/candidates` RecruitmentCandidatesController_list (hr:requisitions:view); GET `/hr/recruitment/jobs` RecruitmentJobsController_list (hr:requisitions:view)
- Controls: `Add Vendor`, `Cancel`, `Submit Candidate`, `Mark Invoice Paid`, `Submit`, `Submissions`, `Edit`, `Portal Link`, `Delete`


## Payroll routes

### `/me/pay`

- Area: payslips. Permission gate: self:payroll | payroll:salaries:view | self:payslips | payroll:fnf:view. Sidebar: Pay.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: PAY-SMK-0001, PAY-REG-0001, PAY-REG-0002, PAY-REG-0003, PAY-REG-0004, PAY-REG-0005, PAY-REG-0006, PAY-REG-0007, PAY-REG-0008, PAY-REG-0009, PAY-REG-0010, PAY-REG-0011, PAY-REG-0012, PAY-REG-0013, PAY-E2E-0010.
- APIs: GET `/payroll/me/overview` EssController_getOverview (self:payroll); GET `/payroll/me/fnf` EssController_getOwnFnf (self:payroll); GET `/payroll/me/payslips` EssController_getPayslips (self:payslips); GET `/payroll/me/tax-declaration` EssController_getTaxDeclaration (self:payroll); GET `/payroll/me/bank` EssController_getBankDetails (self:payroll); GET `/payroll/manager/inbox` ManagerInboxController_getInbox (self:payroll); GET `/payroll/me/salary-structure` EssController_getSalaryStructure (self:payroll); GET `/payroll/me/reimbursements` EssController_listReimbursements (self:payroll); POST `/payroll/me/reimbursements` EssController_createReimbursement (self:payroll); POST `/payroll/me/tax-declaration` EssController_submitTaxDeclaration (self:payroll); GET `/payroll/me/loans` EssController_listLoans (self:payroll); POST `/payroll/me/loans` EssController_createLoan (self:payroll); PATCH `/payroll/me/bank` EssController_updateBankDetails (self:payroll); GET `/payroll/me/total-rewards` EssController_getTotalRewards (self:payroll); GET `/payroll/fnf/{param}/statement/download` PayrollInsightsFnfController_downloadStatement (payroll:fnf:view); POST `/hr/reimbursements` HrPayrollReimbursementsController_create (hr:payroll:view); POST `/storage/upload` StorageController_upload; GET `/payroll/me/form16/{param}/download` EssForm16Controller_download (self:payslips); GET `/payroll/me/form16` EssForm16Controller_list (self:payslips); GET `/hr/cases/disciplinary/mine` HrDisciplinaryController_listMine (self:cases); POST `/hr/cases/disciplinary/{param}/acknowledge` HrDisciplinaryController_acknowledge (self:cases); GET `/me/preferences` MeController_getMyPreferences
- Controls: `Submit Claim`, `Declaration`, `Request Loan`, `Stop`, `Retry`, `Edit`, `Discard`, `Loading sources`, `Run again`, `Reject`, `Cancel`, `Remove receipt`, `Save Declaration`, `Submit Declaration`, `Submit Request`, `Save Details`, `Download`, `Acknowledge receipt`

### `/payroll`

- Area: payroll-ops. Permission gate: payroll:runs:view | payroll:policies:view | payroll:policies:manage | payroll:runs:create. Sidebar: Command Center.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: PAY-SMK-0002, PAY-REG-0014, PAY-REG-0015, PAY-REG-0016, PAY-REG-0017, PAY-REG-0018, PAY-REG-0019, PAY-REG-0020, PAY-REG-0021, PAY-REG-0022, PAY-REG-0023.
- APIs: GET `/payroll/command-center` CommandCenterController_get (payroll:runs:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); POST `/payroll/runs` RunsController_create (payroll:runs:create); GET `/payroll/readiness` PayrollReadinessController_get (payroll:runs:view); GET `/payroll/sample-data` PayrollSampleDataController_status (payroll:runs:view); DELETE `/payroll/sample-data` PayrollSampleDataController_remove (payroll:settings:manage); POST `/payroll/sample-data` PayrollSampleDataController_seed (payroll:settings:manage)
- Controls: `Checking payroll setup…`, `Start Payroll Run`, `Review Exceptions`, `Review & Submit`, `Review Approval`, `View Run`, `Payroll readiness`, `Retry`, `Show setup guide`, `Remove`, `Add sample data`, `Start empty`, `Hide setup guide`, `Done`, `Not done`

### `/payroll/access`

- Area: payroll-ops. Permission gate: payroll:access:view. Sidebar: Access.
- Flags: none.
- Cases: PAY-REG-0024, PAY-REG-0025, PAY-REG-0026, PAY-REG-0027, PAY-REG-0028, PAY-REG-0029, PAY-REG-0030, PAY-REG-0031, PAY-REG-0032, PAY-REG-0033, PAY-REG-0034, PAY-REG-0035, PAY-REG-0036.
- APIs: GET `/module-access/{param}/me/permissions` ModuleAccessController_getCallerPermissions; GET `/module-access/{param}/catalog` ModuleAccessController_catalog; GET `/module-access/{param}/audit-log` ModuleAccessController_getAuditLog; GET `/module-access/{param}/groups` ModuleAccessController_listGroups; PATCH `/module-access/{param}/groups/{param}` ModuleAccessController_renameGroup; DELETE `/module-access/{param}/groups/{param}` ModuleAccessController_deleteGroup; POST `/module-access/{param}/groups` ModuleAccessController_createGroup; PUT `/module-access/{param}/groups/{param}/permissions` ModuleAccessController_setGroupPermissions; GET `/module-access/{param}/groups/{param}/members` ModuleAccessController_listGroupMembers; POST `/module-access/{param}/groups/{param}/members` ModuleAccessController_addGroupMember; DELETE `/module-access/{param}/groups/{param}/members/{param}` ModuleAccessController_removeGroupMember; GET `/module-access/{param}/members` ModuleAccessController_listMembers; POST `/module-access/{param}/members` ModuleAccessController_addMember; PATCH `/module-access/{param}/members/{param}` ModuleAccessController_updateMemberGroups; DELETE `/module-access/{param}/members/{param}` ModuleAccessController_removeMember; GET `/module-access/{param}/members/{param}/grants` UserPermissionGrantsController_list; PUT `/module-access/{param}/members/{param}/grants` UserPermissionGrantsController_set; GET `/module-access/{param}/ownership` ModuleAccessController_getOwnership; POST `/module-access/{param}/ownership/transfer` ModuleAccessController_initiateOwnershipTransfer; DELETE `/module-access/{param}/ownership/transfer` ModuleAccessController_cancelOwnershipTransfer
- Controls: `Audit log`, `Roles`, `Members`, `Ownership`, `New group`, `Add member`, `Cancel`, `Rename`, `Delete group`, `Rename group`, `handleOpenChange(false)} disabled= > Cancel`, `Create`, `Members ( )`, `Reset`, `Save`, `Permissions`, `About`, `Add`, `handleClose(false)} disabled= > Cancel`, `Remove`, `Save grants`, `Transfer ownership`, `handleCloseTransfer(false)} disabled= > Cancel`, `Transfer`, `void auditQuery.refetch()} > Retry`, `Close`

### `/payroll/bank-transfers`

- Area: payroll-inputs. Permission gate: payroll:bank:manage. Sidebar: Bank Transfers.
- Flags: none.
- Cases: PAY-SMK-0003, PAY-REG-0037, PAY-REG-0038, PAY-REG-0039, PAY-REG-0040, PAY-REG-0041, PAY-REG-0042, PAY-REG-0043, PAY-REG-0044, PAY-REG-0045, PAY-REG-0046, PAY-REG-0047, PAY-REG-0048, PAY-BLK-0002.
- APIs: GET `/payroll/runs` RunsController_list (payroll:runs:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/runs/{param}/payout/validation` PayoutRunController_validate (payroll:bank:manage); GET `/payroll/payout/batches/{param}/file` PayoutBatchesController_getBatchFile (payroll:bank:manage); GET `/payroll/payout/batches` PayoutBatchesController_listBatches (payroll:bank:manage); POST `/payroll/runs/{param}/payout/batches` PayoutRunController_createBatch (payroll:bank:manage); POST `/payroll/payout/batches/{param}/mark-sent` PayoutBatchesController_markSent (payroll:bank:manage); POST `/payroll/payout/batches/{param}/mark-paid` PayoutBatchesController_markBatchPaid (payroll:bank:manage); GET `/payroll/payout/batches/{param}` PayoutBatchesController_getBatch (payroll:bank:manage); POST `/payroll/payout/batches/{param}/import-return` PayoutBatchesController_importReturn (payroll:bank:manage); POST `/payroll/payout/batches/{param}/items/{param}/mark-paid` PayoutBatchesController_markItemPaid (payroll:bank:manage); POST `/payroll/payout/batches/{param}/items/{param}/mark-failed` PayoutBatchesController_markItemFailed (payroll:bank:manage); GET `/payroll/employees/{param}/bank` PayoutEmployeeBankController_getBankDetails (payroll:bank:view); GET `/organization/members` OrganizationMembersController_listMembers (settings:view)
- Controls: `setMarkSentBatchId(row.id)} > Mark Sent`, `handleDownloadBatchFile(row.id)} > Bank File`, `handleOpenMarkPaid(row.id)} > Mark Paid`, `Generate Payout Batch`, `Download Bank File`, `Generate`, `Confirm`, `Cancel`, `Confirm Paid`, `Import return CSV`, `Hide bank details`, `Reveal bank details`, `Mark Paid`, `Mark Failed`

### `/payroll/bonuses`

- Area: payroll-inputs. Permission gate: hr:payroll:view. Sidebar: Bonuses & Incentives.
- Flags: none.
- Cases: PAY-REG-0049, PAY-REG-0050, PAY-REG-0051, PAY-REG-0052, PAY-REG-0053, PAY-REG-0054, PAY-REG-0055, PAY-REG-0056, PAY-REG-0057, PAY-REG-0058, PAY-REG-0059, PAY-REG-0060, PAY-REG-0061, PAY-REG-0062.
- APIs: GET `/hr/bonuses` BonusesController_list (hr:payroll:view); PATCH `/hr/bonuses/{param}` BonusesController_update (hr:bonuses:manage); POST `/hr/bonuses` BonusesController_create (hr:bonuses:manage); GET `/hr/incentives` IncentivesController_list (hr:payroll:view); PATCH `/hr/incentives/{param}/approve` IncentivesController_approve (hr:payroll:approve); PATCH `/hr/incentives/{param}/reject` IncentivesController_reject (hr:payroll:approve)
- Controls: `Bonuses`, `Incentives`, `Approve`, `Reject`, `Add Bonus`, `handleOpenChange(false)}> Cancel`, `Create Bonus`, `Cancel`

### `/payroll/components`

- Area: payroll-setup. Permission gate: payroll:components:view. Sidebar: Components.
- Flags: none.
- Cases: PAY-REG-0063, PAY-REG-0064, PAY-REG-0065, PAY-REG-0066, PAY-REG-0067, PAY-REG-0068, PAY-REG-0069, PAY-REG-0070, PAY-REG-0071, PAY-REG-0072, PAY-REG-0073, PAY-REG-0074, PAY-REG-0075, PAY-REG-0076.
- APIs: GET `/payroll/components` PayrollComponentsController_list (payroll:components:view); DELETE `/payroll/components/{param}` PayrollComponentsController_remove (payroll:components:manage); POST `/payroll/components` PayrollComponentsController_create (payroll:components:manage); PATCH `/payroll/components/{param}` PayrollComponentsController_update (payroll:components:manage); POST `/payroll/salary-preview` SalaryPreviewController_preview (payroll:salaries:view)
- Controls: `Add Component`, `0 ? "Deactivating…" : "Deleting…"} >`, `} aria-label="Edit component" >`, `Edit component`, `Delete component`, `handleOpenChange(false)}> Cancel`, `Preview breakup`

### `/payroll/employees`

- Area: payroll-setup. Permission gate: payroll:salaries:view. Sidebar: Employees.
- Flags: none.
- Cases: PAY-SMK-0004, PAY-REG-0077, PAY-REG-0078, PAY-REG-0079, PAY-REG-0080, PAY-REG-0081, PAY-REG-0082, PAY-REG-0083, PAY-REG-0084, PAY-REG-0085, PAY-REG-0086, PAY-REG-0087, PAY-REG-0088, PAY-REG-0089, PAY-REG-0090, PAY-BLK-0004.
- APIs: POST `/payroll/employees/{param}/profiles` ProfilesController_createProfile (payroll:salaries:update); POST `/payroll/workers/{param}/profiles` WorkerProfilesController_createProfile (payroll:salaries:update); PATCH `/payroll/employees/{param}/profiles/{param}` ProfilesController_patchProfile (payroll:salaries:update); PATCH `/payroll/workers/{param}/profiles/{param}` WorkerProfilesController_patchProfile (payroll:salaries:update); GET `/payroll/employees` ProfilesController_list (payroll:salaries:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/people` PayeeEligibilityController_listPeople (payroll:salaries:view); POST `/payroll/salary-preview` SalaryPreviewController_preview (payroll:salaries:view); GET `/payroll/components` PayrollComponentsController_list (payroll:components:view)
- Controls: `Add salary`, `Cancel`, `Retry`, `Loading people`

### `/payroll/employees/[employeeUserId]`

- Area: payroll-setup. Permission gate: payroll:salaries:view. Sidebar: Employees.
- Flags: none.
- Cases: PAY-SMK-0005, PAY-REG-0091, PAY-REG-0092, PAY-REG-0093, PAY-REG-0094, PAY-REG-0095, PAY-REG-0096, PAY-REG-0097, PAY-REG-0098, PAY-REG-0099, PAY-REG-0100, PAY-REG-0101, PAY-REG-0102, PAY-REG-0103, PAY-REG-0104.
- APIs: POST `/payroll/employees/{param}/profiles` ProfilesController_createProfile (payroll:salaries:update); POST `/payroll/workers/{param}/profiles` WorkerProfilesController_createProfile (payroll:salaries:update); PATCH `/payroll/employees/{param}/profiles/{param}` ProfilesController_patchProfile (payroll:salaries:update); PATCH `/payroll/workers/{param}/profiles/{param}` WorkerProfilesController_patchProfile (payroll:salaries:update); GET `/payroll/employees/{param}` ProfilesController_getOne (payroll:salaries:view); GET `/payroll/employees/{param}/history` ProfilesController_getHistory (payroll:salaries:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/people` PayeeEligibilityController_listPeople (payroll:salaries:view); POST `/payroll/salary-preview` SalaryPreviewController_preview (payroll:salaries:view); GET `/payroll/components` PayrollComponentsController_list (payroll:components:view)
- Controls: `Cancel`, `Retry`, `Loading people`

### `/payroll/fnf`

- Area: payroll-inputs. Permission gate: payroll:fnf:view. Sidebar: Final settlement.
- Flags: none.
- Cases: PAY-REG-0105, PAY-REG-0106, PAY-REG-0107, PAY-REG-0108, PAY-REG-0109, PAY-REG-0110, PAY-REG-0111, PAY-REG-0112, PAY-REG-0113.
- APIs: GET `/payroll/fnf` PayrollInsightsFnfController_list (payroll:fnf:view); GET `/payroll/fnf/{param}` PayrollInsightsFnfController_getOne (payroll:fnf:view); GET `/payroll/fnf/{param}/statement` PayrollInsightsFnfController_getStatement (payroll:fnf:view); POST `/payroll/fnf/{param}/approve` PayrollInsightsFnfController_approve (payroll:fnf:manage); GET `/payroll/fnf/{param}/statement/download` PayrollInsightsFnfController_downloadStatement (payroll:fnf:view)
- Controls: `Close`, `Approve Settlement`, `Confirm Approve`

### `/payroll/inputs`

- Area: payroll-inputs. Permission gate: hr:payroll:view. Sidebar: Attendance Inputs.
- Flags: none.
- Cases: PAY-SMK-0006, PAY-REG-0114, PAY-REG-0115, PAY-REG-0116, PAY-REG-0117, PAY-REG-0118, PAY-REG-0119, PAY-REG-0120, PAY-REG-0121, PAY-REG-0122, PAY-REG-0123, PAY-REG-0124, PAY-REG-0125.
- APIs: GET `/hr/payroll-inputs/periods/{param}/attendance` PayrollInputsController_getAttendance (hr:payroll:view); GET `/hr/payroll-inputs/periods/{param}/leaves` PayrollInputsController_getLeaves (hr:payroll:view); GET `/hr/payroll-inputs/periods/{param}/overtime` PayrollInputsController_getOvertime (hr:payroll:view); GET `/hr/payroll-inputs/periods/{param}/reimbursements` PayrollInputsController_getReimbursements (hr:payroll:view); GET `/hr/payroll-inputs/periods/{param}/adjustments` PayrollInputsController_getAdjustments (hr:payroll:view); PATCH `/hr/payroll-inputs/adjustments/{param}/approve` PayrollInputsController_approveAdjustment (hr:payroll:approve); POST `/hr/payroll-inputs/adjustments` PayrollInputsController_createAdjustment (hr:payroll:generate); GET `/hr/payroll-inputs/periods` PayrollInputsController_listPeriods (hr:payroll:view); POST `/hr/payroll-inputs/periods` PayrollInputsController_createPeriod (hr:payroll:generate); POST `/hr/payroll-inputs/periods/{param}/build` PayrollInputsController_buildPeriod (hr:payroll:generate); POST `/hr/payroll-inputs/periods/{param}/lock` PayrollInputsController_lockPeriod (hr:payroll:lock); POST `/hr/payroll-inputs/periods/{param}/unlock` PayrollInputsController_unlockPeriod (hr:payroll:reopen); GET `/hr/payroll-inputs/periods/{param}/{param}` — **CONTRACT GAP**
- Controls: `setShowCreateConfirm(true)} isPending= loadingText="Opening…" > Open Period`, `setShowLockConfirm(true)} > Lock Period`, `setShowUnlockConfirm(true)} > Unlock`, `Open Period`, `Lock Period`, `Unlock Period`, `Attendance`, `Leave`, `Overtime`, `Reimbursements`, `Adjustments`, `Add Adjustment`, `approve.mutate(row.id)} > Approve`, `View source records`, `Create Adjustment`

### `/payroll/loans`

- Area: payroll-inputs. Permission gate: hr:payroll:view. Sidebar: Loans & Advances.
- Flags: none.
- Cases: PAY-REG-0126, PAY-REG-0127, PAY-REG-0128, PAY-REG-0129, PAY-REG-0130, PAY-REG-0131, PAY-REG-0132, PAY-REG-0133, PAY-REG-0134, PAY-REG-0135, PAY-REG-0136, PAY-REG-0137, PAY-REG-0138, PAY-REG-0139.
- APIs: GET `/hr/loans` LoansController_list (hr:payroll:view); PATCH `/hr/loans/{param}` LoansController_update (hr:payroll:view); POST `/hr/loans` LoansController_create (hr:payroll:view); GET `/payroll/runs` RunsController_list (payroll:runs:view); POST `/payroll/runs/{param}/loan-adjustments` LoanAdjustmentsController_create (payroll:runs:update)
- Controls: `New loan`, `Cancel`, `Submit`, `Approve`, `Reject`, `Skip EMI`, `Extra`, `Foreclose`, `handleOpenChange(false)}> Cancel`, `Create loan`

### `/payroll/payslips`

- Area: payslips. Permission gate: payroll:payslips:view. Sidebar: Payslips.
- Flags: none.
- Cases: PAY-SMK-0007, PAY-REG-0140, PAY-REG-0141, PAY-REG-0142, PAY-REG-0143, PAY-REG-0144, PAY-REG-0145, PAY-REG-0146, PAY-REG-0147, PAY-REG-0148, PAY-REG-0149, PAY-REG-0150, PAY-REG-0151, PAY-REG-0152, PAY-REG-0153.
- APIs: GET `/payroll/runs` RunsController_list (payroll:runs:view); GET `/payroll/runs/{param}/payslips` PublishingController_listPublications (payroll:payslips:view); POST `/payroll/runs/{param}/payslips/publish` PublishingController_publish (payroll:payslips:manage); GET `/payroll/payslips/{param}/download` PublishingController_downloadPdf (self:payslips); GET `/organization/members` OrganizationMembersController_listMembers (settings:view); GET `/payroll/payslip-templates` PayslipTemplatesController_list (payroll:payslips:view); POST `/payroll/payslip-templates` PayslipTemplatesController_create (payroll:payslips:manage); PATCH `/payroll/payslip-templates/{param}` PayslipTemplatesController_update (payroll:payslips:manage); POST `/payroll/payslip-templates/preview` PayslipTemplatesController_preview (payroll:payslips:manage); DELETE `/payroll/payslip-templates/{param}` PayslipTemplatesController_remove (payroll:payslips:manage)
- Controls: `Publications`, `Templates`, `onOpenChange(false)} disabled= > Cancel`, `Publish`, `handleDownload(row.id)} > PDF`, `Publish Payslips`, `Preview`, `Edit`, `Delete`, `Create Template`, `Download preview`

### `/payroll/readiness`

- Area: payroll-ops. Permission gate: payroll:policies:view | payroll:policies:manage | payroll:runs:view | payroll:runs:manage. Sidebar: Readiness.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: PAY-SMK-0008, PAY-REG-0154, PAY-REG-0155, PAY-REG-0156, PAY-REG-0157, PAY-REG-0158, PAY-REG-0159, PAY-REG-0160, PAY-REG-0161, PAY-REG-0162, PAY-REG-0163, PAY-REG-0164, PAY-REG-0165.
- APIs: GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/readiness` PayrollReadinessController_get (payroll:runs:view); GET `/payroll/runs/{param}/exceptions` ExceptionsController_list (payroll:runs:view); GET `/payroll/runs/{param}/employees` RunsController_listEmployees (payroll:runs:view); GET `/payroll/runs/{param}/variance` RunsController_variance (payroll:runs:view); GET `/payroll/runs/{param}` RunsController_getOne (payroll:runs:view); POST `/payroll/runs` RunsController_create (payroll:runs:create); DELETE `/payroll/runs/{param}` RunsController_discard (payroll:runs:manage); POST `/payroll/runs/{param}/generate` RunsController_generate (payroll:runs:manage); POST `/payroll/runs/{param}/recalculate` RunsController_recalculate (payroll:runs:manage); GET `/payroll/runs/{param}/approvals` PayrollPayoutApprovalsController_listApprovals (payroll:runs:view); POST `/payroll/runs/{param}/approvals/{param}/approve` PayrollPayoutApprovalsController_approveStage (payroll:runs:approve); POST `/payroll/runs/{param}/approvals/{param}/reject` PayrollPayoutApprovalsController_rejectStage (payroll:runs:approve); POST `/payroll/runs/{param}/lock` LockingController_lock (payroll:runs:manage); POST `/payroll/runs/{param}/reopen` LockingController_reopen (payroll:runs:manage); POST `/payroll/runs/{param}/close` LockingController_close (payroll:runs:manage); POST `/payroll/runs/{param}/submit-approval` PayrollPayoutApprovalsController_submitApproval (payroll:runs:update); GET `/payroll/payout/batches` PayoutBatchesController_listBatches (payroll:bank:manage); POST `/payroll/runs/{param}/payslips/publish` PublishingController_publish (payroll:payslips:manage)
- Controls: `Readiness is out of date`, `Month close checklist`, `People and salaries`, `Approve`, `Reject`, `Cancel`, `Retry`, `Lock Payroll`, `Lock`, `Reopen Run`, `Reopen`, `Close Run`, `Submit for Approval`, `Submit`, `Fix next blocker`, `Clear filter`, `Readiness blockers`, `Payroll exports`, `Payroll readiness chain`, `Readiness categories`, `Create run`, `Recalculate`, `Discard`, `Generate`, `Release`

### `/payroll/reimbursements`

- Area: payroll-inputs. Permission gate: hr:payroll:view. Sidebar: Reimbursements.
- Flags: none.
- Cases: PAY-REG-0166, PAY-REG-0167, PAY-REG-0168, PAY-REG-0169, PAY-REG-0170, PAY-REG-0171, PAY-REG-0172, PAY-REG-0173, PAY-REG-0174, PAY-REG-0175, PAY-REG-0176, PAY-REG-0177, PAY-REG-0178.
- APIs: GET `/hr/reimbursements` HrPayrollReimbursementsController_list (hr:payroll:view); PATCH `/hr/reimbursements/{param}` HrPayrollReimbursementsController_update (hr:payroll:view); POST `/hr/reimbursements` HrPayrollReimbursementsController_create (hr:payroll:view); POST `/payroll/me/reimbursements` EssController_createReimbursement (self:payroll); POST `/storage/upload` StorageController_upload
- Controls: `Submit my claim`, `Cancel`, `Submit Claim`, `Remove receipt`

### `/payroll/reports`

- Area: payroll-ops. Permission gate: payroll:reports:view. Sidebar: Reports.
- Flags: none.
- Cases: PAY-REG-0179, PAY-REG-0180, PAY-REG-0181, PAY-REG-0182, PAY-REG-0183, PAY-REG-0184, PAY-REG-0185, PAY-REG-0186, PAY-REG-0187, PAY-REG-0188, PAY-REG-0189, PAY-REG-0190, PAY-REG-0191, PAY-REG-0192.
- APIs: GET `/payroll/reports/{param}` — **CONTRACT GAP**; GET `/payroll/reports/journal` JournalController_getJournal (payroll:reports:view); GET `/payroll/reports/summary` PayrollInsightsReportsController_getSummary (payroll:reports:view); GET `/payroll/reports/register` PayrollInsightsReportsController_getRegister (payroll:reports:view); GET `/payroll/reports/department-cost` PayrollInsightsReportsController_getDepartmentCost (payroll:reports:view); GET `/payroll/reports/cost-center` PayrollInsightsReportsController_getCostCenter (payroll:reports:view); GET `/payroll/reports/earnings` PayrollInsightsReportsController_getEarnings (payroll:reports:view); GET `/payroll/reports/deductions` PayrollInsightsReportsController_getDeductions (payroll:reports:view); GET `/payroll/reports/reimbursements` PayrollInsightsReportsController_getReimbursements (payroll:reports:view); GET `/payroll/reports/tax` PayrollInsightsReportsController_getTax (payroll:reports:view); GET `/payroll/reports/bank-payout` PayrollInsightsReportsController_getBankPayout (payroll:reports:view); GET `/payroll/reports/variance` PayrollInsightsReportsController_getVariance (payroll:reports:view); GET `/payroll/accounting/journal-batches/period-reconciliation` JournalOutboxController_periodReconciliation (payroll:accounting:view); GET `/payroll/accounting/journal-batches` JournalOutboxController_list (payroll:accounting:view); POST `/payroll/accounting/journal-batches` JournalOutboxController_create (payroll:accounting:manage); POST `/payroll/accounting/journal-batches/{param}/post` JournalOutboxController_post (payroll:accounting:manage); POST `/payroll/accounting/journal-batches/{param}/reverse` JournalOutboxController_reverse (payroll:accounting:manage); POST `/payroll/accounting/journal-batches/{param}/reconcile` JournalOutboxController_reconcile (payroll:accounting:manage); GET `/payroll/accounting-mappings` AccountingMappingsController_list (payroll:settings:manage); POST `/payroll/accounting-mappings` AccountingMappingsController_create (payroll:settings:manage); PATCH `/payroll/accounting-mappings/{param}` AccountingMappingsController_update (payroll:settings:manage); DELETE `/payroll/accounting-mappings/{param}` AccountingMappingsController_remove (payroll:settings:manage); GET `/payroll/components` PayrollComponentsController_list (payroll:components:view); GET `/payroll/analytics/pay-compression` PayAnalyticsController_orgPayCompression (payroll:salaries:view)
- Controls: `Report types`, `Select payroll report`, `Export CSV`, `Journal batches`, `Map now`, `Cancel`, `Manage Mappings`, `handleEdit(m)} aria-label="Edit mapping" >`, `Add Mapping`, `Edit mapping`, `Delete mapping`, `New snapshot`, `handlePost(batch)} > Post to ledger`, `setReversing(batch)} > Reverse`, `setReconciling(batch)} > Mark reconciled`

### `/payroll/runs`

- Area: payroll-runs. Permission gate: payroll:runs:view. Sidebar: Run Payroll.
- Flags: none.
- Cases: PAY-SMK-0009, PAY-REG-0193, PAY-REG-0194, PAY-REG-0195, PAY-REG-0196, PAY-REG-0197, PAY-REG-0198, PAY-REG-0199, PAY-REG-0200, PAY-REG-0201, PAY-BLK-0003.
- APIs: GET `/payroll/runs` RunsController_list (payroll:runs:view); POST `/payroll/runs` RunsController_create (payroll:runs:create); GET `/payroll/entities` PayrollEntitiesController_list (payroll:policies:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view)
- Controls: `New run`, `setCursor(data.pagination.nextCursor ?? undefined)} > Next page`, `setCursor(undefined)} > Back to start`, `Cancel`, `Create`

### `/payroll/runs/[runId]`

- Area: payroll-runs. Permission gate: payroll:runs:view. Sidebar: Run Payroll.
- Flags: none.
- Cases: PAY-SMK-0010, PAY-REG-0202, PAY-REG-0203, PAY-REG-0204, PAY-REG-0205, PAY-REG-0206, PAY-REG-0207, PAY-REG-0208, PAY-REG-0209, PAY-REG-0210, PAY-REG-0211, PAY-REG-0212, PAY-REG-0213, PAY-E2E-0007, PAY-BLK-0001, PAY-REG-0329.
- APIs: DELETE `/payroll/runs/{param}` RunsController_discard (payroll:runs:manage); POST `/payroll/runs/{param}/generate` RunsController_generate (payroll:runs:manage); POST `/payroll/runs/{param}/recalculate` RunsController_recalculate (payroll:runs:manage); GET `/payroll/runs/{param}` RunsController_getOne (payroll:runs:view); POST `/payroll/runs/{param}/submit-approval` PayrollPayoutApprovalsController_submitApproval (payroll:runs:update); POST `/payroll/runs/{param}/lock` LockingController_lock (payroll:runs:manage); POST `/payroll/runs/{param}/reopen` LockingController_reopen (payroll:runs:manage); POST `/payroll/runs/{param}/close` LockingController_close (payroll:runs:manage); GET `/payroll/runs/{param}/approvals` PayrollPayoutApprovalsController_listApprovals (payroll:runs:view); POST `/payroll/runs/{param}/approvals/{param}/approve` PayrollPayoutApprovalsController_approveStage (payroll:runs:approve); POST `/payroll/runs/{param}/approvals/{param}/reject` PayrollPayoutApprovalsController_rejectStage (payroll:runs:approve); POST `/payroll/runs/{param}/payslips/publish` PublishingController_publish (payroll:payslips:manage); GET `/payroll/runs/{param}/employees` RunsController_listEmployees (payroll:runs:view); GET `/payroll/runs/{param}/employees/{param}` RunsController_getEmployee (payroll:runs:view); POST `/payroll/runs/{param}/employees/{param}/adjustments` RunsController_addAdjustment (payroll:runs:manage); POST `/payroll/runs/{param}/employees/{param}/hold` RunsController_setEmployeeHold (payroll:runs:manage); POST `/payroll/runs/{param}/employees/{param}/release` PublishingController_releaseHold (payroll:runs:manage); DELETE `/payroll/runs/{param}/employees/{param}/adjustments/{param}` RunsController_voidAdjustment (payroll:runs:manage); GET `/payroll/runs/{param}/variance` RunsController_variance (payroll:runs:view); GET `/payroll/runs/{param}/exceptions` ExceptionsController_list (payroll:runs:view); PATCH `/payroll/runs/{param}/exceptions/{param}/resolve` ExceptionsController_resolve (payroll:runs:update); PATCH `/payroll/runs/{param}/exceptions/{param}/override` ExceptionsController_override (payroll:runs:manage); GET `/payroll/runs/{param}/inputs` InputsController_list (payroll:runs:view); PATCH `/payroll/runs/{param}/inputs/{param}` InputsController_patchInput (payroll:runs:update); POST `/payroll/runs/{param}/inputs/reimport` InputsController_reimport (payroll:runs:update)
- Controls: `void refetch()} disabled= > Retry`, `Employees`, `Inputs`, `Variance`, `Recalculate`, `Discard`, `Generate`, `Submit for Approval`, `Cancel`, `Submit`, `Lock Payroll`, `Lock`, `Reopen Run`, `Reopen`, `Close Run`, `Release`, `Payroll lifecycle actions`, `Approve`, `Reject`, `Retry`, `Go to Bank Transfers`, `Add Adjustment`, `Hold Salary`, `Add`, `Hold`, `Remove`, `Fix profile`, `handleResolve(ex)} isPending= > Resolve`, `handleOverrideRequest(ex)} > Override`, `Override`, `Re-import`, `Save Override`, `Payroll readiness`

### `/payroll/salary-structures`

- Area: payroll-setup. Permission gate: hr:salary:view. Sidebar: Salary Structures.
- Flags: none.
- Cases: PAY-REG-0214, PAY-REG-0215, PAY-REG-0216, PAY-REG-0217, PAY-REG-0218, PAY-REG-0219, PAY-REG-0220, PAY-REG-0221, PAY-REG-0222, PAY-REG-0223, PAY-REG-0224, PAY-REG-0225, PAY-REG-0226, PAY-REG-0227, PAY-REG-0228.
- APIs: GET `/hr/payroll/salary-structures` SalaryStructureTemplatesController_list (hr:salary:view); POST `/hr/payroll/salary-structures` SalaryStructureTemplatesController_create (hr:salary:manage); PATCH `/hr/payroll/salary-structures/{param}` SalaryStructureTemplatesController_update (hr:salary:manage); DELETE `/hr/payroll/salary-structures/{param}` SalaryStructureTemplatesController_remove (hr:salary:manage); POST `/payroll/salary-preview` SalaryPreviewController_preview (payroll:salaries:view); GET `/payroll/components` PayrollComponentsController_list (payroll:components:view)
- Controls: `Edit`, `Deactivate`, `Add Template`

### `/payroll/settings`

- Area: payroll-ops. Permission gate: payroll:settings:manage. Sidebar: Settings.
- Flags: none.
- Cases: PAY-SMK-0011, PAY-REG-0229, PAY-REG-0230, PAY-REG-0231, PAY-REG-0232, PAY-REG-0233, PAY-REG-0234, PAY-REG-0235, PAY-REG-0236, PAY-REG-0237, PAY-REG-0238, PAY-REG-0239, PAY-REG-0240.
- APIs: GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); PATCH `/payroll/policies/{param}` PayrollPoliciesController_update (payroll:policies:manage); POST `/payroll/policies/{param}/versions` PayrollPoliciesController_createVersion (payroll:policies:manage); GET `/payroll/policies/toggle-impact` PayrollPoliciesController_toggleImpact (payroll:policies:view); GET `/payroll/policies/{param}/versions` PayrollPoliciesController_listVersions (payroll:policies:view); GET `/payroll/calendar` PayrollInsightsCalendarController_list (payroll:runs:view); POST `/payroll/calendar/generate` PayrollInsightsCalendarController_generate (payroll:settings:manage); POST `/payroll/calendar` PayrollInsightsCalendarController_create (payroll:settings:manage); PATCH `/payroll/calendar/{param}` PayrollInsightsCalendarController_update (payroll:settings:manage); DELETE `/payroll/calendar/{param}` PayrollInsightsCalendarController_remove (payroll:settings:manage); GET `/payroll/entities/country-packs` PayrollEntitiesController_countryPacks (payroll:policies:view); GET `/payroll/entities` PayrollEntitiesController_list (payroll:policies:view); GET `/payroll/entities/{param}/context` PayrollEntitiesController_context (payroll:policies:view); PATCH `/payroll/entities/{param}` PayrollEntitiesController_update (payroll:policies:manage)
- Controls: `setEditing(true)}> Edit`, `Cancel`, `Save Changes`, `handleSheetClose(false)} > Cancel`, `Create Version`, `Generate Calendar`, `Add Event`, `handleEdit(event)} aria-label="Edit event" >`, `Edit event`, `Delete event`, `Edit`, `Add Currency`, `Save Rates`, `Remove rate`, `Edit filing details`

### `/payroll/settings/import-export`

- Area: payroll-ops. Permission gate: payroll:reports:view. Sidebar: Export.
- Flags: none.
- Cases: PAY-REG-0241, PAY-REG-0242, PAY-REG-0243, PAY-REG-0244, PAY-REG-0245, PAY-REG-0246, PAY-REG-0247, PAY-BLK-0005.
- APIs: GET `/payroll/reports/register` PayrollInsightsReportsController_getRegister (payroll:reports:view)
- Controls: `Export`

### `/payroll/setup`

- Area: payroll-ops. Permission gate: payroll:policies:manage. Sidebar: not in sidebar.
- Flags: HIDDEN_FROM_NAV.
- Cases: PAY-SMK-0012, PAY-REG-0248, PAY-REG-0249, PAY-REG-0250, PAY-REG-0251, PAY-REG-0252, PAY-REG-0253, PAY-REG-0254, PAY-REG-0255, PAY-REG-0256, PAY-REG-0257, PAY-REG-0258, PAY-REG-0259, PAY-REG-0260.
- APIs: GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); POST `/payroll/policies` PayrollPoliciesController_create (payroll:policies:manage); PATCH `/payroll/policies/{param}` PayrollPoliciesController_update (payroll:policies:manage); GET `/payroll/policies/toggle-impact` PayrollPoliciesController_toggleImpact (payroll:policies:view); POST `/payroll/policies/preview` PayrollPoliciesController_preview (payroll:policies:view); POST `/payroll/policies/{param}/activate` PayrollPoliciesController_activate (payroll:policies:manage); POST `/payroll/templates/{param}/duplicate` PayrollTemplatesController_duplicate (payroll:templates:manage); GET `/payroll/templates` PayrollTemplatesController_list (payroll:templates:view)
- Controls: `Back`, `setPreviewTemplate(t)} > Preview`, `setDuplicateTemplate(t)} > Duplicate`, `handleOpenChange(false)}> Cancel`, `Duplicate`, `Retry`, `Go to Payroll`, `View Components`, `Activate Payroll`

### `/payroll/taxes`

- Area: payroll-inputs. Permission gate: payroll:tax:view. Sidebar: Taxes & Statutory.
- Flags: NOT_IMPLEMENTED_COPY.
- Cases: PAY-REG-0261, PAY-REG-0262, PAY-REG-0263, PAY-REG-0264, PAY-REG-0265, PAY-REG-0266, PAY-REG-0267, PAY-REG-0268, PAY-REG-0269, PAY-REG-0270, PAY-REG-0271, PAY-REG-0272, PAY-REG-0273, PAY-REG-0274, PAY-REG-0275, PAY-REG-0328.
- APIs: GET `/payroll/tax-windows` TaxWindowsController_list (payroll:tax:manage); PATCH `/payroll/tax-windows/{param}` TaxWindowsController_update (payroll:tax:manage); POST `/payroll/tax-windows` TaxWindowsController_create (payroll:tax:manage); GET `/payroll/tax/declarations` TaxAdminController_listDeclarations (payroll:tax:view); GET `/payroll/tax/export` TaxAdminController_export (payroll:reports:export); PATCH `/payroll/tax/declarations/{param}/approve` TaxAdminController_approve (payroll:tax:manage); PATCH `/payroll/tax/declarations/{param}/reject` TaxAdminController_reject (payroll:tax:manage); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/filings/capabilities` PayrollFilingsController_capabilities (payroll:tax:view); GET `/payroll/filings` PayrollFilingsController_list (payroll:tax:view); PATCH `/payroll/filings/{param}/acknowledgement` PayrollFilingsController_ack (payroll:tax:manage); GET `/payroll/filings/{param}/export` PayrollFilingsController_downloadExport (payroll:tax:view); POST `/payroll/filings/export` PayrollFilingsController_prepare (payroll:tax:manage); GET `/payroll/filings/export/jobs/{param}` PayrollFilingsController_getExportJob (payroll:tax:view); GET `/payroll/entities` PayrollEntitiesController_list (payroll:policies:view); GET `/payroll/form16/{param}/members/{param}/download` PayrollForm16DocumentsController_download (payroll:tax:view); GET `/payroll/form16` PayrollForm16DocumentsController_list (payroll:tax:view); POST `/payroll/form16/{param}/release-all` PayrollForm16DocumentsController_releaseAll (payroll:tax:manage); POST `/payroll/form16/{param}/members/{param}/release` PayrollForm16DocumentsController_release (payroll:tax:manage); POST `/payroll/form16/{param}/members/{param}/upload` PayrollForm16DocumentsController_upload (payroll:tax:manage)
- Controls: `Declaration Windows`, `Declarations`, `Statutory`, `Filings`, `Form 16`, `Tax Report`, `setSheetWindow(row)} > Edit`, `setAdvanceTarget( ) } >`, `Add Window`, `Cancel`, `Save`, `Export CSV`, `Reject`, `Approve`, `Close`, `Export Tax Report CSV`, `void handleDownload(row)} isPending= > CSV`, `handleAckOpen(row)}> Record acknowledgement`, `setShowExport(true)}> Prepare filing export`, `void handleDownload(row)} isPending= > Download CSV`, `handleAckOpen(row)} > Record ack`, `setAckTarget(null)}> Cancel`, `Record acknowledgement`, `Prepare export`, `Release`, `Download`, `Release all uploaded`, `Financial year`

### `/payroll/team`

- Area: payroll-ops. Permission gate: self:payroll | payroll:salaries:view | self:payslips. Sidebar: Team Payroll.
- Flags: NO_PAGE_PERMISSION_GATE.
- Cases: PAY-REG-0276, PAY-REG-0277, PAY-REG-0278, PAY-REG-0279, PAY-REG-0280, PAY-REG-0281, PAY-REG-0282, PAY-REG-0283, PAY-REG-0284, PAY-REG-0285, PAY-REG-0286.
- APIs: GET `/payroll/manager/inbox` ManagerInboxController_getInbox (self:payroll); GET `/payroll/manager/team-rewards` ManagerInboxController_getTeamRewards (self:payroll); POST `/payroll/manager/reimbursements/{param}/approve` ManagerInboxController_approveReimbursement (self:payroll); POST `/payroll/manager/reimbursements/{param}/reject` ManagerInboxController_rejectReimbursement (self:payroll); POST `/payroll/manager/loans/{param}/approve` ManagerInboxController_approveLoan (self:payroll); POST `/payroll/manager/loans/{param}/reject` ManagerInboxController_rejectLoan (self:payroll)
- Controls: `onApproveClaim(row)} > Approve`, `onRejectClaim(row)} > Reject`, `onApproveLoan(row)} > Approve`, `onRejectLoan(row)} > Reject`

### `/payroll/templates`

- Area: payroll-setup. Permission gate: payroll:templates:view. Sidebar: Templates.
- Flags: none.
- Cases: PAY-REG-0287, PAY-REG-0288, PAY-REG-0289, PAY-REG-0290, PAY-REG-0291, PAY-REG-0292, PAY-REG-0293, PAY-REG-0294, PAY-REG-0295, PAY-REG-0296, PAY-REG-0297, PAY-REG-0298, PAY-REG-0299.
- APIs: GET `/payroll/templates` PayrollTemplatesController_list (payroll:templates:view); DELETE `/payroll/templates/{param}` PayrollTemplatesController_deleteTemplate (payroll:templates:manage); POST `/payroll/templates/{param}/preview` PayrollTemplatesController_preview (payroll:templates:view); POST `/payroll/templates/{param}/duplicate` PayrollTemplatesController_duplicate (payroll:templates:manage); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view)
- Controls: `handlePreviewOpen(template)} > Preview`, `handleDuplicateOpen(template)} > Duplicate`, `handleDeleteOpen(template)} > Delete`, `handleUseInSetup(template)} > Use in Setup`, `Delete`, `Calculate`, `handleOpenChange(false)} > Cancel`, `Duplicate`

### `/payroll/workers/[workerId]`

- Area: payroll-setup. Permission gate: payroll:salaries:view. Sidebar: not in sidebar.
- Flags: none.
- Cases: PAY-REG-0300, PAY-REG-0301, PAY-REG-0302, PAY-REG-0303, PAY-REG-0304, PAY-REG-0305, PAY-REG-0306, PAY-REG-0307, PAY-REG-0308, PAY-REG-0309, PAY-REG-0310, PAY-REG-0311, PAY-REG-0312, PAY-REG-0313.
- APIs: POST `/payroll/employees/{param}/profiles` ProfilesController_createProfile (payroll:salaries:update); POST `/payroll/workers/{param}/profiles` WorkerProfilesController_createProfile (payroll:salaries:update); PATCH `/payroll/employees/{param}/profiles/{param}` ProfilesController_patchProfile (payroll:salaries:update); PATCH `/payroll/workers/{param}/profiles/{param}` WorkerProfilesController_patchProfile (payroll:salaries:update); GET `/payroll/workers/{param}` WorkerProfilesController_getOne (payroll:salaries:view); GET `/payroll/workers/{param}/history` WorkerProfilesController_getHistory (payroll:salaries:view); GET `/payroll/employees/{param}` ProfilesController_getOne (payroll:salaries:view); GET `/payroll/employees/{param}/history` ProfilesController_getHistory (payroll:salaries:view); GET `/payroll/policies/current` PayrollPoliciesController_getCurrent (payroll:policies:view); GET `/payroll/people` PayeeEligibilityController_listPeople (payroll:salaries:view); POST `/payroll/salary-preview` SalaryPreviewController_preview (payroll:salaries:view); GET `/payroll/components` PayrollComponentsController_list (payroll:components:view)
- Controls: `Cancel`, `Retry`, `Loading people`

### `/timesheets/payroll`

- Area: payroll-ops. Permission gate: timesheets:payroll:view. Sidebar: Payroll.
- Flags: none.
- Cases: PAY-REG-0314, PAY-REG-0315, PAY-REG-0316, PAY-REG-0317, PAY-REG-0318, PAY-REG-0319, PAY-REG-0320, PAY-REG-0321, PAY-REG-0322, PAY-REG-0323, PAY-REG-0324, PAY-REG-0325, PAY-REG-0326, PAY-REG-0327.
- APIs: GET `/timesheets/payroll/period-summary` PayrollController_getPeriodSummary (timesheets:payroll:view); GET `/timesheets/payroll/settings` PayrollController_getSettings (timesheets:payroll:view); POST `/timesheets/payroll/export` PayrollController_runExport (timesheets:payroll:export); PATCH `/timesheets/payroll/settings` PayrollController_updateSettings (timesheets:payroll:export); GET `/timesheets/payroll/exports` PayrollController_listExports (timesheets:payroll:view); GET `/timesheets/payroll/exports/{param}/rows` PayrollController_getExportRows (timesheets:payroll:view); PATCH `/timesheets/payroll/exports/{param}/ack` PayrollController_ackExport (timesheets:payroll:export)
- Controls: `Mapping`, `Export`, `Pay Period`, `Export History`, `Period preset`, `Filter by person`, `Include exported entries`, `Review timesheets`, `Close`, `Cancel`, `Export people`, `Save Mapping`, `Payroll provider`, `Record acknowledgement`, `Download export`


## Maintenance

When routes or the vendored contract change, rebuild this inventory from `frontend/app/**/page.tsx`, the feature and hook files those pages import (resolve barrel files per symbol so a page is not credited with every HR endpoint), and `frontend/contracts/openapi.json`. The end-to-end and bulk rows were written against those controllers and limits; update them when a flow changes rather than treating them as inferred.

Do not treat a green smoke run as coverage of hidden recruitment pages, bulk limits, or cross-tenant payslip access. Those sit in regression, bulk, and security-adjacent.
