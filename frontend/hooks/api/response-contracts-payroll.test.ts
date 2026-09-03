import {
  payrollRunDetailContract,
  payrollRunListItemContract,
  payrollReportSummaryContract,
  runEmployeeContract,
} from "@/hooks/api/payroll/runs-schema";
import {
  essLoanContract,
  essReimbursementContract,
  essSalaryStructureContract,
} from "@/hooks/api/payroll/ess-money-schema";
import {
  PAYROLL_RUN_DETAIL,
  PAYROLL_RUN_LIST_ITEM,
} from "@/test-utils/money-contract-fixtures";

describe("payroll money", () => {
  it("accepts a run list row", () => {
    expect(payrollRunListItemContract.safeParse(PAYROLL_RUN_LIST_ITEM).success).toBe(true);
  });

  it("rejects a run total that arrived as a number", () => {
    const result = payrollRunListItemContract.safeParse({ ...PAYROLL_RUN_LIST_ITEM, netTotal: 4820000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("netTotal");
  });

  it("rejects a run total that arrived as null — these columns are NOT NULL", () => {
    expect(payrollRunListItemContract.safeParse({ ...PAYROLL_RUN_LIST_ITEM, grossTotal: null }).success).toBe(false);
  });

  it("accepts a run detail with no prior run to compare against", () => {
    expect(payrollRunDetailContract.safeParse(PAYROLL_RUN_DETAIL).success).toBe(true);
  });

  it("rejects a run detail whose checklist lost its href", () => {
    const body = {
      ...PAYROLL_RUN_DETAIL,
      checklist: [{ key: "inputs_locked", label: "Lock inputs", done: false, detail: null }],
    };
    expect(payrollRunDetailContract.safeParse(body).success).toBe(false);
  });

  it("accepts a run employee with no name, and rejects one with a numeric gross", () => {
    const row = {
      id: 1, userId: "u-1", workerType: "EMPLOYEE", currency: "INR", gross: "100000.00",
      totalDeductions: "12000.00", net: "88000.00", status: "PENDING", holdReason: null,
      userName: null, userEmail: "a@b.co",
    };
    expect(runEmployeeContract.safeParse(row).success).toBe(true);
    expect(runEmployeeContract.safeParse({ ...row, gross: 100000 }).success).toBe(false);
  });

  it("accepts a provisional summary with no run for the month", () => {
    expect(payrollReportSummaryContract.safeParse({ provisional: true, run: null }).success).toBe(true);
  });

  it("rejects a salary structure whose annualCtc became a number", () => {
    const body = {
      profile: { annualCtc: 1200000, workerType: "EMPLOYEE", taxRegime: "NEW", costCenter: null, effectiveFrom: "2026-04-01" },
      components: [],
    };
    expect(essSalaryStructureContract.safeParse(body).success).toBe(false);
  });

  it("accepts a reimbursement filed with no description", () => {
    const row = {
      id: 1, category: "TRAVEL", amount: "1200.00", description: null, receiptUrl: null,
      status: "PENDING", payrollMonth: null, createdAt: "2026-04-01T00:00:00.000Z",
    };
    expect(essReimbursementContract.safeParse(row).success).toBe(true);
  });

  it("rejects a loan balance that arrived as a number", () => {
    const row = {
      id: 1, amount: "50000.00", reason: null, emiAmount: "5000.00", totalEmis: 10,
      paidEmis: 2, status: "ACTIVE", balance: 40000, createdAt: "2026-04-01T00:00:00.000Z",
    };
    expect(essLoanContract.safeParse(row).success).toBe(false);
  });
});
