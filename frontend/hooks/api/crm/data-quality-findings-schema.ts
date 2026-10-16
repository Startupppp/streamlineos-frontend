import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/** Mirrors `findingItemSchema` in the backend's `data-quality-response.schemas.ts`. */
const dataQualityFindingContract = z.object({
  findingId: z.string(),
  organizationId: z.string(),
  producer: z.string(),
  findingKind: z.string(),
  subjectKey: z.string(),
  groupKey: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  status: z.enum(["open", "resolved", "dismissed"]),
  partyId: z.string(),
  relatedPartyId: z.string().nullable(),
  evidence: z.record(z.string(), z.unknown()).nullable(),
  score: z.number().nullable(),
  proposedAction: z.string(),
  proposedPatch: z.record(z.string(), z.unknown()).nullable(),
  reversibility: z.string(),
  assignedToUserId: z.string().nullable(),
  assignedByUserId: z.string().nullable(),
  assignedAt: z.string().nullable(),
  firstDetectedAt: z.string(),
  lastSeenAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedByUserId: z.string().nullable(),
  resolutionId: z.string().nullable(),
  undoToken: z.record(z.string(), z.unknown()).nullable(),
  lastError: z.string().nullable(),
  ageDays: z.number(),
});

export const dataQualityFindingsPageContract = cursorPageContract(dataQualityFindingContract);

export const dataQualityResolveResultContract = z.object({
  resolutionId: z.string(),
  action: z.string(),
  reversibility: z.string(),
  attemptedCount: z.number().int(),
  resolvedCount: z.number().int(),
  failedCount: z.number().int(),
  failures: z.array(z.object({ findingId: z.string(), error: z.string() })),
  remainingInGroup: z.number().int().nullable(),
});

export type DataQualityFinding = z.infer<typeof dataQualityFindingContract>;
export type DataQualityFindingsPage = z.infer<typeof dataQualityFindingsPageContract>;
export type DataQualityResolveResult = z.infer<typeof dataQualityResolveResultContract>;
