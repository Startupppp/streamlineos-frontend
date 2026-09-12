import { z } from "zod";
import { STATEMENT_DATE_FORMATS } from "@/types/accounting-banking";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const signedDecimal = (message: string) =>
  z.string().refine((value) => /^-?\d+(\.\d+)?$/.test(value.trim()), message);

export const statementImportSchema = z
  .object({
    bankProfileId: z.string().min(1, "Choose the account this statement belongs to"),
    periodStart: isoDate,
    periodEnd: isoDate,
    opening: signedDecimal("Enter the opening balance from the statement"),
    closing: signedDecimal("Enter the closing balance from the statement"),
    presetCode: z.string().max(64).optional(),
    dateColumn: z.string().trim().min(1, "Say which column holds the date").max(120),
    descriptionColumn: z.string().max(120).optional(),
    referenceColumn: z.string().max(120).optional(),
    amountColumn: z.string().max(120).optional(),
    debitColumn: z.string().max(120).optional(),
    creditColumn: z.string().max(120).optional(),
    dateFormat: z.enum(STATEMENT_DATE_FORMATS).optional(),
    skipRows: z.string().regex(/^\d{1,3}$/, "Enter a number"),
    delimiter: z.string().length(1, "One character"),
    decimalSeparator: z.enum([".", ","]),
    rememberMapping: z.boolean(),
  })
  .refine((values) => values.dateFormat !== undefined, {
    message: "Say how the dates in this file are written — nothing here guesses",
    path: ["dateFormat"],
  })
  .refine(
    (values) =>
      Boolean(
        (values.amountColumn ?? "").trim() ||
          (values.debitColumn ?? "").trim() ||
          (values.creditColumn ?? "").trim(),
      ),
    {
      message: "Say which column holds the amount, or which two hold money in and money out",
      path: ["amountColumn"],
    },
  );

export type StatementImportFormValues = z.infer<typeof statementImportSchema>;
