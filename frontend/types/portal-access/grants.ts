export type PortalMembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
export type PortalGrantStatus = "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";

export interface PortalMembership {
  portalMembershipId: string;
  organizationId: string;
  audience: "CLIENT_PORTAL";
  partyContactId: string;
  userId: string | null;
  status: PortalMembershipStatus;
  sessionEpoch: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactFirstName: string | null;
  contactLastName: string | null;
}

export interface ProjectClientGrant {
  projectClientGrantId: string;
  organizationId: string;
  portalMembershipId: string;
  partyContactId: string;
  projectId: number;
  pmWorkspaceId: string | null;
  canViewMilestones: boolean;
  canViewTasks: boolean;
  canViewAttachments: boolean;
  canViewComments: boolean;
  canSubmitChangeRequests: boolean;
  status: PortalGrantStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactFirstName: string | null;
  contactLastName: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PortalMembershipsPage {
  data: PortalMembership[];
  pagination: PaginationMeta;
}

export interface ProjectClientGrantsPage {
  data: ProjectClientGrant[];
  pagination: PaginationMeta;
}

export interface CreateMembershipInput {
  partyContactId: string;
  userId?: string;
}

export interface UpdateMembershipStatusInput {
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
}

export interface CreateGrantInput {
  portalMembershipId: string;
  projectId: number;
  pmWorkspaceId?: string;
  canViewMilestones?: boolean;
  canViewTasks?: boolean;
  canViewAttachments?: boolean;
  canViewComments?: boolean;
  canSubmitChangeRequests?: boolean;
}

export interface UpdateGrantInput {
  canViewMilestones?: boolean;
  canViewTasks?: boolean;
  canViewAttachments?: boolean;
  canViewComments?: boolean;
  canSubmitChangeRequests?: boolean;
  status?: PortalGrantStatus;
  expiresAt?: string | null;
}
