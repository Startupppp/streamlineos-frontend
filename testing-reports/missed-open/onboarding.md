# onboarding — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## ONB-B-001 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`

| ID | Round 1 / Round 2 summary | Round 3 status | Round 3 evidence |
| ONB-B-001 | Workspace step accepts contact phone "12" and advances to Modules | **STILL OPEN** | Contact phone "12" entered in Workspace > Show advanced options; Continue moved to Modules with no error. After the wizard finished, Organization Settings > General (new org, viewed in the incognito session as qa1015r3onb) shows SUPPORT PHONE "Not set". So "12" was accepted but not visible in the org profile. Whether it is stored under another field was not found. Nothing was edited in the new org. |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-1/BUGS-ORG-ONBOARDING.md`:

## ONB-B-001 — Onboarding Workspace step accepts invalid contact phone "12" and advances
- Severity: Medium
- Route: /org-setup → step 1 Workspace → "Show advanced options" → Contact phone
- Actor: new org owner (qa1015onb@sharklasers.com)
- Steps: 1) Fill Workspace name, Team size "1–10 employees", Industry "Agency". 2) Show advanced options. 3) Contact phone: "12". 4) Continue.
- Expected: inline error (e.g., "Enter a valid phone number") and stay on step 1.
- Actual: Continue moves to step 2 Modules with no error. Back to step 1 shows Contact phone still "12".
- Impact: Invalid phone stored on the new org unless the user notices; same validator gap as ORG-B-002 in org settings.
- Status: Cleared before finishing setup, so the test org has no phone.

## ONB-B-004 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`

| ID | Round 1 / Round 2 summary | Round 3 status | Round 3 evidence |
| ONB-B-004 | Modules autosave shows "Save failed" and the first Back click does not navigate | **PARTLY CHANGED — still open** | On Modules, Back was clicked while the header showed "Saving…": the first click did not leave Modules. The wizard then moved to Workspace on its own after a short wait. The red "Save failed" text was not seen this run. Still a blocked/delayed Back during autosave. |

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-2/BUGS.md`:

### ONB-B-004 — Modules autosave shows "Save failed" and the first Back click does not navigate
- Severity: Low–Medium (intermittent; needs repro)
- Route: /org-setup → step 2 Modules (HR selected, Continue previously reached from Workspace)
- Steps: 1) Workspace: enter the values, Continue. 2) Modules: with HR selected (state "Saving…" shows in the header from the chip change), click Back. 3) Observe the header and the page.
- Expected: Back navigates to Workspace with all values kept. If the save fails, a clear retry message appears and the Back action is not silently swallowed.
- Actual: The first Back click did not leave Modules. The header showed "Save failed" in red beside the "Modules" title and the step stayed on Modules. The second Back click went to Workspace and all values were kept. No retry control or explanation was shown.
- Impact: Users who click Back during an autosave get an unexplained "Save failed" and must click again; trust in the autosave is lost. No data loss was observed (values were kept on the second Back and the wizard finished with HR selected).
- Likely code area: onboarding wizard autosave/step-transition hook (org-setup step component: the Back handler is probably gated on the pending save promise, and the save error is not cleared or retried on navigation). Also check the backend autosave endpoint for the modules payload (a 4xx/5xx would explain the message).
- Fix: Do not block Back on a pending autosave; navigate and persist in the background (or queue and retry). When a save fails, show "Couldn't save — retry" with a retry button and clear the message on the next successful save.
- Acceptance: With autosave artificially failed once (network offline for one request), Back from Modules navigates on the first click, the error shows a retry, and after retry the header shows "Saved" and the selection persists on reload.
- Repro note: observed once in this run; the exact trigger (chip change followed immediately by Back) was not isolated. Next run: repeat "select module, click Back immediately" 3 times and capture the network response for the autosave call.

## ONB-B-005 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`:

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

## ONB-B-007 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/onboarding/round-3/BUGS.md`:

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
