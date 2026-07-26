export type ManagedProductStatus = "active" | "archived";

export interface ManagedProduct {
  managedProductId: number;
  orgId: string;
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
