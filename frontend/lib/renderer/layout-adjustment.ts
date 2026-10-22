import { fieldByName, type ColumnSpec, type RecordLayout, type SectionSpec } from "./layout";
import { type LayoutProblem } from "./layout-validation";

export interface LayoutAdjustment {
  readonly layoutKey: string;
  readonly order?: readonly string[];
  readonly hidden?: readonly string[];
  readonly groups?: readonly SectionSpec[];
  readonly updatedAt?: string;
}

export const UNGROUPED_SECTION_TITLE = "Other";

export function hidableFields(layout: RecordLayout): string[] {
  return layout.fields
    .filter((field) => field.name !== layout.titleField && !field.required)
    .map((field) => field.name);
}

export function isHidable(layout: RecordLayout, name: string): boolean {
  const field = fieldByName(layout, name);
  if (!field) return false;
  return field.name !== layout.titleField && !field.required;
}

function applyOrder(names: readonly string[], order: readonly string[]): string[] {
  if (order.length === 0) return [...names];
  const rank = new Map(order.map((name, index) => [name, index]));
  const named = names.filter((name) => rank.has(name));
  const rest = names.filter((name) => !rank.has(name));
  named.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  return [...named, ...rest];
}

function sectionsFromGroups(
  groups: readonly SectionSpec[],
  visible: readonly string[],
): SectionSpec[] {
  const placed = new Set(groups.flatMap((group) => group.fields));
  const sections = groups
    .map((group) => ({
      title: group.title,
      fields: group.fields.filter((name) => visible.includes(name)),
    }))
    .filter((section) => section.fields.length > 0);

  const leftover = visible.filter((name) => !placed.has(name));
  if (leftover.length > 0)
    sections.push({ title: UNGROUPED_SECTION_TITLE, fields: leftover });

  return sections;
}

export function applyAdjustment(
  layout: RecordLayout,
  adjustment?: LayoutAdjustment | null,
): RecordLayout {
  if (!adjustment) return layout;

  const hidden = new Set(
    (adjustment.hidden ?? []).filter((name) => isHidable(layout, name)),
  );
  const order = (adjustment.order ?? []).filter((name) => fieldByName(layout, name));

  const visible = applyOrder(
    layout.fields.filter((field) => !hidden.has(field.name)).map((field) => field.name),
    order,
  );

  const columns = applyOrder(
    layout.list.columns.filter((column) => !hidden.has(column.field)).map((c) => c.field),
    order,
  ).flatMap((name) => {
    const column = layout.list.columns.find((candidate) => candidate.field === name);
    return column ? [column] : [];
  });

  const withPrimary = columns.map((column, index) => ({
    ...column,
    primary: index === 0 ? true : undefined,
    ...(column.subtitle && hidden.has(column.subtitle) ? { subtitle: undefined } : {}),
  }));

  const arrange = (sections: readonly SectionSpec[]): SectionSpec[] =>
    adjustment.groups && adjustment.groups.length > 0
      ? sectionsFromGroups(adjustment.groups, visible)
      : sections
          .map((section) => ({
            title: section.title,
            fields: applyOrder(
              section.fields.filter((name) => !hidden.has(name)),
              order,
            ),
          }))
          .filter((section) => section.fields.length > 0);

  return {
    ...layout,
    fields: layout.fields,
    list: { ...layout.list, columns: withPrimary },
    detail: { sections: arrange(layout.detail.sections) },
    form: { sections: arrange(layout.form.sections) },
  };
}

export function withColumns(layout: RecordLayout, fields: readonly string[]): RecordLayout {
  const kept = fields
    .map((name) => layout.list.columns.find((column) => column.field === name))
    .filter((column): column is ColumnSpec => column !== undefined);

  if (kept.length === 0) return layout;

  return {
    ...layout,
    list: {
      ...layout.list,
      columns: kept.map((column, index) => ({
        ...column,
        primary: index === 0 ? true : undefined,
      })),
    },
  };
}

export interface FormFraming {
  readonly title?: string;
  readonly required?: readonly string[];
}

export function withFormFields(
  layout: RecordLayout,
  fields: readonly string[],
  framing: FormFraming | string = {},
): RecordLayout {
  const { title = "", required = [] } =
    typeof framing === "string" ? { title: framing, required: [] } : framing;

  const declared = layout.form.sections.flatMap((section) => section.fields);
  const kept = fields.filter((name) => declared.includes(name));

  if (kept.length === 0) return { ...layout, form: { sections: [] } };

  const tightened = required.filter((name) => kept.includes(name));
  const withRequired =
    tightened.length === 0
      ? layout.fields
      : layout.fields.map((field) =>
          tightened.includes(field.name) ? { ...field, required: true } : field,
        );

  return {
    ...layout,
    fields: withRequired,
    form: { sections: [{ title, fields: kept }] },
  };
}

export function validateAdjustment(
  layout: RecordLayout,
  adjustment: LayoutAdjustment,
): LayoutProblem[] {
  const problems: LayoutProblem[] = [];

  if (adjustment.layoutKey !== layout.key)
    problems.push({
      where: "layoutKey",
      message: `arrangement is for "${adjustment.layoutKey}", not "${layout.key}"`,
    });

  const check = (name: string, where: string): void => {
    if (!fieldByName(layout, name))
      problems.push({ where, message: `unknown field "${name}"` });
  };

  (adjustment.order ?? []).forEach((name, index) => check(name, `order[${index}]`));

  (adjustment.hidden ?? []).forEach((name, index) => {
    check(name, `hidden[${index}]`);
    if (fieldByName(layout, name) && !isHidable(layout, name))
      problems.push({
        where: `hidden[${index}]`,
        message:
          name === layout.titleField
            ? `"${name}" titles the record, so hiding it would leave it unnamed`
            : `"${name}" is required, so hiding it would leave the form unsubmittable`,
      });
  });

  (adjustment.groups ?? []).forEach((group, index) =>
    group.fields.forEach((name) => check(name, `groups[${index}] (${group.title})`)),
  );

  return problems;
}
