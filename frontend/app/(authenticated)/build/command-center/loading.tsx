import { PageWrapper } from "@/components/ui/page-wrapper";
import { CommandCenterLoading as CommandCenterLoadingSkeleton } from "@/features/build/command-center/command-center-loading";

export default function CommandCenterLoading() {
  return (
    <PageWrapper
      title="Command Center"
      subtitle="Overview of your projects and active work"
    >
      <CommandCenterLoadingSkeleton />
    </PageWrapper>
  );
}
