import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntegrationsLoading() {
  return (
    <PageWrapper
      title="Integrations"
      eyebrow="Projects"
      subtitle="Connect Git repositories to link commits and pull requests to tickets"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
