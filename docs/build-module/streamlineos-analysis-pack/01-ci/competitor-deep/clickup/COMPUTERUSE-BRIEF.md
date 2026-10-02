# computerUse brief — ClickUp competitor deep walk

## Outcome
Create free ClickUp account and walk EVERY reachable signed-in nav surface. Save screenshots under `/workspace/streamlineos-ci/competitor-deep/clickup/evidence/`. Write structured notes to `/workspace/streamlineos-ci/competitor-deep/clickup/WALK-NOTES.json` covering each surface + full Filters grammar.

## Account (use these exact values)
- Email: pxcci1790825187@uberip.com
- Workspace name: PXC-CI-ClickUp-20261001
- Plan: Free Forever only — no purchase, no paid trial upsell acceptance
- Do NOT use any real/Aditya email
- Password: invent a strong disposable password; write it ONLY into `/workspace/streamlineos-ci/competitor-deep/clickup/.account-secrets.json` (merge, do not wipe mail fields)

## Mail OTP
Disposable inbox is mail.tm. Token in `.account-secrets.json` field `mail_token`.
Poll: `GET https://api.mail.tm/messages` with `Authorization: Bearer <mail_token>`.
Fetch message body for OTP/link.

## Start URLs
1. https://app.clickup.com/signup
2. Also open https://app.clickup.com/login once for auth-modality chrome evidence

## Constraints
- Free plan only; cancel any checkout
- If Turnstile/captcha/recaptcha blocks signup after reasonable attempt: STOP, screenshot exact error, write status BLOCKED into WALK-NOTES.json — do not invent signed-in features
- Create one Space + one List + 1–2 tasks so filters have data; cancel destructive actions
- Open Filters on List, Board, Table, Calendar, Gantt views; document EVERY filter field, operators, AND/OR, nested, save/share, chips
- Inspect (do not mutate permanently): Templates, Goals, Docs, Whiteboards, Dashboards, Automations, Forms, Guests/sharing, Settings (members, permissions, notifications)
- Screenshots named `NN-surface-slug.png`

## Success criteria
- Signed in OR clear BLOCKED with evidence
- ≥20 distinct surfaces noted if signed in
- Filters grammar complete (fields/operators/save/share/chips)
- WALK-NOTES.json written for parent docs
