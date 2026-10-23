import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbSharingSettingsSkeleton } from "@/features/wiki/components/kb-sharing-settings-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function KbSharingSettingsLoading() {
  return (
    <PageWrapper
      title="External sharing"
      subtitle="Control how content can be shared outside the organization."
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <KbSharingSettingsSkeleton />
    </PageWrapper>
  );
}
