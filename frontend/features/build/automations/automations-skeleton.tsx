import { Skeleton } from "@/components/ui/skeleton";
import { PmSection } from "@/components/pm-chrome";

export function AutomationsSkeleton() {
  return (
    <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-xl" />
      ))}
    </PmSection>
  );
}
