import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HolidaysLoading() {
  return (
    <PageWrapper
      title="Holiday Calendar"
      subtitle="Manage organization holidays across the year"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
