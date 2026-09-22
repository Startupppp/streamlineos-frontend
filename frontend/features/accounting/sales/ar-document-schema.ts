import { z } from "zod";
import { moneyInputValue, parseMoneyInput } from "@/lib/accounting/money";
import type {
  ArDocumentLineInput,
  ArDocumentView,
  CreateInvoiceInput,
  UpdateArDraftInput,
} from "@/types/accounting/accounting-ar";

const QUANTITY_PATTERN = /^\d+(\.\d{1,3})?$/;

export const arDocumentLineFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Say what you are billing for")
    .max(1000),
  quantity: z
    .string()
    .trim()
    .regex(QUANTITY_PATTERN, "Up to three decimal places"),
  unitPrice: z.string().trim().min(1, "Enter a price"),
  discount: z.string().trim(),
  taxCategory: z.enum([
    "standard",
    "reduced",
    "super_reduced",
    "zero",
    "exempt",
    "out_of_scope",
    "reverse_charge",
  ]),
  commodityCode: z.string().trim().max(32),
});

export const arDocumentFormSchema = z
  .object({
    partyId: z.string().trim().min(1, "Choose a customer"),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an issue date"),
    dueDate: z.union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
    ]),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Three-letter currency code"),
    supplyNature: z.enum([
      "domestic_b2b",
      "domestic_b2c",
      "export",
      "import",
      "intra_community",
      "oss_b2c",
      "reverse_charge",
      "outside_scope",
    ]),
    taxInclusive: z.boolean(),
    reference: z.string().trim().max(255),
    memo: z.string().trim().max(4000),
    lines: z
      .array(arDocumentLineFormSchema)
      .min(1, "Add at least one line")
      .max(500),
  })
  .superRefine((values, ctx) => {
    values.lines.forEach((line, index) => {
      const unitPrice = parseMoneyInput(line.unitPrice, values.currency);
      if (unitPrice === null || unitPrice < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "unitPrice"],
          message: "Enter an amount this currency supports",
        });
      }
      if (line.discount.length > 0) {
        const discount = parseMoneyInput(line.discount, values.currency);
        if (discount === null || discount < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["lines", index, "discount"],
            message: "Enter an amount this currency supports",
          });
        }
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "quantity"],
          message: "Quantity must be more than zero",
        });
      }
    });
  });

export type ArDocumentFormValues = z.infer<typeof arDocumentFormSchema>;
export type ArDocumentLineFormValues = z.infer<typeof arDocumentLineFormSchema>;

export function emptyArLine(): ArDocumentLineFormValues {
  return {
    description: "",
    quantity: "1",
    unitPrice: "",
    discount: "",
    taxCategory: "standard",
    commodityCode: "",
  };
}

export function emptyArDocumentForm(
  currency: string,
  partyId: string = "",
): ArDocumentFormValues {
  return {
    partyId,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    currency,
    supplyNature: "domestic_b2b",
    taxInclusive: false,
    reference: "",
    memo: "",
    lines: [emptyArLine()],
  };
}

function isTaxCategory(
  value: string,
): value is ArDocumentLineFormValues["taxCategory"] {
  return arDocumentLineFormSchema.shape.taxCategory.safeParse(value).success;
}

export function arDocumentFormFromView(
  document: ArDocumentView,
): ArDocumentFormValues {
  return {
    partyId: document.partyId,
    issueDate: document.issueDate,
    dueDate: document.dueDate ?? "",
    currency: document.currency,
    supplyNature: document.supplyNature,
    taxInclusive: document.taxInclusive,
    reference: document.reference ?? "",
    memo: document.memo ?? "",
    lines:
      document.lines.length > 0
        ? document.lines.map((line) => ({
            description: line.description,
            quantity: (line.quantityMilli / 1000).toString(),
            unitPrice: moneyInputValue(line.unitPriceMinor, document.currency),
            discount:
              line.discountMinor > 0
                ? moneyInputValue(line.discountMinor, document.currency)
                : "",
            taxCategory: isTaxCategory(line.taxCategory)
              ? line.taxCategory
              : "standard",
            commodityCode: line.commodityCode ?? "",
          }))
        : [emptyArLine()],
  };
}

function toLineInput(
  line: ArDocumentLineFormValues,
  currency: string,
): ArDocumentLineInput {
  const discount =
    line.discount.length > 0 ? parseMoneyInput(line.discount, currency) : null;
  return {
    description: line.description,
    quantityMilli: Math.round(Number(line.quantity) * 1000),
    unitPriceMinor: parseMoneyInput(line.unitPrice, currency) ?? 0,
    discountMinor: discount ?? 0,
    taxCategory: line.taxCategory,
    commodityCode: line.commodityCode.length > 0 ? line.commodityCode : null,
  };
}

export function toCreateDocumentInput(
  values: ArDocumentFormValues,
): CreateInvoiceInput {
  const currency = values.currency.toUpperCase();
  return {
    partyId: values.partyId,
    issueDate: values.issueDate,
    dueDate: values.dueDate.length > 0 ? values.dueDate : null,
    currency,
    supplyNature: values.supplyNature,
    taxInclusive: values.taxInclusive,
    reference: values.reference.length > 0 ? values.reference : null,
    memo: values.memo.length > 0 ? values.memo : null,
    lines: values.lines.map((line) => toLineInput(line, currency)),
  };
}

export function toUpdateDocumentInput(
  values: ArDocumentFormValues,
): UpdateArDraftInput {
  return toCreateDocumentInput(values);
}

export function quantityLabel(quantityMilli: number): string {
  return (quantityMilli / 1000).toString();
}

export function documentRevision(document: ArDocumentView): string {
  const lines = document.lines
    .map(
      (line) =>
        `${line.id}:${line.quantityMilli}:${line.unitPriceMinor}:${line.discountMinor}:${line.taxCategory}:${line.commodityCode ?? ""}`,
    )
    .join(",");
  return `${document.currency}:${document.taxInclusive}:${document.supplyNature}:${document.issueDate}:${lines}`;
}
