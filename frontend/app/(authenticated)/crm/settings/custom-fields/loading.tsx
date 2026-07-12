import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CustomFieldsLoading() {
  return (
    <PageWrapper
      title="Custom Fields"
      subtitle="Define additional fields for your CRM entities"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-md" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
