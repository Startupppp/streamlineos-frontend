# Email QA Findings — 2026-07-02

> Read-only audit of the email template kit rewrite. No files were modified.
> Scope: templates/auth.ts, organization.ts, expense.ts, hr.ts, project.ts, reports.ts,
> notifications-crm-hr.ts, notifications-misc.ts, crm.ts, recruitment.ts, interviews.ts,
> payroll.ts, platform.ts + call sites: clients-email.service.ts, lead-status.service.ts,
> leads-ops.service.ts, platform.service.ts, payrolls-status.service.ts,
> email.service.ts (sendTrialReminderEmail only).

---

## Critical — XSS / broken contract

### C1. `templates/components.ts:37` — `renderFallbackLink` displays URL without HTML-escaping

**What:** The URL arg is interpolated bare into a `<span>` content node:
```ts
return `...<span class="fallback-url" ...>${url}</span>`;
```
`renderFallbackLink` is the only kit function that does not escape its primary data arg. If `url` ever contains `<`, `>`, or `&` (possible for redirect/encoded URLs), those characters are treated as raw HTML.

**Current risk:** Low in practice — all callers pass system-generated JWT auth links that contain only alphanumeric + URL-safe chars. But the function design is incorrect and a single caller passing a user-influenced URL would open XSS.

**Fix:**
```ts
export function renderFallbackLink(url: string): string {
  return `<p class="email-text" style="font-size:13px;margin:0 0 8px 0;">If the button doesn't work, copy this link into your browser:</p><span class="fallback-url" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#64748B;word-break:break-all;line-height:1.5;display:block;">${escapeHtml(url)}</span>`;
}
```

---

### C2. `templates/recruitment.ts:113` — `renderButton` receives user-provided URL without escaping

**What:** In `getCandidateDocumentRolloutEmail`, the button URL is not escaped:
```ts
${renderButton("View documents", params.documentLinks[0]?.url ?? "")}
```
`renderButton` interpolates its `url` arg as `href="${url}"` with no escaping. A double-quote in a document URL (possible if URLs come from user-submitted or third-party doc-signing services) breaks the href attribute and could allow attribute injection.

**Contrast:** Line 104 in the same function correctly uses `escapeHtml(doc.url)` for inline `<a>` links:
```ts
<a href="${escapeHtml(doc.url)}" ...>${escapeHtml(doc.title)}</a>
```
The inconsistency means every link in the list is safe, but the primary CTA button is not.

**Fix:**
```ts
${renderButton("View documents", params.documentLinks[0] ? escapeHtml(params.documentLinks[0].url) : "")}
```

---

### C3. `templates/reports.ts:133` — `data.aiNarrative` passed unescaped to `renderCallout`

**What:** The AI narrative in `getWeeklyRecapEmailTemplate` is injected without HTML-escaping:
```ts
renderCallout(data.aiNarrative.replace(/\n\n/g, "<br><br>").replace(/\n/g, " "), "info")
```
`renderCallout` does not escape its `text` arg (by design — callers embed `<br>` and `<strong>` tags). However, `data.aiNarrative` is first manipulated with `.replace()` before the HTML newline tags are added, so any `<`, `>`, or `&` in the AI-generated text would survive unescaped into the email HTML.

In a SaaS context, AI narratives are generated from user-controlled data (lead names, company names, etc.). A prompt-injection attack inserting `</div><script>` into a lead name would propagate through the AI output into the email body.

**Fix:** Escape first, then add HTML newlines:
```ts
renderCallout(escapeHtml(data.aiNarrative).replace(/\n\n/g, "<br><br>").replace(/\n/g, " "), "info")
```

---

## Major — double-escape, copy violations, significant structural issues

### M1. `email/email.service.ts` — Systemic copy-standards violations in 19 subject lines

**Note:** The audit scope for this file is `sendTrialReminderEmail` only — that method is PASS (it correctly uses `const { subject, html } = getTrialReminderEmail(...)` and does not override the subject). The issues below are flagged for completeness.

**What:** Every wrapper `sendXxx` method in `email.service.ts` provides its own `subject:` string independently of the template's `title` field. These subjects use Title Case, append " - StreamlineOS" suffix on several, and don't match the copy-standard subjects the templates establish internally.

The templates (expense.ts, project.ts, hr.ts, etc.) return plain `string` (HTML only, no `{subject, html}` shape), so the subject is the caller's responsibility. The result is that the `<title>` tag inside the HTML (which email clients use for screen readers) has correct sentence-case copy, but the actual email subject header the user sees in their inbox does not.

| Method (email.service.ts line) | Current subject | Copy-standard subject |
|---|---|---|
| `sendExpenseSubmittedEmail` (54) | `New Expense Claim from {name}` | `New expense claim from {name}` |
| `sendExpenseApprovedEmail` (74) | `Expense Claim Approved - ₹{amount}` | `Your expense claim was approved` |
| `sendExpenseRejectedEmail` (89) | `Expense Claim Rejected - ₹{amount}` | `Your expense claim was rejected` |
| `sendExpensePaidEmail` (101) | `Expense Reimbursed - ₹{amount}` | `Your expense reimbursement was paid` |
| `sendWeeklyAttendanceReportEmail` (115) | `Attendance Report - {weekRange}` | `Attendance report — week of {date}` |
| `sendMonthlyExpenseReportEmail` (130) | `Monthly Expense Report - {monthLabel}` | `Expense report — {Month YYYY}` |
| `sendAssetAssignedEmail` (159) | `Asset Assigned: {assetName}` | `Asset assigned: {assetName}` |
| `sendPayrollApprovedEmail` (171) | `Payroll Approved — {month}` | `Payroll approved for {period}` |
| `sendProjectAssignmentEmail` (188) | `Added to Project: {name} - StreamlineOS` | `You've been added to {projectName}` |
| `sendTicketAssignmentEmail` (211) | `Ticket Assigned: {title} - StreamlineOS` | `Ticket assigned: {title}` |
| `sendTicketReviewRequestEmail` (244) | `Review Requested: {title} - StreamlineOS` | `Ready for review: {title}` |
| `sendTicketChangesRequestedEmail` (263) | `Changes Requested: {title} - StreamlineOS` | `Changes requested: {title}` |
| `sendSupportTicketCreatedEmail` (284) | `Support Ticket Assigned: #{id} — {title}` | `New support ticket: {subject}` |
| `sendSupportTicketReplyEmail` (299) | `New Reply on Ticket #{n}: {title}` | `New reply on ticket #{n}` |
| `sendSupportTicketStatusEmail` (315) | `Ticket #{n} {status}: {title}` | `Ticket #{n} status: {status}` |
| `sendTaskAssignedEmail` (331) | `Task Assigned: {taskTitle}` | `Task assigned: {title}` |
| `sendHelpdeskTicketEmail` (346) | `Helpdesk Ticket: {ticketTitle}` | `New helpdesk ticket: {subject}` |
| `sendDealStageChangeEmail` (361) | `Deal Won/Lost/Updated: {dealName}` | `Deal stage updated: {dealName}` |
| `sendLeadAssignedEmail` (381) | `New Lead Assigned: {leadName}` | `Lead assigned: {leadName}` |

**Root cause:** These wrappers predate the overhaul. The fix is to update each `subject:` string to sentence case and correct copy, or (better) change the affected templates to return `{ subject, html }` so callers consume the template's own subject and the wrapper body can be removed.

---

### M2. `templates/recruitment.ts:109` — Banned phrase "at your earliest convenience"

**What:** In `getCandidateDocumentRolloutEmail`, the body text:
```ts
"Please review and sign them at your earliest convenience."
```
"at your earliest convenience" is explicitly in the banned-phrases list in the copy standards.

**Fix:**
```ts
"Please review and sign them before the application deadline."
```

---

### M3. `templates/recruitment.ts:104` — Off-palette link color `#4f46e5`

**What:** Inline style on document links:
```ts
<a href="${escapeHtml(doc.url)}" style="color:#4f46e5;text-decoration:none;font-weight:500;">
```
`#4f46e5` (Tailwind indigo-600) is not in the approved palette (`#1e40af`, `#3b82f6`, `#06b6d4`, `#0b1220`, `#4A5568`, `#F7F9FF`, `#EEF3FB` plus tone accent/bg/text values).

**Fix:** Replace `#4f46e5` with `#1e40af` (kit primary).

---

### M4. `templates/crm.ts:15,49,77` · `templates/payroll.ts:16` · `templates/platform.ts:33,61,90,138` — `<h2>` used as primary email heading

**What:** Six templates use `<h2 class="email-title">` for the primary content heading. `auth.ts` and `organization.ts` correctly use `<h1 class="email-title">`. The CSS class `.email-title` is defined for the primary heading style; using `h2` violates heading hierarchy (accessibility: no `h1` in the email body) and is inconsistent with the rest of the kit.

Affected locations:
- `crm.ts` line 15: `<h2 class="email-title">Investment recorded</h2>`
- `crm.ts` line 49: `<h2 class="email-title">Lead status updated</h2>`
- `crm.ts` line 77: `<h2 class="email-title">${leadCount} lead${plural} assigned</h2>`
- `payroll.ts` line 16: `<h2 class="email-title">Your payslip for ${escapeHtml(month)}</h2>`
- `platform.ts` line 33: `<h2 class="email-title">${escapeHtml(subject)}</h2>` (admin notification)
- `platform.ts` line 61: `<h2 class="email-title">We received your message</h2>`
- `platform.ts` line 90: `<h2 class="email-title">Re: your message</h2>`
- `platform.ts` line 138: `<h2 class="email-title">${escapeHtml(subject)}</h2>` (trial reminder)

**Fix:** Change `<h2` → `<h1` at all locations above.

---

### M5. `templates/recruitment.ts` and `templates/interviews.ts` — Redundant inline styles on heading and paragraph elements

**What:** Every `<h1>` and `<p>` element in `recruitment.ts` and `interviews.ts` includes a full inline `style="font-family:'Sora',...;font-size:30px;..."` that exactly duplicates what the CSS classes `.email-title` and `.email-text` already define in `base.ts`. Other template files (`auth.ts`, `organization.ts`, `expense.ts`, `hr.ts`, etc.) use `<h1 class="email-title">` and `<p class="email-text">` without any inline `style` attribute.

The duplication inflates email HTML size and creates a maintenance divergence point — if the design tokens in `base.ts` change, the inline values in these two files must be updated separately.

Affected: all `<h1 class="email-title" style="...">` and `<p class="email-text" style="...">` in `recruitment.ts` and `interviews.ts` (approximately 12 occurrences each).

**Fix:** Remove the `style="..."` attribute from every element that already has the equivalent class name. Keep the class name; remove the inline style.

---

### M6. `templates/hr.ts:155-176` — `getDocumentExpiryReminderEmailTemplate` missing CTA button

**What:** The plan spec explicitly requires `CTA "Update document"` for this template. The current implementation ends with a `renderCallout` and no `renderButton`. The function signature also has no URL parameter:
```ts
getDocumentExpiryReminderEmailTemplate(
  employeeName, documentName, documentType, expiryDate, daysRemaining
)  // no URL
```

**Fix:** Add a `documentUrl: string` parameter (e.g., `${appUrl}/hr/documents`) and add `renderButton("Update document", documentUrl)` after the callout. All callers will need to pass the URL.

---

## Minor — consistency and copy nits

### N1. `templates/interviews.ts:62-63` — `scheduledAt: string` could carry raw ISO date into subject and preheader

**What:** The `InterviewInviteParams` interface has `scheduledAt: string`. The template uses it directly in:
- Subject: `` `You're interviewing ${params.candidateName} on ${params.scheduledAt}` ``
- Preheader: `` `Interview with ${params.candidateName} on ${params.scheduledAt}.` ``
- KeyValueRow: `{ label: "Date & time", value: params.scheduledAt }`

If a caller passes `"2026-01-12T09:00:00.000Z"`, a raw ISO string appears in the subject line — violating the "no raw ISO strings in body copy" standard.

**Recommendation:** Either change the type to `Date` and format inside the function, or add a note in the function contract that `scheduledAt` must be pre-formatted as human-readable (e.g. `"Mon, 12 Jan 2026 at 10:00 AM"`).

---

### N2. `templates/reports.ts:142-165` — Off-palette colors in `getWeeklyRecapEmailTemplate` KPI cards

**What:** The KPI stat cards in `getWeeklyRecapEmailTemplate` use inline colors outside the approved palette:
- Line 156: `color:#854d0e` — off-palette (closest approved: `#92400e` warning-text tone)
- Line 161: `color:#7c3aed` — off-palette (violet; no violet in approved palette; closest: `#1e40af`)
- Lines 142,148,157,163: `color:#6b7280` — off-palette (closest: `#4A5568`)

**Fix:** Replace with nearest approved palette equivalents:
- `#854d0e` → `#92400e`
- `#7c3aed` → `#1e40af`
- `#6b7280` → `#4A5568`

---

### N3. `templates/notifications-misc.ts:240` — `getOnboardingReminderEmailTemplate` not in plan spec

**What:** `getOnboardingReminderEmailTemplate` exists in the file but was not included in the plan's list of templates for this file. The plan spec lists: `getOnboardingWelcomeEmailTemplate`, `getOnboardingTaskEmailTemplate`, `getOnboardingCompleteEmployeeEmailTemplate`, `getOnboardingCompleteHrEmailTemplate`, `getTicketCreatedEmailTemplate`, `getTicketReplyEmailTemplate`, `getTicketStatusEmailTemplate`, `getHelpdeskTicketEmailTemplate`, `getWorkLogApprovedEmailTemplate`, `getWorkLogRejectedEmailTemplate`.

**Recommendation:** Confirm whether a real cron trigger exists for onboarding reminders. If not, delete the function per the "no speculative templates" rule.

---

### N4. `templates/platform.ts:80` — `getContactReplyEmail` subject doesn't use the original message topic

**What:** Plan spec says subject should be `"Re: {subject}"` — implying the original message subject/topic should be echoed. The current `ContactReplyEmailParams` has no `subject` field; the subject is hardcoded as `"Re: your message to StreamlineOS"`. This loses specificity for the user.

**Fix (optional):** Add a `subject?: string` parameter to `ContactReplyEmailParams` and use `` `Re: ${subject ?? "your message to StreamlineOS"}` `` as the subject.

---

### N5. Variable-length subjects may exceed 60 chars with real-world data

**What:** Several template subjects embed user-data strings without length safeguards:
- `crm.ts`: `"Investment recorded for ${clientName}"` — exceeds 60 chars when `clientName` > 22 chars
- `crm.ts`: `"Lead status updated: ${leadName}"` — exceeds 60 chars when `leadName` > 28 chars
- `platform.ts`: `` `New ${topic} message from ${name}` `` — exceeds 60 chars when `name` > ~30 chars

These are caller-data-dependent and cannot be fully controlled inside the template. **Recommendation:** Truncate with ellipsis if the raw subject exceeds 58 chars, or document the caller contract.

---

### N6. `templates/hr.ts:4-28` — `getLeaveRequestEmailTemplate` missing "Days" row

**What:** The plan spec lists `KeyValueRows: Employee, Type, From, To, Days, Reason`. The current implementation omits the "Days" row (total days requested). The function signature has no `days` parameter.

**Recommendation:** Add `daysRequested: number` parameter and include `{ label: "Days", value: String(daysRequested) }` in the rows array.

---

### N7. `templates/recruitment.ts` — `getCandidateDocumentRolloutEmail` not in plan spec

**What:** The plan spec for `recruitment.ts` lists exactly three functions: `getCandidateRejectionEmail`, `getOfferDeadlineReminderEmail`, `getInterviewNoShowRescheduleEmail`. A fourth function, `getCandidateDocumentRolloutEmail`, exists in the file and has no corresponding plan spec entry.

**Recommendation:** Confirm there is a real trigger for document rollout emails. If no trigger exists, delete per the "no speculative templates" rule.

---

## Per-file PASS/FAIL table

| File | Result | Key issues |
|---|---|---|
| `templates/base.ts` | PASS | Clean |
| `templates/components.ts` | **FAIL** | C1: `renderFallbackLink` unescaped URL in span |
| `templates/auth.ts` | PASS | Clean |
| `templates/organization.ts` | PASS | Clean |
| `templates/expense.ts` | PASS | Template clean; wrapper subjects in email.service.ts violate copy (M1) |
| `templates/hr.ts` | **FAIL** | M6: missing CTA in document expiry template; N6: missing "Days" row |
| `templates/project.ts` | PASS | Template clean; wrapper subjects in email.service.ts violate copy (M1) |
| `templates/reports.ts` | **FAIL** | C3: aiNarrative unescaped into renderCallout; N2: off-palette KPI card colors |
| `templates/notifications-crm-hr.ts` | PASS | Template clean; wrapper subjects in email.service.ts violate copy (M1) |
| `templates/notifications-misc.ts` | PASS | N3: unverified `getOnboardingReminderEmailTemplate` |
| `templates/crm.ts` | **FAIL** | M4: `<h2>` used for primary heading (three functions) |
| `templates/recruitment.ts` | **FAIL** | C2: unescaped URL in renderButton; M2: banned phrase; M3: off-palette `#4f46e5`; M5: redundant inline styles; N7: extra unverified function |
| `templates/interviews.ts` | **FAIL** | M5: redundant inline styles on all elements; N1: scheduledAt ISO date risk |
| `templates/payroll.ts` | **FAIL** | M4: `<h2>` used for primary heading |
| `templates/platform.ts` | **FAIL** | M4: `<h2>` used for primary heading (four functions); N4: missing subject field |
| `clients/clients-email.service.ts` | PASS | Clean; correctly uses `{subject, html}` from template |
| `leads/lead-status.service.ts` | PASS | Clean; correctly uses `{subject, html}` from template |
| `leads/leads-ops.service.ts` | PASS | Clean; correctly uses `{subject, html}` from template |
| `platform/platform.service.ts` | PASS | Clean; correctly uses `{subject, html}` from template |
| `hr-payroll/payrolls-status.service.ts` | PASS | Clean; correctly uses `{subject, html}` from template |
| `email/email.service.ts` (sendTrialReminderEmail only) | PASS | Clean; `getTrialReminderEmail` used correctly with `{subject, html}` |

---

## Summary

**3 Critical issues:** XSS/injection risks in `components.ts` (renderFallbackLink), `recruitment.ts` (unescaped button URL), and `reports.ts` (unescaped AI narrative). All three are low-exploitation-probability in current deployments but are structurally incorrect.

**6 Major issues:** Systemic subject-line copy violations in `email.service.ts` wrapper methods (19 methods, Title Case subjects override correct sentence-case template titles); banned phrase in `recruitment.ts`; off-palette color in `recruitment.ts`; `<h2>` vs `<h1>` in `crm.ts`/`payroll.ts`/`platform.ts`; redundant inline styles in `recruitment.ts`/`interviews.ts`; missing CTA in `hr.ts` document expiry template.

**7 Minor issues:** scheduledAt ISO date risk in `interviews.ts`; off-palette KPI card colors in `reports.ts`; unverified template in `notifications-misc.ts`; missing subject parameter in `platform.ts`; subject length risk in `crm.ts`/`platform.ts`; missing "Days" row in `hr.ts` leave request template; extra unverified template in `recruitment.ts`.

**Files passing cleanly:** `base.ts`, `auth.ts`, `organization.ts`, `expense.ts`, `project.ts`, `notifications-crm-hr.ts`, all five call-site service files, `email.service.ts#sendTrialReminderEmail`.
