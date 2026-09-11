"use client";

import { use } from "react";
import { DealDetailView } from "@/features/crm/deals/detail/deal-detail-view";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = use(params);
  return <DealDetailView dealIdParam={dealId} />;
}
