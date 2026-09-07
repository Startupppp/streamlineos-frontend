import type { z } from "zod";
import type { taxDeclarationResponseContract } from "@/hooks/api/payroll/ess-overview-schema";
import type { essOverviewContract } from "@/hooks/api/payroll/ess-overview-schema";
import type { totalRewardsStatementContract } from "@/hooks/api/payroll/ess-overview-schema";
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

export type EssOverview = z.infer<typeof essOverviewContract>;



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

export type TotalRewardsStatement = z.infer<typeof totalRewardsStatementContract>;



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

export type EssTaxDeclarationResponse = z.infer<typeof taxDeclarationResponseContract>;



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
