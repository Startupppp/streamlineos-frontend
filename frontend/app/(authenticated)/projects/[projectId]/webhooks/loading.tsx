import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function WebhooksLoading() {
  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Receive HTTP POST notifications when project events occur"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
