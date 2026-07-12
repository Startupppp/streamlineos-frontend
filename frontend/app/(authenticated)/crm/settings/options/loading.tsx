import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function OptionsLoading() {
  return (
    <PageWrapper
      title="Options"
      subtitle="Manage dropdown values used across CRM records"
    >
      <div className="flex gap-4">
        <div className="hidden md:flex flex-col w-48 shrink-0 gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
