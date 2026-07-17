import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExitLoading() {
  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px] w-full rounded-2xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
