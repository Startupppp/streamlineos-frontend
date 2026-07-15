import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function ModulesLoading() {
  return (
    <PageWrapper
      title="Modules"
      eyebrow="Project"
      subtitle="Organize work into feature groups and track module progress"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
