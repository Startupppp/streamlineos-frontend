export interface ReportOverview {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableRatio: number;
  approvedHours: number;
  pendingApprovalHours: number;
  pendingPeriods: number;
  activeUsers: number;
  byDay: { date: string; hours: number }[];
  byProject: { projectId: number | null; projectName: string; hours: number }[];
}
