# HRMS QA Round 1 — Coverage Map
Date: 2026-10-14 (box time ~03:20 UTC). Build/env: https://www.streamlineos.in (signed in as owner qaown1012b, org "QA Build Org 1012b").
Module: **HRMS OS** (reached at `/hr`; module switcher button "Switch module" in top bar shows current module "HRMS OS"; did not open the switcher menu itself — the menu did not render on click, so the module was reached by direct URL `/hr`, which is the same entry the sidebar uses).
Note: the dashboard sidebar ("Home OS") is a different module; HR items there (Announcements /hr/announcements, People /directory) are not HRMS-module pages and were not tested.

## Page map (sidebar of HRMS OS, all 24 entries + expanded children)
| # | Sidebar section / label | Route | Tabs / sub-views observed | Primary actions seen | Status this round |
|---|---|---|---|---|---|
| 1 | HR Overview / Hub | /hr | Start-here checklist, Needs-you counters, Attendance now, Headcount | Create announcement, Review approvals, Onboard employee, Create shift | Mapped; read only |
| 2 | HR Overview / Action Center | /hr/approvals | Pending, Acted; type filters (All types, Leave, WFH, Attendance, Expense, Other) | My delegations | Mapped |
| 3 | HR People / People | /hr/employees | Grid/list toggle; search; dept filter; status filter; Showing/Active/Pending invite/Inactive cards | Export, Add employee | Mapped; CRUD tested |
| 4 | HR People / Org Chart | /hr/org-chart | — | — | Mapped (heading only) |
| 5 | HR People / Positions | /hr/positions | Positions, Reorg Scenarios; All Statuses filter | Create position (x2) | Mapped; empty state |
| 6 | Lifecycle / Onboarding | /hr/onboarding | Workflow, Plans, New Employee, Documents, Probation, Single employee, Bulk upload; 4-step wizard (Personal, Job Details, Pay setup (optional), Review) | Next, Back | Mapped |
| 7 | Lifecycle / Exit | /hr/exit | — | — | Mapped (heading only) |
| 8 | Lifecycle / Exit → Final settlement | /hr/fnf | — | Create draft (does not pay; "Open payroll settlement") | Mapped; not exercised (no payment/payroll) |
| 9 | Lifecycle / Exit → Termination | /hr/termination | — | — | Mapped (heading only) |
| 10 | Lifecycle / Assets | /hr/assets | Filters: All statuses, All types, All assignments; cards Total/Available/Assigned/Maintenance | Export, Register Asset | Mapped |
| 11 | Lifecycle / Exit → Asset Returns | /hr/asset-returns | — | Log Return | Mapped; table shows placeholder headers "Column 1..4" (see bug candidate) |
| 12 | Time / Attendance | /hr/attendance | Time tracker (Clock in, Request Correction), Team attendance today; All departments filter; Clear filters; Email Report; Download page | Clock in, Request Correction | Mapped; CRUD tested |
| 13 | Time / Shifts | /hr/shifts | Shift Templates, Assignments, Swap Requests | Create shift | Mapped; empty |
| 14 | Time / Leave | /hr/leaves | My leaves, Work from home, Approvals; Available/Pending/Approved cards | Request WFH, Request leave, Export | Mapped; CRUD tested |
| 15 | Time / Leave → Policies | /hr/leave-policies → redirects to /hr/settings/policies | — | — | Mapped (redirect) |
| 16 | Time / Leave → Holiday Calendar | /hr/holidays | Calendar, List, Year, Upcoming, By Location | Add holiday | Mapped; CRUD tested |
| 17 | Time / Leave → Comp-off | /hr/comp-off | — | — | Mapped (heading only) |
| 18 | Time / Leave → Analytics | /hr/leaves/analytics | — | Open people analytics | Mapped |
| 19 | Time / Time clocks → Devices | /hr/devices | Devices, Failed Syncs, All Sync Logs | Register device | Mapped; empty |
| 20 | Time / Time clocks → Biometric | /hr/biometric | Devices, Punch Logs | Register device | Mapped |
| 21 | Documents / Documents | /hr/documents | Letters, Expiring, Calendar; folder filters (All types, All Files, Contracts, Policies, Tax Forms, Templates, Payroll) | Generate Letter, New Folder, Upload, Create Document | Mapped |
| 22 | Documents / Doc Types | /hr/document-types | — | Add Document Type | Mapped; empty |
| 23 | Documents / Doc Review | /hr/document-review | All Status; Acknowledgements; Pending only | Review (per employee) | Mapped |
| 24 | People Ops / Cases | /hr/cases | Cases, Disciplinary Actions; filters Status/Category/Severity | Anonymous Report, New Case | Mapped |
| 25 | People Ops / Employee support | /hr/helpdesk | HR, IT, Finance, Admin, Legal queues; All statuses | Queue settings | Mapped |
| 26 | People Ops / Expenses | /hr/expenses | All Claims, Pending, Approved, Rejected; month totals | Import expenses, Add expense | Mapped |
| 27 | People Ops / Expenses → Travel | /hr/travel | — | — | Mapped (heading only) |
| 28 | People Ops / Expenses → Travel Approvals | /hr/travel/approvals | — | — | Mapped (heading only) |
| 29 | People Ops / Compensation & Benefits | /hr/benefits | My benefits, Claims, Manage plans | — | Mapped |
| 30 | Insights / People analytics | /hr/analytics | — | — | Mapped (heading only) |
| 31 | Settings / HR configuration | /hr/settings | Simple/Advanced toggle (Simple hides 7 advanced tools); tabs-as-links: Overview, Policies, Reporting managers, Templates, Import/Export | — | Mapped |
| 32 | Settings / HR config → Import/Export | /hr/settings/import-export | — | — | Mapped (not exercised) |
| 33 | Settings / HR config → Integrations | /hr/settings/integrations | — | — | Not reached (time) |
| 34 | Settings / HR config → Policies | /hr/settings/policies | HR Policies | — | Mapped |
| 35 | Settings / HR config → Reporting managers | /hr/settings/reporting-managers | — | — | Not reached (time) |
| 36 | Settings / HR config → Workflows | /hr/settings/workflows | Workflow Settings; All types / All statuses | New Workflow | Mapped |
| 37 | Settings / HR config → Templates | /hr/settings/templates | — | — | Not reached (time) |
| 38 | Settings / HR config → Forms | /hr/settings/forms | — | — | Not reached (time) |
| 39 | Settings / HR config → Custom Fields | /hr/settings/custom-fields | — | — | Not reached (time) |
| 40 | Settings / HR config → Preview / Versions / Automations | /hr/settings/preview, /versions, /automations | — | — | Not reached (time) |
| 41 | Settings / Access & governance | /hr/identity | Provisioning, Templates, Exit Verification; New template, Provision | — | Mapped |
| 42 | Settings / Delegations | /hr/delegations | Proxy delegations table; Grant Proxy | Grant Proxy | Mapped; not exercised |
| 43 | Settings / HR access | /hr/access | Audit log, Roles, Members | — | Mapped (heading only) |

Related (outside HRMS sidebar but linked from HRMS):
- Org Structure (Departments live here, not in HRMS sidebar): /settings/organization/structure — Business Units 0, Branches 0, **Departments 1**, Teams 0. Linked from HR configuration → Organization Structure.
- Company Profile: /settings/organization. Roles: /settings/roles (not tested).
- Payroll: /hr/payroll redirects to /payroll which shows "Module not enabled — Payroll is not enabled for your organisation" with an "Enable Payroll" button. **Not clicked** (module enablement/billing-affecting). Payroll/salary structure pages therefore not reachable in this org.
- Designations: no separate page found in HRMS sidebar; Positions (/hr/positions) is the closest (position control). Not confirmed as designations.

## Status of test areas (Round 1) — what was actually exercised
Legend: PASS = behaves as expected · BUG = see HR-BUGS.md · PARTIAL = partly exercised · NOT REACHED = not tested (reason)

### CRUD and workflows
| Area | Create | Read/List | Update | Delete/Archive | Result |
|---|---|---|---|---|---|
| Employees (onboarding wizard, /hr/onboarding) | QA HR Thirteen created (1 record even after double-click on Submit) | /hr/employees list + profile | Designation edit (Edit tab) | Not done (Terminate not clicked, intentionally) | PARTIAL — BUG HR-B-001/002/003/006 |
| Departments (/settings/organization/departments) | QA Dept 1013 created | List shows | Not tested | Not tested (archive not clicked) | BUG HR-B-004/005 |
| Leave types/policies (/hr/settings/policies, type Leave) | QA Leave 1013 created (draft v1) | list | not tested | not tested | BUG HR-B-011 (negative accrual) |
| Leave requests (/hr/leaves) | 2 requests created (Casual, Sick) | "My leaves" list persists on reload | Cancel not clicked | Not tested | PASS for create/validation; PARTIAL for approve/reject (see Not reached) |
| Leave approve/reject | — | Action Center and leaves Approvals tab show own requests with "Needs another approver" | — | — | NOT REACHED as a different approver (see below) |
| Attendance clock in/out (/hr/attendance) | Clock in + clock out | Team attendance + Daily History | — | — | PASS (time zone issue HR-B-010) |
| Attendance correction (/hr/attendance) | Create (valid + validation probes) | Corrections card, Daily History | — | — | BUG HR-B-008 (self-approve), HR-B-009 (contract error); Reject PASS |
| Holidays (/hr/holidays) | QA Holiday 1013 (Oct 30) | Calendar + "October holidays" list, persisted on reload | Not tested | Not tested | PASS (script name rejected, error text clear) |
| Shifts (/hr/shifts) | QA Shift 1013 created | list | Not tested | Not tested | BUG HR-B-007 (inverted times) |
| Designation/job data via Edit | — | profile | Designation save | — | BUG HR-B-003 (blank saved); max-length PASS; HTML escape PASS |
| Positions (/hr/positions) | blank submit only: "Position title is required", "Status is required", "Effective date is required" | empty state | — | — | PARTIAL (validation only) |
| Document types (/hr/document-types) | blank submit only: "Name is required" | empty state | — | — | PARTIAL (validation only) |
| Assets (/hr/assets) | blank submit only: "Asset name is required" | list (1 pre-existing "QA Laptop") | — | — | PARTIAL (validation only) |
| Asset returns (/hr/asset-returns) | — | stuck loading | — | — | BUG HR-B-012 |
| Cases (/hr/cases) | blank submit only: "At least 5 characters", "At least 10 characters" | "No cases found" | — | — | PARTIAL (no record created; sensitive) |
| Expenses, Benefits, Travel, Helpdesk, Exit/FnF, Termination, Comp-off, Identity, Delegations, Biometric, Devices, Workflows | — | heading/empty state only | — | — | NOT REACHED (time budget; no CRUD) |

### Edge cases
| Check | Result |
|---|---|
| Empty / whitespace values (names, designation, holiday name, dept name, shift name, leave reason) | Names: silent behaviour (HR-B-001/002). Designation whitespace saved (HR-B-003). Dept name whitespace → raw message (HR-B-004). Holiday/shift/leave/correction/reason blank → blocked with messages (PASS). |
| Very long values | Designation 300 chars → "Designation must be at most 200 characters" (PASS). First Name accepted a 300-character value with no visible max length (see HR-U-013). Last Name 120-char value accepted. Email 60-char local part accepted (PASS per RFC). |
| `<script>` / HTML payloads | Designation `<img onerror>` stored and escaped (PASS). Holiday name `<script>` rejected with message (PASS). Name fields strip `<`/`>` silently (HR-B-001). Cases not submitted. |
| Invalid email | `bad`, `a@b`, `a@@b.com`, `qa..x@…`, `<script>…@x.com` → "Invalid email address" (PASS) |
| Invalid phone | `abc`→ emptied; `12` → "Please enter a valid phone number" (PASS); `<b>9</b>` → `9` silently (minor) |
| Invalid dates | Attendance correction: check-out before check-in → "Check-out must be after check-in" (PASS); future check-in → "Check-in cannot be later than the current time" (PASS). Leave "To" before "From" → earlier dates disabled in picker (PASS). Future DOB → next-month navigation disabled in DOB picker (PASS, picker only). Shift inverted → HR-B-007. |
| Duplicate email | Blocked at Next: "This email already belongs to an employee in your organization." (PASS) |
| Duplicate department name | Accepted (HR-B-005) |
| Double-click submit | Employee Submit double-click created exactly 1 record (PASS) |
| Refresh after each mutation | Done for employee edit, holiday, leave list, policy list, shift list, attendance corrections, departments (PASS; the in-flow approve error still persisted the write — HR-B-009) |
| Search / filter / pagination with URL sync | Search `?q=` on load PASS; typed no-match search BUG HR-B-006; status filter `?status=inactive` PASS (URL + "No results match your filters" + Clear filters). Pagination: NOT REACHED — only 9 employees, no page 2 to test. |
| Back / Forward | Back after filter/search returns previous `?q=`/state (PASS). Forward not exercised separately. |
| Self-approval | Leave: blocked ("Needs another approver") PASS. Attendance correction: allowed (HR-B-008) BUG. |

### Not reached (and why)
- **Leave approve and reject by a different approver:** owner-only session cannot approve own requests (blocked by design), and no other user has a pending request. Needs a second HR approver account or an employee-actor round (QA HR Thirteen) — out of the "as owner" scope for this round; recommended for Round 2.
- **Payroll / salary structures / Final settlement disbursement:** `/hr/payroll` redirects to `/payroll` → "Module not enabled — Payroll is not enabled for your organisation" with an "Enable Payroll" button. Not clicked (module enablement affects billing and is out of scope). Create draft on /hr/fnf not clicked (it saves a settlement draft linked to payroll).
- **Designations as a separate entity:** no designations page found in the HRMS sidebar; positions are the closest. Not verified.
- **Pagination:** only 9 employees.
- **Departments edit/archive; leave type edit; holiday edit/delete; shift edit/delete:** not exercised.
- **Employee terminate, exit, asset returns logging, expense add/approve, benefits claims, travel requests, helpdesk tickets, cases:** not exercised (scope/time; several are destructive or employee-relations records).
- **Settings sub-pages:** Integrations, Reporting managers, Templates, Forms, Custom Fields, Preview, Versions, Automations, Roles & permissions, Import/Export: not exercised (Settings is in "Simple" view; 7 advanced tools hidden — Advanced toggle not tested).
- **Module switcher:** the "Switch module" button did not visibly open a menu in my attempt; HRMS was reached by direct URL `/hr` (sidebar HR OVERVIEW etc.).
- **Bulk upload (onboarding), document upload, Biometric punches, Time clock devices:** not exercised.
- **Attendance Email Report / Download page; Team attendance filters:** not exercised.
- **Accessibility, responsive layout, performance:** not measured.

## Sidebar/nav checks
- Sidebar expand/collapse (Leave, Exit, Time clocks, Expenses, HR configuration) PASS; children enumerated (see map).
- Route names: `/hr/leave-policies` redirects to `/hr/settings/policies` (expected alias).

---
# Round 2 coverage (2026-10-14, employee / owner / other-actor pass)

## Actors used
| Actor | Role in org | Window | Status |
|---|---|---|---|
| owner qaown1012b | Owner | default window, kept signed in | used for approvals |
| employee qahr1014a (QA HR Thirteen) | Member, no HR role group | private window | done |
| member qamem1012c | Member, non-HR | private window | done (read-only) |
| member qaview1012e | Member, non-HR | private window | done (read-only; onboarding skipped) |
| outsider qaout1012g | Other org (Outsider Org 1012g) | private window | done (read-only) |

## Employee actor (qahr1014a)
| Area | Result | Notes |
|---|---|---|
| Sign-in + onboarding | PASS | "Skip for now" used on personal details; banner "Your own employee profile is still incomplete" remains (HR-U-015) |
| Own profile view | PASS (partial) | Only a directory card (name, email, "Member linked"). No HR self-profile page — HR profile routes denied |
| Other employees' salary/PII not visible | PASS | Directory shows name + work email + Added date only for 2 people; no salary/bank/phone |
| Apply leave (2 requests) | PASS | Casual Oct 19 and Sick Oct 22 created; "Pending" then decided |
| Balance after decision | BUG | HR-B-014 (balance 11 while card says prorated 3/12) |
| Request attendance correction | PASS (create) / BUG on validation | Morning check-in rejected as "later than now" (HR-B-013); 02:00 → 02:30 accepted |
| Route-by-URL sweep (/hr routes) | PASS | Every /hr/* route checked: DENIED with named permission, or ALLOWED for /me/*, /hr/leaves (own), /hr/holidays, /hr/announcements, /hr/expenses, /hr/travel (see RBAC.md). /hr/payroll = module off |
| IDOR: other employee profile by id | PASS (blocked) | /hr/employees/{owner id} → hr:employees:view denied; directory card for owner shows name/email only |

## Owner actions (qaown1012b)
| Area | Result | Notes |
|---|---|---|
| Approve employee's leave (Casual Oct 19) | PASS | Status visible to employee after refresh |
| Reject employee's leave with reason (Sick Oct 22) | PASS | Reason "QA 1014 rejected for test: insufficient cover" shown to employee |
| Balance update | BUG | HR-B-014 |
| Approve attendance correction | PASS (applied) / BUG on toast | HR-B-009 re-check: toast "server sent data this screen does not understand", write applied |
| Approver card context | BUG | HR-B-015 (no requester, no original punch) |
| Leave list reload | BUG (intermittent) | HR-B-016 (one "Failed to load leaves data" error; Try Again worked) |

## Other org actors (Round 2 step 3)
| Actor | /hr | /hr/employees | QA HR Thirteen profile URL | Leak? |
|---|---|---|---|---|
| qamem1012c (member) | DENIED (hr:employees/attendance/leaves:view) | DENIED (hr:employees:view) | DENIED for HR profile id; /directory card allowed (name, work email) | No salary/PII |
| qaview1012e (member) | Onboarding gate → after Skip, DENIED | Onboarding gate → after Skip, DENIED | DENIED for HR profile id; /directory card allowed | No salary/PII; gate inconsistency HR-U-014 |
| qaout1012g (outsider, other org) | DENIED module:hr org-disabled | DENIED module:hr org-disabled | /directory card → "Not found" | No cross-org leak |

## Owner step 4 — NOT REACHED
- Edit/archive department, edit leave type, edit/delete holiday, edit/archive shift — NOT REACHED (budget; browser memory pressure: ~0.9 GB free with 2 tab crashes during Round 2).
- Exit/offboard flow up to final confirm — NOT REACHED (no termination performed; no real people touched).
- Helpdesk / cases create — NOT REACHED.
- Assets assign / return — NOT REACHED.
- Expenses create — NOT REACHED.
- Payroll enable — intentionally NOT done (per instruction).

## Known tooling notes (Round 2)
- Browser crashed on /me/time-off and /hr/travel/approvals in the employee window, and on the outsider-sign-out attempt (tab crash, recovered in a new private window).
- Guerrilla Mail: "Scramble Address" makes the displayed address differ from the username; the username is what receives OTP mail (verified for each actor).

---
# Round 3 coverage (2026-10-14, owner qaown1012b step-4 pass)
Setup: closed the extra tabs (Guerrilla Mail, a session-expired sign-in tab, a directory tab) so one streamlineos.in tab remained in the owner window (Team Attendance showed the owner as signed in; no OTP sign-in was needed). No payroll enable, no payment, no sign-in as any other actor.

## Owner step 4 — results
|| Item | Action | Result | Bugs / notes |
|---|---|---|---|
|| Department QAD1013B | Edit (description) | PASS (saved, verified after reload) | — |
|| Department QAD1013B | Archive | BLOCKED — "Could not check dependencies" ×2 | HR-B-017 (contract error, mode "archive|retire"). Still ACTIVE |
|| Leave type QA Leave 1013 | Edit (draft) | BLOCKED — PATCH /hr/policies/3 → 400, silent | HR-B-018 |
|| Leave type QA Leave 1013 | Publish (Activate) | PASS — draft v1 → active v1 (POST …/activate → 200) | Active policies are read-only (by design) |
|| Leave type QA Leave 1013 | New version / edit / publish v2 | New Version created (201); Activate BLOCKED by self-conflict; edit 400 | HR-B-019, HR-B-018, HR-U-021/022 |
|| Holiday QA Holiday 1013 | Edit (rename to "QA Holiday 1013 Edited") | PASS (persisted after reload) | Name rule not probed with punctuation |
|| Holiday QA Holiday 1013 | Delete | PASS (confirm "Delete this holiday?") | list shows "No holidays in October" |
|| Shift QA Shift 1013 | Edit (break 60 → 45) | PASS (confirm "Save shift changes?"; persisted) | HR-U-025 |
|| Shift QA Shift 1013 | Delete | PASS (confirm "Delete shift template?") | — |
|| Helpdesk ticket | Create | NOT POSSIBLE from owner UI (no create action on /hr/helpdesk) | HR-U-032 |
|| HR case (substitute for ticket) | New Case (Other, Medium, synthetic, no subject employee) | PASS — CASE-CNR5BW created (POST /hr/cases → 201) | Cases page placeholder "Loading… Column 1–4" ~15 s (HR-B-012 family) |
|| Expense — amount 0 | Submit | PASS (blocked, "Amount must be greater than 0") | — |
|| Expense — amount -5 | Type/fill | Minus dropped on typing; fill reverts to 0 | HR-B-021 |
|| Expense — amount letters | Type | Letters dropped, field empty, no message | HR-B-021 |
|| Expense — huge | Typed 14 nines → field keeps 9 digits; submit | ACCEPTED (201) ₹99,99,99,999 Pending | HR-B-020. Corrected to ₹250 by PATCH (200) |
|| Expense — valid | Create | Covered by the record #EXP-2026-004 after correction (₹250, Pending) | No separate clean valid claim created (avoid extra duplicates) |
|| Asset — register + assign | Register QA Asset 1013 Laptop; Assign to QA HR Thirteen | PASS (PATCH /hr/assets → 200; card Assigned 1) | — |
|| Asset — return | Log Return (Good) → Received → Confirm Return | PASS on the return record (Returned) | HR-B-022: asset stays Assigned until owner unassigns manually |
|| Asset — unassign | Reassign / Unassign → Unassign Employee | PASS (Available 1 / Assigned 0) | — |
|| Announcement | New Announcement "QA 1013 announcement (owner round 3)" · Published · Everyone | PASS (POST /org/announcements → 201; listed once) | — |
|| Bulk upload (malformed CSV) | Upload `uploads/malformed-bulk-1013.csv`; preview; Clear | Preview PASS to show errors; merged-row bug | HR-B-023. Nothing created (employee count still 9); NOT confirmed |
|| Exit — Submit resignation | Opened (self-service form for owner) | CANCELLED — no record | HR-B-024, HR-U-028 |
|| Exit / offboard — QA HR Thirteen only | Terminate (profile) → Create & Approve → Send Email → Complete | Ran to Completed (last step, as instructed) | HR-B-025 (employee still Active; no checklist/FnF draft visible). HR-U-026/027 |
|| Final settlement | Viewed /hr/fnf | Not used (Create draft not clicked; payroll-linked) | — |

## Other checks in this round
|| Check | Result |
|---|---|
|| Refresh after each mutation | Done after every write (reload or fresh navigation), except where noted in TEST-DATA |
|| Bulk upload: template columns | Template headers listed (firstName, lastName, email, designation, department required); preview row counts correct for the valid row (1 ready / 2 held) |
|| Expense 0 / negative / huge / letters | Covered above (0 blocked; -/letters dropped; huge accepted) |
|| Owner session | Stayed signed in; no OTP needed |
|| Emails | Only @sharklasers.com addresses used (qahr1014a for the termination email; qabulk1013a/c in the preview only) |

## NOT REACHED / deliberately not done
- **Payroll enable / payroll settlement:** not done (instruction). /hr/payroll not touched.
- **FnF draft (Create draft):** not clicked (saves a draft linked to payroll). The completed termination did not show a draft (HR-B-025).
- **Bulk upload confirm ("Create 1 employee"):** not clicked (malformed file; preview only).
- **Department archive (success path):** blocked by HR-B-017 (not reachable).
- **Leave type activation of v2 / final leave edit:** blocked by HR-B-018/019.
- **Helpdesk ticket:** no create action found on the owner's Employee support page. A case was created instead.
- **Exit: resignation path for QA HR Thirteen:** not possible from the UI (HR-B-024); used Terminate path.
- **Asset returns "Pending" to "Returned" without unassign:** done; unassign done manually after.
- **Expense approval/rejection:** not done (not in scope; claims left Pending).
- **Clock-in / time-zone checks, leave approvals by another actor:** not in this round's scope.
