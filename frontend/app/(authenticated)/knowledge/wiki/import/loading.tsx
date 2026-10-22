import { LoadingState } from "@/components/shared/loading-state";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function WikiImportLoading() {
  return (
    <PageWrapper title="Import & Export">
      <LoadingState variant="form" rows={3} />
    </PageWrapper>
  );
}
