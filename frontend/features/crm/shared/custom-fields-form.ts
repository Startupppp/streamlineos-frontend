import type { RecordLayout } from "@/lib/renderer/layout";
import type { RecordFormValues } from "@/components/renderer";
import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";

export function customFieldsLayout(
  entityType: CustomFieldDefinition["entityType"],
  fields: readonly CustomFieldDefinition[],
): RecordLayout {
  const names = fields.map((f) => f.name);
  return {
    key: `crm:custom-fields:${entityType}`,
    singular: "Custom field",
    plural: "Custom fields",
    titleField: names[0] ?? "",
    fields: fields.map((f) => ({
      name: f.name,
      label: f.label,
      kind: f.fieldType,
      ...(f.isRequired ? { required: true } : {}),
      ...(f.fieldType === "select" && f.options ? { options: f.options } : {}),
    })),
    list: { searchPlaceholder: "", columns: [] },
    detail: { sections: [] },
    form: { sections: [{ title: "Custom fields", fields: names }] },
  };
}

export function mergeCustomData(
  fields: readonly CustomFieldDefinition[],
  existing: Record<string, unknown>,
  values: RecordFormValues,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  for (const field of fields) {
    const raw = (values[field.name] ?? "").trim();
    if (field.fieldType === "boolean") next[field.name] = raw === "true";
    else if (!raw) next[field.name] = null;
    else if (field.fieldType === "number") {
      const n = Number(raw);
      next[field.name] = Number.isFinite(n) ? n : null;
    } else next[field.name] = raw;
  }
  return next;
}
