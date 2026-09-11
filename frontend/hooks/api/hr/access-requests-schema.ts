import { z } from "zod";

export const accessRequestContract = z.object({
  id: z.string(),
  orgId: z.string(),
  employeeId: z.string(),
  systemName: z.string(),
  accessLevel: z.string(),
  status: z.string(),
  grantedBy: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accessRequestListContract = z.array(accessRequestContract);
