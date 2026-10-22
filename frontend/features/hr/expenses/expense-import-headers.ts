
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
  readonly key: string;
  readonly required: boolean;
  readonly sample: string;
  readonly hint: string;
  readonly headerAliases?: readonly string[];
}

export const EXPENSE_IMPORT_FIELDS: readonly ExpenseImportField[] = [
  {
    key: "category",
    required: false,
    sample: "Travel",
    hint: `One of: ${EXPENSE_IMPORT_CATEGORIES.join(", ")} (blank files as Other)`,
  },
  { key: "amount", required: true, sample: "450.00", hint: "Positive number up to 10,00,000, up to 2 decimals" },
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

export function resolveImportField(header: string): string | null {
  return FIELD_BY_NORMALIZED_HEADER.get(normalizeHeader(header)) ?? null;
}
