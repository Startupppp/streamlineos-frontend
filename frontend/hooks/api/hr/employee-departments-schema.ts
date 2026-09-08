import { z } from "zod";

export const departmentItemContract = z.object({
  id: z.string(),
  name: z.string(),
});

export const departmentListContract = z.array(departmentItemContract);
