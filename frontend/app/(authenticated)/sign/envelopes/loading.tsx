import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EnvelopeListSkeleton } from "@/features/sign/envelopes/envelope-list-skeleton";

export default function SignEnvelopesLoading() {
  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={<Skeleton className="h-9 w-full max-w-full rounded-md sm:w-36" />}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:w-64 sm:flex-none" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-md sm:w-44" />
        </div>
      }
    >
      <EnvelopeListSkeleton />
    </PageWrapper>
  );
}
