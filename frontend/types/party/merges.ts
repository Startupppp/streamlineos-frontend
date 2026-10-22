export type PartyKind = "PERSON" | "ORGANISATION";

export interface DuplicateCandidateSide {
  partyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  partyKind: PartyKind | null;
  createdAt: string;
}

export interface PartyDuplicateCandidate {
  candidateId: string;
  score: number;
  signals: string[];
  blockers: string[];
  status: "PENDING" | "MERGED" | "DISMISSED";
  detectedAt: string;
  left: DuplicateCandidateSide;
  right: DuplicateCandidateSide;
}

export interface PartyListPagination {
  page: number;
  limit: number;
  total: number;
}

export interface PartyDuplicatesPage {
  data: PartyDuplicateCandidate[];
  pagination: PartyListPagination;
}

export interface PartyMergeRecord {
  partyMergeId: string;
  survivorPartyId: string;
  survivorName: string;
  mergedPartyId: string;
  mergedName: string;
  decidedBy: "SYSTEM" | "USER";
  decidedByUserId: string | null;
  confidence: number | null;
  conflictFields: string[];
  mergedAt: string;
  revertedAt: string | null;
}

export interface PartyMergesPage {
  data: PartyMergeRecord[];
  pagination: PartyListPagination;
}

export interface MergePartiesInput {
  leftPartyId: string;
  rightPartyId: string;
  preferSurvivorPartyId: string;
}

export interface MergePartiesResult {
  partyMergeId: string;
  survivorPartyId: string;
  mergedPartyId: string;
  conflicts: Record<string, { kept: unknown; discarded: unknown }>;
}

export interface RevertMergeResult {
  survivorPartyId: string;
  restoredPartyId: string;
}
