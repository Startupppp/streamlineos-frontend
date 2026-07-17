import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <PageWrapper title="Onboarding" subtitle="Onboard new team members and manage document requirements">
      <div className="space-y-4">
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/40 w-fit">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-2xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
