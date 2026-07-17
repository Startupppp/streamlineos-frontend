import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function ReleasesLoading() {
  return (
    <PageWrapper
      title="Releases"
      subtitle="Track versions and shipped features"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} />
        </PmSection>
        <PmSection index={1}>
          <DataTableSkeleton rows={12} columns={5} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
