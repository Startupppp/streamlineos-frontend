import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ChatLoading() {
  return (
    <PageWrapper title="Chat" subtitle="Opening project conversation">
      <PmPageShell>
        <Skeleton className={cn(PM_PANEL, "h-[200px] w-full")} />
      </PmPageShell>
    </PageWrapper>
  );
}
