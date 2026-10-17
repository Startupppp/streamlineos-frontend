# UX — Onboarding, Round 3 (2026-10-15)

## Must change
- **Sign out in the wizard header is unclickable (ONB-B-005).** It is the only exit from the wizard. Fix the stacking so the header wins over the preview column.
- **"Skip for now" gives no feedback (ONB-B-006).** Show what happened ("Invites skipped — add later from People → Invitations") and clear or confirm the invitees.
- **Invitee silently dropped (ONB-B-002, carried).** After "Build my organization" the progress screen should show the real result of "Sending invites" and the Invitations list must match.
- **Contact phone "12" accepted (ONB-B-001, carried).** Validate the phone inline and show where it is stored.

## Good to have
- **Stale "About 1 min left" label.** It was still shown on the People step after resume and after many minutes. Hide the estimate or update it.
- **"Saving…" / "Saved" in the step header** stays on screen after an invite is removed or skipped. Fade it after a few seconds, and show "Save failed — retry" in the same place (ONB-B-004 wording).
- **Preview empty on resume (ONB-B-007).** Rebuild the preview from saved state so returning users see their org.
- **Advanced fields collapse on Back.** The contact phone is hidden again after Back (carried from round 2), so users may think it was cleared. Keep the section open when it holds a value.
- **Sign-in code entry.** A wrong or expired code says "Invalid or expired code". Add "Resend" next to it so the user does not have to go back and re-enter the email.
- **Sign-in page resume.** Visiting /org-setup while signed out redirects to /signin with callbackUrl=/org-setup, and sign-in lands back on the wizard at the saved step. This works well; keep it.
