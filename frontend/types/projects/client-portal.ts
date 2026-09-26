export interface ClientPortalProject {
  id: number;
  name: string;
  key: string;
  status: string;
  color?: string | null;
  startDate: string | null;
  targetEndDate: string | null;
}

export interface ClientPortalMilestone {
  id: number;
  name: string;
  dueDate: string | null;
  status: string | null;
}

export interface ClientPortalTask {
  id: number;
  ticketNumber: number;
  title: string;
  status: string;
  dueDate: string | null;
}

export interface ClientPortalFile {
  id: number;
  filename: string;
  url: string;
}

export interface ClientPortalComment {
  id: number;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface ClientPortalOverview {
  project: ClientPortalProject;
  milestones: ClientPortalMilestone[];
  tasks: ClientPortalTask[];
  attachments: ClientPortalFile[];
  comments: ClientPortalComment[];
}

export interface ClientVisibilityTicket {
  id: number;
  ticketNumber: number;
  title: string;
  type: string;
  clientVisible: boolean;
}

export interface ClientVisibilityMilestone {
  id: number;
  name: string;
  clientVisible: boolean;
}

export interface CursorPage<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface ClientVisibilitySummary {
  tickets: CursorPage<ClientVisibilityTicket>;
  milestones: CursorPage<ClientVisibilityMilestone>;
}
