import { z } from "zod";

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
