export interface ProjectMilestone {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  targetDate: string;
  status: "PENDING" | "ACHIEVED" | "MISSED";
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectBudget {
  projectId: number;
  plannedBudget: number;
  actualCost: number;
  remaining: number;
  utilizationPct: number;
  totalHours: number;
  memberBreakdown: { userId: string; hours: number; cost: number }[];
}
