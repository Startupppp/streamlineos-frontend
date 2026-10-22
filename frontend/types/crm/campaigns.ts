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

export const ATTRIBUTION_MODELS = [
  "first_touch",
  "last_touch",
  "linear",
  "time_decay",
  "position_based",
] as const;
export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];

export interface AttributedCampaign {
  campaignId: number | null;
  campaignName: string;
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
  modelDescription: string;
  halfLifeDays: number;
  dealsConsidered: number;
  dealsAttributed: number;
  dealsWithoutTouches: number;
  truncated: boolean;
  totalRevenueMinor: number;
  attributedRevenueMinor: number;
  unattributableRevenueMinor: number;
  campaigns: AttributedCampaign[];
  channels: AttributedChannel[];
}
