import { z } from "zod";


export const orgModuleStatusContract = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
  core: z.literal(true).optional(),
});

export const orgModuleStatusesContract = z.array(orgModuleStatusContract);

export const userModuleAccessContract = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
  core: z.boolean(),
});

export const userModuleAccessListContract = z.array(userModuleAccessContract);

export type OrgModuleStatus = z.infer<typeof orgModuleStatusContract>;
export type UserModuleAccessEntry = z.infer<typeof userModuleAccessContract>;
