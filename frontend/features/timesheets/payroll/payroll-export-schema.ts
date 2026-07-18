import { z } from "zod";

export const exportSchema = z.object({
  format: z.enum(["CSV", "XLSX"]),
  includeExported: z.boolean(),
  note: z.string().max(500),
});

export type ExportFormValues = z.infer<typeof exportSchema>;
