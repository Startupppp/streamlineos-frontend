import { z } from "zod";

export const lineSchema = z.object({
  accountCode: z.string(),
  debit: z.string(),
  credit: z.string(),
  description: z.string(),
});

export const journalEntrySchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["DRAFT", "POSTED"]),
  lines: z.array(lineSchema),
});

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;
