export type DealStage = string;

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
  pipelineId: string | null;
  partyId: string | null;
  subjectId: string | null;
  forecastCategory: string | null;
  nextStep: string | null;
  healthScore: number | null;
  followUpNotes: string | null;
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
  partyId?: string;
  subjectId?: string;
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
  pipelineId?: string;
  forecastCategory?: string;
  nextStep?: string;
  healthScore?: number;
  followUpNotes?: string;
  partyId?: string | null;
  subjectId?: string | null;
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

export interface DealStats {
  active: number;
  pipelineValue: number;
  wonValue: number;
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

export interface DealCompetitor {
  id: string;
  orgId: string;
  dealId: number;
  competitorKey: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealCompetitorInput {
  competitorKey: string;
  status?: string;
  notes?: string;
}

/**
 * CRM-P2-12. A rival the system noticed on the deal's timeline, and nothing more.
 *
 * Deliberately a different shape from `DealCompetitor` and read from a different
 * endpoint, because it is a different claim: a competitor is something a person
 * stated, a suggestion is something a person has not looked at yet. Merging the
 * two into one list with a flag is how a machine's guess ends up in a board
 * review, so the types stay apart at the boundary as well as in the database.
 */
export interface DealCompetitorSuggestion {
  competitorSuggestionId: string;
  competitorKey: string;
  sourceKind: string;
  sourceActivityId: string;
  /** The line that named them, verbatim. What makes the proposal checkable. */
  evidenceQuote: string;
  status: "pending" | "accepted" | "dismissed";
  decidedByUserId: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  appliedCompetitorId: string | null;
  createdAt: string;
}

/**
 * What a scan found, and why it found nothing when it found nothing.
 *
 * The counts are the difference between three unlike answers that would
 * otherwise render as the same shrug: the organisation keeps no competitor list
 * (`vocabularySize` 0, and the fix is to curate one), the timeline mentions
 * nobody, or everything mentioned is already recorded.
 */
export interface DealCompetitorScanResult {
  proposed: number;
  vocabularySize: number;
  activitiesScanned: number;
  alreadyTracked: number;
  alreadyProposed: number;
  suggestions: DealCompetitorSuggestion[];
}

/**
 * Accepting echoes the name back.
 *
 * The id alone would be enough to find the row and is deliberately not enough to
 * act on it — the server compares this against what it stored, so a stale card
 * cannot turn a click into a competitor nobody read.
 */
export interface AcceptDealCompetitorSuggestionInput {
  suggestionId: string;
  confirmedCompetitorKey: string;
  notes?: string;
}

export interface DismissDealCompetitorSuggestionInput {
  suggestionId: string;
  reason?: string;
}

export type DealHealthLevel = "healthy" | "at_risk" | "critical" | "unknown";

export interface DealHealth {
  dealId: number;
  score: number;
  level: DealHealthLevel;
  factors: Array<{ key: string; label: string; impact: "positive" | "negative" | "neutral"; weight: number }>;
  computedAt: string;
}

export interface ForecastSnapshotData {
  byCategory: Array<{ category: string; totalValue: number; weightedValue: number; dealCount: number }>;
  byRep: Array<{ repId: string; repName: string; totalValue: number; weightedValue: number; dealCount: number }>;
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  period: string;
}

export interface ForecastSnapshot {
  id: string;
  orgId: string;
  period: string;
  capturedAt: string;
  createdById: string | null;
  data: ForecastSnapshotData;
  overrideAmount: string | null;
  overrideNote: string | null;
  overriddenBy: string | null;
  createdAt: string;
}

export interface PatchNextStepInput {
  nextStep: string;
}

export interface CaptureForecastSnapshotInput {
  period: string;
}

export interface DealStakeholder {
  id: string;
  dealId: number;
  contactId: number;
  roleKey: string | null;
  influence: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  contact: {
    id: number;
    name: string;
    email: string | null;
    title: string | null;
    company: string | null;
  };
}

export interface CreateStakeholderInput {
  contactId: number;
  roleKey?: string | null;
  influence?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface OverrideForecastInput {
  overrideAmount?: number;
  overrideNote?: string;
}
