import type { Permission } from "./types";

export const SELF_PERMISSIONS: Permission[] = [
  { name: "self:attendance", resource: "self", action: "attendance", description: "Check in/out own attendance" },
  { name: "self:cases", resource: "self", action: "cases", description: "View and acknowledge disciplinary actions issued to oneself" },
  { name: "self:expenses", resource: "self", action: "expenses", description: "Submit and view own expense claims" },
  { name: "self:leaves", resource: "self", action: "leaves", description: "Submit and view own leave requests" },
  { name: "self:onboarding-docs", resource: "self", action: "onboarding-docs", description: "Upload and view own onboarding documents" },
  { name: "self:payroll", resource: "self", action: "payroll", description: "Access the ESS payroll portal (salary breakdown, declarations, loan requests, bank details)" },
  { name: "self:payslips", resource: "self", action: "payslips", description: "View own payslips" },
];
