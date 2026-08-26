import type { RecordLayout } from "../layout";

/**
 * Campaigns, as data.
 *
 * The surface this replaces is where the engine's vocabulary was found wanting:
 * it carried a `roiColorClass` helper painting ROI green above zero and red
 * below, and no description could say that, so the screen could not move.
 * `sign: "gain"` is what closed it — the description states that a bigger number
 * is better news, and the engine decides what better news looks like.
 *
 * Two columns the hand-written table carried are gone rather than translated.
 * "Converted" and "Revenue" rendered a literal em dash on every row for every
 * campaign; the list endpoint has never sent either. A generated table cannot
 * hold a column with nothing behind it, which is the point — the description has
 * to name a field, and there was no field to name.
 */
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
      // Neither create nor update accepts a status — `CreateCampaignInput` omits
      // it and update is a Partial of that — so it is read-only rather than
      // edit-only. A control here would be one whose value is dropped.
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
      // Above zero the campaign returned more than it cost. Below, it did not.
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
      { field: "name", primary: true, sortable: true },
      { field: "status", width: "w-28 shrink-0" },
      { field: "channel", width: "w-32 shrink-0" },
      { field: "budgetAllocated", width: "w-32 shrink-0" },
      { field: "spend", width: "w-32 shrink-0" },
      { field: "leads", sortable: true, width: "w-20 shrink-0" },
      { field: "roi", sortable: true, width: "w-24 shrink-0" },
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
