import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EnvelopeListSkeleton } from "@/features/sign/envelopes/envelope-list-skeleton";

export default function SignEnvelopesLoading() {
  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={<Skeleton className="h-9 w-36 max-w-full rounded-md" />}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full max-w-full rounded-md sm:w-64" />
          <Skeleton className="h-9 w-44 shrink-0 rounded-md" />
        </div>
      }
    >
      <EnvelopeListSkeleton />
    </PageWrapper>
  );
}
