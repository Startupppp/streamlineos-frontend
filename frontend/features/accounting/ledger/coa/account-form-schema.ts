import { z } from "zod";

export const ACCOUNT_TYPES = [
  "ASSET",
  "CONTRA_ASSET",
  "LIABILITY",
  "CONTRA_LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;

export const ACCOUNT_TYPE_LABELS: Readonly<Record<(typeof ACCOUNT_TYPES)[number], string>> = {
  ASSET: "Something we own",
  CONTRA_ASSET: "Reduces something we own",
  LIABILITY: "Something we owe",
  CONTRA_LIABILITY: "Reduces something we owe",
  EQUITY: "The owners' share",
  INCOME: "Money in",
  EXPENSE: "Money out",
};

export const createAccountFormSchema = z.object({
  code: z.string().trim().min(1, "Give the account a code").max(32),
  name: z.string().trim().min(1, "Give the account a name").max(160),
  accountType: z.enum(ACCOUNT_TYPES),
  parentAccountId: z.string(),
  isHeader: z.boolean(),
  isCash: z.boolean(),
  currencyRestriction: z.string(),
  description: z.string().max(500),
});

export type CreateAccountFormValues = z.infer<typeof createAccountFormSchema>;

export const editAccountFormSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(160),
  parentAccountId: z.string(),
  isCash: z.boolean(),
  isActive: z.boolean(),
  currencyRestriction: z.string(),
  description: z.string().max(500),
});

export type EditAccountFormValues = z.infer<typeof editAccountFormSchema>;
