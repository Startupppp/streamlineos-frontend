import { Suspense } from "react";
import { DockContent } from "@/features/inventory/components/dock/dock-content";

export default function DockPage() {
  return (
    <Suspense>
      <DockContent />
    </Suspense>
  );
}
