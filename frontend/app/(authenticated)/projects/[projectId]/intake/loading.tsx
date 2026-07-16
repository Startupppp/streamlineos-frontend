import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function IntakeLoading() {
  return (
    <PageWrapper
      title="Intake"
      subtitle="Collect and triage incoming requests from your team or clients"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-md" />
            ))}
          </div>
        </PmSection>

        <div className="space-y-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
