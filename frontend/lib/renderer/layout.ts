
export type FieldKind =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "money"
  | "percent"
  | "date"
  | "dateTime"
  | "select"
  | "badge"
  | "boolean"
  | "longText"
  | "reference"
  | "lines"



  | "series";

export type FieldTone = "success" | "warning" | "danger" | "info" | "neutral";

export const BOOLEAN_VALUES = ["true", "false"] as const;

export const DEFAULT_BOOLEAN_OPTIONS: readonly SelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export type SignMeaning = "gain" | "cost";

export interface FieldCondition {
  readonly field: string;
  readonly equals: readonly string[];
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly tone?: FieldTone;
}

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required?: boolean;
  readonly readOnly?: boolean;
  readonly options?: readonly SelectOption[];
  readonly hint?: string;
  readonly numeric?: boolean;
  readonly sign?: SignMeaning;
  readonly range?: { readonly min: number; readonly max: number };
  readonly referenceTo?: string;
  readonly referenceToField?: string;
  readonly referenceLabel?: string;
  readonly currencyField?: string;
  readonly editOnly?: boolean;
  readonly createOnly?: boolean;
  readonly lineFields?: readonly FieldSpec[];
  readonly lineLabel?: string;
  readonly minLines?: number;
  readonly visibleWhen?: FieldCondition;
}

export interface ColumnSpec {
  readonly field: string;
  readonly primary?: boolean;
  readonly width?: string;
  readonly subtitle?: string;
}

export interface SectionSpec {
  readonly title: string;
  readonly fields: readonly string[];
}

export interface RecordLayout {
  readonly key: string;
  readonly singular: string;
  readonly plural: string;
  readonly titleField: string;
  readonly fields: readonly FieldSpec[];
  readonly list: {
    readonly columns: readonly ColumnSpec[];
    readonly searchPlaceholder: string;
  };
  readonly detail: { readonly sections: readonly SectionSpec[] };
  readonly form: { readonly sections: readonly SectionSpec[] };
}

const NUMERIC_KINDS: ReadonlySet<FieldKind> = new Set(["number", "money", "percent"]);

export function isNumericField(field: FieldSpec): boolean {
  return field.numeric ?? NUMERIC_KINDS.has(field.kind);
}

export function toneForSignedValue(field: FieldSpec, value: unknown): FieldTone | undefined {
  if (field.sign === undefined) return undefined;

  const amount = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(amount) || String(value ?? "").trim() === "") return undefined;

  if (amount === 0) return "neutral";
  const favourable = field.sign === "gain" ? amount > 0 : amount < 0;
  return favourable ? "success" : "danger";
}

export function fieldByName(
  layout: RecordLayout,
  name: string,
): FieldSpec | undefined {
  return layout.fields.find((field) => field.name === name);
}

export function moneyDisplayFor(
  field: FieldSpec,
  row: Record<string, unknown> | undefined,
  organisation: { readonly currency: string; readonly locale: string },
): { readonly currency: string; readonly locale: string } {
  if (!field.currencyField || !row) return organisation;
  const code = row[field.currencyField];
  if (typeof code !== "string" || code.trim().length !== 3) return organisation;
  return { currency: code.trim().toUpperCase(), locale: organisation.locale };
}
