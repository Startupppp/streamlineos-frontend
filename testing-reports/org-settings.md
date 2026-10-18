# Organization settings — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining organization-settings work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### ORG-B-009 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

No delete control for a permission group (custom role); custom role creation not found on Roles tab

Delete button exists in `features/settings/roles/groups/groups-panel.tsx` for `kind === "CUSTOM"` groups, using `useDeleteGroup` hook → `DELETE /principal-groups/:groupId` (backend commit e53c85995). Delete triggers `ConfirmDialog destructive` before calling the mutation. Custom role creation is a separate gap — see RBAC-B-007.

- Severity: Medium (cannot clean up / no way to remove a custom group from the UI)
- Route: /settings/roles → Roles and Groups tabs
- Steps: 1) Roles tab: check "More role tools" (…) — only Audit and Simulate. No "New role" / "Create role" control. 2) Groups tab → row "QA1015 role" → buttons: "Rename group" (pencil) and "Manage group" (members/roles panels). Rename dialog: Cancel / Save / Close. Manage panel: Members / Roles tabs / Close. No Delete.
- Expected: Custom roles can be created on the Roles tab and deleted (or groups can be deleted) from the UI.
- Actual: Custom role creation is not offered on the Roles tab; the only creation path is "New group" (Permission group). No delete action exists for the group created in this round.
- Status: Group "QA1015 role" LEFT IN PLACE (not deleted) because no delete control exists in the UI. Needs admin cleanup. Recorded in TEST-DATA.md.

### ORG-B-012 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Team capacity accepts a negative number (-3) and saves it

Frontend: `team-form-schema.ts` uses string refine rejecting non-integer and out-of-range values; form has `noValidate` + `zodResolver` + `<FormMessage />`. Backend: `createOrgTeamSchema` has `z.number().int().min(1).max(9999)`. Both layers validated.

- Severity: Medium
- Route: /settings/organization/teams → Add Team → Capacity
- Steps: 1) Add Team. 2) Name "QA1015R2 Team", Code "QR2T", Capacity "-3", Department "QA1015R2 Dept". 3) Save.
- Expected: Inline "Capacity must be a whole number of 1 or more" (or 0+); no save.
- Actual: Toast "Team created"; Capacity column shows "-3"; edit form pre-fills -3. Cleared to blank (verified "—").
- Impact: Negative capacity corrupts any capacity or load calculation that reads teams.
- Likely code area: team create/update schema (number without min/int) and the numeric input parser.
- Fix: z.number().int().min(0 or 1).optional() on client and server; reject decimals and negatives with inline text.
- Acceptance: -3 and 2.5 rejected inline and by API; blank and positive integers save.

### ORG-B-013 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Duplicate cost-centre code returns 409 with no user-visible message

`cost-centers-page.tsx` `handleFormSubmit` calls `getValidationFieldErrors(error)` on 409 and sets inline field errors for `code` and `name` fields. Backend throws `ConflictException` with `code: "VALIDATION_FAILED"` and `details: [{ path: "code", message: "..." }]`.

- Severity: Medium (silent failure)
- Route: /settings/organization/cost-centers → Add Cost Center
- Steps: 1) With cost centre code "QR2C" already present, click Add Cost Center. 2) Code "QR2C", Name "QA1015R2 CC dup". 3) Save. 4) Wait ~20 s.
- Expected: Inline "Code already in use" on the Code field, or an error toast; dialog keeps the values.
- Actual: No duplicate row (correct). Console: 409 on /org-hierarchy/cost-centers. No toast and no inline message; the dialog stays open with the values and the Save button returns to normal.
- Impact: Users think the app is broken and may retry; no clue what is wrong.
- Likely code area: cost-centre mutation error handler (409 not mapped to a field error); probably the same pattern in Branches / Teams / Departments / Locations.
- Fix: Map 409 to an inline Code error ("Code already in use") and show a generic error toast for other failures.
- Acceptance: Duplicate code shows "Code already in use" inline; no console-only failures.

### ORG-B-014 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Evidence: a slow write now ends as "Request timed out" (`TIMEOUT`), never a network error (`frontend/lib/api-client.ts:425-431`, mutation timeout 15 s at `:22`); every mutation carries an auto `Idempotency-Key` so a retry cannot duplicate (`api-client.ts:355`); hierarchy and settings writes settle on the server response instead of the list refetch (59c756568, pinned in `hooks/api/organization.test.tsx`); the dependency check drops its per-call catalog query (backend 1ceb0a2b1). The remaining "Network error" is a fetch that never reached the API (first seen only with HTML-like address text), which the client cannot tell apart from a dropped connection.

Intermittent "Network error" on create/archive; first attempt not saved, retries succeed

Latest report note: Intermittent "Network error" on create/archive; first attempt not saved (Medium): **NOT REPRODUCED as a network error; latency still present** | Create branch, department, team, cost centre and four archives all succeeded on the first attempt with no network-error toast. Saves still took about 8–10 s (see ORG-B-027).

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

### ORG-B-015 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Revoked personal access token stays listed until page reload

`useRevokeUserApiToken.onSuccess` calls `setQueriesData` to drop the token from every cached page immediately, then `invalidateQueries` for background sync. Test `user-api-tokens-pagination.test.tsx` confirms the behaviour.

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

### ORG-B-016 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Timestamps shown in UTC, not the org timezone (Asia/Calcutta)

Audit log columns use `formatDateTimeInOrgTz(createdAt, orgTz)` where `orgTz` comes from `useOrgTimeZone()` → `/me/org-display`. `lib/date-utils.ts:250` resolves to org timezone or browser timezone as fallback.

- Severity: Low–Medium (wrong dates for IST users near midnight)
- Routes: /settings/delegations (Revoked today at …), /settings/webhooks (Created dd/mm/yyyy)
- Steps: At about 04:50 IST on Thu 15 Oct 2026 (23:20 UTC on 14 Oct): 1) Revoke a delegation. 2) Create a webhook. 3) Read the times.
- Expected: "Revoked today at 5:0x AM" and "Created 15/10/2026" (org timezone Asia/Calcutta, set in Localization).
- Actual: "Revoked today at 11:34 PM" and "Created 14/10/2026" — UTC values. Org timezone setting is Asia/Calcutta (view shows it).
- Impact: Audit-type timestamps show the previous day for IST users until 05:30 IST.
- Likely code area: relative-time / date formatters not passing the org timezone; server returns UTC ISO and client formats with the browser default (or UTC on server render).
- Fix: Format all org-facing dates with the org timezone (from org localization settings), or label times with the zone.
- Acceptance: With org timezone Asia/Calcutta, a revocation at 23:34 UTC shows the IST date and time.

### ORG-B-017 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Permission group create and personal access token create/revoke are not written to the audit log

Evidence: `principal-groups.service.ts` passes `audit: { action: "principal_group.created", userId, targetId, targetType, metadata }` through `commitAccessChange` on every create, rename and delete (and member_added, member_removed, role_assigned, role_unassigned). `commitAccessChange` calls `writeAudit(tx, orgId, opts.audit)` which inserts into `auditLogs` within the same transaction. `api-tokens.service.ts` calls `this.audit.log({ action: "api_key.created", … })` and `this.audit.log({ action: "api_key.revoked", … })` after each operation. Full audit specs: `principal-groups-access-commit.spec.ts` covers all 7 audit actions for principal groups (created, renamed, deleted, member_added, member_removed, role_assigned, role_unassigned). `api-key-writer-commit.spec.ts` covers api_key.created and api_key.revoked. The implementation and specs are complete.

- Severity: High (audit integrity: credential issuance/revocation and access-group creation leave no trace)
- Route: /settings/roles → Groups → New group; /settings/api-tokens → New Token / Revoke token; /settings/audit-log
- Actor: org Owner
- Steps: 1) Note the latest audit entry. 2) Create permission group "QA1015R3 group" (ORG-B-008 flow). 3) Create PAT "QA1015R3 PAT" with accounting:access:view, then Revoke it and Confirm. 4) Open Audit Log (reload) and export CSV.
- Expected: audit rows for "group created", "token created" and "token revoked" with actor, time and target.
- Actual: Audit log (UI and CSV export of 258 rows, exported 15:27 UTC) has no row for the group create (group created about 15:18:38 UTC; rows at 15:17:38 "Settings — Updated" and 15:19:37 "Branch Created" bracket it), and no token rows at all. A text search of the CSV for "token", "pat" and "group" returns only role-change rows. Later UI reload (15:35 UTC) still shows nothing between 15:24:15 and the archives at 15:33–15:34.
- Impact: Admins cannot see who created or revoked API credentials or permission groups. This matters for incident review and compliance.
- Acceptance: After creating a group, creating a token and revoking it, the Audit Log UI and CSV both show one row per action with the correct actor, UTC time and target id. No secret or token value appears in the row.
- Status: Open. Test data left in place: group "QA1015R3 group" (cannot be deleted in UI); token revoked.

### ORG-B-018 — FIXED (c8e3c15a8), PENDING_BROWSER_VERIFICATION

Archive actions are logged as "… Updated" with no archived state

- Severity: Medium
- Route: /settings/organization/branches, /departments, /teams, /cost-centers → Archive
- Steps: 1) Archive a branch, a department, a team and a cost centre (each confirmed). 2) Open Audit Log.
- Expected: entries "Branch archived", "Department archived", "Team archived", "Cost centre archived" (or action with status change).
- Actual: Entries read "Branch Updated" (15:34:40), "Department Updated" (15:34:15), "Team Updated" (15:34:04), "Org — CostCenter — Updated" (15:33:41). The archive state is not shown and the CSV export uses the same generic update event.
- Impact: Reviewers cannot tell a deletion-like change from an edit.
- Likely code area: archive mutations reuse the update handler and the audit mapper labels them as updated.
- Fix: Emit a distinct archived event (and restored event) with previous and new status.
- Acceptance: Archive writes an "archived" row; the same action in the CSV has action "*.archived".

### ORG-B-019 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Audit Log footer says "Showing 1–15 of 15" while the org has more entries

Audit log uses `DataTable` with `mode: "cursor"`. `CursorFooter` shows `{rowCount}` results on the current page (e.g., "15 results shown") and prev/next navigation — no false total. `data-table-footer.tsx` renders `TablePagination mode="cursor"` which omits the "of N" count for keyset pagination.

- Severity: Low–Medium (misleading count; users may think the log is complete)
- Route: /settings/audit-log
- Steps: 1) Open Audit Log with no filters. 2) Read the footer. 3) Click Next.
- Expected: Total equals the number of matching entries (the CSV has 258 rows for this org), and page 2 shows the next 15.
- Actual: Footer reads "Showing 1–15 of 15" on page 1. Clicking "Next" loads page 2 (starts 15:12:16), so the total is wrong and the page count is not shown.
- Impact: The log looks truncated or incomplete.
- Likely code area: audit list query returns page size as total (count query missing or filtered by the default type).
- Fix: Compute total with the same filter as the list; show "Page 1 of N".
- Acceptance: Footer total equals CSV row count for the same filters (258 at 15:27 UTC); page label matches.

### ORG-B-020 — FIXED (2ff519416), PENDING_BROWSER_VERIFICATION

Audit entries "Settings — Updated" do not say which setting changed

- Severity: Medium (audit usefulness)
- Route: /settings/audit-log (rows from /settings/organization)
- Steps: 1) Save Business Hours (Mon close), then Branding, then Localization. 2) Open Audit Log and open or read the entries.
- Expected: The entry names the section and fields changed (for example "Business hours: mon.close 18:00 → 08:00").
- Actual: 42 "settings.updated" rows in the CSV for this org, all with entity "organization" and no field, old value or new value. The UI shows "Settings — Updated" with the IP only.
- Impact: Reviewers cannot see what changed (for example a changed logo URL or business hours) without guessing.
- Likely code area: organization settings update handler writes a generic audit event with no diff.
- Fix: Write a diff of changed keys (old and new, with secrets redacted) into the audit metadata; show it in the row detail.
- Acceptance: Saving only Mon close produces one entry that names business hours and mon.closing before/after.

### ORG-B-022 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Secondary colour is inconsistent: view shows blank; edit shows a default picker with an empty hex

- Severity: Low–Medium (display and data mismatch; extends ORG-B-005)
- Route: /settings/organization → Branding (view and edit)
- Steps: 1) With Primary colour set to #ff0000 (see ORG-B-021) save. 2) View Branding. 3) Edit Branding and read Secondary colour picker and hex field.
- Expected: Secondary shows "Not set" in view and both picker and hex are empty in edit.
- Actual: View shows SECONDARY COLOR with no value (blank, not "Not set"). Edit shows the Secondary colour picker value "#0b1220" while the hex text field is empty. On Primary, clearing the hex (empty) still leaves the picker at #0b1220.
- Impact: The UI misstates the stored state and an unrelated save can store #0b1220 as a colour.
- Likely code area: colour input component keeps a local default (#0b1220) separate from the controlled value; view formatter treats null as empty for the second field.
- Fix: Bind picker and hex to one controlled value (null → empty picker with placeholder); use "Not set" for null in both views.
- Acceptance: With both colours cleared, view shows "Not set" for both and the edit picker and hex are empty after reload.

Evidence: `org-branding-fields.tsx` `BrandingColor` renders `{color || <span>Not set</span>}` in view. `ColorField` uses `opacity-0` on the color `<input>` when `!isSet` and shows a dashed-border placeholder instead; text input shows empty value.

### ORG-B-023 — FIXED (891739cef), PENDING_BROWSER_VERIFICATION

The round dark "…" button is the mobile quick-actions FAB (`components/layout/mobile/mobile-shell-fab.tsx:118-126`), not the companion. 891739cef reserves the FAB lane on module-bottom-nav routes such as /settings/organization and docks the minimised companion beside it (`companion-launcher.tsx:334`, `:373-377`), with tests. 516b83ea0 only starts the companion minimised on phones.

At 400% zoom (about 320 px wide) the floating "…" button covers the General "Edit" button

Evidence: The floating companion button is the global assistant launcher managed by lane MP. MP is fixing the companion positioning globally; this overlap is a symptom of the same component. Pointer to MP lane: if the global companion fix does not resolve the overlap on /settings/organization at 320 px, re-open this item and add a `pb-safe` or right-margin to the card header. No code change made in ORG lane.

- Severity: Low–Medium (mobile tap target obstructed)
- Route: /settings/organization (narrow viewport)
- Steps: 1) Zoom the page to 400% (about 320 CSS px). 2) Look at the General card header on the first screen.
- Expected: The Edit button is fully visible and tappable above the floating action button.
- Actual: The round dark floating "…" button sits over the right part of the Edit button ("Ed…" visible). The bottom tab bar (My Account, Notifications, Organization Settings, Incoming Transfer, More) is fine.
- Impact: On small phones the Edit action may be hard to tap.
- Likely code area: global floating action (more menu / assistant launcher) without safe-area or bottom offset on settings pages.
- Fix: Give the card header a right padding or move the floating button above the tab bar; check at 320 and 390 px.
- Acceptance: At 320 and 390 CSS px, every card header action is visible and clickable with the floating button present.

### ORG-B-024 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Branch and Department pickers show "No branch" or "Loading options…" for 5–8 s; saving in that window creates an unlinked department

Evidence: `hierarchy-parent-selector.tsx` guards `optionalLabel` with `{optionalLabel && !optionsQuery.isLoading ? ... : null}`. `useHierarchyParentOptions` is `enabled: canView && enabled` where `enabled = open` (open only when popover is open). `isLoading` is true until first data arrives.

- Severity: Medium (data integrity: department saved with no branch)
- Route: /settings/organization/departments → Add Department → Branch; /settings/organization/teams → Add Team → Department
- Steps: 1) Open Add Department. 2) Click Branch immediately. 3) Pick the first visible option ("No branch") before the list loads, enter name "QA1015R3 Dept", save. 4) Compare with the Branch dropdown after about 8 s (it then lists "No branch" and "QA1015R3 Branch").
- Expected: The picker shows a loading state that cannot be confused with a real choice; "No branch" is not offered until the list has loaded; a required relationship is not saved empty.
- Actual: While "Loading options…" shows, the list already contains "No branch", which can be selected. The department saved with Branch "—". The Team dialog's Department list is empty for about 7–8 s ("Loading options…"), then lists "QA1015 Dept" and "QA1015R3 Dept".
- Impact: Departments can be saved without a branch, and teams can be created against the wrong department if picked early.
- Likely code area: async select (Radix/cmdk) with a static "No branch" item rendered before data; no disabled state while loading.
- Fix: Disable the select until options load; drop the static "No branch" item or show it only after load; keep the chosen value through the list refresh.
- Acceptance: Choosing Branch/Department is impossible while loading; a department created with a branch shows that branch in the list; list latency under 2 s on the test org.

### ORG-B-026 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Save feedback: forms close or stay open with no pending state; saved values appear about 8–10 s later

Evidence: `use-organization-settings-form.ts` `save()` keeps `isEditing = true` while mutation is `isPending`; calls `setIsEditing(false)` only in `onSuccess`. Business Hours form uses `<LoadingButton isPending={isSaving} loadingText="Saving…">`. Form closes only after server responds.

- Severity: Medium (users retry or think the save failed; ties to ORG-B-014)
- Route: /settings/organization → Business Hours → Edit / Save hours; /settings/organization/cost-centers → Add Cost Center; /settings/organization/teams → Add Team
- Steps: 1) Edit Business Hours, set Mon close 08:00, Save hours. 2) Reload at 2 s, 5 s and 8 s. 3) Repeat for Cost Centers "Save" and Teams "Save".
- Expected: A visible saving state until the server answers, then a success toast; the list or view updates when the form closes.
- Actual: Business Hours closes at once with no toast captured; the view still shows the old value at 2 s. The new value appears at about 9 s. Cost centre create shows a spinner for about 7–8 s then "Cost center created". The team dialog stayed open for more than 3 s after a successful create.
- Impact: Users re-submit or leave the page before the write completes.
- Likely code area: optimistic close without a pending state; slow org-hierarchy and org-settings writes.
- Fix: Keep the form open with a disabled Save and "Saving…" until the response; show success toast; update the view from the response.
- Acceptance: Each save shows Saving… until the response, and the view matches the saved value at the moment the form closes.

### ORG-B-027 — VERIFIED IN CODE (org-branding-fields.tsx:23, :41), PENDING_BROWSER_VERIFICATION

No render path reads an empty logo or colour unguarded (`BrandingImage` returns "Not set" for an empty logo, `BrandingColor` for an empty colour); the dependency-check latency is fixed in backend 1ceb0a2b1.

Organization page showed "Something went wrong" once after a branding save and reload

Evidence: `org-branding-fields.tsx` `BrandingColor` renders `{color || <span>Not set</span>}` in view (safe for null). `ColorField` uses `opacity-0` on `<input>` when `!isSet` and shows a dashed placeholder; text input shows empty string. No unguarded read of an empty logo/colour value. Not reproduced in four later attempts. Likely a transient server error or cache-read race during a cold Neon start.

Performance fix: `OrgHierarchyDependenciesService` previously ran a `to_regclass('public.legal_entities') IS NOT NULL` catalog query on every `listDependencies` call (every archive and every dependency preview), adding a sequential DB round trip before the UNION ALL count query. The schema existence result never changes at runtime, so it is now cached in memory as a private `legalEntitiesAvailable: boolean | undefined` field — `hasLegalEntities()` fetches once and returns the cached result thereafter. Spec added: `org-hierarchy-dependencies.service.spec.ts` includes a case that verifies only 4 execute calls for 3 archive operations (1 schema check + 3 UNION ALL queries).

- Severity: Medium if it reproduces (page-level crash)
- Route: /settings/organization after Save branding (logo "" and colour hex "") + reload
- Steps: 1) Edit Branding, clear Logo, clear both colour hex fields. 2) Save branding. 3) Wait 1.5 s and reload.
- Expected: The page reloads normally.
- Actual (once): The main area showed "Something went wrong — An unexpected error occurred. Please try again or contact support." Reload fixed it. The same kind of save and reload later (three times) did not crash.
- Impact: Intermittent; users lose the view until reload.
- Acceptance: 10 consecutive clear-and-save cycles complete without the error boundary; if it recurs, the console shows the error and it is filed with the stack.

### ORG-B-028 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Plan usage shows raw internal keys; the current plan card still offers "Upgrade"

Evidence: `plan-usage-meters.tsx` `LIMIT_LABELS` map has `hrCandidates: "HR Candidates"` and `hrJobPostings: "HR Job Postings"`. `plan-card.tsx` `isLocked = isCurrentPlan && !isTrialPlan`; trial current plan shows "Subscribe" (not "Upgrade") and is not disabled.

- Severity: Low
- Route: /settings/billing (Plan tab, read-only review; no upgrade clicked)
- Steps: 1) Open Billing & Plan. 2) Read Plan Usage. 3) Read the Starter card (current plan).
- Expected: Labels such as "HR candidates" and "HR job postings"; the current plan card shows "Current plan" with no Upgrade button.
- Actual: Usage rows read "hrCandidates 0 / 2000" and "hrJobPostings 0 / 25". The Starter card (marked as current, trial) still has an "Upgrade" button.
- Impact: Confusing copy on a billing page.
- Likely code area: plan usage labels map from feature keys without a display-name map; plan card CTA does not compare current plan.
- Fix: Add display labels; disable or relabel the current plan's CTA.
- Acceptance: No camelCase keys in Plan Usage; current plan card has no Upgrade button.

## UX notes that are not done

### Must change
1. **No Send-test control for webhooks — FIXED (2d5b49d + e5a83b5), PENDING_BROWSER_VERIFICATION.** Added `POST /webhooks/:webhookId/test` on the backend; frontend shows a flask icon button per card that posts the test delivery and toasts success/failure with status code.

### Good to have
1. **Inline validation for session-policy fields.** Validate max sessions (e.g. −5), bad domain, and bad IP inline in the form before Save, even when the policy is not persisted in this round (lockout risk). — FIXED (f287a2e95), PENDING_BROWSER_VERIFICATION. Org settings forms validate on blur (`mode: "onTouched"` in `use-organization-settings-form.ts`); `org-security-section.test.tsx` shows each error before any Save.

### Must change
1. **Audit trail is not trustworthy as an audit trail.** Group create and token create/revoke are missing (ORG-B-017); archives read "Updated" (ORG-B-018); settings rows do not say what changed (ORG-B-020); the footer total is wrong (ORG-B-019). Fix these before anything else on this page. — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. Group create writes `principal_group.created` (`backend/src/modules/rbac/principal-groups.service.ts:142`); PAT create/revoke write `api_token.created`/`api_token.revoked` (`user-api-tokens.service.ts:124`, `:183`); archive/restore write `*.archived`/`*.restored` with the status change (`org-unit-crud.ts:444`); settings rows carry a field diff (`organization-settings.service.ts:165-167`); the footer has no false total (cursor mode, ORG-B-019). Labels fixed in c1a7a3cb1 (Good to have 2).
3. **Save feedback.** Business Hours closes at once and shows the old value for about 9 s (ORG-B-026). Keep the form open with "Saving…" until the server answers, then toast. — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. The form leaves edit mode only in `onSuccess` (`use-organization-settings-form.ts:81`), Save shows `Saving…` (`org-business-hours-section.tsx:169`), and the saved values are patched into the cache before it closes (`hooks/api/organization.ts:186`).
5. **Pickers before data.** Branch and Department show "No branch" or "Loading options…" and accept a click; a department can be saved unlinked (ORG-B-024). Disable the select until its options load. — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. While options load the list shows only "Loading options…" and no "No branch" choice (`components/organization/hierarchy-parent-selector.tsx:226`, `:254`); pinned by `hierarchy-parent-selector.test.tsx` (c1a7a3cb1).
6. **Colour fields disagree.** Secondary shows blank in view, and edit shows a #0b1220 picker with an empty hex (ORG-B-022, extends ORG-B-005). — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. View shows "Not set" (`org-branding-fields.tsx:41`); with an empty hex the picker is hidden behind a dashed placeholder (`:107`, `:128`), pinned in `org-branding-fields.test.tsx`.
7. **Raw keys on Billing.** "hrCandidates" and "hrJobPostings" appear in Plan Usage; the current plan card still says "Upgrade" (ORG-B-028). — FIXED (c1a7a3cb1), PENDING_BROWSER_VERIFICATION. Plan usage now uses the shared `humanizeLimitKey` (sentence case, added `crmClients`, and a camelCase fallback so no raw key can show); the current paid plan reads "Current Plan" and a current trial reads "Subscribe" (`plan-card.tsx:53`, `:138`).
8. **Duplicate code message.** The 409 for cost centres now shows a toast with a raw "code:" prefix and no inline error on the Code field (ORG-B-013). — FIXED (9f7cd5421), PENDING_BROWSER_VERIFICATION. The raw "code:" toast came from the global mutation error toast firing after the form had already set the inline error. The cost-centre and department create/update hooks now leave errors to their forms (`meta: { errorToast: false }`), so the 409 shows only under Code.
9. **Permission groups.** Still no Delete, Archive or create-role control (ORG-B-009). Each test group is permanent until an admin removes it. — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. Custom groups have a Delete control behind a destructive confirm (`features/settings/roles/groups/groups-panel.tsx:89`) calling `DELETE /principal-groups/:groupId` (`principal-groups.controller.ts:84`); pinned by `groups-panel.test.tsx` (7f009fae5). A create-role control is not built on purpose: FE-52 and BE-102 forbid role creation (six fixed standings).
10. **Timezone everywhere.** Audit Log, PAT expiry default and other times use UTC while the org is Asia/Calcutta (ORG-B-016). Label the zone at least. — FIXED (7f009fae5), PENDING_BROWSER_VERIFICATION. Audit log, delegations, webhooks and token tables already format in the org zone (`formatDateTimeInOrgTz`). The PAT expiry was the gap: its default came from the browser clock and it was sent with no zone, so the server read it as UTC. The default now comes from the org clock, the picked time is sent as the matching instant in the org zone, and the field names the zone.

### Good to have
1. **Notification toggles** save silently. Show a small "Saved" confirmation per toggle, as Quiet hours does not show one either. — FIXED (0401c9843), PENDING_BROWSER_VERIFICATION. Each channel and category toggle shows "Saved" beside itself for 2.5 s after the server confirms (category toggles used to be silent); quiet hours keep their toast.
2. **Consistent labels.** Audit labels mix styles: "Team Created", "Member Role Changed", "Org — CostCenter — Created", "Settings — Updated". Use one pattern (object + verb, sentence case). — FIXED (c1a7a3cb1), PENDING_BROWSER_VERIFICATION. `formatActionLabel` now gives one sentence-case object + verb pattern ("Cost center created", "Team created", "Settings updated", "API key revoked") in the table, the action filter and the detail sheet. This changes visible text (FE-129).
3. **Role names** are title-cased from identifiers: "Crm Module Admin", "Hr Module Member" (carried from round 1). Use "CRM Module Admin" and "HR Module Member". — FIXED (backend 67d535b9b, migration 2090 applied), PENDING_BROWSER_VERIFICATION. Seeded names use the module display name (`seed-system-roles.ts:206`); a read-only production query shows every system row as "CRM Module Admin", "HR Module Member" and so on, with no "Crm"/"Hr" names left.
4. **Mobile header at 400% zoom.** The trial banner and header take most of the first screen; the "Upgrade" button is the only action visible (ORG-B-023 covers the overlap). — FIXED (891739cef), PENDING_BROWSER_VERIFICATION. On phones the banner is one dismissible line ("Trial ends 26 Oct", `components/billing/trial-banner.tsx`), and the FAB no longer covers page actions (ORG-B-023).
5. **Keyboard.** Tab order through the header and sidebar is logical and the focus ring is visible. Account-menu items are not exposed as menu items to assistive tech (carried from round 1). — FIXED (97b794dc5), PENDING_BROWSER_VERIFICATION. The availability and clear-after chips inside the account menu were plain buttons the arrow keys skipped. In the menu they are now menu radio items (`menuitemradio` with `aria-checked`) that the arrow keys reach. Links and Sign out were already menu items.
6. **Plan copy.** "Trial ends 26 Oct 2026" on Billing and "Your trial ends in 11 days" on the banner should show the same date. — FIXED (94616c4e9, 8d863ac5d), PENDING_BROWSER_VERIFICATION. Both now come from `components/billing/trial-end.ts`: "Trial ends 26 Oct 2026 (11 days left)", with the date in the org time zone.
7. **Cost centre duplicate** needs a fast response; a 20 s wait with no feedback looks like a hang (ORG-B-013/026). — FIXED (9f7cd5421), PENDING_BROWSER_VERIFICATION. A code already on the loaded list is flagged under Code at once, with no request; other duplicates still get the server 409 inline. Save shows "Saving…" meanwhile.
8. **Branding preview** updates live as colours are typed (good); it still shows a grey placeholder for the logo area when a logo is set (not verified with a valid logo; not saved). — FIXED (c1a7a3cb1), PENDING_BROWSER_VERIFICATION. The email preview drew the logo through `brightness-0 invert`, which turns a logo with a solid background into a plain block that looks like the placeholder. It now renders the logo as the email does (`backend/src/modules/email/templates/base.ts:40`).
