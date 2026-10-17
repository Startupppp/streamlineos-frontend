# UX notes — Org Settings & Onboarding (multi-2026-10-15)

- Settings reached via top-right account avatar menu (per user's steering): My Account, Billing & Plan, AI Credits, Organization, Members, Roles, Delegations, Modules, Notification Preferences, Personal Access Tokens, Sign out. Menu items are not exposed as role=menuitem in the snapshot tree (they show up only in ariaSnapshot), which may hurt keyboard/a11y.
- Organization General → Edit opens an inline form; there is no dialog. Save success is a short toast "Organization settings saved".
- Org name in the header and the "Set up HR…" dashboard greeting show mixed-case text "ADitay CAhala" (org name as typed). The user display name in My Account is "adityachalla01". Not a bug per se, but the org name and the user's display name differ.
- Website and phone inline validation: Website shows "Must be a valid URL" under the field; the email field relies on the browser's native tooltip ("Please include an '@'..."), i.e., inconsistent validation styles.
- Trial notice: dashboard says "Your trial ends in 12 days" (≈ 27 Oct) while Billing & Plan says "Trial ends 26 Oct 2026". Minor inconsistency.
- Notification Preferences shows "Push notifications are blocked" banner with a browser-settings instruction; no in-app way to re-request.
- Roles list labels are auto title-cased from identifiers: "Crm Module Admin", "Hr Module Member" (inconsistent with "CRM"/"HR" used elsewhere).
- Branches / Teams / Departments / Audit Log list pages show "Loading results…" with placeholder columns for several seconds before the empty state renders.
- Members list shows only the owner; Members & Access total users 1, pending invites 0.

## Onboarding (/org-setup) and sign-up
- Workspace step: the required-field errors are duplicated: "Select team size" and "Select a team size."; "Select industry" and "Select an industry.".
- Workspace name is silently capped at 100 characters (maxlength=100) with no counter or message when pasting longer text.
- Modules step: with no extra module selected, Continue is disabled and the warning reads "Select at least one product to continue. Home, Chat, and Knowledge are included with every workspace." The text reads as if the always-on modules satisfy the rule; they do not.
- Modules step: header shows "Saving…" for a while after a chip change; "Checking product availability…" appears after refresh and Continue stays grey until it finishes. Fine but slow feedback.
- Mid-step refresh on Modules kept HR / Timesheets and the 11–50 and By project chips (good). The onboarding also autosaves ("Saved" indicator).
- Visiting /org-setup after the org exists redirects to /dashboard (good).
- Visiting /signup redirects to /signin (sign-up is the same email OTP entry; no separate sign-up screen).
- Dashboard right after onboarding: "Total Employees" and "Present Today" showed "Couldn't load — retry" briefly, then loaded on their own.
- The email-OTP sign-in screen shows "Resend in 27s" countdown and "Email me a sign-in link instead" (good).
- Invite dialog (Members & Access): the required-field error for blank email reads "Email is required"; invalid format reads "Enter a valid email address" (good).
- Invitations list: revoked status shows "Revoked" and a "Re-invite" action (good).
- Role change on a pending invitation is inline (select in the row) and persisted after reload (good).
- Roles page: the system role detail says "System role permissions are managed automatically and cannot be edited" (good, clear).
- Permission Groups: after a successful create the dialog stays open and an error toast/console contract error is shown (see ORG-B-008).
- Business Units: the Save dialog asks for a Code (2–20 characters) that is not marked as required on the form; the error appears only after Save.
- Holiday calendar: the form shows "Invalid date" in addition to "Pick a date" when no date is chosen.
- Holiday delete: happens immediately on the trash icon with no confirmation.
- Business Units "Archive" runs a dependency check first ("Checking business unit dependencies…") then a confirm dialog; good.
- Session policy and App Configuration panels: view only in this round (no change) to avoid lockout and public-visibility changes.
