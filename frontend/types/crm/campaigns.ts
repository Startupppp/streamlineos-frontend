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
