# Email System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **GIT BAN (overrides plan-template commit steps):** NO git commands of any kind — no commit, no add, no checkout. The user commits manually. This applies to every subagent too; include this ban in every subagent prompt.
>
> **NO CODE COMMENTS** in any file you write (repo rule). No `console.log`.

**Goal:** One reusable branded email layout + component kit; every StreamlineOS email rendered through it with clean human copy; orphans wired or deleted; duplicated provider/util code removed.

**Architecture:** Keep the pure-TypeScript string-template system in `backend/src/modules/email/templates/`. Rework `base.ts` (text wordmark instead of hotlinked logo image, env-driven footer), add `components.ts` (button, key-value rows, callout, badge, fallback link, single `escapeHtml`). Migrate every bypass template into `templates/` domain files, rewire call sites, wire real orphans, delete speculative ones. `AutomationEmailService` becomes a thin wrapper over the shared provider.

**Tech Stack:** NestJS 10, TypeScript 5.6 strict, Resend + SendGrid, no new packages.

**Spec:** `docs/superpowers/specs/2026-07-02-email-system-overhaul-design.md`

---

## Copy standards (apply to EVERY template)

- **Subject:** sentence case, no emoji, no exclamation marks, ≤60 chars, lead with the fact. Good: `Your expense claim was approved`. Bad: `🎉 Expense Claim Approved!`.
- **Preheader:** always set; one factual sentence extending the subject (not repeating it).
- **Greeting:** `Hi ${escapeHtml(firstName)},` — never "Dear valued employee".
- **Body:** 1–3 short paragraphs max. State the fact → structured details via `renderKeyValueRows` → single CTA via `renderButton`. No second CTA.
- **Banned phrases:** "We hope this email finds you well", "We're thrilled/excited/delighted", "Please do not hesitate", "at your earliest convenience", "Thank you for your patience".
- **No sign-off block** ("Best regards, The Team") — the footer carries the brand.
- **Statuses/warnings** use `renderCallout` with the right tone, not hand-rolled divs.
- **All interpolated user data** goes through `escapeHtml` (import from `./base`).
- **Dates:** human format (`Mon, 12 Jan 2026`), no raw ISO strings in body copy.

## Execution order

- Task 1 first (everything depends on it).
- Tasks 2, 3, 4, 9 are fully parallel (disjoint files).
- Tasks 5, 6, 7, 8 each touch service call sites; they are mutually parallel EXCEPT any two that modify `email.service.ts` / `email-senders.base.ts` — those edits are deferred to Task 10 (consolidation) to avoid conflicts: template-file changes happen in each task; shared-file rewiring happens once in Task 10.
- Task 10 then Task 11 last, sequentially.

---

### Task 1: Layout kit — wordmark, env footer, components

**Files:**
- Modify: `backend/src/modules/email/email.constants.ts`
- Modify: `backend/src/modules/email/templates/base.ts`
- Create: `backend/src/modules/email/templates/components.ts`

- [ ] **Step 1: Export the support email from `email.constants.ts`**

Append (reusing the existing private `getFromEmail`):

```ts
export function getSupportEmail(): string {
  return getFromEmail();
}
```

- [ ] **Step 2: Rework `base.ts` header lockup**

Replace the entire `<!-- Logo lockup -->` table (the one containing `<img src="${appUrl}/logo-email.svg" ...>`) with a pure-HTML wordmark (no image request, renders in every client; Outlook gets solid `bgcolor` fallback for the gradient):

```html
            <!-- MARKER: replace the logo lockup table with this -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:36px;">
              <tr>
                <td width="36" height="36" align="center" valign="middle" bgcolor="#1e40af" style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);">
                  <span style="font-family:'Sora',-apple-system,'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;line-height:36px;display:inline-block;">S</span>
                </td>
                <td style="vertical-align:middle;padding-left:11px;">
                  <span style="font-family:'Sora',-apple-system,'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:600;color:#0b1220;letter-spacing:-0.02em;">Streamline<span style="color:#1e40af;">OS</span></span>
                </td>
              </tr>
            </table>
```

(Do not emit the HTML comment above into the file — repo bans comments; strip `<!-- ... -->` markers. The existing `<!--[if mso]>` conditionals in base.ts are functional Outlook conditionals, NOT comments — keep them.)

- [ ] **Step 3: Rework `base.ts` footer**

`base.ts` gains at top: `import { getSupportEmail } from "../email.constants";` and inside `getEmailTemplate` before the return: `const supportEmail = getSupportEmail();`

Replace the footer inner `<td style="padding:20px 48px 28px;...">` content with:

```html
                  <p style="font-family:'DM Sans',-apple-system,'Segoe UI',sans-serif;font-size:12px;font-weight:600;color:#64748B;margin:0 0 4px 0;">StreamlineOS</p>
                  <p style="font-family:'DM Sans',-apple-system,'Segoe UI',sans-serif;font-size:12px;color:#999;margin:0 0 6px 0;">Enterprise Resource Management &nbsp;&middot;&nbsp; <a href="mailto:${supportEmail}" style="color:#94A3B8;text-decoration:underline;">${supportEmail}</a></p>
                  <p style="font-family:'DM Sans',-apple-system,'Segoe UI',sans-serif;font-size:12px;color:#999;margin:0;"><a href="${appUrl}/privacy" style="color:#94A3B8;text-decoration:underline;">Privacy Policy</a></p>
```

(Removes the hardcoded `support@streamlineos.app` and the dead `https://streamlineos.app/unsubscribe` link — these are transactional emails.)

- [ ] **Step 4: Create `components.ts`**

```ts
import { escapeHtml } from "./base";

export type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, { accent: string; bg: string; text: string }> = {
  info: { accent: "#06b6d4", bg: "rgba(6,182,212,0.05)", text: "#155e75" },
  success: { accent: "#16a34a", bg: "#f0fdf4", text: "#166534" },
  warning: { accent: "#d97706", bg: "#fffbeb", text: "#92400e" },
  danger: { accent: "#dc2626", bg: "#fef2f2", text: "#991b1b" },
};

export function renderButton(label: string, url: string): string {
  return `<a href="${url}" class="email-button" target="_blank" style="display:block;width:100%;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#ffffff;text-decoration:none;font-family:'Sora',-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.02em;padding:16px 32px;border-radius:8px;text-align:center;border:2px solid #1e40af;margin:28px 0;box-sizing:border-box;">${escapeHtml(label)}</a>`;
}

export function renderKeyValueRows(rows: Array<{ label: string; value: string }>): string {
  const items = rows
    .map(
      (row) =>
        `<p class="credential-item" style="margin:8px 0;font-family:'DM Sans',-apple-system,sans-serif;font-size:14px;color:#4A5568;"><span class="credential-label" style="font-weight:600;color:#0b1220;">${escapeHtml(row.label)}:</span><span class="credential-value" style="color:#1e40af;font-family:'Courier New',Courier,monospace;background-color:#ffffff;padding:3px 8px;border-radius:4px;display:inline-block;margin-left:8px;font-size:13px;">${escapeHtml(row.value)}</span></p>`,
    )
    .join("");
  return `<div class="credential-box" style="background-color:#F7F9FF;border-left:4px solid #3b82f6;padding:18px 20px;border-radius:0 8px 8px 0;margin:24px 0;">${items}</div>`;
}

export function renderCallout(text: string, tone: Tone = "info"): string {
  const t = TONES[tone];
  return `<div style="border-left:4px solid ${t.accent};padding:14px 18px;background:${t.bg};border-radius:0 6px 6px 0;margin:24px 0;"><p style="font-family:'DM Sans',-apple-system,'Segoe UI',sans-serif;font-size:13.5px;line-height:1.6;color:${t.text};margin:0;">${text}</p></div>`;
}

export function renderBadge(label: string, tone: Tone): string {
  const t = TONES[tone];
  return `<span style="display:inline-block;font-family:'DM Sans',-apple-system,sans-serif;font-size:12px;font-weight:600;color:${t.text};background:${t.bg};border:1px solid ${t.accent};padding:3px 10px;border-radius:999px;letter-spacing:0.02em;">${escapeHtml(label)}</span>`;
}

export function renderFallbackLink(url: string): string {
  return `<p class="email-text" style="font-size:13px;margin:0 0 8px 0;">If the button doesn't work, copy this link into your browser:</p><span class="fallback-url" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#64748B;word-break:break-all;line-height:1.5;display:block;">${url}</span>`;
}
```

Note: `renderCallout` takes pre-escaped/pre-built HTML text (callers may embed `<strong>`); callers escape their own interpolations. `renderButton`, `renderKeyValueRows`, `renderBadge` escape internally — callers must NOT double-escape values passed to them.

- [ ] **Step 5: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit`
Expected: exit 0.

---

### Task 2: Copy pass — auth.ts + organization.ts (+ delete speculative auth templates)

**Files:**
- Modify: `backend/src/modules/email/templates/auth.ts`
- Modify: `backend/src/modules/email/templates/organization.ts`
- DO NOT touch `index.ts`, `test-catalog.ts`, `email-senders.base.ts` (Task 10 handles those)

- [ ] **Step 1: Rewrite `auth.ts`** — keep exported function names/signatures for the 7 kept templates; use `renderButton`/`renderKeyValueRows`/`renderCallout`/`renderFallbackLink` from `./components`; apply copy standards. Final subjects (each function returns `{ subject, html }` or plain html per its current signature — preserve the current return shape exactly):

| Function | Subject | Body brief |
|---|---|---|
| `getVerificationEmailTemplate` | `Verify your email address` | Fact: confirm the address to activate the account. CTA "Verify email". Callout(info): link expires in 24 hours; ignore if you didn't sign up. Fallback link. |
| `getMagicLinkEmailTemplate` | `Your sign-in link` | Fact: one-click sign-in requested. CTA "Sign in to StreamlineOS". Callout(info): expires in 1 hour, single use. Fallback link. |
| `getPasswordResetEmailTemplate` | `Reset your password` | Fact: reset requested. CTA "Reset password". Callout(warning): expires in 1 hour; if you didn't request this, ignore — your password is unchanged. Fallback link. |
| `getWelcomeEmailTemplate` | `Your StreamlineOS account is ready` | Fact: account created for you at {orgName}. KeyValueRows: Login email. CTA "Set up your account". Callout(info): setup link valid 7 days. |
| `getPasswordChangeConfirmationEmailTemplate` | `Your password was changed` | Fact + timestamp. Callout(danger): if this wasn't you, reset immediately + contact support. CTA "Review account security". |
| `getAccountDeactivationEmailTemplate` | `Your account has been deactivated` | Fact + org name. Callout(info): contact your administrator to restore access. No CTA button. |
| `getAccountLockedEmailTemplate` | `Your account is temporarily locked` | Fact: 5 failed sign-in attempts. Callout(warning): auto-unlocks in 15 minutes, or reset your password now. CTA "Reset password". |

- [ ] **Step 2: DELETE from `auth.ts`:** `getNewDeviceLoginEmailTemplate`, `getPasswordExpiryWarningEmailTemplate` (speculative — no trigger features exist).

- [ ] **Step 3: Rewrite `organization.ts`** — same treatment:

| Function | Subject | Body brief |
|---|---|---|
| `getInvitationEmailTemplate` | `You've been invited to join {orgName}` | Fact: {inviterName} invited you as {role}. CTA "Accept invitation". Callout(info): expires in 7 days. Fallback link. |
| `getHolidayAnnouncementEmailTemplate` | `Upcoming holiday: {name}` | Fact: office holiday on {date}. KeyValueRows: Holiday, Date. No CTA. (Remove emoji.) |
| `getCompanyAnnouncementEmailTemplate` | `Announcement: {title}` | Announcement body as provided (escaped), byline with author + date. CTA "Open StreamlineOS" → `${appUrl}/dashboard`. |

- [ ] **Step 4: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit`
Expected: errors ONLY in files that import the two deleted functions (`templates/index.ts`, possibly `test-catalog.ts`) — record them for Task 10; no other errors. If the error surface is wider, fix before finishing.

---

### Task 3: Copy pass — expense.ts + hr.ts

**Files:**
- Modify: `backend/src/modules/email/templates/expense.ts`
- Modify: `backend/src/modules/email/templates/hr.ts`

- [ ] **Step 1: Rewrite `expense.ts`** (keep function names/signatures):

| Function | Subject | Body brief |
|---|---|---|
| `getExpenseSubmittedEmailTemplate` | `New expense claim from {name}` | To approver. KeyValueRows: Employee, Category, Amount, Date. CTA "Review claim" → HR portal link (keep current URL). |
| `getExpenseApprovedEmailTemplate` | `Your expense claim was approved` | Badge(success) + KeyValueRows: Category, Amount, Approved by. Callout(info): reimbursement follows in the next payout cycle. |
| `getExpenseRejectedEmailTemplate` | `Your expense claim was rejected` | Badge(danger) + KeyValueRows + Callout(warning) with the reason. CTA "View claim". |
| `getExpensePaidEmailTemplate` | `Your expense reimbursement was paid` | KeyValueRows: Amount, Date, Transaction ref (only when provided). |

- [ ] **Step 2: Rewrite `hr.ts`** (keep function names/signatures; this file is 436 lines — if the rewrite exceeds 500 lines split into `hr-leave.ts` + `hr-lifecycle.ts` and note it for Task 10's index update):

| Function | Subject | Body brief |
|---|---|---|
| `getLeaveRequestEmailTemplate` | `Leave request from {name}` | To approver. KeyValueRows: Employee, Type, From, To, Days, Reason. CTA "Review request". |
| `getLeaveStatusUpdateEmailTemplate` | `Your leave request was approved` / `...was rejected` | Badge(success/danger), KeyValueRows, rejection reason via Callout(warning) when present. |
| `getLeaveCancellationEmailTemplate` | `Leave request cancelled by {name}` | To approver. KeyValueRows of the cancelled range. |
| `getResignationSubmittedEmailTemplate` | `Resignation submitted by {name}` | To HR/manager. KeyValueRows: Employee, Notice date, Last working day. CTA "Review resignation". |
| `getResignationApprovedEmailTemplate` | `Your resignation has been accepted` | KeyValueRows: Last working day. Callout(info) with concise next steps (handover, assets, final settlement). |
| `getTerminationEmailTemplate` | `Notice of employment termination` | Formal, factual tone. KeyValueRows: Effective date. Callout(info): contact {hrEmail} for questions. No marketing warmth. |
| `getDocumentExpiryReminderEmailTemplate` | `Action needed: {documentName} expires soon` | KeyValueRows: Document, Expires on. Callout(warning). CTA "Update document". |

- [ ] **Step 3: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit`
Expected: no NEW errors beyond the known Task-2 deletions.

---

### Task 4: Copy pass — project.ts + reports.ts + notifications-crm-hr.ts + notifications-misc.ts

**Files:**
- Modify: `backend/src/modules/email/templates/project.ts`
- Modify: `backend/src/modules/email/templates/reports.ts`
- Modify: `backend/src/modules/email/templates/notifications-crm-hr.ts`
- Modify: `backend/src/modules/email/templates/notifications-misc.ts`

- [ ] **Step 1: `project.ts`:**

| Function | Subject | Body brief |
|---|---|---|
| `getProjectAssignmentEmailTemplate` | `You've been added to {projectName}` | KeyValueRows: Project, Role, Added by. CTA "Open project". Drop the "What's Next" listicle. |
| `getTicketAssignmentEmailTemplate` | `Ticket assigned: {title}` | Badge for priority (danger=urgent/high, warning=medium, info=low). KeyValueRows: Ticket, Project, Priority, Due. CTA "Open ticket". |
| `getTicketReviewRequestEmailTemplate` | `Ready for review: {title}` | KeyValueRows + optional comment via Callout(info). CTA "Review ticket". |
| `getTicketChangesRequestedEmailTemplate` | `Changes requested: {title}` | Feedback via Callout(warning). CTA "Open ticket". |

- [ ] **Step 2: `reports.ts`:** keep the data tables (they are the content) but restyle to kit colors, subjects: `Attendance report — week of {date}`, `Expense report — {Month YYYY}`. Intro line states period + org, no filler.

- [ ] **Step 3: `notifications-crm-hr.ts`:**

| Function | Subject | Body brief |
|---|---|---|
| `getTaskAssignedEmailTemplate` | `Task assigned: {title}` | KeyValueRows: Task, Due, Priority (badge), Assigned by. CTA "Open task". |
| `getDealStageChangeEmailTemplate` | `Deal stage updated: {dealName}` | KeyValueRows: Deal, From → To stage, Value. CTA "Open deal". |
| `getLeadAssignedEmailTemplate` | `Lead assigned: {leadName}` | KeyValueRows: Lead, Company, Priority (badge), Source. CTA "Open lead". |
| `getReviewAssignedEmailTemplate` | `Performance review assigned` | KeyValueRows: Review cycle, Due date, Reviewee/Reviewer as applicable. CTA "Start review". |
| `getAssetAssignedEmailTemplate` | `Asset assigned: {assetName}` | KeyValueRows: Asset, Serial (when provided), Assigned on. |
| `getPayrollApprovedEmailTemplate` | KEEP FOR NOW | Task 7 decides deletion after verifying recipients; do a copy pass anyway (`Payroll approved for {period}`). |

- [ ] **Step 4: `notifications-misc.ts`:**

| Function | Subject | Body brief |
|---|---|---|
| `getOnboardingWelcomeEmailTemplate` | `Welcome to {orgName}` | Fact: onboarding starts {date}. CTA "Start onboarding". One warm-but-plain sentence, no confetti language. |
| `getOnboardingTaskEmailTemplate` | `Onboarding tasks assigned to you` | KeyValueRows: New joiner, Task count, Due. CTA "View tasks". |
| `getOnboardingCompleteEmployeeEmailTemplate` | `Onboarding complete` | Fact + CTA "Go to dashboard". |
| `getOnboardingCompleteHrEmailTemplate` | `{name} completed onboarding` | KeyValueRows: Employee, Completed on. |
| `getTicketCreatedEmailTemplate` | `New support ticket: {subject}` | Priority badge, KeyValueRows, CTA "Open ticket". |
| `getTicketReplyEmailTemplate` | `New reply on ticket #{n}` | Reply preview (≤200 chars, escaped) in Callout(info). CTA "View conversation". |
| `getTicketStatusEmailTemplate` | `Ticket #{n} status: {status}` | Status badge + CTA. |
| `getHelpdeskTicketEmailTemplate` | `New helpdesk ticket: {subject}` | Same shape as ticket created. |
| `getWorkLogApprovedEmailTemplate` | `Your work log was approved` | Badge(success), KeyValueRows: Period, Hours, Approved by. |
| `getWorkLogRejectedEmailTemplate` | `Your work log needs changes` | Callout(warning) with reason. CTA "Edit work log". |

- [ ] **Step 5: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit`
Expected: no NEW errors.

---

### Task 5: CRM consolidation — crm.ts templates + rewire inline senders

**Files:**
- Modify: `backend/src/modules/email/templates/crm.ts`
- Modify: `backend/src/modules/clients/clients-email.service.ts`
- Modify: `backend/src/modules/leads/lead-status.service.ts`
- Read first: every send call in `backend/src/modules/clients/**`, `backend/src/modules/leads/**`, `backend/src/modules/deals/**` (or wherever deal-won/SLA triggers live — grep for `dispatchEmail|sendEmail|enqueueAndTry` under `crm|clients|leads|deals`)

- [ ] **Step 1: Audit CRM send sites.** Grep the modules above for email sends. Map each real trigger to a template. Known: `clients-email.service.ts#notificationEmailHtml` (client investment, gold `#bd882c` inline) and `lead-status.service.ts#notificationEmailHtml` (lead status change, minimal inline).

- [ ] **Step 2: Rewrite `crm.ts`:** keep + rewire templates that have a real trigger; DELETE the rest. Expected outcome (adjust to audit findings):
  - ADD `getClientInvestmentEmailTemplate` — subject `Investment recorded for {clientName}`, KeyValueRows: Client, Amount, Date, Recorded by. CTA "Open client".
  - ADD `getLeadStatusChangeEmailTemplate` — subject `Lead status updated: {leadName}`, From → To status, CTA "Open lead".
  - For each of `getLeadWelcomeEmail`, `getFollowUpReminderEmail`, `getDealWonEmail`, `getSlaBreachAlertEmail`, `getClientOnboardingEmail`: wire it in Step 3 if the audit found its trigger, otherwise DELETE it. Copy briefs if kept: lead welcome `Thanks for reaching out to {orgName}` (external tone, no internal links); follow-up `Follow-up due: {leadName}`; deal won `Deal closed: {dealName}` (internal); SLA `SLA breached: {itemName}` Callout(danger); client onboarding `Welcome to {orgName}` (external tone).

- [ ] **Step 3: Rewire call sites.** Replace the inline `notificationEmailHtml` builders in `clients-email.service.ts` and `lead-status.service.ts` with imports of the new templates; delete the local `escapeHtml` copies and inline HTML. If deal-won/SLA triggers exist, swap their inline HTML to the templates too. Keep each service's existing send mechanics (outbox vs direct) unchanged.

- [ ] **Step 4: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → no NEW errors.
Run: `grep -rn "bd882c" backend/src` → no matches.

---

### Task 6: Recruitment + interviews — migrate standalone templates

**Files:**
- Create: `backend/src/modules/email/templates/recruitment.ts`
- Create: `backend/src/modules/email/templates/interviews.ts`
- Delete: `backend/src/modules/hr-recruitment/recruitment-emails.util.ts`
- Delete: `backend/src/modules/cron/recruitment-emails.util.ts`
- Delete: `backend/src/modules/hr-interviews/interview-emails.util.ts`
- Modify: every importer of those three files (grep `recruitment-emails.util|interview-emails.util` to find them; update imports + any renamed args)

- [ ] **Step 1: Create `recruitment.ts`** using the kit (`getEmailTemplate` + components), preserving each original function's parameter data (read the old files first):

| Function | Subject | Body brief |
|---|---|---|
| `getCandidateRejectionEmail` | `Update on your application to {orgName}` | External tone, kind + plain: thank for time, not moving forward, encourage future applications. No CTA. No internal links. |
| `getOfferDeadlineReminderEmail` | `Reminder: your offer expires on {date}` | KeyValueRows: Position, Offer expires. CTA "Review offer" (keep original link). Callout(warning) about the deadline. |
| `getInterviewNoShowRescheduleEmail` | `Let's reschedule your interview` | Fact: we missed you at {date}. CTA "Pick a new time" (keep original reschedule link). |

- [ ] **Step 2: Create `interviews.ts`:**

| Function | Subject | Body brief |
|---|---|---|
| `getInterviewInviteEmail` | candidate: `Interview invitation — {jobTitle} at {orgName}`; interviewer: `You're interviewing {candidateName} on {date}` | Keep the dual-role behavior of the original. KeyValueRows: Position, Date & time, Duration, Location/link, Interviewer(s)/Candidate. CTA "Add to calendar" or original link. |
| `getSelfScheduleBookingEmail` | `Schedule your interview with {orgName}` | CTA "Choose a time" → self-schedule URL. Callout(info): link validity if the original states one. |
| `getBookingConfirmationEmail` | `{candidateName} scheduled their interview` | Internal (HR). KeyValueRows: Candidate, Position, Slot. |
| `getCandidateFeedbackEmail` | `How was your interview experience?` | Keep the original mailto rating mechanism, restyled as kit buttons/links. |

- [ ] **Step 3: Update all importers** to the new paths (`../email/templates/recruitment`, `../email/templates/interviews`), delete the three old files, confirm nothing else imports them: `grep -rn "recruitment-emails.util\|interview-emails.util" backend/src` → no matches.

- [ ] **Step 4: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → no NEW errors.
Run: `grep -rn "0f2b7f" backend/src` → matches only in files Task 7 owns (platform/trial), else none.

---

### Task 7: Payroll + platform + trial reminder

**Files:**
- Create: `backend/src/modules/email/templates/payroll.ts`
- Create: `backend/src/modules/email/templates/platform.ts`
- Delete: `backend/src/modules/hr-payroll/lib/payslip-email.ts`
- Modify: `backend/src/modules/platform/platform.service.ts` (remove `buildAdminNotificationHtml`, `buildCustomerAutoreplyHtml`, `buildReplyHtml`, local `escapeHtml`)
- Modify: `backend/src/modules/email/email.service.ts` (ONLY the inline HTML inside `sendTrialReminderEmail` — swap to the new template; no other edits to this shared file)
- Modify: payslip sender call site (grep `payslip-email` / `getPayslipEmailHtml`) — likely `hr-payroll/payrolls-status.service.ts`

- [ ] **Step 1: Create `payroll.ts`** with `getPayslipEmailTemplate` — subject `Your payslip for {Month YYYY}`, body: fact (payslip attached as PDF), KeyValueRows: Period, Net pay (only if the old template showed it — read it first), Callout(info): the PDF is password-protected / contact HR for discrepancies (mirror whatever the original said, cleaned up).

- [ ] **Step 2: Resolve the payroll double-send.** Read the payslip/payroll-approved send sites in `hr-payroll` (grep `getPayrollApprovedEmailTemplate`). If both emails go to the same employee for the same payroll event, DELETE the `getPayrollApprovedEmailTemplate` send call AND the template (record for Task 10's index/catalog cleanup). If recipients differ (e.g. approver vs employee), keep both and note why.

- [ ] **Step 3: Create `platform.ts`** with four templates:

| Function | Subject | Body brief |
|---|---|---|
| `getContactAdminNotificationEmail` | `New {topic} message from {name}` | Internal. KeyValueRows: Name, Email, Topic, Received. Message body in Callout(info). CTA "Open inbox". |
| `getContactAutoreplyEmail` | `We received your message` | External. Fact: got it, we reply within 1 business day. Echo of their message in Callout(info). No internal links. |
| `getContactReplyEmail` | `Re: {subject}` | External. The reply body (escaped, line breaks preserved), quoted original below a divider. |
| `getTrialReminderEmail` | `Your trial ends in {n} days` | KeyValueRows: Plan, Trial ends. CTA "Choose a plan". Callout(warning) only when n <= 3. |

- [ ] **Step 4: Rewire** `platform.service.ts` and `email.service.ts#sendTrialReminderEmail` to the new templates; delete the inline builders + the local `escapeHtml` in platform.service.ts; update payslip call site import; delete `hr-payroll/lib/payslip-email.ts`.

- [ ] **Step 5: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → no NEW errors.
Run: `grep -rn "0f2b7f\|payslip-email" backend/src` → no matches.

---

### Task 8: Wire real orphans

**Files (locate exactly via grep before editing):**
- Modify: work-log approve/reject service (`backend/src/modules/**/work-logs*.ts`)
- Modify: account deactivation service (grep `deactivat` under `hr-directory|users|auth` modules)
- Modify: onboarding start flow (grep `onboarding` services for where onboarding is created/started — the "complete" emails are already wired there as reference pattern)
- Modify: review publish flow (grep `publish` in `hr-appraisals|appraisal` module)
- Modify: document-expiry cron (existing cron module — follow the pattern of `CronEmailOutboxService` / other crons in `backend/src/modules/cron/`)

Rules for every wiring: follow the exact send pattern used by neighboring emails in that service (outbox `enqueueAndTry` vs direct dispatch); never block the main mutation on email failure (wrap in try/catch + logger like neighbors do); tenant-scope every query; NO new endpoints.

- [ ] **Step 1: Work logs** — in the approve handler send `getWorkLogApprovedEmailTemplate` to the log owner; in the reject handler send `getWorkLogRejectedEmailTemplate` with the rejection reason.
- [ ] **Step 2: Account deactivation** — where a user is deactivated, send `getAccountDeactivationEmailTemplate` to the user's email.
- [ ] **Step 3: Onboarding start** — where onboarding is initiated for a new joiner: `getOnboardingWelcomeEmailTemplate` to the employee; `getOnboardingTaskEmailTemplate` to assignees of generated tasks (dedupe recipients; one email per assignee, not per task — aggregate task count).
- [ ] **Step 4: Review published** — if the appraisal module has a publish/finalize action, send `getReviewPublishedEmail` (subject copy pass: `Your performance review is ready`, CTA "View review") to the reviewee. If NO publish action exists, DELETE `getReviewPublishedEmail` instead. Either way DELETE `getSelfReviewReminderEmail`, `getManagerReviewReminderEmail`, `getGoalSettingReminderEmail` from `appraisal.ts` (need nonexistent crons). If all four go, delete `appraisal.ts` entirely; record for Task 10.
- [ ] **Step 5: Document expiry cron** — add a daily cron method to the existing cron module (same schedule/registration pattern as existing crons) that finds employee documents expiring within 30 days (reuse whatever query the existing document-expiry GET endpoint uses — do not duplicate its logic; extract/share it), sends `getDocumentExpiryReminderEmailTemplate` per document owner, and records last-notified to avoid daily re-spam (follow existing cron dedupe patterns; if none exists, only notify at 30/14/7/1 days-to-expiry boundaries).
- [ ] **Step 6: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → no NEW errors.

---

### Task 9: Provider dedup — AutomationEmailService

**Files:**
- Modify: `backend/src/modules/automation/automation-email.service.ts`

- [ ] **Step 1: Replace the body** with a thin wrapper over the shared provider (preserves its two behavioral quirks: silent skip when no provider; no outbox):

```ts
import { Injectable } from "@nestjs/common";
import { logger } from "../../common/logger/logger.service";
import { dispatchEmail, getEmailProvider } from "../email/email.provider";

export interface AutomationEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class AutomationEmailService {
  async send(options: AutomationEmailOptions): Promise<void> {
    if (getEmailProvider() === "none") {
      logger.warn("automation.email skipped: no provider configured", {
        subject: options.subject,
        hint: "Set EMAIL_PROVIDER + RESEND_API_KEY (or SENDGRID_API_KEY) in .env",
      });
      return;
    }
    await dispatchEmail(options);
  }
}
```

Behavior note: FROM address now comes from `email.constants.getFromAddress()` (fallback `support@streamlineos.in`) instead of the old `no-reply@streamlineos.app` — this is the intended unification. Gains 4xx provider fallback for free.

- [ ] **Step 2: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → no NEW errors.
Run: `grep -rn "new Resend\|sgMail" backend/src/modules/automation` → no matches.

---

### Task 10: Consolidation — index.ts, test-catalog.ts, senders

**Files:**
- Modify: `backend/src/modules/email/templates/index.ts`
- Modify: `backend/src/modules/email/templates/test-catalog.ts`
- Modify: `backend/src/modules/email/email-senders.base.ts` and/or `backend/src/modules/email/email.service.ts` (only if Tasks 5–8 recorded needed sender-helper additions/removals)

- [ ] **Step 1: Update `index.ts`:** remove exports of deleted functions (new-device, password-expiry, appraisal deletions, any CRM deletions, `getPayrollApprovedEmailTemplate` if Task 7 removed it); add exports for `components.ts` helpers and the new domain files (`recruitment.ts`, `interviews.ts`, `payroll.ts`, `platform.ts`, plus any hr split).
- [ ] **Step 2: Update `test-catalog.ts`:** every final template has a preview entry with realistic sample data; deleted templates have no entry. Group by domain.
- [ ] **Step 3: Reconcile sender helpers:** ensure every template wired in Tasks 5–8 has its typed sender (following `email-senders.base.ts` conventions) and no sender remains for deleted templates.
- [ ] **Step 4: Verify**

Run: `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → exit 0, ZERO errors now.
Run: `grep -rn "getNewDeviceLoginEmailTemplate\|getPasswordExpiryWarningEmailTemplate" backend/src` → no matches.

---

### Task 11: Final validation

- [ ] **Step 1:** `cd D:/projects/personal/Streamlineos/backend && npx tsc --noEmit` → exit 0.
- [ ] **Step 2:** `pnpm -C D:/projects/personal/Streamlineos/backend lint` → exit 0 (fix any findings).
- [ ] **Step 3:** `pnpm -C D:/projects/personal/Streamlineos/backend build` → exit 0.
- [ ] **Step 4: Dedup/quality greps** — all must return no matches:
  - `grep -rn "0f2b7f\|bd882c" backend/src`
  - `grep -rnE "function escapeHtml" backend/src --include="*.ts"` → exactly ONE match (`templates/base.ts`)
  - `grep -rn "logo-email.svg" backend/src`
  - `grep -rn "streamlineos.app/unsubscribe" backend/src`
- [ ] **Step 5: Render check** — for each entry in `test-catalog.ts`, confirm the render function executes without throwing (script it: import the catalog in a ts-node one-off or rely on the e2e preview spec if present).
- [ ] **Step 6:** Update `PAGES.md` (root or wherever it lives — check) with a one-line summary of the email overhaul.
- [ ] **Step 7:** Report: Findings · Root cause · Solution · Files changed · Validation results. NO git commands.
