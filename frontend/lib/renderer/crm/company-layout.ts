import type { RecordLayout } from "../layout";

/**
 * Companies, as data.
 *
 * The seven fields the create endpoint accepts are the seven the form renders,
 * and `organizationUpdateSchema` accepts the same seven — so nothing here is
 * `editOnly`. What the update endpoint accepts and this description withholds is
 * `parentId`, `notes` and `healthScore`, and each is withheld for its own
 * reason.
 *
 * `parentId` and `notes` already have owners on the detail page — the parent
 * picker and the notes editor — and a second control writing the same column
 * from a generic form is two editors racing over one value. Neither is declared
 * at all, because a description that names a field nothing renders is dead data.
 *
 * `healthScore` is declared and read-only. The API does accept it, but the
 * product derives the score (`computeHealthScore`) and reads
 * `org.healthScore ?? derived` — so one hand-typed number silently switches the
 * account off its derivation for good. Read-only keeps the figure visible in the
 * list and on the record without offering that trade in a form.
 *
 * The health column loses its traffic-light. The hand-written table painted it
 * green above 70 and red below 40, and the vocabulary has no way to say that:
 * `sign` reports a verdict about zero, and every health score is above zero, so
 * `gain` would paint every account green. The number survives; the banding does
 * not, and inventing a colour here would put presentation back into the data.
 */
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
      { field: "healthScore", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Company", fields: ["name", "industry", "size", "domain"] },
      { title: "Reach", fields: ["website", "linkedinUrl"] },
      { title: "Account", fields: ["healthScore", "createdAt"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Company", fields: ["name", "industry", "size", "domain"] },
      { title: "Reach", fields: ["website", "linkedinUrl"] },
      { title: "Description", fields: ["description"] },
    ],
  },
};
