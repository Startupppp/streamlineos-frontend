import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PortalProjectLoading() {
  return (
    <PageWrapper variant="display" title="Loading..." backHref="/projects/portal">
      <div className="px-4 pb-6 space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
