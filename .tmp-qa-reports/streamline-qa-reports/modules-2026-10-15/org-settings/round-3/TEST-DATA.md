# Test data — QA1015R3 (org settings, round 3)

No codes, passwords, tokens or personal data recorded here. Owner session: user's own account (org "ADitay CAhala"). Email used: qa1015r3@sharklasers.com (branch only).

## Original values (recorded before the first change, ~15:00 UTC)

| Field | Original | Test value(s) | Final | Verified after reload |
|---|---|---|---|---|
| Organization name | ADitay CAhala | "   " (ORG-B-001) | ADitay CAhala | Yes |
| Support phone | Not set | "12" (ORG-B-002) | Not set | Yes |
| Branding logo | Not set | javascript:alert(1) (ORG-B-004); cleared | Not set | Yes |
| Branding primary colour | Not set | #0b1220 side effect (ORG-B-005); #ff0000 accidental save via Enter (ORG-B-021); cleared | Not set | Yes |
| Branding secondary colour | Not set | default #0b1220 side effect (ORG-B-022) | Not set | Yes |
| Business hours Mon close | 18:00 | 08:00 (ORG-B-007) | 18:00 | Yes |
| Legal name / Registration number | Not set | over-limit typed, cancelled, not saved | Not set | Yes |
| Notification "Play sound" | on | toggled off, then on again | on | Yes |
| Quiet hours | blank | start 22:00 and end 23:30 for testing | blank | Yes |

## Created and cleaned

| Item | Key | Final | Notes |
|---|---|---|---|
| Branch "QA1015R3 Branch" | QR3BR | Archived | Phone was "12" (+9112 shown) — archived |
| Department "QA1015R3 Dept" | QR3D | Archived | Saved with no branch (ORG-B-024) — archived |
| Team "QA1015R3 Team" | QR3T | Archived | Capacity blank (-3 blocked, ORG-B-025) — archived |
| Cost centre "QA1015R3 CC" | QR3C | Archived | Duplicate attempt (409 toast) did not create a second row |
| Personal access token "QA1015R3 PAT" | — | Revoked (gone after reload) | Accounting view scope |
| Permission group "QA1015R3 group" | — | **Still exists — needs admin cleanup** | No delete control in UI (ORG-B-009) |

## Leftover items for an admin (cannot be done from the UI)

1. Permission group **"QA1015R3 group"** (round 3) — plus earlier leftovers "QA1015 role" (round 1) and "QA1015R2 group" (round 2). Remove via database or an admin tool.
2. Archived branch, department, team and cost centre records (QR3BR, QR3D, QR3T, QR3C) — restore/purge only if the org wants it.
3. Audit log rows created by these tests (about 40 "Settings — Updated", "… Created" and "… Updated" rows, 15:11–15:34 UTC). They are immutable by design.

## Summary of reverts

Reverted to original: org name, support phone, branding logo/primary/secondary, business hours Mon close, notification sound (on), quiet hours (blank). Token revoked. Four org-structure records archived.
