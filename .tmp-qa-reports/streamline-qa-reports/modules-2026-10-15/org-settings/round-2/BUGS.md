# BUGS — Org Settings, Round 2 (2026-10-15)

Target: https://www.streamlineos.in · Owner session: user's own account, org "ADitay CAhala" · Test prefix: QA1015R2
Entry: avatar/account menu → Organization (and sibling settings pages). Round 1 source: ../round-1/BUGS-ORG-ONBOARDING.md
Onboarding findings: ../../onboarding/round-2/BUGS.md

Summary: 9 round-1 org bugs rechecked — all 9 STILL OPEN. 7 new bugs (ORG-B-010..016). Security-relevant: ORG-B-004 (javascript: logo) still stored.

## Round 1 recheck

| Round 1 ID | Title | Round 1 severity | Round 2 result | Evidence (round 2) |
|---|---|---|---|---|
| ORG-B-001 | Whitespace-only organization name saved | High | STILL OPEN | Saved "   " → after reload ORGANIZATION NAME shows "—". Restored to "ADitay CAhala" (verified after reload). |
| ORG-B-002 | Support phone "12" saved as "+9112" | Medium | STILL OPEN | Saved "12" → reload shows SUPPORT PHONE "+9112". Reverted to Not set (verified). |
| ORG-B-003 | Industry edit control lacks saved "Agency"; renders blank | Low–Medium | STILL OPEN | Edit form Industry combobox empty; options are the 15 values Technology…Other, no "Agency". Cancelled, nothing saved. |
| ORG-B-004 | Branding Logo accepts and stores javascript: URL | High | STILL OPEN | Saved "javascript:alert(1)" with no error; edit form re-shows the value. Cleared to Not set (verified). Note: the Webhook URL field correctly rejects the same input (see Webhooks), so the branding validator is the gap. |
| ORG-B-005 | Primary colour pre-filled "#0b1220" and saved as a side effect | Medium | STILL OPEN | Branding Edit pre-fills Primary and Secondary "#0b1220" while view shows Not set. Logo-only save stored PRIMARY COLOR "#0b1220" (verified after reload). Reverted to Not set. |
| ORG-B-006 | Localization Timezone blank in edit; "Asia/Calcutta" not an option | Low | STILL OPEN | Timezone combobox empty; options include only "Asia/Kolkata (IST, UTC+5:30)". Cancelled, nothing saved. |
| ORG-B-007 | Business hours accept closing time before opening | Medium | STILL OPEN | Mon close 08:00 (open 09:00) saved; view "Monday 09:00 – 08:00". Reverted to 18:00 (verified). |
| ORG-B-008 | Permission group create: 201 but ApiContractError; dialog stays; duplicate → 409 | High | STILL OPEN | Created "QA1015R2 group": server 201, console ApiContractError CONTRACT_VIOLATION on /principal-groups (memberCount, roleCount undefined), dialog stays on "Creating…" then stays open with no success toast; list not refreshed until reload. Duplicate name "QA1015 role" correctly rejected with toast "A group named … already exists" (409). |
| ORG-B-009 | No delete for permission group; no custom-role create on Roles tab | Medium | STILL OPEN | Groups row controls are only "Rename group" and "Manage group" (Members / Roles tabs, Close — no delete). Roles tab "More role tools" = Audit, Simulate only. Groups "QA1015 role" and "QA1015R2 group" both remain (see Leftovers). |

## Page: Organization Settings – General (/settings/organization)

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

## Page: Organization Settings – Branding (/settings/organization)

Branding items are covered by ORG-B-004 and ORG-B-005 (recheck table above).
New observation: Login page background URL field present in edit form, not in view; not validated in this round (see COVERAGE.md).

## Page: Roles & Permissions – Groups (/settings/roles)

ORG-B-008 and ORG-B-009 (round 1) are STILL OPEN; see the recheck table. No new bugs on this page in round 2.
Leftover: two permission groups now exist in the org ("QA1015 role" from round 1 and "QA1015R2 group" from this round). Neither can be deleted from the UI.

## Page: Organization Settings – Org structure: Branches (/settings/organization/branches)

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

### Observation (UX) — Business unit and Branch are "required" but only "No business unit"/"No branch" can be chosen
- The Business Unit dropdown on Add Branch lists only "No business unit" (the round-1 BU is archived). The "Select a business unit" required rule is satisfied by choosing "No business unit", so the requirement is effectively optional. Department form likewise lists only "No branch". Clarify in UI (either make it optional with copy, or list active options and block "none" when required).

## Page: Organization Settings – Org structure: Teams (/settings/organization/teams)

### ORG-B-012 — Team capacity accepts a negative number (-3) and saves it
- Severity: Medium
- Route: /settings/organization/teams → Add Team → Capacity
- Steps: 1) Add Team. 2) Name "QA1015R2 Team", Code "QR2T", Capacity "-3", Department "QA1015R2 Dept". 3) Save.
- Expected: Inline "Capacity must be a whole number of 1 or more" (or 0+); no save.
- Actual: Toast "Team created"; Capacity column shows "-3"; edit form pre-fills -3. Cleared to blank (verified "—").
- Impact: Negative capacity corrupts any capacity or load calculation that reads teams.
- Likely code area: team create/update schema (number without min/int) and the numeric input parser.
- Fix: z.number().int().min(0 or 1).optional() on client and server; reject decimals and negatives with inline text.
- Acceptance: -3 and 2.5 rejected inline and by API; blank and positive integers save.

### Observation (UX) — Team requires a Department; Department requires a Branch; no active branch exists
- Teams are "Teams within departments"; a Department needs a branch that is only offered as "No branch" unless a branch is active. Fine once data exists; note for onboarding (ONB) that the setup does not create branches/departments.

## Page: Organization Settings – Org structure: Cost Centers (/settings/organization/cost-centers)

### ORG-B-013 — Duplicate cost-centre code returns 409 with no user-visible message
- Severity: Medium (silent failure)
- Route: /settings/organization/cost-centers → Add Cost Center
- Steps: 1) With cost centre code "QR2C" already present, click Add Cost Center. 2) Code "QR2C", Name "QA1015R2 CC dup". 3) Save. 4) Wait ~20 s.
- Expected: Inline "Code already in use" on the Code field, or an error toast; dialog keeps the values.
- Actual: No duplicate row (correct). Console: 409 on /org-hierarchy/cost-centers. No toast and no inline message; the dialog stays open with the values and the Save button returns to normal.
- Impact: Users think the app is broken and may retry; no clue what is wrong.
- Likely code area: cost-centre mutation error handler (409 not mapped to a field error); probably the same pattern in Branches / Teams / Departments / Locations.
- Fix: Map 409 to an inline Code error ("Code already in use") and show a generic error toast for other failures.
- Acceptance: Duplicate code shows "Code already in use" inline; no console-only failures.

## Cross-cutting: org-hierarchy and access writes (Locations, Cost Centers, Delegations, Archive)

### ORG-B-014 — Intermittent "Network error" on create/archive; first attempt not saved, retries succeed
- Severity: Medium (users see failure; risk of double-submit)
- Routes: /settings/organization/locations (Add Location, Archive), /settings/delegations (Delegate), /settings/organization/cost-centers (Add Cost Center, slow)
- Steps and observed results:
  1) Add Location "QA1015R2 Location" (Office, address with HTML-like text) → toast "Network error contacting api.streamlineos.in (POST /org-hierarchy/locations)". Record NOT created. Retry with a plain address → created after ~8 s.
  2) Delegate QA1015 Member, one permission, 16–17 Oct → "Network error contacting api.streamlineos.in (POST /access/delegations)". Record NOT created (Granted tab empty). Retry → "Delegation created".
  3) Archive Location → "Could not check dependencies … Network error … (GET /org-hierarchy/dependencies/…). Nothing has been changed." Retry → archived.
  4) Cost-centre create and team archive: spinner for 15–25 s before closing (dependency check ~10 s).
- Expected: Either the write completes and the UI confirms, or it fails cleanly with a retry hint; a timeout must not look like a network failure; no silent state mismatch.
- Actual: Long-running requests time out client-side at an unknown threshold and show a generic network error while the server may or may not have finished.
- Impact: Users may retry and create duplicates (the cost-centre code 409 shows the server does enforce uniqueness, but not for every resource).
- Likely code area: API client timeout for /org-hierarchy/* and /access/* writes; dependency-check endpoint latency; no idempotency key on create.
- Fix: Investigate server latency on these endpoints; raise or align client timeout; add idempotency keys on POSTs; show "still saving" after N seconds and reconcile with a list refetch before showing an error.
- Acceptance: 20 consecutive creates/archives on staging complete without a network-error toast, or, if they fail, the list reflects the true server state after a refetch.

## Cross-cutting: lists and timestamps

### ORG-B-015 — Revoked personal access token stays listed until page reload
- Severity: Low
- Route: /settings/api-tokens (Revoke token). Delegations (Revoke delegation) updated correctly in the same session.
- Steps: 1) Create PAT "QA1015R2 PAT". 2) Revoke token → Confirm. 3) Wait 2 s.
- Expected: Row disappears (or shows Revoked) without reload.
- Note: Webhook delete and team/department/location/cost-centre archive refreshed correctly in round 2 (verified after reload; no stale rows observed once the dialog closed).
- Actual: Row still listed after confirm; after page reload it is gone ("No personal access tokens yet"). Delegations show a Revoked status row (correct); PAT list does not.
- Impact: Users may believe a token is still active and try to revoke again; mismatch with the "stops working immediately" copy.
- Likely code area: mutation onSuccess does not invalidate the token list query.
- Fix: Invalidate/refetch the list after revoke, delete, archive.
- Acceptance: After revoke the row is removed or marked Revoked without reload.

### ORG-B-016 — Timestamps shown in UTC, not the org timezone (Asia/Calcutta)
- Severity: Low–Medium (wrong dates for IST users near midnight)
- Routes: /settings/delegations (Revoked today at …), /settings/webhooks (Created dd/mm/yyyy)
- Steps: At about 04:50 IST on Thu 15 Oct 2026 (23:20 UTC on 14 Oct): 1) Revoke a delegation. 2) Create a webhook. 3) Read the times.
- Expected: "Revoked today at 5:0x AM" and "Created 15/10/2026" (org timezone Asia/Calcutta, set in Localization).
- Actual: "Revoked today at 11:34 PM" and "Created 14/10/2026" — UTC values. Org timezone setting is Asia/Calcutta (view shows it).
- Impact: Audit-type timestamps show the previous day for IST users until 05:30 IST.
- Likely code area: relative-time / date formatters not passing the org timezone; server returns UTC ISO and client formats with the browser default (or UTC on server render).
- Fix: Format all org-facing dates with the org timezone (from org localization settings), or label times with the zone.
- Acceptance: With org timezone Asia/Calcutta, a revocation at 23:34 UTC shows the IST date and time.
