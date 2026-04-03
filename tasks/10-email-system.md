# Task 10: Email System Improvements

## Priority: 🟡 MEDIUM

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

**Acceptance Criteria**:
- All email templates are type-safe components
- Appraisal emails send on schedule
- CRM follow-up emails automated
- Payslips have PDF attachments
- Admin can preview all templates
