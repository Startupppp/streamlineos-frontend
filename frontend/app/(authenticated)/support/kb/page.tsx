import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { LoadingState } from "@/components/shared/loading-state";
import { KbManagerContent } from "@/features/help-centre/components/kb-manager-content";

function KbManagerFallback() {
  return <LoadingState variant="page" />;
}

export default async function SupportKbPage() {
  await enforceRouteAccess("/support/kb");
  return (
    <Suspense fallback={<KbManagerFallback />}>
      <KbManagerContent />
    </Suspense>
  );
}
