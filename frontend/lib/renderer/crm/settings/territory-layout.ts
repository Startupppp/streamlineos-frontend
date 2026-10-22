import type { RecordLayout } from "../../layout";

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
