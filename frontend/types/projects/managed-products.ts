export type ManagedProductStatus = "active" | "archived";

export interface ManagedProduct {
  id: number;
  orgId: string;
  pmWorkspaceId: string | null;
  name: string;
  key: string;
  description: string | null;
  status: string;
  ownerId: string | null;
  vision: string | null;
  missionStatement: string | null;
  targetCustomer: string | null;
  differentiators: string | null;
  currentPhase: string | null;
  targetLaunchDate: string | null;
  successMetrics: unknown;
  ownerMembershipId: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedProductsPage {
  data: ManagedProduct[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface CreateManagedProductInput {
  name: string;
  key: string;
  description?: string;
  ownerId?: string;
  pmWorkspaceId?: string;
}

export interface UpdateManagedProductInput {
  name?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ManagedProductStatus;
}
