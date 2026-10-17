# BUGS — StreamlineOS Onboarding, Round 3 (2026-10-15) — final regression round

Target: https://www.streamlineos.in · Wizard: /org-setup in a private (incognito) window · Account: qa1015r3onb@sharklasers.com (owner) · Org created: "QA1015R3 Onboarding Co" · Invitee: qa1015r3inv@sharklasers.com · Data prefix: QA1015R3
Prior rounds: ../round-1/BUGS-ORG-ONBOARDING.md, ../round-2/BUGS.md · Org settings: ../../org-settings/round-3/BUGS.md
Run status: complete. Incognito window closed. Round 3 result: 1 bug unchanged and reproduced (ONB-B-002), 1 bug still open (ONB-B-001), 1 partly changed (ONB-B-004), 1 not reproduced (ONB-B-003). 3 new bugs (ONB-B-005..007).

**Summary:** Round 1 + 2 items rechecked (4). Skip-for-now on People tested (ONB-B-006). Leave-mid-wizard and sign-in-again tested: the wizard resumed on the People step with the invitee still present (ONB-B-007 is a preview gap seen on resume). The Sign out button on the wizard could not be clicked (ONB-B-005).

## Round 1 and Round 2 recheck

| ID | Round 1 / Round 2 summary | Round 3 status | Round 3 evidence |
|---|---|---|---|
| ONB-B-001 | Workspace step accepts contact phone "12" and advances to Modules | **STILL OPEN** | Contact phone "12" entered in Workspace > Show advanced options; Continue moved to Modules with no error. After the wizard finished, Organization Settings > General (new org, viewed in the incognito session as qa1015r3onb) shows SUPPORT PHONE "Not set". So "12" was accepted but not visible in the org profile. Whether it is stored under another field was not found. Nothing was edited in the new org. |
| ONB-B-002 | People step invitee silently dropped after "Build my organization" | **STILL OPEN — reproduced** | Invitee qa1015r3inv@sharklasers.com (Member, Access: HR Member) added on People and shown under YOUR TEAM. Clicked "Build my organization" once; redirected to /dashboard. Members & access > Invitations: "No invitations yet" (checked again after a page reload). Members tab: 1 user (the owner), Pending Invites 0. |
| ONB-B-003 | Sign-in code auto-submit showed a transient "Network error" once | **NOT REPRODUCED in round 3** | Sign-in step done twice in the incognito window. The first code I entered was from an earlier send and was rejected with "Invalid or expired code" (expected for an old code; not the network error). The newest code signed in on the first try after that. |
| ONB-B-004 | Modules autosave shows "Save failed" and the first Back click does not navigate | **PARTLY CHANGED — still open** | On Modules, Back was clicked while the header showed "Saving…": the first click did not leave Modules. The wizard then moved to Workspace on its own after a short wait. The red "Save failed" text was not seen this run. Still a blocked/delayed Back during autosave. |

## Page: Workspace (step 1) — carried over

- ONB-B-001 (still open, see recheck table). Likely code area: the Workspace advanced-section schema maps "contact phone" to a field that the org-create call does not write to the org profile (Support phone). Fix: validate the phone (country code and digit count, like the org settings phone field) and either persist it to the org profile or hide the field. Acceptance: a value entered in the Workspace step appears in Organization Settings > General after "Build my organization"; "12" is rejected with an inline message.

## Page: Modules (step 2) — carried over

- ONB-B-004 (partly changed, see recheck table). Likely code area: step Back handler waits for the pending autosave promise. Fix: navigate immediately and persist in the background; show "Couldn't save — retry" with a retry button on failure. Acceptance: Back during "Saving…" changes step on the first click and no data is lost.

## Page: People (step 3) — carried over

- ONB-B-002 (still open, see recheck table). Likely code area: onboarding finish endpoint (org create transaction): the invitee list is in the request but is not passed to the invitation service, or the call fails silently while the progress screen reports "Sending invites". Fix: create invitations in the same transaction as the org or call the invite endpoint after create; show failures in the progress screen. Acceptance: after "Build my organization", Members & access > Invitations lists qa1015r3inv@sharklasers.com as Pending with role Member and HR access.

## Page: Onboarding wizard (all steps) — ONB-B-005

### ONB-B-005 — "Sign out" in the wizard header cannot be clicked; the user cannot leave or switch accounts mid-setup
- Severity: Medium (blocks a normal exit path; users may think the app is stuck)
- Route: /org-setup (step 3, People; header top-right, "Sign out" in the preview column)
- Steps: 1) Sign up and sign in with a new account (incognito window). 2) Reach /org-setup, Workspace and Modules done, People step open. 3) Click "Sign out" in the top-right header. 4) Repeat the click, then try a force click.
- Expected: The user is signed out and lands on /signin (or a confirm dialog appears). The header control is always clickable.
- Actual: The click times out. Playwright reports that a `<div>` inside the `<main>` subtree intercepts pointer events, so the click never reaches "Sign out". Three attempts (normal and force) failed. Only closing the window got the user out of the wizard.
- Impact: Users who start on a shared device or with the wrong email cannot sign out and must close the window. Trust in the wizard drops.
- Likely code area: wizard layout. The right-hand preview column (complementary region, "Organization preview") or a full-height overlay inside main sits above the header and takes pointer events. Check z-index and stacking context of the preview panel and any absolutely positioned wrapper.
- Fix: Keep the header (including Sign out) above the preview column, or move Sign out into the left column. Check pointer-events on the preview wrapper.
- Acceptance: At 1280 and 390 wide, Sign out on every wizard step (Workspace, Modules, People) is clickable on the first try and signs out to /signin.

### ONB-B-006 — "Skip for now" on People gives no visible result; it neither skips nor moves on
- Severity: Low–Medium (the step looks like it advanced but nothing changes; users cannot tell skip from no action)
- Route: /org-setup (step 3, People)
- Steps: 1) With no invitee in the list, click "Skip for now". 2) Read the header and the page. 3) Repeat with one invitee in the list (added as Member, HR Member) and click "Skip for now".
- Expected: Skip leaves People with no invitees and moves the user on (to the finish step, or to a summary that says invites can be sent later from People → Invitations). If invitees are already listed, Skip either clears them with a confirm or is disabled with a reason.
- Actual: Case 1: the header flashed "Saving…" then "Saved"; the page stayed on People; the link text stayed "Skip for now"; no toast or message. Case 2: the same, and the invitee stayed in YOUR TEAM. Nothing was sent or dropped, and no "skipped" state is shown. The only forward action is "Build my organization".
- Impact: Users may believe they skipped invites while the invitee is still there (and then lost, see ONB-B-002). No feedback on a skip is a trust problem.
- Likely code area: People step component; the Skip handler saves the step but does not change step state or the invitee list; no success message for skip.
- Fix: Define Skip as "clear pending invitees and mark invites as deferred", move forward (or show a clear "Invites skipped — add later from People → Invitations" message), and show the same message on Build.
- Acceptance: Skip with 0 invitees: step shows "Invites skipped" and the next action is clear. Skip with 1 invitee: confirm dialog, then the list is empty and the message shows. After Build, People → Invitations is empty and the deferred message matches.

### ONB-B-007 — Organization preview is empty on resume (after leaving and signing back in), though Modules and invitees are saved
- Severity: Low (display only; data was kept)
- Route: /org-setup (step 3, People) after sign-out-and-back-in
- Steps: 1) Complete Workspace (name "QA1015R3 Onboarding Co", Agency) and Modules (HR selected). 2) Add invitee on People. 3) Leave the wizard (window closed). 4) Sign in again with the same account; wizard resumes on People.
- Expected: The "Organization preview" column shows the saved org name, the Agency label and the enabled modules (HR), as it did while the user was on Modules.
- Actual: The preview shows "Your organization / Agency / Live" with the empty state "Pick goals to preview your organization — Sidebar and dashboard fill in with the modules you enable". The People list still shows "Access: HR Member", so the saved state is present but the preview is not rebuilt from it. Only the Agency label was visible.
- Impact: Users who come back see an empty preview, and may think their choices were lost.
- Likely code area: preview component initialised from local state (goals/modules) instead of the saved server state on resume.
- Fix: Rebuild the preview from the saved workspace and module state when the wizard loads.
- Acceptance: After leaving and resuming on any step, the preview shows the saved org name, industry and enabled modules without the user changing anything.
- Note: Observed on the resume screen only; not compared against the pre-sign-out preview (the window was closed before a before/after capture).
