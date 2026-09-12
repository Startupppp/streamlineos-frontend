import {
  isNumericField,
  type RecordLayout,
} from "./layout";

export interface LayoutProblem {
  readonly where: string;
  readonly message: string;
}

/**
 * Reports what a description refers to but does not define.
 *
 * Descriptions will eventually be written by the system and edited by
 * administrators, so they have to be checkable — a silent omission would show up
 * as a column that renders nothing.
 */
export function validateLayout(layout: RecordLayout): LayoutProblem[] {
  const problems: LayoutProblem[] = [];
  const known = new Set(layout.fields.map((field) => field.name));

  const require = (name: string, where: string): void => {
    if (!known.has(name)) problems.push({ where, message: `unknown field "${name}"` });
  };

  require(layout.titleField, "titleField");
  layout.list.columns.forEach((column, index) => {
    require(column.field, `list.columns[${index}]`);
    if (column.subtitle) require(column.subtitle, `list.columns[${index}].subtitle`);
  });

  for (const [area, sections] of [
    ["detail", layout.detail.sections],
    ["form", layout.form.sections],
  ] as const) {
    sections.forEach((section, sectionIndex) => {
      section.fields.forEach((name) =>
        require(name, `${area}.sections[${sectionIndex}] (${section.title})`),
      );
    });
  }

  /*
    A description with no columns at all is a singleton — organisation-wide quote
    settings, say: one record, reached from a settings page, never listed. That
    is a real shape, so it is not an error; what is an error is a list that has
    columns and no primary one, which renders a mobile card with no title.
  */
  if (layout.list.columns.length > 0 && !layout.list.columns.some((column) => column.primary))
    problems.push({
      where: "list.columns",
      message: "no primary column, so the mobile card would have no title",
    });

  for (const field of layout.fields) {
    /*
      There is no control that types a run of figures. A writable series would
      render as a text input over an array, and submit "[object Object]".
    */
    if (field.kind === "series" && !field.readOnly)
      problems.push({
        where: `fields (${field.name})`,
        message: "a series is not something anybody types, so it must be readOnly",
      });

    if (field.sign !== undefined && !isNumericField(field))
      problems.push({
        where: `fields (${field.name})`,
        message: `sign "${field.sign}" on a ${field.kind} field, which has no sign to read`,
      });

    if (field.currencyField !== undefined) {
      if (field.kind !== "money")
        problems.push({
          where: `fields (${field.name})`,
          message: `currencyField on a ${field.kind} field, which carries no amount`,
        });
      if (!known.has(field.currencyField))
        problems.push({
          where: `fields (${field.name}).currencyField`,
          message: `unknown field "${field.currencyField}"`,
        });
    }

    if (field.visibleWhen !== undefined) {
      if (!known.has(field.visibleWhen.field))
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: `unknown field "${field.visibleWhen.field}"`,
        });
      if (field.visibleWhen.field === field.name)
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: "a field cannot depend on itself",
        });
      if (field.visibleWhen.equals.length === 0)
        problems.push({
          where: `fields (${field.name}).visibleWhen`,
          message: "no values, so the field would never apply",
        });
    }

    if (field.kind === "lines" && (field.lineFields ?? []).length === 0)
      problems.push({
        where: `fields (${field.name})`,
        message: "a lines field with no lineFields has no row to render",
      });

    if (field.lineFields !== undefined && field.kind !== "lines")
      problems.push({
        where: `fields (${field.name})`,
        message: `lineFields on a ${field.kind} field, which holds one value rather than rows`,
      });

    if (field.minLines !== undefined && field.kind !== "lines")
      problems.push({
        where: `fields (${field.name})`,
        message: `minLines on a ${field.kind} field, which has no rows to count`,
      });

    if (field.minLines !== undefined && (!Number.isInteger(field.minLines) || field.minLines < 0))
      problems.push({
        where: `fields (${field.name}).minLines`,
        message: `minLines ${field.minLines} is not a row count`,
      });

    for (const line of field.lineFields ?? []) {
      const where = `fields (${field.name}).lineFields (${line.name})`;

      if (line.kind === "lines")
        problems.push({ where, message: "a line cannot itself hold rows" });

      /*
        A repeating group is edited, and a series is not editable. A column that
        can only be read has no business in a row somebody is filling in.
      */
      if (line.kind === "series")
        problems.push({ where, message: "a line cannot hold a series, which is never editable" });

      /*
        A row is the same shape on every row. A conditional, create-only or
        edit-only column would make one row's header wrong for the next, and
        the engine renders one header over the whole group.
      */
      if (line.visibleWhen !== undefined)
        problems.push({ where, message: "visibleWhen on a line, which every row shares" });
      if (line.editOnly || line.createOnly)
        problems.push({ where, message: "editOnly/createOnly on a line, which every row shares" });

      if (line.sign !== undefined && !isNumericField(line))
        problems.push({
          where,
          message: `sign "${line.sign}" on a ${line.kind} line, which has no sign to read`,
        });
    }

    const lineNames = (field.lineFields ?? []).map((line) => line.name);
    for (const name of new Set(
      lineNames.filter((name, index) => lineNames.indexOf(name) !== index),
    ))
      problems.push({
        where: `fields (${field.name}).lineFields`,
        message: `duplicate line "${name}"`,
      });

    if (field.referenceToField !== undefined) {
      if (field.kind !== "reference")
        problems.push({
          where: `fields (${field.name})`,
          message: `referenceToField on a ${field.kind} field, which points at nothing`,
        });
      if (!known.has(field.referenceToField))
        problems.push({
          where: `fields (${field.name}).referenceToField`,
          message: `unknown field "${field.referenceToField}"`,
        });
    }

    if (field.referenceLabel !== undefined) {
      if (field.kind !== "reference")
        problems.push({
          where: `fields (${field.name})`,
          message: `referenceLabel on a ${field.kind} field, which points at nothing`,
        });
      // A label naming a field the record does not carry renders the raw
      // identifier on every row — visible, but wrong, and silently so.
      if (!known.has(field.referenceLabel))
        problems.push({
          where: `fields (${field.name}).referenceLabel`,
          message: `unknown field "${field.referenceLabel}"`,
        });
    }
  }

  const duplicates = layout.fields
    .map((field) => field.name)
    .filter((name, index, all) => all.indexOf(name) !== index);
  for (const name of new Set(duplicates))
    problems.push({ where: "fields", message: `duplicate field "${name}"` });

  return problems;
}
