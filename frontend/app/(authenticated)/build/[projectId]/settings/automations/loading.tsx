import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";
import { AutomationsSkeleton } from "@/features/build/automations/automations-skeleton";

export default function ProjectAutomationsLoading() {
  return (
    <PageWrapper title="Automations" subtitle="Automate repetitive actions with if-then rules">
      <PmPageShell>
        <AutomationsSkeleton />
      </PmPageShell>
    </PageWrapper>
  );
}
