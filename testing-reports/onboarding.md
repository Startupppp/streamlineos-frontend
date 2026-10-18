# Onboarding — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining onboarding work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### ONB-B-002 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Invitee added in onboarding People step is silently dropped

Evidence: `setup-payload.ts` `buildOrgSetupPayload` includes `...(invitees.length > 0 ? { invitees } : {})` in the POST body; invitees are sent to the backend on "Build my organization". `use-setup-provisioning.ts` surfaces `SETUP_BACKGROUND_PARTIAL` errors with "Part of the optional setup — such as the starter structure or your invitations — didn't complete", so partial failures are visible to the user.

Latest report note: People step invitee silently dropped after "Build my organization": **STILL OPEN** | Invitee added on People (shown under YOUR TEAM, "Access: HR Member"; survived a mid-step refresh and Back/Continue). Clicked "Build my organization" (double-click), wizard redirected to /dashboard. Members & access > Invitations: "No invitations yet" (also after a reload). Members tab: Pending Invites 0. The progress screen listed "Sending invites" as a step but no invitation was created.

- Severity: High (data loss; invites never sent)
- Route: /org-setup → step 3 People → "Add invitee" → "Build my organization"
- Actor: new org owner (qa1015onb@sharklasers.com)
- Steps: 1) Modules: pick HR and Timesheets. 2) People: enter qa1015onbinv@sharklasers.com, role Member, click "Add invitee" (listed). 3) Back to Modules, Continue to People (invitee still listed). 4) Click "Build my organization". 5) On dashboard open Members & Access → Invitations.
- Expected: Invitation for qa1015onbinv@sharklasers.com appears as Pending (Member), as the copy says "Invite teammates now".
- Actual: Dashboard loads, org "QA1015 Onboarding Co" created (single org, see double-click test). Invitations tab shows "No invitations yet / Invite your first team member to get started." Reloaded, still none.
- Impact: Teammates invited during onboarding never receive an invite; admin must re-invite manually.
- Fix: Persist invitees in the same transaction as org creation (or call the invite endpoint after create) and surface failures.

### ONB-B-003 — NOT REPRODUCED, PENDING_BROWSER_VERIFICATION

Sign-in code verification: auto-submit showed "Network error contacting api.streamlineos.in (POST /auth/email-otp/verify)" once; manual "Verify code" then succeeded

Latest report note: Sign-in code auto-submit showed a transient "Network error" once: **NOT REPRODUCED in round 2** | Per the round 2 brief, not reproduced. The sign-in step was not repeated in this run.

- Severity: Low–Medium (intermittent; needs repro)
- Route: /signin → Verification code (new email qa1015onb@sharklasers.com)
- Steps: 1) Enter 6-digit code (typed; field auto-submits when full). 2) Observe "Verifying…" then red text "Network error contacting api.streamlineos.in (POST /auth/email-otp/verify). Check your connection and try again." 3) Click "Verify code". 4) Verified and redirected to /org-setup.
- Expected: No transient error for a valid code; if it occurs, auto-submit should retry or the code should not be reported as invalid.
- Actual: Error shown after auto-submit; second submit succeeded. Network was not down (later calls succeeded).
- Note: Code value not recorded here. Repro uncertain.

### ONB-B-006 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

"Skip for now" on People gives no visible result; it neither skips nor moves on

Evidence: `step-invite-launch.tsx` `handleSkip` calls `onChangeInvitees([])` to clear the list, shows `toast.success("Invites skipped. Add people later from People → Invitations.", { action: { label: "Undo", onClick: handleUndoSkip } })`, and the Skip button is only rendered when `data.invitees.length > 0`.

- Severity: Low–Medium (the step looks like it advanced but nothing changes; users cannot tell skip from no action)
- Route: /org-setup (step 3, People)
- Steps: 1) With no invitee in the list, click "Skip for now". 2) Read the header and the page. 3) Repeat with one invitee in the list (added as Member, HR Member) and click "Skip for now".
- Expected: Skip leaves People with no invitees and moves the user on (to the finish step, or to a summary that says invites can be sent later from People → Invitations). If invitees are already listed, Skip either clears them with a confirm or is disabled with a reason.
- Actual: Case 1: the header flashed "Saving…" then "Saved"; the page stayed on People; the link text stayed "Skip for now"; no toast or message. Case 2: the same, and the invitee stayed in YOUR TEAM. Nothing was sent or dropped, and no "skipped" state is shown. The only forward action is "Build my organization".
- Impact: Users may believe they skipped invites while the invitee is still there (and then lost, see ONB-B-002). No feedback on a skip is a trust problem.
- Likely code area: People step component; the Skip handler saves the step but does not change step state or the invitee list; no success message for skip.
- Fix: Define Skip as "clear pending invitees and mark invites as deferred", move forward (or show a clear "Invites skipped — add later from People → Invitations" message), and show the same message on Build.
- Acceptance: Skip with 0 invitees: step shows "Invites skipped" and the next action is clear. Skip with 1 invitee: confirm dialog, then the list is empty and the message shows. After Build, People → Invitations is empty and the deferred message matches.
