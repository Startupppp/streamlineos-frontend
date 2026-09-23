import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome";

const HEADERS = ["Name", "Status", "Release date", "Tickets", "Actions"] as const;

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
          <DataTableSkeleton mobileCards rows={12} headers={HEADERS} className="flex-1 min-h-0" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
