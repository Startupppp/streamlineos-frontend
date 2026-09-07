import { z } from "zod";

const bgvUserContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  designation: z.string().nullable(),
  employeeId: z.string().nullable(),
});

export const bgvRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  type: z.string(),
  status: z.string(),
  provider: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  result: z.string().nullable(),
  notes: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: bgvUserContract.nullable(),
});

export const bgvListContract = z.array(bgvRowContract);

export const bgvSuccessContract = z.object({ success: z.boolean() });
