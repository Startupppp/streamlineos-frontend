import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignEnvelopesLoading() {
  return (
    <PageWrapper title="Envelopes" subtitle="Every signing request you've sent, organized by status">
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
