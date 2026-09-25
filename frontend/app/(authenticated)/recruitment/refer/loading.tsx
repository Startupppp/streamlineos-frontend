import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReferLoading() {
  return (
    <PageWrapper
      title="Refer a Candidate"
      subtitle="Know someone great? Submit a referral and earn a bonus if they're hired."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[560px] w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
