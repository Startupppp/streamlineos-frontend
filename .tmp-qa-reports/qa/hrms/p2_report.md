# P2 cross-context QA: StreamlineOS HRMS, QA Build Org 1012b (TEST org)

Date: 2026-10-13 (IST; browser clock UTC 17:24-17:45). Synthetic data only. Signed in as QA owner (qaown1012b). Module: HR enabled.
Screenshots: /workspace/qa/hrms/p2_*.png and p2_*.webp (16 files). Prior run notes: p1n_report.md.

## Summary
- Defects (new this pass): 8
  - DEF-1 (High) Asset edit is last-write-wins with no conflict detection: an earlier tab's save is silently overwritten.
  - DEF-2 (High) Leave approval returns HTTP 500 for the owner's own leave (approver == requester). Reproduced 3 of 3 attempts from 2 tabs. Leave stays Pending.
  - DEF-3 (Medium) At 768px width (iPad Mini) there is no visible navigation: sidebar hidden, no bottom nav, no menu toggle.
  - DEF-4 (Medium) Onboarding step 1 phone country selector button has no accessible name.
  - DEF-5 (Medium) Date picker in Request leave drawer: keyboard day selection not confirmed (arrow keys did not move focus between days). Needs a follow-up pass.
  - DEF-6 (Low/intermittent) /hr/employees hard load once showed the error boundary "Something went wrong" (React minified error #441). Not reproduced in 5 later loads (1 of about 45 deep-link loads).
  - DEF-7 (Low) /hr HR overview body is empty (header only) on desktop, 375 and 768 after load settled. Could be an empty state that is not rendered, or a data-load failure (see console CORS note).
  - DEF-8 (Low) Console on /hr shows many fetch failures for api.streamlineos.in with "No Access-Control-Allow-Origin" (CORS) on one load (after an in-tool navigation). Not reproduced on 3 later reloads. Could explain DEF-7 when it happens.
- Verified OK: deep links (39/39 loads correct content), back/forward, incognito redirect to signin with callbackUrl, Request leave drawer focus trap, Esc closes drawer and returns focus, step-1 onboarding inline error association (aria-invalid + aria-describedby), labeled form controls.
- Blocked: logout propagation (skipped by instruction), separate role sessions.
- Records changed: QA Laptop asset Location field (blank -> "QA-LOC-B-1"). Leave request Nov 18 (Casual, id 3) unchanged (still Pending). No new records created. No emails, invites, payments, or module changes.

## Test 1: Two tabs, same session
### 1a Asset QA Laptop edit (tab A and tab B)
Steps:
1. Tab A (/hr/assets) opened Edit Asset drawer for QA Laptop. Location was blank.
2. Tab B (new tab, same session) opened the same drawer before any save. Location blank.
3. Tab A: Location = "QA-LOC-A-1", Save Changes. Toast "Asset updated". Drawer closed.
4. Tab B (still showing the pre-save form): Location = "QA-LOC-B-1", Save Changes. Toast "Asset updated". No conflict warning, no stale-data warning, no error.
5. Reloaded both tabs. Opened the drawer fresh: Location = "QA-LOC-B-1". Other fields unchanged (name, serial SN-QA-LAPTOP-0001, brand, model, cost 50000).
Result: VERIFIED DEFECT (DEF-1). Last-write-wins on a full-form save. Tab A's change was lost silently. Only the drawer shows Location (the list row does not), so the loss is hard to notice.
Evidence: p2_t1_asset_edit_tabA_drawer.png
Notes: the employee profile variant was not run (task said "or").

### 1b Leave Nov 18 (Casual, requester qaown1012b, approver is the same user)
Steps:
1. Tab B opened /hr/approvals first: Pending 1, row "qaown1012b · Casual Leave · Nov 18" with Approve and Reject.
2. Tab A opened /hr/approvals (same pending row).
3. Tab A: Approve. Result: HTTP 500 on POST api.streamlineos.in/hr/leaves/3/approve. Toast "Something went wrong on our end. Please try again shortly." Row still pending.
4. Tab A: Approve again (second attempt, reloaded page first). Same 500 and toast.
5. Tab B (stale pending view): Approve. Same 500 and toast. No double action because none succeeded.
6. Final state after reload: /hr/leaves shows "Casual Leave, Nov 18, 1 day, Pending" with the note "You are the approver — decide in Action Center". Approvals queue still shows 1 pending.
Result: VERIFIED DEFECT (DEF-2). Error handling is a generic 500 with no validation message. The likely trigger is self-approval, because the UI calls this user the approver of their own leave. The server should return a 4xx with a clear reason, or the UI should hide Approve for own requests. Reject was NOT tested (it would change the record).
Console: "Failed to load resource: 500 @ /hr/leaves/3/approve" x3.
Evidence: p2_t1_approvals_pending_500.png, p2_t1_leaves_self_approver_note.webp

## Test 2: Logout propagation
BLOCKED. Skipped actual logout per instruction (would require re-login).

## Test 3: Direct deep links + refresh (hard load), 3 times each
Method: page.goto (hard load) to each route, 3 iterations (39 loads total). Times are DOM-ready and content-ready (skeleton "Opening this section" gone), measured with 4 tabs loading in parallel, so times are upper bounds.
All 39 loads rendered the correct page (h1 matched route). No redirects to HR overview, no blanks.
| Route | Correct content (3/3) | DOM ready (s) range | Content ready (s) range |
|---|---|---|---|
| /hr | yes, but body empty (DEF-7) | 1.2-3.1 | 2.8-3.7 |
| /hr/employees | yes (1 incident, DEF-6, on a first hard load) | 1.6-4.0 | 2.1-4.4 |
| /hr/leaves | yes | 1.5-4.8 | 1.7-5.4 |
| /hr/attendance | yes | 2.0-3.8 | 2.1-4.3 |
| /hr/settings/templates | yes | 2.1-5.0 | 2.6-5.4 |
| /hr/settings/automations | yes | 2.4-5.6 | 2.9-5.8 |
| /hr/settings/versions | yes (h1 Version History) | 2.2-3.6 | 2.9-3.7 |
| /hr/settings/import-export | yes | 2.1-3.4 | 2.8-3.9 |
| /hr/exit | yes (Exit Management) | 2.1-4.0 | 2.8-4.8 |
| /hr/document-types | yes | 2.1-2.4 | 2.6-2.8 |
| /hr/document-review | yes | 2.0-4.1 | 2.2-4.7 |
| /hr/analytics | yes (People analytics) | 2.1-3.3 | 2.8-3.8 |
| /hr/benefits | yes | 1.9-4.0 | 2.4-4.7 |
Ranges are approximate reads from the timing output.
DEF-6 detail: first hard load of /hr/employees (right after /hr) displayed "Something went wrong / An unexpected error occurred" (error boundary). Console: "Minified React error #441" with route /hr/employees, digest 605193880. Not reproduced: 3 loads in the matrix plus 2 more loads (one right after /hr).
Back/forward (3 HR pages): /hr/employees -> /hr/leaves -> /hr/attendance. Back -> /hr/leaves (Leaves & Time Off). Back -> /hr/employees (Employee directory). Forward -> /hr/leaves. All correct.
Also: /hr/access loaded directly (Roles and Members tabs work). /hr/holidays loads (Holiday Calendar).
DEF-7 detail: /hr shows "HR overview" heading and subtitle only; no cards or widgets rendered at 1280, 375 or 768 widths after networkidle. Console on one load showed CORS failures for /hr/hub and related endpoints (DEF-8). Not reproduced on three later reloads.

## Test 4: Roles and access
- /hr/access tabs: Roles, Members. Roles tab lists: HR Module Admin (0 members, System), HR Module Member (0, System), HR Module Owner (1, System).
- Members tab: one member, qaown1012b, role HR Module Owner.
- Separate role sessions (admin/member users): BLOCKED (no test users; no invites allowed).
- Incognito window (no session), direct load of /hr/employees: redirected to https://www.streamlineos.in/signin?callbackUrl=%2Fhr%2Femployees. callbackUrl preserved. PASS. No data shown.
Evidence: p2_t4_incognito_employees_redirect.webp
Note: the incognito window was closed afterwards.

## Test 5: Responsive
Method: Chrome DevTools device toolbar (ctrl+shift+m). Width 375 (custom), 768 (iPad Mini preset). Overflow check: visible buttons and links with right edge beyond viewport.
- 375, /hr: header reduced to logo + icons. Bottom tab bar: Hub, Action Center, People, Onboarding, More, plus floating "..." button. HR overview body empty (DEF-7). No horizontal overflow among checked controls.
- 375, /hr/employees: card list, filters stacked, Add button full width. Cards readable. No overflow detected.
- 375, /hr/leaves: Request WFH and Request leave stacked. Module tab row clipped ("Approvals 1" cut at right edge; tab row scrolls). Leave table scrolls horizontally inside its box: Status column cut off and the "Cancel request" action is off-screen until scrolled. Overview chart shows an empty placeholder box. Evidence: p2_r5_375_leaves.png
- 375, /hr/onboarding (wizard step 1): usable. Step indicators fit. Module tabs clipped ("Documents" cut at the edge). Form scrolls inside its panel; WhatsApp checkbox sits at the bottom edge. Back/Next visible. Evidence: p2_r5_375_onboarding.png
- 768, /hr: no sidebar, no bottom tab bar, no visible menu or hamburger toggle. Only header icons (search, +, bell, avatar). Module navigation not visible at this width (DEF-3). Evidence: p2_r5_768_hr.png
- 768, /hr/employees: 3-column card grid, all controls visible. Evidence: p2_r5_768_employees.png
- 768, /hr/leaves: fits, table with Action column visible. Evidence: p2_r5_768_leaves.png
- 768, /hr/onboarding: two-column form, module tabs fit, Back/Next visible. Evidence: p2_r5_768_onboarding_devtools.webp
- Sidebar behavior: desktop sidebar has Collapse control. At 375 it is replaced by the bottom tab bar. At 768 neither is shown (DEF-3).

## Test 6: Accessibility (keyboard-only, Chrome focus checks)
Onboarding step 1 (/hr/onboarding):
- Tab order from the top of the page: header controls (logo, Switch module, Collapse sidebar [aria-label], Switch organization, Search [aria-label "Search (⌘K)"], Create, Account menu [aria-label]), then the full sidebar (~45 stops, section headers are buttons, some "Expand" buttons have aria-labels), then the wizard. First Name is about the 54th stop. A "Skip to content" link is reached only after the last control, so it does not help skip the sidebar.
- Focus visibility: phone input shows a dark focus ring (p2_t6_onboarding_focus_ring_phone.png). PASS on that control.
- Empty Next via keyboard: inline errors shown under First Name ("First name is required"), Last Name ("Last name is required"), Email ("Invalid email address", same as P1 D5). Inputs have aria-invalid="true" and aria-describedby pointing at the message element. Focus moved to First Name. PASS for association. Also a toast "First name is required".
- Unnamed control (DEF-4): phone country-code button (flag, aria-expanded=false) has no accessible name. Phone number input is named ("Phone"). WhatsApp checkbox is named by its label. Gender combobox is named. Select DOB button is named by its text. Back arrow icon in page header has aria-label "Back to Employees".
- Visual contrast: placeholder text (John, john@company.com, Enter phone number, Select) and grey helper text look light. Not measured with a contrast tool.
Request leave drawer (/hr/leaves):
- Keyboard reaches the Request leave button (about 55 stops), Enter opens drawer, focus lands on "Select leave type". PASS.
- Focus trap: Tab cycles Select leave type > Start date > End date > Half Day checkbox > Priority > Reason textarea > Upload File > Cancel > Submit > Close > back to first. Focus does not escape to the page behind. PASS.
- Esc: first Esc closed the open year dropdown (drawer stayed open); second Esc closed the calendar popover (drawer stayed open); third Esc closed the drawer. Focus returned to the Request leave button. PASS (nested-layer behavior is correct).
- Labels: Leave type, From, Half Day Request (checkbox), Reason are named. PASS.
- Empty submit (click, no record created): errors "Select leave type", "Leave type is required", "Start date is required", "End date is required", "Reason must be at least 10 characters". ARIA on these after submit not verified.
- Date picker (DEF-5): Enter on the Start date field opens a calendar (role=grid); focus moved to "Previous month". Tab moved to the month combobox, then the year combobox. ArrowRight on "Previous month" did nothing. ArrowDown on the year combobox opened a year list. I did not reach a day cell with the keyboard, so keyboard date selection is NOT confirmed. Needs follow-up.
- Focus visibility on the calendar button and drawer controls is visible (dark ring). Evidence: p2_t6_leave_drawer_datepicker_focus.png
- Dialogs: console warning "Missing Description or aria-describedby={undefined} for DialogContent" several times (Radix dialogs, including the drawer).
Incident: while testing keyboard routes, a Shift+Tab/Enter sequence navigated the tab to /settings/billing?tab=plan (element that took focus unknown). No Upgrade or plan action was taken. Evidence: p2_t6_accidental_billing_nav_from_keyboard.png

## Test 7: Console errors (listener on the test tab; session-wide log checked)
- /hr (3 reloads with listener): 0 failed requests, 0 console errors.
- /hr (one load after an in-tool navigation, about 17:28 UTC): CORS failures "Access to fetch at api.streamlineos.in/... blocked by CORS policy: No Access-Control-Allow-Origin" for billing, chat/unread, me/inbox/unified/count, dashboard/pending-approvals, organization, hr/leave-policies, companion/preferences, mail/accounts, hr/employees/counts, organization/settings, hr/hub, hr/documents/stats, hr/policies, billing/entitlements, hr/shifts, me/preferences. Not reproduced later (DEF-8).
- Other console entries seen in session (not all on /hr): 404 on www.streamlineos.in/hrms, /features, /modules (route-like URLs); 404 on api feedbucket config; 402 on dashboard/pending-approvals and leads?limit=1; 400 on me/time-off; ERR_HTTP2_PROTOCOL_ERROR and ERR_CONNECTION_CLOSED on notifications/events (SSE drop); 500 on hr/leaves/3/approve (DEF-2); Radix DialogContent warnings; preload-not-used warnings for fonts on /hr/onboarding; Razorpay checkout "Unrecognized feature: web-share" (only loaded for billing).
- /hr/leaves: load shows only an ERR_ABORTED prefetch of /settings/billing (benign). After an invalid submit: 0 console messages. The valid submit was NOT done (would create a record). The 500 on approve appears here (DEF-2).
- /hr/holidays: loads (Holiday Calendar). Only ERR_ABORTED prefetch of /dashboard (benign). 0 errors.

## Records created or changed in this pass
- Changed: Asset "QA Laptop" Location field: blank -> "QA-LOC-B-1" (from test 1a). Consider resetting to blank.
- Unchanged: Leave Nov 18, Casual Leave (id 3), Pending. Approve attempts (x3) all failed with 500.
- Not created: no leave, holiday, employee, asset, expense, or invite records. Empty leave form submit was blocked by validation.
- Not touched: module settings, billing, members, roles, logout.

## Defect list with repro
DEF-1 Asset last-write-wins: open Edit on QA Laptop in two tabs; save A with location X; save B (stale) with location Y; reload -> Y, no warning.
DEF-2 Self-approval 500: /hr/approvals, Approve on own Casual Leave (Nov 18). Each click -> 500 toast "Something went wrong on our end." Leave stays Pending.
DEF-3 768px nav: DevTools device toolbar iPad Mini, open /hr. No sidebar, no bottom bar, no menu toggle.
DEF-4 Onboarding step 1: Tab to phone country flag button; accessibility name empty.
DEF-5 Leave drawer date picker: Enter on Start date, Tab to month/year combos, arrows do not move between days. Unverified fully.
DEF-6 /hr/employees hard load once -> error boundary "Something went wrong"; React #441. 1 of ~45 loads.
DEF-7 /hr hub body empty (header only).
DEF-8 CORS failures on one /hr load (api.streamlineos.in, no Access-Control-Allow-Origin).
