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
  | "percent"
  | "date"
  | "dateTime"
  | "select"
  | "badge"
  | "boolean"
  | "longText"
  | "reference";

/** Maps onto the status tokens from the design layer, never a raw colour. */
export type FieldTone = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * The two values a `boolean` field can hold, as the strings a form carries.
 *
 * A boolean is a `select` whose options are fixed, which is why it reuses
 * `options` for its labels and tones rather than growing a vocabulary of its
 * own: "Active / Inactive" and "Required / Optional" are the same shape as any
 * other two-option field, and a description that said `trueLabel` would be a
 * second way to say something the layout can already say.
 *
 * Strings because every control in the engine hands back a string and the
 * generated resolver matches the form's own values without a cast. The surface
 * converts at the boundary, in the same place it converts a date to an instant.
 */
export const BOOLEAN_VALUES = ["true", "false"] as const;

/** What a `boolean` field renders when the description names no options. */
export const DEFAULT_BOOLEAN_OPTIONS: readonly SelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

/**
 * What a number's sign tells the person reading it.
 *
 * Several CRM surfaces paint a figure green above zero and red below it — a
 * campaign's ROI, a forecast variance, a margin. Written by hand that is a
 * `roiColorClass` helper per screen, each with its own thresholds, and it is why
 * those screens could not move onto the engine: the description had no way to
 * say it, so migrating them would have lost the colour.
 *
 * The vocabulary is deliberately not "paint this green". A layout describes what
 * a field *is*, and the engine decides what that looks like; a description that
 * named a colour would put presentation back into the data and break the moment
 * a tenant is allowed to write one. What the description says is which direction
 * is good news:
 *
 * `gain` — above zero is good. ROI, margin, growth, net new.
 * `cost` — above zero is bad. Overspend, days late, churn, discount given.
 *
 * Absent means the sign is arithmetic rather than a verdict — a balance, a
 * quantity, a coordinate — and the number renders plainly. Absent is the
 * default because most numbers are not a verdict, and a product that tints every
 * figure has told the reader nothing.
 *
 * Colour is never the only signal: a negative value carries its minus sign, so
 * the two cases remain distinguishable without seeing the tone at all.
 */
export type SignMeaning = "gain" | "cost";

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
  /** Shown under the control on a form. */
  readonly hint?: string;
  /** Right-aligned and tabular in a list; set automatically for numeric kinds. */
  readonly numeric?: boolean;
  /**
   * Declares the field's sign as good or bad news, so the engine can tone it.
   * Only meaningful on a numeric kind; `validateLayout` reports it anywhere else
   * rather than letting it sit in a description doing nothing.
   */
  readonly sign?: SignMeaning;
  /**
   * What this field points at, when it points at another record.
   *
   * An assignee, a linked deal, an owning team: the value stored is an
   * identifier, and rendering it as one is a form that asks a person to type a
   * number they do not know. A description cannot supply the picker — who may be
   * assigned depends on the caller's organisation and permissions, which is a
   * screen concern rather than a shape one — so it names the domain and the
   * surface hands `RecordForm` the control, the same way it hands `RecordList`
   * its row actions.
   *
   * With no control supplied the field degrades to a plain text input rather
   * than disappearing, because a missing control is a screen that forgot one,
   * not a field that stopped existing.
   */
  readonly referenceTo?: string;
  /**
   * The sibling field carrying this pointer's human name.
   *
   * A reference stores an identifier, and "42" is not what anybody is looking
   * for. Most reads already send the name beside the id — `dealTitle` next to
   * `dealId` — so the description says which field that is rather than the
   * engine guessing at a suffix or a second call being made to find out.
   *
   * Absent, the identifier renders. That is honest rather than pretty: a
   * pointer with no name available is a pointer, and inventing a label for it
   * would be the engine claiming to know something it does not.
   */
  readonly referenceLabel?: string;
  /**
   * The field carrying this amount's own currency.
   *
   * Most money in the product is the organisation's, and the engine renders it
   * in the organisation's currency without a description having to say so. Some
   * records carry their own — a quote is written in the currency the customer
   * buys in, and it is stored on the quote. Rendering that in the tenant's
   * symbol is not a formatting nicety; it states a different price.
   *
   * Names a sibling field rather than a currency code, because the code belongs
   * to the record and not to the layout. Absent, and on a non-money field, the
   * organisation's own display is used.
   */
  readonly currencyField?: string;
  /**
   * Present when editing, absent when creating.
   *
   * Some fields only exist once the record does — a status a workflow assigns,
   * an identifier the server mints. Rendering them on a create form offers a
   * value the API will reject or ignore, which is a form that fails on submit.
   */
  readonly editOnly?: boolean;
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

const NUMERIC_KINDS: ReadonlySet<FieldKind> = new Set(["number", "money", "percent"]);

export function isNumericField(field: FieldSpec): boolean {
  return field.numeric ?? NUMERIC_KINDS.has(field.kind);
}

/**
 * The tone a signed value earns, or undefined if the field is not a verdict.
 *
 * Pure and in this module rather than in the rendering layer, because it is the
 * meaning of the declaration rather than the look of it — a stored layout, a
 * proposed one and a compiled one all resolve it identically, and a test can
 * assert the rule without rendering anything.
 *
 * Zero is `neutral` in both directions. Zero ROI is not good news and not bad
 * news, and painting it either way would be the engine inventing a verdict the
 * data does not support. An unparseable value earns no tone at all, for the same
 * reason `money` leaves one alone: a confident colour on a number we could not
 * read is a lie with more conviction than a plain one.
 */
export function toneForSignedValue(field: FieldSpec, value: unknown): FieldTone | undefined {
  if (field.sign === undefined) return undefined;

  const amount = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(amount) || String(value ?? "").trim() === "") return undefined;

  if (amount === 0) return "neutral";
  const favourable = field.sign === "gain" ? amount > 0 : amount < 0;
  return favourable ? "success" : "danger";
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

  for (const field of layout.fields) {
    if (field.sign !== undefined && !isNumericField(field))
      problems.push({
        where: `fields (${field.name})`,
        message: `sign "${field.sign}" on a ${field.kind} field, which has no sign to read`,
      });

    if (field.currencyField !== undefined) {
      if (field.kind !== "money")
        problems.push({
          where: `fields (${field.name})`,
          message: `currencyField on a ${field.kind} field, which carries no amount`,
        });
      if (!known.has(field.currencyField))
        problems.push({
          where: `fields (${field.name}).currencyField`,
          message: `unknown field "${field.currencyField}"`,
        });
    }
  }

  const duplicates = layout.fields
    .map((field) => field.name)
    .filter((name, index, all) => all.indexOf(name) !== index);
  for (const name of new Set(duplicates))
    problems.push({ where: "fields", message: `duplicate field "${name}"` });

  return problems;
}

/**
 * The display a money field renders in, given the record it belongs to.
 *
 * Falls back to the organisation's own display whenever the record does not name
 * a currency or names something that is not a currency code: a confident symbol
 * on an amount we could not place is worse than the tenant's own.
 */
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
