import { z } from "zod";

export const rehireEmployeeFormSchema = z.object({
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date they rejoin"),
});

export type RehireEmployeeFormValues = z.infer<typeof rehireEmployeeFormSchema>;
