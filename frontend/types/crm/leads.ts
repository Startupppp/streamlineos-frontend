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

export interface ClientAccountStats {
  total: number;
  accountOpening: number;
  queries: number;
  planSelected: number;
  invested: number;
}

export interface UpdateClientAccountStatusInput {
  id: number;
  status: ClientAccountStatus;
  investmentAmount?: string;
  planName?: string;
  investmentDate?: string;
  transactionRef?: string;
}

export interface LogClientActivityInput {
  clientAccountId: number;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Target {
  id: number;
  orgId: string;
  userId: string;
  metricType: string;
  targetValue: string;
  currentValue: string | null;
  period: string | null;
  startDate: string;
  endDate: string;
  setById: string | null;
  branchId: number | null;
  parentTargetId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  user?: { id: string; name: string | null; image: string | null } | null;
}

export interface TargetHistory {
  id: number;
  targetId: number;
  orgId: string;
  changedById: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string | null;
  changedBy?: { id: string; name: string | null; image: string | null } | null;
}

export interface TargetFilters {
  userId?: string;
  period?: string;
  limit?: number;
  offset?: number;
}

export interface TargetLeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  totalTarget: number;
  totalCurrent: number;
  progress: number;
}

export interface CreateTargetInput {
  userId?: string;
  userIds?: string[];
  metricType: string;
  targetValue: string;
  period?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  branchId?: number;
  parentTargetId?: number;
}

export interface UpdateTargetInput {
  id: number;
  targetValue?: string;
  currentValue?: string;
  notes?: string;
}

export interface LogTargetProgressInput {
  id: number;
  currentValue: string;
  notes?: string;
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
