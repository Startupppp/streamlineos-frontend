# UX feedback — build-2026-10-12-v2

- Wizard step 1 (Project): typing "qa-1!" in Project Key silently converts to "QA1" (upper-cases, strips "-" and "!") with no hint, and the old error "Key must contain only uppercase letters (A–Z) and numbers" stays visible after the value is valid (NEW-11).
- Create Issue dialog: empty title + "Create issue" gives no visible message (only the required state); users get no clue.
- Create Issue dialog: Story points shows "Enter a whole number between 0 and 100" but the Create button still works, so the message reads as a warning but is not enforced (BUG-06).
- Comment Edit: the edit control is icon-only (no accessible name besides "Edit comment"); after Edit + Esc the comment looks different (NEW-13).
- Comment attach error: generic "Failed to attach qa-test.exe. Try again." gives no reason, so retry is pointless for a disallowed type (NEW-07).
- Org name: Build project pages show the org switcher as "Organization" while the dashboard shows "QA Build Org 1012b" (NEW-10).
- Member onboarding: a newly invited member who signs in is shown "Welcome, <name> — Launch your organization" (create-your-own-org flow) rather than being placed in the inviting org (NEW-16). Confusing for invitees.
- Every page logs a 404 from the feedback widget config (api.streamlineos.in/public/feedbucket/.../config) — noise in console, possibly harmless.
- Companion ("Meet Companion") bubble appears on top of the lower-right area during the project wizard and ticket page; wizard Next needed repeated clicks in this run (NEW-08).
