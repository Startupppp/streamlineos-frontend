import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ValidationRulesLoading() {
  return (
    <PageWrapper
      title="Validation Rules"
      subtitle="Define field validation for CRM entities"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-md" />
          ))}
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b bg-muted/40 px-2 py-2 flex gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-12" />
            ))}
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-2 py-2 border-b last:border-0">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8 ml-auto" />
              <Skeleton className="h-5 w-9 rounded-full" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
