"use client";

import { SoQueuePage } from "@/features/inventory/components/operations/so-queue-page";

export default function ShippingQueuePage() {
  return (
    <SoQueuePage
      status="PACKED"
      title="Shipping Queue"
      actionNoun="ship"
      emptyTitle="Nothing to ship"
      emptyDescription="Sales orders in Packed status will appear here ready for shipping."
    />
  );
}
