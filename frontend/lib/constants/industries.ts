/**
 * The one industry list. Onboarding saves a value from it and Settings edits
 * it, so both must offer every value either can store. "IT Services" is also
 * the backend's skip default (`org-setup.service.ts` SKIP_INDUSTRY).
 */
export const INDUSTRIES: readonly string[] = [
  "IT Services",
  "Technology",
  "Agency",
  "Consulting",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Finance & Banking",
  "Legal",
  "Retail",
  "Retail & E-commerce",
  "Manufacturing",
  "Construction",
  "Healthcare",
  "Education",
  "Real Estate",
  "Restaurant",
  "Hospitality & Travel",
  "Logistics",
  "Logistics & Supply Chain",
  "Non-profit",
  "Other",
];
