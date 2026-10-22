import type { WebFormField } from "@/hooks/api/crm/web-forms-schema";
import type { FieldKind, FieldSpec, RecordLayout } from "../../layout";

const KIND_BY_TYPE: Readonly<Record<string, FieldKind>> = {
  email: "email",
  phone: "phone",
  textarea: "longText",
  select: "select",
};

function toFieldSpec(field: WebFormField): FieldSpec {
  return {
    name: field.name,
    label: field.label,
    kind: KIND_BY_TYPE[field.type] ?? "text",
    required: field.required,
    ...(field.type === "select"
      ? { options: (field.options ?? []).map((option) => ({ value: option, label: option })) }
      : {}),
  };
}

export function webFormLeadLayout(definition: {
  readonly name: string;
  readonly fields: readonly WebFormField[];
}): RecordLayout {
  const names = definition.fields.map((field) => field.name);
  return {
    key: "crm:web-form-lead",
    singular: "Response",
    plural: definition.name,
    titleField: names[0] ?? "",
    fields: definition.fields.map(toFieldSpec),
    list: { columns: [], searchPlaceholder: "" },
    detail: { sections: [{ title: "", fields: names }] },
    form: { sections: [{ title: "", fields: names }] },
  };
}
