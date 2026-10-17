import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function TalentPoolsLoading() {
  return (
    <PageWrapper
      title="Talent Pools"
      subtitle="Passive candidate CRM — group and track talent outside active pipelines"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-full min-h-[280px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
