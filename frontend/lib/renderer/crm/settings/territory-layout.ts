import type { RecordLayout } from "../../layout";

/**
 * A territory, as data.
 *
 * The eight criteria are described as ordinary `text` fields, not as an invented
 * array kind. What a territory matches on is a list of short values typed one at
 * a time, and that is a control rather than a shape: the surface hands
 * `RecordForm` a chip editor through `controls`, exactly as it would hand it a
 * person picker, and the value the engine carries is still one string. Growing
 * the vocabulary an array kind to hold "Maharashtra, Gujarat" would put a
 * container in the description where a comma already does the job.
 *
 * The old table summarised three of the eight criteria into a "Criteria" column
 * built by a helper. Three of them are columns here instead, so the value shown
 * is the value stored — a summary string is a field the API never sends and no
 * tenant could rearrange.
 */
export const TERRITORY_LAYOUT: RecordLayout = {
  key: "crm:settings:territory",
  singular: "Territory",
  plural: "Territories",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "priority",
      label: "Priority",
      kind: "number",
      hint: "Checked highest first when two territories both match a lead.",
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
    { name: "countries", label: "Countries", kind: "text" },
    { name: "states", label: "States", kind: "text" },
    { name: "cities", label: "Cities", kind: "text" },
    { name: "postalCodes", label: "Postal codes", kind: "text" },
    { name: "industries", label: "Industries", kind: "text" },
    { name: "companySizes", label: "Company sizes", kind: "text" },
    { name: "productKeys", label: "Products", kind: "text" },
    { name: "accountTypes", label: "Account types", kind: "text" },
  ],
  list: {
    searchPlaceholder: "Search territories…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "states", width: "w-40 shrink-0" },
      { field: "industries", width: "w-40 shrink-0" },
      { field: "priority", width: "w-24 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Territory", fields: ["name", "priority", "isActive", "description"] },
      { title: "Where", fields: ["countries", "states", "cities", "postalCodes"] },
      { title: "Who", fields: ["industries", "companySizes", "productKeys", "accountTypes"] },
    ],
  },
  form: {
    sections: [
      { title: "Territory", fields: ["name", "description", "priority", "isActive"] },
      { title: "Where", fields: ["countries", "states", "cities", "postalCodes"] },
      { title: "Who", fields: ["industries", "companySizes", "productKeys", "accountTypes"] },
    ],
  },
};
