import { z } from "zod";
import { BOOLEAN_VALUES, type FieldSpec, type RecordLayout } from "./layout";


export type RecordLine = Record<string, string>;

export type RecordFormShape = Record<string, string | RecordLine[]>;

export function isLineRows(value: string | RecordLine[] | undefined): value is RecordLine[] {
  return Array.isArray(value);
}

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

export function isFieldVisible(
  field: FieldSpec,
  values: Readonly<Record<string, unknown>>,
): boolean {
  const condition = field.visibleWhen;
  if (!condition) return true;
  const raw = values[condition.field];
  return condition.equals.includes(raw === null || raw === undefined ? "" : String(raw));
}

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
        else if (field.range) {
          const { min, max } = field.range;
          if (!/^\d+$/.test(value)) reject("Enter a whole number");
          else if (Number(value) < min || Number(value) > max)
            reject(`Enter a number from ${min} to ${max}`);
        }
        break;
      case "boolean":
        if (!BOOLEAN_VALUES.some((allowed) => allowed === value))
          reject(`${field.label} must be yes or no`);
        break;
      case "select":
      case "badge": {
        const allowed = (field.options ?? []).map((option) => option.value);
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

export function schemaForLayout(
  layout: RecordLayout,
  mode: FormMode = "edit",
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

export function visibleFormValues(
  layout: RecordLayout,
  mode: FormMode,
  values: RecordFormShape,
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

export function blankLine(field: FieldSpec): RecordLine {
  const row: RecordLine = {};
  for (const line of field.lineFields ?? [])
    row[line.name] = line.kind === "boolean" ? "false" : "";
  return row;
}

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

    if (field.kind === "lines") {
      values[field.name] = linesFrom(field, value);
      continue;
    }

    if (field.kind === "boolean") {
      values[field.name] = String(value === true || value === "true" || value === 1);
      continue;
    }

    values[field.name] = value === null || value === undefined ? "" : String(value);
  }
  return values;
}

export function patchForUpdate(
  layout: RecordLayout,
  values: RecordFormShape,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};

  for (const field of formFields(layout, "edit")) {
    const raw = values[field.name];
    if (raw === undefined) continue;
    if (field.kind === "lines" || isLineRows(raw)) continue;
    const text = raw.trim();
    patch[field.name] = text === "" ? null : text;
  }

  return patch;
}

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
