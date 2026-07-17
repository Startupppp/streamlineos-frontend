export type KnowledgeGapStatus = "OPEN" | "DRAFTED" | "ROUTED" | "PUBLISHED" | "DISMISSED";

export interface KnowledgeGap {
  id: number;
  orgId: string;
  clusterKey: string;
  representativeQuestion: string;
  ticketCount: number;
  sampleTicketIds: number[];
  status: KnowledgeGapStatus;
  proposedArticleId: number | null;
  proposedArticleTitle?: string | null;
  draftedBy: string | null;
  reviewedBy: string | null;
  evidence: {
    searchQueries?: Array<{ query: string; count: number }>;
    relatedTicketIds?: number[];
  };
  deflectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListKnowledgeGapsResponse {
  gaps: KnowledgeGap[];
  nextCursor: number | null;
}

export interface DetectGapsResponse {
  jobId: number;
}

export interface DraftGapResponse {
  gap: KnowledgeGap;
}
