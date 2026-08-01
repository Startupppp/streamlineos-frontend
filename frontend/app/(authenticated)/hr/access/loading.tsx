import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrAccessLoading() {
  return (
    <PageWrapper
      title="HR Access"
      subtitle="Manage role groups, members, and permissions for this module."
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex items-center gap-1 border-b">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-none" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
