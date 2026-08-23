/**
 * A record surface described as data.
 *
 * Every CRM list, detail view and form is produced from one of these rather than
 * written by hand. Three things follow, and none of them are achievable with
 * compiled screens:
 *
 * Responsiveness and density are fixed once, in the engine, instead of being
 * re-decided on every screen and forgotten on half of them.
 *
 * The description is data, so it can be stored per tenant and rewritten — which
 * is what lets the system adapt a surface to how an organisation actually works
 * instead of shipping one frozen layout.
 *
 * And a new record type is a description, not a directory of components.
 */

export type FieldKind =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "money"
  | "date"
  | "select"
  | "badge"
  | "longText";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  /** Maps onto the status tokens from the design layer, never a raw colour. */
  readonly tone?: "success" | "warning" | "danger" | "info" | "neutral";
}

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required?: boolean;
  readonly readOnly?: boolean;
  readonly options?: readonly SelectOption[];
  /** Shown under the control on a form. */
  readonly hint?: string;
  /** Right-aligned and tabular in a list; set automatically for numeric kinds. */
  readonly numeric?: boolean;
}

export interface ColumnSpec {
  readonly field: string;
  /** The column the mobile card titles itself with. */
  readonly primary?: boolean;
  readonly sortable?: boolean;
  readonly width?: string;
  /**
   * A second, quieter line under the value — a legal name beneath a trading
   * name, say. Part of the description so it survives a tenant rearranging the
   * columns, rather than being baked into one screen.
   */
  readonly subtitle?: string;
}

export interface SectionSpec {
  readonly title: string;
  readonly fields: readonly string[];
}

export interface RecordLayout {
  /** Stable key the stored description is addressed by. */
  readonly key: string;
  readonly singular: string;
  readonly plural: string;
  /** The field rendered as the record's title. */
  readonly titleField: string;
  readonly fields: readonly FieldSpec[];
  readonly list: {
    readonly columns: readonly ColumnSpec[];
    readonly searchPlaceholder: string;
  };
  readonly detail: { readonly sections: readonly SectionSpec[] };
  readonly form: { readonly sections: readonly SectionSpec[] };
}

const NUMERIC_KINDS: ReadonlySet<FieldKind> = new Set(["number", "money"]);

export function isNumericField(field: FieldSpec): boolean {
  return field.numeric ?? NUMERIC_KINDS.has(field.kind);
}

/**
 * Looks a field up by name.
 *
 * Returns undefined rather than throwing: a layout is data, and a stale
 * description referencing a removed field should degrade to one missing column,
 * not a blank screen.
 */
export function fieldByName(
  layout: RecordLayout,
  name: string,
): FieldSpec | undefined {
  return layout.fields.find((field) => field.name === name);
}

export interface LayoutProblem {
  readonly where: string;
  readonly message: string;
}

/**
 * Reports what a description refers to but does not define.
 *
 * Descriptions will eventually be written by the system and edited by
 * administrators, so they have to be checkable — a silent omission would show up
 * as a column that renders nothing.
 */
export function validateLayout(layout: RecordLayout): LayoutProblem[] {
  const problems: LayoutProblem[] = [];
  const known = new Set(layout.fields.map((field) => field.name));

  const require = (name: string, where: string): void => {
    if (!known.has(name)) problems.push({ where, message: `unknown field "${name}"` });
  };

  require(layout.titleField, "titleField");
  layout.list.columns.forEach((column, index) => {
    require(column.field, `list.columns[${index}]`);
    if (column.subtitle) require(column.subtitle, `list.columns[${index}].subtitle`);
  });

  for (const [area, sections] of [
    ["detail", layout.detail.sections],
    ["form", layout.form.sections],
  ] as const) {
    sections.forEach((section, sectionIndex) => {
      section.fields.forEach((name) =>
        require(name, `${area}.sections[${sectionIndex}] (${section.title})`),
      );
    });
  }

  if (!layout.list.columns.some((column) => column.primary))
    problems.push({
      where: "list.columns",
      message: "no primary column, so the mobile card would have no title",
    });

  const duplicates = layout.fields
    .map((field) => field.name)
    .filter((name, index, all) => all.indexOf(name) !== index);
  for (const name of new Set(duplicates))
    problems.push({ where: "fields", message: `duplicate field "${name}"` });

  return problems;
}
