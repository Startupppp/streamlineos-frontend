import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function InventorySettingsLoading() {
  return (
    <PageWrapper
      title="Settings"
      subtitle="Configure stock policies, procurement rules, and system sequences."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
