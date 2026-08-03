export interface ProjectAiEvidence {
  totalTasks: number;
  done: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  sprintProgressPct?: number;
}

export interface ProjectSummaryResult {
  summary: string;
  highlights: string[];
  atRisk: boolean;
  evidence: ProjectAiEvidence;
}

export type AiSeverity = "high" | "medium" | "low";

export interface ProjectRisk {
  title: string;
  severity: AiSeverity;
  rationale: string;
  mitigation: string;
}

export interface ProjectRisksResult {
  risks: ProjectRisk[];
  evidence: ProjectAiEvidence;
}

export interface ClientUpdateSection {
  heading: string;
  content: string;
}

export interface ClientUpdateResult {
  headline: string;
  body: string;
  sections: ClientUpdateSection[];
}

export interface PlanTask {
  title: string;
  estimateHours: number;
  priority: AiSeverity;
}

export interface PlanMilestone {
  name: string;
  tasks: PlanTask[];
}

export interface PlanResult {
  summary: string;
  milestones: PlanMilestone[];
}

export interface ExtractedTask {
  title: string;
  priority: AiSeverity;
  suggestedAssignee?: string;
  dueHint?: string;
}

export interface ExtractTasksResult {
  tasks: ExtractedTask[];
}

export interface AskResult {
  answer: string;
  confidence: AiSeverity;
  evidence?: ProjectAiEvidence;
}

export interface WeeklyUpdateCitation {
  source: "ticket" | "blocker" | "risk" | "decision" | "discussion";
  label: string;
}

export interface WeeklyUpdateResult {
  headline: string;
  completedHighlights: string[];
  blockers: string[];
  upcomingFocus: string[];
  citations: WeeklyUpdateCitation[];
  dateRange?: { startDate?: string; endDate?: string };
}

export interface ChangeImpactCitation {
  source: "change_request" | "risk" | "approval" | "plan";
  label: string;
}

export interface ChangeImpactEvidence {
  openChangeRequests: number;
  openRisks: number;
  pendingApprovals: number;
}

export interface ChangeImpactResult {
  headline: string;
  scopeImpact: string;
  scheduleImpact: string;
  budgetImpact: string;
  riskSummary: string[];
  pendingApprovals: string[];
  citations: ChangeImpactCitation[];
  evidence: ChangeImpactEvidence;
}

export interface TicketHandoffCitation {
  source: "description" | "comment" | "decision";
  excerpt: string;
}

export interface TicketHandoffResult {
  currentState: string;
  keyDecisions: string[];
  nextAction: string;
  blockers: string[];
  citations: TicketHandoffCitation[];
}
