export type ClientAccountStatus =
  | "ACCOUNT_OPENING"
  | "QUERIES"
  | "PLAN_SELECTED"
  | "INVESTED";

export interface ClientUserRef {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface ClientAccount {
  id: number;
  orgId: string;
  branchId: number | null;
  leadId: number;
  salesRepId: string;
  assignedCrmId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  status: ClientAccountStatus;
  investmentAmount: string | null;
  planName: string | null;
  investmentDate: string | null;
  transactionRef: string | null;
  conversionNotes: string | null;
  estimatedInvestment: string | null;
  convertedAt: string;
  investedAt: string | null;
  renewalStage: string;
  renewalDate: string | null;
  renewalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  salesRep?: ClientUserRef | null;
  assignedCrm?: ClientUserRef | null;
  lead?: { id: number; name: string | null; source: string | null; priority: string | null } | null;
}

export interface ClientActivity {
  id: number;
  clientAccountId: number;
  userId: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: ClientUserRef | null;
}

export interface ClientAccountWithActivities extends ClientAccount {
  activities: ClientActivity[];
}

export interface ClientAccountFilters {
  status?: ClientAccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedClientAccounts {
  accounts: ClientAccount[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface LogClientActivityInput {
  clientAccountId: number;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface RelatedLead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string;
  company: string | null;
  source: string | null;
  createdAt: string | null;
}
