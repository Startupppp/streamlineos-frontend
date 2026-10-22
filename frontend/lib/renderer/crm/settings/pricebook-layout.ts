import type { RecordLayout } from "../../layout";

export const PRICEBOOK_LAYOUT: RecordLayout = {
  key: "crm:settings:pricebook",
  singular: "Pricebook",
  plural: "Pricebooks",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "currency",
      label: "Currency",
      kind: "text",
      required: true,
      hint: "The three-letter code every price in this book is quoted in.",
    },
    {
      name: "isDefault",
      label: "Default",
      kind: "boolean",
      hint: "The book a quote reaches for when nothing else is chosen.",
      options: [
        { value: "true", label: "Default", tone: "info" },
        { value: "false", label: "Standard", tone: "neutral" },
      ],
    },
    {
      name: "isActive",
      label: "Active",
      kind: "boolean",
      options: [
        { value: "true", label: "Active", tone: "success" },
        { value: "false", label: "Inactive", tone: "neutral" },
      ],
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search pricebooks…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "currency", width: "w-24 shrink-0" },
      { field: "isDefault", width: "w-28 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Pricebook", fields: ["name", "currency", "isDefault", "isActive"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Pricebook", fields: ["name", "currency", "description"] },
      { title: "Availability", fields: ["isDefault", "isActive"] },
    ],
  },
};

export const PRICEBOOK_ENTRY_LAYOUT: RecordLayout = {
  key: "crm:settings:pricebook-entry",
  singular: "Price",
  plural: "Prices",
  titleField: "productName",
  fields: [
    {
      name: "productId",
      label: "Product",
      kind: "reference",
      required: true,
      referenceTo: "product",
    },
    { name: "productName", label: "Product", kind: "text", readOnly: true },
    { name: "productSku", label: "SKU", kind: "text", readOnly: true },
    {
      name: "unitPrice",
      label: "Price",
      kind: "money",
      required: true,
      currencyField: "productCurrency",
    },
    { name: "productCurrency", label: "Currency", kind: "text", readOnly: true },
    {
      name: "minQuantity",
      label: "Min quantity",
      kind: "number",
      required: true,
      hint: "The smallest order this price applies to.",
    },
  ],
  list: {
    searchPlaceholder: "Search prices…",
    columns: [
      { field: "productName", primary: true, subtitle: "productSku" },
      { field: "unitPrice", width: "w-32 shrink-0" },
      { field: "minQuantity", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Price", fields: ["productName", "unitPrice", "minQuantity"] }],
  },
  form: {
    sections: [{ title: "Price", fields: ["productId", "unitPrice", "minQuantity"] }],
  },
};
