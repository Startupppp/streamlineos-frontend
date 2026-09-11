import { z } from "zod";

const decimalText = (message: string) =>
  z.string().refine((value) => /^\d+(\.\d+)?$/.test(value.trim()), message);

const optionalDecimalText = (message: string) =>
  z
    .string()
    .refine((value) => value.trim() === "" || /^\d+(\.\d+)?$/.test(value.trim()), message);

export const billLineSchema = z.object({
  description: z.string().trim().min(1, "Say what this line is for").max(500),
  quantity: decimalText("Enter a quantity"),
  unitPrice: decimalText("Enter a unit price"),
  discount: optionalDecimalText("Enter a discount amount"),
  taxCategory: z.enum([
    "standard",
    "reduced",
    "super_reduced",
    "zero",
    "exempt",
    "out_of_scope",
    "reverse_charge",
  ]),
  commodityCode: z.string().max(32).optional(),
  expenseAccountId: z.string().max(64).optional(),
  capitalize: z.boolean(),
});

export const billFormSchema = z.object({
  partyId: z.string().min(1, "Choose the vendor this bill came from"),
  vendorDocumentNumber: z
    .string()
    .trim()
    .min(1, "Enter the number printed on the vendor's bill")
    .max(64),
  vendorDocumentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date printed on the vendor's bill"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date this bill is recorded on"),
  dueDate: z
    .string()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a due date"),
  currency: z.string().regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code"),
  reverseCharge: z.boolean(),
  blockedInputTax: z.boolean(),
  taxInclusive: z.boolean(),
  placeOfSupplyCode: z.string().max(8).optional(),
  reference: z.string().max(200).optional(),
  memo: z.string().max(2000).optional(),
  lines: z.array(billLineSchema).min(1, "A bill needs at least one line"),
});

export type BillFormValues = z.infer<typeof billFormSchema>;
export type BillLineValues = z.infer<typeof billLineSchema>;

export const EMPTY_BILL_LINE: BillLineValues = {
  description: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
  taxCategory: "standard",
  commodityCode: "",
  expenseAccountId: "",
  capitalize: false,
};
