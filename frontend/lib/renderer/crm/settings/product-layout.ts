import type { RecordLayout } from "../../layout";

export const PRODUCT_LAYOUT: RecordLayout = {
  key: "crm:settings:product",
  singular: "Product",
  plural: "Products",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "sku", label: "SKU", kind: "text" },
    { name: "category", label: "Category", kind: "text" },
    {
      name: "unitPrice",
      label: "Unit price",
      kind: "money",
      required: true,
      currencyField: "currency",
    },
    {
      name: "currency",
      label: "Currency",
      kind: "select",
      options: [
        { value: "INR", label: "INR" },
        { value: "USD", label: "USD" },
        { value: "EUR", label: "EUR" },
        { value: "GBP", label: "GBP" },
      ],
    },
    {
      name: "taxRate",
      label: "Tax rate",
      kind: "percent",
      hint: "Applied to this product on every quote line that uses it.",
    },
    {
      name: "isActive",
      label: "Active",
      kind: "boolean",
      editOnly: true,
      options: [
        { value: "true", label: "Active", tone: "success" },
        { value: "false", label: "Inactive", tone: "neutral" },
      ],
    },
    { name: "description", label: "Description", kind: "longText" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search products…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "sku", width: "w-32 shrink-0" },
      { field: "category", width: "w-32 shrink-0" },
      { field: "unitPrice", width: "w-32 shrink-0" },
      { field: "taxRate", width: "w-24 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Product", fields: ["name", "sku", "category", "isActive"] },
      { title: "Pricing", fields: ["unitPrice", "currency", "taxRate"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Product", fields: ["name", "sku", "category", "description"] },
      { title: "Pricing", fields: ["unitPrice", "currency", "taxRate"] },
      { title: "Availability", fields: ["isActive"] },
    ],
  },
};
