export type DealStage =
  | "LEAD"
  | "CONTACTED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type DealActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "document"
  | "stage_change";

export interface DealUserRef {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Deal {
  id: number;
  orgId: string;
  leadId: number | null;
  clientId: number | null;
  name: string;
  value: string | null;
  stage: DealStage;
  probability: number | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  assignedToId: string | null;
  lastContactDate: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo?: DealUserRef | null;
  lead?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  client?: { id: number; name: string } | null;
}

export interface DealActivity {
  id: number;
  orgId: string;
  dealId: number;
  type: DealActivityType;
  previousValue: string | null;
  newValue: string | null;
  subject: string | null;
  notes: string | null;
  duration: number | null;
  userId: string;
  createdAt: string | null;
  user?: DealUserRef | null;
}

export interface CreateDealInput {
  name: string;
  value?: string;
  stage?: DealStage;
  probability?: number;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  assignedToId?: string;
  expectedCloseDate?: string;
  notes?: string;
  leadId?: number;
  clientId?: number;
}

export interface UpdateDealInput {
  id: number;
  name?: string;
  value?: string;
  stage?: DealStage;
  probability?: number;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  assignedToId?: string;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  lostReason?: string;
  notes?: string;
}

export interface UpdateDealStageInput {
  id: number;
  stage: DealStage;
  lostReason?: string;
  version?: string;
}

export interface DealFilters {
  stage?: DealStage;
  assignedToId?: string;
  limit?: number;
  offset?: number;
}

export interface LogDealActivityInput {
  dealId: number;
  type: DealActivityType;
  subject?: string;
  notes?: string;
  duration?: number;
}

export interface TrendValue {
  value: number;
  isPositive: boolean;
}

export interface StatWithTrend<T = number> {
  value: T;
  trend: TrendValue;
}

export interface SalesFunnelItem {
  stage: string;
  value: number;
  color: string;
}

export interface TopDeal {
  company: string;
  value: number;
  stage: string;
  rep: string;
  probability: number;
}

export interface SalesLeaderboardItem {
  name: string;
  deals: number;
  revenue: number;
  avatar: string;
}

export interface SalesActivityItem {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email";
  message: string;
  time: string;
  person: string;
}

export interface DealsByStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

export interface EnhancedSalesMetrics {
  activeClients: number;
  inactiveClients: number;
  totalCalls: number;
  totalMeetings: number;
  totalEmails: number;
  totalSiteVisits: number;
  followUpNeeded: number;
}

export interface SalesDashboard {
  salesStats: {
    pipeline: StatWithTrend;
    dealsWon: StatWithTrend;
    conversionRate: StatWithTrend;
    avgDealSize: StatWithTrend;
  };
  revenueTimeline: { month: string; value: number }[];
  salesFunnel: SalesFunnelItem[];
  topDeals: TopDeal[];
  salesLeaderboard: SalesLeaderboardItem[];
  salesActivity: SalesActivityItem[];
  dealsByStage: DealsByStage[];
  enhancedMetrics: EnhancedSalesMetrics;
}

export interface PersonStat {
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
}

export interface PersonDeal {
  company: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
}

export interface PersonAccount {
  name: string;
  revenue: number;
  health: "healthy" | "at_risk" | "critical";
  since: string;
  renewalDate: string;
}

export interface PersonActivity {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
  message: string;
  time: string;
}

export interface DealStats {
  active: number;
  pipelineValue: number;
  wonValue: number;
}

export interface DealForecast {
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  byMonth: Array<{ month: string; label: string; weighted: number; bestCase: number; dealCount: number }>;
  byStage: Array<{ stage: string; count: number; totalValue: number; weightedValue: number; avgProbability: number }>;
}

export interface DealMeeting {
  id: number;
  orgId: string;
  dealId: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  actionItems: string | null;
  recordingLink: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null } | null;
}

export interface CreateDealMeetingInput {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  actionItems?: string;
  recordingLink?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

export interface WinLossAnalysis {
  summary: {
    won: number;
    wonValue: number;
    lost: number;
    lostValue: number;
    total: number;
    winRate: number;
  };
  lostByReason: Array<{ reason: string; count: number; totalValue: number }>;
}

export interface SalesQuota {
  id: number;
  userId: string;
  userName: string | null;
  period: string;
  startDate: string;
  endDate: string;
  targetRevenue: string;
  actualRevenue: string;
  attainmentPct: number;
  notes: string | null;
  createdAt: string | null;
}

export interface CrmPersonProfile {
  slug: string;
  name: string;
  initials: string;
  role: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  bio: string;
  stats: PersonStat[];
  monthlyPerformance: { month: string; value: number }[];
  deals: PersonDeal[];
  accounts: PersonAccount[];
  activities: PersonActivity[];
  skills: string[];
}
