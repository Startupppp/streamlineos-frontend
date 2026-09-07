import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";

export default function ChatLoading() {
  return (
    <PageWrapper noInternalScroll>
      <PmPageShell>
        <Skeleton className={cn(PM_PANEL, "h-[200px] w-full")} />
      </PmPageShell>
    </PageWrapper>
  );
}
