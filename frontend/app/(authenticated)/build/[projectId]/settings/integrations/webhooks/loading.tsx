import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { ProjectWebhooksSkeleton } from "@/features/build/webhooks/project-webhooks-skeleton";

export default function ProjectWebhooksLoading() {
  return (
    <PageWrapper title="Webhooks" subtitle="Receive HTTP POST notifications when project events occur">
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <ProjectWebhooksSkeleton />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
