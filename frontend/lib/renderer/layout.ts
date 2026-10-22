
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
    A field whose value is a run of figures rather than one.

    A rep's talk ratio across the reporting window is a real field of that
    record -- it is what the row is about -- and until this existed a
    description had no way to say so, which is why the one table that shows one
    stayed hand-written after the CRM was migrated. Both alternatives were
    worse: a `text` field whose value is secretly an array is a description
    lying about its own shape, and dropping the column to migrate the screen
    would be losing a feature to satisfy a count.

    The engine deliberately does not draw it. What a chart of a series *means* --
    that these are basis points, that the buckets are weeks, that a gap is a
    fortnight nobody called anybody rather than a flat line -- is domain the
    layout layer does not have and should not acquire; a sparkline drawn from
    those numbers alone would join the line straight through the quiet week and
    claim nothing changed. So the surface draws it through `RecordList`'s
    `cells`, and the description owns everything around it: the header, the
    width, the position, the mobile card, and whether the tenant sees the column
    at all.

    Read-only always. There is no control that types a series, and
    `validateLayout` reports one that is not rather than letting a form render an
    input over it.
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
