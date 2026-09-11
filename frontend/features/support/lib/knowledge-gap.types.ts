export type KnowledgeGapStatus = "OPEN" | "DRAFTED" | "ROUTED" | "PUBLISHED" | "DISMISSED";

export interface KnowledgeGapEvidence {
  searchQueries?: Array<{ query: string; count: number }>;
  relatedTicketIds?: number[];
}

export interface DraftedKnowledgeGap {
  id: number;
  orgId: string;
  representativeQuestion: string;
  ticketCount: number;
  sampleTicketIds: number[];
  status: KnowledgeGapStatus;
  proposedArticleId: number | null;
  draftedBy: string | null;
  reviewedBy: string | null;
  evidence: KnowledgeGapEvidence | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeGap extends DraftedKnowledgeGap {
  proposedArticleTitle?: string | null;
  deflectionCount: number;
}

export interface ListKnowledgeGapsResponse {
  gaps: KnowledgeGap[];
  nextCursor: number | null;
}

export interface DetectGapsResponse {
  jobId: number;
}

export interface DraftGapResponse {
  gap: DraftedKnowledgeGap;
}
