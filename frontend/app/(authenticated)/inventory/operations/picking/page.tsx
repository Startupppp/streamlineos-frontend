import { SoQueuePage } from "@/features/inventory/components/operations/so-queue-page";

export default function PickingQueuePage() {
  return (
    <SoQueuePage
      status="RESERVED"
      title="Picking Queue"
      emptyTitle="Nothing to pick"
      emptyDescription="Sales orders in Reserved status will appear here ready for picking."
    />
  );
}
