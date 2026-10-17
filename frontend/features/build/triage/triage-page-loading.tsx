import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell } from "@/components/pm-chrome";

export function TriagePageLoading() {
  return (
    <PmPageShell>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PmPageShell>
  );
}
