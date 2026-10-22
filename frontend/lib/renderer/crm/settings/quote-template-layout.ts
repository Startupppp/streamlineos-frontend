import type { RecordLayout } from "../../layout";

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
