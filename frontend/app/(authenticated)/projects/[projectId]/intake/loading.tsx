import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function IntakeLoading() {
  return (
    <PageWrapper
      title="Intake"
      subtitle="Collect and triage incoming requests from your team or clients"
    >
      <PmPageShell>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
