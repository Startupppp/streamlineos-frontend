export interface PortalCapabilities {
  canViewMilestones: boolean;
  canViewTasks: boolean;
  canViewAttachments: boolean;
  canViewComments: boolean;
  canSubmitChangeRequests: boolean;
}

export interface PortalProject {
  id: number;
  name: string;
  key: string;
  status: string;
  color: string | null;
  description: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  capabilities: PortalCapabilities;
}

export interface PortalMilestone {
  id: number;
  name: string;
  dueDate: string | null;
  status: string | null;
}

export interface PortalTask {
  id: number;
  ticketNumber: number;
  title: string;
  status: string;
  dueDate: string | null;
  assigneeName: string | null;
}

export interface PortalAttachment {
  id: number;
  filename: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
  uploadedByName: string | null;
}

export interface PortalComment {
  id: number;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface PortalProjectOverview {
  project: PortalProject;
  capabilities: PortalCapabilities;
  milestones: PortalMilestone[];
  tasks: PortalTask[];
  attachments: PortalAttachment[];
  comments: PortalComment[];
}

export interface AcceptInvitationResponse {
  token: string;
  expiresAt: string;
}

export interface SubmitChangeRequestResponse {
  id: number;
}
