// Doc 5 — HR & Payroll Module
// docs/word-docs/05-hr-payroll-module.docx
const fs = require("fs");
const path = require("path");
const { Document, Packer, TableOfContents } = require("docx");
const S = require("./_styles");

const DOC_NUMBER = "05";
const DOC_TITLE = "HR & Payroll Module";

const cover = S.coverPage({
  docNumber: DOC_NUMBER,
  title: DOC_TITLE,
  subtitle: "Employees, attendance, leave, performance, payroll, exit.",
  audience: "Engineering team — HR/payroll module owners",
  version: "1.1",
  repoSha: process.env.REPO_SHA || "53fbb593",
  date: process.env.DOC_DATE || "May 2026",
});

const toc = [
  S.h1("Table of Contents"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  S.pageBreak(),
];

const intro = [
  S.h1("1. Introduction"),
  S.body(
    "The HR module is the most complex part of the codebase. It owns the employee lifecycle from " +
      "candidate to alumni, plus the recurring monthly cycles of attendance, leave, performance, and " +
      "payroll. Roughly 89 database tables and 30+ API routes belong to this module. Payroll alone " +
      "carries 12 itemized deduction columns and three concurrent statutory schemes (PT, PF, ESI)."
  ),
  S.body(
    "This document is the reference for engineers maintaining or extending HR. It covers schema, " +
      "code paths, the math behind payroll, and the integration points with attendance and leave. " +
      "Read Doc 1 (Architecture) first; the patterns there apply throughout."
  ),
  S.infoBox(
    "note",
    "Payroll output is legally binding and audited. Any change to the calculator or the persisted " +
      "fields must come with unit tests in lib/hr/payroll-calculations.test.ts and a migration that " +
      "is purely additive. Never silently change behavior for past payrolls."
  ),
];

const moduleMap = [
  S.pageBreak(),
  S.h1("2. Module Surface"),
  S.body(
    "HR is divided into seven logical sub-modules. Each maps to a folder in lib/db/schema/hr/, a " +
      "set of routes under app/api/hr/, and a hook bundle under lib/api/hooks/hr/."
  ),
  S.buildTable(
    [2200, 4400, 2760],
    ["Sub-module", "Scope", "Schema file"],
    [
      ["People", "Departments and department members", "hr/people.ts"],
      ["Recruitment", "Job postings, candidates, interviews, scorecards, offers", "hr/recruitment.ts"],
      ["Attendance", "Punch in/out, leave types, leave balances, leave requests, holidays, WFH, comp-off, holiday work", "hr/attendance.ts"],
      ["Performance", "Review cycles, appraisals, PIP, goals, 1-on-1s, training", "hr/performance.ts"],
      ["Payroll", "Salary structures, payrolls, salary revisions, bonuses, loans, FNF", "hr/payroll.ts"],
      ["Exit", "Resignations, terminations, exit checklists, alumni, BGV", "hr/exit.ts"],
      ["Operations", "Expenses, assets, documents, recognitions, surveys, helpdesk, etc.", "hr/operations.ts"],
    ]
  ),
];

const employeeLifecycle = [
  S.pageBreak(),
  S.h1("3. Employee Lifecycle"),
  S.body(
    "An employee’s record exists in two tables: users (authentication identity, name, email, " +
      "personal data) and organizationMembers (join row carrying role + active flag for the current " +
      "tenant). Many HR queries pivot on organizationMembers because the role is the primary " +
      "authorization signal."
  ),

  S.h2("3.1 Onboarding"),
  S.body(
    "Recruitment ends with an accepted offer (candidateOffers.status = ACCEPTED). The HR onboarding " +
      "flow then either creates a fresh users + organizationMembers row, or activates a returning " +
      "alumnus. Onboarding tasks are templated by role (onboardingTemplates → onboardingTemplateSteps " +
      "→ onboardingTasks); each task is checked off as completed and is visible to HR + the new hire."
  ),

  S.h2("3.2 Active employee"),
  S.body(
    "Day-to-day operations: attendance, leave, salary structures, performance reviews. The user’s " +
      "manager is derived from departmentMembers; an employee can belong to multiple departments " +
      "but has exactly one primary manager for approval routing."
  ),

  S.h2("3.3 Performance"),
  S.body(
    "Performance is captured by reviewCycles + performanceReviews (legacy) and appraisalCycles + " +
      "appraisals + appraisalCategoryRatings (current Q10–Q15 questionnaire). PIPs are first-class: " +
      "performanceImprovementPlans + pipGoals + pipCheckIns track the structured 30/60/90 plan."
  ),

  S.h2("3.4 Exit"),
  S.body(
    "Three paths: voluntary resignation (resignations table; HR + CEO approval), termination " +
      "(terminations; CEO approval mandatory), or contract end (no formal flow, just deactivation). " +
      "Final exit triggers exitChecklists (asset return, document handover, knowledge transfer) and " +
      "fnfSettlements (full and final pay calculation). organizationMembers.isActive becomes false; " +
      "the user record persists for audit and alumni access."
  ),

  S.h2("3.5 Alumni"),
  S.body(
    "alumniProfiles holds rehire eligibility flag, exit reason, last designation, and contact " +
      "info. Used by recruitment when a former employee applies again."
  ),
];

const attendance = [
  S.pageBreak(),
  S.h1("4. Attendance"),

  S.h2("4.1 Schema"),
  S.body(
    "The attendance table is one row per employee per calendar day. The status enum covers " +
      "PRESENT, LATE, HALF_DAY, ABSENT, ON_LEAVE, HOLIDAY, WEEK_OFF. Punch in/out columns are " +
      "timestamps; workHours is computed at punch-out."
  ),
  S.buildTable(
    [2400, 6960],
    ["Column", "Notes"],
    [
      ["org_id", "FK to organizations. Always present in WHERE clauses."],
      ["user_id", "FK to users."],
      ["date", "DATE in IST. Composite uniq with (org_id, user_id, date)."],
      ["status", "Enum. PRESENT/LATE/HALF_DAY drive payroll; ABSENT triggers LOP."],
      ["punch_in / punch_out", "Timestamps. Manual edits go through the regularization endpoint."],
      ["work_hours", "Decimal. Numeric stored to support fractional-hour OT."],
      ["is_half_day", "Boolean. Used by half-day deduction in payroll."],
      ["half_day_period", "FIRST_HALF or SECOND_HALF — for visibility, not math."],
      ["lop_days", "Decimal(5,1). Pre-aggregated LOP for the day (rare edge cases)."],
      ["holiday_id", "FK to holidays when the day overlaps a declared holiday."],
    ]
  ),

  S.h2("4.2 Punch in/out"),
  S.body(
    "Implemented as a small state machine: PUNCH_IN creates or finds the day’s row and stamps " +
      "punch_in. PUNCH_OUT updates punch_out and computes workHours. Geo-fencing and IP allow-list " +
      "validation happens before the state change. The endpoints are app/api/hr/attendance/* and " +
      "are called from features/hr/attendance/*."
  ),

  S.h2("4.3 Auto-checkout"),
  S.body(
    "A nightly Vercel cron at 23:55 IST runs lib/attendance-auto-checkout.ts. Any open punch-in " +
      "without a matching punch-out is closed at the cap (typically 18:30 IST or the day’s end), " +
      "and a notification is fired so the employee can request regularization the next morning."
  ),

  S.h2("4.4 Late-arrival warnings"),
  S.body(
    "lateArrivalWarnings counts late punch-ins per month. Per current policy (OPEN-34) only a " +
      "warning is issued at the third occurrence; no payroll deduction. Future policy may attach a " +
      "deduction; the schema already supports it via the structureDeductions slot."
  ),
];

const leave = [
  S.pageBreak(),
  S.h1("5. Leave"),

  ...S.figure(
    "diag-leave-flow.png",
    "Figure 5-1 — Approval state machine for leave requests. Manager approval is skipped when the requester is a manager themselves; HR is the final approver in all cases."
  ),

  S.h2("5.1 Schema"),
  S.bullet("leaveTypes — per-org definitions: name, max-days-per-year, accrual rule, paid/unpaid, requires-document."),
  S.bullet("leaveBalances — per-user, per-type, per-year row holding current balance + opening balance + used."),
  S.bullet("leaveRequests — submission rows with status (PENDING/APPROVED/REJECTED/CANCELLED), date range, reason, optional attachment."),
  S.bullet("leaveBlackoutDates — org-defined no-leave windows (e.g. fiscal year-end)."),

  S.h2("5.2 Submission flow"),
  S.body(
    "POST /api/hr/leaves validates: (a) leave balance sufficient unless the type is unpaid, (b) " +
      "no overlapping non-rejected request, (c) start ≤ end, (d) not in a blackout window. On " +
      "success the row is inserted with status PENDING and an email is fanned out to every HR " +
      "member of the org. Inngest event hr/leave.requested can also fire if the org subscribes."
  ),
  S.infoBox(
    "warning",
    "The current notification fanout sends one email per HR member sequentially. With 10 HRs the " +
      "total send time can be 10–20 seconds (acceptable because it runs after the response). If " +
      "you increase the HR team size, switch the for-loop to Promise.all in app/api/hr/leaves/route.ts."
  ),

  S.h2("5.3 Approval"),
  S.body(
    "Two-step in policy, one or two depending on the role:"
  ),
  S.bullet("Junior employees → Manager approves first, then HR (or HR alone if the manager is on leave)."),
  S.bullet("Managers → HR approves directly."),
  S.bullet("HR/CEO → CEO approves (CEO can self-approve their own leave)."),
  S.body(
    "Approval routes are app/api/hr/leaves/[leaveId]/approve and /reject. Both check role + " +
      "ownership of the approval slot, deduct balance on approval, send a notification email, and " +
      "audit-log the action."
  ),

  S.h2("5.4 Cancellation"),
  S.body(
    "An approved leave can be cancelled by the employee up to the start date. POST " +
      "/api/hr/leaves/[leaveId]/cancel restores the balance, transitions status to CANCELLED, and " +
      "notifies the approver."
  ),

  S.h2("5.5 Holidays, WFH, Comp Off, Holiday Work"),
  S.bullet("holidays — calendar of declared holidays per org."),
  S.bullet("wfhRequests — work-from-home requests with manager + HR approval. Same skeleton as leave."),
  S.bullet("compOffGrants — leave granted in lieu of holiday work. 1 day per full-day holiday worked."),
  S.bullet("holidayWorkRequests — Saturday/Sunday/Holiday work requests; type field drives the OT multiplier."),
];

const payroll = [
  S.pageBreak(),
  S.h1("6. Payroll"),
  S.body(
    "This is the largest single section of the module and the most consequential. Mistakes here " +
      "result in over- or under-paid salaries, non-compliance with Indian labor and tax law, and " +
      "audit findings. Read the entire section before changing anything."
  ),

  ...S.figure(
    "diag-payroll-flow.png",
    "Figure 6-1 — End-to-end payroll calculation. Inputs (top row, navy) drive three calculators (middle, green); the gross row aggregates earnings; the deduction row aggregates statutory + manual; the net row is gross minus total deductions."
  ),

  S.h2("6.1 Sources of truth"),
  S.bullet("salaryStructures — one or more per employee, each with effectiveFrom/effectiveTo. Multiple structures may overlap a payroll month (used for mid-month revisions)."),
  S.bullet("attendance — daily presence/absence and work hours. Aggregated into LOP days, half-days, OT eligibility."),
  S.bullet("holidayWorkRequests + salaryLoans — derive the OT amount and advance recovery."),
  S.bullet("Manual adjustments per generation — bonus, otherDeductions, lopDays/halfDays override (admin only)."),

  S.h2("6.2 The calculator (lib/hr/payroll-calculations.ts)"),
  S.body(
    "The calculator is intentionally a set of pure functions with no DB access. This is what " +
      "makes it unit-testable. Every input is a primitive or a small interface, and every output " +
      "is a primitive or a flat object. The unit tests in lib/hr/payroll-calculations.test.ts " +
      "(42 cases at time of writing) pin every edge."
  ),
  S.h3("Pure functions"),
  S.bullet("calendarDaysInMonth(yyyyMm) — returns 28/29/30/31, falls back to 30 on invalid input."),
  S.bullet("perDaySalaryForLop(month, monthlySalary, grossSalary) — daily rate from the LOP base."),
  S.bullet("rawLopDeduction(month, monthly, gross, lopDays) — full-day LOP amount (unrounded)."),
  S.bullet("rawHalfDayDeduction(month, monthly, gross, halfDays) — half-day amount (per day = ½ daily rate)."),
  S.bullet("roundInr(value) — Math.round; INR has no sub-rupee precision in payroll."),
  S.bullet("computeTotalDeductionsAndNet(params) — totals + net, accepts custom PT."),
  S.bullet("buildPayslipPreviewFromEmployee(input) — drives the admin preview sheet."),
  S.bullet("computeStatutory(basic, gross, params) — PF + ESI per pay-cycle."),
  S.bullet("computeProratedSalary(month, structures) — weighted average across overlapping segments."),

  S.h2("6.3 The two generation routes"),
  S.body(
    "Both produce the same persisted shape; they differ in entry point and how inputs are derived."
  ),
  S.buildTable(
    [3200, 6160],
    ["Route", "Used by"],
    [
      ["POST /api/hr/payrolls/generate", "Single-employee generation. HR picks an employee + month, optionally adjusts LOP/half-day/bonus/other-deductions, then confirms."],
      ["POST /api/hr/payrolls (bulk)", "Generate-All. Iterates every member with an active salary structure, infers LOP from attendance, derives OT and advance recovery automatically. No manual overrides."],
    ]
  ),
  S.body(
    "The two routes were rewritten in May 2026 to share the same daily-rate base (structure CTC " +
      "÷ calendar days), the same statutory deductions, the same OT multipliers, and the same " +
      "itemized persistence. Before that they used different formulas and produced different ₹ " +
      "amounts for the same employee. See the audit commit log under feat(payroll): … for context."
  ),

  S.h2("6.4 Daily-rate base"),
  S.body(
    "Daily rate is defined as monthlyCTC / calendarDays where monthlyCTC = basic + hra + " +
      "specialAllowance from the active salary structure. NOT employees.monthly_salary. NOT working-" +
      "days-only. Both alternatives have been tried and rejected in past iterations because they " +
      "produce drift between preview and persistence."
  ),
  S.infoBox(
    "tip",
    "When debugging a preview-vs-actual mismatch, the first check is: are both paths reading the " +
      "same salary structure? If HR raises an employee’s salary mid-month and forgets to update " +
      "the user record, the system will still pay correctly because both paths derive monthlyCTC " +
      "from the structure, not the user record."
  ),

  S.h2("6.5 Mid-month revisions (proration)"),
  S.body(
    "When salaryStructures has multiple rows that overlap the payroll month, computeProratedSalary " +
      "computes a weighted average. Each segment contributes its CTC × (segment days / calendar " +
      "days). Day counting is timezone-safe — segments are clamped against the payroll month using " +
      "day-of-month integers, not Date arithmetic."
  ),
  ...S.code(
    `// Example: 30-day month, raise on the 15th
//   structure A: basic 30000, HRA 50%, special 0   (days 1–14)
//   structure B: basic 40000, HRA 50%, special 0   (days 15–30)
//
//   computeProratedSalary("2026-04", [A, B]):
//     basic    = 30000 × 14/30 + 40000 × 16/30  = 35333
//     hra      = 15000 × 14/30 + 20000 × 16/30  = 17667
//     special  = 0
//     ctc      = 53000`
  ),

  S.h2("6.6 Statutory deductions"),
  S.h3("Professional Tax (PT)"),
  S.body(
    "Flat ₹200 per month by default; configurable per salary structure. Most Indian states levy " +
      "this; the field is salaryStructures.professionalTax. PT is always deducted, regardless of " +
      "PF/ESI applicability."
  ),
  S.h3("Provident Fund (PF)"),
  S.body(
    "12% of basic, capped at the wage ceiling (default ₹15,000). Employer contributes 12% on top " +
      "(persisted as pf_employer for compliance reporting). Applicable per-employee via " +
      "salaryStructures.pfApplicable. Rates and ceiling are configurable in case of policy changes."
  ),
  S.buildTable(
    [3200, 3000, 3160],
    ["Field", "Default", "Notes"],
    [
      ["pf_applicable", "false", "Off by default; HR enrolls per employee."],
      ["pf_employee_rate", "12.00", "% of pf base."],
      ["pf_employer_rate", "12.00", "% of pf base; not deducted from gross, persisted for compliance."],
      ["pf_wage_ceiling", "15000.00", "Indian standard wage ceiling on basic."],
    ]
  ),
  S.h3("Employee State Insurance (ESI)"),
  S.body(
    "Applies only when gross ≤ ₹21,000 (configurable). Employee 0.75% + employer 3.25% of gross. " +
      "Out-of-ESI employees show 0 on both halves; inside-ESI employees show non-zero. The check " +
      "happens once per pay cycle; mid-month gross changes do not retroactively flip eligibility."
  ),
  S.h3("TDS"),
  S.body(
    "Not yet implemented in v1. Income tax withholding requires per-employee declarations and " +
      "monthly slab handling; current policy is to compute TDS outside the system and book it as " +
      "an other-deduction line item if needed. A first-class TDS module is on the roadmap."
  ),

  S.h2("6.7 Overtime"),
  S.body(
    "OT is auto-detected from approved EXTRA_PAY holiday work requests with attendance ≥ 8 hours " +
      "on the requested date. Per-day amount = dailyRate × multiplier(day type). Multipliers live " +
      "on the salary structure with sensible defaults."
  ),
  S.buildTable(
    [3200, 2000, 4160],
    ["Day type", "Default multiplier", "Source field"],
    [
      ["Saturday", "1.00", "saturday_ot_multiplier"],
      ["Sunday", "2.00", "sunday_ot_multiplier"],
      ["Public holiday", "2.00", "holiday_ot_multiplier"],
    ]
  ),
  S.body(
    "The bulk-generate route groups HWR rows by user + type so the multiplier per type can be " +
      "applied in a single grouped query. The single-employee route iterates per HWR row directly. " +
      "Both arrive at the same total."
  ),

  S.h2("6.8 Advance recovery"),
  S.body(
    "Active salary loans (status = ACTIVE) recover via salaryLoans.emiAmount per month until " +
      "paidEmis = totalEmis. The oldest active loan is selected per user; only one loan recovers " +
      "per month even if multiple are active (this matches HR policy and is enforced in code)."
  ),

  S.h2("6.9 Persisted shape (payrolls)"),
  S.body(
    "Every payroll row carries the itemized breakdown. No more lump-sum 'deductions' field — " +
      "every component is stored separately so the payslip can render it and audits can trace it."
  ),
  S.buildTable(
    [2800, 6560],
    ["Column", "Meaning"],
    [
      ["basic_salary, hra, special_allowance", "Pro-rated salary structure components for the month."],
      ["allowances", "Bonus / incentive (named 'allowances' for legacy reasons)."],
      ["lop_days, lop_amount", "Full-day LOP."],
      ["half_days, half_day_amount", "Half-day LOP. (Added May 2026; older rows have 0.)"],
      ["pt_amount", "Professional Tax."],
      ["pf_employee, pf_employer", "PF halves. (Added May 2026.)"],
      ["esi_employee, esi_employer", "ESI halves. (Added May 2026.)"],
      ["advance_recovery_amount", "Loan EMI for the month."],
      ["other_deductions", "Manual adjustments. (Added May 2026.)"],
      ["structure_deductions", "Recurring deductions from salaryStructures.deductions. (Added May 2026.)"],
      ["overtime_type, overtime_days, overtime_amount", "OT breakdown for display."],
      ["deductions", "Total of all deductions (rounded). Sum of the columns above."],
      ["gross_salary, net_salary", "Top-line numbers. Net = Gross − Deductions."],
      ["status", "DRAFT → APPROVED → PAID. Status drives the email + payslip generation."],
    ]
  ),
  S.infoBox(
    "note",
    "If you find a payroll row missing one of the May-2026 columns at zero, check the migration " +
      "0114_pf_esi_statutory.sql and 0113_payroll_itemized_deductions.sql have been applied. " +
      "All columns default to 0 so older rows render correctly."
  ),

  S.h2("6.10 Approval and payment"),
  S.body(
    "Status flow: HR generates a DRAFT, reviews the preview, confirms. CEO (or designated approver) " +
      "transitions DRAFT → APPROVED. Marking PAID triggers payslip PDF generation and email " +
      "delivery. The PAID transition is a one-way door — un-paying requires a manual DB fix."
  ),
];

const payslip = [
  S.pageBreak(),
  S.h1("7. Payslip Generation"),

  S.h2("7.1 Two surfaces"),
  S.body(
    "There are two payslip surfaces today: the admin downloadable HTML (rendered server-side via " +
      "app/api/hr/payrolls/[payrollId]/download/route.ts) and the employee-facing PDF (generated " +
      "from app/api/hr/payrolls/[payrollId]/paid/route.ts when the payroll moves to PAID and " +
      "emailed to the employee). Both surfaces use the same itemized data; they differ in " +
      "format and delivery mechanism."
  ),

  S.h2("7.2 The HTML payslip (admin download)"),
  S.body(
    "Inline HTML returned with Content-Type text/html. Designed to print to PDF via the browser " +
      "(Cmd+P). Layout: navy header with company logo, employee strip (name, ID, designation, " +
      "department), employee + payroll info, the salary breakdown table, the net salary bar, the " +
      "in-words conversion, bank details, signature placeholder."
  ),
  S.body(
    "Deductions render as itemized rows. Each component (PT, PF, ESI, LOP, half-day, advance " +
      "recovery, structure deductions, other) appears on its own row when amount > 0. Earnings " +
      "and deductions are independent dynamic arrays; one column does not constrain the other."
  ),

  S.h2("7.3 The PDF payslip (employee email)"),
  S.body(
    "Generated server-side via lib/payslip-pdf.ts (pdf-lib). Layout: navy header, gold accent " +
      "rules, salary breakdown using the same row-array pattern, net salary in gold, in-words, " +
      "bank details, footer with the generation timestamp."
  ),

  S.h2("7.4 Password protection"),
  S.body(
    "When a password can be derived from the employee record, the PDF is encrypted (AES-256) " +
      "before being attached to the email. Encryption uses the qpdf binary. If qpdf is not " +
      "available in the runtime, the PDF goes out unencrypted with a warning logged; the email " +
      "body advertises encryption only when the encryption actually happened."
  ),
  S.h3("Password rule"),
  S.body(
    "First 4 letters of PAN (uppercase) + DDMM of date of birth. Example: PAN ABCDE1234F + DOB " +
      "5 Oct 1995 → ABCD0510. This is the Indian industry standard (Razorpay, Zoho, Keka all use " +
      "the same convention)."
  ),
  S.h3("Fallbacks"),
  S.bullet("PAN missing → first 4 of employee name (uppercased, letters only)."),
  S.bullet("DOB missing → DDMM of joining date."),
  S.bullet("Both missing → password derivation returns null; PDF is sent unencrypted with a clear notice."),

  S.h2("7.5 Email delivery"),
  S.body(
    "On marking a payroll PAID, the route handler does, in order: update status, write audit log, " +
      "fetch employee + org data, generate the PDF, build the email body, send via SendGrid (with " +
      "SMTP fallback if SendGrid is unavailable). Failure to send the email does not roll back " +
      "the PAID transition; HR can resend manually from the payslips list."
  ),
  S.infoBox(
    "warning",
    "Sending emails is intentionally fire-and-forget (try/catch with logger.error on failure). " +
      "The admin should not be blocked on slow email delivery. If a batch of payslips fails to " +
      "deliver, surface the failures in the operational dashboard rather than retrying inline."
  ),
];

const features = [
  S.pageBreak(),
  S.h1("8. Other HR Features"),

  S.h2("8.1 Expenses"),
  S.body(
    "Employees submit expense claims with receipts. Approval flow: manager (if amount under limit) " +
      "or HR (above limit). Reimbursement happens via the next payroll cycle as an additional " +
      "earning. Schema: expenses + expenseCategories + reimbursements."
  ),

  S.h2("8.2 Performance Improvement Plans (PIP)"),
  S.body(
    "First-class workflow for underperforming employees. The PIP record carries the reason, " +
      "duration, review frequency, and an outcome. pipGoals + pipCheckIns capture the structured " +
      "30/60/90 plan and progress per checkpoint. PIPs are visible only to HR + the employee + " +
      "their manager."
  ),

  S.h2("8.3 Helpdesk"),
  S.body(
    "Internal HR helpdesk: employees raise queries (helpdeskTickets), HR responds, the ticket " +
      "moves through OPEN → IN_PROGRESS → RESOLVED. Distinct from the customer-facing supportTickets."
  ),

  S.h2("8.4 Recognitions"),
  S.body(
    "Peer-to-peer kudos. recognitions stores from-user, to-user, message, and a reaction count. " +
      "Visible on the employee’s profile and in a recognitions feed."
  ),

  S.h2("8.5 Pulse Surveys + eNPS"),
  S.body(
    "Recurring lightweight surveys (pulseSurveys + surveyResponses). enpsScores aggregates the " +
      "Employee Net Promoter Score for trend analysis."
  ),

  S.h2("8.6 Documents and policies"),
  S.body(
    "documentTypes defines categories (offer letter, NDA, ID proof, etc.). onboardingDocuments " +
      "tracks per-employee uploads with status. policyAcknowledgments records who has read which " +
      "version of which policy. handbookVersions stores the canonical company handbook."
  ),

  S.h2("8.7 Training and Career Ladders"),
  S.body(
    "trainingPrograms + trainingEnrollments handle structured learning. learningPaths group " +
      "programs into role-specific tracks. careerLadders defines progression criteria per role."
  ),

  S.h2("8.8 Assets"),
  S.body(
    "assets table holds laptops, monitors, ID cards. assignedTo, status (AVAILABLE / ASSIGNED / " +
      "RETIRED), serial number, purchase date. assetReturns tracks returns at exit."
  ),
];

const integration = [
  S.pageBreak(),
  S.h1("9. Integration Points"),
  S.body(
    "HR is not isolated — it integrates with several other modules. These dependencies are " +
      "intentional and load-bearing; understand them before refactoring."
  ),

  S.buildTable(
    [2200, 4400, 2760],
    ["Boundary", "Integration", "Code path"],
    [
      ["HR ↔ CRM", "A SALES rep’s commission is part of payroll calculation (via incentives table)", "lib/hr/incentive-calc + crm.commissions"],
      ["HR ↔ Projects", "Expense reimbursement can be charged to a project", "expenses.projectId → projects.id"],
      ["HR ↔ Auth", "Role-change is a security-sensitive HR action; goes through audit log", "lib/auth/role-change.ts"],
      ["HR ↔ Notifications", "Every approval/rejection emits an email + in-app notification", "via lib/notifications/send"],
      ["HR ↔ Inngest", "hr/leave.requested, hr/payroll.generated, hr/employee.onboarded events fan out to background tasks", "lib/inngest/client.ts"],
    ]
  ),
];

const debt = [
  S.pageBreak(),
  S.h1("10. Known Debt and Open Questions"),
  S.bullet("TDS not yet implemented (OPEN-09 partially closed: PT/PF/ESI in place, TDS deferred)."),
  S.bullet("Salary revision frequency is policy-undefined (OPEN-43); the system supports any cadence."),
  S.bullet("Late-arrival deduction policy not finalized (OPEN-34); only a warning is issued today."),
  S.bullet("Sales-team incentive structure for the next iteration (OPEN-40)."),
  S.bullet("Payslip PDF encryption requires qpdf in the runtime; a pure-Node fallback is desirable."),
  S.bullet("Leave-request notification fanout is sequential; switch to Promise.all once HR team grows."),
  S.bullet("Some HR queries still derive monthlySalary from the user record for display (not for math). Migrate to structure-derived once the HR settings UI surfaces both consistently."),
];

const appendices = [
  S.pageBreak(),
  S.h1("Appendix A — File map"),
  S.buildTable(
    [3800, 5560],
    ["File", "Purpose"],
    [
      ["lib/hr/payroll-calculations.ts", "Pure calculator. The entire payroll math lives here."],
      ["lib/hr/payroll-calculations.test.ts", "42 Vitest unit tests. The contract."],
      ["lib/hr/payslip-password.ts + .test.ts", "Password derivation rule + tests."],
      ["lib/payslip-pdf.ts", "Server-side PDF generation (pdf-lib) + qpdf encryption wrapper."],
      ["lib/email-templates/hr.ts", "All HR email templates (leave, payslip, approval, etc.)."],
      ["lib/db/schema/hr/_all.ts", "Canonical schema. Domain re-exports under hr/payroll, hr/attendance, etc."],
      ["server/queries/hr/payroll.ts", "Payroll reads — getPayrolls, getEmployeePayslips, etc."],
      ["server/queries/hr.ts", "Misc HR reads not yet migrated to subfolder."],
      ["server/actions/leave-actions/", "Leave server actions (used from forms)."],
      ["server/actions/expense-actions/", "Expense server actions."],
      ["app/api/hr/payrolls/generate/route.ts", "Single-employee payroll generation."],
      ["app/api/hr/payrolls/route.ts", "Bulk Generate-All."],
      ["app/api/hr/payrolls/[id]/paid/route.ts", "Mark paid → generate + email payslip."],
      ["app/api/hr/payrolls/[id]/download/route.ts", "Admin downloadable HTML payslip."],
      ["app/api/hr/payslips/route.ts", "Employee-facing payslip listing."],
      ["app/(dashboard)/hr/payroll/page.tsx", "Admin payroll page."],
      ["app/(dashboard)/hr/my-payslips/page.tsx", "Employee My Payslips page."],
    ]
  ),
  S.pageBreak(),
  S.h1("Appendix B — Migration timeline"),
  S.buildTable(
    [2200, 3000, 4160],
    ["Migration", "Date", "What it changed"],
    [
      ["0105_payroll_foundation.sql", "—", "Initial payrolls + salaryStructures tables."],
      ["0108_holiday_work_requests.sql", "—", "Holiday Work Request flow."],
      ["0109_comp_off_grants.sql", "—", "Comp-off grant tracking."],
      ["0110_payroll_line_items_and_warnings.sql", "—", "OT line items + late-arrival warnings."],
      ["0111_hwr_reason_nullable.sql", "—", "HWR.reason made optional in the form."],
      ["0113_payroll_itemized_deductions.sql", "May 2026", "halfDays, halfDayAmount, otherDeductions, structureDeductions added."],
      ["0114_pf_esi_statutory.sql", "May 2026", "PF + ESI columns on salary_structures and payrolls."],
      ["0115_overtime_multipliers.sql", "May 2026", "Saturday/Sunday/Holiday OT multipliers per salary structure."],
    ]
  ),
];

const doc = new Document({
  creator: "Vaivamm Capital — Engineering",
  title: DOC_TITLE,
  description: "HR & Payroll module reference documentation.",
  styles: S.styles,
  numbering: S.numbering,
  sections: [
    {
      properties: S.sectionProps(),
      headers: { default: S.buildHeader(DOC_TITLE) },
      footers: { default: S.buildFooter(DOC_NUMBER) },
      children: [
        ...cover,
        ...toc,
        ...intro,
        ...moduleMap,
        ...employeeLifecycle,
        ...attendance,
        ...leave,
        ...payroll,
        ...payslip,
        ...features,
        ...integration,
        ...debt,
        ...appendices,
      ],
    },
  ],
});

const outDir = path.join(__dirname, "..", "..", "docs", "word-docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "05-hr-payroll-module.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
});
