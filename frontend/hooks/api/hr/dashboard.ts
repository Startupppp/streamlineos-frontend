export interface HrDashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  openPositions: number;
  monthlyHires: number;
  upcomingBirthdays: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    dateOfBirth: string | null;
    daysUntil: number;
  }[];
}

export interface HrLeaveCalendarEntry {
  id: number;
  userId: string;
  userName: string;
  userImage: string | null;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

export interface HrOnboardingStatus {
  inProgress: number;
  completed: number;
  total: number;
  completionPct: number;
  newHires: {
    userId: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    pct: number;
  }[];
}
