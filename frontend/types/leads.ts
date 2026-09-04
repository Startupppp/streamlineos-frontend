

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

export type ActivityType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "site_visit"
  | "note"
  | "task";

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

export interface Lead {
  id: number;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  source: LeadSource | null;
  campaignId: number | null;
  status: PipelineStatus;
  priority: LeadPriority | null;
  investmentInterest: string | null;
  potentialValue: string | null;
  notes: string | null;
  assignedToId: string | null;
  assignedById: string | null;
  verifiedById: string | null;
  assignedAt: string | null;
  convertedAt: string | null;
  lostReason: string | null;
  company: string | null;
  designation: string | null;
  city: string | null;
  referredBy: string | null;
  tags: string[] | null;
  score: number | null;
  slaDeadline: string | null;
  website: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo?: LeadUser | null;
  assignedBy?: { id: string; name: string | null } | null;
  campaign?: LeadCampaign | null;
  qualificationNotes?: string | null;
  customFields?: Record<string, unknown>;
}

export interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
}

export interface LeadActivity {
  id: number;
  orgId: string;
  leadId: number;
  type: ActivityType;
  date: string;
  duration: number | null;
  subject: string | null;
  location: string | null;
  locationLink: string | null;
  messageSummary: string | null;
  notes: string | null;
  outcome: string | null;
  userId: string;
  createdAt: string | null;
  user?: LeadUser | null;
}

export interface TimelineItem {
  id: number;
  type: "note" | "task" | "email" | "activity";
  timestamp: string | null;
  data: Record<string, unknown>;
}

export interface LeadStats {
  total: number;
  byStatus: {
    NEW: number;
    CONTACTED: number;
    INTERESTED: number;
    QUALIFIED: number;
    CONVERTED: number;
    LOST: number;
  };
  conversionRate: number;
  totalPotentialValue: number;
  unassigned: number;
  thisMonth: number;
}

export interface LeadBoardColumn {
  leads: Lead[];
  total: number;
}

/**
 * The board is keyed by the ORG's pipeline stages, not by a fixed six.
 * `LeadsBoardService.getBoard` derives the keys from `crm_pipeline_stages`, else
 * `crm_options`, else the statuses present in the data — so a tenant can send
 * five keys, seven, or none. Declaring the six as required properties is what
 * let `board[status].leads` compile and then throw at runtime.
 */
export type LeadBoard = Record<string, LeadBoardColumn | undefined>;

export interface SlaAlert {
  leadId: number;
  leadName: string;
  status: string;
  assignedTo: string | null;
  hoursSinceUpdate: number;
  priority: string | null;
}

export interface SlaAlertResponse {
  total: number;
  leads: SlaAlert[];
}

export interface ConversionBySource {
  source: string;
  total: number;
  converted: number;
  rate: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface AssignmentDistribution {
  userId: string;
  name: string;
  count: number;
}

export interface LeadAnalyticsSummary {
  totalLeads: number;
  totalLeadsPrevPeriod: number;
  conversionRate: number;
  conversionRatePrevPeriod: number;
  totalRevenue: number;
  conversionBySource: ConversionBySource[];
  monthlyRevenue: MonthlyRevenue[];
  assignmentDistribution: AssignmentDistribution[];
}

export interface SalesLeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  totalCalls: number;
  totalMeetings: number;
  totalEmails: number;
  leadsAssigned: number;
  leadsConverted: number;
  totalRevenue: number;
  score: number;
}

export interface SalesTeamCapacityEntry {
  id: string;
  name: string | null;
  image: string | null;
  activeLeads: number;
}

export interface PaginatedLeads {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface LeadFilters {
  status?: PipelineStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedToId?: string;
  search?: string;
  sortBy?: "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
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
  qualificationNotes?: string;
}

export interface UpdateLeadStatusInput {
  leadId: number;
  status: PipelineStatus;
  expectedStatus?: PipelineStatus;
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

export interface DistributeResult {
  distributed: number;
  salesPeople: number;
  totalSalesPeople: number;
  absentCount: number;
  absentNames: string[];
  summary: { userId: string; name: string; count: number }[];
}


