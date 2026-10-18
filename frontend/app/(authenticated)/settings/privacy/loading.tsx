import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrivacyLoading() {
  return (
    <PageWrapper
      title="Privacy Requests"
      subtitle="Handle member data exports, erasures, and filed subject-access requests."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <Skeleton className="h-9 w-full max-w-xs shrink-0 rounded-lg" />

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-card">
          <div className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <Skeleton className="size-7 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex max-w-xl flex-col gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-3 w-64" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-card">
          <div className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <Skeleton className="size-7 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <div className="space-y-0 px-4 sm:px-5">
            <div className="flex flex-col gap-3 border-b border-border py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-destructive/40 bg-card/90 shadow-card">
          <div className="flex items-start gap-2.5 border-b border-destructive/20 px-4 py-3.5 sm:px-5">
            <Skeleton className="size-7 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="space-y-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
