# PRD — PM-002 · Build access at invite (BUG-002)
**Status:** Draft Phase 4 · **Priority:** Now #2 (coupled with PM-011 DoD)  
**Design:** UX-017 — invite CTA defaults **Build access ON** (Build Module Member) for Build-goal orgs · AVOID day-1 perm dump  
**CI:** invite→product BEHIND vs Linear/ClickUp/Jira

## Context
Owners invite teammates via `/settings/users`. Product can mark invitee **active Org Member** while `/build` denies `build:view` until a separate Members & Access → Build → Add workspace member → **Build Module Member** grant (VERIFIED workaround 2026-09-30).

## Problem
Invite → Org Member ≠ Build access. Teammates hit a permission dead-end on `/build`. Manual second admin trip is required — fails Direct competitor bar and blocks activation/collaboration (Client portal testing).

## Users / JTBD
- **Owner:** Invite someone to work in Build in one step.
- **Invitee:** After accept/sign-in, open Build and do delivery work appropriate to role.

## Evidence
| Claim | Label |
| --- | --- |
| Org Member listed active; `/build` denied `build:view` | VERIFIED (Tester BUG-002) |
| Manual grant Build Module Member restores access (26/80 perms, view) | VERIFIED (Designer) |
| Invite UI historically lacks Build Module Member option | REPORTED (BUILD-OS-BUGS historical P0) — re-verify on cold path when PM-011 fixed |
| Directs default collaborators into workspace | CI Cut v2 |

## Goals
1. Inviting a user for Build-goal orgs grants **Build Module Member** (or equivalent `build:view`+) in the same action as org invite — no second trip.
2. Invite UI shows Build access toggle **default ON** when org goals include Build / invite launched from Build.
3. Post-accept (PM-011) or provisioned sign-in: invitee reaches `/build` without admin Roles surgery.
4. Telemetry: `% invites with Build access` and `% invitees who open /build` within 24h.

## Non-goals
- Exposing all 764 permissions at invite (AVOID Jira dump).
- Full custom role builder at invite time.
- Fixing blank cold invite paint (PM-011 Slice 1) — but DoD of PM-011 includes this grant.
- Client portal guest ACL (PM-001).

## User stories
1. As Owner inviting from Build or Build-goal org, Build access is ON by default; I can turn it off intentionally.
2. As Invitee with Build access, `/build` loads after auth without `build:view` denied.
3. As Owner, Members list shows Build capability badge (has Build / no Build).

## Functional requirements
- **FR1** Invite API accepts `buildAccess: boolean` (default true for Build-goal orgs).
- **FR2** When true, assign Build Module Member (or minimal `build:view` + project-appropriate defaults) atomically with membership.
- **FR3** Invite UI: single checkbox/toggle “Access to Build” default ON; advanced link to roles optional.
- **FR4** Members & Access shows Build capability; granting later remains possible for upgrades.
- **FR5** Project-level roster may still require project add — but org Build shell must open (Command Center / Projects list).

## Non-functional
- Atomic grant (no partial org-only membership on success response).
- Audit log: who granted Build access at invite.

## States / edge
Build ON · Build OFF (intentional) · Invite from non-Build goal org (default OFF or ask) · Upgrade existing Org Member to Build · Downgrade · Cold invite blank (PM-011) · Historical Members without Build.

## Permissions
Only users who can invite + assign Build Module Member.

## Analytics
`invite_created` {build_access} · `invite_build_grant_applied` · `build_view_denied` {user_id} · `build_first_open_after_invite`

## Accessibility / privacy
Toggle labelled; no permission dump. Don’t expose full perm matrix to invitee.

## Rollout
Flag `invite_build_access_default` · existing Members unchanged · backfill tool optional Later · support doc for workaround path until 100%.

## Risks
- Over-granting Build to HR-only invites — mitigate with goal-aware default + OFF toggle.
- Coupling to PM-011 — ship FR behind flag testable via provisioned path.

## Open questions
1. Exact default perm set beyond `build:view` (26/80 observed — intentional minimum?).
2. Should project `PXC-Project-Alpha` auto-add invitee to roster?
3. Aditya: confirm Build-goal orgs always default ON.

## Acceptance criteria
- [ ] Fresh invite with Build ON → after auth, `/build` allows view (no Roles trip) — Tester
- [ ] Build OFF → `/build` denied (intentional)
- [ ] UI default ON for Build-goal / from-Build entry
- [ ] Dual repro; Members badge accurate
- [ ] BUG-002 closed only when cold path also works (with PM-011)

## Definition of done
AC + UX-017 closed · CI invite→product moves toward PARITY · workaround no longer required in happy path · release gates passed.

## Implementation slices
1. API atomic Build Module Member on invite when flag true  
2. Invite UI toggle default ON (Designer UX-017)  
3. Members badge + audit  
4. QA matrix (Tester) + remove doc’d workaround as primary path  

## Release gates
Code → Test (BUG-002 + invite matrix) → Ops (flag/docs) → Outcome (invite→`/build` open rate)


## Phase 4 amendments — ACCEPTED
1. Named preset **Build Module Member** only — no 26/80 picker.
2. No auto-add to all project rosters; org Build shell enough (FR5).
3. UX-017b human deny: “Ask admin for Build access” — never raw `build:view`.
4. CI: default ON = Direct parity; DoD = Build shell or UX-017b first paint; cold path needs PM-011+002 coupled.


## Phase 4 Completeness amendment — label honesty (council majority)
While Aditya’s elevate widget is open, council recommendation locked:
- **Do not** add CW-001/002 create/list power into Freeze Now.
- **Do** amend PM-002 non-goals/goals: if preset is 26/80 no-create, chrome must not say industry “Member” — use **Viewer** (or explicit “Module Member (view)”) so Directs bar on honesty is met.
- CW-001/002 + UX-022/023 remain Completeness Next.
