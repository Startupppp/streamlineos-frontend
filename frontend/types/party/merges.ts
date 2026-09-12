/**
 * Whether the record describes a person or a company.
 *
 * A second axis from `PartyType`: what a party is TO US is the type, and this
 * does not change when a prospect becomes a customer. It is shown on a merge
 * card because fusing a person into a company is almost always the mistake the
 * reviewer is there to avoid.
 */
export type PartyKind = "PERSON" | "ORGANISATION";

/** One side of a candidate pair, named rather than identified. */
export interface DuplicateCandidateSide {
  partyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  partyKind: PartyKind | null;
  createdAt: string;
}

/**
 * A pair the detector queued for a human, as a stored row.
 *
 * Persisted, which is the whole difference from the recomputed contact-grain
 * list this replaced: `candidateId` is a thing that can be dismissed, and a
 * dismissal is remembered. A recomputed pair had no identity, so the same false
 * positive came back on every read.
 */
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

/**
 * A merge that happened.
 *
 * `mergedName` comes from the merge's own snapshot rather than from the record,
 * because the record it names is soft-deleted — it is what that record was
 * called at the moment it stopped existing.
 */
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
  /**
   * The record the reviewer chose to keep.
   *
   * Always sent from a screen. Omitting it lets the server fall back to
   * "keep the older one", which is right for an unattended merge and wrong for
   * one somebody was asked about — every field conflict resolves in the
   * survivor's favour, so the wrong survivor silently overwrites the record the
   * reviewer was looking at.
   */
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
