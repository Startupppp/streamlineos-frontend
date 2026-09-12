import { z } from "zod";

const columnSchema = z.object({
  key: z.string(),
  header: z.string().min(1, "Header required"),
  enabled: z.boolean(),
});

export const mappingFormSchema = z.object({
  provider: z.enum(["GENERIC", "ZOHO_PAYROLL", "RAZORPAYX", "ADP", "GUSTO"]),
  columns: z.array(columnSchema),
  changeReason: z.string().min(1, "A reason is required").max(500),
});

export type MappingFormValues = z.infer<typeof mappingFormSchema>;
