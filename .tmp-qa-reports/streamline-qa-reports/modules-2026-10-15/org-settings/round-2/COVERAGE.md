# Coverage — Org Settings, Round 2 (2026-10-15)

Updated 2026-10-15 ~05:15 IST.

Target: https://www.streamlineos.in · Org: "ADitay CAhala" · Actor: owner's own session · Test prefix: QA1015R2.
Entry: avatar/account menu → Organization (and sibling settings). Round 1: ../round-1/.

## Covered this round

| Area | What was exercised | Notes / bugs |
|---|---|---|
| Org General | Edit/validate: `<script>` stored as literal text; 270-char Legal name / Registration number | ORG-B-010 (raw zod "Too big"); XSS pass (no script execution) |
| Branches | Create / edit / archive (incl. phone "12" → +9112) | ORG-B-011; QR2BR archived |
| Teams | Create / edit / archive (incl. capacity −3) | ORG-B-012; QR2T archived |
| Departments | Create / edit / archive | QA1015R2 Dept archived |
| Locations | Create / edit / archive (network-error retry path) | ORG-B-014; QA1015R2 Location archived |
| Cost Centers | Create / edit / archive; duplicate code 409 | ORG-B-013, ORG-B-014; QR2C archived |
| Session policy | Field validation exercised; **not saved** | Inline gaps noted in UX; save skipped (lockout risk) |
| Data & Privacy | View only | Retention / visibility unchanged |
| Delegations | Create + revoke | ORG-B-014 (create retry); ORG-B-016 (UTC timestamps) |
| Personal Access Tokens | Create + revoke | ORG-B-015 (stale row until reload) |
| Webhooks | Create + delete; `javascript:` URL rejected | Contrast with branding ORG-B-004; no Send-test control (UX) |
| Notification sub-tabs | Viewed; template validation; broadcast dialog opened and cancelled | No broadcast sent; no provider/policy changes |
| Round-1 recheck | All 9 org bugs rechecked | ORG-B-001…009 **STILL OPEN** (see BUGS.md) |

## Not covered

| Area | Reason / note |
|---|---|
| Session-policy **save** validation | Not persisted — lockout risk (MFA / max sessions / IP allowlist) |
| Webhook test delivery | No Send-test control in UI; delivery not exercised |

## Limits

- Owner session only; member/viewer paths not checked.
- Danger Zone (Transfer / Archive / Delete org), Modules toggles, Billing/payments, AI credit purchase: not touched.
- Permission groups created this round and in round 1 cannot be deleted from the UI (ORG-B-009); see TEST-DATA.md leftovers.
