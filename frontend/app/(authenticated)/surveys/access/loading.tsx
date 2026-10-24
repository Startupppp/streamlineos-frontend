import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModuleAccessSkeleton } from "@/features/module-access/module-access-skeleton";

export default function SurveysAccessLoading() {
  return (
    <PageWrapper
      title="Surveys Access"
      subtitle="Manage role groups, members, and permissions for this module."
    >
      <ModuleAccessSkeleton />
    </PageWrapper>
  );
}
