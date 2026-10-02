# Claude / Engineering implement prompt — StreamlineOS Build Now Freeze v1

You are implementing **only** the frozen Now set for StreamlineOS Build (`https://www.streamlineos.in/build`). Do not expand scope into More-tools features, H-Builder, native mobile, or JSM-class service desk.

## Product context (locked)
- Build is an **H-PM delivery OS** (Issues/Backlog/Cycles/Epics/Releases/Portfolios/Programs) inside a multi-app suite — not a Retool-style builder.
- Wedge: **Client portal** for project stakeholders inside the suite.
- Auth today: email OTP; sessions fragile — don’t invent SSO in Slice 1 of PM-011, but never claim success without durable state.

## Authoritative specs (read fully before coding)
1. `/workspace/streamlineos-pm/PRD-PM-011-invite-accept.md`
2. `/workspace/streamlineos-pm/PRD-PM-002-build-role-at-invite.md`
3. `/workspace/streamlineos-pm/PRD-PM-001-client-portal-grant.md`
4. Design notes: `/workspace/streamlineos-ux/PM-001-design-challenge.md` + UX-016/016b/017/017b/019/020 in Designer packet
5. Bugs: `/workspace/streamlineos-build-qa/bugs/BUG-001.md` and R1 reports under `/workspace/streamlineos-build-qa/`
6. CI bar: `/workspace/streamlineos-build-ci-cut-v2.md`

## Implement in this order (do not reorder)

### A — PM-011 Slice 1 (before lifecycle)
**Bug:** BUG-001 — `/invitation/{token}` shows marketing only; accept form blank (apex + www).
**Must:** Within 2s show form root **or** error root (skeleton OK); never marketing-only left pane.
**AC:** Dual repro fresh profiles on apex + www; expired/already-used/wrong-email show error root not blank.
**Then Slice 2:** pending vs active state machine; resend for pending; already-active → Sign-in CTA page (UX-016b), not HTTP 409-only.
**DoD metric:** cold invite → authenticated user can proceed toward Build (coupled with PM-002).

### B — PM-002
**Bug:** BUG-002 — Org Member without Build Module Member → `/build` denies `build:view`.
**Must:** Invite UI toggle “Access to Build” **default ON** for Build-goal / from-Build; assign named preset **Build Module Member** atomically (no 26/80 picker; no Jira perm dump).
**Must not:** Auto-add invitee to all projects (org Build shell only; project roster explicit).
**Deny UX:** human “Ask admin for Build access” (UX-017b), never raw `build:view`.
**AC:** Fresh invite with Build ON → `/build` opens without `/settings/roles` surgery.

### C — PM-001
**Bugs:** BUG-005 false-success Invite Client toast with no grant row/link; BUG-006 Grant Access “Failed to load projects”; BUG-004 Member empty state without request CTA.
**Must:** Owner Invite Client / Grant Access **atomically** persist grant row + produce guest entry (magic-link or portal-scoped OTP email) + toast **only after** persist.
**Guest model:** named **Client** role, project-scoped — not org Member (don’t conflate with PM-011).
**Must not:** Full JSM; treat Linear guest as “done.”
**AC:** One Owner flow → grant visible in `/build/settings/client-access` and project portal Grants + Tester can open guest entry on separate profile.
**Member:** if no manage permission, UX-017b / request path — not silent empty CTA absence only.

## Engineering constraints
- Synthetic data prefix `PXC-`; no real customer data; sandbox only.
- Feature-flag each initiative; rollback plan required.
- Instrument events listed in each PRD before calling done.
- Release gates per item: code complete → test complete (original + negatives + happy) → operationally ready → outcome validated.
- Leave reversible implementation choices to eng except where PRD/Design freeze UI copy/structure.

## Out of scope (Not Now)
More-tools expansion, Cycles craft polish (Next), API token maturity, SSO full (PM-004 Later polish), HRMS modules.

## Definition of done for this prompt
All AC in the three PRDs checked by QA with evidence; CI invite/portal rows no longer BEHIND on these specific failures; no false-success toasts anywhere in these flows.


## Amendments post Freeze approve (Designer + Tester)
- Design handoffs (required read): `/workspace/streamlineos-ux/UX-016-invite-accept-handoff.md`, `/workspace/streamlineos-ux/PM-001-design-challenge.md`
- **Release blockers (QA):**
  1. PM-011 FIXED only after dual apex+www fresh-profile + hydrate negatives
  2. PM-002 FIXED only when cold invite → `/build` with no Roles surgery; project roster remains explicit
  3. PM-001 FIXED only when Tester opens guest entry on separate profile; false-success toast = auto-fail; BUG-006 green same slice
  4. Label every post-fix run: cold-invite | provisioned-Member | Owner | Client-guest
- Guest NF + Account B isolation **out of freeze** until BUG-005/006 clear
