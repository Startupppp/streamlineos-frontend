# Coverage — Onboarding Round 2 (2026-10-15)

Scope: round 2 continuation of the onboarding wizard in an incognito window, account qa1015r2onb@sharklasers.com. Normal window (owner session) not touched.

| Area | Result | Notes |
|---|---|---|
| Recheck ONB-B-001: Workspace contact phone "12" | Done — STILL OPEN | Continue advanced without error; kept on Back |
| Recheck ONB-B-002: People invitee dropped | Done — STILL OPEN | Invitations list empty after finish (checked after reload too) |
| Recheck ONB-B-003: transient OTP network error | Not reproduced | Sign-in step not repeated in this run |
| Test 'Skip for now' on an optional step | NOT EXECUTED | The only "Skip for now" in the wizard is on the People step, the final step where the invite recheck also had to run. Its outcome (finish vs. skip-to-finish) was not known beforehand, and one run could not test both. Ran the invite recheck (ONB-B-002) instead. Needs a second fresh account to test Skip. |
| Back keeps values — Workspace (name, team size, industry, company name, phone, advanced) | Done | Name, team size "1–10 employees", industry "Agency", phone "12" kept. Timezone and Region were empty (never set). Advanced options collapsed after Back (UX). |
| Back keeps values — Modules (HR selected) and People (invitee) | Done | HR still selected after Back from People; invitee still listed after Back and re-Continue |
| Modules: Back first click blocked | Observed once | "Save failed" shown; second click worked (ONB-B-004) |
| Add invitee on People (qa1015r2inv@sharklasers.com, Member) | Done | Listed under YOUR TEAM with "Access: HR Member"; header then "Unsaved" |
| Refresh mid-step on People with invitee | Done | Stayed on People; invitee and step persisted after reload |
| Double-click "Build my organization" | Done | One org in the org switcher ("QA1015R2 Onboarding Co"); redirected to /dashboard. No duplicate org seen. |
| Members & access > Invitations after finish | Done — invitee missing | "No invitations yet"; Pending Invites 0 (ONB-B-002) |
| Close incognito window | Done | Closed via the window's close button; normal window left as is |
| Owner session (normal window) | Not touched | No code read this round; the guerrillamail tab was not used |
| Sign-in / OTP | Not run | Account was already signed in when the run started |
