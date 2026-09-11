import type { TriggerMeta } from "./automation-trigger-types";

export const HR_SPEND_TRIGGER_META: TriggerMeta[] = [
  {
    value: "expense.submitted",
    label: "Expense submitted",
    description: "Runs when an employee submits a new expense claim",
    module: "hr",
    fields: [],
    samplePayload: {
      expenseId: 1,
      userId: "",
      employeeName: "Jane Smith",
      amount: "2500",
      category: "Travel",
      submittedAt: "2026-06-21T10:00:00Z",
    },
  },
  {
    value: "expense.approved",
    label: "Expense approved",
    description: "Runs when an expense claim is approved",
    module: "hr",
    fields: [],
    samplePayload: {},
  },
  {
    value: "reimbursement.approved",
    label: "Reimbursement approved",
    description: "Runs when a reimbursement request is approved",
    module: "hr",
    fields: [{ value: "decision", label: "Decision" }],
    samplePayload: {
      reimbursementId: 1,
      userId: "",
      employeeName: "Jane Smith",
      employeeEmail: "jane@company.com",
      amount: "2500",
      decision: "APPROVED",
    },
  },
  {
    value: "reimbursement.rejected",
    label: "Reimbursement rejected",
    description: "Runs when a reimbursement request is rejected",
    module: "hr",
    fields: [{ value: "decision", label: "Decision" }],
    samplePayload: {
      reimbursementId: 1,
      userId: "",
      employeeName: "Jane Smith",
      employeeEmail: "jane@company.com",
      amount: "2500",
      decision: "REJECTED",
    },
  },
];
