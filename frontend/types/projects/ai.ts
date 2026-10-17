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
