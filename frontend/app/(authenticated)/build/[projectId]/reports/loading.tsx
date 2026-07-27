import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel, PmSection } from "@/features/build/shared/pm-chrome";

export default function ReportsLoading() {
  return (
    <PageWrapper
      title="Agile Reports"
      subtitle="Velocity, burnup, and cumulative flow for this project"
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid gap-3 lg:grid-cols-2">
            <PmPanel className="p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-72 w-full rounded-md" />
            </PmPanel>
            <PmPanel className="p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-72 w-full rounded-md" />
            </PmPanel>
          </div>
        </PmSection>
        <PmSection index={1}>
          <PmPanel className="p-4">
            <Skeleton className="mb-3 h-4 w-28" />
            <Skeleton className="h-72 w-full rounded-md" />
          </PmPanel>
        </PmSection>
        <PmSection index={2}>
          <div className="grid gap-3 lg:grid-cols-2">
            <PmPanel className="p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-52 w-full rounded-md" />
            </PmPanel>
            <PmPanel className="p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-52 w-full rounded-md" />
            </PmPanel>
          </div>
        </PmSection>
        <PmSection index={3}>
          <PmPanel className="p-4">
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="h-48 w-full rounded-md" />
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
