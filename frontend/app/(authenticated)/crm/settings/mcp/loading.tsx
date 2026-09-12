import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";

export default function CrmMcpSettingsLoading() {
  return (
    <PageWrapper
      title="MCP Agent Access"
      subtitle="Create CRM-scoped agent tokens and inspect the tools exposed to MCP clients."
    >
      <LoadingState variant="page" />
    </PageWrapper>
  );
}
