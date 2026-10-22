import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarSettingsLoading() {
  return (
    <PageWrapper
      title="Calendar Settings"
      subtitle="Governance, trustworthy analytics, automation, and developer access"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48 rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}
