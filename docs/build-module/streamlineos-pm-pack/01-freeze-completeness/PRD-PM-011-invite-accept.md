# PRD — PM-011 · Invite accept & lifecycle (BUG-001)
**Status:** Draft for Phase 4 · **Priority:** Now #1 (S1/P0 cold path)  
**Owner:** PM · **Design constraints:** ADOPT multi-method auth / clear return URL · AVOID day-1 perm dump  
**CI:** Cold invite BEHIND vs ClickUp/Linear/Jira (CI Cut v2)

## Context
StreamlineOS Build activates teams via `/settings/users` Invite. Tester VERIFIED cold invite URL renders marketing pane only — accept form blank white (BUG-001). Owner re-invite returned HTTP 409; user already listed **active Member** with Pending=0 despite blank accept — lifecycle unclear.

## Problem
Invited users cannot complete the **cold invite accept** path. Separately, invite state can show **active** without a successful accept UI, and **resend** is blocked (409) with no clear pending-invite UX. Blocks Member testing, teammate activation, and Client portal collaboration.

## Users / JTBD
- **Org Owner/Admin:** Invite a teammate into the org with a predictable pending→accepted flow; resend if needed.
- **Invitee:** Open email link → understand org + role → authenticate → land in intended product (Build) with trust.

## Evidence
| Claim | Label | Source |
| --- | --- | --- |
| Invite email delivered (original) | VERIFIED | Tester uberip inbox |
| Accept page blank (apex + www) | VERIFIED | Tester isolated profile; `/workspace/streamlineos-build-qa/bugs/BUG-001.md` |
| Re-invite 409; user active; Pending 0 | VERIFIED | Designer Owner `/settings/users` |
| OTP `/signin` may access as Member | UNTESTED (workaround in flight) | Designer suggestion |
| Directs ship working invite→accept | REPORTED/CI | CI Cut v2 |

## Goals
1. Cold invite link always renders accept UI (email, org name, role, CTA) within 2s on supported browsers.
2. Pending invites remain **pending** until accept completes; only then **active**.
3. Owner can **resend** or **revoke** pending invites; already-active shows clear “already a member — sign in” (no silent 409-only).
4. Post-accept: land on `callbackUrl` / Build when role includes Build access (ties PM-002/003).

## Non-goals
- SSO/SAML implementation (covered under PM-004 adjacent).
- Redesigning full roles matrix (PM-002 is role-at-invite).
- Client portal guest magic-link (PM-001/006).
- Treating OTP `/signin` workaround as the product fix for cold invite.

## User stories
1. As invitee, I open the invite URL and see org, role, and Continue/Accept — not a blank pane.
2. As Owner, I see pending invites until accept; I can resend email.
3. As invitee already active, the link tells me to sign in instead of a blank or opaque 409.
4. As invitee, after accept + auth I reach Build (or a clear gate), not a dead end.

## Functional requirements
- **FR1** `/invitation/{token}` renders accept form when token valid; error state when expired/revoked/invalid.
- **FR2** Token single-use or explicitly multi-device with server-side consume rules documented.
- **FR3** Host canonicalisation: `www` and apex behave identically.
- **FR4** Members list states: `pending` | `active` | `revoked` with transitions only on verified events.
- **FR5** Resend allowed for `pending`; for `active`, UI offers “Copy sign-in link” / message — not raw 409.
- **FR6** Analytics events (see Instrumentation).

## Non-functional
- P95 accept page interactive < 2s; no CLS blank-left layout.
- Accessible form (labelled fields, keyboard, focus).
- No token in referrer logs; HTTPS only.

## States / edge cases
Valid pending · Expired · Revoked · Already accepted/active · Wrong email signed-in · Network fail · Slow 3G · Token from email client link wrappers · apex vs www.

## Permissions
Only Org Admin/Owner (or role with invite permission) creates/resends. Invitee has no admin UI until active.

## Analytics (instrument before launch)
| Event | Trigger | Props | Identity |
| --- | --- | --- | --- |
| `invite_accept_view` | page paint | token_hash, host, valid | anonymous → email when known |
| `invite_accept_blank` | form root missing after load | token_hash, host | anon |
| `invite_accept_submit` | CTA | method (otp/google) | email |
| `invite_accept_success` | membership active | org_id, role | user_id |
| `invite_resend` | Owner resend | org_id | admin_id |
| `invite_conflict_409` | duplicate invite API | org_id, target_state | admin_id |

Baseline: BUG-001 rate; Target: blank rate ~0; Guardrail: invite send success unchanged. Owner: PM. Review: weekly until green.

## Accessibility / security / privacy
- WCAG 2.2 AA on accept form.
- Tokens unguessable; expiry ≤7d (current copy); revoke invalidates immediately.
- Email not leaked to unauthenticated third parties beyond what email already contains.

## Rollout
Flag `invite_accept_v2` · staged 10% orgs → 100% · rollback = prior page · support note for blank-page workaround (sign-in) · post-launch review 72h.

## Risks
- “Active” without accept may mean partial provision — data cleanup needed.
- Shared-browser QA false positives — use isolated profiles (Protocol v1.2).

## Open questions
1. Should accept require the invited email only, or allow Google account matching?
2. Does Build Module Member attach at invite (PM-002) or only post-roles?
3. Aditya: is blank accept known in prod monitoring today?

## Acceptance criteria
- [ ] Cold invite on fresh email: form visible (repro ×2, apex+www) — Tester
- [ ] Pending stays pending until accept — Owner+invitee
- [ ] Resend works on pending; active gets non-409 UX
- [ ] Happy path + expired + already-active negatives pass
- [ ] Events firing; blank alert = 0 over 48h soak

## Definition of done
AC met · release gates (code/test/ops/outcome) · Designer UX-016 closed · CI invite row moves from BEHIND toward PARITY · PM packet updated.

## Implementation slices
1. Diagnose blank render (JS error, CSS, host, token state) + fix paint  
2. Server state machine pending/active/revoke + API/UI for resend  
3. Already-active + expired error pages  
4. Instrumentation + alert  
5. QA matrix (Tester) + docs

## Release gates
Code complete → Test complete (BUG-001 + adjacent) → Operationally ready → Outcome validated (invite→active conversion)

---

## Phase 4 amendments (Designer + Tester) — ACCEPTED 2026-09-30

1. **Blank = layout/CLS failure** — left pane must show skeleton **or** error root within 2s; never marketing-only. AC + `invite_accept_blank` event retained.
2. **UX-016b** — Already-active designed page: org + role + primary Sign in + secondary Wrong account? (FR5).
3. **Open Q1 resolved (working):** cold accept locks to invited email; Google allowed only if email matches invite.
4. **Slice order frozen:** Slice 1 (blank paint) soak-green **before** Slice 2 (lifecycle). No 409 UX as cover for broken cold path.
5. **Tester AC:** FIXED only after dual repro apex + `www` on fresh profiles; negatives = expired, already-accepted, wrong-email OTP, double-click Accept, slow/offline hydrate → error root not blank.
6. **Regression:** post-fix, active Member / 409 path → UX-016b Sign-in CTA, never blank.
7. **R1 `/signin` findings** labeled **provisioned-Member** only — never “invite accept VERIFIED.”

8. **CI success metric:** cold invite→active Build Member reaching Build (not email-sent). DoD bar = Linear/ClickUp first-paint accept or clear expired/used state. Non-goal: no Jira day-1 perm dump. PM-011 ≠ auth parity — PM-004 still required.


## Patch · Member2 cold invite
Cold accept reached OTP for Member2 (BUG-001 **not** repro this path). Treat BUG-001 as **intermittent / host-specific** until dual apex+www ×2. Freeze DoD unchanged: FIXED only after dual green. Viewer honesty still pending OTP.
