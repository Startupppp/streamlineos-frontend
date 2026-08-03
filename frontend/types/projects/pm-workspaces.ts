export type PmWorkspaceStatus = "active" | "archived";

export interface PmWorkspace {
  pmWorkspaceId: string;
  orgId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  status: PmWorkspaceStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PmWorkspacesPage {
  data: PmWorkspace[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePmWorkspaceInput {
  name: string;
  slug: string;
}

export interface UpdatePmWorkspaceInput {
  name?: string;
  status?: PmWorkspaceStatus;
}

export type PmWorkspaceMemberRole = "member" | "admin";

export interface PmWorkspaceMember {
  pmWorkspaceMembershipId: string;
  orgId: string;
  pmWorkspaceId: string;
  organizationMembershipId: number;
  userId: string;
  role: PmWorkspaceMemberRole;
  addedAt: string;
}

export interface PmWorkspaceMembersPage {
  data: PmWorkspaceMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddPmWorkspaceMemberInput {
  userId: string;
  role: PmWorkspaceMemberRole;
}
