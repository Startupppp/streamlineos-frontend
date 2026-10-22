import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrSettingsLoading() {
  return (
    <PageWrapper
      title="HR configuration"
      subtitle="Every configuration surface for HR"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <div className="space-y-6">
        {[1, 2, 3].map((g) => (
          <div key={g} className="space-y-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((c) => (
                <Skeleton key={c} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
