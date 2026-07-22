export interface ProjectTeam {
  id: number;
  orgId: string;
  name: string;
  key: string;
  icon: string | null;
  color: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface ProjectTeamMember {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

export interface ProjectTeamDetail extends ProjectTeam {
  members: ProjectTeamMember[];
}

export interface CreateTeamInput {
  name: string;
  key: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  isPrivate?: boolean;
}

export interface AddTeamMemberInput {
  userId: string;
  role?: "member" | "lead";
}

export interface TeamListResponse {
  data: ProjectTeam[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TeamMembersResponse {
  data: ProjectTeamMember[];
  total: number;
  page: number;
  pageSize: number;
}
