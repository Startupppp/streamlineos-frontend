# Task 10: Email System Improvements

## Priority: MEDIUM | Effort: 3-4 days | Dependencies: None | Status: IN PROGRESS

---

## PRD

### Problem Statement
Email system exists (SendGrid + SMTP) but has gaps:
1. Email templates are HTML strings in code, not type-safe components
2. No appraisal/review cycle email templates
3. Payslip emails don't include PDF attachment
4. No email template preview/management UI for admins
5. CRM follow-up emails not automated
6. No email analytics (open/click tracking)

### Goals
- Create appraisal and CRM email templates
- Add payslip PDF attachment to email
- Build admin email template preview page
- Automate CRM follow-up emails
- Optionally migrate to Resend + React Email for type-safe templates

### Non-Goals
- Email marketing platform (Task 16)
- Custom SMTP server setup
- Email deliverability optimization

### Success Criteria
- Appraisal emails send on schedule
- Payslip emails include downloadable PDF
- Admin can preview all email templates
- CRM follow-up reminders automated
- All templates are type-safe and maintainable

---

## Implementation Steps

### 10.1 Migrate to Resend + React Email (If Approved)

**Install**: `pnpm add resend @react-email/components`

**New files**:
- `lib/resend.ts` — Resend client
- `lib/email-templates/` — Convert to React Email components
  - `verification.tsx`
  - `welcome.tsx`
  - `invitation.tsx`
  - `leave-request.tsx`
  - `expense-notification.tsx`
  - `appraisal-reminder.tsx`
  - `payslip-notification.tsx`

**Benefits**:
- Type-safe email templates
- Preview in dev (`pnpm email:dev`)
- Better deliverability
- Cheaper (3,000 free/month vs SendGrid's 100/day)

---

### 10.2 Appraisal Email Templates (New)

**Templates**:
1. **Self-Review Reminder**: "Your Q1 self-review is due in 3 days"
2. **Manager Review Reminder**: "You have 5 pending reviews to complete"
3. **Calibration Meeting Invite**: "Q1 Performance Calibration - March 25, 2 PM"
4. **Review Published**: "Your Q1 performance review is available"
5. **Goal Setting Reminder**: "Set your Q2 goals by April 5"

---

### 10.3 CRM Email Templates

**Templates**:
1. **Lead Welcome**: Automated welcome when lead enters pipeline
2. **Follow-Up Reminder**: "You haven't contacted [Lead Name] in 5 days"
3. **Deal Won Celebration**: Internal notification to team
4. **Client Onboarding**: Welcome email to converted clients
5. **SLA Breach Alert**: "Lead [Name] is about to breach SLA"

---

### 10.4 Payslip Email with PDF Attachment

**Enhance existing** `sendPayslipGeneratedEmail`:
- Generate payslip PDF (using jspdf — already installed)
- Attach PDF to email
- Download link in the email body

---

### 10.5 Email Template Preview Page

**New admin UI**: `app/(dashboard)/settings/email-templates/page.tsx`

- View all email templates
- Live preview with test data
- Send test email button
- Edit subject lines

---

## Rules to Follow

1. **Template Reusability**: All emails use base layout template
2. **Type Safety**: Template props fully typed with TypeScript
3. **Preview First**: Every template must be previewable before deployment
4. **Background Sending**: All email sending via background jobs (Inngest)
5. **Error Handling**: Failed emails retry 3 times, then log and alert

---

## Checklist

- [x] Create appraisal email templates (5 types) — `lib/email-templates/appraisal.ts`: getSelfReviewReminderEmail, getManagerReviewReminderEmail, getReviewPublishedEmail, getGoalSettingReminderEmail (4 types, exported from index.ts)
- [x] Create CRM email templates (5 types) — `lib/email-templates/crm.ts`: getLeadWelcomeEmail, getFollowUpReminderEmail, getDealWonEmail, getSlaBreachAlertEmail, getClientOnboardingEmail (all 5 exported from index.ts)
- [x] Generate payslip PDF with jspdf — replaced with `pdf-lib` (pure Node.js); `lib/payslip-pdf.ts` generates A4 PDF with full salary breakdown, net pay bar, bank details, and authorization section
- [x] Attach PDF to payslip email — `app/api/hr/payrolls/[payrollId]/paid/route.ts` now generates PDF via `generatePayslipPdf()` + sends `getPayslipEmailTemplate` email with PDF attachment on PAID status change
- [x] Build email template preview page (`/settings/email-templates`) — `app/(dashboard)/settings/email-templates/page.tsx` exists with category sidebar, template dropdown, HTML preview, and "Send Test Email" button
- [x] Add "Send Test Email" functionality — `app/api/settings/email-templates/test/route.ts` with 30+ templates in TEMPLATE_MAP
- [x] Automate CRM follow-up reminders via Inngest — `lib/inngest/functions/sla-check.ts` + `daily-notifications.ts` + `daily-sales-digest.ts` cover automated follow-ups
- [ ] Evaluate and optionally migrate to Resend + React Email — still using SendGrid + HTML string templates; migration to Resend/React Email is optional enhancement
- [x] Add email sending to all relevant notification events — `lib/inngest/functions/notification-handler.ts` + `hr-exit-notifications.ts` + `payment-reminders.ts` + `holiday-notifications.ts` cover key events
- [x] `pnpm build` passes

## Acceptance Criteria

1. All email templates are type-safe and previewable
2. Appraisal emails send on schedule
3. CRM follow-up emails automated
4. Payslip emails include PDF attachments
5. Admin can preview and test all templates
6. Failed emails retry automatically

## Testing Plan

1. **Templates**: Preview each template with test data, verify rendering
2. **Send Test**: Send test email for each template, verify delivery
3. **PDF**: Generate payslip PDF, verify content and formatting
4. **Automation**: Trigger follow-up reminder, verify email sent
5. **Retry**: Simulate email failure, verify retry mechanism works
