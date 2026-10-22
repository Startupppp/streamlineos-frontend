import { PageWrapper } from "@/components/ui/page-wrapper";
import { ClientAccessSkeleton } from "@/features/portal-access/client-access-skeleton";

export default function ClientAccessLoading() {
  return (
    <PageWrapper title="Client Access">
      <ClientAccessSkeleton />
    </PageWrapper>
  );
}
