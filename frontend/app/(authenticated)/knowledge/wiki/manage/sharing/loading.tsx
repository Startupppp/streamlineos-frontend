import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbSharingSettingsSkeleton } from "@/features/wiki/components/kb-sharing-settings-skeleton";

export default function KbSharingSettingsLoading() {
  return (
    <PageWrapper
      title="External sharing"
      subtitle="Control how content can be shared outside the organization."
    >
      <KbSharingSettingsSkeleton />
    </PageWrapper>
  );
}
