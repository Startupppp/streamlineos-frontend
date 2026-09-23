import type { Permission } from "./types";

export const SELF_PERMISSIONS: Permission[] = [
  { name: "self:attendance", resource: "self", action: "attendance", description: "Check in/out own attendance" },
  { name: "self:cases", resource: "self", action: "cases", description: "View and acknowledge disciplinary actions issued to oneself" },
  { name: "self:expenses", resource: "self", action: "expenses", description: "Submit and view own expense claims" },
  { name: "self:leaves", resource: "self", action: "leaves", description: "Submit and view own leave requests" },
  { name: "self:onboarding-docs", resource: "self", action: "onboarding-docs", description: "Upload and view own onboarding documents" },
  { name: "self:onboarding-tasks", resource: "self", action: "onboarding-tasks", description: "View and complete own onboarding tasks" },
  { name: "self:payroll", resource: "self", action: "payroll", description: "Access the ESS payroll portal (salary breakdown, declarations, loan requests, bank details)" },
  { name: "self:payslips", resource: "self", action: "payslips", description: "View own payslips" },
  { name: "self:recruitment", resource: "self", action: "recruitment", description: "View assigned interviews and submit own hiring feedback" },
  { name: "self:job-openings", resource: "self", action: "job-openings", description: "Browse internal job openings and apply to them" },
  { name: "self:referrals", resource: "self", action: "referrals", description: "Submit candidate referrals and track own referrals" },
  { name: "self:support", resource: "self", action: "support", description: "Raise employee support requests and follow own requests" },
];
