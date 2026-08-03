import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/features/build/shared/pm-chrome";

export default function ViewsLoading() {
  return (
    <PageWrapper
      title="Views"
      subtitle="Saved filters and layouts for this project"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <PmPageShell>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
