import type { RecordLayout } from "../../layout";

/**
 * A tenant's own field on a lead, deal or contact — described, for the list.
 *
 * The list is the whole of what this description drives, and `form` is empty on
 * purpose. Two things stop the form being generated, and both are the
 * vocabulary's rather than this screen's:
 *
 * A `select` field carries `options`, a list of `{ value, label }` pairs, and
 * `FieldSpec` has no array kind — nor should it grow one for a list of pairs a
 * chip control cannot express, because a chip holds one string and an option is
 * two. And the editor for it must appear only when `fieldType` is `select`; a
 * description cannot say "only when", and `RecordFieldControl` hands a supplied
 * control its own value and nothing else, so a control cannot decide from a
 * sibling field either.
 *
 * There is a third, smaller gap worth naming: `fieldType` is accepted on create
 * and refused on update — a field's type cannot change once records carry
 * values in it. `editOnly` says the opposite of that and there is no
 * create-only marker, so it is described here as read-only, which is true of
 * every form the engine would generate but not of the create form.
 *
 * `optionCount` is resolved by the surface from the options the record already
 * carries, the same way a pipeline name is: it is a fact about the record shown
 * as a column, and nothing writes it.
 */
export const CUSTOM_FIELD_LAYOUT: RecordLayout = {
  key: "crm:settings:custom-field",
  singular: "Custom field",
  plural: "Custom fields",
  titleField: "label",
  fields: [
    { name: "label", label: "Label", kind: "text", required: true },
    { name: "name", label: "Key", kind: "text", readOnly: true },
    {
      name: "fieldType",
      label: "Type",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "text", label: "Text", tone: "neutral" },
        { value: "number", label: "Number", tone: "info" },
        { value: "date", label: "Date", tone: "warning" },
        { value: "boolean", label: "Yes / no", tone: "success" },
        { value: "select", label: "Choice", tone: "info" },
      ],
    },
    { name: "optionCount", label: "Choices", kind: "number", readOnly: true },
    {
      name: "isRequired",
      label: "Required",
      kind: "boolean",
      options: [
        { value: "true", label: "Required", tone: "warning" },
        { value: "false", label: "Optional", tone: "neutral" },
      ],
    },
    { name: "isActive", label: "Active", kind: "boolean" },
    { name: "sortOrder", label: "Order", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search fields…",
    columns: [
      { field: "label", primary: true, subtitle: "name" },
      { field: "fieldType", width: "w-32 shrink-0" },
      { field: "optionCount", width: "w-24 shrink-0" },
      { field: "isRequired", width: "w-28 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Field", fields: ["label", "name", "fieldType", "optionCount"] },
      { title: "Behaviour", fields: ["isRequired", "isActive", "sortOrder"] },
    ],
  },
  form: { sections: [] },
};
