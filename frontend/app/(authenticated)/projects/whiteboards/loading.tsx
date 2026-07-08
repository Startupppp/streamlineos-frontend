import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function WhiteboardsLoading() {
  return (
    <PageWrapper
      title="Whiteboards"
      eyebrow="Projects"
      subtitle="Every board you can access across your projects"
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
