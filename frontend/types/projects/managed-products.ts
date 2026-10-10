export type ManagedProductStatus = "active" | "archived";
export type ManagedProductLifecycle = "discovery" | "build" | "growth" | "mature" | "sunset";
export type ManagedProductHealth = "on_track" | "at_risk" | "off_track" | "unknown";

export interface ManagedProductOwner {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

export interface ManagedProductNextRelease {
  id: number;
  name: string;
  version: string;
  releaseDate: string | null;
}

export interface ManagedProductFeedbackTrend {
  last30d: number;
  previous30d: number;
}

export interface ManagedProductSuccessMetric {
  label: string;
  target?: string;
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
  successMetrics: ManagedProductSuccessMetric[] | null;
  ownerMembershipId: number | null;
  lifecycle: ManagedProductLifecycle;
  health: ManagedProductHealth;
  teamId: number | null;
  segments: string[];
  tags: string[];
  northStarMetric: string | null;
  lastReviewedAt: string | null;
  owner?: ManagedProductOwner | null;
  version: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  linkedProjectCount?: number;
  nextRelease?: ManagedProductNextRelease | null;
  feedbackTrend?: ManagedProductFeedbackTrend;
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
  lifecycle?: ManagedProductLifecycle;
  health?: ManagedProductHealth;
  teamId?: number;
  segments?: string[];
  tags?: string[];
  northStarMetric?: string;
  successMetrics?: ManagedProductSuccessMetric[];
  vision?: string;
  missionStatement?: string;
  targetCustomer?: string;
  differentiators?: string;
  lastReviewedAt?: string;
  targetLaunchDate?: string;
}

export interface UpdateManagedProductInput {
  version: number;
  name?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ManagedProductStatus;
  lifecycle?: ManagedProductLifecycle;
  health?: ManagedProductHealth;
  teamId?: number | null;
  segments?: string[];
  tags?: string[];
  northStarMetric?: string | null;
  successMetrics?: ManagedProductSuccessMetric[];
  vision?: string | null;
  missionStatement?: string | null;
  targetCustomer?: string | null;
  differentiators?: string | null;
  lastReviewedAt?: string | null;
  targetLaunchDate?: string | null;
}
