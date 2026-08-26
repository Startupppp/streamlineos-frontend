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

export type RecordFormShape = Record<string, string>;

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

function checkField(field: FieldSpec, raw: string, ctx: z.RefinementCtx): void {
  {
    const value = raw.trim();

    if (!value) {
      if (field.required)
        ctx.addIssue({
          code: "custom",
          message: `${field.label} is required`,
          path: [field.name],
        });
      return;
    }

    const reject = (message: string): void => {
      ctx.addIssue({ code: "custom", message, path: [field.name] });
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
        if (!BOOLEAN_VALUES.includes(value as (typeof BOOLEAN_VALUES)[number]))
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
  const shape: Record<string, z.ZodType<string, string>> = {};
  for (const field of fields) shape[field.name] = z.string();

  return z.object(shape).superRefine((values, ctx) => {
    const record = { ...context, ...values };
    for (const field of fields) {
      if (!isFieldVisible(field, record)) continue;
      checkField(field, values[field.name] ?? "", ctx);
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
  for (const field of formFields(layout, mode))
    if (isFieldVisible(field, context)) kept[field.name] = values[field.name] ?? "";
  return kept;
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
    const text = values[field.name]?.trim();
    if (text) payload[field.name] = text;
  }

  return payload;
}
