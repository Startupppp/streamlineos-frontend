import { z } from "zod";
import { BOOLEAN_VALUES, type FieldSpec, type RecordLayout } from "./layout";

/**
 * Derives a Zod schema from a layout description.
 *
 * The description already declares what a field is and whether it is required,
 * so restating that as a hand-written schema beside it would be two sources of
 * truth that drift. Generating it means a form validates exactly what the list
 * and detail views claim the record is.
 *
 * Every field validates as a string. Controls hand back strings, an untouched
 * optional field is an empty string rather than undefined, and keeping one type
 * throughout is what lets the resolver match the form's own values without a
 * cast.
 */

/**
 * One row of a repeating group.
 *
 * A row is columns of strings for the same reason the record itself is: every
 * control the engine renders hands back a string, so one generated resolver
 * matches the form's own values without a cast, and the surface converts at the
 * boundary where it already converts a date to an instant.
 */
export type RecordLine = Record<string, string>;

/**
 * What the engine's form state holds.
 *
 * Wider than what a surface receives. A `lines` field carries rows, and the
 * form has to hold them, but a caller that has no repeating group should not
 * have to narrow a union on every read — so `RecordForm` splits the two apart
 * at submit and hands scalars and rows down separate parameters. This is the
 * internal shape; `RecordFormValues` is the public one.
 */
export type RecordFormShape = Record<string, string | RecordLine[]>;

export function isLineRows(value: string | RecordLine[] | undefined): value is RecordLine[] {
  return Array.isArray(value);
}

/** The scalar reading of a form value; rows read as empty rather than "[object Object]". */
export function scalarValue(value: string | RecordLine[] | undefined): string {
  return typeof value === "string" ? value : "";
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NUMERIC = /^-?\d*\.?\d+$/;

function isUrl(value: string): boolean {
  try {
    new URL(value.startsWith("http") ? value : `https://${value}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a field applies, given what the rest of the form currently holds.
 *
 * Exported because three things need the same answer and must not disagree:
 * what the form renders, what the generated schema validates, and what the
 * surface submits. A field that is rendered but not validated is a control
 * nothing checks; one that is validated but not rendered is a submit that fails
 * with no visible cause.
 */
export function isFieldVisible(
  field: FieldSpec,
  values: Readonly<Record<string, unknown>>,
): boolean {
  const condition = field.visibleWhen;
  if (!condition) return true;
  const raw = values[condition.field];
  return condition.equals.includes(raw === null || raw === undefined ? "" : String(raw));
}

/**
 * A repeating group, checked row by row against the row's own description.
 *
 * The columns of a line are `FieldSpec`s, so they go through exactly the check
 * a top-level field does — one implementation of "this is not an email", not a
 * second one for small tables. The path carries the row index so react-hook-form
 * puts each message on the control that earned it rather than at the top of the
 * group, which on a five-row quote is the difference between a fixable error and
 * a form that says no.
 */
function checkLines(field: FieldSpec, rows: RecordLine[], ctx: z.RefinementCtx): void {
  const minimum = field.minLines ?? (field.required ? 1 : 0);
  if (rows.length < minimum) {
    ctx.addIssue({
      code: "custom",
      message:
        minimum === 1
          ? `Add at least one ${(field.lineLabel ?? field.label).toLowerCase()}`
          : `Add at least ${minimum} ${field.label.toLowerCase()}`,
      path: [field.name],
    });
    return;
  }

  rows.forEach((row, index) => {
    for (const line of field.lineFields ?? [])
      checkField(line, row[line.name] ?? "", ctx, [field.name, index, line.name]);
  });
}

function checkField(
  field: FieldSpec,
  raw: string,
  ctx: z.RefinementCtx,
  /** Where the message lands. Defaults to the field's own control. */
  path: (string | number)[] = [field.name],
): void {
  {
    const value = raw.trim();

    if (!value) {
      if (field.required)
        ctx.addIssue({
          code: "custom",
          message: `${field.label} is required`,
          path,
        });
      return;
    }

    const reject = (message: string): void => {
      ctx.addIssue({ code: "custom", message, path });
    };

    switch (field.kind) {
      case "email":
        if (!EMAIL.test(value)) reject("Enter a valid email address");
        break;
      case "url":
        if (!isUrl(value)) reject("Enter a valid URL");
        break;
      case "number":
      case "money":
      case "percent":
        if (!NUMERIC.test(value)) reject("Enter a number");
        break;
      case "boolean":
        // A control that hands back anything but these two is a control that is
        // not a switch, and the API would receive a string where a flag belongs.
        if (!BOOLEAN_VALUES.some((allowed) => allowed === value))
          reject(`${field.label} must be yes or no`);
        break;
      case "select":
      case "badge": {
        const allowed = (field.options ?? []).map((option) => option.value);
        // An option the API does not accept is a form that fails on submit.
        if (allowed.length > 0 && !allowed.includes(value))
          reject(`Choose one of the listed ${field.label.toLowerCase()} values`);
        break;
      }
      default:
        break;
    }
  }
}

export type FormMode = "create" | "edit";

/**
 * Every editable field the form will render, in declared order.
 *
 * `editOnly` fields are dropped when creating and `createOnly` fields when
 * editing. Both are the same failure from opposite ends: a control whose value
 * the API will reject or silently drop is a form that appears to work and does
 * not, and the person using it reads a silent drop as a change that did not
 * save.
 */
export function formFields(layout: RecordLayout, mode: FormMode = "edit"): FieldSpec[] {
  const fields: FieldSpec[] = [];

  for (const section of layout.form.sections)
    for (const name of section.fields) {
      const field = layout.fields.find((candidate) => candidate.name === name);
      if (!field || field.readOnly) continue;
      if (mode === "create" && field.editOnly) continue;
      if (mode === "edit" && field.createOnly) continue;
      fields.push(field);
    }

  return fields;
}

/**
 * The schema, checked at the object rather than per field.
 *
 * Per-field refinements cannot see their siblings, and `visibleWhen` needs
 * exactly that: a pattern is not required when the rule is numeric, because it
 * is not part of that record. Checking once at the object level with every value
 * in hand is what lets an inapplicable field be skipped rather than enforced —
 * and `path` puts each message back on its own control, so the form still says
 * which field it means.
 */
export function schemaForLayout(
  layout: RecordLayout,
  mode: FormMode = "edit",
  /**
   * What the record holds beyond what the form edits.
   *
   * A condition can name a field the form does not render — a type fixed at
   * creation, a stage a workflow owns. Without it here, the schema would decide
   * that every conditional field is inapplicable and validate none of them,
   * which is a form that submits an empty required field in silence.
   */
  context: Readonly<Record<string, unknown>> = {},
): z.ZodType<RecordFormShape, RecordFormShape> {
  const fields = formFields(layout, mode);
  const line = z.record(z.string(), z.string());
  const shape: Record<string, z.ZodType<string | RecordLine[], string | RecordLine[]>> = {};
  for (const field of fields)
    shape[field.name] = field.kind === "lines" ? z.array(line) : z.string();

  return z.object(shape).superRefine((values, ctx) => {
    const record = { ...context, ...values };
    for (const field of fields) {
      if (!isFieldVisible(field, record)) continue;

      const held = values[field.name];
      if (field.kind === "lines") {
        checkLines(field, isLineRows(held) ? held : [], ctx);
        continue;
      }
      checkField(field, scalarValue(held), ctx);
    }
  });
}

/**
 * The values a submit should carry: everything the record is currently on.
 *
 * A field from an arm the record is not on is dropped rather than sent empty.
 * Sending it would put a leftover `pattern` on a numeric rule — a value the API
 * stores, nobody can see, and the next reader has to explain.
 */
export function visibleFormValues(
  layout: RecordLayout,
  mode: FormMode,
  values: RecordFormShape,
  /**
   * What the *record* holds, which is not always what the form holds.
   *
   * A condition can name a field the form does not render — a `createOnly` type
   * chosen at creation, a `readOnly` state a workflow set. That value is still
   * part of the record and is still the answer to "which arm is this on", so the
   * caller merges it under the form's own values. Defaults to the form values,
   * which is right whenever the controlling field is editable.
   */
  context: Readonly<Record<string, unknown>> = values,
): RecordFormShape {
  const kept: RecordFormShape = {};
  for (const field of formFields(layout, mode)) {
    if (!isFieldVisible(field, context)) continue;
    const held = values[field.name];
    kept[field.name] =
      field.kind === "lines" ? (isLineRows(held) ? held : []) : scalarValue(held);
  }
  return kept;
}

/** A blank row: every column of the line at its empty value. */
export function blankLine(field: FieldSpec): RecordLine {
  const row: RecordLine = {};
  for (const line of field.lineFields ?? [])
    row[line.name] = line.kind === "boolean" ? "false" : "";
  return row;
}

/**
 * The rows a `lines` field opens on, normalised to the columns it declares.
 *
 * Rows arrive from an API as objects of numbers, nulls and booleans; the form
 * carries strings. Normalising here rather than at each surface is what lets a
 * sheet hand the engine the record it already had, unchanged, and get a form
 * back — the same bargain `defaultValuesForLayout` makes for every other kind.
 */
function linesFrom(field: FieldSpec, value: unknown): RecordLine[] {
  const rows = Array.isArray(value)
    ? value.map((entry) => {
        const source = isRecord(entry) ? entry : {};
        const row: RecordLine = {};
        for (const line of field.lineFields ?? []) {
          const held = source[line.name];
          if (line.kind === "boolean") {
            row[line.name] = String(held === true || held === "true" || held === 1);
            continue;
          }
          row[line.name] = held === null || held === undefined ? "" : String(held);
        }
        return row;
      })
    : [];

  const minimum = field.minLines ?? (field.required ? 1 : 0);
  while (rows.length < minimum) rows.push(blankLine(field));
  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function defaultValuesForLayout(
  layout: RecordLayout,
  initial?: Record<string, unknown>,
  mode: FormMode = "edit",
): RecordFormShape {
  const values: RecordFormShape = {};
  for (const field of formFields(layout, mode)) {
    const value = initial?.[field.name];

    /*
      A repeating group opens on the rows the record already has, and on the
      minimum it may not go below when it has none — an empty conditions list
      renders an add button over nothing, and the first thing anybody does is
      press it.
    */
    if (field.kind === "lines") {
      values[field.name] = linesFrom(field, value);
      continue;
    }

    /*
      A switch has no third position. An absent boolean therefore defaults to
      "false" rather than to the empty string every other kind uses, because an
      empty string would render the switch off and then fail its own validation
      on submit — a form that looks complete and refuses to save.
    */
    if (field.kind === "boolean") {
      values[field.name] = String(value === true || value === "true" || value === 1);
      continue;
    }

    values[field.name] = value === null || value === undefined ? "" : String(value);
  }
  return values;
}

/**
 * The body a form's values describe, over exactly the fields it rendered.
 *
 * This exists because of hiding. A tenant who hides a field has asked to stop
 * looking at it, and the engine honours that by leaving the field out of the
 * form — so the submitted values have no key for it at all. A caller that then
 * builds its payload by naming keys, as every hand-written sheet did, reads
 * `undefined` for the hidden field and sends `null`. The API dutifully clears a
 * column the tenant never touched, and hiding has quietly become deleting.
 *
 * Absent is therefore the only correct treatment of a field the form did not
 * render: on a PATCH, absent means "leave this alone" and `null` means "clear
 * it", and the two must not be confused. Building the body from the layout
 * rather than from a hand-written list of keys is what makes that automatic.
 */
export function patchForUpdate(
  layout: RecordLayout,
  values: RecordFormShape,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};

  for (const field of formFields(layout, "edit")) {
    const raw = values[field.name];
    if (raw === undefined) continue;
    /*
      A repeating group is not text and has no null. It goes to the API as rows,
      which the surface reads with `lines` on submit; flattening it into this
      map would send "[object Object]" and clear a quote's line items.
    */
    if (field.kind === "lines" || isLineRows(raw)) continue;
    const text = raw.trim();
    patch[field.name] = text === "" ? null : text;
  }

  return patch;
}

/**
 * The same, for a record that does not exist yet.
 *
 * An empty field on create is "not supplied" rather than "clear it", so it is
 * omitted instead of being sent as `null` — a create DTO that rejects nulls
 * would otherwise fail on every optional field the user left blank.
 */
export function payloadForCreate(
  layout: RecordLayout,
  values: RecordFormShape,
): Record<string, string> {
  const payload: Record<string, string> = {};

  for (const field of formFields(layout, "create")) {
    const raw = values[field.name];
    if (field.kind === "lines" || isLineRows(raw)) continue;
    const text = raw?.trim();
    if (text) payload[field.name] = text;
  }

  return payload;
}
