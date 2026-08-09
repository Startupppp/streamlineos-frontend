import { Skeleton } from "@/components/ui/skeleton";

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
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgSettingsSectionsSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0 space-y-3.5">
      <SectionCardSkeleton fields={3} />
      <SectionCardSkeleton fields={2} />
      <SectionCardSkeleton fields={3} />
      <SectionCardSkeleton fields={2} />
      <SectionCardSkeleton fields={2} />
      <SectionCardSkeleton fields={2} />
      <SectionCardSkeleton fields={2} />
      <SectionCardSkeleton fields={1} />
    </div>
  );
}
