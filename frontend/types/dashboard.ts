export interface DashboardStats {
  orgName: string;
  orgSlug: string;
  totalEmployees: number | null;
  activeProjects: number | null;
  presentToday: number | null;
}

export interface RecentProject {
  id: number;
  name: string;
  key: string | null;
  status: string;
  orgId: string;
  managerId: string | null;
  manager: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyIssue {
  id: number;
  title: string;
  status: string;
  type: string;
  priority: string;
  ticketNumber: string;
  updatedAt: Date;
  projectName: string;
  projectId: number | undefined;
  projectKey: string;
  assignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
}

export interface SprintSummary {
  id: number;
  name: string;
  projectName: string;
  projectId: number | undefined;
  progress: number;
  daysRemaining: number;
  totalTickets: number;
  doneTickets: number;
  inProgressTickets: number;
  todoTickets: number;
  totalPoints: number;
  completedPoints: number;
}

export interface RecentActivity {
  id: number;
  title: string;
  status: string;
  type: string;
  priority: string;
  ticketNumber: string;
  updatedAt: Date;
  projectName: string;
  projectId: number | undefined;
  projectKey: string;
  assignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
}
