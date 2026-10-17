# BUGS — Org Settings, Round 3 (2026-10-15) — final regression round

Target: https://www.streamlineos.in · Owner's own signed-in session (org "ADitay CAhala", display name adityachalla01) · Test prefix: QA1015R3 · Window: single tab (normal window)
Prior rounds: ../round-1/BUGS-ORG-ONBOARDING.md, ../round-2/BUGS.md · Onboarding: ../../onboarding/round-3/BUGS.md
Clock: all test writes were made 15:00–15:35 UTC on Thu 15 Oct 2026 (20:30–21:05 IST).

**Summary:** Round 1 + 2 items rechecked (16). Result: 13 still open, 1 partly changed (ORG-B-012), 1 partly changed (ORG-B-013), 1 not reproduced as a network error (ORG-B-014, latency still present). 12 new bugs (ORG-B-017..028). Every setting I changed was reverted and verified after reload (see TEST-DATA.md). Leftover that cannot be removed from the UI: permission group "QA1015R3 group" (see ORG-B-009).

## Round 1 and Round 2 recheck

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
|---|---|---|---|
| ORG-B-001 | Whitespace-only org name saved (High) | **STILL OPEN** | "   " saved; after reload ORGANIZATION NAME shows "—". Restored to "ADitay CAhala" and verified after reload. |
| ORG-B-002 | Support phone "12" saved as "+9112" (Medium) | **STILL OPEN** | Saved "12"; view shows "+9112"; edit input "+91 12". Reverted to Not set (verified). |
| ORG-B-003 | Industry edit control blank; "Agency" not in list (Low–Med) | **STILL OPEN** | Edit combobox "Industry" has empty text while view shows "Agency". Cancelled, nothing saved. (Option list not re-read this round.) |
| ORG-B-004 | Branding Logo accepts javascript: URL (High) | **STILL OPEN** | "javascript:alert(1)" saved with no error; edit input re-shows it. Cleared; view "Not set" (verified). Note: while the value was stored, the view row for LOGO was blank (no text), so the stored value was not visible in view mode. |
| ORG-B-005 | Primary colour pre-filled #0b1220 and saved as a side effect (Medium) | **STILL OPEN** | Branding edit pre-fills Primary and Secondary pickers with #0b1220 while view shows "Not set". Clearing the hex field still leaves the picker showing #0b1220 (see ORG-B-022). Reverted to Not set (verified). |
| ORG-B-006 | Localization timezone blank in edit (Low) | **STILL OPEN** | Timezone combobox empty in edit; view "Asia/Calcutta". Cancelled. |
| ORG-B-007 | Business hours accept close before open (Medium) | **STILL OPEN** | Mon close 08:00 with open 09:00 saved; view "Monday 09:00 – 08:00" (about 9 s after save). Reverted to 18:00 (verified). |
| ORG-B-008 | Permission group create: 201 but ApiContractError; dialog stays open; retry 409 (High) | **STILL OPEN** | Created "QA1015R3 group" once. Console ApiContractError CONTRACT_VIOLATION on /principal-groups (status 201; memberCount and roleCount undefined). Toast now reads "The server sent data this screen does not understand. Refresh to try again…". Dialog stayed open with "Creating…" then open with no success toast. Second Create click showed no toast within 3 s; after reload only one group exists (no duplicate). |
| ORG-B-009 | No delete for permission group; no custom-role create (Medium) | **STILL OPEN** | Group rows show only "Rename group" and "Manage group". Roles tab "More role tools" = Audit, Simulate only; no create-role control. Leftover groups: "QA1015 role", "QA1015R2 group", "QA1015R3 group". |
| ORG-B-010 | Legal name / Registration number have no maxlength; raw "Too big" text (Low–Med) | **STILL OPEN** | 270-char Legal name and 120-char Registration number typed (no maxlength attribute). Save shows "Too big: expected string to have <=200 characters" and "<=100 characters". Cancelled; nothing saved. |
| ORG-B-011 | Branch phone "12" saved as "+9112" (Medium) | **STILL OPEN** | Created QA1015R3 Branch with phone 12; list Phone column "+9112". Branch archived after test. |
| ORG-B-012 | Team capacity -3 saved (Medium) | **PARTLY CHANGED — still open** | In this round the UI does not save -3 or 2.5: the Capacity input has min=1 and the browser's native validation blocks Save with no in-app message (see ORG-B-026). Blank capacity saves. Server-side acceptance of -3 could not be tested through the UI. Round 2 saved -3, so the rule is now enforced only in the browser. |
| ORG-B-013 | Duplicate cost-centre code gives 409 with no message (Medium) | **PARTLY CHANGED — still open** | Duplicate code QR3C now shows a toast after about 20 s: "Cost center code already exists code: A cost center with code 'QR3C' already exists." The dialog stays open and the Code field has no inline error. Toast text has a raw "code:" prefix. Only one cost centre was created. |
| ORG-B-014 | Intermittent "Network error" on create/archive; first attempt not saved (Medium) | **NOT REPRODUCED as a network error; latency still present** | Create branch, department, team, cost centre and four archives all succeeded on the first attempt with no network-error toast. Saves still took about 8–10 s (see ORG-B-027). |
| ORG-B-015 | Revoked PAT stays listed until reload (Low) | **STILL OPEN** | Confirmed "Revoke token" in the alert dialog. Toast "Token revoked". Row still listed 6–8 s later without reload. After reload the list is empty. |
| ORG-B-016 | Timestamps in UTC, not org timezone Asia/Calcutta (Low–Med) | **STILL OPEN** | Audit Log shows "15 Oct, 15:24:15" for an action done about 20:54 IST. Personal access token create dialog defaults Expiry time to "15:24" (UTC). Org timezone is Asia/Calcutta. |

## Page: Organization Settings – General (/settings/organization)

### ORG-B-017 — Permission group create and personal access token create/revoke are not written to the audit log
- Severity: High (audit integrity: credential issuance/revocation and access-group creation leave no trace)
- Route: /settings/roles → Groups → New group; /settings/api-tokens → New Token / Revoke token; /settings/audit-log
- Actor: org Owner
- Steps: 1) Note the latest audit entry. 2) Create permission group "QA1015R3 group" (ORG-B-008 flow). 3) Create PAT "QA1015R3 PAT" with accounting:access:view, then Revoke it and Confirm. 4) Open Audit Log (reload) and export CSV.
- Expected: audit rows for "group created", "token created" and "token revoked" with actor, time and target.
- Actual: Audit log (UI and CSV export of 258 rows, exported 15:27 UTC) has no row for the group create (group created about 15:18:38 UTC; rows at 15:17:38 "Settings — Updated" and 15:19:37 "Branch Created" bracket it), and no token rows at all. A text search of the CSV for "token", "pat" and "group" returns only role-change rows. Later UI reload (15:35 UTC) still shows nothing between 15:24:15 and the archives at 15:33–15:34.
- Impact: Admins cannot see who created or revoked API credentials or permission groups. This matters for incident review and compliance.
- Likely code area: audit writer is not called from the principal-groups create handler or from the personal-access-token create/revoke handlers; the audit event catalogue lacks these types.
- Fix: Emit audit events for principal_group.created, api_token.created, api_token.revoked (store token id and name, never the secret). Back-fill is not needed; add a regression test.
- Acceptance: After creating a group, creating a token and revoking it, the Audit Log UI and CSV both show one row per action with the correct actor, UTC time and target id. No secret or token value appears in the row.
- Status: Open. Test data left in place: group "QA1015R3 group" (cannot be deleted in UI); token revoked.

### ORG-B-018 — Archive actions are logged as "… Updated" with no archived state
- Severity: Medium
- Route: /settings/organization/branches, /departments, /teams, /cost-centers → Archive
- Steps: 1) Archive a branch, a department, a team and a cost centre (each confirmed). 2) Open Audit Log.
- Expected: entries "Branch archived", "Department archived", "Team archived", "Cost centre archived" (or action with status change).
- Actual: Entries read "Branch Updated" (15:34:40), "Department Updated" (15:34:15), "Team Updated" (15:34:04), "Org — CostCenter — Updated" (15:33:41). The archive state is not shown and the CSV export uses the same generic update event.
- Impact: Reviewers cannot tell a deletion-like change from an edit.
- Likely code area: archive mutations reuse the update handler and the audit mapper labels them as updated.
- Fix: Emit a distinct archived event (and restored event) with previous and new status.
- Acceptance: Archive writes an "archived" row; the same action in the CSV has action "*.archived".

### ORG-B-019 — Audit Log footer says "Showing 1–15 of 15" while the org has more entries
- Severity: Low–Medium (misleading count; users may think the log is complete)
- Route: /settings/audit-log
- Steps: 1) Open Audit Log with no filters. 2) Read the footer. 3) Click Next.
- Expected: Total equals the number of matching entries (the CSV has 258 rows for this org), and page 2 shows the next 15.
- Actual: Footer reads "Showing 1–15 of 15" on page 1. Clicking "Next" loads page 2 (starts 15:12:16), so the total is wrong and the page count is not shown.
- Impact: The log looks truncated or incomplete.
- Likely code area: audit list query returns page size as total (count query missing or filtered by the default type).
- Fix: Compute total with the same filter as the list; show "Page 1 of N".
- Acceptance: Footer total equals CSV row count for the same filters (258 at 15:27 UTC); page label matches.

### ORG-B-020 — Audit entries "Settings — Updated" do not say which setting changed
- Severity: Medium (audit usefulness)
- Route: /settings/audit-log (rows from /settings/organization)
- Steps: 1) Save Business Hours (Mon close), then Branding, then Localization. 2) Open Audit Log and open or read the entries.
- Expected: The entry names the section and fields changed (for example "Business hours: mon.close 18:00 → 08:00").
- Actual: 42 "settings.updated" rows in the CSV for this org, all with entity "organization" and no field, old value or new value. The UI shows "Settings — Updated" with the IP only.
- Impact: Reviewers cannot see what changed (for example a changed logo URL or business hours) without guessing.
- Likely code area: organization settings update handler writes a generic audit event with no diff.
- Fix: Write a diff of changed keys (old and new, with secrets redacted) into the audit metadata; show it in the row detail.
- Acceptance: Saving only Mon close produces one entry that names business hours and mon.closing before/after.

### ORG-B-021 — Pressing Enter in a colour hex field submits "Save branding" immediately
- Severity: Medium (accidental save of brand settings; happened during this round and had to be reverted)
- Route: /settings/organization → Branding → Edit → Primary colour hex field
- Steps: 1) Edit Branding. 2) Type "#ff0000" into the primary hex field. 3) Press Enter (no Save click).
- Expected: Enter either does nothing or moves focus; no save without an explicit "Save branding" click.
- Actual: The form submitted at once ("Saving…"). The primary colour #ff0000 was stored and shown in view mode. Only a manual revert restored "Not set".
- Impact: Users can save brand changes by accident, including side effects such as ORG-B-005.
- Likely code area: branding form is a native <form> without preventDefault on Enter for colour inputs, or the colour field submits on keydown.
- Fix: Do not submit on Enter in colour fields; require the explicit Save button; or show a confirm when Enter is used.
- Acceptance: Enter in each branding field does not change the stored value until Save branding is clicked.

### ORG-B-022 — Secondary colour is inconsistent: view shows blank; edit shows a default picker with an empty hex
- Severity: Low–Medium (display and data mismatch; extends ORG-B-005)
- Route: /settings/organization → Branding (view and edit)
- Steps: 1) With Primary colour set to #ff0000 (see ORG-B-021) save. 2) View Branding. 3) Edit Branding and read Secondary colour picker and hex field.
- Expected: Secondary shows "Not set" in view and both picker and hex are empty in edit.
- Actual: View shows SECONDARY COLOR with no value (blank, not "Not set"). Edit shows the Secondary colour picker value "#0b1220" while the hex text field is empty. On Primary, clearing the hex (empty) still leaves the picker at #0b1220.
- Impact: The UI misstates the stored state and an unrelated save can store #0b1220 as a colour.
- Likely code area: colour input component keeps a local default (#0b1220) separate from the controlled value; view formatter treats null as empty for the second field.
- Fix: Bind picker and hex to one controlled value (null → empty picker with placeholder); use "Not set" for null in both views.
- Acceptance: With both colours cleared, view shows "Not set" for both and the edit picker and hex are empty after reload.

## Page: Organization Settings – Mobile and keyboard (/settings/organization)

### ORG-B-023 — At 400% zoom (about 320 px wide) the floating "…" button covers the General "Edit" button
- Severity: Low–Medium (mobile tap target obstructed)
- Route: /settings/organization (narrow viewport)
- Steps: 1) Zoom the page to 400% (about 320 CSS px). 2) Look at the General card header on the first screen.
- Expected: The Edit button is fully visible and tappable above the floating action button.
- Actual: The round dark floating "…" button sits over the right part of the Edit button ("Ed…" visible). The bottom tab bar (My Account, Notifications, Organization Settings, Incoming Transfer, More) is fine.
- Impact: On small phones the Edit action may be hard to tap.
- Likely code area: global floating action (more menu / assistant launcher) without safe-area or bottom offset on settings pages.
- Fix: Give the card header a right padding or move the floating button above the tab bar; check at 320 and 390 px.
- Acceptance: At 320 and 390 CSS px, every card header action is visible and clickable with the floating button present.

## Page: Organization Settings – Org structure: Departments and Teams (/settings/organization/departments, /teams)

### ORG-B-024 — Branch and Department pickers show "No branch" or "Loading options…" for 5–8 s; saving in that window creates an unlinked department
- Severity: Medium (data integrity: department saved with no branch)
- Route: /settings/organization/departments → Add Department → Branch; /settings/organization/teams → Add Team → Department
- Steps: 1) Open Add Department. 2) Click Branch immediately. 3) Pick the first visible option ("No branch") before the list loads, enter name "QA1015R3 Dept", save. 4) Compare with the Branch dropdown after about 8 s (it then lists "No branch" and "QA1015R3 Branch").
- Expected: The picker shows a loading state that cannot be confused with a real choice; "No branch" is not offered until the list has loaded; a required relationship is not saved empty.
- Actual: While "Loading options…" shows, the list already contains "No branch", which can be selected. The department saved with Branch "—". The Team dialog's Department list is empty for about 7–8 s ("Loading options…"), then lists "QA1015 Dept" and "QA1015R3 Dept".
- Impact: Departments can be saved without a branch, and teams can be created against the wrong department if picked early.
- Likely code area: async select (Radix/cmdk) with a static "No branch" item rendered before data; no disabled state while loading.
- Fix: Disable the select until options load; drop the static "No branch" item or show it only after load; keep the chosen value through the list refresh.
- Acceptance: Choosing Branch/Department is impossible while loading; a department created with a branch shows that branch in the list; list latency under 2 s on the test org.

### ORG-B-025 — Team capacity -3 or 2.5: Save does nothing visible (silent browser validation)
- Severity: Medium (silent failure; users see no reason)
- Route: /settings/organization/teams → Add Team → Capacity
- Steps: 1) Add Team. 2) Name "QA1015R3 Team", Code "QR3T", Department "QA1015R3 Dept". 3) Capacity "-3". 4) Save. 5) Repeat with "2.5".
- Expected: Inline message under Capacity (for example "Capacity must be a whole number of 1 or more"), dialog stays with values.
- Actual: No toast, no inline text; the dialog stays open. The Capacity input has min=1 and the browser's own tooltip is the only feedback (not visible in the page). Blank capacity saves.
- Impact: Users think Save is broken.
- Likely code area: <input type="number" min="1"> without the app's own validation message; the form uses native validation.
- Fix: Set noValidate on the form and use the app's schema error on the field (client and server).
- Acceptance: Entering -3 or 2.5 shows an inline error and the server returns 400 for the same values.

## Page: Save feedback across Organization Settings (/settings/organization, /settings/organization/cost-centers, /settings/organization/teams)

### ORG-B-026 — Save feedback: forms close or stay open with no pending state; saved values appear about 8–10 s later
- Severity: Medium (users retry or think the save failed; ties to ORG-B-014)
- Route: /settings/organization → Business Hours → Edit / Save hours; /settings/organization/cost-centers → Add Cost Center; /settings/organization/teams → Add Team
- Steps: 1) Edit Business Hours, set Mon close 08:00, Save hours. 2) Reload at 2 s, 5 s and 8 s. 3) Repeat for Cost Centers "Save" and Teams "Save".
- Expected: A visible saving state until the server answers, then a success toast; the list or view updates when the form closes.
- Actual: Business Hours closes at once with no toast captured; the view still shows the old value at 2 s. The new value appears at about 9 s. Cost centre create shows a spinner for about 7–8 s then "Cost center created". The team dialog stayed open for more than 3 s after a successful create.
- Impact: Users re-submit or leave the page before the write completes.
- Likely code area: optimistic close without a pending state; slow org-hierarchy and org-settings writes.
- Fix: Keep the form open with a disabled Save and "Saving…" until the response; show success toast; update the view from the response.
- Acceptance: Each save shows Saving… until the response, and the view matches the saved value at the moment the form closes.

## Page: Organization Settings – Branding (/settings/organization)

### ORG-B-027 — Organization page showed "Something went wrong" once after a branding save and reload
- Severity: Medium if it reproduces (page-level crash)
- Route: /settings/organization after Save branding (logo "" and colour hex "") + reload
- Steps: 1) Edit Branding, clear Logo, clear both colour hex fields. 2) Save branding. 3) Wait 1.5 s and reload.
- Expected: The page reloads normally.
- Actual (once): The main area showed "Something went wrong — An unexpected error occurred. Please try again or contact support." Reload fixed it. The same kind of save and reload later (three times) did not crash.
- Impact: Intermittent; users lose the view until reload.
- Status: Not reproduced in three later attempts. Needs a repeat with console capture (error boundary stack).
- Likely code area: branding form's success handler or a view formatter reading an empty logo/colour value.
- Acceptance: 10 consecutive clear-and-save cycles complete without the error boundary; if it recurs, the console shows the error and it is filed with the stack.

## Page: Billing & Plan (/settings/billing)

### ORG-B-028 — Plan usage shows raw internal keys; the current plan card still offers "Upgrade"
- Severity: Low
- Route: /settings/billing (Plan tab, read-only review; no upgrade clicked)
- Steps: 1) Open Billing & Plan. 2) Read Plan Usage. 3) Read the Starter card (current plan).
- Expected: Labels such as "HR candidates" and "HR job postings"; the current plan card shows "Current plan" with no Upgrade button.
- Actual: Usage rows read "hrCandidates 0 / 2000" and "hrJobPostings 0 / 25". The Starter card (marked as current, trial) still has an "Upgrade" button.
- Impact: Confusing copy on a billing page.
- Likely code area: plan usage labels map from feature keys without a display-name map; plan card CTA does not compare current plan.
- Fix: Add display labels; disable or relabel the current plan's CTA.
- Acceptance: No camelCase keys in Plan Usage; current plan card has no Upgrade button.

## Page: Notification Preferences (/settings/notifications/my-preferences)

Round 3 notes (no bugs found; see COVERAGE.md): toggle "Play sound" saved and survived reload, then reverted. Quiet hours: start and end saved and reverted to blank. No save confirmation toast is shown for toggles (UX.md).

## Page: Audit Log (/settings/audit-log) — see ORG-B-017..020 above.
