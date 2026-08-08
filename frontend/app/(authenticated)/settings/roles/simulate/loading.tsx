import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SimulateLoading() {
  return (
    <PageWrapper
      title="Permission Simulator"
      subtitle="View what a specific employee can do in the system"
      backHref="/settings/roles"
      noInternalScroll
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <Skeleton className="h-9 w-full sm:w-[320px]" />
      </div>
    </PageWrapper>
  );
}
