import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Automations"
      eyebrow="Project"
      subtitle="Automate repetitive actions with if-then rules"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
