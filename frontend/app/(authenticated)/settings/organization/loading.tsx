import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

function SectionCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  );
}

export default function OrganizationSettingsLoading() {
  return (
    <PageWrapper
      title="Organization"
      subtitle="Manage your organization details and settings."
    >
      <div className="space-y-4">
        <SectionCardSkeleton fields={3} />
        <SectionCardSkeleton fields={2} />
        <SectionCardSkeleton fields={3} />
        <SectionCardSkeleton fields={2} />
        <SectionCardSkeleton fields={2} />
        <SectionCardSkeleton fields={1} />
      </div>
    </PageWrapper>
  );
}
