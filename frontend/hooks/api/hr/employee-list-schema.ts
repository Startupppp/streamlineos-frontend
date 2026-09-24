import { z } from "zod";

export const employeeListItemContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  designation: z.string().nullable(),
  employeeId: z.string().nullable(),
  department: z.object({ id: z.string(), name: z.string() }).nullable(),
  image: z.string().nullable(),
  isActive: z.boolean(),
  joiningDate: z.string().nullable(),
  reportingTo: z.string().nullable(),
});

export const employeeListPageContract = z.object({
  data: z.array(employeeListItemContract),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const employeeCountsContract = z.object({
  active: z.number().int(),
  /** Invited, account created, never accepted. Split out of `active`. */
  pending: z.number().int(),
  inactive: z.number().int(),
});
