import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectAiLoading() {
  return (
    <PageWrapper
      title="AI Assistant"
      subtitle="Analyze, plan, and get answers about this project."
    >
      <div className="space-y-4 pb-16">
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />{" "}
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-44 rounded" />
            </div>
          </div>
          <div className="space-y-2 border-t border-border/60 pt-3">
            <div className="flex gap-1.5">
              {[60, 72, 68, 90].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-5 rounded-full"
                  style={{ width: w }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />{" "}
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-44 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-32 rounded-md" />{" "}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />{" "}
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
