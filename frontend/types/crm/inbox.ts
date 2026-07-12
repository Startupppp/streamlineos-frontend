export interface CrmInboxItem {
  id: number;
  type: string;
  title: string;
  entityType: "lead" | "deal" | "task";
  entityId: number;
  dueAt: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  meta: Record<string, unknown>;
}

export interface CrmInboxSection {
  key: string;
  items: CrmInboxItem[];
  total: number;
}

export interface CrmAiAction {
  type: string;
  entityType: "lead" | "deal" | "quote";
  entityId: number;
  title: string;
  reason: string;
  href: string;
}

export interface CrmInboxResponse {
  sections: CrmInboxSection[];
  aiActions: CrmAiAction[];
}

export interface CrmInboxCounts {
  dueTasks: number;
  overdueTasks: number;
  followUpsDue: number;
  newReplies: number;
  meetingsToday: number;
  slaRisk: number;
  stuckDeals: number;
  newlyAssigned: number;
}
