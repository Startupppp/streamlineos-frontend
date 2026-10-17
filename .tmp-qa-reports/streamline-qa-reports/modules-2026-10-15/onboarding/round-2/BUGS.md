# BUGS — StreamlineOS Onboarding, Round 2 (2026-10-15)

Target: https://streamlineos.in · Wizard: /org-setup in a private (incognito) window · Account: qa1015r2onb@sharklasers.com · Org: "QA1015R2 Onboarding Co" · Invitee: qa1015r2inv@sharklasers.com · Data prefix: QA1015R2
Run status: complete (wizard finished, incognito window closed). Skip-for-now NOT exercised — see COVERAGE.md.

## Round 1 recheck

| ID | Round 1 summary | Round 2 status | Round 2 evidence |
|---|---|---|---|
| ONB-B-001 | Workspace step accepts contact phone "12" and advances to Modules | **STILL OPEN** | Contact phone "12" entered in Workspace > Show advanced options, Continue moved to Modules with no error. Back to Workspace kept "12". The wizard was finished with "12" still in the field (not cleared). Whether the org record stores it was not checked in this run (org settings not opened). |
| ONB-B-002 | People step invitee silently dropped after "Build my organization" | **STILL OPEN** | Invitee added on People (shown under YOUR TEAM, "Access: HR Member"; survived a mid-step refresh and Back/Continue). Clicked "Build my organization" (double-click), wizard redirected to /dashboard. Members & access > Invitations: "No invitations yet" (also after a reload). Members tab: Pending Invites 0. The progress screen listed "Sending invites" as a step but no invitation was created. |
| ONB-B-003 | Sign-in code auto-submit showed a transient "Network error" once | **NOT REPRODUCED in round 2** | Per the round 2 brief, not reproduced. The sign-in step was not repeated in this run. |

## Page: Modules (step 2)

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

## Page: Workspace (step 1) — carried over
- ONB-B-001 (still open, see recheck table). Additional note: after Back, "Show advanced options" is collapsed again, so the saved Contact phone "12" is hidden until the user expands it again (see UX.md).

## Page: People (step 3) — carried over
- ONB-B-002 (still open, see recheck table). The invitee is listed as "Member / Access: HR Member" on the People step and the list survives reload; the data is dropped only at the finish step, so the loss is at the "Build my organization" submit.
- Likely code area for ONB-B-002: onboarding finish endpoint (org create transaction) — the invitee list is in the request state but is not passed to the invitation service (or the invitation service call is skipped/fails silently after org creation while the progress UI still reports "Sending invites").
- Fix for ONB-B-002: persist invitees in the same transaction as the org (or call the invite endpoint after create), surface any failure in the progress screen, and show the invitee in Members & access > Invitations.
- Acceptance: after "Build my organization", Members & access > Invitations lists qa1015r2inv@sharklasers.com as Pending with role Member and HR access; the progress step "Sending invites" reports failure if the invite fails.
