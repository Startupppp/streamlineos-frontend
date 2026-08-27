import { Suspense } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { KbManagerContent } from "@/features/help-centre/components/kb-manager-content";

function KbManagerFallback() {
  return <LoadingState variant="page" />;
}

export default function SupportKbPage() {
  return (
    <Suspense fallback={<KbManagerFallback />}>
      <KbManagerContent />
    </Suspense>
  );
}
