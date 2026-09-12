import { z } from "zod";

export const journalLineFormSchema = z.object({
  accountId: z.string().min(1, "Pick an account"),
  side: z.enum(["debit", "credit"]),
  amount: z.string().min(1, "Enter an amount"),
  description: z.string().max(500),
});

export const journalFormSchema = z.object({
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  memo: z.string().max(500),
  lines: z.array(journalLineFormSchema).min(2, "A journal needs at least two lines"),
});

export type JournalLineFormValues = z.infer<typeof journalLineFormSchema>;
export type JournalFormValues = z.infer<typeof journalFormSchema>;

export const EMPTY_JOURNAL_LINE: JournalLineFormValues = {
  accountId: "",
  side: "debit",
  amount: "",
  description: "",
};
