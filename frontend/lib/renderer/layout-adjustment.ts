import { fieldByName, type ColumnSpec, type RecordLayout, type SectionSpec } from "./layout";
import { type LayoutProblem } from "./layout-validation";

/**
 * A tenant's arrangement of a record type, held apart from the description.
 *
 * The layout being data is only worth something if somebody other than us can
 * write it. This is the half a tenant owns: which fields they want to see, in
 * what order, gathered under headings that match how they talk about the record.
 * It is stored as an overlay rather than as a whole layout on purpose — a tenant
 * who hid one column in 2026 should still receive the field we add in 2027, and
 * a forked copy of the description would freeze them at the day they touched it.
 *
 * Three things it deliberately cannot do:
 *
 * It cannot invent a field. `order`, `hidden` and `groups` all name fields the
 * description already declares; anything else is reported by
 * `validateAdjustment` and ignored by `applyAdjustment`, because a stored
 * arrangement outlives the description it was written against.
 *
 * It cannot delete anything. Hiding removes a field from the arrangement, never
 * from `layout.fields`, so the value keeps arriving, keeps being stored, and
 * comes back the moment the field is unhidden. Hiding is a display preference
 * and it is the only thing it is.
 *
 * And it cannot widen access. There is no allow-list here and no permission key;
 * a field a tenant reveals is one the description already published and the API
 * already returned. Hiding a field a user cannot see does not make it visible,
 * and revealing one does not make a denied read succeed.
 */
export interface LayoutAdjustment {
  /** Matches `RecordLayout.key`; an adjustment is meaningless without one. */
  readonly layoutKey: string;
  /**
   * Field names in the tenant's order. A field not named keeps its declared
   * position, behind every field that is — so an adjustment written today does
   * not have to be rewritten when the description grows a field tomorrow.
   */
  readonly order?: readonly string[];
  /** Fields the tenant does not want rendered. Display only. */
  readonly hidden?: readonly string[];
  /**
   * The tenant's own sections, replacing the declared ones on both the detail
   * view and the form. A visible field the tenant did not place lands in a
   * trailing section rather than vanishing: a grouping is a rearrangement, and
   * losing a field to one would be the delete this type is not allowed to do.
   */
  readonly groups?: readonly SectionSpec[];
  readonly updatedAt?: string;
}

/** Where a visible field the tenant did not place ends up. */
export const UNGROUPED_SECTION_TITLE = "Other";

/**
 * The fields a tenant may hide.
 *
 * Two are withheld, and neither is a policy choice. The title field is what the
 * detail view and the mobile card name the record with, so hiding it produces an
 * untitled record. A required field is one the form must submit, so hiding it
 * produces a create form that cannot succeed — the tenant would not have removed
 * a column, they would have removed the ability to add a record.
 *
 * Nothing here consults a permission. What a user may read is decided before a
 * layout is ever applied, and a hidden field is hidden from someone who was
 * already allowed to see it.
 */
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

/**
 * Orders names by the tenant's preference, then by how they were declared.
 *
 * Stable in both halves: an unnamed field keeps its position relative to the
 * other unnamed ones, which is what stops a tenant who dragged one column to the
 * front from silently shuffling the twenty they did not touch.
 */
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

/**
 * The description a tenant actually sees.
 *
 * Pure, and it returns a `RecordLayout` rather than a decorated one. Everything
 * downstream — the list, the detail view, the generated schema, the form —
 * carries on knowing nothing about tenants, which is the property that makes
 * this worth doing at all: there is no second rendering path for an adjusted
 * layout, so an arrangement cannot render differently from a stock one.
 */
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

  /*
    The mobile card titles itself from the primary column. If the column that
    carried the flag was hidden or the tenant moved another to the front, the
    flag moves with the front — a card with no title is a blank row, and
    `validateLayout` would report the layout we just produced as broken.
  */
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
    // Untouched on purpose. Hiding is display; the field still exists, still
    // validates, and still comes back the moment it is unhidden.
    fields: layout.fields,
    list: { ...layout.list, columns: withPrimary },
    detail: { sections: arrange(layout.detail.sections) },
    form: { sections: arrange(layout.form.sections) },
  };
}

/**
 * The same description, narrowed to a few columns.
 *
 * A record type is often embedded in another record's page — the leads a
 * campaign brought in, the deals against a contact — and the embedded list wants
 * four columns rather than eleven. Without this every such panel forks the
 * description into a second one, and the fork is where the two quietly stop
 * agreeing about what a lead is.
 *
 * Not a `LayoutAdjustment`, and deliberately: an adjustment is what a tenant
 * wants, this is how one screen frames a related list, and storing a screen's
 * framing against a tenant would mean the panel's four columns followed them
 * onto the full list. Applied *after* `useTenantLayout`, so it can only narrow
 * what the tenant already sees — a column they hid does not come back through a
 * panel.
 *
 * An empty result returns the layout untouched. A panel showing every column is
 * a worse outcome than one showing none is a broken one.
 */
export function withColumns(layout: RecordLayout, fields: readonly string[]): RecordLayout {
  const kept = fields
    .map((name) => layout.list.columns.find((column) => column.field === name))
    .filter((column): column is ColumnSpec => column !== undefined);

  if (kept.length === 0) return layout;

  return {
    ...layout,
    list: {
      ...layout.list,
      // The subtitle survives narrowing: it is a second line under a value
      // rather than a column of its own, so it costs no width.
      columns: kept.map((column, index) => ({
        ...column,
        primary: index === 0 ? true : undefined,
      })),
    },
  };
}

/**
 * The same description, narrowed to the fields one composer asks for.
 *
 * The form counterpart of `withColumns`, and it exists for the same reason. A
 * quick action on a record's page — log a note against this lead, put a task
 * against this deal — asks for two or three fields and supplies the rest from
 * where it sits: the type is implied by the button, the anchor by the page. The
 * alternative is a hand-written panel with its own schema beside the record
 * type it is writing to, which is four more copies of what a field is.
 *
 * Not a `LayoutAdjustment`: an adjustment is what a tenant wants everywhere,
 * this is one composer's framing. Applied after `useTenantLayout`, so it can
 * only narrow what the tenant already sees.
 *
 * The heading is empty by default. A section title over a single textarea is a
 * label for something nobody was confused about; `RecordForm` omits an empty
 * one rather than rendering a blank line.
 */
export interface FormFraming {
  /** Empty by default; `RecordForm` omits an empty heading. */
  readonly title?: string;
  /**
   * Fields this composer insists on, even where the record type does not.
   *
   * A narrowing may **tighten** and never loosen. An interaction record allows
   * an empty note, because a call logged with no notes is still a call; a "add a
   * note" box with nothing in it is not a note, and it is the composer that
   * knows that, not the record type. Marking the shared field `required` would
   * make notes mandatory on the full interaction form too, which is the opposite
   * of what anybody asked for.
   *
   * Only tightening is offered. A composer that could mark a required field
   * optional would submit a record the API rejects.
   */
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

  /*
    Nothing kept means nothing to fill in — a tenant has hidden every field this
    composer writes. Unlike `withColumns`, the whole description is NOT the right
    fallback here: a "log a note" box that quietly became the full six-field
    interaction form is a worse outcome than one that says it has nothing to
    show. `RecordForm` renders that case as a sentence rather than as a submit
    button over no controls.
  */
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

/**
 * What an adjustment asks for that the description cannot honour.
 *
 * Reported rather than thrown, and separately from `applyAdjustment`, which
 * ignores the same things silently. An arrangement is stored data that outlives
 * the description it was written against: a field we removed should cost the
 * tenant a line in a settings screen, not a blank record surface.
 */
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
