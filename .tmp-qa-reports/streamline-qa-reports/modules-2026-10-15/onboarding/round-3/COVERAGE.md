# COVERAGE — Onboarding, Round 3 (2026-10-15)

Window: one incognito window for the whole onboarding run (closed at the end). The owner's normal window was not used for onboarding; the new org was checked from the incognito session only. The owner's org was not changed.

## Rechecked (ONB-B-001..004)
| ID | Covered | Result |
|---|---|---|
| ONB-B-001 | Yes: contact phone "12" on Workspace; checked the org profile afterwards | Still open (Support phone "Not set") |
| ONB-B-002 | Yes: invitee added, Build my organization (single click), Members & access > Invitations checked, then reloaded | Still open (reproduced) |
| ONB-B-003 | Yes: sign-in with OTP twice (one old code rejected) | Not reproduced |
| ONB-B-004 | Yes: Back during "Saving…" on Modules | Partly changed: first Back blocked, then the wizard moved on; "Save failed" not seen |

## New areas covered
- Sign-up / sign-in: new account, email code read from guerrillamail.com in the same incognito window.
- Skip for now on People: with no invitee, and with one invitee (ONB-B-006).
- Leave mid-wizard and sign back in: window closed at People with an invitee; reopened /org-setup (redirected to /signin with callbackUrl=/org-setup); after the OTP the wizard resumed on People with the invitee still listed (ONB-B-007 preview gap).
- Invitee remove (x) and re-add (Add invitee).
- Sign out from the wizard: 3 tries, all blocked (ONB-B-005).

## Not covered / limits
- Modules step beyond HR (no other module combinations; Home and Knowledge base always-on only checked by reading).
- Workspace validations beyond the contact phone (name length, industry, team size edge cases).
- Sign-in with Google; "Email me a sign-in link instead".
- Mobile (390 px) and keyboard-only pass of the wizard (done on org settings in round 3, not on the wizard).
- Multiple invitees and Org Admin role invites.
- Invitation email delivery (no invite was created, so nothing to check at the invitee mailbox).
- After "Build my organization", the owner-side org settings were read but not edited.
