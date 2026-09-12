export interface CrmCampaign {
  id: number;
  orgId: string;
  name: string;
  status: string;
  channel: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  targetAudience: string | null;
  leads: number;
  spend: string;
  roi: string;
  budgetAllocated: string | null;
  budgetSpent: string | null;
  utmCampaignKey: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRoi {
  spend: number;
  leads: number;
  converted: number;
  deals: number;
  revenueCents: number;
  roi: number;
}

export interface CampaignAttribution {
  campaignId: number | null;
  campaignName: string;
  touchCount: number;
  convertedLeads: number;
  dealRevenueCents: number;
  roi: number;
}

/**
 * The five models the backend implements. Mirrors ATTRIBUTION_MODELS exactly —
 * a name here that the engine does not know comes back as a 400, and a name it
 * knows that is missing here is a model nobody can select.
 */
export const ATTRIBUTION_MODELS = [
  "first_touch",
  "last_touch",
  "linear",
  "time_decay",
  "position_based",
] as const;
export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];

export interface AttributedCampaign {
  /** Null is the real "no campaign" bucket — sales activity and direct leads. */
  campaignId: number | null;
  campaignName: string;
  /** Soft-deleted but still holding credit. Shown, not filtered. */
  campaignArchived: boolean;
  touchCount: number;
  dealCount: number;
  attributedRevenueMinor: number;
}

export interface AttributedChannel {
  channel: string;
  touchCount: number;
  attributedRevenueMinor: number;
}

export interface AttributionByModelReport {
  model: AttributionModel;
  /** Written by the backend, so the page never keeps a second copy of it. */
  modelDescription: string;
  halfLifeDays: number;
  dealsConsidered: number;
  dealsAttributed: number;
  /** Won deals whose timeline holds nothing on or before the close. */
  dealsWithoutTouches: number;
  /** The window hit its row cap, so the numbers are a floor. */
  truncated: boolean;
  totalRevenueMinor: number;
  attributedRevenueMinor: number;
  unattributableRevenueMinor: number;
  campaigns: AttributedCampaign[];
  channels: AttributedChannel[];
}
