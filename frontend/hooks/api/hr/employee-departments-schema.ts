import { z } from "zod";

export const departmentItemContract = z.object({
  id: z.string(),
  name: z.string(),
});

export const departmentListContract = z.array(departmentItemContract);

export const legacyDepartmentContract = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const legacyDepartmentListContract = z.array(legacyDepartmentContract);
