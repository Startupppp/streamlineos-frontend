import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SettingsLoading() {
  return (
    <PageWrapper title="Account Settings" subtitle="Manage your profile and security.">
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-36" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
