import { PageWrapper } from "@/components/ui/page-wrapper";
import { TriagePageLoading } from "@/features/build/triage/triage-page-loading";

export default function ProjectTriageLoading() {
  return (
    <PageWrapper title="Triage" subtitle="Review and process incoming issues">
      <TriagePageLoading />
    </PageWrapper>
  );
}
