import type { RecordLayout } from "../../layout";

/**
 * A quote template, as data.
 *
 * `branding` is deliberately absent. The endpoint accepts an arbitrary
 * `Record<string, unknown>` for it and no screen has ever offered a control; a
 * description whose fields are typed cannot name a free-form object, and a field
 * nothing edits is a column that renders nothing. It is left to whatever builds
 * branding when something does.
 *
 * The quote *settings* beside this on the page — default expiry, maximum
 * discount, whether a price may be overridden — are not described at all, and
 * cannot be: a `RecordLayout` must declare list columns with a primary among
 * them, and a singleton settings record has no list to declare. `validateLayout`
 * rejects a description without one, correctly. That form stays hand-written.
 */
export const QUOTE_TEMPLATE_LAYOUT: RecordLayout = {
  key: "crm:settings:quote-template",
  singular: "Quote template",
  plural: "Quote templates",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    {
      name: "isDefault",
      label: "Default",
      kind: "boolean",
      hint: "The template a new quote is rendered into unless another is chosen.",
      options: [
        { value: "true", label: "Default", tone: "info" },
        { value: "false", label: "Standard", tone: "neutral" },
      ],
    },
    {
      name: "terms",
      label: "Terms and conditions",
      kind: "longText",
      hint: "Printed at the foot of every quote made from this template.",
    },
    { name: "updatedAt", label: "Last changed", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search templates…",
    columns: [
      { field: "name", primary: true, sortable: true },
      { field: "isDefault", width: "w-28 shrink-0" },
      { field: "terms" },
      { field: "updatedAt", sortable: true, width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Template", fields: ["name", "isDefault"] },
      { title: "Terms", fields: ["terms"] },
    ],
  },
  form: {
    sections: [
      { title: "Template", fields: ["name", "isDefault"] },
      { title: "Terms", fields: ["terms"] },
    ],
  },
};
