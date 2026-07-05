"use client";

import { SoQueuePage } from "@/features/inventory/components/operations/so-queue-page";

export default function PackingQueuePage() {
  return (
    <SoQueuePage
      status="PICKED"
      title="Packing Queue"
      actionNoun="pack"
      emptyTitle="Nothing to pack"
      emptyDescription="Sales orders in Picked status will appear here ready for packing."
    />
  );
}
