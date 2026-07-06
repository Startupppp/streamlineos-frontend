import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgramsLoading() {
  return (
    <PageWrapper title="Programs" eyebrow="Projects" filters={<Skeleton className="h-8 w-96 rounded-md" />} actions={<Skeleton className="h-8 w-32 rounded-md" />}>
      <div className="px-4 pb-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border/40">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8 ml-auto" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
