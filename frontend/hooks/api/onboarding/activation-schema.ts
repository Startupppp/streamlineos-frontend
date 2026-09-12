import { z } from "zod";

export const activationStepContract = z.enum([
  "invite-a-colleague",
  "bring-your-data",
  "connect-a-channel",
  "open-a-deal",
]);

export const activationReportContract = z.object({
  isActivated: z.boolean(),
  completed: z.array(activationStepContract),
  remaining: z.array(activationStepContract),
  percent: z.number(),
  signals: z.object({
    realParties: z.number(),
    realDeals: z.number(),
    realActivities: z.number(),
    activeMembers: z.number(),
    hasCompletedImport: z.boolean(),
    hasConnectedChannel: z.boolean(),
  }),
  next: z
    .object({ step: activationStepContract, prompt: z.string() })
    .nullable(),
});
