import { z } from "zod";

export const teamAvailabilityRowContract = z.object({
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  leaveTypeId: z.number().int().nullable(),
  userName: z.string().nullable(),
  userImage: z.string().nullable(),
});

export const teamAvailabilityContract = z.array(teamAvailabilityRowContract);

export type TeamAvailabilityRow = z.infer<typeof teamAvailabilityRowContract>;
