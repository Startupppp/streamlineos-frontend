export interface MyWorkItem {
  id: number;
  projectId: number;
  projectName: string;
  projectKey: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
  assignee?: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}
