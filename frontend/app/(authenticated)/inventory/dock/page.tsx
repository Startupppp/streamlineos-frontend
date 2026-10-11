import { Suspense } from "react";
import { DockContent } from "@/features/inventory/components/dock-content";

export default function DockPage() {
  return (
    <Suspense>
      <DockContent />
    </Suspense>
  );
}
