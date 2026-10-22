import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome";

export function ProjectFilesSkeleton() {
  return (
    <PmPageShell>
      <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </PmSection>
    </PmPageShell>
  );
}
