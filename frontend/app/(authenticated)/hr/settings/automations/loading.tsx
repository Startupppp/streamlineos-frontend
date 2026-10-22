import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationsSettingsLoading() {
  return (
    <PageWrapper
      title="Automations"
      subtitle="Configure automated HR workflows"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-20 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
