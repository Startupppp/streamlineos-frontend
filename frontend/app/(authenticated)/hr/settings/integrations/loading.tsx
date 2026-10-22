import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntegrationsSettingsLoading() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Webhooks, connected apps, and external provider settings"
    >
      <div className="space-y-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <div className="space-y-2">
              {[1, 2].map((c) => (
                <Skeleton key={c} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
