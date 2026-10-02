# StreamlineOS Forms + Automations census

**Status: VERIFIED** (UI-only; Account A, org `PXC-Design-A-20260930`; preferred project `PXC-Project-Alpha`, `/build/47`).

## Surface discovery

- Opened project **More tools**. UI exposed:
  - Forms: `https://www.streamlineos.in/build/47/forms`
  - Automations: `https://www.streamlineos.in/build/47/settings/automations`
- **All of Build** scope was also checked (`/build/command-center`). Its More tools menu showed Roadmap, Goals, Approvals, Templates, Client access, and Members & access; Forms/Automations were not listed there. They are project-scope tools in the preferred project.

## Forms

- Initial unfiltered state observed in UI: **No forms yet**; copy: “Create a form to collect structured data from your team or clients.” CTA: **New Form** (header and empty-state CTA).
- After opening the wizard, the list showed `FORM-1`, **Untitled Form**, **Generic**, **Inactive**, `0` fields.
- List controls: **Search forms**; type filter **All types** with options `Task Request`, `Bug Report`, `Feature Request`, `Change Request`, `Client Approval`, `Risk Report`, `QA Issue`, `Generic`; status filter **All forms** with options `Active`, `Inactive`.
- Filtered empty state verified at `/build/47/forms?status=active`: **No forms match your filters** / “Try adjusting the filters to see more forms.”
- Builder UI: required Form Name (default `Untitled Form`), Type `Generic`, optional Description, toggles **Active** and **Public (shareable link)**, **Add Field**, **Add Action**, **Preview / Fill**, **Builder / Submissions**, **Save Form**.

## Automations

- Empty state verified: **No automations yet**; copy: “Automate repetitive work — assign tickets, change statuses, and more with if-then rules.” CTAs: **New Automation** and **Create Automation**.
- No list search/filter controls were surfaced in the empty state.
- Create wizard inspected and canceled without submission. Fields: Automation Name; trigger default **Ticket Created**; trigger options **Ticket Updated**, **Status Changed**, **Ticket Assigned**; optional **Add Condition**; action default **Set Status**; action options **Assign To**, **Set Priority**, **Add Label**, **Add Comment**; status selector; **Cancel**, **Create Automation**, and **Close**.
- No automation was created or enabled; no outsider email/live action was configured.

## Safety / caveat

- Clicking **New form** immediately opened `/build/47/forms/4` and auto-created an inactive, zero-field Untitled Form (there was no cancel step). I did not click Save Form, activate/publicize, Preview/Fill, or Delete because deletion was out of scope. The resulting draft remains as the visible `FORM-1` craft state.
- No OTP, sign-in, member/role, Client Access, deletion, or live automation flow was entered.

## Evidence

Files in `/workspace/streamlineos-ux/evidence/forms-automations/`:
- `automations-empty.webp` — empty Automations surface
- `automation-wizard.webp` — New Automation wizard before cancel
- `forms-empty-filtered.webp` — Forms empty state with Active filter
- `forms-list.webp` — Forms list after the auto-created inactive draft
- `form-builder.webp` — Untitled Form builder craft state

Search terms used in UI: **More tools**, **Forms**, **Automations**. No target surface was missing in project scope; org-scope More tools simply did not list either tool.

## Design IDs
- **UX-032** — New Form auto-creates draft with no cancel (unlike Automations wizard Cancel) — Completeness Next
