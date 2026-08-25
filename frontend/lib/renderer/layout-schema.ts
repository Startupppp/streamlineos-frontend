import { z } from "zod";
import type { FieldSpec, RecordLayout } from "./layout";

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

function schemaForField(field: FieldSpec): z.ZodType<string, string> {
  return z.string().superRefine((raw, ctx) => {
    const value = raw.trim();

    if (!value) {
      if (field.required)
        ctx.addIssue({ code: "custom", message: `${field.label} is required` });
      return;
    }

    const reject = (message: string): void => {
      ctx.addIssue({ code: "custom", message });
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
        if (!NUMERIC.test(value)) reject("Enter a number");
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
  });
}

export type FormMode = "create" | "edit";

/**
 * Every editable field the form will render, in declared order.
 *
 * `editOnly` fields are dropped when creating: some fields only exist once the
 * record does, and offering one on a create form offers a value the API will
 * reject or silently drop — which is a form that appears to work and does not.
 */
export function formFields(layout: RecordLayout, mode: FormMode = "edit"): FieldSpec[] {
  const fields: FieldSpec[] = [];

  for (const section of layout.form.sections)
    for (const name of section.fields) {
      const field = layout.fields.find((candidate) => candidate.name === name);
      if (!field || field.readOnly) continue;
      if (mode === "create" && field.editOnly) continue;
      fields.push(field);
    }

  return fields;
}

export function schemaForLayout(
  layout: RecordLayout,
  mode: FormMode = "edit",
): z.ZodType<RecordFormShape, RecordFormShape> {
  const shape: Record<string, z.ZodType<string, string>> = {};
  for (const field of formFields(layout, mode)) shape[field.name] = schemaForField(field);
  return z.object(shape);
}

export function defaultValuesForLayout(
  layout: RecordLayout,
  initial?: Record<string, unknown>,
  mode: FormMode = "edit",
): RecordFormShape {
  const values: RecordFormShape = {};
  for (const field of formFields(layout, mode)) {
    const value = initial?.[field.name];
    values[field.name] = value === null || value === undefined ? "" : String(value);
  }
  return values;
}
