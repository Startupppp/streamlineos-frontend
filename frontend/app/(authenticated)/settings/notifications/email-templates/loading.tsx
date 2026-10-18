import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function EmailTemplatesLoading() {
  return (
    <PageWrapper
      title="Email templates"
      subtitle="Preview the emails this workspace sends and send yourself a test."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <DataTableSkeleton
        fill
        headers={["Email", "Category", "Subject", "Version", ""]}
      />
    </PageWrapper>
  );
}
