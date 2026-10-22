import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";
import { RetentionSettingsSkeleton } from "@/features/build/settings/retention-settings-skeleton";

export default function ProjectRetentionLoading() {
  return (
    <PageWrapper title="Retention" subtitle="Manage data retention periods and legal holds for this project">
      <PmPageShell>
        <RetentionSettingsSkeleton />
      </PmPageShell>
    </PageWrapper>
  );
}
