import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Automations"
      eyebrow="Project"
      subtitle="Automate repetitive actions with if-then rules"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <div className="space-y-3 pb-8">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
