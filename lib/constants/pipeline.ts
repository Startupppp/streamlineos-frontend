export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export const DEAL_STAGES = [
  "Discovery",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export const LEAD_PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "EMAIL",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "EVENT",
  "PARTNER",
  "OTHER",
] as const;

export const STAGE_COLORS: Record<string, string> = {
  NEW: "hsl(217, 91%, 60%)",
  CONTACTED: "hsl(262, 83%, 58%)",
  INTERESTED: "hsl(38, 92%, 50%)",
  QUALIFIED: "hsl(160, 84%, 39%)",
  CONVERTED: "hsl(142, 71%, 45%)",
  LOST: "hsl(0, 84%, 60%)",
  Discovery: "hsl(217, 91%, 60%)",
  Proposal: "hsl(262, 83%, 58%)",
  Negotiation: "hsl(38, 92%, 50%)",
  "Closed Won": "hsl(142, 71%, 45%)",
  "Closed Lost": "hsl(0, 84%, 60%)",
} as const;

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "hsl(217, 91%, 60%)",
  MEDIUM: "hsl(38, 92%, 50%)",
  HIGH: "hsl(25, 95%, 53%)",
  URGENT: "hsl(0, 84%, 60%)",
} as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type DealStage = (typeof DEAL_STAGES)[number];
export type LeadPriority = (typeof LEAD_PRIORITY)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
