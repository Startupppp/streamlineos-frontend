export type RoadmapStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type RoadmapHorizon = "now" | "next" | "later";
export type FeedbackStatus = "open" | "planned" | "in_progress" | "completed" | "declined";
export type ChangelogType = "feature" | "improvement" | "fix";

export interface RoadmapItem {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  isPublic: boolean;
  projectId: number | null;
  managedProductId: number | null;
  epicTicketId: number | null;
  targetQuarter: string | null;
  sortOrder: number;
  votes: number;
  horizon: RoadmapHorizon;
  goalId: number | null;
  releaseId: number | null;
  teamId: number | null;
  opportunityId: number | null;
  targetStart: string | null;
  targetEnd: string | null;
  decisionSnapshot: Record<string, unknown> | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FeedbackPost {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  votes: number;
  submittedByName: string | null;
  submittedByEmail: string | null;
  crmContactId: number | null;
  crmOrganizationId: number | null;
  accountValueSnapshot: string | null;
  accountTierSnapshot: "free" | "pro" | "enterprise" | null;
  linkedRoadmapItemId: number | null;
  duplicateOfId: number | null;
  mergedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangelogEntry {
  id: number;
  orgId: string;
  title: string;
  content: string;
  version: string | null;
  type: string;
  isPublished: boolean;
  linkedRoadmapItemId: number | null;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicRoadmapItem {
  id: number;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  category: string | null;
  targetQuarter: string | null;
  horizon: RoadmapHorizon;
  votes: number;
}

export interface PublicFeedbackPost {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  votes: number;
  createdAt: string;
}

export interface PublicChangelogEntry {
  id: number;
  title: string;
  content: string | null;
  version: string | null;
  type: ChangelogType | null;
  publishedAt: string | null;
}
