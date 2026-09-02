import {
  billingPlansContract,
  billingProfileContract,
  couponValidationContract,
  seatInfoContract,
  subscriptionResponseContract,
} from "@/hooks/api/subscription-schema";
import {
  invoiceContract,
  invoiceStatsContract,
  invoicesPageContract,
} from "@/hooks/api/invoice-schema";
import {
  arPaymentContract,
  creditNoteContract,
} from "@/hooks/api/accounting/ar-schema";
import { bankAccountContract } from "@/hooks/api/accounting/banking-schema";
import {
  expenseByCategoryRowContract,
  taxSummaryRowContract,
} from "@/hooks/api/accounting/reports-schema";
import {
  glAccountsContract,
  glResponseContract,
} from "@/hooks/api/accounting/core-gl-schema";
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
  BANK_ACCOUNT,
  CREDIT_NOTE,
  AR_PAYMENT,
  INVOICE,
  PAYROLL_RUN_DETAIL,
  PAYROLL_RUN_LIST_ITEM,
  SUBSCRIPTION_RESPONSE,
} from "@/test-utils/money-contract-fixtures";

/**
 * The money band. Both halves matter and the rejecting half is the point: every
 * `reject` case below is a shape the previous hand-written type would have
 * accepted in silence, and each one is a wrong number on a screen.
 */

describe("platform billing accepts what the backend builds", () => {
  it("accepts a subscription with a null payment amount", () => {
    expect(subscriptionResponseContract.safeParse(SUBSCRIPTION_RESPONSE).success).toBe(true);
  });

  it("accepts a SUSPENDED subscription, the sixth status the client union omitted", () => {
    const body = {
      ...SUBSCRIPTION_RESPONSE,
      subscription: { ...SUBSCRIPTION_RESPONSE.subscription, status: "SUSPENDED" },
    };
    expect(subscriptionResponseContract.safeParse(body).success).toBe(true);
  });

  it("accepts an org with no subscription at all", () => {
    const body = { subscription: null, publicKeyId: null, isConfigured: false };
    expect(subscriptionResponseContract.safeParse(body).success).toBe(true);
  });
});

describe("platform billing rejects the drift", () => {
  it("rejects a payment amount that arrived as a number", () => {
    const body = {
      ...SUBSCRIPTION_RESPONSE,
      subscription: {
        ...SUBSCRIPTION_RESPONSE.subscription,
        payments: [{ ...SUBSCRIPTION_RESPONSE.subscription.payments[0], amount: 4999 }],
      },
    };
    const result = subscriptionResponseContract.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("subscription.payments.0.amount");
  });

  it("rejects a status outside the six the database enum allows", () => {
    const body = {
      ...SUBSCRIPTION_RESPONSE,
      subscription: { ...SUBSCRIPTION_RESPONSE.subscription, status: "GRACE" },
    };
    expect(subscriptionResponseContract.safeParse(body).success).toBe(false);
  });

  it("rejects a plan catalogue that dropped its paise price", () => {
    const body = {
      plans: [
        { id: "STARTER", name: "Starter", monthlyPrice: 999, annualPrice: 799, features: [], maxEmployees: 10 },
      ],
      trialPlan: "STARTER",
    };
    expect(billingPlansContract.safeParse(body).success).toBe(false);
  });

  it("rejects a seat count that arrived as a string", () => {
    const body = { total: 50, used: "12", available: 38, activeMembers: 10, pendingInvitations: 2 };
    expect(seatInfoContract.safeParse(body).success).toBe(false);
  });

  it("accepts a billing profile whose country came back null", () => {
    const body = {
      id: 1, orgId: "org-1", gstin: null, pan: null, billingName: null,
      billingEmail: null, addressLine1: null, addressLine2: null, city: null,
      state: null, pincode: null, country: null, isTaxExempt: false,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(billingProfileContract.safeParse(body).success).toBe(true);
  });

  it("rejects a coupon discount that lost its paise integer", () => {
    const body = { valid: true, couponId: 3, type: "PERCENTAGE", value: 10, discountAmount: "9990", message: "10% discount applied" };
    expect(couponValidationContract.safeParse(body).success).toBe(false);
  });
});

describe("customer invoicing", () => {
  it("accepts an invoice in one of the three statuses the client union omitted", () => {
    for (const status of ["SENT", "PARTIALLY_PAID", "OVERDUE"]) {
      expect(invoiceContract.safeParse({ ...INVOICE, status }).success).toBe(true);
    }
  });

  it("supplies the empty lineItems array the server never sends", () => {
    const parsed = invoiceContract.parse(INVOICE);
    expect(parsed.lineItems).toEqual([]);
  });

  it("rejects a total that arrived as a number rather than a decimal string", () => {
    const result = invoiceContract.safeParse({ ...INVOICE, total: 11800 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("total");
  });

  it("rejects a timestamp serialised as anything but a string", () => {
    expect(invoiceContract.safeParse({ ...INVOICE, createdAt: 1767225600000 }).success).toBe(false);
  });

  it("rejects a page that lost its total", () => {
    expect(invoicesPageContract.safeParse({ items: [INVOICE], page: 1, totalPages: 1 }).success).toBe(false);
  });

  it("rejects stats totals that arrived as strings — these two really are numbers", () => {
    const stats = { draft: 1, issued: 2, paid: 3, failed: 0, voided: 0, totalOutstanding: "5000", totalPaid: 900 };
    const result = invoiceStatsContract.safeParse(stats);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("totalOutstanding");
  });
});

describe("accounting money", () => {
  it("accepts a receivable payment with four-decimal allocations", () => {
    expect(arPaymentContract.safeParse(AR_PAYMENT).success).toBe(true);
  });

  it("rejects a receivable amount parsed into a number", () => {
    expect(arPaymentContract.safeParse({ ...AR_PAYMENT, amount: 1500 }).success).toBe(false);
  });

  it("rejects a payment method no writer in the API can produce", () => {
    expect(arPaymentContract.safeParse({ ...AR_PAYMENT, paymentMethod: "crypto" }).success).toBe(false);
  });

  it("accepts a credit note whose list projection omits orgId, notes and client", () => {
    expect(creditNoteContract.safeParse(CREDIT_NOTE).success).toBe(true);
  });

  it("rejects a credit note whose appliedAmount became a number", () => {
    expect(creditNoteContract.safeParse({ ...CREDIT_NOTE, appliedAmount: 0 }).success).toBe(false);
  });

  it("rejects a bank balance that arrived as a number", () => {
    const result = bankAccountContract.safeParse({ ...BANK_ACCOUNT, currentBalance: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("currentBalance");
  });

  it("rejects a tax figure that arrived as a number", () => {
    const row = {
      month: "2026-04", outputCgst: "10.00", outputSgst: "10.00", outputIgst: "0.00",
      inputCgst: "4.00", inputSgst: "4.00", inputIgst: "0.00", netPayable: 12,
    };
    expect(taxSummaryRowContract.safeParse(row).success).toBe(false);
  });

  it("accepts an uncategorised expense row, which is why categoryId is nullable", () => {
    const row = { categoryId: null, categoryName: "Uncategorized", totalAmount: "12.00", count: 1 };
    expect(expenseByCategoryRowContract.safeParse(row).success).toBe(true);
  });

  it("rejects the general-ledger shape the client currently declares", () => {
    const clientShape = {
      openingBalance: "0.0000",
      closingBalance: "0.0000",
      items: [{ entryId: 1, entryNumber: "JE-1", date: "2026-04-01", description: null, debit: "10.0000", credit: "0.0000", runningBalance: "10.0000" }],
      nextCursor: null,
    };
    expect(glResponseContract.safeParse(clientShape).success).toBe(false);
  });

  it("accepts the ledger the service actually emits — amounts are JSON numbers here", () => {
    const wire = {
      openingBalance: 0,
      closingBalance: 10,
      items: [
        {
          lineId: 7, entryId: 1, entryNumber: "JE-1", entryDate: "2026-04-01",
          description: null, entryDescription: "Opening", accountId: 4,
          accountCode: "1000", accountName: "Cash", debit: 10, credit: 0,
          sourceType: "manual", sourceId: null, clientId: null, vendorId: null,
          projectId: null, departmentId: null, runningBalance: 10,
        },
      ],
      nextCursor: null,
    };
    expect(glResponseContract.safeParse(wire).success).toBe(true);
  });

  it("BITE: a ledger amount that came back as a decimal string is rejected", () => {
    const wire = {
      openingBalance: 0, closingBalance: 10, nextCursor: null,
      items: [
        {
          lineId: 7, entryId: 1, entryNumber: "JE-1", entryDate: "2026-04-01",
          description: null, entryDescription: null, accountId: 4,
          accountCode: "1000", accountName: "Cash", debit: "10.0000", credit: 0,
          sourceType: "manual", sourceId: null, clientId: null, vendorId: null,
          projectId: null, departmentId: null, runningBalance: 10,
        },
      ],
    };
    const result = glResponseContract.safeParse(wire);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("items.0.debit");
  });

  it("accepts the accounts-with-activity ARRAY, which the client declared as { items }", () => {
    const wire = [
      {
        accountId: 4, code: "1000", name: "Cash", accountType: "ASSET",
        periodDebit: 10, periodCredit: 0, netActivity: 10,
      },
    ];
    expect(glAccountsContract.safeParse(wire).success).toBe(true);
    expect(glAccountsContract.safeParse({ items: wire }).success).toBe(false);
  });

  it("BITE: an account type outside the pg enum is rejected rather than mis-filed", () => {
    const wire = [
      {
        accountId: 4, code: "1000", name: "Cash", accountType: "ASSETS",
        periodDebit: 10, periodCredit: 0, netActivity: 10,
      },
    ];
    expect(glAccountsContract.safeParse(wire).success).toBe(false);
  });
});

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
