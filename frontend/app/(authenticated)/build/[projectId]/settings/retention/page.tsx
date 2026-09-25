import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Retention — Project Settings",
};

function RetentionPlaceholder() {
  return (
    <EmptyState
      illustrationPreset="projects"
      title="Retention policy pending"
      description="Retention and legal-hold policy configuration requires an answer to open question 9 (99-open-questions.md) before implementation can proceed. No policy is applied at present."
      className="flex-1 m-6"
    />
  );
}

export default async function ProjectSettingsRetentionRoute({ params: _params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/retention");
  return (
    <Suspense fallback={<Skeleton className="m-6 h-32 w-full" />}>
      <RetentionPlaceholder />
    </Suspense>
  );
}
