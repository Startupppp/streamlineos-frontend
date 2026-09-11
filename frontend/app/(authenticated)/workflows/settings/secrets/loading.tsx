import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SecretsLoading() {
  return (
    <PageWrapper
      title="Secrets Manager"
      subtitle="Manage encrypted secrets used by your workflows."
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
