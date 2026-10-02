# Asana account research

- **Status:** `BLOCKED`
- **Timestamp:** resumed 2026-10-01 09:20 IST (UTC+05:30)
- **Intended plan:** Free only. The public signup page explicitly said “Try Asana for free. No credit card required.” No purchase or paid upgrade was initiated.
- **Email:** Disposable `mail.tm` mailbox. Credentials/API token are in `.account-secrets.json` (mode 600); they are intentionally not repeated here.
- **Requested workspace/org:** `PXC-CI-Asana-20261001` — not reached/created because onboarding could not be completed.

## What completed

1. Opened `https://app.asana.com/-/login` and `https://asana.com/create-account`.
2. Signup requested a work email and sent an Asana verification email.
3. Verified the email through the disposable mailbox and reached `https://app.asana.com/0/account_setup`.
4. Completed onboarding step 1 (name/password).
5. Resumed onboarding without touching the flaky job-title field: clicking **Continue** with that field empty advanced to the industry step.
6. Selected the suggested **Technology & software** chip. The next personalization transition crashed.

## Auth chrome observed

- Login buttons: **Google**, **Microsoft**.
- Email modality: **Email address** textbox plus **Continue**.
- Login footer displayed a reCAPTCHA notice and links to support, integrations, forum, developer/API, resources, guide, templates, pricing, terms, and privacy.
- A password field was observed in onboarding step 1, but a standalone password-login screen was not reached.
- No separate SSO button or SAML/SCIM control was observed.

## Blocker

The initial job-title field was avoided successfully. After selecting the industry chip and pressing **Continue**, the Chromium renderer again showed **“Aw, Snap! Something went wrong while displaying this webpage. Error code: 9”** during personalization. This is a reproduced blocker even without clicking the job-title text field. Evidence: `evidence/03-industry-chip-selected.png` and `evidence/04-crash-after-industry-chip.png` (prior crash evidence remains in `01`/`02`). Per instruction, stopped after this recurrence.

No captcha/Turnstile was shown. Because onboarding could not finish, no signed-in workspace surfaces could be walked.
