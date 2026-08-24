import { z } from "zod";

/**
 * Mirrors the backend's `createSubjectTypeSchema` exactly.
 *
 * A declaration the API rejects is a form that fails on submit, and this is the
 * one form in the product whose output IS a schema — so the rules it enforces
 * have to be the same rules, stated once on each side of the boundary.
 */

export const FIELD_KINDS = [
  { value: "text", label: "Text" },
  { value: "longText", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "money", label: "Money" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "badge", label: "Badge" },
] as const;

/** The kinds whose values come from a declared list rather than free input. */
export const OPTION_KINDS: ReadonlySet<string> = new Set(["select", "badge"]);

/** Columns every subject already carries; a field labelled "Status" hits this. */
const RESERVED_FIELD_NAMES: ReadonlySet<string> = new Set([
  "title",
  "reference",
  "status",
  "subjectid",
  "createdat",
]);

const slug = z
  .string()
  .trim()
  .regex(
    /^[a-z][a-z0-9-]{0,47}$/,
    "Lowercase letters, digits and dashes, starting with a letter",
  );

const optionSchema = z.object({
  value: z.string().trim().min(1, "A value is required"),
  label: z.string().trim().min(1, "A label is required"),
});

const fieldSchema = z.object({
  name: slug,
  label: z.string().trim().min(1, "A label is required"),
  kind: z.enum(FIELD_KINDS.map((kind) => kind.value) as [string, ...string[]]),
  required: z.boolean(),
  options: z.array(optionSchema).max(50),
});

export const subjectTypeFormSchema = z
  .object({
    key: slug,
    singular: z.string().trim().min(1, "A singular name is required").max(60),
    plural: z.string().trim().min(1, "A plural name is required").max(60),
    titleField: z.string().trim().min(1, "Choose which field titles the record"),
    fields: z.array(fieldSchema).min(1, "Declare at least one field").max(40),
  })
  .superRefine((value, ctx) => {
    const names = value.fields.map((field) => field.name);

    names.forEach((name, index) => {
      if (name && names.indexOf(name) !== index)
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "name"],
          message: `"${name}" is already declared`,
        });
    });

    if (!names.includes(value.titleField))
      ctx.addIssue({
        code: "custom",
        path: ["titleField"],
        message: "The title field must be one of the declared fields",
      });

    value.fields.forEach((field, index) => {
      if (RESERVED_FIELD_NAMES.has(field.name.toLowerCase()))
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "name"],
          message: `"${field.name}" is reserved — every subject already has one`,
        });

      if (OPTION_KINDS.has(field.kind) && field.options.length === 0)
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "options"],
          message: "A select or badge needs at least one option",
        });
    });
  });

export type SubjectTypeForm = z.infer<typeof subjectTypeFormSchema>;

/** "Asking price" → "asking-price", so a person names a field once. */
export function labelToName(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/^[^a-z]+/, "");
}

export const EMPTY_FIELD = {
  name: "",
  label: "",
  kind: "text",
  required: false,
  options: [],
} satisfies SubjectTypeForm["fields"][number];
