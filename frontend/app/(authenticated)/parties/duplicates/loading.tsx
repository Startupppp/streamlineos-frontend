import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function PartyDuplicatesLoading() {
  return (
    <PageWrapper
      title="Duplicate records"
      subtitle="Records that may describe the same customer"
      backHref="/parties"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-48 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
