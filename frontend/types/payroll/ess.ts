export interface EssToggles {
  essShowSalaryStructure: boolean;
  essAllowBankUpdate: boolean;
  essAllowLoanRequests: boolean;
  essAllowTaxDeclarations: boolean;
  essAllowReimbursements: boolean;
  emailPayslips: boolean;
}

export interface EssPayslip {
  publicationId: number;
  month: string;
  net: string | null;
  publishedAt: string | null;
  downloadHref: string;
}

export interface EssOverview {
  toggles: EssToggles;
  latestPayslip: {
    publicationId: number;
    month: string;
    net: string | null;
    downloadHref: string;
  } | null;
  ytd: { gross: string; net: string };
  activeLoanBalance: string;
  pendingReimbursementsCount: number;
  taxWindow: { status: string; financialYear: string; closesAt: string | null } | null;
  declarationStatus: string | null;
}

export interface EssSalaryComponent {
  code: string;
  name: string;
  type: string;
  amount: string | null;
  percent: string | null;
}

export interface EssSalaryStructure {
  profile: {
    annualCtc: string | null;
    workerType: string | null;
    taxRegime: string | null;
    costCenter: string | null;
    effectiveFrom: string | null;
  };
  components: EssSalaryComponent[];
}

export type ReimbursementStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export interface EssReimbursement {
  id: number;
  category: string;
  amount: string;
  description: string;
  receiptUrl: string | null;
  status: ReimbursementStatus;
  createdAt: string;
}

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
}

export interface EssTaxProof {
  id: number;
  declarationId: number;
  category: string;
  amount: string;
  description: string | null;
  proofUrl: string | null;
  status: string;
}

export interface EssTaxDeclarationResponse {
  windowStatus: "OPEN" | null;
  financialYear: string | null;
  closesAt: string | null;
  declaration: EssTaxDeclaration | null;
  proofs: EssTaxProof[];
}

export type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "CLOSED";

export interface EssLoan {
  id: number;
  amount: string;
  reason: string | null;
  emiAmount: string | null;
  totalEmis: number | null;
  paidEmis: number;
  status: LoanStatus;
  balance: string;
  createdAt: string;
}

export interface EssBankDetails {
  hasBank: boolean;
  masked: {
    accountNumber: string;
    bankName: string | null;
    branch: string | null;
    ifsc: string | null;
    accountHolder: string | null;
  } | null;
}

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
