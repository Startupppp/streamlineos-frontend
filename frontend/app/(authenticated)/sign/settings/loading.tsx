import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SignSettingsLoading() {
  return (
    <PageWrapper
      title="Settings"
      subtitle="Tenant-wide defaults, branding, and watermark policy for SignOS."
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 border-b border-border pb-0">
          <Skeleton className="h-9 w-24 rounded-t-md" />
          <Skeleton className="h-9 w-24 rounded-t-md" />
          <Skeleton className="h-9 w-28 rounded-t-md" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
