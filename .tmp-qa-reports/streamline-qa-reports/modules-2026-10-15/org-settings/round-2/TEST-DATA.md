# Test data — QA1015R2 (org settings, round 2)

Account: user's own owner session, org "ADitay CAhala". No members removed. No plan/payment changes. No org archived/deleted.
Original values recorded before any change (2026-10-15 ~04:50 IST):

| Field | Original value | Test value(s) | Final (after revert) | Verified |
|---|---|---|---|---|
| Organization name | ADitay CAhala | "   " (ORG-B-001 recheck) | ADitay CAhala | Yes, after reload |
| Support phone | Not set | "12" (ORG-B-002 recheck) | Not set | Yes |
| Branding logo | Not set | javascript:alert(1) (ORG-B-004 recheck) | Not set | Yes |
| Branding primary colour | Not set | side effect #0b1220 (ORG-B-005) | Not set | Yes |
| Business hours Mon close | 18:00 | 08:00 (ORG-B-007 recheck) | 18:00 | Yes |
| Holiday calendar | 1 entry "QA1015 Holiday" 20 Oct 2026 (found at round-2 start; round-1 notes said deleted) | Deleted in round 2 | none | Yes, after reload |
| Legal name | Not set | 270-char over-limit (ORG-B-010; not saved); short `<script>` value | Not set | Yes |
| Registration number | Not set | 270-char over-limit (ORG-B-010; not saved) | Not set | Yes |
| Branding secondary colour | Not set | side effect with primary (ORG-B-005) | Not set | Yes |

## Hierarchy / access / integrations created this round

| Item | Code / key | Final state | Reverted / cleaned? |
|---|---|---|---|
| Branch "QA1015R2 Branch" | QR2BR | Archived | Archived (not hard-deleted) |
| Team "QA1015R2 Team" | QR2T | Archived (capacity cleared to — before archive) | Archived |
| Department "QA1015R2 Dept" | (round-2) | Archived | Archived |
| Location "QA1015R2 Location" | (round-2) | Archived | Archived |
| Cost centre "QA1015R2 …" | QR2C | Archived | Archived |
| Delegation (QA1015 Member, 16–17 Oct) | — | Revoked | Yes (revoked) |
| PAT "QA1015R2 PAT" | — | Revoked (gone after reload) | Yes (revoked) |
| Webhook (round-2 test) | — | Deleted | Yes |
| Permission group "QA1015R2 group" | — | Still exists | NO — needs admin cleanup (ORG-B-009) |
| Permission group "QA1015 role" (round 1) | — | Still exists | NO — needs admin cleanup (ORG-B-009) |
| Business unit "QA1015 BU" (round 1) | QA1015 | Still archived | Stays archived (recoverable via View archived) |

Holiday "QA1015 Holiday" (20 Oct 2026) was present at round-2 start and **deleted** in this round (verified empty after reload).

## Summary of reverts this round

Reverted to original / Not set: organization name, support phone, branding logo, primary/secondary colours, business hours (Mon close 18:00), legal name, registration number.
Deleted: holiday QA1015 Holiday; webhook.
Revoked: delegation; PAT.
Archived: QR2/QA1015R2 branch, team, department, location, cost centre.

## Leftover items needing admin cleanup

1. Permission group **"QA1015R2 group"** (this round; no delete in UI — ORG-B-009).
2. Permission group **"QA1015 role"** (round 1; still present — ORG-B-009).
3. Business unit **"QA1015 BU"** (code QA1015) remains **archived** (not hard-deleted; leave as-is unless an admin restores or purges).

No members removed. No plan/payment changes. No org archived/deleted. Session policy, Data & Privacy, App Configuration, Modules, Danger Zone left unchanged.
