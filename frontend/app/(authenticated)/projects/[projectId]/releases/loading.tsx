import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel, PmSection } from "@/features/projects/shared/pm-chrome";

export default function ReleasesLoading() {
  return (
    <PageWrapper
      title="Releases"
      subtitle="Track versions and shipped features"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </PmSection>
        <PmSection index={1}>
          <PmPanel className="space-y-2 p-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
