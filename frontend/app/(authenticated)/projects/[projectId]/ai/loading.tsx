import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectAiLoading() {
  return (
    <PageWrapper title="AI Assistant" eyebrow="Project" variant="display">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded-md shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
