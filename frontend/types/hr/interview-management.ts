export interface ScorecardCriterion {
  name: string;
  weight: number;
}

export interface ScorecardTemplate {
  id: number;
  orgId: string;
  name: string;
  criteria: ScorecardCriterion[];
  isActive: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InterviewScorecard {
  id: number;
  interviewId: number;
  interviewerId: string;
  templateId: number | null;
  ratings: Record<string, number>;
  recommendation: "HIRE" | "NO_HIRE" | "MAYBE";
  notes: string | null;
  isBlindMode: boolean;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ScheduleInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  scheduledAt: string;
  durationMinutes?: number;
  format?: "VIDEO" | "PHONE" | "IN_PERSON";
  interviewers: string[];
  notes?: string;
  meetLink?: string;
  createMeet?: boolean;
  notifyChannels?: { email: boolean; whatsapp: boolean };
}

export interface InterviewSla {
  id: number;
  orgId: string;
  stage: string;
  maxHours: number;
  warningHours: number;
  createdAt: string | null;
}

export interface CandidateSlaRecord {
  id: number;
  orgId: string;
  candidateId: number;
  stage: string;
  enteredAt: string;
  breachedAt: string | null;
  status: "ON_TRACK" | "AT_RISK" | "BREACHED";
  updatedAt: string | null;
}

export interface SlaReportStage {
  stage: string;
  total: number;
  breached: number;
  breachPct: number;
}

export interface SlaReportMonth {
  month: string;
  label: string;
  stages: SlaReportStage[];
  overall: { total: number; breached: number; breachPct: number };
}

export interface SlaReportStageSummary {
  stage: string;
  avgBreachPct: number;
  totalBreached: number;
  totalAll: number;
}

export interface HrSlaReport {
  report: SlaReportMonth[];
  stages: string[];
  stageSummary: SlaReportStageSummary[];
}

export interface InterviewQuestion {
  id: number;
  orgId: string;
  question: string;
  category: string;
  role: string | null;
  difficulty: string;
  tags: string[];
  sampleAnswer: string | null;
  keywords: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateQuestionInput {
  question: string;
  category?: string;
  role?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
  sampleAnswer?: string;
  keywords?: string[];
}

export interface BusyBlock {
  start: string;
  end: string;
  title: string;
}

export interface InterviewerAvailability {
  interviewerId: string;
  busyBlocks: BusyBlock[];
}

export interface InterviewerAvailabilityResponse {
  date: string;
  availability: InterviewerAvailability[];
}

export interface InterviewStats {
  total: number;
  pending: number;
  passed: number;
  failed: number;
}

export type InterviewsParams = {
  candidateId?: number;
  upcoming?: boolean;
  relevant?: boolean;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
};

export interface HrBookingLink {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  token: string;
  durationMinutes: number;
  interviewType: string;
  status: "pending" | "booked" | "expired" | "cancelled";
  expiresAt: string;
  createdBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: { id: number; firstName: string; lastName: string; email: string } | null;
  jobPosting: { id: number; title: string } | null;
  creator: { id: string; name: string | null } | null;
}
