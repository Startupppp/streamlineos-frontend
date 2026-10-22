import { PageWrapper } from "@/components/ui/page-wrapper";
import { DetailSkeleton } from "@/features/build/ticket-details/ticket-detail-skeleton";

export default function TicketDetailLoading() {
  return (
    <PageWrapper title="Ticket" noInternalScroll className="h-full">
      <DetailSkeleton />
    </PageWrapper>
  );
}
