import { z } from "zod";

export const holidayRowContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  date: z.string(),
  recurring: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const holidayListContract = z.array(holidayRowContract);
