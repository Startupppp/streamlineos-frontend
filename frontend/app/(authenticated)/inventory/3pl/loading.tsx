import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThreePlLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory · Channels"
      title="3PL Connections"
      subtitle="Manage third-party logistics provider connections"
      actions={<Skeleton className="h-8 w-32" />}
    >
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PageWrapper>
  );
}
