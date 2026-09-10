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
  | "reference"
  | "lines"
  /*
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
  */
  | "series";

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
 *
 * **Only for a value that can actually be negative.** A sign pivots on zero, so
 * declaring one on a quantity that never crosses it — a conversion rate, a day
 * count, a headcount — paints every non-zero row the same colour and reserves
 * neutral for the empty case. What such a column invites is a *threshold*
 * judgement, and a threshold is not a sign: it belongs in a derived badge with a
 * word in it, which survives greyscale and states where the line is.
 * `crm/deal-aging-layout.ts` is the worked example.
 */
export type SignMeaning = "gain" | "cost";

/** A sibling field holding one of a small set of values. See `visibleWhen`. */
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
   * The sibling field carrying the domain, when the pointer is polymorphic.
   *
   * `referenceTo` names one domain for every row of the field, and some pointers
   * genuinely do not have one: a task links to a lead on this row and a deal on
   * the next; a contact role attaches to a deal or a company depending on a
   * sibling. Two migrations hit this independently and both stopped rather than
   * describing a lie.
   *
   * The pair works the way `referenceLabel` does — the description says which
   * field carries the per-row half, and the engine reads it. `referenceTo`
   * remains the fallback for a row whose domain field is empty or names a domain
   * the product has no page for, and a pointer with neither renders as text.
   */
  readonly referenceToField?: string;
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
  /**
   * Present when creating, absent when editing. The mirror of `editOnly`.
   *
   * Some fields are decided once and then fixed: what kind a custom field is,
   * which entity a validation rule governs. The API accepts them on create and
   * ignores them afterwards, so offering them on an edit form is a control whose
   * value is silently dropped — which reads to the person using it as a change
   * that did not save.
   */
  readonly createOnly?: boolean;
  /**
   * The shape of one row, when the field holds a repeating group.
   *
   * Four migrations stopped at the same wall independently — an assignment
   * rule's conditions, a subject type's declared fields, a quote's line items,
   * and the line-item grid rendered beside them. Each is a list of small
   * records that belong to the record being edited and have no page of their
   * own, and none of them could be described: `FieldSpec` could say a field
   * holds text or a number or a pointer, and had no way to say it holds several
   * of something. So each of the four was written by hand, with its own add
   * button, its own remove button and its own idea of what an empty row is.
   *
   * That is the vocabulary gap this closes, once. A `lines` field is a field
   * whose value is rows, and the rows are described with the same `FieldSpec`
   * every other part of a layout uses — so a column in a line is validated,
   * formatted, toned and aligned by exactly the code that handles a column
   * anywhere else, rather than by a second engine for small tables.
   *
   * Deliberately one level deep. `validateLayout` reports a line field that is
   * itself `lines`, because a description that can nest arbitrarily is a tree
   * with no bound, and a form that renders one is a program rather than a
   * screen. The four surfaces that needed this needed exactly one level.
   *
   * Line fields are also not conditional and not mode-scoped: `visibleWhen`,
   * `editOnly` and `createOnly` are reported here rather than silently ignored.
   * A row of a repeating group is the same shape on every row, which is what
   * lets one header stand over all of them.
   */
  readonly lineFields?: readonly FieldSpec[];
  /**
   * What one row is called, for the add control and the empty state.
   *
   * Falls back to the field's own label, which reads acceptably ("Add
   * Conditions") and is why this is optional rather than required — a
   * description that forgot it still renders a working form.
   */
  readonly lineLabel?: string;
  /**
   * How many rows the record cannot go below.
   *
   * A rule with no conditions matches everything and a quote with no lines has
   * no price; both are records the API rejects, and finding that out on submit
   * is a form that wasted the person's time. One is the common case, so the
   * engine keeps the last row rather than offering a remove control that
   * produces an invalid record.
   */
  readonly minLines?: number;
  /**
   * The field is only part of the record while a sibling holds one of these
   * values.
   *
   * Several CRM settings records are one shape with several arms: a validation
   * rule's configuration depends on its `ruleType`, a custom field's options
   * only exist when its `fieldType` is a select, an assignment rule's controls
   * depend on how it assigns. Written by hand each of those is a form with five
   * branches in it; described without this, the alternative is rendering all
   * eight config fields at once, which is a worse form than the one it replaces.
   *
   * It is domain rather than presentation, which is why it belongs here: a
   * pattern is not *hidden* when the rule is numeric, it does not *apply*. That
   * distinction is what makes the rest follow — an inapplicable field is not
   * validated, so a required one cannot block a submit it has nothing to do
   * with, and it is not submitted, so the API is never sent a leftover from an
   * arm the record is not on.
   *
   * Compared as strings, because that is what every control in the engine hands
   * back. Deliberately equality against a small set and nothing more: an
   * expression language here would be a program in the description, and a
   * description that can compute is no longer data a tenant can be shown.
   */
  readonly visibleWhen?: FieldCondition;
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

  /*
    A description with no columns at all is a singleton — organisation-wide quote
    settings, say: one record, reached from a settings page, never listed. That
    is a real shape, so it is not an error; what is an error is a list that has
    columns and no primary one, which renders a mobile card with no title.
  */
  if (layout.list.columns.length > 0 && !layout.list.columns.some((column) => column.primary))
    problems.push({
      where: "list.columns",
      message: "no primary column, so the mobile card would have no title",
    });

  for (const field of layout.fields) {
    /*
      There is no control that types a run of figures. A writable series would
      render as a text input over an array, and submit "[object Object]".
    */
    if (field.kind === "series" && !field.readOnly)
      problems.push({
        where: `fields (${field.name})`,
        message: "a series is not something anybody types, so it must be readOnly",
      });

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

    if (field.visibleWhen !== undefined) {
      if (!known.has(field.visibleWhen.field))
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: `unknown field "${field.visibleWhen.field}"`,
        });
      if (field.visibleWhen.field === field.name)
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: "a field cannot depend on itself",
        });
      if (field.visibleWhen.equals.length === 0)
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: "no values, so the field would never apply",
        });
    }

    if (field.kind === "lines" && (field.lineFields ?? []).length === 0)
      problems.push({
        where: `fields (${field.name})`,
        message: "a lines field with no lineFields has no row to render",
      });

    if (field.lineFields !== undefined && field.kind !== "lines")
      problems.push({
        where: `fields (${field.name})`,
        message: `lineFields on a ${field.kind} field, which holds one value rather than rows`,
      });

    if (field.minLines !== undefined && field.kind !== "lines")
      problems.push({
        where: `fields (${field.name})`,
        message: `minLines on a ${field.kind} field, which has no rows to count`,
      });

    if (field.minLines !== undefined && (!Number.isInteger(field.minLines) || field.minLines < 0))
      problems.push({
        where: `fields (${field.name}).minLines`,
        message: `minLines ${field.minLines} is not a row count`,
      });

    for (const line of field.lineFields ?? []) {
      const where = `fields (${field.name}).lineFields (${line.name})`;

      if (line.kind === "lines")
        problems.push({ where, message: "a line cannot itself hold rows" });

      /*
        A repeating group is edited, and a series is not editable. A column that
        can only be read has no business in a row somebody is filling in.
      */
      if (line.kind === "series")
        problems.push({ where, message: "a line cannot hold a series, which is never editable" });

      /*
        A row is the same shape on every row. A conditional, create-only or
        edit-only column would make one row's header wrong for the next, and
        the engine renders one header over the whole group.
      */
      if (line.visibleWhen !== undefined)
        problems.push({ where, message: "visibleWhen on a line, which every row shares" });
      if (line.editOnly || line.createOnly)
        problems.push({ where, message: "editOnly/createOnly on a line, which every row shares" });

      if (line.sign !== undefined && !isNumericField(line))
        problems.push({
          where,
          message: `sign "${line.sign}" on a ${line.kind} line, which has no sign to read`,
        });
    }

    const lineNames = (field.lineFields ?? []).map((line) => line.name);
    for (const name of new Set(
      lineNames.filter((name, index) => lineNames.indexOf(name) !== index),
    ))
      problems.push({
        where: `fields (${field.name}).lineFields`,
        message: `duplicate line "${name}"`,
      });

    if (field.referenceToField !== undefined) {
      if (field.kind !== "reference")
        problems.push({
          where: `fields (${field.name})`,
          message: `referenceToField on a ${field.kind} field, which points at nothing`,
        });
      if (!known.has(field.referenceToField))
        problems.push({
          where: `fields (${field.name}).referenceToField`,
          message: `unknown field "${field.referenceToField}"`,
        });
    }

    if (field.referenceLabel !== undefined) {
      if (field.kind !== "reference")
        problems.push({
          where: `fields (${field.name})`,
          message: `referenceLabel on a ${field.kind} field, which points at nothing`,
        });
      // A label naming a field the record does not carry renders the raw
      // identifier on every row — visible, but wrong, and silently so.
      if (!known.has(field.referenceLabel))
        problems.push({
          where: `fields (${field.name}).referenceLabel`,
          message: `unknown field "${field.referenceLabel}"`,
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
