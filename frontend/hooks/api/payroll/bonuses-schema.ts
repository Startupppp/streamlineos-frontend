import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const bonusContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  type: z.string(),
  amount: z.string(),
  amountCents: z.number().nullable().optional(),
  reason: z.string().nullable(),
  month: z.string().nullable(),
  taxable: z.boolean(),
  status: z.string(),
  userMembershipId: z.number().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const bonusListContract = cursorPageContract(bonusContract);

const incentiveSalesRepContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const incentiveItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  salesRepId: z.string(),
  clientAccountId: z.string().nullable(),
  investmentAmount: z.string().nullable(),
  incentiveRate: z.string().nullable(),
  calculatedAmount: z.string().nullable(),
  approvedAmount: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  salesRep: incentiveSalesRepContract,
});

export const incentiveListContract = z.object({
  incentives: z.array(incentiveItemContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const successContract = z.object({ success: z.boolean() });

export type Bonus = z.infer<typeof bonusContract>;
export type IncentiveList = z.infer<typeof incentiveListContract>;
