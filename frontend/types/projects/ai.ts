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
