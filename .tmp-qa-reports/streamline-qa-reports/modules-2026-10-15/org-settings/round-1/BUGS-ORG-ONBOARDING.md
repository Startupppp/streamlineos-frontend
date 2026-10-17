# BUGS — Org Settings & Onboarding (multi-2026-10-15)

Summary: ORG-B-001 (High) whitespace org name saved; ORG-B-004 (High) javascript: logo URL stored; ORG-B-008 (High) group create contract error/409; ORG-B-002/005/007 (Med); ORG-B-003/006/009 (Low–Med); ONB-B-002 (High) onboarding invitee dropped; ONB-B-001 (Med) invalid phone accepted; ONB-B-003 (Low–Med) transient OTP network error.

Target: https://streamlineos.in (www.streamlineos.in) · QA authorized by owner Aditya Challa · Created-data prefix: QA1015
Account in use: the user's own signed-in account (display name "adityachalla01"); org "ADitay CAhala" (only org in the switcher).

## ORG-B-001 — Organization name accepts whitespace-only value and saves it
- Severity: High (data integrity; org shows as blank everywhere the name is shown)
- Route: /settings/organization → General → Edit → Organization name
- Actor: org Owner (user's account)
- Steps: 1) Open Edit on General. 2) Replace "ADitay CAhala" with three spaces "   ". 3) Click "Save changes".
- Expected: Validation error such as "Name is required" (as the blank value gets) or trimmed value rejected; name not saved.
- Actual: Form closes, toast "Organization settings saved". After reload the ORGANIZATION NAME shows "—" (blank) and the stored value is "   ". The blank value (empty string) is correctly rejected with "Name is required".
- Impact: The org name renders as an empty label in the page header/switcher region for the whole org; the org is effectively unnamed.
- Fix: Trim the name on client and server before the required check; reject whitespace-only names with "Name is required".
- Status: Restored to "ADitay CAhala" (verified after reload). See TEST-DATA.md.
- Note: During the same validation pass, a fill('') + Save attempt was followed by a stored value of "   "; the exact trigger was not isolated. The clean re-test of '' gave "Name is required" and the clean re-test of '   ' reproduced the save.

## ORG-B-002 — Invalid support phone "12" is accepted and saved as "+91 12"
- Severity: Medium
- Route: /settings/organization → General → Edit → Support phone
- Actor: org Owner
- Steps: 1) Edit General. 2) Support phone: type "12" (country +91 selected by default). 3) Leave other fields blank. 4) Save changes.
- Expected: Inline error such as "Enter a valid phone number" and no save.
- Actual: Toast "Organization settings saved". After reload SUPPORT PHONE shows "+9112" (the field then re-renders as "+91 12").
- Impact: Garbage contact data stored on the org record; silent success.
- Fix: Validate phone with libphonenumber (or min length) for the selected country before submit; show inline error.
- Status: Reverted to "Not set" (verified after reload).

## ORG-B-003 — Edit form Industry dropdown does not contain the saved value "Agency"; field renders blank
- Severity: Low–Medium (data-mismatch risk)
- Route: /settings/organization → General → Edit → Industry
- Steps: 1) View shows INDUSTRY = "Agency". 2) Click Edit on General. 3) Inspect Industry select.
- Expected: Select pre-filled with "Agency" (or the option list includes it).
- Actual: Select shows empty (no visible value); the option list has Technology, Finance & Banking, Healthcare, Retail & E-commerce, Manufacturing, Education, Real Estate, Logistics & Supply Chain, Marketing & Advertising, Consulting, Legal, Media & Entertainment, Hospitality & Travel, Non-profit, Other — no "Agency". Element inputValue() reports "Technology" (first option) while nothing is visibly selected.
- Impact: Any save from an admin who opens the form with a dirty field elsewhere could overwrite Industry with the first option; the value cannot be re-selected once changed.
- Note: In this round the Industry value stayed "Agency" across three saves (name, phone), so the save path did not change it in practice.
- Fix: Add the legacy value "Agency" to the option list (or map unknown values to a placeholder "Select industry"), and never submit a fallback value.

## Verified without bug
- Org General Legal name / Website / Support email: saved, persisted after reload, and reverted to Not set.
- Double-click "Build my organization": one org only.
- Invite validation, role change persisted, revoke works.

## ORG-B-004 — Branding Logo URL accepts javascript: scheme and stores it
- Severity: High (security: stored script-capable URL in org branding; rendered as logo/link on org-wide surfaces)
- Route: /settings/organization → Branding → Edit → Logo
- Actor: org Owner
- Steps: 1) Edit Branding. 2) Logo: type "javascript:alert(1)". 3) Click "Save branding".
- Expected: Rejected with "Must be a valid URL" (the same validator correctly rejects "not a url" and shows "Must be a valid URL").
- Actual: Form closes with no error and the value is stored (verified in the edit form after reload: LOGO input value "javascript:alert(1)").
- Impact: Stored javascript: URL on org branding. Any place that renders the logo as a link or uses it in an href could execute script in other users' sessions. Not exploited; value cleared immediately (see TEST-DATA.md).
- Fix: Allow only http(s) (and data:image for uploads) in the logo/favicon/background URL schema, server-side as well as client-side.
- Status: Cleared; Logo shows "Not set" after reload.

## ORG-B-005 — Branding edit form pre-fills Primary color "#0b1220" although no color is set; saving stores it
- Severity: Medium (silent data change)
- Route: /settings/organization → Branding → Edit → Primary color
- Actor: org Owner
- Steps: 1) With PRIMARY COLOR showing "Not set" in view mode, click Edit on Branding. 2) Inspect Primary color text input (and the colour swatch). 3) Change only Logo (or any other field) and Save branding.
- Expected: Primary color input empty when view shows "Not set"; saving other fields does not add a colour.
- Actual: Primary color input is pre-filled with "#0b1220" (the swatch and text both show it). Saving a branding change that only touched Logo caused the view to show PRIMARY COLOR "#0b1220" after reload (was "Not set" before).
- Impact: Org brand colour silently set to a default the admin never chose; this also means "Not set" is not reflected truthfully.
- Fix: Bind the input to the stored value (null → empty); use the placeholder, not a value, for the default colour.
- Status: Cleared to empty; view shows "Not set" after reload.

## ORG-B-006 — Localization edit form shows Timezone blank; saved value "Asia/Calcutta" is not an option
- Severity: Low (display mismatch; data was preserved in this test)
- Route: /settings/organization → Localization → Edit → Timezone
- Steps: 1) View shows TIMEZONE "Asia/Calcutta". 2) Click Edit on Localization. 3) Inspect the Timezone control.
- Expected: Control shows the current timezone (Asia/Calcutta or its alias Asia/Kolkata).
- Actual: Control renders empty; the option list has "Asia/Kolkata (IST, UTC+5:30)" but no "Asia/Calcutta". Changing only Week starts on and saving kept the stored timezone at "Asia/Calcutta" (verified after reload).
- Fix: Map legacy/alias zone IDs to the canonical option, or add the stored zone to the list.

## ORG-B-007 — Business hours accept closing time earlier than opening time
- Severity: Medium
- Route: /settings/organization → Business Hours → Edit → Mon closing time
- Actor: org Owner
- Steps: 1) Edit Business Hours. 2) Set Mon closing time to 08:00 (opening 09:00). 3) Click "Save hours".
- Expected: Validation error ("Closing time must be after opening time") and no save.
- Actual: Form closes; after reload the view shows "Monday 09:00 – 08:00".
- Impact: Invalid working hours used for attendance/late/over-time calculations.
- Fix: Validate open < close per day (and handle overnight shifts explicitly) client- and server-side.
- Status: Reverted to 18:00 (verified after reload).

## ORG-B-008 — Create permission group: server returns 201 but UI shows ApiContractError, dialog stays open; retry gives 409
- Severity: High (user-visible error on success; double-submit risk; duplicate-name trap)
- Route: /settings/roles → Groups → New group
- Actor: org Owner
- Steps: 1) Open Groups tab → New group. 2) Name "QA1015 role" → Create group. 3) Observe dialog. 4) Click Create group again.
- Expected: Group created once, dialog closes, group listed.
- Actual: Dialog stays open with the typed name. Console: ApiContractError "The server sent data this screen does not understand…" CONTRACT_VIOLATION on /principal-groups with status 201, issues memberCount and roleCount "expected number, received undefined". The second click returns HTTP 409 (name already exists). After a page reload the group "QA1015 role" (Custom, 0 members, 0 roles) is listed.
- Impact: Users get an error for a successful create, retry is blocked by 409, and the list stays stale until reload.
- Fix: Return memberCount and roleCount (0) from POST /principal-groups; close dialog and refresh list on 201; treat duplicate-click as idempotent.

## ORG-B-009 — No delete control for a permission group (custom role); custom role creation not found on Roles tab
- Severity: Medium (cannot clean up / no way to remove a custom group from the UI)
- Route: /settings/roles → Roles and Groups tabs
- Steps: 1) Roles tab: check "More role tools" (…) — only Audit and Simulate. No "New role" / "Create role" control. 2) Groups tab → row "QA1015 role" → buttons: "Rename group" (pencil) and "Manage group" (members/roles panels). Rename dialog: Cancel / Save / Close. Manage panel: Members / Roles tabs / Close. No Delete.
- Expected: Custom roles can be created on the Roles tab and deleted (or groups can be deleted) from the UI.
- Actual: Custom role creation is not offered on the Roles tab; the only creation path is "New group" (Permission group). No delete action exists for the group created in this round.
- Status: Group "QA1015 role" LEFT IN PLACE (not deleted) because no delete control exists in the UI. Needs admin cleanup. Recorded in TEST-DATA.md.

## ONB-B-001 — Onboarding Workspace step accepts invalid contact phone "12" and advances
- Severity: Medium
- Route: /org-setup → step 1 Workspace → "Show advanced options" → Contact phone
- Actor: new org owner (qa1015onb@sharklasers.com)
- Steps: 1) Fill Workspace name, Team size "1–10 employees", Industry "Agency". 2) Show advanced options. 3) Contact phone: "12". 4) Continue.
- Expected: inline error (e.g., "Enter a valid phone number") and stay on step 1.
- Actual: Continue moves to step 2 Modules with no error. Back to step 1 shows Contact phone still "12".
- Impact: Invalid phone stored on the new org unless the user notices; same validator gap as ORG-B-002 in org settings.
- Status: Cleared before finishing setup, so the test org has no phone.

## ONB-B-002 — Invitee added in onboarding People step is silently dropped
- Severity: High (data loss; invites never sent)
- Route: /org-setup → step 3 People → "Add invitee" → "Build my organization"
- Actor: new org owner (qa1015onb@sharklasers.com)
- Steps: 1) Modules: pick HR and Timesheets. 2) People: enter qa1015onbinv@sharklasers.com, role Member, click "Add invitee" (listed). 3) Back to Modules, Continue to People (invitee still listed). 4) Click "Build my organization". 5) On dashboard open Members & Access → Invitations.
- Expected: Invitation for qa1015onbinv@sharklasers.com appears as Pending (Member), as the copy says "Invite teammates now".
- Actual: Dashboard loads, org "QA1015 Onboarding Co" created (single org, see double-click test). Invitations tab shows "No invitations yet / Invite your first team member to get started." Reloaded, still none.
- Impact: Teammates invited during onboarding never receive an invite; admin must re-invite manually.
- Fix: Persist invitees in the same transaction as org creation (or call the invite endpoint after create) and surface failures.

## ONB-B-003 — Sign-in code verification: auto-submit showed "Network error contacting api.streamlineos.in (POST /auth/email-otp/verify)" once; manual "Verify code" then succeeded
- Severity: Low–Medium (intermittent; needs repro)
- Route: /signin → Verification code (new email qa1015onb@sharklasers.com)
- Steps: 1) Enter 6-digit code (typed; field auto-submits when full). 2) Observe "Verifying…" then red text "Network error contacting api.streamlineos.in (POST /auth/email-otp/verify). Check your connection and try again." 3) Click "Verify code". 4) Verified and redirected to /org-setup.
- Expected: No transient error for a valid code; if it occurs, auto-submit should retry or the code should not be reported as invalid.
- Actual: Error shown after auto-submit; second submit succeeded. Network was not down (later calls succeeded).
- Note: Code value not recorded here. Repro uncertain.
