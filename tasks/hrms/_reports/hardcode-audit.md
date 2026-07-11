# PRD-02 Hardcode Audit — Findings (2026-07-11)

54 findings across 15 categories. Each must move to the named engine; hardcoded values remain only as seeded defaults.

## 1. Leave accrual (Critical)
- 1.1 `cron/cron-leave-policy.ts:1-49` — CASUAL 12/yr (1/mo expiry), SICK 6/yr, UNPAID 0, carryForward=false; only 3 types auto-created; `resolveInitialBalance` string-matches "Casual Leave"/"Sick Leave". → Policy engine.
- 1.2 `hr-time/leaves-page.service.ts:13-31` — duplicate CASUAL_DAYS_PER_YEAR=12/SICK=6 constants (drift risk). → Policy engine, single source.
- 1.3 `hr-time/leave-policies.service.ts:18` — `wfhMonthlyQuota: 4` always returned, never read from DB. → Policy engine.
- 1.4 `hr-time/leaves.service.ts:357-364` — comp-off type auto-created daysPerYear=30, carryForward=false. → Policy engine.

## 2. Leave reset/expiry cron (Critical)
- 2.1 `cron/cron-leave.service.ts:26-29` — yearly reset only when `getMonth()===0` (January); no fiscal-year config. → Policy engine (leave year start month).
- 2.2 `cron/cron-leave.service.ts:65` — monthly expiry only for name==="Casual Leave". → leaveTypeCategory flag, policy-driven.
- 2.3 `cron/cron-leave.service.ts:107` — deduct exactly 1/month. → Policy engine.

## 3. Comp-off (High)
- 3.1 `hr-time/overtime.service.ts:28` — hours/8 conversion (8-hr day fixed). → Policy engine standardDayHours.
- 3.2 `hr-time/leaves.service.ts:25` — COMP_OFF_LEAVE_NAME="Compensatory Off" string coupling. → category enum.

## 4. Attendance rules (Critical)
- 4.1 `hr-lifecycle/hr-dashboard-reports.service.ts:17-18` — LATE_CHECKIN 09:30. → Policy/shift config.
- 4.2 `hr-time/attendance.service.ts:149` + `cron/cron-attendance.service.ts:90` — overtime = work > 8h. → shiftTemplates standardHours.
- 4.3 `hr-time/attendance.service.ts:52-53,262-263` — 2-minute re-clock-in cooldown. → policy.
- 4.4 `cron/cron-attendance.service.ts:7-9` — AUTO_CHECKOUT 19:00 IST, 1h forced break, IST_OFFSET=330. → per-org tz + policy.
- 4.5 `hr-time/attendance.service.ts:370` — heatmap intensity floor(hours/2) (low).

## 5. Shift defaults (High)
- 5.1 shiftTemplates start/end/break/grace columns exist but are NEVER read by cron/analytics — runtime uses 4.1/4.4 constants. → wire shift config into runtime.

## 6. Overtime thresholds (High)
- 6.1 `hr-payroll/payrolls.service.ts:90,149,290` — >8h flag + PT ₹200 + fallbacks. → policy.
- 6.2 `payrolls.service.ts:89` — totalBusinessDays fallback 22. → policy standardWorkingDaysPerMonth.
- 6.3 `payroll/setup/payroll-template-seeds.ts:644,770` — OT formula literal 1.50 multiplier. → configurable multiplier.

## 7. Probation (Medium — gap)
- No constant; no per-org default either. → Policy engine defaultProbationDays.

## 8. Notice period (High)
- 8.1 `hr-lifecycle/dto/hr-lifecycle.schemas.ts:10` — default(30), max 180. → policy per role/grade.
- 8.2 `hr-lifecycle/exit-write.service.ts:343` — `noticePeriodDays ?? 30` in email. → same.
- 8.3 `hr-lifecycle/letters.ts:80` — "45 days" FNF SLA in termination letter. → template token.

## 9. Offboarding checklist (Medium)
- 9.1 `exit-write.service.ts:188-193` — checklist = free-text from API, no template; `email/templates/hr.ts:122` hardcoded handover prose. → template + workflow engines.

## 10. Required docs / onboarding tasks (Medium)
- 10.1 `onboarding/onboarding.service.ts:41-49` — 7 static DEFAULT_TASKS seeded for every org incl. India-specific "POSH Training" (also 14.5). → template engine w/ jurisdiction tags.

## 11. Email/notification text (Critical)
- 11.1 `email/templates/hr.ts:141` — "employment with StreamlineOS" in termination email body.
- 11.2 `hr-lifecycle/letters.ts:95` — hr@streamlineos.app in letters.
- 11.3 `hr-interviews/ics.util.ts:51,92` — noreply@streamlineos.app ICS organizer.
- 11.4 `cron/cron-notifications.service.ts:67-68` + `hr-lifecycle/resignation-jobs.service.ts:37,52,64-66` — birthday/resignation notification strings.
- 11.5 `email/templates/payroll.ts:13` — payslip subject.
- 11.6 `email/templates/recruitment.ts:86` — offer reminder subject.
- 11.7 `onboarding/onboarding.service.ts:569` — onboarding reminder subject.
- 11.8 `hr-payroll/lib/payslip-html.ts:71-72` — orgFullName ALWAYS "StreamlineOS Advisors LLP" (ignores org.name).
- 11.9 `hr-payroll/lib/payslip-pdf.ts:116` + `payroll/payout/payslip-templates.service.ts:215` — same brand + "Bengaluru, Karnataka, India" address.
→ Template engine + notification registry, {{orgName}}/{{hrContactEmail}} tokens.

## 12. Approval chains (Critical)
- 12.1 `exit-write.service.ts:87-108` + `exit.controller.ts:67,79` — resignation fixed HR→CEO.
- 12.2 `hr-lifecycle/termination.service.ts:200-204` — termination single CEO step.
- 12.3 `hr-time/leaves-write.service.ts:553-558` — leave notifications to role="HR" only.
- 12.4 `cron/cron-recruitment.service.ts:180` — no-show task → hrMembers[0].
- 12.5 `resignation-jobs.service.ts:19-20` — ADMIN_ROLES=["CEO","HR"] fan-out.
→ HR workflow engine.

## 13. Payroll mappings (Critical)
- 13.1 PT ₹200 in `payrolls.service.ts:149,290`, `payslip-html.ts:90`, (pdf). → policy PT slabs by state.
- 13.2 `payrolls.service.ts:134-137` + `hr-directory/employee-mutations.service.ts:358-364` — 50/25/25 split fallback, hraPercentage "50".
- 13.3 `payrolls.service.ts:135,279` — HRA fallback 50%.
- 13.4 `payrolls.service.ts:85-88` + `leaves-write.service.ts:397-407` — Mon-Fri only work week.
- 13.5 `payslip-pdf.ts:181` — Working Days always "30".
- 13.6 `payrolls.service.ts:291` — LOP on calendar days.
Also `hr-payroll/compensation.service.ts:18-41,323-335` — India tax slabs old/new regime, PF 12% cap 21600, ESI 0.75/3.25 @ ≤252000, PT 2400/yr, std deduction 75000, cess 4%, SALARY_BANDS INR.
→ Policy engine (statutory packs, effective-dated).

## 14. Holiday/location assumptions (Critical)
- 14.1 IST offset 330 in cron-attendance. 14.2 en-IN locale `cron-hr.service.ts:172`, `cron-recruitment.service.ts:241`. 14.3 ₹ + en-IN in payslip-html/pdf/payroll templates. 14.4 vendor address in payslip preview. 14.5 POSH task global seed.
→ per-org timezone/locale/currency config.

## 15. Role-string assumptions (Critical)
- 15.1 "HR"/"CEO" literals: exit-write.service.ts:87,108,144, exit.controller.ts:67,79, resignation-jobs.service.ts:19-20, termination.service.ts:89,121.
- 15.2 role==="HR" queries: leaves-write.service.ts:557, clients/client-accounts.service.ts:210, cron-recruitment.service.ts:231, hr-helpdesk/hr-helpdesk.service.ts:84.
- 15.3 `hr-recruitment/recruitment-roles.ts` — RECRUITMENT_MANAGER_ROLES/RECRUITER_ROLES arrays.
- 15.4 `onboarding/onboarding.service.ts:253` — ownerRole "HR"|"MANAGER" filter.
- 15.5 `cron/cron-weekly-recap.service.ts:63` — role==="CEO" recap.
- 15.6 `email/controllers/hr-send-email.controller.ts:55` + `notifications-dispatch.controller.ts:16` — role gate CEO/HR/ADMIN.
→ RBAC permission keys, not role names. Also `hr-helpdesk.controller.ts:25` role list bypassing @RequirePermission.

## HR cron inventory
auto-checkout (IST 19:00, 1h break, >8h OT) · monthly-leave-reset (Jan-only, 12CL/6SL, name match) · daily-notifications (birthday text) · holiday-notifications (1-day lead fixed) · certification-expiry (30d) · document-expiry (30d, en-IN) · onboarding-sweep · offer-deadline-reminders (1d, en-IN) · interview-no-shows (24h, hrMembers[0]).

## Engine mapping
- Policy engine: 1.x, 2.1, 2.3, 3.1, 4.3, 4.4, 6.x, 7, 8.1, 8.2, 13.x, 14.1-14.3
- Workflow engine: 12.x, 9.1, 10.1
- Notification registry: 11.x, 12.4, 12.5, 15.5
- Template engine: 8.3, 9.1, 11.x, 13.5
- RBAC capabilities: 15.x, 12.3
- Automation engine: 2.2, 3.2, 4.5
- Org config (tz/locale/currency): 14.x
