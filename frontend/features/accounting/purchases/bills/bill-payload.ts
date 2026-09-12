import { parseMoneyInput } from "@/lib/accounting/money";
import type { ApDocumentLineInput, CreateApDocumentInput } from "@/types/accounting-ap-payments";
import { textOrNull } from "../lib/form-values";
import type { BillFormValues } from "./bill-form-schema";

type LineField = "quantity" | "unitPrice" | "discount";

export type BillPayloadFields = Omit<CreateApDocumentInput, "documentType">;

export type BillPayloadResult =
  | { ok: true; payload: BillPayloadFields }
  | { ok: false; lineIndex: number; field: LineField; message: string };

function parseQuantityMilli(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const milli = Math.round(Number(trimmed) * 1000);
  if (!Number.isFinite(milli) || milli === 0) return null;
  return milli;
}

export function buildBillPayload(values: BillFormValues): BillPayloadResult {
  const currency = values.currency.toUpperCase();
  const lines: ApDocumentLineInput[] = [];

  for (const [index, line] of values.lines.entries()) {
    const quantityMilli = parseQuantityMilli(line.quantity);
    if (quantityMilli === null) {
      return {
        ok: false,
        lineIndex: index,
        field: "quantity",
        message: "Use a quantity above zero with at most three decimals",
      };
    }

    const unitPriceMinor = parseMoneyInput(line.unitPrice.trim(), currency);
    if (unitPriceMinor === null) {
      return {
        ok: false,
        lineIndex: index,
        field: "unitPrice",
        message: `Enter a ${currency} amount with the right number of decimals`,
      };
    }

    const discountMinor = parseMoneyInput(line.discount.trim() || "0", currency);
    if (discountMinor === null) {
      return {
        ok: false,
        lineIndex: index,
        field: "discount",
        message: `Enter a ${currency} amount with the right number of decimals`,
      };
    }

    lines.push({
      description: line.description.trim(),
      quantityMilli,
      unitPriceMinor,
      discountMinor,
      taxCategory: line.taxCategory,
      commodityCode: textOrNull(line.commodityCode),
      expenseAccountId: textOrNull(line.expenseAccountId),
      capitalize: line.capitalize,
    });
  }

  return {
    ok: true,
    payload: {
      partyId: values.partyId,
      vendorDocumentNumber: values.vendorDocumentNumber.trim(),
      vendorDocumentDate: values.vendorDocumentDate,
      issueDate: values.issueDate,
      dueDate: textOrNull(values.dueDate),
      currency,
      reverseCharge: values.reverseCharge,
      blockedInputTax: values.blockedInputTax,
      taxInclusive: values.taxInclusive,
      placeOfSupplyCode: textOrNull(values.placeOfSupplyCode),
      reference: textOrNull(values.reference),
      memo: textOrNull(values.memo),
      lines,
    },
  };
}
