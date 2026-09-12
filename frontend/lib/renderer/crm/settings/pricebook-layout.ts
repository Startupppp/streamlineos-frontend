import type { RecordLayout } from "../../layout";

/**
 * A pricebook, and the prices in it.
 *
 * Two descriptions rather than one, because they are two record types: a
 * pricebook has a name and a currency, and a pricebook *entry* is a product at a
 * price above a quantity. The old sheet drew the entries as a hand-written list
 * with a three-input form under it; described as its own record type, the same
 * screen is a list and a form the engine already knows how to render.
 *
 * `isDefault` and `isActive` appear on the create form rather than being
 * `editOnly`: `CreatePricebookInput` demands both, so a create that omitted them
 * would fail on submit.
 */
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

/**
 * One product's price inside one pricebook.
 *
 * `unitPrice` is money, not the integer of minor units the API stores. The old
 * form asked for "Price (cents)" and printed `unitPriceCents / 100` back in the
 * list, which is two different units on one screen and a decimal point of
 * distance between them. The surface converts on the way in and out; the
 * description says what the figure *is*, which is an amount of money in the
 * product's own currency.
 */
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
