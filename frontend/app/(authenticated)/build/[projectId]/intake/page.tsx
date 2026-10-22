import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IntakePage } from "@/features/build/intake/intake-page";
import { prefetchProjectIntake } from "@/lib/prefetch/build-project-extras";
import ProjectIntakeLoading from "./loading";

function firstString(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function IntakeHydrated({
  projectId,
  highlightId,
  highlightRequested,
}: {
  projectId: number;
  highlightId: number | undefined;
  highlightRequested: boolean;
}) {
  const state = await prefetchProjectIntake(projectId);
  return (
    <HydrationBoundary state={state}>
      <IntakePage projectId={projectId} highlightId={highlightId} highlightRequested={highlightRequested} />
    </HydrationBoundary>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/intake");
  const { projectId } = await params;
  const sp = await searchParams;
  const rawHighlight = firstString(sp.highlight) ?? firstString(sp.item) ?? undefined;
  const highlightRequested = rawHighlight !== undefined && rawHighlight.length > 0;
  const highlightId =
    highlightRequested && rawHighlight !== undefined && /^\d+$/.test(rawHighlight)
      ? Number(rawHighlight)
      : undefined;
  return (
    <Suspense fallback={<ProjectIntakeLoading />}>
      <IntakeHydrated
        projectId={Number(projectId)}
        highlightId={highlightId}
        highlightRequested={highlightRequested}
      />
    </Suspense>
  );
}
