# Email System Overhaul — Design Spec

Date: 2026-07-02
Status: Approved
Scope: `backend/src/modules/**` (email templates, senders, call sites). No frontend changes.

## Problem

Email output is inconsistent and low-quality:

- A shared layout exists (`email/templates/base.ts`, used by ~55 templates) but 8 files bypass it with ad-hoc inline HTML and legacy off-brand colors (`#0f2b7f` navy, `#bd882c` gold): payslip, candidate rejection, interview emails (4), offer/no-show cron emails, platform contact-form emails (3), trial reminder, client investment, lead status.
- The logo is hotlinked from `${appUrl}/logo-email.svg`, which resolves to `http://localhost:1000` unless env is set — broken images in real inboxes.
- ~18 orphaned templates are never sent (appraisal reminders x4, CRM x5, account-deactivation, new-device-login, password-expiry, document-expiry, onboarding welcome/tasks, work-log approved/rejected). CRM modules send inline HTML instead of using their templates.
- `escapeHtml` is re-implemented in 6 files. `AutomationEmailService` duplicates the entire Resend/SendGrid provider stack (~156 lines).
- "Payroll Approved" and "Payslip Ready" both fire on the same event.
- Footer hardcodes `support@streamlineos.app` while FROM defaults to `support@streamlineos.in`.
- Copy has AI tells: emoji subjects, exclamation overload, generic filler.

## Decisions (user-approved)

1. **Logo:** text-based wordmark ("StreamlineOS" styled with brand colors) — no hosted image dependency. Layout structured so a hosted logo URL can be swapped in later as a one-line change.
2. **Orphans:** wire the ones whose trigger points already exist; delete templates that would require brand-new features (new-device detection, password-expiry cron, appraisal reminder crons).
3. **Provider dedup:** consolidate `AutomationEmailService` onto the shared `EmailProvider` (keeping its no-outbox behavior).
4. **No new packages.** Keep the pure-TypeScript string-template system; rebuild the layout kit in-house.

## Architecture

### 1. Layout kit — `backend/src/modules/email/templates/layout.ts` + `components.ts`

- `renderEmailLayout({ preheader, heading, content, footerNote? })` — the single wrapper for every email:
  - Text wordmark header with brand-gradient accent bar `#1e40af → #3b82f6 → #06b6d4`.
  - White card on `#EEF3FB` canvas, max 600px, table-based markup, inline styles, system font stack.
  - Env-driven footer (one support address constant; fixes `.in`/`.app` mismatch).
- `components.ts` exports: `renderButton` (gradient CTA, Outlook-safe), `renderKeyValueRows`, `renderCallout` (info/success/warning/danger), `renderBadge`, and the single canonical `escapeHtml`.
- Copy standards: sentence-case subjects, no emoji in subjects, one clear CTA per email, short human sentences.

### 2. Template consolidation

All templates live in `email/templates/` domain files and render through the layout kit. Migrate the 8 bypass files' templates into domain files; delete the stray originals (`hr-payroll/lib/payslip-email.ts`, `hr-recruitment/recruitment-emails.util.ts`, `hr-interviews/interview-emails.util.ts`, `cron/recruitment-emails.util.ts`, inline HTML in `platform/platform.service.ts`, `clients/clients-email.service.ts`, `leads/lead-status.service.ts`, inline trial reminder in `email.service.ts`). Copy-quality pass over all wired templates.

### 3. Orphan resolution

Wire (triggers exist): work-log approved/rejected, account deactivation, onboarding welcome + tasks, review published, CRM events (replace inline HTML with proper templates), document-expiry cron send.
Delete (need new features): new-device-login, password-expiry-warning, appraisal reminder templates (self-review, manager-review, goal-setting).

### 4. Dedup & reliability

- `AutomationEmailService` reuses `EmailProvider`; delete its copied provider/retry/util code.
- Resolve the payroll double-send: keep the payslip delivery email; drop the redundant "Payroll Approved" send if recipients match (verify at implementation).
- Update `test-catalog.ts` to cover every final template; remove entries for deleted ones.

## Validation

Backend build + lint + typecheck green. Preview endpoint renders every template. No orphaned imports of deleted files. PAGES.md updated.

## Out of scope

MFA/OTP email, invoice/receipt emails, subscription-change emails, new-device detection, password-expiry cron (future features). Frontend changes. Git operations (user commits manually).
