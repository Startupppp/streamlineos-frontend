import { SoQueuePage } from "@/features/inventory/components/operations/so-queue-page";

export default function ShippingQueuePage() {
  return (
    <SoQueuePage
      status="PACKED"
      title="Shipping Queue"
      emptyTitle="Nothing to ship"
      emptyDescription="Sales orders in Packed status will appear here ready for shipping."
    />
  );
}
