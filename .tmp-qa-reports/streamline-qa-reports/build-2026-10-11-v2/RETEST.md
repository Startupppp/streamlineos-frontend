# Build module retest — build-2026-10-11-v2

Note: the source QA folder /workspace/streamline-qa/reports/build-2026-10-11/BUGS.md and fixtures were NOT present on this box at run start (checked 2026-10-11 ~22:30 IST). Bug descriptions below are taken from the task brief; a dummy fixtures/test-file.exe was created for BUG-08.

## Run 3

| Item | Status | Notes | Evidence |
|---|---|---|---|
| NEW-01 OTP send reliability (attempt 1, 22:33 IST) | STILL OPEN | Guerrilla fresh address zbykqb+30no327b1cg84@sharklasers.com. Cleared site data for www.streamlineos.in (Chrome site-info > Manage on-device site data). /signin then loaded fine (earlier /dashboard stuck on "Loading"/"This is taking longer than it should"). POST api.streamlineos.in/auth/email-otp -> 503; UI stuck on "Sending code..." then returned to form with no code step. | evidence/build-2026-10-11-v2/01-otp-attempt1-503.png |
| NEW-01 OTP send reliability (attempt 2, ~22:37 IST) | STILL OPEN | Same fresh address. POST /auth/email-otp -> 503 again (captured via waitForResponse). | n/a (see attempt 3) |
| NEW-01 OTP send reliability (attempt 3, ~22:41 IST) | STILL OPEN | 3 of 3 attempts (2-min spacing) returned POST api.streamlineos.in/auth/email-otp 503. No 429 seen. No code arrived, so sign-up was not possible. Run stopped at step 1 per brief. Also no user-visible error message is shown after 503 (see NEW-BUGS NEW-03). | evidence/build-2026-10-11-v2/02-otp-attempt3-503-signin.png |
| NEW-02 stale-cookie hang | STILL OPEN (reproduced) | Starting state had a stale session: /signin redirected to /dashboard and sat on "Loading" (the spinner stayed), then changed to "This is taking longer than it should ... Reload". Reload did not clear it. Recovered only after Chrome site-info > Cookies and site data > Manage on-device site data > delete www.streamlineos.in; then /signin rendered. | evidence/build-2026-10-11-v2/00-clear-site-data-dialog.webp, evidence/build-2026-10-11-v2/00b-stale-session-taking-longer.webp |
| BUG-02 /org-setup redirect loop | COULD NOT TEST | Needs a signed-in account; OTP never sent (NEW-01 blocker). | - |
| BUG-03 Aw Snap recurrence | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-04 duplicate project key silent fail | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-05 issue dialog stays filled -> duplicate | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-06 story points -5 and 1e9 | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-07 3000-char title silent revert | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-08 .exe attachment | COULD NOT TEST | Needs signed-in Build module. Dummy fixture created at /workspace/streamline-qa/fixtures/test-file.exe (original fixture not found on box). | - |
| BUG-09 reload loses edits | COULD NOT TEST | Needs signed-in Build module. | - |
| BUG-10 team list stale | COULD NOT TEST | Needs signed-in org with a second member. | - |
| Gap: logout and sign in again | COULD NOT TEST | No authenticated session. | - |
| Gap: invite second temp email and accept | COULD NOT TEST | Needs an org and sign-in. | - |
| Gap: board/status/priority/filters | COULD NOT TEST | Needs signed-in Build module. | - |
| Gap: end date before start date | COULD NOT TEST | Needs signed-in Build module. | - |
