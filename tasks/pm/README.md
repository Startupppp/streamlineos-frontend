# `tasks/pm/` — Legacy outlines (consolidated)

This folder historically contained many “Projects Product Bible” outline docs. They are **not implementation‑grade** and easily drift.

## Canonical PRDs (single source of truth)

- `PRD-project-management.md` — **Project Management platform** (Projects/Tickets/Comments + Chat + Calendar integrations)
- `PRD-auth-onboarding.md` — Auth, invitations, onboarding
- `CLAUDE.md` — repo constitution (frontend/backend boundary, TS rules, workflow)

## How to use this folder now

- Treat files in `tasks/pm/` as **legacy**. If a file is needed, it should become a short pointer to the relevant section(s) of `PRD-project-management.md` (or another canonical doc), not a second PRD.
- If a legacy doc contradicts a canonical PRD, the canonical PRD wins.

## Pointers updated (high-signal legacy docs)

The following documents were converted to pointers to reduce drift:
- Product framing: `001_Projects_Vision_Goals.md`, `002_Projects_Information_Architecture.md`, `003_Projects_Dashboard.md`
- Core PM outlines: `004_Project_Management.md`, `011_Task_Management.md`, `012_Task_Detail.md`
- Collaboration: `036_Comments_And_Collaboration.md`, `037_Mentions.md`
- Views: `021_Board_View.md`, `023_Table_View.md`, `024_Calendar_View.md`
- Governance: `063_RBAC_And_Permissions.md`, `064_Audit_Logs.md`, `047_Notifications_And_Reminders.md`
- Cross-cutting: `069_Frontend_Architecture.md`, `070_Backend_Architecture.md`, `074_Claude_Code_Implementation.md`
- (If present in your branch) any auth/onboarding doc under `tasks/pm/` should be replaced by a pointer to `PRD-auth-onboarding.md`

