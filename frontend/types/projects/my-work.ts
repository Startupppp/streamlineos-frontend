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
}
