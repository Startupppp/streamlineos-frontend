# Client Portal / Client Access census — project `/build/47`

**Observed:** 2026-09-30 (Account A Owner; org `PXC-Design-A-20260930`)
**Scope:** Client portal / Client Access chrome only. No members/roles changed; no Invite Client or Grant Access submit; no OTP reached.

## Verified URL inventory

- Project overview: https://www.streamlineos.in/build/47
- Client Portal (sidebar Project > Client portal): https://www.streamlineos.in/build/47/client-portal
- Client Portal > Visibility: https://www.streamlineos.in/build/47/client-portal?section=visibility
- Client Portal > Preview: https://www.streamlineos.in/build/47/client-portal?section=preview
- Project settings (sidebar Project settings): https://www.streamlineos.in/build/47/settings
- Client Access (Manage grants destination): https://www.streamlineos.in/build/settings/client-access
- More Build tools menu was inspected; it lists Triage, Epics, Milestones, Workload, Meetings, Approvals, QA and tests, Incidents, Change requests, Intake, Chat, Wiki, Whiteboard, Agile reports, Budget, Risks, Decisions, Forms, Workflow, Modules, Automations, Webhooks. No separate Client Portal/Client Access item was present.

## Verified Client Portal UI

### Unpublished Grants state
- Header: `Client Portal`
- Subtitle: `Manage client access and preview the client view`
- Warning/status chrome: `Portal not published`
- Warning copy: `Clients with a grant cannot access the portal until it is published.`
- Control: `Publish client portal` switch.
- Grants tab is selected.
- Empty state heading: `No grants`
- Empty state copy: `Grant a client portal membership access to this project from Client Access settings.`
- CTA/link: `Manage grants` -> `/build/settings/client-access`.

### Visibility
- Alert: `Visibility rules` / `Only enabled tickets and milestones appear in the client portal.`
- Tickets tab: `Tickets 2`; rows `#1 PXC-Issue-1 TASK` and `#2 PXC-Epic-1 EPIC`, each with a client-visibility toggle.
- Milestones tab is present.

### Preview / guest-facing copy
- Empty state heading: `Nothing visible to clients yet`
- Copy: `Toggle visibility on tickets and milestones to populate the client view.`

## Publish control safety finding

The `Publish client portal` switch did **not** open a confirmation; it immediately changed state to:
- `Portal published`
- `Published since 9/30/2026. 0 active grants.`
- switch changed to `Unpublish client portal`.

To restore the original freeze-safe state, I opened the resulting cancellable alertdialog and used `Unpublish` (not a publish action). Dialog copy was:
- `Unpublish portal?`
- `Clients will lose access immediately. Grants are preserved and the portal can be republished.`

Final verified state: `Portal not published`; `No grants`; `Publish client portal` switch. No portal remains live.

## Client Access chrome / known-bug risk

At `/build/settings/client-access` (organization scope `All of Build`):
- Header: `Client Access`
- Subtitle: `Grant clients visibility into project progress`
- Empty state: `No client access grants`
- Copy: `Grant clients read-only visibility into project milestones, tasks, and more.`
- Header CTA: `Invite Client`
- Empty-state CTA: `Grant Access`

`Invite Client` dialog was opened then cancelled without submission. It contained:
- `Create a client contact and activate their portal access immediately.`
- First name (placeholder `Jane`)
- Last name (optional) (placeholder `Smith`)
- Email (optional) (placeholder `jane@example.com`)
- `Cancel`, `Invite Client`, and `Close` controls.

`Grant Access` was inspected but **not submitted** (known BUG-005/006 false-success risk). The click produced an in-app `Projects Error` alert: `Failed to load projects. Please try again.` with `Try Again`; no grant was created.

## Final status

Census complete. Final portal state is unpublished and empty; no client grant, member, role, or invite mutation was made. Evidence is this report plus `ui-notes.md` in this directory.

## Design IDs
- **UX-031** — Publish client portal has **no confirm**; Unpublish does (asymmetric danger) — Completeness Next / Freeze-adjacent chrome, not PM-001 DoD
- Grant Access still surfaces Projects Error (BUG-006) without submit — aligns with PM-001 BLOCKED
- Do **not** soften PM-001 without grant→guest VERIFIED
