import type { ReportingFieldType, ReportingSource } from "@/types/crm/reporting";

export interface ReportFieldOption {
  readonly name: string;
  readonly label: string;
  readonly type: ReportingFieldType;
  readonly group: string;
}

export function sourceFieldOptions(source: ReportingSource | undefined): ReportFieldOption[] {
  if (!source) return [];
  const own = source.fields.map((field) => ({
    name: field.name,
    label: field.label,
    type: field.type,
    group: source.label,
  }));
  const related = source.relations.flatMap((relation) =>
    relation.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      group: relation.name,
    })),
  );
  return [...own, ...related];
}

export function groupFieldOptions(
  options: readonly ReportFieldOption[],
): { group: string; options: ReportFieldOption[] }[] {
  const byGroup = new Map<string, ReportFieldOption[]>();
  for (const option of options) {
    const bucket = byGroup.get(option.group);
    if (bucket) bucket.push(option);
    else byGroup.set(option.group, [option]);
  }
  return [...byGroup.entries()].map(([group, groupOptions]) => ({ group, options: groupOptions }));
}

export function findFieldOption(
  options: readonly ReportFieldOption[],
  name: string,
): ReportFieldOption | undefined {
  return options.find((option) => option.name === name);
}

export function fieldLabel(options: readonly ReportFieldOption[], name: string): string {
  return findFieldOption(options, name)?.label ?? name;
}
