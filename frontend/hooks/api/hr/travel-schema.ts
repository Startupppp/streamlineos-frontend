import { z } from "zod";

export const travelRequestContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  purpose: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string(),
  flightRequired: z.boolean(),
  hotelRequired: z.boolean(),
  advanceRequired: z.boolean(),
  advanceAmount: z.string().nullable(),
  estimatedCost: z.string().nullable(),
  perDiem: z.string().nullable(),
  itinerary: z.array(
    z.object({ date: z.string(), activity: z.string(), location: z.string() }),
  ),
  status: z.enum(["DRAFT", "PENDING", "MANAGER_APPROVED", "FINANCE_APPROVED", "REJECTED", "COMPLETED"]),
  managerApproverId: z.string().nullable(),
  managerApproverMembershipId: z.number().int().nullable(),
  managerApprovedAt: z.string().nullable(),
  financeApproverId: z.string().nullable(),
  financeApproverMembershipId: z.number().int().nullable(),
  financeApprovedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const travelRequestListContract = z.array(travelRequestContract);

export type TravelRequestResponse = z.infer<typeof travelRequestContract>;
