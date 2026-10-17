# New bugs — build-2026-10-12

Environment: https://www.streamlineos.in, org "QA Build Org 1012" (owner account on a Guerrilla Mail address; second member invited). Browser: Chrome via Computer/Playwright tooling. IDs continue from the 2026-10-11-v2 run (NEW-01..03 are OTP items tracked in RETEST.md).

## NEW-04 — Project list does not show a newly created project until reload (Medium, needs one more repro)
- Steps: Build > Projects (All Projects list). Click New Project, fill name "QA Project Alpha", key QAB, click Next through the wizard, then Create Project.
- Expected: toast "Project created" and the new row appears in the list.
- Actual: toast "Project created" shows, the wizard closes, but the list still shows only "My First Project" for at least 3 s. After a reload the new row is there. (Contrast: the team list refreshes within ~3 s; and creating "QA Project Gamma" navigated to /build/5 instead of staying on the list, so the post-create behaviour is inconsistent.)
- Evidence: evidence/build-2026-10-12/02b-project-created-toast-list-stale.png, evidence/build-2026-10-12/18-projects-list-after-reload-shows-new-project.png

## NEW-05 — Board inline "Add ticket to column" silently does nothing for a 3000-char title (Low)
- Steps: Build > QA Project Alpha > Issues > Board. Click "Add ticket to column" (Todo "+"). Type or paste 3000 characters. Press Enter.
- Expected: either the ticket is created (title truncated per the 200-char rule) or an error such as "Title must be 200 characters or fewer" is shown.
- Actual: no request is sent, no message appears, and the 3000-char text stays in the input. Compare: the Create-issue dialog shows the inline error "Title must be 200 characters or fewer".
- Evidence: evidence/build-2026-10-12/11-board-inline-3000-title-no-feedback.png

## NEW-06 — Title length limit is inconsistent: 200 in create dialog, 500 saved on ticket detail (Low)
- Steps: Open ticket QAB-2 > click the title > Edit title > enter 3000 chars (field truncates to 500) > press Enter. Reload.
- Expected: same 200-char rule as the create dialog (error or truncate to 200).
- Actual: a 500-char title is saved with no error. The QAB-2 title is now 500 "A" characters (test data; left in place).

## NEW-07 — .exe attach error on ticket detail is generic (Low, UX)
- Steps: open ticket QAB-5 > use the comment area attachment input with /workspace/streamline-qa/fixtures/qa-test.exe.
- Expected: same reason as the create dialog: "qa-test.exe is not an allowed file type."
- Actual: toast "Failed to attach qa-test.exe. Try again." (no reason; retry will never succeed). File is not attached (correct).
- Evidence: evidence/build-2026-10-12/09-exe-detail-attach-failed-toast.png

## NEW-08 — AI Companion bubble covers primary controls (Medium, UX; blocked test steps)
- Steps: open New Project wizard (step 1 "Next →"), or open a ticket and click "Set due" in the Schedule section (right panel).
- Expected: the companion bubble does not sit over Next / date controls, or can be dismissed without a settings change.
- Actual: the companion overlay intercepts clicks on "Next →" (Playwright reports "subtree intercepts pointer events"), and its chat panel opens over the Due date control. Workaround used: keyboard focus + Enter, and "Minimize chat".
- Evidence: evidence/build-2026-10-12/17-companion-overlay-covers-due-date-control.png

## NEW-09 — Ticket detail Points edit did not persist in 2 attempts (Medium, NEEDS CONFIRMATION)
- Steps: open QAB-1 (points 0) > click Points > enter 1000000000 (or 5) > press Enter or Tab > reload.
- Expected: the value is saved, or a validation message is shown.
- Actual: after reload the Points field is blank (not 1000000000 and not 5). The create dialog path does save a valid value (QAB-3 saved 8 and shows 8). Request capture was unreliable in this session, so this is recorded as needing confirmation with a clean repro.

## NEW-10 — Sidebar org name showed "Organization" on first dashboard load after setup (Low, observed once)
- Steps: finish org setup with name "QA Build Org 1012", click "Build my organization", land on /dashboard.
- Expected: header/sidebar shows "QA Build Org 1012".
- Actual: first load showed "Organization" in the org switcher; after reloading /dashboard the name showed correctly.

## Existing bug statuses that are NOT new (see RETEST.md)
- BUG-06 still open (points -5 -> 0; 1000000000 -> 0 with no message).
- BUG-04 still open (409 on Create; wizard jumps back to step 1; inline message now shown).
- BUG-09 still open (uncommitted title/description edits lost on reload; no warning).
