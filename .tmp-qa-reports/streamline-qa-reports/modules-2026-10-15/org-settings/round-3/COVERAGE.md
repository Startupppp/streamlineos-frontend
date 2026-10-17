# Coverage — Org Settings, Round 3 (2026-10-15)

Final regression round. Target https://www.streamlineos.in · Owner's own session · org "ADitay CAhala" · prefix QA1015R3 · one tab in the normal window (no incognito used in Part A).
Input sources: round-1 BUGS-ORG-ONBOARDING.md, round-2 BUGS.md and COVERAGE.md, round-2 UX.md.

## Recheck (ORG-B-001..016)

| ID range | Result |
|---|---|
| 001–007 (General, Branding, Localization, Business Hours) | All checked. All STILL OPEN; each setting reverted and verified after reload. |
| 008–009 (Permission groups, no delete) | Checked. Both STILL OPEN. |
| 010 (maxlength on Legal name / Registration) | STILL OPEN; typed over-limit values, cancelled. |
| 011 (Branch phone) | STILL OPEN; branch archived after test. |
| 012 (Team capacity) | PARTLY CHANGED: -3 and 2.5 blocked silently in the browser. |
| 013 (Cost-centre 409) | PARTLY CHANGED: toast now appears after about 20 s. |
| 014 (Network errors) | NOT REPRODUCED as network error; latency still present. |
| 015 (PAT stale row) | STILL OPEN. |
| 016 (UTC timestamps) | STILL OPEN (audit log, PAT expiry default). |

## New areas this round

| Area | What was done | Result |
|---|---|---|
| Notification preference saves | Toggled "Play sound" (survived reload; reverted). Set Quiet hours start and end (saved; reverted to blank). | No bugs. Toggles save silently (UX). An earlier empty result was my own test error (Tab moves within a time field, does not blur it). |
| Data export request | My Account (/settings), Members & Access (/settings/users) and Organization have no export request control. Audit Log "Export CSV" was tested: a 258-row CSV downloaded (no PII recorded here). | Export works; it is the only org-level export found. HR employee export lives in HRMS (out of scope). |
| Billing & Plan (read-only) | Plan, Invoices & Payments, Billing Profile tabs read. No Upgrade, coupon, or Save Profile clicked. | ORG-B-028 (raw keys, Upgrade on current plan). Invoices tab: "No payments yet". |
| Audit log | UI list (footer, pagination page 2), filters present, CSV export read in Shell. | ORG-B-017, 018, 019, 020; timestamps UTC (ORG-B-016). |
| Branding preview | Opened Email template preview; set primary colour in the hex field; preview updated live. | Preview works (good). ORG-B-021 (Enter saves), ORG-B-022 (secondary). Reverted. |
| Keyboard | Tab order from top header through sidebar; focus ring visible. | No blocking bug; see UX.md. Full form keyboard walk not repeated (time). |
| Mobile viewport | Browser zoom to 400% (about 320 CSS px) with Computer; the layout switches to a mobile header and bottom tab bar. Restored to 100%. | ORG-B-023 (floating button covers Edit). Browser window itself could not be resized to 390 px from the tools; 320 px was used as the narrower test. |

## Other areas touched (not new bugs)

- Roles & Permissions: Roles tab "More role tools" = Audit, Simulate (ORG-B-009).
- Departments, Teams, Branches, Cost Centers: create, archive (all archived after test).
- Personal Access Tokens: create, revoke (token revoked).
- Session policy, App Configuration, Data & Privacy, Danger zone: viewed only; not saved (lockout and public-visibility risk). Danger zone not clicked.
- Modules, delegations, webhooks: not touched in round 3.

## Not covered / limits

- Session policy save validation (not saved; lockout risk) — still untested.
- Webhook test delivery — no Send-test control (see round 2 UX).
- Holiday calendar: not re-tested this round (state: none).
- ORG-B-027 crash: not reproduced after three attempts.
- Narrow viewport at exactly 390 px: not possible with the available tools; 320 px used.
- Owner session only; member/viewer paths not checked.
