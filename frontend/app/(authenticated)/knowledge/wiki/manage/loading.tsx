import { PageWrapper } from "@/components/ui/page-wrapper";
import { ContentHealthSkeleton } from "@/features/wiki/components/content-health-skeleton";

export default function ContentHealthLoading() {
  return (
    <PageWrapper title="Content Health">
      <ContentHealthSkeleton />
    </PageWrapper>
  );
}
