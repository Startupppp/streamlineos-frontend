import type { LeadQualification } from "@/hooks/api/leads-schema";

import type { z } from "zod";
import type {
  leadPartyContract,
  leadDetailContract,
  leadListContract,
  leadBoardContract,
  leadStatsContract,
  leadActivityContract,
  leadTimelineContract,
  leadsSlaAlertsContract,
  leadsAnalyticsContract,
  leadsDistributeContract,
} from "@/hooks/api/leads-schema";
import type {
  leadsSalesLeaderboardContract,
  leadsSalesTeamCapacityContract,
} from "@/hooks/api/leads-analytics-schema";

export type PipelineStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "QUALIFIED"
  | "CONVERTED"
  | "LOST";

export type LeadSource =
  | "referral"
  | "campaign"
  | "cold_call"
  | "website"
  | "social_media"
  | "walk_in"
  | "other";

export type LeadPriority = "HOT" | "WARM" | "COLD";

export interface LeadUser {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface LeadCampaign {
  id: number;
  name: string;
}

export type Lead = z.infer<typeof leadPartyContract> & {
  assignedTo?: LeadUser | null;
  assignedBy?: { id: string; name: string | null } | null;
  campaign?: LeadCampaign | null;
};

export type LeadWithActivities = z.infer<typeof leadDetailContract>;

export type LeadActivity = z.infer<typeof leadActivityContract>;

export type TimelineItem = z.infer<typeof leadTimelineContract>[number];

export type LeadStats = z.infer<typeof leadStatsContract>;

export type LeadBoardColumn = z.infer<typeof leadBoardContract>[string];

export type LeadBoard = z.infer<typeof leadBoardContract>;

export type SlaAlert = z.infer<typeof leadsSlaAlertsContract>["leads"][number];

export type SlaAlertResponse = z.infer<typeof leadsSlaAlertsContract>;

export type ConversionBySource = z.infer<typeof leadsAnalyticsContract>["conversionBySource"][number];

export type MonthlyRevenue = z.infer<typeof leadsAnalyticsContract>["monthlyRevenue"][number];

export type AssignmentDistribution = z.infer<typeof leadsAnalyticsContract>["assignmentDistribution"][number];

export type LeadAnalyticsSummary = z.infer<typeof leadsAnalyticsContract>;

export type SalesLeaderboardEntry = z.infer<typeof leadsSalesLeaderboardContract>[number];

export type SalesTeamCapacityEntry = z.infer<typeof leadsSalesTeamCapacityContract>[number];

export type PaginatedLeads = z.infer<typeof leadListContract>;

export interface LeadFilters {
  status?: PipelineStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedToId?: string;
  search?: string;
  sortBy?: "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt";
  sortOrder?: "asc" | "desc";
  cursor?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  source?: LeadSource;
  campaignId?: number;
  investmentInterest?: string;
  potentialValue?: string;
  notes?: string;
  company?: string;
  designation?: string;
  city?: string;
  referredBy?: string;
  tags?: string[];
  assignedToId?: string;
  priority?: LeadPriority;
}

export interface UpdateLeadInput {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  source?: LeadSource;
  campaignId?: number;
  investmentInterest?: string;
  potentialValue?: string;
  notes?: string;
  company?: string;
  designation?: string;
  city?: string;
  tags?: string[];
  lostReason?: string;
  priority?: LeadPriority;
  qualification?: LeadQualification;
}

export interface UpdateLeadStatusInput {
  leadId: number;
  status: PipelineStatus;
  expectedStatus?: string;
  lostReason?: string;
  estimatedInvestment?: string;
  conversionNotes?: string;
}

export interface AssignLeadInput {
  leadId: number;
  assignedToId: string;
}

export interface LogActivityInput {
  leadId: number;
  type: string;
  date: string;
  duration?: number;
  subject?: string;
  location?: string;
  locationLink?: string;
  messageSummary?: string;
  notes?: string;
  outcome?: string;
}

export interface BulkUpdateLeadsInput {
  leadIds: number[];
  update: {
    status?: PipelineStatus;
    priority?: LeadPriority;
    assignedToId?: string;
  };
}

export interface BulkDeleteLeadsInput {
  leadIds: number[];
}

export interface DistributeLeadsInput {
  leadIds: number[];
  skipAbsent?: boolean;
}

export type DistributeResult = z.infer<typeof leadsDistributeContract>;
