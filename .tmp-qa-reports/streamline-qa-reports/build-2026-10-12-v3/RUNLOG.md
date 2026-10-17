# Run log — build-2026-10-12-v3 (text evidence only, NO screenshots)
Site: https://www.streamlineos.in | Owner: qaown1012b@sharklasers.com | Member: qamem1012c@sharklasers.com | Org: QA Build Org 1012b
Started: 2026-10-12 ~22:01 IST (UTC+5:30)

## R0 Setup
- Guerrilla Mail inbox already shows qaown1012b@sharklasers.com (username set to qaown1012b).
- streamlineos.in tab was already signed in as owner (Account menu shows qaown1012b / qaown1012b@sharklasers.com). Verified 22:0x.
- Build > Projects: console GET https://api.streamlineos.in/organization/settings -> HTTP 500 (x2) on page load; console "ApiError: An unexpected error occurred". [NEW-25 candidate]
- Project list: My First Project (MYF-6FC), QA Project Alpha (QAB, /build/7, 77 issues).

## R1 BUG-04 (duplicate project key)
- Wizard (New Project on /build/projects). Step 1 name "QA Project Gamma", key "QAB": inline "A project with key "QAB" already exists in this organization." appears on step 1; Next did not advance (client-side block, no API call). [pre-check = positive, prevents the 409 path for typed dupes]
- To reach the server-side 409 path: second tab created project "QA Project Delta" key QZG (POST https://api.streamlineos.in/build -> 201, redirected to /build/11).
- Tab 1 wizard (key QZG, now stale-duplicate) at Step 7 of 7 "Review & Create" -> Create Project: POST https://api.streamlineos.in/build -> 409 (console "Failed to load resource: ... status of 409 () @ .../build").
- Result: wizard stays on "Step 7 of 7 / Review & Create"; inline dialog "Project key already taken" / 'A project with key "QZG" already exists in this organization.' with button "Fix Key"; NAME "QA Project Gamma", KEY "QZG" values kept. NO reset to Step 1.
- Verdict BUG-04: FIXED (reset part). 409 still returned by server (expected); message is now shown.
- Side note: /build/11 right after creation showed "Couldn't load your workspace / Network error contacting api.streamlineos.in (GET /me/access)" once, then recovered on reload (GET /me/access 200). Transient; re-check later.

## R2 BUG-06 (story points -5 / 1000000000)
- Create Issue dialog on /build/7/issues?create=1: title "BUG06 retest points -5", Story points -5 + Tab -> inline "Enter a whole number between 0 and 100"; button "Create issue" becomes DISABLED (isDisabled=true); no POST sent. Enter key in title field: no POST, dialog stays.
- Story points 1000000000 -> same inline text, Create issue disabled. No ticket created (search "BUG06" returns only the valid one).
- Valid create: title "BUG06 valid points 8", pts 8 -> POST /build (201 expected) -> ticket QAB-78, detail shows "8 pts".
- Detail /build/7/tickets/QAB-78, Points spinbutton: fill -5 + Tab -> value reverts to "8" immediately; NO PATCH request in network log (only POST /notifications/events/token 200). Reload -> 8.
- Detail Points fill 1000000000 + Tab -> reverts to "8"; no PATCH. Reload -> 8.
- Verdict BUG-06: FIXED (invalid values rejected in both create and detail; nothing saved as 0).

## R3 BUG-09 (unsaved title edit lost on reload)
- QAB-78 detail. Clicked "Edit title" (button), typed " UNSAVED09" (no "Done editing"), then page.reload().
- Dialog listener captured: DIALOG type=beforeunload (a leave-page warning WAS raised this time).
- After reload heading = "BUG06 valid points 8 UNSAVED09" -> the typed edit was PERSISTED, not lost.
- Repeat: typed " ZZ" + Done editing -> reload -> "BUG06 valid points 8 ZZ" (persisted). Then restored title to "BUG06 valid points 8" (Done editing + reload verified).
- Observation: a title edit is written to the server while still typing (a slow-typed sequence left the saved heading at "BUG06 va" after reload). Title autosaves, so partial values reach the server. Logged as note under BUG-09 in BUGS.md.
- Verdict BUG-09: FIXED for the reported symptom (no loss; a beforeunload prompt exists).

## R4 NEW-05 / NEW-06 (title validation, create + detail)
- NEW-05: Create issue dialog (/build/7/issues?create=1) empty title: click "Create issue" (force) -> inline "Title is required"; no POST sent. Blur on empty title shows "Title is required". PASS.
- NEW-06 create side: title 201 chars, Tab -> NO inline message (previous run: "Title must be 200 characters or fewer"). Click "Create issue" -> POST /build/7/tickets -> 201. Ticket created with 201-char title (verified via search q=A*20 -> title length 201). Create input has NO maxlength attribute; 300-char value accepted with no inline message (not submitted).
  -> the 200-char limit in Create is no longer enforced (behavior changed). Test ticket left: title "AAAA...(201)" created by QA, key see BUGS.md (cleanup needed).
- NEW-06 detail side: QAB-78 "Edit title" input maxlength="500"; typed 600 chars -> stored input length 500. I restored title to "BUG06 valid points 8" (Done editing + reload verified).
- Verdict NEW-06: STILL OPEN (inconsistent: Create accepts >=201 and has no client max; detail caps at 500).

## R5 NEW-07 (.exe attach)
- Ticket QAB-78 Activity: file input (no accept attr; the "Attach files to ticket" control) setInputFiles fixtures/qa-test.exe -> visible text "qa-test.exe is not an allowed file type." (no POST logged; client-side reject). PASS.
- Side-note: a second file input with accept="image/jpeg,image/png,image/gif,image/webp" accepted setInputFiles(.exe) -> POST /storage/upload 400 {"code":"BAD_REQUEST","message":"File type not allowed"}; NO visible message appeared in the page (innerText had no alert text). Logged as NEW-27 (Low) candidate: unexplained upload path. Owner to confirm which input is user-facing.

## R6 NEW-10 (org name in header)
- /build/projects Build scope switcher aria-label: "Switch Build scope — current: Organization"; visible text "AL / All of Build / Organization". Expected org name "QA Build Org 1012b". On /build/7/issues the label reads "current: Project QA Project Alpha" (OK).
- Verdict NEW-10: STILL OPEN (Build projects list scope label shows 'Organization').

## R7 NEW-11 (key 'qa-1!')
- New Project wizard step 1: name "A", key typed "qa-1!" (keyboard + Tab): key value becomes "QA1" silently ('-' and '!' stripped, no message). Key error "Key must contain only uppercase letters (A–Z) and numbers" is gone; hint "Letters A–Z and digits only; auto-uppercased." shown. Stale key error: NOT reproduced.
- Side-note NEW-26 (Low): name "A" error "Name must be at least 2 characters" stays after name changed to "QA Name OK" + Tab (remains until Next). Next advanced to Step 2 of 7 with no stale errors.
- Verdict NEW-11: PARTIAL -> silent rewrite STILL OPEN (Low); stale error FIXED.

## R8 NEW-13 (Escape while editing a comment)
- QAB-78 comment "NEW13 probe <svg onload=alert(1)> **bold** _it_" posted (POST /build/7/tickets/... comment; 200/201 not captured in log, visible after post).
- Edit comment -> editor shows raw source "NEW13 probe <svg onload=alert(1)> **bold** _it_" (buttons Cancel/Save). Focus in editor + Escape -> editor closes; NO PATCH/PUT request logged (only POST /notifications/events/token 200).
- Reload -> body still "NEW13 probe <svg onload=alert(1)> bold it" (rendered; no change to stored body). No dialog (alert) observed.
- Note: Escape with focus outside the editor did nothing (editor stayed open) - minor.
- Verdict NEW-13: FIXED / NOT REPRODUCED.

## R9 NEW-14 / NEW-15 (console 404s)
- /settings/members -> document 200, final URL /settings/users (redirect; the old 404 no longer occurs).
- /build/2 (stale id) -> HTTP 200 doc with in-page "Page Not Found" text; no api 4xx logged.
- Listener on /build/projects, /build/7/issues, /dashboard, /settings/members, /build/2: no response with status >= 400 captured in this run (the feedbucket config request did not 404 here).
- Note: first load of /build/projects showed GET https://api.streamlineos.in/organization/settings 500 x2 + "ApiError: An unexpected error occurred" console error. Not reproduced on later loads (3 loads). Re-check at end.
- Verdict NEW-14: FIXED (no console 404 observed). NEW-15: FIXED (no 404 observed) - to be re-confirmed.

## R10 NEW-16 (invited member not joined) — owner + member session
- Owner (qaown1012b) /settings/users > Invite User: email qamem1012c@sharklasers.com, role Member, preset Build Member -> POST /users/invite 201 {"success":true,...,"resent":true}; UI "Invitation re-sent!". (Pending Invites count was 1 from earlier invite.)
- Owner signed out: Account menu > Sign out -> POST /auth/logout 200 -> /dashboard -> /signin?session=expired&callbackUrl=%2Fdashboard (page text "Your session expired").
- Member sign-in: /signin email qamem1012c@sharklasers.com -> POST /auth/email-otp 200 -> "Sent to qamem1012c@sharklasers.com". Code read from Guerrilla inbox qamem1012c (username set via Guerrilla #inbox-id "Click to Edit"; Scramble Address unchecked). Code entered -> POST /auth/email-otp/verify 200 -> landed on /org-setup (first sign-in still routes to /org-setup, no invite prompt).
- Invitation mail from noreply@streamlineos.in ("You've been invited to join QA Build Org 1012b", 16:45 Guerrilla time). Link /invitation/<token> (token redacted).
- /invitation/<token> (signed in as member): HTTP 200. Page "WORKSPACE INVITATION / You're invited / Join QA Build Org 1012b / ACCESS ROLE Member / INVITATION SENT TO qamem1012c@sharklasers.com / SIGNED IN AS qamem1012c@sharklasers.com", buttons "Accept & join", "Decline invitation".
- Click "Accept & join" -> POST /organization/invitations/<id>/claim 200 -> /post-invite -> /build/projects "My Projects".
- Member dashboard: "QA Build Org 1012b", Active Projects 3. Joined.
- Verdict NEW-16: the join works now (FIXED for "not joined"). Sign-in still lands on /org-setup with no pending-invite prompt -> STILL OPEN (Medium, flow) — kept as separate item NEW-16b.

## R11 RBAC setup (steering: Build-only scope + RBAC matrix to RBAC.md)
- Member (qamem1012c, org Member + Build Member preset) checks: /build/projects shows "My Projects" with no projects listed and NO "New Project" button. /build/7/issues, /build/7/tickets/QAB-78, /build/11 -> "You're not invited to this project / this project is a private project" (member is not a project member). /build/7/settings -> /access-denied?required=build%3Aupdate. /settings/users -> /access-denied?required=settings%3Aview (text "Access Restricted"). /settings/billing -> /access-denied?required=billing%3Asubscription%3Aview. /build/999999 -> 200 doc "Page Not Found". /build/projects?... 
- Owner signed back in (qaown1012b, OTP via Guerrilla mailbox set to qaown1012b; code row "Your sign-in code"). Session restored to /dashboard.
- Fresh Guerrilla invitees created by owner invite (POST /users/invite):
  - qaadm1012d@sharklasers.com: role Org Admin + preset Build Admin -> "Invitation sent!" (201 expected; UI confirmed).
  - qaview1012e@sharklasers.com: role Member + preset Viewer (no Build grants = org user without Build access) -> POST /users/invite 201, "resent": false.

## R12 Owner Build checks (this session)
- NEW-19: v2 import rows present: table search "Bulk pag item" shows EPIC-type rows (03,07,11,15,19,23,27,31,35) in Table and Board. "Bulk pag item 01" absent only because QAB-2 title was changed to 300 chars by v2 BUG-09 test. Verdict FIXED.
- NEW-18: Import dry run (preview) of v3-import-40.csv (fixture copied to reports dir): POST /build/7/import-export/tickets/preview 200, summary totalRows 40, importable 40, invalid 0. Statuses "In progress"->IN_PROGRESS, "In review"->IN_REVIEW accepted; "To Do" -> STATUS_DEFAULTED warning "Unknown status \"To Do\" — imported as \"TODO\"" (not rejected). Verdict FIXED for status names (dry run). Import execution NOT completed: Import button stayed disabled after dry run in this session (not verified further).
- NEW-20: Search without Enter: typing "Bulk pag item 35" in board search updates URL to ?q=Bulk+pag+item+35 and filters (Todo 1). Verdict FIXED.
- NEW-21: Project settings > Labels > Add Label: label name `"><img src=x onerror=alert(1)> NEWLBL` created (Enter key); list shows the literal text; 0 img elements; no alert. Verdict FIXED (label settings list). Pre-existing label "<svg onload=alert(1)>" also renders as text.
- NEW-22: Cycles > New Cycle, Start Oct 20 - End Oct 22 2026 overlapping existing cycle: POST /build/7/cycles 409 {"code":"CONFLICT","message":"Cycle dates overlap with \"<svg onload=alert(1)> \"><img src=x onerror=alert(1)>\"."} and the message text is visible in the UI. Verdict FIXED (explicit message; 409 is correct).
- NEW-17 (cycle status list refresh): NOT RETESTED (dialog interaction problems, time-box).
- Ticket QAB-78 title restored to "BUG06 valid points 8" (verified after reload).

## R13 RBAC — roles observed
- Owner qaown1012b (Owner): Members & access shows Owner row; row Actions: View details, Send sign-in link, "Owner — transfer ownership first" (no role change / suspend / remove for owner).
- Member qamem1012c (org Member + Build Member preset; project QAB team member added by owner via Team Members, PATCH /build/7 200):
  - /build/7/issues: buttons present: none of Create Issue / Import / Export-with-import; "Log time", "Export" visible.  (no Create Issue button)
  - /build/7/tickets/QAB-78 (owner's ticket): NO "Edit title", NO "Delete ticket", NO comment composer, NO "Edit comment"/"Delete comment"; Points spinbutton disabled (fill throws "element is not enabled").
  - /build/7/cycles: NO "New Cycle" button.
  - /build/7/settings: 200 -> /access-denied?required=build%3Aupdate ("Access Restricted", build:update).
  - /settings/users: /access-denied?required=settings%3Aview. /settings/billing: /access-denied?required=billing%3Asubscription%3Aview.
  - /build/projects: "My Projects" list; NO "New Project" button.
  - Direct API GET navigations (api.streamlineos.in/build/7, /build/7/tickets/QAB-78, /organization/settings, /users, /organization/members, /build/projects, /build/11) -> 401 UNAUTHORIZED JSON for an unauthenticated navigation (no app bearer token; a 401 is what an unauthenticated call gets, so this does not test authorization). Limitation noted.
- Admin qaadm1012d (org Org Admin + Build Admin preset; accepted invitation via /invitation/<token> "Accept & join"; role shown "Org Admin"):
  - /build/projects: "New Project" present. /build/7/issues: "Create Issue" and "Import / Export" present. /build/7/tickets/QAB-80: "Edit title", "Delete ticket" present; Points enabled. /build/7/settings: 200 (settings page).
  - /settings/users: "Invite User" present; row Actions for member: View details, Change role, Suspend, Archive, Send sign-in link, Remove from organization, Delete user. Owner row Actions: no change role (only "Owner — transfer ownership first").
  - Create issue POST /build/7/tickets -> 201 (id 89, title "RBAC admin create test").
  - Edit title on owner ticket QAB-78 -> allowed in UI (restored afterwards).
  - Delete ticket: POST? no: DELETE /build/7/tickets/89 -> 204 (admin allowed).
  - /settings/billing: 200 (admin can view billing page).
- Viewer invite: qaview1012e (org Member, Viewer preset = no Build grants) invited (201). Not yet accepted.
