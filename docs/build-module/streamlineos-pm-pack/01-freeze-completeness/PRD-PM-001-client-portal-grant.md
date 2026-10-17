# PRD — PM-001 · Client portal grant / invite CTA
**Status:** Draft Phase 4 · **Priority:** Now (P0 wedge) · **R1:** FAILED VERIFIED  
**Design:** ADAPT JSM/Zoho portal · AVOID treating Linear-guest as full portal · UX publish checklist  
**CI:** Client portal activation BEHIND until CTA ships

## Problem
`/build/settings/client-access` shows empty grants with **no Grant/Invite CTA** (R1 VERIFIED; historical P0 still open). Suite wedge (client-ready projects) cannot activate. Guest flows UNKNOWN.

## Goals
1. Owner/admin can create a portal membership / invite a client from Client access + project Client portal.
2. Unpublished portal shows publish checklist (Designer) before guest link works.
3. Guest reaches read-appropriate project view without raw permission strings.
4. Member without `build:clientvisibility:manage` sees human deny (UX-017b), not codes.

## Non-goals
- Replacing full JSM service desk.
- Auto-adding all Members as clients.
- PM-011/002 cold invite (separate).

## Evidence
| Claim | Label |
| --- | --- |
| Empty grants · no CTA | VERIFIED R1 |
| Portal unpublished Owner | VERIFIED Designer |
| Direct `/build/47/client-portal` denied manage for Member | VERIFIED R1 |
| Historical Batch 8 same failure | REPORTED |

## AC (draft)
- [ ] Grant/Invite CTA visible when empty
- [ ] Happy path: invite client → guest opens portal (Tester ×2)
- [ ] Negatives: revoked, unpublished, wrong project, Member without manage
- [ ] No raw perm codes in UI
- [ ] Events: portal_grant_created, portal_guest_first_view

## Deps
Owner adds Tester Member to `/build/47` (BUG-003 gate) before guest negative-first. PM-006 publish polish = Next after CTA works.

## Slices
1. CTA + create grant API/UI on `/build/settings/client-access` and project Client portal  
2. Guest auth path (magic link or OTP) — design with CI ADAPT  
3. Publish checklist + empty states  
4. QA matrix + instrumentation  


## Phase 4 CI amendments — ACCEPTED
1. Guest auth = magic-link or portal-scoped OTP — **not** full org Member invite.
2. Named **Client** role + project-scoped view — UNIQUE vs Linear guests; PARITY-seeking vs JSM/Zoho.
3. Slice 1 CTA before guest-auth polish / publish checklist.
4. Non-goal: no full JSM feature chase.


## Patch · Client portal pass (Member)
- PM-001 FAILED Member: no sidebar portal, manage denied, global Client Access empty **no CTA** (BUG-004 S2).
- Guest UNKNOWN until Owner creates grant.
- Kanban view VERIFIED; Create issue absent for view-only Member (expected for preset).
- Owner must verify Grant CTA exists for wedge role + create synthetic guest for NF.


## Patch · Owner Client Access VERIFIED
- Owner CTAs **exist** (Invite Client · Grant Access) — not paint-the-button.
- Invite Client silent fail: no toast, no row, no magic link.
- Grant Access S1: “Failed to load projects.”
- Project portal unpublished; Manage grants only.
- Member no-CTA = permission-gated (BUG-004).
**DoD revised:** grant row visible + guest entry (link/email) in one Owner flow.
**AC add:** Owner invite persists; Grant projects loader fixed; success toast; guest entry surfaced.


## Patch · BUG-005 dual-repro
False-success toast VERIFIED ×2 (“Client invited…”) with **no grant row** and **no guest entry**. AC: toast **only after** grant persists AND guest entry is available (atomic). BUG-006 projects loader VERIFIED under same PRD.
