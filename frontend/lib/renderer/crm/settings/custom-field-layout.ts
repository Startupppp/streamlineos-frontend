import type { RecordLayout } from "../../layout";

/**
 * A tenant's own field on a lead, deal or contact.
 *
 * Two pieces of vocabulary carry this one, and without either it could not be
 * described at all.
 *
 * `fieldType` is `createOnly`. What kind a field is gets decided once and then
 * fixed — the update endpoint ignores it, because records already carry values
 * in that shape — so an edit form must not offer it. The old sheet rendered the
 * control disabled instead, which reads as broken rather than as settled.
 *
 * `options` applies only to a choice field, said by `visibleWhen`. It is not
 * hidden on a date field, it is not part of one: not rendered, not validated,
 * and not submitted, so a text field is never stored a list of choices left over
 * from a type somebody tried and changed their mind about.
 *
 * The pairs themselves are still not a `FieldSpec` kind, and should not become
 * one — a chip holds one string and a choice is two, `{ value, label }`. The
 * description says the field is text and the surface supplies the pair editor
 * through `controls`, the same escape hatch a person picker uses; what the
 * engine carries is one string, which is what lets the generated schema, the
 * defaults and `visibleWhen` go on working without knowing the control exists.
 *
 * `optionCount` is resolved by the surface from the options the record already
 * carries, the same way a pipeline name is: a fact about the record shown as a
 * column, which nothing writes.
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
      required: true,
      createOnly: true,
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
      name: "options",
      label: "Choices to pick from",
      kind: "longText",
      hint: "What a person may pick, and the value each choice stores.",
      visibleWhen: { field: "fieldType", equals: ["select"] },
    },
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
  form: {
    sections: [
      { title: "Field", fields: ["label", "fieldType"] },
      { title: "Behaviour", fields: ["isRequired"] },
      { title: "Choices", fields: ["options"] },
    ],
  },
};
