export interface CrmAssignmentMember {
  userId: string;
  name: string | null;
  image: string | null;
  activeCount: number;
  totalCount: number;
}

export interface CrmAssignmentStats {
  members: CrmAssignmentMember[];
  unassignedCount: number;
}

export interface UpdateRenewalInput {
  accountId: number;
  renewalStage?: "upcoming" | "in_discussion" | "renewed" | "churned";
  renewalDate?: string | null;
  renewalNotes?: string | null;
}

export interface ClientHealth {
  id: number;
  name: string;
  company: string | null;
  healthScore: number | null;
  healthStatus: string | null;
  churnRiskScore: number | null;
  churnRiskReasoning: string | null;
  lastHealthCheck: string | null;
  investmentValue: string | null;
  status: string;
}

export interface ClientTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user?: string;
}

export interface SimpleClient {
  id: number;
  name: string;
}

export interface ClientOpportunity {
  id: number;
  orgId: string;
  clientId: number;
  title: string;
  type: "upsell" | "cross_sell";
  stage: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value: string | null;
  notes: string | null;
  expectedCloseDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string } | null;
}

export interface CreateClientOpportunityInput {
  clientId: number;
  title: string;
  type?: "upsell" | "cross_sell";
  stage?: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value?: string;
  notes?: string;
  expectedCloseDate?: string;
}

export interface OnboardingTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OnboardingItem {
  id: number;
  orgId: string;
  clientId: number;
  templateId: number | null;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string | null } | null;
}

export interface CsatSurvey {
  id: number;
  orgId: string;
  clientId: number | null;
  title: string;
  question: string;
  scaleMax: number;
  status: "draft" | "sent" | "closed";
  publicToken: string;
  sentAt: string | null;
  closedAt: string | null;
  createdBy: string;
  createdAt: string;
  responseCount?: number;
  avgRating?: number | null;
  client?: { id: number; name: string } | null;
}

export interface CsatResponse {
  id: number;
  surveyId: number;
  rating: number;
  comment: string | null;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
}

export interface SlaByPriority {
  priority: string;
  total: number;
  withinSla: number;
  breached: number;
  avgResolutionHours: number;
  slaTarget: number;
}

export interface SlaRecentBreach {
  id: number;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  hoursOpen: number;
  slaTarget: number;
}

export interface SlaStats {
  stats: {
    totalTickets: number;
    withinSla: number;
    slaBreached: number;
    complianceRate: number;
    avgResolutionHours: number;
  };
  byPriority: SlaByPriority[];
  recentBreaches: SlaRecentBreach[];
}
