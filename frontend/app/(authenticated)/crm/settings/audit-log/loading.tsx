import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AuditLogLoading() {
  return (
    <PageWrapper
      title="Audit Log"
      subtitle="A chronological record of all CRM actions"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="w-px flex-1 bg-border/30 mt-1" />
              </div>
              <div className="flex-1 pb-4">
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
