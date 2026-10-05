export type ManagedProductStatus = "active" | "archived";

export interface ManagedProductOwner {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

export interface ManagedProduct {
  id: number;
  orgId: string;
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
  owner?: ManagedProductOwner | null;
  version: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedProductsPage {
  data: ManagedProduct[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export type ManagedProductType = "software_product" | "content_brief" | "freelancer_project";

export interface CreateManagedProductInput {
  name: string;
  key: string;
  productType?: ManagedProductType;
  description?: string;
  ownerId?: string;
}

export interface UpdateManagedProductInput {
  version: number;
  name?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ManagedProductStatus;
}
