export type PmWorkspaceStatus = "active" | "archived";

export interface PmWorkspace {
  pmWorkspaceId: string;
  orgId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  status: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PmWorkspacesPage {
  data: PmWorkspace[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
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
  role: string;
  addedAt: string;
}

export interface PmWorkspaceMembersPage {
  data: PmWorkspaceMember[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface AddPmWorkspaceMemberInput {
  userId: string;
  role: PmWorkspaceMemberRole;
}
