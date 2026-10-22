"use client";

import { use } from "react";
import { PortalDocDetailPage } from "@/features/portal/components/portal-doc-detail";

interface Props {
  params: Promise<{ pageId: string }>;
}

export default function SharedDocDetailPage({ params }: Props) {
  const { pageId: pageIdParam } = use(params);
  const pageId = parseInt(pageIdParam, 10);

  return <PortalDocDetailPage pageId={isNaN(pageId) ? 0 : pageId} />;
}
