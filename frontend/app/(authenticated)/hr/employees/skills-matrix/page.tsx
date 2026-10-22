import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrSkillsMatrix } from "@/lib/prefetch/hr-people";
import { SkillsMatrixPage } from "@/features/hr/employees/skills-matrix-page";
import SkillsMatrixLoading from "./loading";

async function SkillsMatrixHydrated() {
  const state = await prefetchHrSkillsMatrix();
  return (
    <HydrationBoundary state={state}>
      <SkillsMatrixPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<SkillsMatrixLoading />}>
      <SkillsMatrixHydrated />
    </Suspense>
  );
}
