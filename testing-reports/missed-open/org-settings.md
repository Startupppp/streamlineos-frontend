# org-settings — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## ORG-B-001 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-001 | Whitespace-only org name saved (High) | **STILL OPEN** | "   " saved; after reload ORGANIZATION NAME shows "—". Restored to "ADitay CAhala" and verified after reload. |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

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

## ORG-B-002 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-002 | Support phone "12" saved as "+9112" (Medium) | **STILL OPEN** | Saved "12"; view shows "+9112"; edit input "+91 12". Reverted to Not set (verified). |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

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

## ORG-B-003 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-003 | Industry edit control blank; "Agency" not in list (Low–Med) | **STILL OPEN** | Edit combobox "Industry" has empty text while view shows "Agency". Cancelled, nothing saved. (Option list not re-read this round.) |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

## ORG-B-003 — Edit form Industry dropdown does not contain the saved value "Agency"; field renders blank
- Severity: Low–Medium (data-mismatch risk)
- Route: /settings/organization → General → Edit → Industry
- Steps: 1) View shows INDUSTRY = "Agency". 2) Click Edit on General. 3) Inspect Industry select.
- Expected: Select pre-filled with "Agency" (or the option list includes it).
- Actual: Select shows empty (no visible value); the option list has Technology, Finance & Banking, Healthcare, Retail & E-commerce, Manufacturing, Education, Real Estate, Logistics & Supply Chain, Marketing & Advertising, Consulting, Legal, Media & Entertainment, Hospitality & Travel, Non-profit, Other — no "Agency". Element inputValue() reports "Technology" (first option) while nothing is visibly selected.
- Impact: Any save from an admin who opens the form with a dirty field elsewhere could overwrite Industry with the first option; the value cannot be re-selected once changed.
- Note: In this round the Industry value stayed "Agency" across three saves (name, phone), so the save path did not change it in practice.
- Fix: Add the legacy value "Agency" to the option list (or map unknown values to a placeholder "Select industry"), and never submit a fallback value.

## ORG-B-004 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-004 | Branding Logo accepts javascript: URL (High) | **STILL OPEN** | "javascript:alert(1)" saved with no error; edit input re-shows it. Cleared; view "Not set" (verified). Note: while the value was stored, the view row for LOGO was blank (no text), so the stored value was not visible in view mode. |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

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

## ORG-B-005 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-005 | Primary colour pre-filled #0b1220 and saved as a side effect (Medium) | **STILL OPEN** | Branding edit pre-fills Primary and Secondary pickers with #0b1220 while view shows "Not set". Clearing the hex field still leaves the picker showing #0b1220 (see ORG-B-022). Reverted to Not set (verified). |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

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

## ORG-B-006 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-006 | Localization timezone blank in edit (Low) | **STILL OPEN** | Timezone combobox empty in edit; view "Asia/Calcutta". Cancelled. |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

## ORG-B-006 — Localization edit form shows Timezone blank; saved value "Asia/Calcutta" is not an option
- Severity: Low (display mismatch; data was preserved in this test)
- Route: /settings/organization → Localization → Edit → Timezone
- Steps: 1) View shows TIMEZONE "Asia/Calcutta". 2) Click Edit on Localization. 3) Inspect the Timezone control.
- Expected: Control shows the current timezone (Asia/Calcutta or its alias Asia/Kolkata).
- Actual: Control renders empty; the option list has "Asia/Kolkata (IST, UTC+5:30)" but no "Asia/Calcutta". Changing only Week starts on and saving kept the stored timezone at "Asia/Calcutta" (verified after reload).
- Fix: Map legacy/alias zone IDs to the canonical option, or add the stored zone to the list.

## ORG-B-007 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-007 | Business hours accept close before open (Medium) | **STILL OPEN** | Mon close 08:00 with open 09:00 saved; view "Monday 09:00 – 08:00" (about 9 s after save). Reverted to 18:00 (verified). |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

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

## ORG-B-008 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-008 | Permission group create: 201 but ApiContractError; dialog stays open; retry 409 (High) | **STILL OPEN** | Created "QA1015R3 group" once. Console ApiContractError CONTRACT_VIOLATION on /principal-groups (status 201; memberCount and roleCount undefined). Toast now reads "The server sent data this screen does not understand. Refresh to try again…". Dialog stayed open with "Creating…" then open with no success toast. Second Create click showed no toast within 3 s; after reload only one group exists (no duplicate). |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

## ORG-B-008 — Create permission group: server returns 201 but UI shows ApiContractError, dialog stays open; retry gives 409
- Severity: High (user-visible error on success; double-submit risk; duplicate-name trap)
- Route: /settings/roles → Groups → New group
- Actor: org Owner
- Steps: 1) Open Groups tab → New group. 2) Name "QA1015 role" → Create group. 3) Observe dialog. 4) Click Create group again.
- Expected: Group created once, dialog closes, group listed.
- Actual: Dialog stays open with the typed name. Console: ApiContractError "The server sent data this screen does not understand…" CONTRACT_VIOLATION on /principal-groups with status 201, issues memberCount and roleCount "expected number, received undefined". The second click returns HTTP 409 (name already exists). After a page reload the group "QA1015 role" (Custom, 0 members, 0 roles) is listed.
- Impact: Users get an error for a successful create, retry is blocked by 409, and the list stays stale until reload.
- Fix: Return memberCount and roleCount (0) from POST /principal-groups; close dialog and refresh list on 201; treat duplicate-click as idempotent.

## ORG-B-010 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-010 | Legal name / Registration number have no maxlength; raw "Too big" text (Low–Med) | **STILL OPEN** | 270-char Legal name and 120-char Registration number typed (no maxlength attribute). Save shows "Too big: expected string to have <=200 characters" and "<=100 characters". Cancelled; nothing saved. |

Write-up from `streamline-qa-reports/modules-2026-10-15/org-settings/round-2/BUGS.md`:

### ORG-B-010 — Legal name and Registration number have no maxlength; over-limit value fails with raw validator text
- Severity: Low–Medium (UX; limits undiscoverable)
- Route: /settings/organization → General → Edit → Legal name (server cap 200), Registration number (server cap 100)
- Steps: 1) Edit General. 2) Type 270 characters in Legal name (or Registration number). 3) Click Save changes.
- Expected: The input stops at the limit (maxlength) or shows a friendly inline message such as "Legal name must be 200 characters or fewer" before submit.
- Actual: The input accepts 270 characters (no maxLength). On save a red line appears under the field: "Too big: expected string to have <=200 characters" (Registration number: "<=100 characters"). Nothing is saved (verified). Legal name <script>…</script> value of normal length is stored and rendered as literal text (no script execution; pass).
- Impact: Users are not told the limit, and the message is an internal validator string.
- Likely code area: org General form (zod .max() on the schema) vs. the shared text input (no maxLength); the form error mapper passes raw issue text through.
- Fix: Add maxLength to the inputs (200 / 100) or a character counter; map zod issue codes to user copy ("Must be 200 characters or fewer").
- Acceptance: No "Too big:" text anywhere; a 200-character legal name saves; a 201-character value is blocked or shows the friendly message.

Support phone "12" is ORG-B-002 (still open, recheck table). Its branch equivalent is ORG-B-011 below.

## ORG-B-011 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

| ID | Round 1/2 summary | Round 3 status | Round 3 evidence |
| ORG-B-011 | Branch phone "12" saved as "+9112" (Medium) | **STILL OPEN** | Created QA1015R3 Branch with phone 12; list Phone column "+9112". Branch archived after test. |

Write-up from `streamline-qa-reports/modules-2026-10-15/org-settings/round-2/BUGS.md`:

### ORG-B-011 — Branch phone "12" accepted and saved as "+9112"
- Severity: Medium (same validator gap as ORG-B-002, in another form)
- Route: /settings/organization/branches → Add Branch → Phone
- Steps: 1) Add Branch. 2) Name "QA1015R2 Branch", Code "QR2BR", Business unit "No business unit", Email qa1015r2@sharklasers.com. 3) Phone "12". 4) Save.
- Expected: Inline "Enter a valid phone number"; no save.
- Actual: Toast "Branch created". List Phone column shows "+9112". Edit form re-fills "+91 12". (Invalid email in the same form is correctly blocked with "Invalid email".)
- Impact: Invalid contact data on branch records; silent success.
- Likely code area: shared phone input / branch zod schema — phone is not validated beyond trimming.
- Fix: Validate phone with libphonenumber for the selected country on client and server; return 400 with field error.
- Acceptance: "12" blocked inline and by API; "+91 98xxxxxxx" saves.

## ORG-B-021 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`:

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

## ORG-B-025 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/org-settings/round-3/BUGS.md`:

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
