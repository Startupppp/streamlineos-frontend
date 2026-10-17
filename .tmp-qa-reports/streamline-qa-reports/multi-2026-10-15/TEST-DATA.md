# Test data — QA1015 (multi-2026-10-15)

No data created yet. Planned:
- Fresh account email: qa1015onb@sharklasers.com (onboarding), OTP via guerrillamail username `qa1015onb`.
- Invite (only if session restored): qa1015inv@sharklasers.com
- Custom role name: QA1015 role (to be deleted)
# Test data — QA1015 (multi-2026-10-15)

Updated 2026-10-15 ~00:50 IST. Org: "ADitay CAhala" (user's own org). No member removed. No org deleted/archived.

| Item | Created | Final state | Reverted? |
|---|---|---|---|
| Org General: Legal name "QA1015 Legal Test", Website "https://qa1015.example.com", Support email "qa1015@sharklasers.com" | Yes (one save, verified after reload) | Cleared; all show "Not set" | Yes |
| Org General: Organization name | Accidentally stored "   " (whitespace) during validation pass (ORG-B-001) | Restored to "ADitay CAhala" (verified) | Yes |
| Org General: Support phone "12" (stored as +91 12, ORG-B-002) | Yes | Cleared; "Not set" | Yes |
| Branding Logo "javascript:alert(1)" (ORG-B-004) | Yes | Cleared; "Not set" | Yes |
| Branding Primary color "#0b1220" (auto-filled, ORG-B-005) | Yes (saved as side-effect) | Cleared; "Not set" | Yes |
| Localization Week starts on: Monday → Sunday → Monday | Yes (test) | Monday | Yes |
| Business hours Mon closing 18:00 → 08:00 (ORG-B-007) → 18:00 | Yes (test) | 09:00–18:00 | Yes |
| Holiday "QA1015 Holiday" 20 Oct 2026 | Yes | Deleted; "No holidays added yet" | Yes |
| Invite qa1015inv@sharklasers.com (Member, module preset Build Member) | Yes | Role changed to Org Admin and back to Member; invitation REVOKED (status Revoked) | Yes (revoked) |
| Permission group "QA1015 role" (Custom group, 0 members, 0 roles) | Yes (201 on server; UI showed contract error, ORG-B-008) | STILL EXISTS. No delete control in UI (ORG-B-009) | NO — needs admin cleanup |
| Business Unit "QA1015 BU" (code QA1015) | Yes | Archived (the UI offers Archive, not Delete); recoverable via "View archived" | Archived, not hard-deleted |

Not created: custom role (no create action on Roles tab); no tokens, webhooks, cost centres, branches, teams, or departments created; no payments/plan changes.
Settings left unchanged: Session policy, Data & Privacy retention (1 year), App Configuration (directory visibility Disabled), Modules, Companion policy, Danger zone (Transfer / Archive / Delete org NOT clicked).

Onboarding fresh account: qa1015onb@sharklasers.com (see section below once run).

## Onboarding account (private window, closed)
- Email: qa1015onb@sharklasers.com (mailbox qa1015onb on guerrillamail; Scramble Address unchecked). The mailbox was used to read the sign-in code. No code recorded here.
- Org created: "QA1015 Onboarding Co" (Agency, 1–10 employees, modules HR + Timesheets with 11–50 and By project chips, UTC timezone, region US detected). One org only (double-click test).
- Invitee qa1015onbinv@sharklasers.com was added in onboarding but NOT created as an invitation (ONB-B-002).
- Left in place: the onboarding account and its org "QA1015 Onboarding Co" (no delete control was used; the org was not deleted, as the task forbids deleting orgs).

## Leftover items needing cleanup by an admin
1. Permission group "QA1015 role" in the user's org "ADitay CAhala" (created during ORG-B-008 test; no delete control in UI).
2. Business unit "QA1015 BU" (code QA1015) archived in the user's org (archived, not hard-deleted).
3. Org "QA1015 Onboarding Co" under the qa1015onb account (created by onboarding test).
