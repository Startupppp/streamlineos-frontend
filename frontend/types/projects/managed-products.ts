export type ManagedProductStatus = "active" | "archived";

export interface ManagedProduct {
  id: number;
  orgId: string;
  pmWorkspaceId: string | null;
  name: string;
  key: string;
  description: string | null;
  status: ManagedProductStatus;
  ownerId: string | null;
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
}

export interface UpdateManagedProductInput {
  name?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ManagedProductStatus;
}
