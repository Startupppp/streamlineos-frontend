import { Suspense } from "react";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { requireSession } from "@/lib/rbac/require-permission";
import { Skeleton } from "@/components/ui/skeleton";

function TimeOffLoading() {
  return <Skeleton className="m-4 h-64 rounded-lg" />;
}

export default async function MyTimeOffPage() {
  await requireSession();
  return (
    <Suspense fallback={<TimeOffLoading />}>
      <LeavesWfhContent selfService />
    </Suspense>
  );
}
