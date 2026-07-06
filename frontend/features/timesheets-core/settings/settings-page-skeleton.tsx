import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function SettingsPageSkeleton() {
  return (
    <PageWrapper
      title="Timesheet Settings"
      eyebrow="Timesheets"
      noInternalScroll
      className="flex-none"
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          {[80, 60, 60].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-md" style={{ width: w }} />
          ))}
        </div>
        <div className="space-y-4 pt-1">
          {[144, 200, 96, 112, 180].map((h, i) => (
            <Skeleton key={i} className="w-full rounded-xl" style={{ height: h }} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
