import { z } from "zod";

const userMiniContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

export const loanContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  amount: z.string(),
  reason: z.string().nullable(),
  emiAmount: z.string().nullable(),
  totalEmis: z.number().nullable(),
  paidEmis: z.number(),
  status: z.enum(["PENDING", "APPROVED", "ACTIVE", "REPAID", "REJECTED"]),
  userMembershipId: z.number().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  disbursedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: userMiniContract.nullable().optional(),
});

export const loanListResponseContract = z.object({
  items: z.array(loanContract),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const successContract = z.object({ success: z.literal(true) });

export type Loan = z.infer<typeof loanContract>;
