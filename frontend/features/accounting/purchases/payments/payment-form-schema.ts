import { z } from "zod";

const optionalDecimal = (message: string) =>
  z
    .string()
    .refine((value) => value.trim() === "" || /^\d+(\.\d+)?$/.test(value.trim()), message);

export const paymentFormSchema = z
  .object({
    partyId: z.string().min(1, "Choose who is being paid"),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date the money left"),
    paymentAccountId: z.string().min(1, "Choose the account the money left"),
    currency: z.string().regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code"),
    grossAmount: optionalDecimal("Enter an amount"),
    withholdingMode: z.enum(["auto", "manual", "none"]),
    withholdingCode: z.string().max(32).optional(),
    withholdingRatePercent: optionalDecimal("Enter a rate"),
    withholdingAmount: optionalDecimal("Enter an amount"),
    withholdingReason: z.string().max(500).optional(),
    paymentMethod: z.string().max(64).optional(),
    reference: z.string().max(200).optional(),
    memo: z.string().max(2000).optional(),
    amounts: z.array(z.string()),
  })
  .refine(
    (values) =>
      values.withholdingMode !== "manual" ||
      values.withholdingRatePercent.trim() === "" ||
      values.withholdingAmount.trim() === "",
    { message: "Give a rate or an amount, not both", path: ["withholdingAmount"] },
  );

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
