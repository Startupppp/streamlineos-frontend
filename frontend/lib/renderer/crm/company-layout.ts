import type { RecordLayout } from "../layout";

export const COMPANY_LAYOUT: RecordLayout = {
  key: "crm:company",
  singular: "Company",
  plural: "Companies",
  titleField: "name",
  fields: [
    { name: "name", label: "Company", kind: "text", required: true },
    { name: "industry", label: "Industry", kind: "text" },
    {
      name: "size",
      label: "Size",
      kind: "select",
      options: [
        { value: "1-10", label: "1–10 employees" },
        { value: "11-50", label: "11–50 employees" },
        { value: "51-200", label: "51–200 employees" },
        { value: "201-1000", label: "201–1,000 employees" },
        { value: "1000+", label: "1,000+ employees" },
      ],
    },
    {
      name: "domain",
      label: "Domain",
      kind: "text",
      hint: "The bare domain, without a scheme — example.com.",
    },
    { name: "website", label: "Website", kind: "url" },
    { name: "linkedinUrl", label: "LinkedIn", kind: "url" },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "tier",
      label: "Account tier",
      kind: "select",
      hint: "Weights this account's feedback when the roadmap is prioritized.",
      options: [
        { value: "free", label: "Free" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
    { name: "healthScore", label: "Health", kind: "percent", readOnly: true },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search companies…",
    columns: [
      { field: "name", primary: true, subtitle: "domain" },
      { field: "industry", width: "w-40 shrink-0" },
      { field: "size", width: "w-36 shrink-0" },
      { field: "website", width: "w-48 shrink-0" },
      { field: "tier", width: "w-28 shrink-0" },
      { field: "healthScore", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Company", fields: ["name", "industry", "size", "domain"] },
      { title: "Reach", fields: ["website", "linkedinUrl"] },
      { title: "Account", fields: ["tier", "healthScore", "createdAt"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Company", fields: ["name", "industry", "size", "domain"] },
      { title: "Reach", fields: ["website", "linkedinUrl"] },
      { title: "Account", fields: ["tier"] },
      { title: "Description", fields: ["description"] },
    ],
  },
};
