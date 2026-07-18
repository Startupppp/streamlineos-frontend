import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HolidaysLoading() {
  return (
    <PageWrapper
      title="Holiday Calendar"
      subtitle="Manage organization holidays across the year"
      actions={
        <div className="flex gap-2 items-center flex-nowrap">
          <Skeleton className="h-9 w-[120px] rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
