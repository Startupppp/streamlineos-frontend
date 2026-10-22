import type { RecordLayout } from "../layout";

export const CAMPAIGN_LAYOUT: RecordLayout = {
  key: "crm:campaign",
  singular: "Campaign",
  plural: "Campaigns",
  titleField: "name",
  fields: [
    { name: "name", label: "Campaign", kind: "text", required: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "active", label: "Active", tone: "success" },
        { value: "paused", label: "Paused", tone: "warning" },
        { value: "draft", label: "Draft", tone: "info" },
        { value: "completed", label: "Completed", tone: "neutral" },
      ],
    },
    {
      name: "channel",
      label: "Channel",
      kind: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "social", label: "Social media" },
        { value: "search", label: "Search / SEO" },
        { value: "paid", label: "Paid ads" },
        { value: "referral", label: "Referral" },
        { value: "event", label: "Event" },
        { value: "other", label: "Other" },
      ],
    },
    { name: "budgetAllocated", label: "Budget", kind: "money" },
    { name: "spend", label: "Spend", kind: "money", readOnly: true },
    { name: "leads", label: "Leads", kind: "number", readOnly: true },
    {
      name: "roi",
      label: "ROI",
      kind: "percent",
      readOnly: true,
      sign: "gain",
    },
    { name: "startDate", label: "Starts", kind: "date" },
    { name: "endDate", label: "Ends", kind: "date" },
    {
      name: "utmCampaignKey",
      label: "UTM key",
      kind: "text",
      hint: "The utm_campaign value that attributes a lead back to this campaign.",
    },
    { name: "targetAudience", label: "Audience", kind: "text" },
    { name: "description", label: "Description", kind: "longText" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search campaigns…",
    columns: [
      { field: "name", primary: true },
      { field: "status", width: "w-28 shrink-0" },
      { field: "channel", width: "w-32 shrink-0" },
      { field: "budgetAllocated", width: "w-32 shrink-0" },
      { field: "spend", width: "w-32 shrink-0" },
      { field: "leads", width: "w-20 shrink-0" },
      { field: "roi", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Campaign", fields: ["name", "status", "channel", "utmCampaignKey"] },
      { title: "Return", fields: ["budgetAllocated", "spend", "leads", "roi"] },
      { title: "Run", fields: ["startDate", "endDate", "targetAudience"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Campaign", fields: ["name", "channel", "utmCampaignKey"] },
      { title: "Budget and run", fields: ["budgetAllocated", "startDate", "endDate"] },
      { title: "Audience", fields: ["targetAudience", "description"] },
    ],
  },
};
