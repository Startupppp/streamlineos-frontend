import { z } from "zod";

const essActionItemContract = z.object({
  key: z.string(),
  label: z.string(),
  severity: z.enum(["info", "warning"]),
  href: z.string(),
});

export const essOverviewContract = z.object({
  toggles: z.record(z.string(), z.boolean()),
  capabilities: z.object({
    mode: z.literal("employee_self_service"),
    honestyNote: z.string(),
    canViewSalaryStructure: z.boolean(),
    canUpdateBank: z.boolean(),
    canRequestLoans: z.boolean(),
    canDeclareTax: z.boolean(),
    canClaimReimbursements: z.boolean(),
  }),
  latestPayslip: z
    .object({
      publicationId: z.number(),
      month: z.string(),
      net: z.string().nullable(),
      downloadHref: z.string(),
    })
    .nullable(),
  nextPayDate: z.object({ date: z.string(), label: z.string() }).nullable(),
  ytd: z.object({ gross: z.string(), net: z.string() }),
  activeLoanBalance: z.string(),
  pendingReimbursementsCount: z.number(),
  taxWindow: z
    .object({
      status: z.string(),
      financialYear: z.string(),
      closesAt: z.string(),
    })
    .nullable(),
  declarationStatus: z.string().nullable(),
  actionRequired: z.array(essActionItemContract),
});

const investmentProofContract = z.object({
  id: z.number(),
  orgId: z.string(),
  declarationId: z.number(),
  category: z.string(),
  amount: z.string(),
  description: z.string().nullable(),
  proofUrl: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

const taxDeclarationRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().nullable(),
  financialYear: z.string(),
  regime: z.string(),
  hra: z.string(),
  lta: z.string(),
  section80c: z.string(),
  section80d: z.string(),
  section80g: z.string(),
  homeLoanInterest: z.string(),
  previousEmploymentIncome: z.string(),
  previousEmployerTds: z.string(),
  status: z.string(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taxDeclarationResponseContract = z.union([
  z.object({
    windowStatus: z.null(),
    declaration: z.null(),
    proofs: z.array(investmentProofContract),
  }),
  z.object({
    windowStatus: z.literal("OPEN"),
    financialYear: z.string(),
    closesAt: z.string(),
    declaration: taxDeclarationRowContract.nullable(),
    proofs: z.array(investmentProofContract),
  }),
]);

const bankMaskedContract = z.object({
  accountNumber: z.string(),
  bankName: z.string(),
  branch: z.string(),
  ifsc: z.string(),
  accountHolder: z.string(),
  bankCountry: z.string().nullable(),
});

export const bankDetailsResponseContract = z.union([
  z.object({ hasBank: z.literal(false), masked: z.null() }),
  z.object({ hasBank: z.literal(true), masked: bankMaskedContract }),
]);

export const updateBankResultContract = z.object({ updated: z.literal(true) });

export const ownFnfContract = z
  .object({
    id: z.number(),
    basicDues: z.string(),
    leaveEncashment: z.string(),
    bonusDue: z.string(),
    deductions: z.string(),
    loanRecovery: z.string(),
    netPayable: z.string(),
    status: z.string(),
    notes: z.string().nullable(),
    reimbursementsDue: z.string(),
    assetRecovery: z.string(),
    noticeRecovery: z.string(),
    otherDeductions: z.string(),
    statementPublishedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .nullable();

const totalRewardsBenefitLineContract = z.object({
  planName: z.string(),
  category: z.string(),
  status: z.string(),
  estimatedEmployerMonthly: z.string().nullable(),
  note: z.string(),
});

const totalRewardsEquityLineContract = z.object({
  grantType: z.string(),
  units: z.number(),
  status: z.string(),
  grantDate: z.string(),
  strikePrice: z.string().nullable(),
  note: z.string(),
});

export const totalRewardsStatementContract = z.object({
  mode: z.literal("illustrative_statement"),
  honestyNote: z.string(),
  asOf: z.string(),
  financialYear: z.string(),
  cash: z.object({
    annualCtc: z.string().nullable(),
    ytdGross: z.string(),
    ytdNet: z.string(),
    activeLoanBalance: z.string(),
  }),
  benefits: z.object({
    lines: z.array(totalRewardsBenefitLineContract),
    estimatedEmployerAnnual: z.string().nullable(),
  }),
  equity: z.object({
    lines: z.array(totalRewardsEquityLineContract),
    totalUnits: z.number(),
    valued: z.literal(false),
  }),
  leave: z.object({
    lines: z.array(z.object({ leaveType: z.string(), balanceDays: z.string() })),
    note: z.string(),
  }),
  summary: z.object({
    cashAnnualCtc: z.string().nullable(),
    benefitsEmployerAnnualEstimate: z.string().nullable(),
    equityUnits: z.number(),
    completeness: z.string(),
    missing: z.array(z.string()),
  }),
});

export type EssOverview = z.infer<typeof essOverviewContract>;
export type TaxDeclarationResponse = z.infer<typeof taxDeclarationResponseContract>;
export type TotalRewardsStatement = z.infer<typeof totalRewardsStatementContract>;
