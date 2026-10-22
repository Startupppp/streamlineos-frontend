import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ModulesPage } from "@/features/build/modules/modules-page";
import { prefetchProjectModules } from "@/lib/prefetch/build";
import ModulesLoading from "./loading";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/modules");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchProjectModules(id);
  return (
    <Suspense fallback={<ModulesLoading />}>
      <HydrationBoundary state={state}>
        <ModulesPage projectId={id} />
      </HydrationBoundary>
    </Suspense>
  );
}
