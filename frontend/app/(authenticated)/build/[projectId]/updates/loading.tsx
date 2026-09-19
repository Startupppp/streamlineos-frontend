import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ProjectUpdatesLoading() {
  return (
    <PageWrapper
      title="Updates"
      subtitle="Project status updates and announcements"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
