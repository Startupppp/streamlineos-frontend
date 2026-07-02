# Consolidation notes for Task 10 (running log)

Input for the Task 10 agent. Each wave agent's findings that touch the SHARED files (index.ts, test-catalog.ts, email-senders.base.ts, email.service.ts) are recorded here.

## From Task 1 (layout kit)
- RESOLVED: grep for `support@streamlineos.app` in backend/src now returns nothing — no action needed.

## From Task 3 (expense.ts + hr.ts) — subject alignment at call sites
Templates return HTML; inbox subjects are set at sender call sites (email-senders.base.ts / email.service.ts). Align sender subject strings to:

| Template | New subject |
|---|---|
| getExpenseSubmittedEmailTemplate | New expense claim from {name} |
| getExpenseApprovedEmailTemplate | Your expense claim was approved |
| getExpenseRejectedEmailTemplate | Your expense claim was rejected |
| getExpensePaidEmailTemplate | Your expense reimbursement was paid |
| getLeaveRequestEmailTemplate | Leave request from {name} |
| getLeaveStatusUpdateEmailTemplate | Your leave request was approved / Your leave request was rejected |
| getLeaveCancellationEmailTemplate | Leave request cancelled by {name} |
| getResignationSubmittedEmailTemplate | Resignation submitted by {name} |
| getResignationApprovedEmailTemplate | Your resignation has been accepted |
| getTerminationEmailTemplate | Notice of employment termination |
| getDocumentExpiryReminderEmailTemplate | Action needed: {documentName} expires soon |

Notes: getExpenseRejectedEmailTemplate and getDocumentExpiryReminderEmailTemplate have NO link param, so no CTA — if senders can supply a URL, consider extending the signature in Task 10 (only if trivial; otherwise leave).

## From Task 2 (auth.ts + organization.ts) — subject alignment at call sites
All auth/org templates return plain HTML strings; subjects live at send sites. Align to:

| Template | New subject |
|---|---|
| getVerificationEmailTemplate | Verify your email address |
| getMagicLinkEmailTemplate | Your sign-in link |
| getPasswordResetEmailTemplate | Reset your password |
| getWelcomeEmailTemplate | Your StreamlineOS account is ready |
| getPasswordChangeConfirmationEmailTemplate | Your password was changed |
| getAccountDeactivationEmailTemplate | Your account has been deactivated |
| getAccountLockedEmailTemplate | Your account is temporarily locked |
| getInvitationEmailTemplate | You've been invited to join {orgName} |
| getHolidayAnnouncementEmailTemplate | Upcoming holiday: {name} |
| getCompanyAnnouncementEmailTemplate | Announcement: {title} |

Already handled by Task 2 itself: index.ts export removals + test-catalog entries for the two deleted auth templates (auth.new_device, auth.password_expiry).

## From Task 4 (project/reports/notifications-crm-hr/notifications-misc) — subject alignment at call sites
| Template | New subject |
|---|---|
| getProjectAssignmentEmailTemplate | You've been added to {projectName} |
| getTicketAssignmentEmailTemplate | Ticket assigned: {title} |
| getTicketReviewRequestEmailTemplate | Ready for review: {title} |
| getTicketChangesRequestedEmailTemplate | Changes requested: {title} |
| getWeeklyAttendanceReportTemplate | Attendance report — week of {date} |
| getMonthlyExpenseReportTemplate | Expense report — {Month YYYY} |
| getTaskAssignedEmailTemplate | Task assigned: {title} |
| getDealStageChangeEmailTemplate | Deal stage updated: {dealName} |
| getLeadAssignedEmailTemplate | Lead assigned: {leadName} |
| getReviewAssignedEmailTemplate | Performance review assigned |
| getAssetAssignedEmailTemplate | Asset assigned: {assetName} |
| getPayrollApprovedEmailTemplate | Payroll approved for {period} (may be deleted per Task 7 double-send decision) |
| getOnboardingWelcomeEmailTemplate | Welcome to {orgName} (orgName supplied at call site) |
| getOnboardingTaskEmailTemplate | Onboarding tasks assigned to you |
| getOnboardingCompleteEmployeeEmailTemplate | Onboarding complete |
| getOnboardingCompleteHrEmailTemplate | {name} completed onboarding |
| getTicketCreatedEmailTemplate | New support ticket: {subject} |
| getTicketReplyEmailTemplate | New reply on ticket #{n} |
| getTicketStatusEmailTemplate | Ticket #{n} status: {status} |
| getHelpdeskTicketEmailTemplate | New helpdesk ticket: {subject} |
| getWorkLogApprovedEmailTemplate | Your work log was approved |
| getWorkLogRejectedEmailTemplate | Your work log needs changes |

## From Task 6 (recruitment + interviews)
- New files templates/recruitment.ts (3 fns) + templates/interviews.ts (4 fns) — need barrel exports in index.ts + test-catalog entries.
- Subjects are embedded in these templates' return shapes where the originals had them; call sites updated by Task 6 itself.
- getSelfScheduleBookingEmail gained optional 4th param orgName (default "StreamlineOS").
- LEGACY COLOR STRAGGLERS the audit missed (still #0f2b7f inline email HTML): cron/cron-weekly-recap.service.ts, onboarding/onboarding.service.ts, hr-recruitment/recruitment-candidate-records.service.ts → assigned to Task 8. hr-payroll/lib/payslip-*.ts → Task 7. hr-directory/profile-pdf.html.ts is a PDF template, NOT an email — out of scope, leave.

## From Task 7 (payroll + platform + trial)
- New files templates/payroll.ts (getPayslipEmailTemplate) + templates/platform.ts (4 fns, all return { subject, html }) — need barrel exports + test-catalog entries.
- Payroll double-send RESOLVED: notifyApproved removed from payrolls-status.service.ts (same recipient as payslip). DEAD CODE for Task 10 to delete: getPayrollApprovedEmailTemplate in notifications-crm-hr.ts + its index.ts export + test-catalog entry + EmailService#sendPayrollApprovedEmail (email.service.ts or email-senders.base.ts).
- hr-payroll/lib/payslip-html.ts #0f2b7f is PDF CSS, not email — leave.

## From Task 5 (CRM consolidation) — verified on disk
- templates/crm.ts now has exactly: getClientInvestmentEmailTemplate, getLeadStatusChangeEmailTemplate, getLeadDistributionEmailTemplate (wired in leads-ops.service.ts). All 5 old orphans (getLeadWelcomeEmail, getFollowUpReminderEmail, getDealWonEmail, getSlaBreachAlertEmail, getClientOnboardingEmail) DELETED — no triggers existed.
- clients-email.service.ts + lead-status.service.ts rewired to crm.ts imports; inline HTML + local escapeHtml gone.
- index.ts still exports the 5 dead CRM fns + 4 appraisal fns (pending Task 8's deletions) → Task 10 removes; Task 10 also adds barrel exports for crm.ts's 3 new fns, recruitment.ts, interviews.ts, payroll.ts, platform.ts (+ components.ts helpers).
- test-catalog.ts needs: entries removed for deleted CRM/appraisal templates; entries added for all new templates (crm x3, recruitment, interviews, payroll, platform, weekly recap when Task 8 adds it).

## Render smoke-check spec (built)
- `backend/src/modules/email/templates/test-catalog.spec.ts` iterates `TEMPLATE_MAP` from test-catalog.ts via Object.entries — PRESERVE the `TEMPLATE_MAP` export name and per-entry `generateHtml()` shape. Spec asserts: no throw, `<!DOCTYPE html`, `StreamlineOS`, no undefined/NaN/[object Object], no 0f2b7f/bd882c, no unreplaced `${`.
- Currently fails to compile because index.ts still re-exports: `./appraisal` (file DELETED by Task 8) and 5 dead CRM functions. Fix = REMOVE those barrel exports (do NOT restore templates), then run `npx jest src/modules/email/templates/test-catalog.spec.ts` green.
- Existing email.controller.e2e-spec.ts only does 401 auth checks — untouched.

## Test email recipient
- User-approved recipient for live test sends: adityachalla01@gmail.com (Task 11).

## From Task 9 (provider dedup)
- Done, no shared-file follow-ups.
