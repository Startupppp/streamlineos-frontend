import { z } from "zod";

export const leadsSalesLeaderboardContract = z.array(
  z.object({
    userId: z.string(),
    name: z.string().nullable(),
    count: z.number().int(),
  }),
);

export const leadsSalesTeamCapacityContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    activeLeads: z.number().int(),
  }),
);
