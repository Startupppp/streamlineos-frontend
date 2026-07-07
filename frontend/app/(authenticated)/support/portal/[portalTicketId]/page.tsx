"use client";

import { use } from "react";
import { PortalTicketDetailPage } from "@/features/support/portal/portal-ticket-detail-page";

interface PageProps {
  params: Promise<{ portalTicketId: string }>;
}

export default function SupportPortalTicketRoute({ params }: PageProps) {
  const { portalTicketId } = use(params);
  return <PortalTicketDetailPage portalTicketId={parseInt(portalTicketId, 10)} />;
}
