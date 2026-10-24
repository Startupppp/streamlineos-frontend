import { PageWrapper } from "@/components/ui/page-wrapper";
import { LiveSessionHostSkeleton } from "@/features/surveys/live/live-session-host-skeleton";

export default function LiveSessionHostLoading() {
  return (
    <PageWrapper title="Live session" backHref="/surveys">
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveSessionHostSkeleton />
      </div>
    </PageWrapper>
  );
}
