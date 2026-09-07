import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const taxDeclarationListItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().nullable(),
  financialYear: z.string(),
  regime: z.string(),
  hra: z.string(),
  lta: z.string(),
  section80c: z.string(),
  section80d: z.string(),
  section80g: z.string(),
  homeLoanInterest: z.string(),
  previousEmploymentIncome: z.string(),
  previousEmployerTds: z.string(),
  status: z.string(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const taxDeclarationListContract = cursorPageContract(taxDeclarationListItemContract);

export const taxWindowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  financialYear: z.string(),
  opensAt: z.string(),
  closesAt: z.string(),
  proofDeadline: z.string().nullable(),
  lockDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taxWindowListContract = z.array(taxWindowContract);

export type TaxDeclarationListItem = z.infer<typeof taxDeclarationListItemContract>;
export type TaxWindow = z.infer<typeof taxWindowContract>;
