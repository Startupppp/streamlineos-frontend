import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <PageWrapper title="Onboarding" subtitle="Manage new employee onboarding and probation">
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-[420px] rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
