import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <PageWrapper
      title="Construction Projects"
      subtitle="What each site needs, and whether it is covered."
      actions={<Skeleton className="h-8 w-28" />}
    >
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="list-none">
            <Skeleton className="h-40 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </PageWrapper>
  );
}
