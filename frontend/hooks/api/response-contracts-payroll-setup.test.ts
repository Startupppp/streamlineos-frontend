import {
  policyPreviewContract,
  templatePreviewContract,
} from "@/hooks/api/payroll/setup-preview-schema";

/**
 * The two payroll setup previews, asserted on what the READ PATH returns.
 *
 * `POLICY_PREVIEW` below is the payload `PolicyQueryService.preview` actually emits for the
 * INDIAN_STANDARD template — dumped from the real service, not written from the client type.
 * `PRE_FIX_POLICY_COMPONENTS` is what it emitted before: the raw `TemplateComponentDef` seed
 * literals, where an unset optional is an ABSENT KEY rather than a null, and where there has
 * never been a `monthlyAmount`. The client declared `PreviewLine[]` over that and rendered
 * `formatMoney(line.monthlyAmount)`, so every salary component on the setup review step showed
 * an em dash while both repositories typechecked clean.
 */

const POLICY_PREVIEW = {
  toggles: { pf: true, professionalTax: true, approvalWorkflow: true },
  components: [
    {
      code: "BASIC",
      name: "Basic Salary",
      type: "EARNING",
      calcMethod: "FORMULA",
      amount: null,
      percent: null,
      formula: "ctc * 0.40",
      taxable: true,
      showOnPayslip: true,
      includeInCtc: true,
      isStatutory: false,
      statutoryKey: null,
      sortOrder: 1,
    },
    {
      code: "PT",
      name: "Professional Tax",
      type: "DEDUCTION",
      calcMethod: "FIXED",
      amount: "200.00",
      percent: null,
      formula: null,
      taxable: false,
      showOnPayslip: true,
      includeInCtc: false,
      isStatutory: true,
      statutoryKey: "PT",
      sortOrder: 10,
    },
  ],
  approvalChain: [
    { stage: 1, stageName: "Payroll Admin Approval", requiredPermission: "payroll:runs:approve" },
  ],
  calendarPlan: [
    {
      orgId: "org-1",
      policyId: -1,
      month: "2026-09",
      type: "ATTENDANCE_CUTOFF",
      date: "2026-09-20",
      title: "Attendance Cutoff",
    },
  ],
  essOptions: {
    showSalaryStructure: false,
    allowBankUpdate: false,
    allowLoanRequests: false,
    allowTaxDeclarations: true,
    allowReimbursements: false,
  },
  statutoryPack: {
    country: "IN",
    countryName: "India",
    currency: "INR",
    taxRegimeApplicable: true,
    items: [
      {
        key: "PF_EMP",
        label: "Provident Fund (Employee)",
        kind: "EMPLOYEE_DEDUCTION",
        componentCode: "PF_EMP",
        enabled: true,
        calc: { method: "PERCENT_OF_BASIC", percent: "12", wageCeilingMonthly: "15000.00" },
      },
    ],
    complianceChecklist: [
      { key: "epfo_registration", label: "Register entity with EPFO", detail: "Required." },
    ],
  },
};

/** The seed literals, exactly as they used to leave the endpoint. */
const PRE_FIX_POLICY_COMPONENTS = [
  {
    code: "BASIC",
    name: "Basic Salary",
    type: "EARNING",
    calcMethod: "FORMULA",
    formula: "ctc * 0.40",
    taxable: true,
    showOnPayslip: true,
    includeInCtc: true,
    isStatutory: false,
    sortOrder: 1,
  },
];

const TEMPLATE_PREVIEW = {
  template: { id: 3, key: "INDIAN_STANDARD", name: "Indian Standard" },
  effectiveToggles: { pf: true },
  annualCtc: 1200000,
  monthlyCtc: 100000,
  components: [
    {
      code: "BASIC",
      name: "Basic Salary",
      type: "EARNING",
      calcMethod: "FORMULA",
      monthlyAmount: "40000.00",
      taxable: true,
      includeInCtc: true,
      isStatutory: false,
      sortOrder: 1,
      explain: "ctc * 0.40",
    },
  ],
  totals: {
    grossEarnings: "100000.00",
    totalDeductions: "2000.00",
    employerContributions: "1800.00",
    netTakeHome: "98000.00",
  },
};

describe("payroll policy preview — a component DEFINITION, never an amount", () => {
  it("accepts the payload the endpoint emits", () => {
    expect(policyPreviewContract.safeParse(POLICY_PREVIEW).success).toBe(true);
  });

  it("BITE: the payload it emitted before — raw seed defs with the optionals absent — fails", () => {
    const result = policyPreviewContract.safeParse({
      ...POLICY_PREVIEW,
      components: PRE_FIX_POLICY_COMPONENTS,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual([
      "components.0.amount",
      "components.0.percent",
      "components.0.statutoryKey",
    ]);
  });

  it("BITE: monthlyAmount cannot come back through this contract even if it is sent", () => {
    const parsed = policyPreviewContract.parse({
      ...POLICY_PREVIEW,
      components: [{ ...POLICY_PREVIEW.components[0], monthlyAmount: "40000.00" }],
    });

    expect(parsed.components[0]).not.toHaveProperty("monthlyAmount");
    expect(parsed.components[0].formula).toBe("ctc * 0.40");
  });

  it("rejects a percent that arrived as a number — decimal(7,4) is a string on the wire", () => {
    const result = policyPreviewContract.safeParse({
      ...POLICY_PREVIEW,
      components: [{ ...POLICY_PREVIEW.components[1], percent: 12 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a component that lost its calcMethod — the review step renders from it", () => {
    const { calcMethod: _calcMethod, ...withoutCalcMethod } = POLICY_PREVIEW.components[0];
    const result = policyPreviewContract.safeParse({
      ...POLICY_PREVIEW,
      components: [withoutCalcMethod],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("components.0.calcMethod");
  });

  it("rejects a null calendar plan — the route always sends the seven events", () => {
    expect(policyPreviewContract.safeParse({ ...POLICY_PREVIEW, calendarPlan: null }).success).toBe(
      false,
    );
  });
});

describe("payroll template preview — the sibling that CAN answer an amount", () => {
  it("accepts the payload the endpoint emits", () => {
    expect(templatePreviewContract.safeParse(TEMPLATE_PREVIEW).success).toBe(true);
  });

  it("BITE: the client declared annualCtc as a string; the route divides and sends a number", () => {
    const result = templatePreviewContract.safeParse({ ...TEMPLATE_PREVIEW, annualCtc: "1200000" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("annualCtc");
  });

  it("BITE: the client declared template as a full TemplateRow; three fields arrive", () => {
    const parsed = templatePreviewContract.parse(TEMPLATE_PREVIEW);

    expect(Object.keys(parsed.template).sort()).toEqual(["id", "key", "name"]);
    expect(parsed.template).not.toHaveProperty("complexity");
    expect(parsed.template).not.toHaveProperty("defaultComponents");
  });

  it("rejects a line that lost monthlyAmount — here the amount IS the point", () => {
    const { monthlyAmount: _monthlyAmount, ...withoutAmount } = TEMPLATE_PREVIEW.components[0];
    const result = templatePreviewContract.safeParse({
      ...TEMPLATE_PREVIEW,
      components: [withoutAmount],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("components.0.monthlyAmount");
  });
});
