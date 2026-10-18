# onboarding — partial items

These items are only partly done, so they stay. Fully finished items from the same report were not put back.

## ONB-B-004 — FIXED (979ff2dfb), PENDING_BROWSER_VERIFICATION
Back and the step rail navigate at once and save the latest values in the background; a Continue save that lands after Back no longer advances; the header shows "Couldn't save — Retry" and clears on the next successful save; the save cache tracks the new revision and a 409 re-saves on the server revision.

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
