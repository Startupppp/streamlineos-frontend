import type { RecordLayout } from "../../layout";

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
