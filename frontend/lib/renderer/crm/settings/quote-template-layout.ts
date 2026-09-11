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
 * The quote *settings* beside this on the page are described separately, as a
 * singleton — see `QUOTE_SETTINGS_LAYOUT` below.
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
      { field: "name", primary: true },
      { field: "isDefault", width: "w-28 shrink-0" },
      { field: "terms" },
      { field: "updatedAt", width: "w-32 shrink-0" },
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

/**
 * How quoting behaves across the organisation — one record, never listed.
 *
 * A singleton, and the reason `validateLayout` stopped insisting on a primary
 * column: there is exactly one of these per tenant, reached from a settings
 * page, so `list.columns` is empty rather than inventing a table nobody will
 * see. An empty list is a real shape; a list with columns and no primary one is
 * still an error, because that renders a mobile card with no title.
 *
 * `titleField` is the one thing a singleton still has to name and has no answer
 * for — nothing here titles the record, because the record is the settings. It
 * points at the figure a reader would recognise the page by, and nothing renders
 * it: there is no list, and the surface renders a form rather than a detail
 * view.
 *
 * `maxDiscountPercent` is nullable and means "no ceiling" when empty, which is
 * why the surface sends `null` for a blank rather than omitting it. The other
 * three are required, so a blank would be a form that fails on submit.
 */
export const QUOTE_SETTINGS_LAYOUT: RecordLayout = {
  key: "crm:settings:quote-settings",
  singular: "Quoting rules",
  plural: "Quoting rules",
  titleField: "defaultExpiryDays",
  fields: [
    {
      name: "defaultExpiryDays",
      label: "Quotes expire after (days)",
      kind: "number",
      required: true,
      hint: "How long a quote stands before it lapses, unless the sender says otherwise.",
    },
    {
      name: "maxDiscountPercent",
      label: "Maximum discount",
      kind: "percent",
      hint: "Leave empty for no ceiling.",
    },
    {
      name: "requirePricebookPrice",
      label: "Prices must come from a pricebook",
      kind: "boolean",
      hint: "A line whose product is in no pricebook cannot be quoted.",
    },
    {
      name: "allowPriceOverride",
      label: "A seller may type their own price",
      kind: "boolean",
    },
  ],
  list: { searchPlaceholder: "", columns: [] },
  detail: {
    sections: [
      {
        title: "Quoting rules",
        fields: [
          "defaultExpiryDays",
          "maxDiscountPercent",
          "requirePricebookPrice",
          "allowPriceOverride",
        ],
      },
    ],
  },
  form: {
    sections: [
      { title: "Standing", fields: ["defaultExpiryDays", "maxDiscountPercent"] },
      { title: "Pricing", fields: ["requirePricebookPrice", "allowPriceOverride"] },
    ],
  },
};
