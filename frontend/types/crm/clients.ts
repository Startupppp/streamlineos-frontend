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

