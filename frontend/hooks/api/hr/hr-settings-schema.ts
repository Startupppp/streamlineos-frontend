import { z } from "zod";
import type { WfhRequest } from "@/types/hr/attendance";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const assetRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  assignedTo: z.string().nullable(),
  assignedToMembershipId: z.number().int().nullable(),
  status: z.string(),
  purchaseDate: z.string().nullable(),
  purchaseCost: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  expectedReturnDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const documentRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string().nullable(),
  departmentId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]),
  category: z.string().nullable(),
  hasFile: z.boolean(),
  fileName: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  version: z.number().int().nullable(),
  parentDocumentId: z.number().int().nullable(),
  isPublic: z.boolean().nullable(),
  isActive: z.boolean().nullable(),
  expiryDate: z.string().nullable(),
  expiryReminderSent: z.boolean().nullable(),
  tags: z.array(z.string()).nullable(),
  metadata: z.unknown().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const reviewListRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  reviewerId: z.string().nullable(),
  cycleId: z.number().int().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).nullable(),
  overallRating: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const performanceReviewPageContract = z.object({
  data: z.array(reviewListRowContract),
  pagination: cursorPagination,
});

export const goalContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  targetValue: z.string().nullable(),
  currentValue: z.string(),
  unit: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  progress: z.number().int(),
  parentGoalId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const wfhRequestContract = z.custom<WfhRequest>((v) => typeof v === "object" && v !== null);

export const wfhRequestListContract = z.array(wfhRequestContract);
