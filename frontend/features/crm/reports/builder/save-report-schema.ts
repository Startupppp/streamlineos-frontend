import { z } from "zod";

export const saveReportSchema = z.object({
  name: z.string().trim().min(1, "Give the report a name").max(200, "At most 200 characters"),
  description: z.string().trim().max(2000, "At most 2000 characters"),
});

export type SaveReportValues = z.infer<typeof saveReportSchema>;

export const EMPTY_SAVE_REPORT_VALUES: SaveReportValues = { name: "", description: "" };
