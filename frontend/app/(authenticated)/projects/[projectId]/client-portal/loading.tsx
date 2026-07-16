import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";

export default function ClientPortalLoading() {
  return (
    <PageWrapper title="Client Portal" subtitle="Control what clients see in their portal">
      <PmPageShell>
        <PmPanel className="min-w-0">
          <DataTableSkeleton rows={12} columns={3} />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
