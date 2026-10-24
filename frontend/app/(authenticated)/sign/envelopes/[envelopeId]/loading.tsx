import { PageWrapper } from "@/components/ui/page-wrapper";
import { EnvelopeBuilderSkeleton } from "@/features/sign/builder/envelope-builder-skeleton";

export default function SignEnvelopeBuilderLoading() {
  return (
    <PageWrapper
      title="Envelope"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <EnvelopeBuilderSkeleton />
    </PageWrapper>
  );
}
