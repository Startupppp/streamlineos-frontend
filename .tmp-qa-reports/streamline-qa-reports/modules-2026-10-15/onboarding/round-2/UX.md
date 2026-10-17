# UX notes — Onboarding Round 2 (2026-10-15)

- Workspace (step 1): after Back from Modules, "Show advanced options" is collapsed again. The Contact phone value is kept but hidden until the user expands it, so the user cannot see what they entered. Suggest keeping the section open when it holds a value.
- Workspace (step 1): Contact phone placeholder "+91 98765 43210" has no country prefix or format hint on the field. A user typing "12" gets no feedback at all (ONB-B-001 is the functional side).
- Modules (step 2): "Save failed" (red, beside the page title) is shown with no retry and no explanation. Needs an inline message and a retry (ONB-B-004).
- People (step 3): the "+" (Add invitee) control is an icon-only button with an accessible name "Add invitee" but no visible label; the role dropdown defaults to Member. Clear enough, but the button is easy to miss next to the email field.
- People (step 3): the invitee row reads "Access: HR Member" — useful. But the same screen says "Invite teammates now, or skip and invite them later from People → Invitations", which is false for this run because nothing reached Invitations (ONB-B-002).
- Assembling screen (after Build my organization): the checklist shows "Sending invites" as a pending step, which implies invites are sent. Given ONB-B-002 this copy is misleading; the step should show "No invites to send" or report a failure.
- Dashboard after finish: "Your trial ends in 14 days" banner appears; it was 12 days in round 1. Date-based, not a bug.
- Members & access (after onboarding): the owner row shows the Joined value "less than a minute ago" — fine. Pending Invites 0 is the symptom of ONB-B-002 (the invitee should be Pending).
