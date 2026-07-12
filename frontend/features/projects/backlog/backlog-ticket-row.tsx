export interface BacklogTicket {
  id: number;
  ticketNumber: string | number;
  title: string | null;
  description?: string | null;
  status: string;
  priority: string | null;
  type: string;
  assigneeId?: string | null;
  createdAt?: string | Date | null;
  assignee?: {
    image?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}
