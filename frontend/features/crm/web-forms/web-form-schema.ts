import { z } from "zod";
import type { WebFormInput } from "@/hooks/api/crm/web-forms";
import type { WebForm } from "@/hooks/api/crm/web-forms-schema";
import { parseUrl } from "./lead-form-schema";

export const FIELD_TYPES = ["text", "email", "phone", "textarea", "select"] as const;

export const FIELD_TYPE_LABEL: Record<(typeof FIELD_TYPES)[number], string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  textarea: "Long text",
  select: "Choice",
};

/**
 * The editor for one web form.
 *
 * Field `name`s are the keys the submission arrives under; `name`, `email`,
 * `phone`, `company` and `message` are the ones the backend lifts into the lead
 * itself (everything else lands in its custom data). Choice options are typed
 * as one comma-separated line and split on save.
 */
const fieldSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,62}$/, "Lowercase letters, digits and underscores, starting with a letter"),
  label: z.string().trim().min(1, "Give the field a label").max(200),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  options: z.string(),
});

export const webFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000),
    submitMessage: z.string().trim().max(500),
    redirectUrl: z
      .string()
      .trim()
      .refine((value) => value === "" || parseUrl(value) !== null, "Enter a full URL, including https://"),
    isActive: z.boolean(),
    fields: z.array(fieldSchema).min(1, "Add at least one field").max(50),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.fields.forEach((field, index) => {
      if (seen.has(field.name))
        ctx.addIssue({ code: "custom", path: ["fields", index, "name"], message: "Two fields share this name" });
      seen.add(field.name);
      if (field.type === "select" && splitOptions(field.options).length === 0)
        ctx.addIssue({ code: "custom", path: ["fields", index, "options"], message: "List at least one choice" });
    });
  });

export type WebFormValues = z.infer<typeof webFormSchema>;
export type WebFormFieldValues = WebFormValues["fields"][number];

function splitOptions(options: string): string[] {
  return options
    .split(",")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
}

export const EMPTY_FIELD: WebFormFieldValues = {
  name: "",
  label: "",
  type: "text",
  required: false,
  options: "",
};

export function toWebFormValues(form: WebForm | null): WebFormValues {
  if (!form)
    return {
      name: "",
      description: "",
      submitMessage: "",
      redirectUrl: "",
      isActive: true,
      fields: [
        { name: "name", label: "Name", type: "text", required: true, options: "" },
        { name: "email", label: "Email", type: "email", required: true, options: "" },
      ],
    };
  return {
    name: form.name,
    description: form.description ?? "",
    submitMessage: form.submitMessage,
    redirectUrl: form.redirectUrl ?? "",
    isActive: form.isActive,
    fields: form.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: FIELD_TYPES.find((type) => type === field.type) ?? "text",
      required: field.required,
      options: (field.options ?? []).join(", "),
    })),
  };
}

/**
 * Create omits blanks (its `redirectUrl` must be a URL or ""); update sends
 * null to clear a description or redirect the form used to have.
 */
export function toWebFormInput(values: WebFormValues, mode: "create" | "update"): WebFormInput {
  const clears = mode === "update";
  return {
    name: values.name,
    isActive: values.isActive,
    fields: values.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      ...(field.type === "select" ? { options: splitOptions(field.options) } : {}),
    })),
    ...(values.description !== "" ? { description: values.description } : clears ? { description: null } : {}),
    ...(values.submitMessage !== "" ? { submitMessage: values.submitMessage } : {}),
    ...(values.redirectUrl !== "" ? { redirectUrl: values.redirectUrl } : clears ? { redirectUrl: null } : {}),
  };
}
