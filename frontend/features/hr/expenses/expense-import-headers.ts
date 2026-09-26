/**
 * V-071. The frontend half of the expense import contract, mirroring
 * `streamlineos-backend/src/modules/expenses/expenses-import-contract.ts` field
 * for field.
 *
 * The dialog used to normalise a header with `trim().toLowerCase()` and then
 * hand-enumerate spellings per field (`record.paymentmethod ||
 * record["payment_method"] || record["payment method"]`), so `Payment-Method`
 * and `Expense-Date` resolved to nothing here although the backend accepts
 * them. The backend's normalizer is lowercase-then-strip `[\s_-]`; that is what
 * this is, and it is the only one. A new spelling belongs in `headerAliases`,
 * never in an `||` chain at a call site.
 */

export const EXPENSE_IMPORT_CATEGORIES = [
  "Travel",
  "Food",
  "Office Supplies",
  "Software",
  "Hardware",
  "Marketing",
  "Entertainment",
  "Utilities",
  "Rent",
  "Insurance",
  "Salary",
  "Miscellaneous",
  "Other",
] as const;

export interface ExpenseImportField {
  /** The canonical key — also the key the parsed record is read by. */
  readonly key: string;
  readonly required: boolean;
  readonly sample: string;
  readonly hint: string;
  /** Extra spellings that resolve to this field. */
  readonly headerAliases?: readonly string[];
}

/**
 * The canonical column list: what the parser reads, what the downloadable
 * template writes, and what the dialog's instructions list.
 */
export const EXPENSE_IMPORT_FIELDS: readonly ExpenseImportField[] = [
  {
    key: "category",
    required: false,
    sample: "Travel",
    hint: `One of: ${EXPENSE_IMPORT_CATEGORIES.join(", ")} (blank files as Other)`,
  },
  { key: "amount", required: true, sample: "450.00", hint: "Positive number, up to 2 decimals" },
  { key: "description", required: false, sample: "Cab to client site", hint: "Text (optional)" },
  { key: "merchant", required: false, sample: "City Cabs", hint: "Vendor name (optional)" },
  {
    key: "paymentMethod",
    required: false,
    sample: "CASH",
    hint: "Cash, UPI, Company Card, … (optional)",
  },
  {
    key: "expenseDate",
    required: false,
    sample: "2026-09-20",
    hint: "YYYY-MM-DD (blank files as today)",
    headerAliases: ["date"],
  },
] as const;

/** lowercase, then drop spaces/underscores/dashes. The single header normalizer. */
export function normalizeHeader(header: string): string {
  return String(header).toLowerCase().replace(/[\s_-]+/g, "");
}

const FIELD_BY_NORMALIZED_HEADER = new Map<string, string>(
  EXPENSE_IMPORT_FIELDS.flatMap((field) =>
    [field.key, ...(field.headerAliases ?? [])].map(
      (spelling) => [normalizeHeader(spelling), field.key] as const,
    ),
  ),
);

/** The canonical field a CSV header names, or null when the column is not ours. */
export function resolveImportField(header: string): string | null {
  return FIELD_BY_NORMALIZED_HEADER.get(normalizeHeader(header)) ?? null;
}
