import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

function SectionHeaderSkeleton({ titleWidth, subtitleWidth }: { titleWidth: string; subtitleWidth: string }) {
  return (
    <div className="mb-4 space-y-1">
      <Skeleton className={`h-4 ${titleWidth}`} />
      <Skeleton className={`h-3 ${subtitleWidth}`} />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile and security."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeaderSkeleton titleWidth="w-20" subtitleWidth="w-64" />
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

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeaderSkeleton titleWidth="w-28" subtitleWidth="w-56" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeaderSkeleton titleWidth="w-24" subtitleWidth="w-64" />
          <Skeleton className="h-40 w-full" />
        </section>

        <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeaderSkeleton titleWidth="w-20" subtitleWidth="w-52" />
          <div className="divide-y divide-border border-t border-border">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-40" />
              </div>
            </div>
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeaderSkeleton titleWidth="w-20" subtitleWidth="w-64" />
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
