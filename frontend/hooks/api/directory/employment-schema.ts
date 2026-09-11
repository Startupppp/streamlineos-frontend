import { z } from "zod";

/**
 * Contracts for `GET /directory/employment` — a batch lookup that returns
 * employment facts for up to 100 users in one request.
 *
 * Derived from the backend `DirectoryController.listEmploymentFacts` service
 * projection. The handler returns `{ data: EmploymentFacts[] }`.
 *
 * NOT `.strict()`. Timestamps are ISO strings.
 */

const employmentFactsItemContract = z.object({
  userId: z.string(),
  employmentId: z.number().nullable(),
  employeeNumber: z.string().nullable(),
  designation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  departmentId: z.string().nullable(),
  locationId: z.string().nullable(),
  managerUserId: z.string().nullable(),
});

export const employmentFactsContract = z.object({
  data: z.array(employmentFactsItemContract),
});

export type EmploymentFactsItem = z.infer<typeof employmentFactsItemContract>;
