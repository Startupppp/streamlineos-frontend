export const TOGGLE_GROUPS = [
  {
    id: "statutory",
    label: "Statutory Compliance",
    description: "Government-mandated deductions and contributions",
    keys: ["pf", "esi", "professionalTax", "tds", "gratuity", "lwf"],
  },
  {
    id: "attendance",
    label: "Attendance & Inputs",
    description: "How payroll inputs are calculated",
    keys: ["lopFromAttendance", "overtime", "timesheets", "leaveSync", "requireLockedPayrollInputs"],
  },
  {
    id: "earnings",
    label: "Earnings & Variable Pay",
    description: "Additional pay components and variable items",
    keys: [
      "expenseSync", "salesIncentives", "manualAdjustments",
      "reimbursements", "bonuses", "incentives", "loans",
      "contractorPayments", "multiCurrency",
    ],
  },
  {
    id: "payout",
    label: "Payout & Payslips",
    description: "How salaries are disbursed and communicated",
    keys: ["bankPayoutFile", "payslipPublishing", "emailPayslips"],
  },
  {
    id: "workflow",
    label: "Workflow & Approval",
    description: "Approval chains and compliance workflows",
    keys: [
      "approvalWorkflow", "managerApproval", "financeApproval",
      "lockAfterApproval", "payrollVarianceWarnings",
      "countryComplianceChecklist", "globalPaymentReport", "employeeDeclarations",
    ],
  },
  {
    id: "ess",
    label: "Employee Self-Service",
    description: "What employees can access in ESS portal",
    keys: [
      "essShowSalaryStructure", "essAllowBankUpdate",
      "essAllowLoanRequests", "essAllowTaxDeclarations", "essAllowReimbursements",
    ],
  },
] as const;

export const RISKY_TOGGLES = new Set([
  "pf", "esi", "professionalTax", "tds", "gratuity", "lwf",
  "approvalWorkflow", "managerApproval", "financeApproval", "lockAfterApproval",
  "requireLockedPayrollInputs",
]);

export const TOGGLE_META: Record<string, { label: string; description: string }> = {
  pf: { label: "Provident Fund (PF)", description: "12% employee + 12% employer contribution" },
  esi: { label: "ESI", description: "Employee State Insurance for eligible employees" },
  professionalTax: { label: "Professional Tax", description: "State-wise deduction varies by slab" },
  tds: { label: "TDS / Income Tax", description: "Tax deducted at source on salary income" },
  gratuity: { label: "Gratuity", description: "15 days salary per year after 5 years service" },
  lwf: { label: "Labour Welfare Fund", description: "State-specific monthly contribution" },
  lopFromAttendance: { label: "LOP from Attendance", description: "Auto-calculate loss-of-pay from attendance records" },
  overtime: { label: "Overtime Pay", description: "Calculate and pay overtime hours" },
  timesheets: { label: "Timesheet Integration", description: "Pull hours from project timesheets" },
  leaveSync: { label: "Leave Sync", description: "Sync approved leaves for LOP calculation" },
  expenseSync: { label: "Expense Sync", description: "Include approved expenses in payroll" },
  salesIncentives: { label: "Sales Incentives", description: "Import CRM-based incentive calculations" },
  manualAdjustments: { label: "Manual Adjustments", description: "Allow one-time additions or deductions per run" },
  reimbursements: { label: "Reimbursements", description: "Process employee reimbursement claims" },
  bonuses: { label: "Bonuses", description: "Festive, performance, or retention bonuses" },
  incentives: { label: "Incentives", description: "Variable pay incentive programs" },
  loans: { label: "Employee Loans", description: "Deduct EMI from salary for salary advances" },
  contractorPayments: { label: "Contractor Payments", description: "Process non-employee contractor payouts" },
  multiCurrency: { label: "Multi-Currency", description: "Pay employees in foreign currencies" },
  employeeDeclarations: { label: "Investment Declarations", description: "Employees declare investments for TDS calculation" },
  payrollVarianceWarnings: { label: "Variance Warnings", description: "Alert when pay changes >20% vs last month" },
  requireLockedPayrollInputs: {
    label: "Require Locked Inputs (Freeze Before Pay)",
    description: "Block payroll generate unless attendance/leave inputs are locked for the period",
  },
  countryComplianceChecklist: { label: "Compliance Checklist", description: "Run statutory compliance checks before approving" },
  globalPaymentReport: { label: "Global Payment Report", description: "Consolidated payout report across all entities" },
  bankPayoutFile: { label: "Bank Payout File", description: "Generate bank-compatible payment file (NEFT/RTGS)" },
  payslipPublishing: { label: "Payslip Publishing", description: "Publish digital payslips to employee portal" },
  emailPayslips: { label: "Email Payslips", description: "Email payslip PDF on payroll close" },
  approvalWorkflow: { label: "Approval Workflow", description: "Require approval before payroll can be disbursed" },
  managerApproval: { label: "Manager Approval", description: "Require line manager to approve team salaries" },
  financeApproval: { label: "Finance Approval", description: "Require finance team sign-off" },
  lockAfterApproval: { label: "Lock After Approval", description: "Prevent changes once final approval is given" },
  essShowSalaryStructure: { label: "Show Salary Structure", description: "Employees can view their full salary breakdown" },
  essAllowBankUpdate: { label: "Allow Bank Update", description: "Employees can update their bank account" },
  essAllowLoanRequests: { label: "Allow Loan Requests", description: "Employees can request salary advances" },
  essAllowTaxDeclarations: { label: "Allow Tax Declarations", description: "Employees can submit investment proof" },
  essAllowReimbursements: { label: "Allow Reimbursements", description: "Employees can submit expense claims" },
};

export const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
];

export const PAY_FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "SEMI_MONTHLY", label: "Semi-Monthly" },
  { value: "BI_WEEKLY", label: "Bi-Weekly" },
  { value: "WEEKLY", label: "Weekly" },
] as const;

export const COMPLEXITY_CONFIG = {
  SIMPLE: { label: "Simple", className: "bg-status-success-surface text-status-success-ink border border-status-success-rule" },
  MODERATE: { label: "Moderate", className: "bg-status-warning-surface text-status-warning-ink border border-status-warning-rule" },
  ADVANCED: { label: "Advanced", className: "bg-status-danger-surface text-status-danger-ink border border-status-danger-rule" },
} as const;
