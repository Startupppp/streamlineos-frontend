export interface EssToggles {
  essShowSalaryStructure: boolean;
  essAllowBankUpdate: boolean;
  essAllowLoanRequests: boolean;
  essAllowTaxDeclarations: boolean;
  essAllowReimbursements: boolean;
  emailPayslips: boolean;
}

/**
 * `EssPayslip` and `EssBankDetails` are `z.infer`red from the contracts that
 * validate them at the fetch seam (`hooks/api/payroll/ess-schema.ts`).
 */
export type {
  EssBankDetails,
  EssPayslip,
} from "@/hooks/api/payroll/ess-schema";

export interface EssCapabilities {
  mode: "employee_self_service";
  honestyNote: string;
  canViewSalaryStructure: boolean;
  canUpdateBank: boolean;
  canRequestLoans: boolean;
  canDeclareTax: boolean;
  canClaimReimbursements: boolean;
}

export interface EssActionRequired {
  key: string;
  label: string;
  severity: "info" | "warning";
  href: string;
}

export interface EssOverview {
  toggles: EssToggles;
  capabilities?: EssCapabilities;
  latestPayslip: {
    publicationId: number;
    month: string;
    net: string | null;
    downloadHref: string;
  } | null;
  nextPayDate: { date: string; label: string } | null;
  ytd: { gross: string; net: string };
  activeLoanBalance: string;
  pendingReimbursementsCount: number;
  taxWindow: { status: string; financialYear: string; closesAt: string | null } | null;
  declarationStatus: string | null;
  actionRequired?: EssActionRequired[];
}

export interface ManagerTeamMember {
  userId: string;
  name: string | null;
  email: string | null;
  pendingReimbursements: number;
  pendingLoans: number;
  latestPayslip: {
    month: string;
    net: string | null;
    publicationId: number;
  } | null;
  taxDeclarationStatus: string | null;
  actionCount: number;
}

export interface ManagerPendingReimbursement {
  id: number;
  userId: string;
  userName: string | null;
  category: string;
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface ManagerPendingLoan {
  id: number;
  userId: string;
  userName: string | null;
  amount: string;
  reason: string | null;
  totalEmis: number | null;
  createdAt: string;
}

export interface ManagerInbox {
  mode: "manager_self_service";
  honestyNote: string;
  reportCount: number;
  canApproveReimbursements?: boolean;
  canApproveLoans?: boolean;
  members: ManagerTeamMember[];
  pendingReimbursements?: ManagerPendingReimbursement[];
  pendingLoans?: ManagerPendingLoan[];
  totals: {
    pendingReimbursements: number;
    pendingLoans: number;
    membersNeedingAction: number;
  };
}

export interface PayCompressionStats {
  mode: "cash_ctc_only";
  honestyNote: string;
  sampleSize: number;
  stats: {
    min: string;
    max: string;
    mean: string;
    median: string;
    p25: string;
    p75: string;
    compressionRatio: string | null;
  };
  outliers: {
    userId: string;
    label: string | null;
    annualCtc: string;
    side: "below" | "above";
  }[];
  missingCtcCount: number;
  scope?: "organization";
}

export interface TeamRewardsMember {
  userId: string;
  name: string | null;
  email: string | null;
  annualCtc: string | null;
  activeBenefitPlans: number;
  estimatedEmployerBenefitsAnnual: string | null;
  equityUnits: number;
}

export interface TeamRewardsResult {
  mode: "manager_team_rewards";
  honestyNote: string;
  reportCount: number;
  members: TeamRewardsMember[];
  payCompression: PayCompressionStats;
}

export interface TotalRewardsStatement {
  mode: "illustrative_statement";
  honestyNote: string;
  asOf: string;
  financialYear: string;
  cash: {
    annualCtc: string | null;
    ytdGross: string;
    ytdNet: string;
    activeLoanBalance: string;
  };
  benefits: {
    lines: {
      planName: string;
      category: string;
      status: string;
      estimatedEmployerMonthly: string | null;
      note: string;
    }[];
    estimatedEmployerAnnual: string | null;
  };
  equity: {
    lines: {
      grantType: string;
      units: number;
      status: string;
      grantDate: string;
      strikePrice: string | null;
      note: string;
    }[];
    totalUnits: number;
    valued: false;
  };
  leave: {
    lines: { leaveType: string; balanceDays: string }[];
    note: string;
  };
  summary: {
    cashAnnualCtc: string | null;
    benefitsEmployerAnnualEstimate: string | null;
    equityUnits: number;
    completeness: "partial" | "rich";
    missing: string[];
  };
}

export type ReimbursementStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export interface EssTaxDeclaration {
  id: number;
  financialYear: string;
  regime: "OLD" | "NEW";
  hra: string | null;
  lta: string | null;
  section80c: string | null;
  section80d: string | null;
  section80g: string | null;
  homeLoanInterest: string | null;
  status: string;
  reviewNote: string | null;
}

export interface EssTaxDeclarationResponse {
  windowStatus: "OPEN" | null;
  financialYear: string | null;
  closesAt: string | null;
  declaration: EssTaxDeclaration | null;
}

export type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "CLOSED";

export type { EssLoan } from "@/hooks/api/payroll/ess-money-schema";

export interface EssFnfSettlement {
  id: number;
  basicDues: string | null;
  leaveEncashment: string | null;
  bonusDue: string | null;
  deductions: string | null;
  loanRecovery: string | null;
  netPayable: string | null;
  status: string;
  notes: string | null;
  reimbursementsDue: string | null;
  assetRecovery: string | null;
  noticeRecovery: string | null;
  otherDeductions: string | null;
  statementPublishedAt: string | null;
  createdAt: string;
}
