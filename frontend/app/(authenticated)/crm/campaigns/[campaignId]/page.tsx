import { CampaignDetailPage } from "@/features/crm/campaigns/campaign-detail-page";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function CrmCampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;
  const id = parseInt(campaignId, 10);
  return <CampaignDetailPage campaignId={id} />;
}
